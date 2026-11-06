// Shortcut for document.getElementById
function $(id) {
  return document.getElementById(id);
}

// Pick a random item from an array
function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// 1234.5 -> "£1,235"
function money(amount) {
  return "£" + Math.round(amount).toLocaleString("en-GB");
}

// Date -> "22:14:05"
function timeText(date) {
  return date.toLocaleTimeString("en-GB");
}

// Make text safe to put inside HTML (stops <script> injection)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findAccount(id) {
  return ACCOUNTS.find(account => account.id === id);
}

// The reviewer chosen in the top-right menu
function currentReviewer() {
  return REVIEWERS.find(r => r.id === $("reviewer").value);
}

// Show a pop-up message for 3 seconds
function toast(message) {
  const box = $("toast");
  box.textContent = message;
  box.classList.add("show");
  clearTimeout(box.hideTimer);
  box.hideTimer = setTimeout(() => box.classList.remove("show"), 3000);
}

// Add an entry to the audit log. Entries are only ever added, never changed.
function addAudit(actor, action, detail) {
  state.audit.unshift({ time: new Date(), actor, action, detail });
  if (state.view === "audit") renderAudit();
}

// Per-account memory the rules need (failed logins, orders, etc.)
function getHistory(accountId) {
  if (!state.history[accountId]) {
    state.history[accountId] = {
      failedLogins: [],   // timestamps (ms)
      orders: [],
      newCards: [],
      refunds: [],
      lastReset: null,
      addresses: ["HOME"],
      lastLocation: null  // { country, time }
    };
  }
  return state.history[accountId];
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// How many timestamps in a list fall within the last `windowMs` before `now`
function countRecent(timestamps, now, windowMs) {
  return timestamps.filter(t => now - t < windowMs).length;
}