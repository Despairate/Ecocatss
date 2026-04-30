/**
 * Eco-Catch · Vercel Serverless API
 * Endpoint: /api/events
 *
 * GET  /api/events       → returns current state (panelists poll this)
 * POST /api/events       → admin phone pushes events from Arduino BT
 *
 * State persists as long as the Vercel function instance stays warm (~minutes).
 * For a school demo this is more than enough. If the server restarts, counts
 * reset to 0 — the admin phone will re-push its local counts on the next event.
 */

let state = {
  catches:    0,
  todayCount: 0,
  binLevel:   0,
  powered:    true,
  version:    0,
  lastUpdated: Date.now(),
  catchLog:   [],   // last 30 catch timestamps (for public log view)
};

export default function handler(req, res) {
  // ── CORS (required so any browser can reach this) ──
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET — return full state to pollers ──
  if (req.method === 'GET') {
    res.status(200).json(state);
    return;
  }

  // ── POST — admin pushes an event ──
  if (req.method === 'POST') {
    const { type, value } = req.body || {};

    switch (type) {
      case 'CATCH':
        state.catches++;
        state.todayCount++;
        state.catchLog.unshift({
          num:  state.catches,
          time: new Date().toLocaleTimeString('en-PH', { hour12: false }) +
                ' · ' + new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        });
        if (state.catchLog.length > 30) state.catchLog.pop();
        break;
      case 'BIN':
        state.binLevel = Math.max(0, Math.min(100, Number(value) || 0));
        break;
      case 'STATUS_ON':
        state.powered = true;
        break;
      case 'STATUS_OFF':
        state.powered = false;
        break;
      case 'RESET_TODAY':
        state.todayCount = 0;
        break;
    }

    state.version++;
    state.lastUpdated = Date.now();
    res.status(200).json({ ok: true, version: state.version });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
