# 🛡️ Sentinel: Risk Monitoring & Transaction Verification Engine

> A real-time fraud detection and transaction verification system for online marketplaces. It monitors account activity, scores every action with a weighted rules engine, automatically places suspicious accounts on temporary hold, and requires customer verification or authorised reviewer sign-off before activity can resume.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Custom%20Properties-1572B6?logo=css3&logoColor=white)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)
![Engine](https://img.shields.io/badge/Engine-Rules--Based%20Scoring-6f42c1)
![Status](https://img.shields.io/badge/Status-Prototype-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📌 Architecture Overview

Sentinel funnels every account event (sign-ins, orders, payment changes, refunds and payouts) through a single processing pipeline. Each event is checked against the account's hold status, scored from 0 to 100 by a weighted rules engine, and routed to one of three outcomes: **allow**, **pause for verification**, or **block and hold the account**. Held activity cannot resume until it passes a one-time code check or an authorised reviewer releases it.

```
┌──────────────────────────────────────────────────────────────┐
│                       Event Ingestion                        │
│          Live feed / Scenarios  ──►  processEvent()          │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                          Hold Check                          │
│        Account on hold?  ──►  REJECT + attach to case        │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                  Risk Engine  (score 0–100)                  │
│  • Unrecognised Device        • Impossible Travel            │
│  • Failed-Login Burst         • Order Velocity               │
│  • High-Value / Gift Cards    • Payout After Bank Change     │
│  • Refund Pattern             • + 7 more weighted rules      │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                       Decision Router                        │
│  • < 40   →  ALLOW            • 70+  →  BLOCK (hold)         │
│  • 40–69  →  VERIFY (pause)   • 90+  →  two reviewers        │
└──────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
 ┌────────────────────────────┐  ┌────────────────────────────┐
 │   Customer Verification    │  │     Authorised Review      │
 │ • 6-digit one-time code    │  │ • PIN + mandatory note     │
 │ • 120 s expiry, 3 attempts │  │ • Role-based permissions   │
 │ • Sent to details on file  │  │ • Four-eyes on high risk   │
 └────────────────────────────┘  └────────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                           Outcome                            │
│          Activity resumes   or   Account suspended           │
└──────────────────────────────────────────────────────────────┘

        Every step is written to an append-only Audit Log
```

---

## ✨ Key Features

### 🔍 Monitoring
- **Live activity feed** with real-time scoring and decision labels
- **Dashboard KPIs:** events processed, allowed, verified, blocked, and value protected
- **Simulated traffic generator** with adjustable speed for load and behaviour testing

### 🧠 Detection
- **14 weighted rules** covering identity, location, velocity, payment and payout signals
- **Per-account behavioural memory** for time-windowed pattern detection
- **Explainable decisions:** every score lists the exact rules that triggered it
- **Live tuning:** enable or disable rules and adjust weights without a restart

### ⛔ Enforcement
- **Event-level pause** for medium risk (score 40–69)
- **Account-level hold** for high risk (score 70+). All further activity is rejected and attached to the case.
- **Manual holds** placed directly by authorised staff

### ✅ Review & Verification
- **One-time passcodes** with 120-second expiry and a 3-attempt lockout that escalates to a hold
- **Role-based access:** read-only, analyst, investigator and manager levels
- **Four-eyes principle:** cases scoring 90+ need approval from two *different* reviewers
- **Mandatory review notes** on every decision
- **Append-only audit log** of every system and reviewer action

---

## 🧮 Detection Rules

| Rule | Weight | Trigger |
| --- | :---: | --- |
| Payout after bank change | 35 | Seller payout within 72 h of a bank-details change |
| Refund claim pattern | 30 | Third or later refund claim |
| Impossible travel | 25 | Two countries within 30 minutes |
| Order velocity | 25 | 3+ orders in the previous 10 minutes |
| Unrecognised device | 20 | Device not previously seen on the account |
| Repeated failed logins | 20 | 3+ failed sign-ins within 15 minutes |
| Unusually high value | 20 | Order over 5× the account's average |
| Multiple new cards | 20 | 2+ new payment cards added within 1 hour |
| Location mismatch | 15 | Activity outside the account's home country |
| High-risk region or VPN | 15 | High-risk geography or anonymising connection |
| Recent password reset | 15 | Financial activity within 24 h of a reset |
| Gift card purchase | 15 | High-liquidity, easily resold items |
| Full-balance withdrawal | 15 | Payout over 90% of available balance |
| New shipping address | 10 | First use of a delivery address |

### Decision Thresholds

| Score | Decision | Effect | Required to resume |
| :---: | --- | --- | --- |
| 0–39 | 🟢 **ALLOW** | Event proceeds | — |
| 40–69 | 🟡 **VERIFY** | Single event paused | Customer code **or** one reviewer |
| 70–89 | 🔴 **BLOCK** | Whole account on hold | One authorised reviewer |
| 90–100 | 🔴 **BLOCK** | Whole account on hold | Two different reviewers |

---

## 📂 Project Structure

```
risk-monitor/
├── index.html          # Layout: header, tabs and five screens
├── css/
│   └── style.css       # Styling and colour variables
└── js/
    ├── data.js         # Accounts, reviewers, rules, thresholds and app state
    ├── helpers.js      # Shared utilities: formatting, escaping, audit logging
    ├── engine.js       # Risk scoring (scoreEvent) and behavioural memory
    ├── pipeline.js     # processEvent(): hold check, scoring, decision, cases
    ├── render.js       # Draws each screen from state
    ├── review.js       # One-time codes, reviewer sign-off, rule settings
    ├── simulator.js    # Live traffic generator and attack scenarios
    └── main.js         # Wires up event listeners and starts the app
```

---

## 🚀 Getting Started

No build step, no dependencies. It runs in any modern browser.

```bash
# Clone the repository
git clone https://github.com/ mndubuisi54-debug/risk-monitor.git
cd risk-monitor
```

Then either:
- **Double-click `index.html`** to open it in your browser, or
- In **VS Code**, install the *Live Server* extension, right-click `index.html` and choose **Open with Live Server**.

---

## 🧪 Attack Scenarios

Built-in scenarios reproduce common fraud patterns for testing and demos:

| Scenario | Pattern | Expected result |
| --- | --- | --- |
| **Account takeover** | Failed logins from abroad on a VPN, password reset, gift-card orders | Account held at the reset (score 70). Gift-card orders rejected. |
| **Card testing** | New cards, tiny test orders, then a high-value purchase | Velocity and new-card rules escalate the score |
| **Payout redirection** | Bank details changed, then 98% balance withdrawal | Score 100. Two-reviewer approval required. |
| **Refund abuse** | Repeated "item not received" claims | Refund-pattern rule triggers |
| **Normal customer** | Typical order from a known device | Allowed |

### Demo Reviewer Credentials

| Reviewer | Role | Level | PIN |
| --- | --- | :---: | :---: |
| A. Patel | Risk Analyst | 1 | `1111` |
| J. Okafor | Senior Investigator | 2 | `2222` |
| M. Chen | Fraud Ops Manager | 3 | `3333` |
| Viewer | Support Agent (read-only) | 0 | — |

> ⚠️ These credentials are for demonstration only and are visible in the source code.

---

## 🔄 How a Hold Is Resolved

1. **Detection:** an event scores 70 or more and the account status changes to `On hold`.
2. **Containment:** every further event on that account is rejected and attached to the case.
3. **Verification (optional):** the reviewer sends a one-time code to the customer's contact details on file.
4. **Review:** an authorised reviewer records a note and enters their PIN.
5. **Resolution:**
   - ✅ **Approve:** the hold is lifted and the account returns to `Active`
   - ❌ **Confirm fraud:** held activity is cancelled and the account is `Suspended`
   - ⬆️ **Escalate:** the case now needs two reviewers

---

## 🗺️ Roadmap

- [ ] Move scoring and enforcement to a server-side API (Node.js / Python)
- [ ] Persistent storage (PostgreSQL) and a sliding-window cache (Redis)
- [ ] Real SMS / authenticator delivery for one-time codes
- [ ] Single sign-on and MFA for reviewers
- [ ] Tamper-evident, write-once audit storage
- [ ] Machine-learning risk score alongside the rules engine
- [ ] Reviewer alerts (email / Slack) and case SLA timers

---

## ⚠️ Disclaimer

This project is a **prototype for educational and demonstration purposes**. All data is simulated, scoring runs client-side, and state is held in browser memory. It is not intended for production use without the server-side hardening listed in the roadmap.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.