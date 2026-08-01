import { PageSession } from '../types';
import { getDomain } from '../utils/url';
import { sendSessionToBackend } from '../api/sessionApi';
import { AiService } from '../services/aiService';

class SessionManager {
  // In-memory store of currently tracking page sessions
  private activeSessions = new Map<number, PageSession>();

  // In-memory store of grace period timers for deactivated tabs
  private graceTimers = new Map<number, { timeoutId: any; switchAwayTime: number }>();

  // In-memory store of active screenshot timers for 5-minute qualifying tracking
  private screenshotTimers = new Map<number, any>();

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
        
        // Schedule/capture screenshot if session resumes
        const elapsed = Date.now() - existingSession.startTime;
        const remaining = 300000 - elapsed; // 5 minutes threshold
        if (remaining > 0) {
          this.scheduleScreenshotTimer(tabId, remaining);
        } else if (!existingSession.screenshotCaptured) {
          this.captureScreenshot(tabId);
        }

        return existingSession;
      }
    }

    // Check if an active session already exists for this tab
    const existingSession = this.activeSessions.get(tabId);
    if (existingSession) {
      const newDomain = getDomain(url);
      if (existingSession.website !== newDomain) {
        // Website domain changed! End the old session first.
        this.endSession(tabId);
      } else {
        // User remains on the same website! Continue the session.
        // Update to the latest URL and Page Title visited before closing/switching.
        existingSession.url = url;
        existingSession.title = title;

        // Save current metrics as base values to accumulate subsequent metrics correctly
        existingSession.clicksBase = existingSession.clickCount;
        existingSession.keystrokesBase = existingSession.keystrokeCount;
        existingSession.scrollDepthBase = existingSession.maxScrollDepth;

        console.log(`[SessionManager] Same domain navigation. Continuing session ${existingSession.id} on ${existingSession.website}. URL updated to: ${url}`);
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
    
    // Schedule screenshot timer for 5 minutes (300,000 ms)
    this.scheduleScreenshotTimer(tabId, 300000);

    return newSession;
  }

  /**
   * Pauses an active session for a tab when it loses focus.
   * Starts a 5-second grace period timer before finalizing the session.
   */
  public pauseSession(tabId: number): void {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    // Clear screenshot timer when tab is switched away
    const screenshotTimerId = this.screenshotTimers.get(tabId);
    if (screenshotTimerId) {
      clearTimeout(screenshotTimerId);
      this.screenshotTimers.delete(tabId);
    }

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

    // Clear screenshot timer when tab session ends
    const screenshotTimerId = this.screenshotTimers.get(tabId);
    if (screenshotTimerId) {
      clearTimeout(screenshotTimerId);
      this.screenshotTimers.delete(tabId);
    }

    const endTime = endTimeOverride || Date.now();
    session.endTime = endTime;
    session.duration = Math.max(0, endTime - session.startTime);

    // Send completed session with AI details asynchronously to the backend
    this.finalizeAndSendSession(session);

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

    // Accumulate metrics relative to baselines captured during in-place page loads
    session.clickCount = (session.clicksBase || 0) + clickCount;
    session.keystrokeCount = (session.keystrokesBase || 0) + keystrokeCount;
    session.maxScrollDepth = Math.max(session.scrollDepthBase || 0, maxScrollDepth);
    
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

  /**
   * Schedules a screenshot capture timer for a tab.
   */
  private scheduleScreenshotTimer(tabId: number, delayMs: number): void {
    const existingTimer = this.screenshotTimers.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timerId = setTimeout(() => {
      this.captureScreenshot(tabId);
    }, delayMs);
    this.screenshotTimers.set(tabId, timerId);
  }

  /**
   * Captures screen of active tab and updates session object in memory.
   */
  private captureScreenshot(tabId: number): void {
    this.screenshotTimers.delete(tabId);
    const session = this.activeSessions.get(tabId);
    if (!session || session.screenshotCaptured) return;

    chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, { format: 'jpeg', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.warn('[SessionManager] Screenshot capture failed:', chrome.runtime.lastError.message);
        return;
      }
      session.screenshot = dataUrl;
      session.screenshotCaptured = true;
      console.log(`[SessionManager] Captured screenshot for session ${session.id} after qualifying duration.`);
    });
  }

  /**
   * Resolves AI summary/category if eligible, cleans image references, and posts to backend.
   */
  private async finalizeAndSendSession(session: PageSession): Promise<void> {
    let aiSummary: string | null = null;
    let category: string | null = null;

    if (session.duration >= 300000) {
      try {
        const aiResult = await AiService.generateSummaryAndCategory(session);
        if (aiResult) {
          aiSummary = aiResult.summary;
          category = aiResult.category;
        }
      } catch (error) {
        console.error('[SessionManager] AI analysis failed, falling back to normal save:', error);
      }
    }

    const finalSession: PageSession = {
      ...session,
      aiSummary,
      category
    };

    // Strip screenshot out before backend payload transfer
    delete finalSession.screenshot;

    await sendSessionToBackend(finalSession);
  }
}

export const sessionManager = new SessionManager();

