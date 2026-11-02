📌 Architecture Overview

Sentinel funnels every account event (sign-ins, orders, payment changes, refunds and payouts) through a single processing pipeline.
Each event is checked against the account's hold status, scored from 0 to 100 by a weighted rules engine, and routed to one of three outcomes: allow, pause for verification, or block and hold the account.
Held activity cannot resume until it passes a one-time code check or an authorised reviewer releases it.

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
