# BrowserEye

See Beyond Browsing – Intelligent Browser Activity Tracking with AI Insights

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Express](https://img.shields.io/badge/Express-Backend-lightgrey?style=flat-square&logo=express)
![Prisma](https://img.shields.io/badge/Prisma-ORM-darkblue?style=flat-square&logo=prisma)
![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat-square&logo=postgresql)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple?style=flat-square&logo=google-gemini)
![Render](https://img.shields.io/badge/Render-Deployment-blue?style=flat-square&logo=render)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Why BrowserEye?

Traditional browser activity trackers generate highly fragmented logs by recording every single URL redirect or tab switch. This makes it difficult to understand actual user behaviors and trends. BrowserEye resolves this noise by grouping browsing activities under a single continuous session at the origin domain level, replacing raw, unreadable URLs with concise, AI-powered activity summaries.

---

## Project Overview

BrowserEye is a Chrome Extension that tracks active browser interactions. It aggregates active duration, clicks, keydowns, scroll depth, and tab switches under a single continuous session per domain.

When a browsing session on a particular domain lasts for 5 minutes or more, the extension captures a single screenshot of the active tab. When the session ends, the screenshot and statistics are sent to the Google Gemini API to generate a summary and category. The data is saved to a PostgreSQL database hosted on Neon, and is accessible to the user via a React Popup interface.

> [!NOTE]
> AI analysis is completely optional. If the Gemini API key is missing or the service is offline, BrowserEye automatically skips the summarization step and stores the session metadata cleanly with null fields. The extension is robust and will never crash or block normal tracking.

---

## 🚀 Project Highlights

- **Chrome Extension** built using Manifest V3
- **Domain-Based Browser Session Tracking** to aggregate fragmented activities
- **React + TypeScript Popup Dashboard** for historical tracking search
- **Express.js REST Backend** parsing payload parameters
- **Prisma ORM** mapping database queries
- **Neon PostgreSQL** database cloud storage
- **Optional AI-Powered Session Summaries** via Google Gemini REST calls
- **Render Deployment** hosting environment

---

## Features

* **Domain-Level Tracking**: Automatically maps interactions to website hostnames, updating the URL and page title in-place during navigation.
* **Interaction Accumulation**: Accumulates active duration, mouse clicks, keydowns, scroll depth, and tab switches.
* **Grace Period Buffering**: Delays finalization by 5 seconds to absorb fast tab switches and prevent fragmented session splits.
* **Multi-Window Isolation**: Resolves tab activations in multi-window environments using window-focus queries to prevent inactive tabs from stealing focus.
* **Vite-Bundled Background worker**: Runs as an ephemeral Manifest V3 service worker communicating with injected content scripts via Chrome IPC.
* **AI Summaries (Optional)**: Multimodal analysis using `gemini-1.5-flash` with strict JSON schema outputs.
* **Interactive Dashboard**: Custom React Popup UI containing historical calendar queries, loading feedback, and empty/unreachable backend fallbacks.

---

## Project Architecture

```mermaid
graph TD
    subgraph Extension [Chrome Extension Client]
        CS[Content Script]
        SW[Background Service Worker]
        Popup[React Popup UI]
    end

    subgraph Backend [Express Server Layer]
        API[Express.js API]
        Prisma[Prisma ORM]
    end

    subgraph Storage [Database Layer]
        Neon[(Neon PostgreSQL)]
    end

    subgraph AI [Generative AI Layer]
        Gemini[Gemini API]
    end

    CS -- "IPC Messages" --> SW
    SW -- "POST /api/sessions" --> API
    Popup -- "GET /api/sessions" --> API
    API --> Prisma
    Prisma --> Neon
    SW -- "REST Call" --> Gemini
    Gemini -- "JSON Summary" --> SW
```

---

## Data & Session Flow

The sequence diagram below displays the event tracking timeline:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant CS as Content Script
    participant SW as Background Service Worker
    participant Gemini as Gemini API
    participant Backend as Express Backend
    participant DB as Neon Database

    User->>CS: Interacts (clicks, keystrokes, scroll)
    CS->>SW: Send interaction metrics
    SW->>SW: Accumulate counts in-memory

    Note over User,SW: User navigates or closes active tab
    
    alt Session duration >= 5 minutes
        SW->>User: Capture active tab screenshot
        SW->>Gemini: Request summary & category (screenshot + stats)
        Gemini-->>SW: Return JSON (summary & category)
        SW->>SW: Delete screenshot from memory
    else Session duration < 5 minutes
        Note over SW: Skip AI analysis
    end

    SW->>Backend: POST /api/sessions (with optional AI summary)
    Backend->>DB: Save session via Prisma
    DB-->>Backend: Success response
    Backend-->>SW: HTTP 201 Created
```

---

## Folder Structure

<details>
<summary><b>View Complete Folder Map</b></summary>

```
BrowserEye/
├── extension/                 # Chrome Extension codebase
│   ├── public/                # Static assets and manifest.json
│   ├── src/
│   │   ├── api/               # Express API endpoints client
│   │   ├── background/        # Service Worker and session manager
│   │   ├── content/           # Event tracking DOM script
│   │   ├── messaging/         # IPC messaging type definitions
│   │   ├── popup/             # ReactPopup UI view
│   │   ├── services/          # Gemini Rest API client
│   │   ├── types/             # Common interface typings
│   │   └── utils/             # Host parsing and formatting utils
│
└── backend/                   # Node.js + Express backend
    ├── prisma/                # Prisma schema and migrations
    ├── src/
    │   ├── config/            # Environment variable configs
    │   ├── controllers/       # Controller routers
    │   ├── middleware/        # Boundary inputs validator
    │   ├── routes/            # Express route router maps
    │   └── services/          # Prisma database service layer
```
</details>

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| 🌐 **Extension** | Manifest V3 |
| ⚛️ **Frontend** | React, TypeScript, Vite |
| 🚀 **Backend** | Express.js |
| 🗄 **Database** | Neon PostgreSQL |
| 🔷 **ORM** | Prisma |
| 🤖 **AI** | Google Gemini |
| ☁️ **Deployment** | Render |

---

## Database Design

BrowserEye records sessions linearly using a single database table.

### Session Model Schema
| Field | Type | Description |
| :--- | :--- | :--- |
| **id** | UUID (PK) | Auto-generated session identifier |
| **website** | String | Host domain name (e.g. `github.com`) |
| **url** | String | Latest URL visited before session ended |
| **pageTitle** | String | Latest page title visited before session ended |
| **startTime** | DateTime | Timestamp when session tracking started |
| **endTime** | DateTime | Timestamp when session ended |
| **duration** | Int | Cumulative duration of session in milliseconds |
| **clicks** | Int | Total mouse clicks registered |
| **keystrokes** | Int | Total alphanumeric keys typed |
| **scrollDepth** | Int | Maximum scroll percentage reached (0-100%) |
| **tabSwitches** | Int | Total times tab was switched away and returned to |
| **aiSummary** | String (Nullable)| Gemini-generated activity summary |
| **category** | String (Nullable)| Gemini-generated category (e.g. Development) |
| **createdAt** | DateTime | Database creation record timestamp |
| **updatedAt** | DateTime | Database update record timestamp |

---

## API Documentation

### 1. Create Session
Saves a completed tracking session.

* **Method**: `POST`
* **Route**: `/api/sessions`
* **Purpose**: Saves a completed session in the database.
* **Required Fields**: `website`, `url`, `pageTitle`, `startTime`, `endTime`, `duration`, `clicks`, `keystrokes`, `scrollDepth`, `tabSwitches`

---

### 2. Fetch Sessions
Retrieves activity logs, optionally filtered by date.

* **Method**: `GET`
* **Route**: `/api/sessions`
* **Purpose**: Fetches historical sessions, optionally filtered by date parameter.
* **Query Parameters**: `date` (Optional. Format: `YYYY-MM-DD`. If omitted, returns all sessions)

---

## Quick-Start Installation

### Prerequisites
* Node.js v20.x
* Neon Serverless PostgreSQL Database account
* Google Gemini API Key

### Step-by-Step Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/aditya2005-code/BrowserEye.git
   cd BrowserEye
   npm install
   ```
2. **Configure Environment Variables**:
   Create a `.env` file in the root workspace and copy it to the `backend/` directory:
   ```env
   PORT=3000
   DATABASE_URL="postgresql://neondb_owner:password@ep-host.region.neon.tech/neondb?sslmode=require"
   VITE_GEMINI_API_KEY="your_api_key"
   ```
   ```bash
   cp .env backend/.env
   ```
3. **Synchronize Database**:
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx prisma generate
   cd ..
   ```
4. **Start local servers**:
   Run the Express server:
   ```bash
   npm run dev -w backend
   ```
5. **Install Chrome Extension**:
   * Compile code: `npm run build:extension`.
   * Open `chrome://extensions/` in Chrome and toggle **Developer mode**.
   * Click **Load unpacked** and select the `extension/dist/` directory.

---

## Environment Variables

| Variable | Required | Context | Description |
| :--- | :--- | :--- | :--- |
| **PORT** | No | Backend | Port number the Express API server listens on (defaults to `3000`). |
| **DATABASE_URL** | Yes | Backend | Connection string pointing to your Neon PostgreSQL instance. |
| **VITE_GEMINI_API_KEY**| No | Extension | Google Gemini API key. If missing, AI summarization is skipped. |

---

## Deployment

* **Database (Neon)**: Serverless PostgreSQL instance running migrations via Prisma ORM.
* **Backend (Render)**: Deployed Express API host at `https://browsereye.onrender.com`. The `postinstall` script triggers client generation automatically.
* **Extension API Target**: For production, ensure variables in `sessionApi.ts` and `Popup.tsx` point to the Render domain:
  ```typescript
  const BACKEND_URL = 'https://browsereye.onrender.com';
  ```
  Ensure `extension/public/manifest.json` contains:
  ```json
  "host_permissions": ["https://browsereye.onrender.com/*"]
  ```

---

## Testing Checklist

- [x] **Extension Tracking**: Verified start/pause hooks, tab transitions, same-domain baseline accumulations, and correct end finalizations on tab closures.
- [x] **Backend API**: Verified input schema boundaries, non-negative requirements, and chronological `endTime >= startTime` validations.
- [x] **Database Integrity**: Verified UUID generations and nullable AI classifications.
- [x] **AI Functionality**: Verified Gemini is only called for eligible sessions ($\ge$ 5 min), screenshots are deleted immediately from memory, and key absences fall back gracefully.
- [x] **Dashboard UI**: Verified calendar filtering, loading states, empty activity banners, and backend network connection error popups.

---

## Challenges & Solutions

* **Manifest V3 Service Worker Suspensions**: Manifest V3 service workers are ephemeral and automatically suspend after periods of inactivity. This creates a challenge for persisting in-memory tracking metrics over time. We solved this by designing the background worker to be entirely event-driven. Tracking status changes are coordinated reactively using Chrome tab/window hooks and content script IPC messages, and session data is serialized immediately during closures or page visibility transitions to ensure zero data loss.
* **Interaction Overwriting on Page Reloads**: Refreshing a page reloads the content script, resetting click, keystroke, and scroll depth counts back to `0`. If not handled, when the reloaded script transmits its next message to the background service worker, the background session states are overwritten by these zero values. We solved this by adding baseline properties (`clicksBase`, `keystrokesBase`, `scrollDepthBase`) to the `PageSession` interface. The content script sends a `PAGE_INITIALIZED` signal on script load, prompting the background worker to anchor the current aggregates as a starting offset and sum all subsequent updates with this baseline.
* **Multi-Window Tab Activation Focus Confusions**: The `chrome.tabs.onActivated` event triggers whenever a tab gains focus in any open window. In multi-window configurations, switching tabs in an inactive background window would pause the user's active session in the foreground window, leading to fragmented splits. We resolved this by querying the active window using `chrome.windows.getLastFocused` inside the activated event listener. The background script compares the tab's `windowId` with the active focused window's ID and only transitions tracking states if the tab activation belongs to the active focused window.
* **Render Prisma Mapping Generation**: Headless deployment platforms (like Render) build Node packages in serverless virtual machines, which can fail to map and generate the typed Prisma Client if local post-install hooks are missing. We resolved this by configuring node engine constraints alongside a `"postinstall": "prisma generate"` script inside `package.json` to generate client maps automatically on Render servers.

---

## Future Improvements

* **Weekly Summaries**: Automated weekly reports outlining total duration and domains visited.
* **Productivity Score**: Classify domains (e.g. Development = productive) to output daily score ratings.
* **Sync Synchronization Queue**: Cache completed sessions in local storage if the backend is offline, and sync once online.
* **OAuth Authentication**: User login integration for multi-device data syncing.

---

## License & Author

**MIT License** - Copyright (c) 2026 Aditya Pratap Singh.

* **Author**: Aditya Pratap Singh
* **GitHub**: [@aditya2005-code](https://github.com/aditya2005-code)
* **LinkedIn**: [adityapratapsingh84](https://www.linkedin.com/in/adityapratapsingh84/)
* **Email**: singhadityapratap758@gmail.com
