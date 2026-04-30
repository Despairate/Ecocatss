/**
 * Eco-Catch · /api/command
 *
 * POST /api/command  { cmd: "ON" | "OFF" }
 *   → dashboard pushes a command for the Arduino
 *
 * GET  /api/command
 *   → bridge.js polls this, gets pending commands, clears the queue
 */

// In-memory queue — bridge.js drains it on every poll
let commandQueue = [];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // Dashboard sends a command
  if (req.method === 'POST') {
    const { cmd } = req.body || {};
    if (!cmd) { res.status(400).json({ error: 'missing cmd' }); return; }
    const allowed = ['ON', 'OFF'];
    if (!allowed.includes(cmd)) { res.status(400).json({ error: 'unknown cmd' }); return; }
    commandQueue.push(cmd);
    res.status(200).json({ ok: true, queued: cmd });
    return;
  }

  // bridge.js polls for commands
  if (req.method === 'GET') {
    const pending = [...commandQueue];
    commandQueue = []; // clear after handing off
    res.status(200).json({ commands: pending });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
