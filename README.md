# Turf Manager — Professional React PWA

## Project Structure

```
turf-manager/
├── public/
│   ├── index.html          ← PWA meta tags (installable on mobile)
│   └── manifest.json       ← App name, theme color, icons
│
└── src/
    ├── index.js            ← React entry point (createRoot)
    ├── App.jsx             ← Root: AppProvider + Router (page switcher only)
    │
    ├── utils/
    │   ├── constants.js    ← SPORTS list, DEFAULT_SETTINGS, POLL_INTERVAL
    │   ├── helpers.js      ← Pure functions: dates, money, slots, booking mappers
    │   └── sheetsApi.js    ← sheetFetch() — JSONP bridge to Apps Script
    │
    ├── context/
    │   └── AppContext.jsx  ← Global state: settings, cache, toast (React Context)
    │
    ├── hooks/
    │   └── index.js        ← useLocalStorage, useToast, useDayBookings, useMonthBookings
    │
    ├── components/
    │   ├── ui.jsx          ← Toast, Badge, StatCard, FieldGroup, Spinner, EmptyState
    │   ├── BottomNav.jsx   ← Fixed bottom tab bar
    │   ├── BookingCard.jsx ← Single booking row card
    │   ├── BookingDrawer.jsx ← Bottom-sheet detail + collect payment
    │   ├── AddBookingForm.jsx ← Full add-booking form with auto-calc
    │   └── Summaries.jsx   ← DaySummary (4 stat grid) + WeekSummary
    │
    └── pages/
        ├── DashboardPage.jsx  ← Today view, real-time poll, delete/collect
        ├── AddBookingPage.jsx ← New booking page (wraps AddBookingForm)
        ├── HistoryPage.jsx    ← Month picker, stats, all bookings
        └── SettingsPage.jsx   ← Turf config + Apps Script URL + ping test
```

---

## Step-by-Step Setup

### Step 1 — Create the React project

```bash
npx create-react-app turf-manager
cd turf-manager
```

### Step 2 — Replace files

Delete everything inside `src/` and `public/`, then copy all the files from this project into the same locations.

### Step 3 — Run locally

```bash
npm start
```
Opens at http://localhost:3000

### Step 4 — Set up Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Paste the `Code.gs` file (the Apps Script backend you already have)
4. Click **Deploy → New deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click Deploy → copy the `/exec` URL

### Step 5 — Connect the app

1. Open the app → tap **Settings** (⚙️)
2. Paste the `/exec` URL into "Apps Script URL"
3. Tap **Test Connection** — should show ✅ Connected
4. Tap **Save Settings**

### Step 6 — Build & install as PWA

```bash
npm run build
```

Serve the `build/` folder with any static host:

```bash
# Option A: serve locally
npx serve -s build

# Option B: deploy to Netlify / Vercel (drag & drop the build/ folder)
```

To install on Android Chrome:
- Open the URL in Chrome
- Tap the **⋮ menu → Add to Home Screen**
- App installs like a native app with your green theme

---

## Architecture Decisions

### Why separate utils, hooks, components, pages?

| Folder | What goes in it | Why |
|--------|----------------|-----|
| `utils/` | Pure functions with zero React | Testable without rendering anything |
| `hooks/` | Custom React hooks (data fetching) | Reusable across pages, keeps pages clean |
| `components/` | Dumb UI pieces that receive props | Can be reused anywhere, easy to style/test |
| `pages/` | Smart pages that own state + API calls | One file per screen, easy to navigate |
| `context/` | Global shared state | Avoids prop-drilling through 5 levels |

### Why JSONP instead of fetch()?

Google Apps Script blocks browser `fetch()` with CORS headers. JSONP injects a `<script>` tag — script tags bypass CORS. Apps Script wraps the JSON response in your callback function name. This is the only reliable way to call Apps Script from a browser without a proxy server.

### Why 30-second polling instead of WebSockets?

Google Sheets has no push/webhook mechanism. Polling every 30 seconds is the best available option and gives near-real-time updates. If someone edits the sheet directly, the dashboard refreshes within 30 seconds.

### Why optimistic updates?

When you save a booking, the UI updates immediately before the network call finishes. This makes the app feel instant on slow connections. If the sync fails, a toast notifies you and the data stays in local cache.

### Real-time indicator

The green pulsing dot in the dashboard header shows the app is polling. It's honest UX — users know data is live, not stale.

---

## Data Flow

```
User taps "Save Booking"
       │
       ▼
AddBookingPage.handleSave()
       │
       ├─► setCache() [optimistic — instant UI update]
       │
       ├─► showToast("✅ Booking saved!")
       │
       ├─► onDone() → navigate to Dashboard
       │
       └─► sheetFetch(scriptUrl, addBooking params) [background]
                │
                ▼
           Apps Script → Google Sheet row appended
                │
                ▼
           setCache() marks booking as synced: true
```

```
Every 30 seconds (useDayBookings hook)
       │
       ▼
sheetFetch(scriptUrl, { action: "getBookings", date })
       │
       ├─► Parse sheet rows → booking objects
       │
       ├─► setBookings() → Dashboard re-renders
       │
       └─► setCache() → local backup updated
```

---

## Customisation

**Change polling interval:** Edit `POLL_INTERVAL_MS` in `src/utils/constants.js`

**Add a new sport:** Add to `SPORTS` array in `src/utils/constants.js`

**Change the green theme:** Search for `#1a472a` across all files — replace with your colour

**Add a new stat card:** Import `StatCard` from `components/ui.jsx` and pass `label`, `value`, `color`
