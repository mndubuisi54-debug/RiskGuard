// =============================================================
// simulator.js: fake activity for testing
// =============================================================

function randomEvent() {
  const account = randomItem(ACCOUNTS);
  const risky = Math.random() < 0.18; // about 1 in 6 events looks suspicious

  const country = risky ? randomItem(COUNTRIES) : account.country;
  const device = risky && Math.random() < 0.6
    ? "Unknown-" + Math.floor(Math.random() * 900)
    : randomItem(account.devices);
  const vpn = risky && Math.random() < 0.3;

  // Sellers sign in or request payouts
  if (account.type === "Seller") {
    if (Math.random() < 0.85) return { account: account.id, type: "login", country, device, vpn };
    const amount = Math.round(account.balance * (0.1 + Math.random() * 0.4));
    return { account: account.id, type: "payout", country, device, vpn, amount };
  }

  // Customers sign in, fail to sign in, or order
  const roll = Math.random();
  if (roll < 0.25) return { account: account.id, type: "login", country, device, vpn };
  if (roll < 0.30) return { account: account.id, type: "loginFail", country, device, vpn };

  const giftCard = risky && Math.random() < 0.4;
  const multiplier = risky ? 1 + Math.random() * 9 : 0.3 + Math.random() * 1.6;
  return {
    account: account.id, type: "order", country, device, vpn,
    amount: Math.round(account.avgOrder * multiplier),
    giftCard,
    item: giftCard ? "Gift card" : randomItem(["Headphones", "Books", "Kitchenware", "Shoes", "Coffee"]),
    address: risky && Math.random() < 0.5 ? "ADDR-" + Math.floor(Math.random() * 10000) : "HOME"
  };
}

function toggleLive() {
  state.live = !state.live;
  $("liveBtn").textContent = state.live ? "❚❚ Pause live feed" : "▶ Start live feed";
  $("liveBtn").classList.toggle("on", state.live);
  restartTimer();
}

function restartTimer() {
  clearInterval(state.timer);
  if (state.live) {
    state.timer = setInterval(() => processEvent(randomEvent()), Number($("speed").value));
  }
}

// Feed a list of events in one by one, half a second apart
function playSequence(events) {
  events.forEach((event, i) => setTimeout(() => processEvent(event), i * 500));
}

function activeCustomer() {
  return ACCOUNTS.find(a => a.type === "Customer" && a.status === "Active") || ACCOUNTS[0];
}

function runScenario(name) {
  if (name === "takeover") {
    const a = activeCustomer();
    const bad = { account: a.id, country: "RO", device: "Linux-VM-662", vpn: true };
    playSequence([
      { ...bad, type: "loginFail" },
      { ...bad, type: "loginFail" },
      { ...bad, type: "loginFail" },
      { ...bad, type: "reset" },
      { ...bad, type: "order", amount: a.avgOrder * 12, giftCard: true, item: "Gift cards x10", address: "ADDR-DROP" },
      { ...bad, type: "order", amount: a.avgOrder * 6,  giftCard: true, item: "Gift cards x5",  address: "ADDR-DROP" }
    ]);
    toast("Running account takeover on " + a.id);
  }

  if (name === "cardTesting") {
    const a = activeCustomer();
    const base = { account: a.id, country: a.country, device: "Unknown-555" };
    playSequence([
      { ...base, type: "addCard" },
      { ...base, type: "addCard" },
      { ...base, type: "order", amount: 3, item: "E-book", address: "HOME" },
      { ...base, type: "order", amount: 2, item: "E-book", address: "HOME" },
      { ...base, type: "order", amount: 4, item: "E-book", address: "HOME" },
      { ...base, type: "order", amount: 650, item: "Laptop", address: "ADDR-NEW" }
    ]);
    toast("Running card testing on " + a.id);
  }

  if (name === "payout") {
    const a = ACCOUNTS.find(x => x.type === "Seller" && x.status === "Active") || ACCOUNTS[4];
    const bad = { account: a.id, country: "NG", device: "Win-VM-201", vpn: true };
    playSequence([
      { ...bad, type: "login" },
      { ...bad, type: "bank" },
      { ...bad, type: "payout", amount: Math.round(a.balance * 0.98) }
    ]);
    toast("Running payout redirection on " + a.id);
  }

  if (name === "refund") {
    const a = activeCustomer();
    const base = { account: a.id, country: a.country, device: a.devices[0], item: "Item not received" };
    playSequence([
      { ...base, type: "refund", amount: a.avgOrder * 4 },
      { ...base, type: "refund", amount: a.avgOrder * 5 },
      { ...base, type: "refund", amount: a.avgOrder * 7, device: "Unknown-44" }
    ]);
    toast("Running refund abuse on " + a.id);
  }

  if (name === "normal") {
    const a = activeCustomer();
    processEvent({ account: a.id, type: "order", country: a.country, device: a.devices[0], amount: a.avgOrder, item: "Books", address: "HOME" });
    toast("Normal order from " + a.id);
  }
}