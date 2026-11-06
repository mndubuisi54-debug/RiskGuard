// engine.js: the risk engine
//   scoreEvent(event)   -> { score, reasons }
//   rememberEvent(event) records it so later events can be compared

function scoreEvent(event) {
  const account = findAccount(event.account);
  const history = getHistory(event.account);
  const now = event.time.getTime();
  const matched = [];

  // Add a rule to the result, but only if it is switched on
  function hit(ruleId) {
    const rule = RULES.find(r => r.id === ruleId);
    if (rule && rule.on && !matched.includes(rule)) matched.push(rule);
  }

   // --- Who / where ---
  if (!account.devices.includes(event.device)) hit("newDevice");
  if (event.country !== account.country) hit("geo");
  if (HIGH_RISK_COUNTRIES.includes(event.country) || event.vpn) hit("highRiskGeo");

  const last = history.lastLocation;
  if (last && last.country !== event.country && now - last.time < 30 * MINUTE) hit("travel");

  if (countRecent(history.failedLogins, now, 15 * MINUTE) >= 3) hit("failedLogins");

  const moneyTypes = ["order", "payout", "addCard", "address"];
  if (history.lastReset && now - history.lastReset < 24 * HOUR && moneyTypes.includes(event.type)) {
    hit("recentReset");
  }
  // --- Orders ---
  if (event.type === "order") {
    if (account.avgOrder && event.amount > 5 * account.avgOrder) hit("highValue");
    if (event.giftCard) hit("giftCard");
    if (event.address && !history.addresses.includes(event.address)) hit("newAddress");
    if (countRecent(history.orders, now, 10 * MINUTE) >= 3) hit("velocity");
  }

  if ((event.type === "order" || event.type === "addCard") &&
      countRecent(history.newCards, now, HOUR) >= 2) {
    hit("newCards");
  }

  // --- Seller payouts ---
  if (event.type === "payout") {
    if (account.bankChangedAt && now - account.bankChangedAt < 72 * HOUR) hit("bankChange");
    if (event.amount > 0.9 * account.balance) hit("fullWithdraw");
  }

  // --- Refunds ---
  if (event.type === "refund" && history.refunds.length >= 2) hit("refundPattern");

  // Add up the weights, max 100
  let score = 0;
  for (const rule of matched) score += rule.weight;
  score = Math.min(score, 100);

  return { score, reasons: matched.map(r => r.name) };
}

// Called AFTER scoring, so an event is never compared with itself
function rememberEvent(event) {
  const history = getHistory(event.account);
  const now = event.time.getTime();

  if (event.type === "loginFail") history.failedLogins.push(now);
  if (event.type === "reset")     history.lastReset = now;
  if (event.type === "addCard")   history.newCards.push(now);
  if (event.type === "refund")    history.refunds.push(now);
  if (event.type === "bank") 
 findAccount(event.account).bankChangedAt = now;
  if (event.type === "order") {
    history.orders.push(now);
    if (event.address && !history.addresses.includes(event.address)) history.addresses.push(event.address);
  }
  history.lastLocation = { country: event.country, time: now };
}

// Human-readable names for event types
const EVENT_LABELS = {
  login: "Sign-in", loginFail: "Failed sign-in", reset: "Password reset",
  order: "Order", addCard: "New payment card", address: "Address added",
  payout: "Payout", bank: "Bank details changed", refund: "Refund claim"
};

// One line of text describing an event
function describeEvent(event) {
  let text = EVENT_LABELS[event.type];
  if (event.amount) text += " · " + money(event.amount);
  if (event.giftCard) text += " · gift cards";
  if (event.item) text += " · " + escapeHtml(event.item);
  text += ` <span class="reasons">· ${event.country}${event.vpn ? " (VPN)" : ""} · ${escapeHtml(event.device)}</span>`;
  return text;
}