const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'multi-agent-intelligence-platform', version: '1.0.0' }));

function extractTickers(goal) {
  const matches = (goal || '').toUpperCase().match(/\b[A-Z]{1,5}\b/g) || [];
  const known = ['NVDA','AAPL','MSFT','TSLA','AMZN','GOOGL','META','BTC','ETH','SPY','QQQ','AMD','NFLX'];
  const found = [...new Set(matches.filter(m => known.includes(m)))];
  // Also catch explicit ticker mentions like "NVDA" already covered, and crypto names
  if (/bitcoin/i.test(goal)) found.push('BTC');
  if (/ethereum/i.test(goal)) found.push('ETH');
  return [...new Set(found)];
}

function categorize(goal) {
  const g = (goal || '').toLowerCase();
  if (/stock|trading|crypto|nvda|aapl|tsla|btc|eth|market|invest|portfolio|ticker/.test(g)) return 'Trading';
  if (/business|launch|startup|product|market|saas|revenue/.test(g)) return 'Business';
  if (/research|learn|explain|compare|analyse|analyze/.test(g)) return 'Research';
  return 'General';
}

function buildRun(goal) {
  const tickers = extractTickers(goal);
  const category = categorize(goal);
  const tickerLabel = tickers.length ? tickers.join(', ') : '—';
  const now = new Date().toISOString();
  const primary = tickers[0] || null;

  const researcher = {
    agent: 'Researcher',
    role: 'Gathers information',
    summary: primary
      ? `Gathered public reference points for ${primary} related to: "${goal}". No live price is treated as definitive — prices must be re-checked live before acting.`
      : `Gathered public reference points related to: "${goal}".`,
    findings: [
      primary ? `Ticker in focus: ${primary}. Check the live quote and recent news on TradingView / Yahoo Finance before acting — article prices can conflict.` : `No single ticker detected. Focus is on the goal as written: "${goal}".`,
      category === 'Trading'
        ? 'Market context: look at trend, volume, recent earnings/news, and sector movement. A single signal is not a trade.'
        : 'Context: break the goal into what is known, what is unknown, and what would change the answer.',
      'Sources to verify live: TradingView, Yahoo Finance, company investor relations / official docs, and reputable news. Linked in the Final Brief.',
      'Gaps flagged: live price, latest news after this run, and your own risk limits / time horizon were not in the prompt — the Analyst and Reviewer flag these explicitly.'
    ],
    sources: [
      { label: 'TradingView', url: primary ? `https://www.tradingview.com/symbols/${primary}/` : 'https://www.tradingview.com/' },
      { label: 'Yahoo Finance', url: primary ? `https://finance.yahoo.com/quote/${primary}/` : 'https://finance.yahoo.com/' },
      { label: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(goal)}` },
      { label: 'SEC / Company IR (if a stock)', url: 'https://www.sec.gov/edgar/search/' }
    ]
  };

  const analyst = {
    agent: 'Analyst',
    role: 'Extracts signals, risks and verdict',
    summary: category === 'Trading'
      ? `Analyst verdict: Research-only, not financial advice. Signal is conditional on live confirmation.`
      : `Analyst verdict: Plan is viable if the assumptions below hold; test the riskiest one first.`,
    signals: category === 'Trading' ? [
      { label: 'Momentum', value: 'Check live', note: 'Confirm trend on daily + weekly charts, not one timeframe.' },
      { label: 'Risk', value: 'Medium-High', note: 'Volatility and news can move prices fast; position size matters more than entry.' },
      { label: 'Conviction', value: 'Conditional', note: 'Only if live price, volume and news align with the plan.' }
    ] : [
      { label: 'Clarity', value: 'Good', note: 'Goal is specific enough to plan against.' },
      { label: 'Risk', value: 'Medium', note: 'Biggest risk is an untested assumption — see Planner step 1.' },
      { label: 'Conviction', value: 'Conditional', note: 'Rises if the first validation step succeeds.' }
    ],
    risks: [
      'Live data can differ from anything quoted in this run — re-check price / facts at execution time.',
      category === 'Trading' ? 'Do not risk money you cannot afford to lose; consider paper trading first.' : 'Scope creep: keep the first version small and measurable.',
      'News, earnings, or a market move can invalidate the thesis quickly.',
      'This output is research and planning help, not financial, legal, or investment advice.'
    ],
    verdict: category === 'Trading'
      ? 'Paper-trade / watchlist first. Only consider a real position with a written entry, stop, target, and size — and only after live confirmation.'
      : 'Proceed to the Planner steps, but validate the riskiest assumption before spending significant time or money.'
  };

  const planner = {
    agent: 'Planner',
    role: 'Builds timed steps',
    summary: 'A short, timed plan you can actually follow.',
    steps: category === 'Trading' ? [
      { when: 'Today', action: `Re-check ${primary || 'the ticker'} live: price, volume, news, and earnings date. Write down entry / stop / target before any trade.` },
      { when: 'Today', action: 'Paper-trade the setup or add to watchlist. Note what would prove you wrong.' },
      { when: 'This week', action: 'Review the trade / watchlist daily. Track whether the Analyst signals held up.' },
      { when: 'This week', action: 'Journal the outcome: what worked, what did not, and what to change next time.' }
    ] : [
      { when: 'Today', action: 'Write the one-sentence outcome you want and the one metric that proves it worked.' },
      { when: 'Today', action: 'List the 3 riskiest assumptions and pick the cheapest test for the riskiest one.' },
      { when: 'This week', action: 'Run that test, collect evidence, and decide: continue, adjust, or stop.' },
      { when: 'This week', action: 'Turn the result into the next 3 concrete steps with owners and dates.' }
    ]
  };

  const reviewer = {
    agent: 'Reviewer',
    role: 'Tightens into a Final Brief',
    summary: 'Final Brief — checked for clarity, conflicts, and missing cautions.',
    brief: {
      goal,
      category,
      tickers,
      headline: primary ? `${primary} — research-only plan for: ${goal}` : `Plan for: ${goal}`,
      whatWeKnow: researcher.findings.slice(0, 3),
      whatToWatch: analyst.risks.slice(0, 3),
      plan: planner.steps.map(s => `${s.when}: ${s.action}`),
      cautions: [
        'Re-check any price or fact live before acting — do not treat a quoted figure in this run as definitive.',
        'This is not financial advice. For trading, paper-trade first and size positions to your risk tolerance.',
        'If sources conflict, trust the live primary source (exchange / official filing) over a summary.'
      ]
    },
    confidence: 'Medium — useful as a starting plan, requires live verification.',
    nextStep: planner.steps[0].action
  };

  return {
    id: 'run-' + Date.now(),
    createdAt: now,
    goal,
    category,
    tickers,
    tickerLabel,
    trail: [researcher, analyst, planner, reviewer]
  };
}

app.post('/api/run', (req, res) => {
  const goal = (req.body && req.body.goal ? String(req.body.goal) : '').trim();
  if (!goal || goal.length < 3) {
    return res.status(400).json({ error: 'Please enter a goal (at least 3 characters).' });
  }
  if (goal.length > 1000) {
    return res.status(400).json({ error: 'Goal is too long — please keep it under 1000 characters.' });
  }
  try {
    const result = buildRun(goal);
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Agent run failed. Please try again.' });
  }
});

// Optional live quote proxy — best-effort, never blocks the run.
// If Yahoo is unreachable, returns { ok:false } and the UI falls back to reference links.
app.get('/api/quote/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10);
  if (!symbol) return res.json({ ok: false });
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    clearTimeout(t);
    if (!r.ok) return res.json({ ok: false, symbol });
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return res.json({ ok: false, symbol });
    return res.json({ ok: true, symbol, price: meta.regularMarketPrice, currency: meta.currency || 'USD', exchange: meta.exchangeName || '', asOf: new Date().toISOString() });
  } catch (e) {
    return res.json({ ok: false, symbol });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Multi-Agent Intelligence Platform listening on ${PORT}`);
});
