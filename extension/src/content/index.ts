import { ExtensionMessage } from '../messaging/types';

let clickCount = 0;
let keystrokeCount = 0;
let maxScrollDepth = 0;
let debounceTimer: any = null;

/**
 * Calculates the user's current scroll depth as a percentage of the total scrollable height.
 */
function calculateScrollDepth(): number {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (documentHeight <= 0) return 0;
  return Math.min(100, Math.round((scrollTop / documentHeight) * 100));
}

/**
 * Sends the collected user interaction metrics to the background service worker.
 */
function sendMetricsUpdate(immediate = false): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  const dispatch = () => {
    const message: ExtensionMessage = {
      type: 'INTERACTION_UPDATE',
      payload: {
        clickCount,
        keystrokeCount,
        maxScrollDepth
      }
    };
    chrome.runtime.sendMessage(message).catch((_err) => {
      // Catch exceptions gracefully (e.g. when extension updates and context invalidates)
    });
  };

  if (immediate) {
    dispatch();
  } else {
    // Debounce by 500ms to throttle messages to the background thread during typing or scrolling
    debounceTimer = setTimeout(dispatch, 500);
  }
}

// 1. Listen for Clicks
document.addEventListener('click', () => {
  clickCount++;
  sendMetricsUpdate();
});

// 2. Listen for Keystrokes
document.addEventListener('keydown', (event) => {
  // Ignore modifier keys like Shift, Ctrl, Alt, Meta
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
    return;
  }
  keystrokeCount++;
  sendMetricsUpdate();
});

// 3. Listen for Scrolling
window.addEventListener('scroll', () => {
  const currentDepth = calculateScrollDepth();
  if (currentDepth > maxScrollDepth) {
    maxScrollDepth = currentDepth;
    sendMetricsUpdate();
  }
});

// 4. Flush updates immediately on page visibility change or unload
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendMetricsUpdate(true);
  }
});

window.addEventListener('beforeunload', () => {
  sendMetricsUpdate(true);
});

// Emits load initialization event to the background script
chrome.runtime.sendMessage({ type: 'PAGE_INITIALIZED' }).catch(() => {});

console.log('BrowserEye Interaction Content Script Initialised');
