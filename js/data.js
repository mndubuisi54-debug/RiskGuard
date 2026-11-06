// Sample data for the risk monitor 
// This data can be replaced with actual data from your backend or API

// people who can review cases. level 0 = read-only, 3 = manager. 

const REVIEWERS = [
    { id: "R-101", name: "N. Soma", role: "Fraud Ops Manager", pin: "3333", level: 3 },
    { id: "R-205", name: "A. Jennifer", role: "Risk Analyst", pin: "1111", level: 1 },
    { id: "R-1510", name: "N. Juliet", role: "Senior Investigator", pin: "2222", level: 2 },
    { id: "V-061", name: "M. Miracle", role: "Support Agent", pin: "0000", level: 0 }
];

// Account we are monitoring. This is a sample account with some transactions and risk scores.
const ACCOUNTS = [
    { id: "CUS-46701", name: "John Doe", type: "Customer", country: "USA", devices: ["Pixel-10", "Iphone 18 PRO"], avgOrder: 5, currency: "Pound", description: "Online purchase", status: "Active" },
    { id: "SEL-1002", name: "Amazon", type: "Seller", country: "GB", devices: ["Ipad-9B10"], balance: 18450, bankChangedAt: null, currency: "USD", description: "Online Sells", status: "Active" },
    { id: "CUS-57803", name: "Alice Johnson", type: "Customer", country: "CA", devices: ["Tablet"], avgOrder: 12, currency: "USD", description: "Online subscription", status: "Active" },
    { id: "SEL-1304", name: "NorthernLine Gadget", type: "Seller", country: "AU", devices: ["Laptop-77B"], balance: 9800, bankChangedAt: null, currency: "USD", description: "Black Friday Sale", status: "Active" },
    { id: "CUS-98004", name: "Bob Brown", type: "Customer", country: "NG", devices: ["Iphone 18 PRO"], avgOrder: 75, currency: "USD", description: "In-store purchase", status: "Active" },
    { id: "SEL-1005", name: "Lattafa Perfumes", type: "Seller", country: "NZ", devices: ["Samsung Galaxy S25", "Office-PC-1A"], balance: 36345, bankChangedAt: null, currency: "USD", description: "Next Day Delivery", status: "Active" }    
];

const COUNTRIES = ["GB", "DE", "FR", "US", "NG", "RU",
"BR", "VN", "IN", "RO"];

const HIGH_RISK_COUNTRIES = ["NG", "RU", "VN", "RO"];

// Detection rules. weight = points added to the risk score when the rule matches.
const RULES = [
    {id: "newwDevice",   name: "Unrecognised device", weight: 10, on: true, desc: "Device not seen on this account before"},
    {id: "geo",  name: "Location mismatch", weight: 15, on: true, desc: "Country is not the account's home country"},
    {id: "highRiskGeo",   name: "High-risk region or VPN", weight: 15, on: true, desc: "High-risk country, or a VPN / proxy"},
    { id: "travel",   name: "Impossible travel", weight: 25, on: true, desc: "Two countries within 30 minutes" },
    { id: "failedLogins",  name: "Repeated failed logins",       weight: 20, on: true, desc: "3+ failed sign-ins in 15 minutes" },
    { id: "recentReset",   name: "Recent password reset",        weight: 15, on: true, desc: "Money activity within 24h of a reset" },
    { id: "highValue",     name: "Unusually high value",         weight: 20, on: true, desc: "Order over 5x the account's average" },
    { id: "giftCard",      name: "Gift card purchase",           weight: 15, on: true, desc: "Gift cards are easy to resell" },
    { id: "newAddress",    name: "New shipping address",         weight: 10, on: true, desc: "First use of this delivery address" },
    { id: "velocity",      name: "Order velocity",               weight: 25, on: true, desc: "3+ orders already in the last 10 minutes" },
    { id: "newCards",      name: "Multiple new cards",           weight: 20, on: true, desc: "2+ new cards added in the last hour" },
    { id: "bankChange",    name: "Payout after bank change",     weight: 35, on: true, desc: "Payout within 72h of changing bank details" },
    { id: "fullWithdraw",  name: "Full-balance withdrawal",      weight: 15, on: true, desc: "Payout over 90% of the balance" },
    { id: "refundPattern", name: "Refund claim pattern",         weight: 30, on: true, desc: "3rd refund claim or more" }
];

// Score thresholds and code settings.
const SETTINGS = {
    verifyAt: 40, // score >= 40: pause this event for a customer code
    blockAt: 70, // score >= 70
    dualAt: 90,       // score >= 90: two different reviewers must approve
    codeLifetime: 120, // seconds a one-time code stays valid
    maxCodeTries: 3
};

// Everything that changes while the app runs lives in `state`.
const state = {
  events: [],   // newest first
  cases: [],    // newest first
  audit: [],    // newest first, never edited
  history: {},  // per-account memory, see getHistory()
  stats: { total: 0, allowed: 0, verify: 0, blocked: 0, valueProtected: 0 },
  live: false,
  timer: null,
  view: "monitor"
};
let nextEventNumber = 1000;
let nextCaseNumber = 1;