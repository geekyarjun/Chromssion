const DB_KEY = 'url_records';
const SETTINGS_KEY = 'settings';
const DEFAULT_RETENTION_DAYS = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

function now() {
  const d = new Date();
  return {
    date: d.toLocaleDateString('en-CA'),          // YYYY-MM-DD
    time: d.toTimeString().slice(0, 8),           // HH:MM:SS
    timestamp: d.getTime(),
  };
}

function isRecordable(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://');
}

async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return result[SETTINGS_KEY] || { retentionDays: DEFAULT_RETENTION_DAYS };
}

async function getRecords() {
  const result = await chrome.storage.local.get(DB_KEY);
  return result[DB_KEY] || [];
}

async function saveRecords(records) {
  await chrome.storage.local.set({ [DB_KEY]: records });
}

// ── Core record logic ─────────────────────────────────────────────────────────

// Tracks the last recorded URL per tab. Only record when URL actually changes.
const tabUrlCache = new Map(); // tabId -> lastRecordedUrl

async function addRecord(url, windowId, tabId, title) {
  if (!isRecordable(url)) return;
  if (tabUrlCache.get(tabId) === url) return; // same URL, skip
  tabUrlCache.set(tabId, url);

  const { date, time, timestamp } = now();
  const record = { date, time, timestamp, windowId, tabId, url, title: title || '' };

  const records = await getRecords();
  const existingIndex = records.findIndex(r => r.tabId === tabId);
  if (existingIndex !== -1) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  await saveRecords(records);
}

// ── Pruning ───────────────────────────────────────────────────────────────────

async function pruneOldRecords() {
  const { retentionDays } = await getSettings();
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const records = await getRecords();
  const pruned = records.filter(r => r.timestamp >= cutoff);
  if (pruned.length !== records.length) {
    await saveRecords(pruned);
  }
}

// ── Sweep all open tabs ───────────────────────────────────────────────────────

async function sweepAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && tab.windowId) {
      await addRecord(tab.url, tab.windowId, tab.id, tab.title);
    }
  }
}

// ── Google Drive upload ───────────────────────────────────────────────────────

const DRIVE_FILENAME = 'url-backup.json';

async function getAuthToken(interactive = false) {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}

async function findDriveFileId(token) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D'${DRIVE_FILENAME}'+and+trashed%3Dfalse&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function uploadToDrive(json, interactive = false) {
  // Try silent first; if it fails and this is a manual export, try interactive
  let token = await getAuthToken(false);
  if (!token && interactive) {
    token = await getAuthToken(true);
  }
  if (!token) return null; // not signed in — skip silently

  const fileId = await findDriveFileId(token);
  const metadata = { name: DRIVE_FILENAME, mimeType: 'application/json' };
  const body = new Blob(
    [JSON.stringify(metadata), '\r\n--boundary\r\nContent-Type: application/json\r\n\r\n', json],
    { type: 'multipart/related; boundary=boundary' }
  );

  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const method = fileId ? 'PATCH' : 'POST';

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([json], { type: 'application/json' }));

  await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return token;
}

// ── Google Drive restore ──────────────────────────────────────────────────────

async function restoreFromDrive() {
  const existing = await getRecords();
  if (existing.length > 0) return; // local data exists, nothing to restore

  const token = await getAuthToken(false);
  if (!token) return; // not signed in

  const fileId = await findDriveFileId(token);
  if (!fileId) return; // no backup file on Drive yet

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return;

  const data = await res.json();
  if (Array.isArray(data.records) && data.records.length > 0) {
    await saveRecords(data.records);
    console.log(`Restored ${data.records.length} records from Google Drive.`);
  }
}

// ── Export to Downloads ───────────────────────────────────────────────────────

async function exportToDownloads(interactive = false) {
  await pruneOldRecords();
  const records = await getRecords();
  const json = JSON.stringify(
    { exportedAt: new Date().toISOString(), totalRecords: records.length, records },
    null,
    2
  );

  // Local download
  const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
  await chrome.downloads.download({
    url: dataUrl,
    filename: 'url-backup.json',
    conflictAction: 'overwrite',
    saveAs: false,
  });

  // Drive upload — interactive on manual export so consent popup can appear
  const token = await uploadToDrive(json, interactive);
  return !!token;
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Tab navigated to a new URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.windowId) {
    addRecord(changeInfo.url, tab.windowId, tabId, tab.title);
  }
});

// Tab activated (user switches to existing tab)
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) addRecord(tab.url, windowId, tabId, tab.title);
});

// Clean up cache when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabUrlCache.delete(tabId);
});

// New window opened — sweep its tabs once loaded
chrome.windows.onCreated.addListener(async (window) => {
  // Brief delay to let tabs populate
  setTimeout(async () => {
    const tabs = await chrome.tabs.query({ windowId: window.id });
    for (const tab of tabs) {
      if (tab.url) addRecord(tab.url, window.id, tab.id, tab.title);
    }
  }, 1000);
});

// ── Alarms ────────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sweep') {
    await sweepAllTabs();
    await uploadToDrive(JSON.stringify(await getRecords()));
  } else if (alarm.name === 'prune') {
    await pruneOldRecords();
  }
});

// ── Startup / install ─────────────────────────────────────────────────────────

async function setup() {
  // Sweep + Drive sync every 1 minute
  chrome.alarms.create('sweep', { periodInMinutes: 1 });
  // Prune daily
  chrome.alarms.create('prune', { periodInMinutes: 60 * 24 });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await setup();
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
    await getAuthToken(true); // prompt Drive auth on first install
    await restoreFromDrive(); // pull backup if local storage is empty
  }
  await sweepAllTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await setup();
  await restoreFromDrive(); // restore silently on every Chrome startup if storage is empty
  await sweepAllTabs();
});

// ── Message handler (from popup) ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'exportNow') {
    (async () => {
      try {
        const driveSync = await exportToDownloads(true); // interactive = true for manual export
        sendResponse({ ok: true, driveSync });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (message.action === 'getStats') {
    getRecords().then(records => {
      sendResponse({ total: records.length, latest: records.at(-1) || null });
    });
    return true;
  }
});
