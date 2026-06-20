# URL Backup — Chrome Extension

A Chrome extension that automatically records every URL you visit across all windows and tabs, stores them locally, and syncs backups to Google Drive.

---

## Features

- **Automatic recording** — captures URLs on navigation, tab switch, and window open
- **1-minute sweep** — polls all open tabs every minute to catch anything missed
- **Per-tab deduplication** — each tab holds exactly one record; updates in place when you navigate
- **Google Drive sync** — uploads `url-backup.json` to your Drive every minute when signed in
- **Restore from Drive** — on fresh install or if local storage is empty, pulls your backup back from Drive automatically
- **Configurable retention** — prune records older than 7, 14, 30, 60, or 90 days
- **Dashboard** — full-page UI with search, window grouping, favicon display, multi-select delete, and "Open all" per window
- **Export** — manual one-click export to `~/Downloads/url-backup.json`

---

## Installation

### 1. Clone or download the extension

```bash
git clone https://github.com/your-username/url-backup-extension
# or download and unzip the folder
```

### 2. Set up Google OAuth (for Drive sync)

> Skip this section if you only want local backups.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project
2. Navigate to **APIs & Services → Library** and enable the **Google Drive API**
3. Go to **APIs & Services → OAuth consent screen**
   - Set user type to **External**
   - Fill in app name and your email
   - Under **Test users**, add your Google account email
   - Save
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Chrome Extension**
   - In the **Application ID** field, paste your extension ID (you'll get this in step 4 below)
   - Click **Create** and copy the generated **Client ID**
5. Open `manifest.json` and replace the placeholder:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     ...
   }
   ```

### 3. Load the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `url-backup-extension` folder
5. Copy the **Extension ID** shown on the extension card — you'll need this for the OAuth client in step 2.4 above

### 4. First launch

- The **Settings page** opens automatically on install — choose your retention period and save
- If Google Drive is configured, a consent popup will appear asking for Drive access — approve it once and all future syncs happen silently

---

## How It Works

| Event | What happens |
|---|---|
| Tab navigates to a new URL | Recorded immediately in `chrome.storage.local` |
| User switches to an existing tab | Recorded if URL differs from last capture |
| New window opens | All its tabs swept after 1 second |
| Every 1 minute | Full sweep of all open tabs + Drive upload |
| Every 24 hours | Old records pruned based on retention setting |
| Chrome starts up | Restores from Drive if local storage is empty |

### Record format

Each record stored in `chrome.storage.local` (key: `url_records`) looks like:

```json
{
  "date": "2026-06-20",
  "time": "11:42:03",
  "timestamp": 1750420923000,
  "windowId": 1,
  "tabId": 101,
  "url": "https://github.com",
  "title": "GitHub"
}
```

---

## Dashboard

Click **Open Dashboard** from the popup to access the full UI:

- **Records tab** — all captured URLs grouped by window, with favicon, title, date/time
  - Search across URLs and titles
  - Select individual rows or all rows in a window
  - Delete selected records or single records
  - Open all tabs of a window in a new Chrome window
- **Settings tab** — configure retention period and view Drive sync status

---

## Inspecting Raw Data

Open the Service Worker console at `chrome://extensions` → click **Service Worker** on the URL Backup card, then run:

```js
// View all records
chrome.storage.local.get('url_records', (r) => console.table(r.url_records))

// Delete everything
chrome.storage.local.remove('url_records')

// Keep only last 7 days manually
chrome.storage.local.get('url_records', (r) => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = (r.url_records || []).filter(rec => rec.timestamp >= cutoff);
  chrome.storage.local.set({ url_records: filtered });
  console.log(`Kept ${filtered.length} records`);
})
```

---

## File Structure

```
url-backup-extension/
├── manifest.json       # Extension config, permissions, OAuth client ID
├── background.js       # Service worker — recording, sweep, Drive sync, alarms
├── dashboard.html      # Full-page dashboard UI
├── dashboard.js        # Dashboard logic — render, search, delete, export
├── popup.html          # Minimal popup — record count + open dashboard
├── popup.js            # Popup logic
├── options.html        # Settings page (retention period)
├── options.js          # Settings logic
└── icons/              # Extension icons (16, 48, 128px)
```

---

## Permissions Used

| Permission | Reason |
|---|---|
| `tabs` | Read tab URLs and titles |
| `windows` | Open all tabs in a new window |
| `storage` | Store records in `chrome.storage.local` |
| `downloads` | Save `url-backup.json` to Downloads folder |
| `alarms` | 1-minute sweep + 24-hour prune schedule |
| `identity` | Silent OAuth token for Drive sync |
| `https://www.googleapis.com/*` | Google Drive API calls |
| `https://www.google.com/s2/favicons*` | Fetch website favicons for the dashboard |
