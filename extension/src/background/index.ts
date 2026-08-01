import { sessionManager } from './sessionManager';
import { ExtensionMessage } from '../messaging/types';

let lastActiveTabId: number | null = null;

// Helper to check if a tab is valid for tracking
function isValidTab(tab: chrome.tabs.Tab): boolean {
  return !!(tab && tab.id !== undefined && tab.url);
}

// 1. Initialise tracking for the currently active tab when the service worker wakes up
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (chrome.runtime.lastError) return;
  const activeTab = tabs[0];
  if (activeTab && isValidTab(activeTab)) {
    lastActiveTabId = activeTab.id!;
    sessionManager.startSession(activeTab.id!, activeTab.url!, activeTab.title || '');
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const newTabId = activeInfo.tabId;

  chrome.tabs.get(newTabId, (tab) => {
    if (chrome.runtime.lastError) return;

    chrome.windows.getLastFocused((focusedWindow) => {
      if (chrome.runtime.lastError) return;

      // Only transition tracking if the tab belongs to the currently focused window
      if (tab.windowId === focusedWindow.id && focusedWindow.focused) {
        if (lastActiveTabId !== null && lastActiveTabId !== newTabId) {
          sessionManager.pauseSession(lastActiveTabId);
        }

        if (isValidTab(tab)) {
          lastActiveTabId = newTabId;
          sessionManager.startSession(newTabId, tab.url!, tab.title || '');
        }
      }
    });
  });
});

// 3. Handle Tab URL/Title Updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    // Only track updates if it is the currently active tab in its window
    if (tab.active && isValidTab(tab)) {
      lastActiveTabId = tabId;
      sessionManager.startSession(tabId, tab.url!, tab.title || '');
    }
  }
});

// 4. Handle Tab Closure
chrome.tabs.onRemoved.addListener((tabId) => {
  if (lastActiveTabId === tabId) {
    lastActiveTabId = null;
  }
  sessionManager.endSession(tabId);
});

// 5. Handle Window Focus Transitions
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // The browser has lost focus (user switched to another application)
    if (lastActiveTabId !== null) {
      sessionManager.pauseSession(lastActiveTabId);
    }
  } else {
    // The browser window has gained focus
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      if (chrome.runtime.lastError) return;
      const activeTab = tabs[0];
      if (activeTab && isValidTab(activeTab)) {
        if (lastActiveTabId !== null && lastActiveTabId !== activeTab.id!) {
          sessionManager.pauseSession(lastActiveTabId);
        }
        lastActiveTabId = activeTab.id!;
        sessionManager.startSession(activeTab.id!, activeTab.url!, activeTab.title || '');
      }
    });
  }
});

// 6. Receive User Interaction Metrics from Content Scripts
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message) {
    if (message.type === 'INTERACTION_UPDATE') {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        const { clickCount, keystrokeCount, maxScrollDepth } = message.payload;
        sessionManager.updateInteractions(tabId, clickCount, keystrokeCount, maxScrollDepth);
      }
    } else if (message.type === 'PAGE_INITIALIZED') {
      const tabId = sender.tab?.id;
      // If the tab is currently active, reload session to preserve metric aggregates
      if (tabId !== undefined && sender.tab?.url && sender.tab.active) {
        sessionManager.endSession(tabId);
        lastActiveTabId = tabId;
        sessionManager.startSession(tabId, sender.tab.url, sender.tab.title || '');
      }
    }
  }
  sendResponse({ status: 'ok' });
  return true;
});

// 7. Cleanup active sessions when the background worker is suspending
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Suspending background script, cleaning up sessions.');
  sessionManager.endAllSessions();
});
