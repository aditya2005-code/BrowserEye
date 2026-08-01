import { PageSession } from '../types';

export interface CreateSessionInput {
  website: string;
  url: string;
  pageTitle: string;
  startTime: string;
  endTime: string;
  duration: number;
  clicks: number;
  keystrokes: number;
  scrollDepth: number;
  tabSwitches: number;
}

const BACKEND_URL = 'https://browsereye.onrender.com';

/**
 * Sends a completed tracking session to the Express backend.
 */
export async function sendSessionToBackend(session: PageSession): Promise<void> {
  const payload: CreateSessionInput = {
    website: session.website,
    url: session.url,
    pageTitle: session.title,
    startTime: new Date(session.startTime).toISOString(),
    endTime: new Date(session.endTime || Date.now()).toISOString(),
    duration: session.duration,
    clicks: session.clickCount,
    keystrokes: session.keystrokeCount,
    scrollDepth: session.maxScrollDepth,
    tabSwitches: session.tabSwitchCount
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server responded with HTTP status ${response.status}`);
    }

    const data = await response.json();
    console.log('[API] Session synced successfully:', data);
  } catch (error) {
    console.error('[API] Failed to sync session to backend:', error);
  }
}
