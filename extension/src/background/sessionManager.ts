import { PageSession } from '../types';
import { getDomain } from '../utils/url';
import { sendSessionToBackend } from '../api/sessionApi';

class SessionManager {
  // In-memory store of currently tracking page sessions
  private activeSessions = new Map<number, PageSession>();

  // In-memory store of grace period timers for deactivated tabs
  private graceTimers = new Map<number, { timeoutId: any; switchAwayTime: number }>();

  /**
   * Starts a new tracking session for a tab.
   * If a grace timer is active for this tab, the session is resumed instead of started anew.
   */
  public startSession(tabId: number, url: string, title: string): PageSession | null {
    // Ignore internal chrome:// pages and blank/extension pages
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url === 'about:blank') {
      return null;
    }

    // Check if there is an active grace timer for this tab (user switched back within 5s)
    const grace = this.graceTimers.get(tabId);
    if (grace) {
      clearTimeout(grace.timeoutId);
      this.graceTimers.delete(tabId);

      const existingSession = this.activeSessions.get(tabId);
      if (existingSession) {
        existingSession.tabSwitchCount += 1;
        console.log(`[SessionManager] Resumed session ${existingSession.id} for tab ${tabId}. Tab switch count: ${existingSession.tabSwitchCount}`);
        return existingSession;
      }
    }

    // If an active session already exists but has a different URL, end it first
    const existingSession = this.activeSessions.get(tabId);
    if (existingSession) {
      if (existingSession.url !== url) {
        this.endSession(tabId);
      } else {
        return existingSession;
      }
    }

    // Create a new session
    const newSession: PageSession = {
      id: crypto.randomUUID(),
      tabId,
      website: getDomain(url),
      url,
      title,
      startTime: Date.now(),
      duration: 0,
      clickCount: 0,
      keystrokeCount: 0,
      maxScrollDepth: 0,
      tabSwitchCount: 0
    };

    this.activeSessions.set(tabId, newSession);
    console.log(`[SessionManager] Started new session ${newSession.id} for tab ${tabId} (${newSession.website})`);
    return newSession;
  }

  /**
   * Pauses an active session for a tab when it loses focus.
   * Starts a 5-second grace period timer before finalizing the session.
   */
  public pauseSession(tabId: number): void {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    // If a grace timer is already running for this tab, clear it first
    const existingGrace = this.graceTimers.get(tabId);
    if (existingGrace) {
      clearTimeout(existingGrace.timeoutId);
    }

    const switchAwayTime = Date.now();
    const timeoutId = setTimeout(() => {
      console.log(`[SessionManager] Grace period expired for tab ${tabId}. Finalizing session ${session.id}.`);
      this.endSession(tabId, switchAwayTime);
    }, 5000); // 5-second threshold

    this.graceTimers.set(tabId, { timeoutId, switchAwayTime });
    console.log(`[SessionManager] Paused session ${session.id} for tab ${tabId}. Starting 5s grace period timer.`);
  }

  /**
   * Ends and finalizes a session, calculating duration and logging it to the console.
   */
  public endSession(tabId: number, endTimeOverride?: number): void {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    // Clear any active grace timers
    const grace = this.graceTimers.get(tabId);
    if (grace) {
      clearTimeout(grace.timeoutId);
      this.graceTimers.delete(tabId);
    }

    const endTime = endTimeOverride || Date.now();
    session.endTime = endTime;
    session.duration = Math.max(0, endTime - session.startTime);

    // Send completed session to Express backend
    sendSessionToBackend(session);

    this.activeSessions.delete(tabId);
  }

  /**
   * Updates interaction counts from content script updates.
   */
  public updateInteractions(
    tabId: number,
    clickCount: number,
    keystrokeCount: number,
    maxScrollDepth: number
  ): void {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    session.clickCount = clickCount;
    session.keystrokeCount = keystrokeCount;
    session.maxScrollDepth = Math.max(session.maxScrollDepth, maxScrollDepth);
    
    console.log(
      `[SessionManager] Updated interactions for tab ${tabId}: ` +
      `clicks=${session.clickCount}, keys=${session.keystrokeCount}, scroll=${session.maxScrollDepth}%`
    );
  }

  /**
   * Retrieves an active session by tab ID.
   */
  public getSession(tabId: number): PageSession | undefined {
    return this.activeSessions.get(tabId);
  }

  /**
   * Finalizes all active sessions (e.g. when browser is closing / suspending).
   */
  public endAllSessions(): void {
    const activeTabIds = Array.from(this.activeSessions.keys());
    for (const tabId of activeTabIds) {
      this.endSession(tabId);
    }
  }
}

export const sessionManager = new SessionManager();
