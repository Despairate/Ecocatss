/**
 * ╔══════════════════════════════════════════════════╗
 * ║         ECO-CATCH  ·  HC-05 BRIDGE              ║
 * ║  Reads HC-05 via COM port → pushes to Vercel    ║
 * ║  Polls Vercel for commands  → sends to Arduino  ║
 * ╚══════════════════════════════════════════════════╝
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// ╔══════════════════════════════╗
// ║   EDIT THESE TWO LINES      ║
// ╚══════════════════════════════╝
const VERCEL_URL = 'https://YOUR-PROJECT.vercel.app';
const COM_PORT   = 'COM3';   // Windows: COM3, COM4 etc.
                              // Mac/Linux: /dev/tty.HC-05 or /dev/rfcomm0
const BAUD_RATE  = 9600;
const COMMAND_POLL_MS = 1500;
// ════════════════════════════════

const c = {
  reset:'\x1b[0m', green:'\x1b[32m', cyan:'\x1b[36m',
  yellow:'\x1b[33m', red:'\x1b[31m', gray:'\x1b[90m', bold:'\x1b[1m'
};

function log(icon, color, label, msg) {
  const time = new Date().toLocaleTimeString('en-PH', { hour12: false });
  console.log(`${c.gray}[${time}]${c.reset} ${icon} ${color}${c.bold}${label}${c.reset}  ${msg}`);
}

async function push(type, value) {
  try {
    const res  = await fetch(VERCEL_URL + '/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value: value ?? null }),
    });
    const data = await res.json();
    log('☁️', c.cyan, 'VERCEL ↑', `${type}${value != null ? ' → ' + value : ''}  (v${data.version})`);
  } catch (e) {
    log('⚠️', c.red, 'ERROR', 'Push failed: ' + e.message);
  }
}

async function pollCommands(port) {
  try {
    const res  = await fetch(VERCEL_URL + '/api/command', { cache: 'no-store' });
    const data = await res.json();
    for (const cmd of (data.commands || [])) {
      port.write(cmd + '\n', err => {
        if (err) { log('⚠️', c.red, 'SERIAL', 'Write error: ' + err.message); return; }
        log('📤', c.yellow, 'VERCEL ↓', `Sent to Arduino: ${cmd}`);
      });
    }
  } catch (e) { /* silent — no commands pending */ }
}

function handleLine(raw) {
  const line = raw.trim();
  if (!line) return;
  log('📟', c.gray, 'RAW', line);
  if (line.startsWith('BIN:'))   { const p = parseInt(line.slice(4)); if (!isNaN(p)) push('BIN', p); return; }
  if (line.startsWith('CATCH:')) { push('CATCH', null); return; }
  if (line === 'STATUS:ON')      { push('STATUS_ON', null); return; }
  if (line === 'STATUS:OFF')     { push('STATUS_OFF', null); return; }
  if (line === 'READY')          { log('✅', c.green, 'DEVICE', 'Arduino is ready'); return; }
}

console.log(`\n${c.bold}${c.green}  🌿 ECO-CATCH HC-05 BRIDGE${c.reset}`);
console.log(`${c.gray}  Connecting to ${COM_PORT} at ${BAUD_RATE} baud...\n${c.reset}`);

const port = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on('open', () => {
  log('🔵', c.green, 'HC-05',  `Connected on ${COM_PORT}`);
  log('☁️', c.cyan,  'TARGET', VERCEL_URL);
  console.log(`\n${c.gray}  Listening for Arduino data + dashboard commands...  (Ctrl+C to stop)\n${c.reset}`);
  setInterval(() => pollCommands(port), COMMAND_POLL_MS);
});

parser.on('data', handleLine);

port.on('error', err => {
  console.error(`\n${c.red}${c.bold}  ✖ Port error: ${err.message}${c.reset}\n`);
  console.error(`${c.yellow}  Tips:${c.reset}`);
  console.error(`  • Pair HC-05 with your laptop first (PIN: 1234 or 0000)`);
  console.error(`  • Windows: Device Manager → Ports (COM & LPT) → find the COM number`);
  console.error(`  • Mac: run   ls /dev/tty.*   to find the port name`);
  console.error(`  • Try COM4, COM5, COM6 if COM3 doesn't work\n`);
  process.exit(1);
});

port.on('close', () => log('🔴', c.red, 'HC-05', 'Disconnected'));
