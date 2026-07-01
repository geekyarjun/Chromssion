# URL Backup Chrome Extension — Specification

> Written following the [Spec-Driven Development](https://github.com/addyosmani/agent-skills/blob/main/skills/spec-driven-development/SKILL.md) methodology.
> Code without a spec is guessing.

---

## Objective

Provide a zero-configuration Chrome extension that silently records every URL a user visits, backs it up locally and to Google Drive, and exposes a clean dashboard to search, manage, and restore browsing history across machines.

### Success Metrics

- Every navigated URL is recorded within 1 second of navigation
- No duplicate entries for the same tab's current URL
- Drive upload completes within 60 seconds of any new record
- Dashboard renders 500+ records without visible lag
- Fresh install restores from Drive without any manual action by the user

---

## Commands

```bash
# Load extension locally
# chrome://extensions → Enable Developer Mode → Load Unpacked → select this folder

# Inspect live storage
# chrome://extensions → URL Backup → Service Worker → Console:
chrome.storage.local.get('url_records', (r) => console.table(r.url_records))

# Clear all records
chrome.storage.local.remove('url_records')

# Manual export trigger (from Service Worker console)
chrome.runtime.sendMessage({ action: 'exportNow' })
```

---

## Directory Structure

```
url-backup-extension/
├── manifest.json       # MV3 config — permissions, OAuth2, service worker
├── background.js       # Service worker — all recording, sync, alarm logic
├── dashboard.html      # Full-page dashboard UI (Records + Settings tabs)
├── dashboard.js        # Dashboard logic — render, search, delete, export
├── popup.html          # Minimal popup — record count, open dashboard, export
├── popup.js            # Popup logic
├── options.html        # First-run settings page (retention period)
├── options.js          # Options logic
├── icons/              # 16px, 48px, 128px PNG icons
├── README.md           # Install guide + usage
├── DESIGN.md           # Full design system (Supabase-inspired)
└── SPEC.md             # This file
```

---

## Features

---

### Feature 1 — URL Recording

**Objective**
Capture every URL the user visits across all Chrome windows and tabs with zero manual action.

**Triggers**
| Event | API | Condition |
|---|---|---|
| Tab navigates to new URL | `chrome.tabs.onUpdated` | `changeInfo.url` present |
| User switches to existing tab | `chrome.tabs.onActivated` | URL differs from last recorded |
| New window opens | `chrome.windows.onCreated` | Sweep tabs after 1s delay |
| Periodic sweep | `chrome.alarms` | Every 1 minute |
| Extension install / Chrome startup | `onInstalled` / `onStartup` | Full tab sweep |

**Record Schema**
```json
{
  "date": "2026-06-20",
  "time": "11:42:03",
  "timestamp": 1750420923000,
  "windowId": 1,
  "tabId": 101,
  "url": "https://example.com",
  "title": "Example Domain"
}
```

**Deduplication**
- In-memory `Map<tabId, lastRecordedUrl>` — a tab's record is replaced (not appended) when its URL changes
- `chrome.tabs.onRemoved` cleans up the cache on tab close
- Only `http://`, `https://`, and `file://` URLs are recorded — internal Chrome pages are ignored

**Filterable URLs**
- `chrome://` — internal Chrome pages
- `chrome-extension://` — extension pages
- Empty or `undefined` URLs

**Storage**
- `chrome.storage.local`, key: `url_records` (array)
- Upsert by `tabId` — same tab always holds exactly one record

**Boundaries**
- Must not record `chrome://` or `chrome-extension://` URLs
- Must not create duplicate entries for the same tab's current URL
- Must not block tab navigation or cause any visible lag

---

### Feature 2 — Google Drive Sync

**Objective**
Automatically upload the full URL backup to Google Drive every minute when the user is signed into Chrome with a Google account.

**Auth Flow**
1. On install: `chrome.identity.getAuthToken({ interactive: true })` — shows consent popup once
2. On all subsequent syncs: `chrome.identity.getAuthToken({ interactive: false })` — silent
3. If not signed in or token unavailable: skip Drive upload silently, no error shown

**OAuth Scope**
`https://www.googleapis.com/auth/drive.file` — narrowest possible; can only access files the extension itself created.

**Upload Logic**
1. `findDriveFileId(token)` — search Drive for existing `url-backup.json`
2. If found: `PATCH` (update in place)
3. If not found: `POST` (create new file)
4. Uses multipart upload with `FormData`

**File on Drive**
- Filename: `url-backup.json`
- Format: `{ exportedAt, totalRecords, records[] }`
- Conflict action: overwrite

**Trigger**
- Every 1 minute via `chrome.alarms` (same alarm as sweep)
- On manual Export button click (`interactive: false` — no popup on manual export)

**Boundaries**
- Must not prompt the user for auth on every export — only on install
- Must not fail silently on network error without retry — Drive upload is best-effort per cycle
- Client ID must be set in `manifest.json` before Drive sync works

---

### Feature 3 — Drive Restore

**Objective**
On fresh install or if local storage is empty, automatically pull the existing backup from Drive so history is never lost when reinstalling or switching machines.

**Trigger Conditions**
| Scenario | Trigger |
|---|---|
| Fresh install | `chrome.runtime.onInstalled` (reason: `install`) |
| Chrome restart with empty storage | `chrome.runtime.onStartup` |

**Restore Flow**
1. Check `chrome.storage.local` — if records exist, skip restore entirely
2. `getAuthToken(false)` — silent; if no token, skip
3. `findDriveFileId(token)` — if no file exists, skip
4. `GET /drive/v3/files/{id}?alt=media` — download JSON
5. `saveRecords(data.records)` — write to local storage

**Ordering on Install**
```
openOptionsPage()
  → getAuthToken(true)   ← user approves consent popup
  → restoreFromDrive()   ← token now cached, restore succeeds
  → sweepAllTabs()
```

**Boundaries**
- Must not overwrite existing local records with Drive data
- Must not prompt for auth during restore — token must already be available from install flow
- Must handle malformed Drive file gracefully (no crash)

---

### Feature 4 — Local Export (Downloads)

**Objective**
Allow users to export a human-readable JSON backup to `~/Downloads/url-backup.json` on demand or automatically.

**Triggers**
- Manual: "Export" button in popup or dashboard
- Automatic: every Drive sync cycle (paired with Drive upload)

**Implementation**
- Uses `data:application/json;charset=utf-8,...` URL (not `URL.createObjectURL` — unavailable in MV3 service workers)
- `chrome.downloads.download({ conflictAction: 'overwrite' })` — always overwrites same filename

**Output Format**
```json
{
  "exportedAt": "2026-06-20T11:42:03.000Z",
  "totalRecords": 142,
  "records": [ ... ]
}
```

**Pruning Before Export**
Old records are pruned before every export so the downloaded file always reflects the active retention window.

**Boundaries**
- Must not use `URL.createObjectURL` — not available in service workers
- Must always overwrite the same filename (not create `url-backup (1).json`)

---

### Feature 5 — Retention & Pruning

**Objective**
Automatically delete records older than the user-configured retention period to prevent unbounded storage growth.

**User Options**
7 days · 14 days · 30 days · 60 days · 90 days (default: 30)

**Prune Logic**
```js
const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
const pruned = records.filter(r => r.timestamp >= cutoff);
```
- Only writes to storage if records were actually removed (no-op guard)
- Runs every 24 hours via `chrome.alarms`
- Also runs before every export

**Settings Storage**
`chrome.storage.local`, key: `settings` → `{ retentionDays: number }`

**Boundaries**
- Must not delete records that are within the retention window
- Must not reset retention to default on extension update — persists in storage
- Prune is based on each record's `timestamp`, not install date

---

### Feature 6 — Dashboard

**Objective**
Provide a full-page UI for browsing, searching, and managing all recorded URLs grouped by Chrome window.

**Access**
- Popup → "Open Dashboard" button
- `chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })`

**Tabs**
| Tab | Content |
|---|---|
| Records | Grouped URL list with search, select, delete, open-all |
| Settings | Retention period picker + Drive sync status |

**Records Tab Features**

*Grouping*
- Records grouped by `windowId`, sorted ascending
- Each group has a color-coded icon cycling through 5 accent colors (green, purple, yellow, blue, pink)
- Groups are collapsible via header click

*Search*
- Live filter across `url` and `title` fields
- Matching text highlighted in emerald green
- Result count shown in toolbar

*Favicon*
- Loaded from `https://www.google.com/s2/favicons?domain={hostname}&sz=32`
- Hidden on load error (`onerror="this.style.visibility='hidden'"`)

*Selection*
- Row checkbox — select individual record
- Window header checkbox — select/deselect all in window (with indeterminate state)
- Yellow selection bar appears with count + "Delete selected" + "Clear selection"

*Delete*
- Single: ✕ button on row hover → deletes one record
- Multi: "Delete selected" in selection bar → deletes all selected
- Both immediately update `chrome.storage.local` and re-render

*Open All*
- "↗ Open all" button always visible in window header
- Opens first URL in a new Chrome window, remaining URLs as additional tabs in same window

**Settings Tab Features**
- Retention period selector (7 / 14 / 30 / 60 / 90 days)
- Drive sync status badge ("Syncing every minute")
- Save button — persists to `chrome.storage.local`

**Live Updates**
- `chrome.storage.onChanged` listener — dashboard re-renders automatically when background.js writes new records

**Boundaries**
- Must use event delegation for all dynamically rendered elements (CSP blocks inline `onclick`)
- Must not use `innerHTML` with unsanitized user data — all URL/title values are HTML-escaped
- Must handle empty state gracefully with friendly message

---

### Feature 7 — Popup

**Objective**
Provide a minimal at-a-glance view of extension status accessible from the Chrome toolbar.

**Content**
- Status dot (green, glowing) + "URL Backup" title + "Active" badge
- Total record count
- "Open Dashboard" button → opens dashboard in new tab
- "Export to Downloads" button → triggers export + Drive sync

**Design**
Dark theme (Raycast-inspired) — `#07080a` background, white primary button, dark tertiary button.

**Boundaries**
- Must not replicate full dashboard functionality — keep it minimal
- Width fixed at `260px`

---

### Feature 8 — First-Run Settings (Options Page)

**Objective**
On first install, prompt the user to configure their retention period before recording begins.

**Trigger**
`chrome.runtime.openOptionsPage()` called inside `onInstalled` when `reason === 'install'`

**Content**
- Extension name + subtitle
- Retention period grid (7 / 14 / 30 / 60 / 90 days)
- Save button with confirmation message

**Default**
30 days — pre-selected on load if no setting exists.

**Boundaries**
- Must not block recording — options page is informational, recording starts immediately on install
- Must persist selection to `chrome.storage.local` on Save, not on selection

---

## Code Style

- Vanilla JS only — no frameworks, no build step, no bundler
- Async/await throughout — no raw Promise chains
- Event delegation for all dynamically rendered HTML elements
- HTML escape all user-derived content before inserting into `innerHTML`
- No `console.log` in production (debug logs may be added temporarily)
- CSS: no frameworks, plain CSS variables for theming

---

## Testing

**Manual test checklist**

| Test | Expected |
|---|---|
| Navigate to a new URL | Record appears in dashboard within 1s |
| Navigate same tab to new URL | Previous record replaced, not duplicated |
| Switch back to an already-recorded tab | No new record added |
| Open new window | Its tabs recorded after 1s |
| Close tab | Cache entry cleaned, no dangling reference |
| Click "Open all" on Window 2 | New Chrome window opens with all Window 2 URLs |
| Select 3 rows → Delete selected | 3 records removed, storage updated |
| Single ✕ delete | 1 record removed |
| Search "github" | Only GitHub URLs shown, term highlighted |
| Set retention to 7 days → Save | Setting persists after popup close |
| Remove extension → Reinstall | Drive restore populates records automatically |
| Sign out of Chrome → Export | Export still works locally, Drive silently skipped |

---

## Permissions Rationale

| Permission | Justification |
|---|---|
| `tabs` | Read `url`, `title`, `windowId` from tabs |
| `windows` | `chrome.windows.create` for "Open all" feature |
| `storage` | `chrome.storage.local` for records and settings |
| `downloads` | Write `url-backup.json` to Downloads folder |
| `alarms` | Schedule 1-min sweep, 24-hr prune |
| `identity` | Obtain OAuth token for Drive API |
| `https://www.googleapis.com/*` | Drive API upload/download/search |
| `https://www.google.com/s2/favicons*` | Fetch favicons for dashboard display |

---

## Boundaries

**Must do**
- Record only `http://`, `https://`, `file://` URLs
- Replace (upsert) records by `tabId`, never append duplicates
- Use event delegation — no inline `onclick` in dynamically injected HTML
- Escape all HTML before inserting URL/title into DOM
- Use `data:` URLs for downloads (not `URL.createObjectURL` — unavailable in service workers)
- Await `getAuthToken(true)` before calling `restoreFromDrive()` on install

**Must not do**
- Record `chrome://` or `chrome-extension://` internal pages
- Prompt for OAuth on every export — only on first install
- Overwrite existing local records with Drive data during restore
- Use any third-party libraries or bundlers
- Store the OAuth client secret in code (client ID only is safe)
