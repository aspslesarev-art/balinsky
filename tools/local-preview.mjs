#!/usr/bin/env node
// Always-on local preview at http://localhost:3000 that costs nothing when idle.
// A tiny proxy owns port 3000; `next dev` (port 3001) starts on the first real
// page request and is stopped after IDLE_MIN minutes without one. An open tab's
// hot-reload socket does not count as activity and never wakes the server —
// otherwise a forgotten tab would keep 5 GB busy forever.
// Run by launchd: ~/Library/LaunchAgents/com.andrei.balinsky-local.plist
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const NEXT_PORT = 3001;
const IDLE_MIN = Number(process.env.PREVIEW_IDLE_MIN || 20);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let child = null;
let ready = null; // promise resolved once next accepts connections
let lastHit = Date.now();
const sockets = new Set();

const log = (...a) => console.log(`[preview ${new Date().toTimeString().slice(0, 8)}]`, ...a);

function portOpen() {
  return new Promise((resolve) => {
    const s = net.connect(NEXT_PORT, '127.0.0.1');
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
  });
}

function start(req) {
  if (ready) return ready;
  log(`starting next dev for ${req.method} ${req.url} (${req.headers['user-agent'] || '-'})`);
  child = spawn('npx', ['next', 'dev', '-p', String(NEXT_PORT), '--disable-source-maps'], {
    cwd: ROOT,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072' },
    stdio: 'inherit',
    detached: true, // own process group, so stop() takes down next-server too
  });
  const proc = child;
  proc.once('exit', (code, signal) => {
    log(`next dev exited (${signal || code})`);
    if (child === proc) { child = null; ready = null; }
  });
  ready = (async () => {
    for (let i = 0; i < 600; i++) {
      if (child !== proc) throw new Error('next dev exited during startup');
      if (await portOpen()) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('next dev did not open its port in 120 s');
  })();
  ready.catch((e) => log(e.message));
  return ready;
}

function stop(reason) {
  if (!child) return;
  log(`stopping next dev: ${reason}`);
  for (const s of sockets) s.destroy();
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  const proc = child;
  setTimeout(() => { try { process.kill(-proc.pid, 'SIGKILL'); } catch {} }, 10_000).unref();
  child = null;
  ready = null;
}

setInterval(() => {
  if (child && Date.now() - lastHit > IDLE_MIN * 60_000) stop(`idle ${IDLE_MIN} min`);
}, 30_000);

const server = http.createServer(async (req, res) => {
  lastHit = Date.now();
  try {
    await start(req);
  } catch {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Local preview failed to start, see ~/Library/Logs/balinsky-local.log');
    return;
  }
  const up = http.request(
    { host: '127.0.0.1', port: NEXT_PORT, method: req.method, path: req.url, headers: req.headers },
    (r) => { res.writeHead(r.statusCode, r.rawHeaders); r.pipe(res); },
  );
  up.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`preview proxy: ${e.message}`);
  });
  req.pipe(up);
});

// Hot-reload websockets: pass through while next is running, refuse otherwise.
server.on('upgrade', (req, socket, head) => {
  if (!child || !ready) { socket.destroy(); return; }
  ready.then(() => {
    const up = net.connect(NEXT_PORT, '127.0.0.1', () => {
      let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      up.write(raw + '\r\n');
      if (head?.length) up.write(head);
      up.pipe(socket).pipe(up);
    });
    sockets.add(socket);
    const drop = () => { sockets.delete(socket); socket.destroy(); up.destroy(); };
    up.on('error', drop); socket.on('error', drop); socket.on('close', drop); up.on('close', drop);
  }, () => socket.destroy());
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { stop(sig); setTimeout(() => process.exit(0), 300); });
}

server.listen(PORT, () => log(`proxy on :${PORT}, next dev on demand (:${NEXT_PORT}), idle stop after ${IDLE_MIN} min`));
