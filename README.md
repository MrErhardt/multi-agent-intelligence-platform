# Multi-Agent Intelligence Platform — Erhardt Software Solutions

Created by Dean Mathas Erhardt.

Type a goal. Four agents work it in sequence:

- **Researcher** — gathers information and reference sources
- **Analyst** — signals, risks and verdict
- **Planner** — timed steps
- **Reviewer** — Final Brief with cautions

v1 is research and planning help, not financial advice. Re-check any price or fact live before acting.

## Run locally

```bash
npm install
node server.js
# open http://localhost:10000
```

Health check: `GET /api/health`
Run agents: `POST /api/run` with `{ "goal": "Research NVDA and give me a trading plan" }`

## Deploy to Render (free)

This repo is Render-ready via `render.yaml`.

Option A — Blueprint (recommended):
1. Push this folder to GitHub, e.g. `MrErhardt/multi-agent-intelligence-platform`
2. In Render: New → Blueprint → select the repo
3. Render reads `render.yaml` and creates the Web Service:
   - Build: `npm install`
   - Start: `node server.js`
   - Health check: `/api/health`
4. Open the `*.onrender.com` URL and test a goal.

Option B — Manual Web Service:
1. Push to GitHub
2. Render → New → Web Service → select repo
3. Runtime: Node, Build: `npm install`, Start: `node server.js`
4. Add env `NODE_ENV=production`
5. Deploy.

## Monetization (next step)

Erhardt Pro $29/mo waitlist is in the UI. Stripe → Stride billing is **not** connected yet — nothing is charged in v1. To connect:
- Create a Stripe product/price for Pro, add `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` as Render env vars, and add a `/api/checkout` + webhook that marks Pro users.
- Set Stripe payouts to the Stride bank account in Stripe Dashboard → Settings → Payouts.

## Files

- `server.js` — Express server + 4-agent pipeline (`/api/run`, `/api/quote/:symbol`, `/api/health`)
- `public/index.html` — dashboard UI, history, save/copy/download
- `render.yaml` — Render Blueprint
- `package.json` — Node 20+, Express only
