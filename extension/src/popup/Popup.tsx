import React, { useState, useEffect } from 'react';

interface Session {
  id: string;
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
  aiSummary: string | null;
  category: string | null;
}

const BACKEND_URL = 'http://localhost:3000';

/**
 * Returns the local date in YYYY-MM-DD format.
 */
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats duration in milliseconds to a human-readable text.
 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return '< 1s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Formats ISO date string to a local readable time.
 */
const formatTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_error) {
    return '';
  }
};

const Popup: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/sessions?date=${selectedDate}`);
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        if (isMounted) {
          setSessions(data);
        }
      } catch (_err) {
        if (isMounted) {
          setError('Unable to load activity.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSessions();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1 className="popup-title">BrowserEye</h1>
      </header>

      <main className="popup-content">
        <div className="date-picker-container">
          <label htmlFor="date-picker" className="date-label">Date:</label>
          <input
            id="date-picker"
            type="date"
            className="date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {loading && (
          <div className="loading-state">
            <span className="spinner" />
            <p className="loading-text">Loading sessions...</p>
          </div>
        )}

        {!loading && error && (
          <div className="error-state">
            <p className="error-message">{error}</p>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="empty-state">
            <p className="empty-text">No activity found for this date.</p>
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div className="session-card" key={session.id}>
                <div className="session-card-header">
                  <span className="session-domain" title={session.website}>
                    {session.website}
                  </span>
                  {session.category && (
                    <span className="category-badge">{session.category}</span>
                  )}
                </div>

                <h2 className="session-page-title" title={session.pageTitle}>
                  {session.pageTitle}
                </h2>

                <div className="session-meta">
                  <span className="meta-time">
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </span>
                  <span className="meta-duration">
                    Duration: {formatDuration(session.duration)}
                  </span>
                </div>

                <div className="session-stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Clicks</span>
                    <span className="stat-value">{session.clicks}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Keys</span>
                    <span className="stat-value">{session.keystrokes}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Scroll</span>
                    <span className="stat-value">{session.scrollDepth}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Switches</span>
                    <span className="stat-value">{session.tabSwitches}</span>
                  </div>
                </div>

                {session.aiSummary && (
                  <div className="ai-summary-container">
                    <span className="ai-summary-label">AI Summary</span>
                    <p className="ai-summary-text">{session.aiSummary}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Popup;
