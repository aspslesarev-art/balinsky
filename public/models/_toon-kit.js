/**
 * Общий движок мультяшных 3D-планировок (стиль Sims) — тот же вид, что у
 * `citrine-3d.html`, вынесенный в один файл, чтобы новая планировка была
 * только описанием стен и мебели.
 *
 * Порядок подключения в HTML модели:
 *   _model-i18n.js → three.js r128 → <script>const PLAN = {...}</script> →
 *   _toon-kit.js → <script>геометрия…; ToonKit.start({...})</script>
 *
 * PLAN: { name, W, HD, BACK, FRONT, H1, H2, floors }
 *   Координаты чертежа: u — от стеклянной стены у бассейна (u=0) к фасаду
 *   со входом (u=HD), v — поперёк дома (0…W). Двор с бассейном — u<0
 *   (до −BACK), перед фасадом — FRONT метров газона. В сцене x = v, z = HD − u.
 *
 * Всё, что объявлено здесь на верхнем уровне, видно скрипту модели
 * (классические скрипты делят глобальную область).
 */
/* global THREE, Model3D, PLAN */
;(function injectChrome () {
  const css = `
  :root{--bg:#F8FAF8;--panel:#FFFFFF;--line:#E5E7EB;--ink:#111827;--muted:#4B5563;--accent:#1F8B5F;--accent-hover:#197551;--accent-soft:#E2F0E8;--font:system-ui,-apple-system,'Segoe UI',sans-serif}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{height:100%;overflow:hidden;font-family:var(--font);color:var(--ink)}
  body{background:radial-gradient(ellipse at 50% 35%,#ffffff 0%,#eef6f0 55%,#dcebe1 100%)}
  #c{display:block;width:100%;height:100%;cursor:pointer;touch-action:pan-y}
  #c.engaged{cursor:grab}#c.engaged:active{cursor:grabbing}
  .tapme{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--accent);border:1px solid var(--accent);border-radius:999px;padding:9px 18px;font-size:13px;font-weight:500;color:#fff;box-shadow:0 4px 16px rgba(31,139,95,.28);pointer-events:none;transition:opacity .2s}
  .tapme.hide{opacity:0}
  .hud{position:fixed;left:max(24px,calc((100vw - 1280px)/2 + 24px));top:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;max-width:320px;box-shadow:0 4px 16px rgba(17,24,39,.06)}
  .hud h1{font-size:16px;font-weight:600;letter-spacing:-.01em}
  .hud .sub{font-size:11px;color:var(--muted);margin-top:2px;letter-spacing:.06em;text-transform:uppercase}
  .row{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
  button{font-family:inherit;font-size:12px;font-weight:500;padding:7px 12px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer;transition:.15s}
  button:hover{border-color:var(--accent);color:var(--accent)}
  button.on{background:var(--accent);border-color:var(--accent);color:#fff}
  button.on:hover{background:var(--accent-hover);border-color:var(--accent-hover);color:#fff}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .chk{margin-top:10px;font-size:12px;color:var(--muted);display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none}
  .chk input{accent-color:var(--accent)}
  .facts{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted);line-height:1.7}
  .facts b{color:var(--ink);font-weight:600}
  .hint{margin-top:10px;font-size:11px;color:var(--muted);line-height:1.5}
  @media(max-width:640px){
    .facts,.hint{display:none}
    .hud{left:8px;right:8px;top:8px;max-width:none;padding:10px 12px;border-radius:10px}
    .hud h1{font-size:14px}.hud .sub{font-size:10px}
    .row{gap:5px;margin-top:8px}
    button{font-size:11px;padding:5px 9px;border-radius:7px}
    .chk{margin-top:7px;font-size:11px}.tapme{font-size:12px;padding:8px 14px}
  }`
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st)
  const two = PLAN.floors === 2
  document.body.insertAdjacentHTML('afterbegin', `
<canvas id="c"></canvas>
<div class="hud">
  <h1 id="ttl"></h1>
  <div class="sub" id="sub"></div>
  ${two ? `<div class="row">
    <button id="b1" data-i18n="floor1"></button>
    <button id="b2" data-i18n="floor2"></button>
    <button id="bAll" class="on" data-i18n="wholeHouse"></button>
  </div>` : ''}
  <div class="row"${two ? ' style="margin-top:8px"' : ''}>
    <button id="wAuto" class="on" data-i18n="wallsCut"></button>
    <button id="wUp" data-i18n="wallsUp"></button>
    <button id="wDown" data-i18n="wallsDown"></button>
  </div>
  <label class="chk"><input type="checkbox" id="lbl" checked> <span data-i18n="roomLabels"></span></label>
  <label class="chk"><input type="checkbox" id="spin" checked> <span data-i18n="autoRotate"></span></label>
  <div class="facts" id="facts"></div>
  <div class="hint" data-i18n="hint"></div>
</div>
<div class="tapme" id="tapme" data-i18n="tapToControl"></div>`)
  document.getElementById('ttl').textContent = PLAN.name
  Model3D.setDocumentMeta(PLAN.name)
  Model3D.applyStatic()
})()

const W = PLAN.W, HD = PLAN.HD, BACK = PLAN.BACK ?? 4, FRONT = PLAN.FRONT ?? 2.2
const H1 = PLAN.H1 ?? 3.0, H2 = PLAN.H2 ?? 2.9
const WALL = 0.16

// ============ сцена ============
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setClearColor(0x000000, 0)
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
scene.add(new THREE.HemisphereLight(0xffffff, 0xcfdcc0, 0.5))
const sun = new THREE.DirectionalLight(0xfff1d6, 0.85)
sun.position.set(10, 20, 9); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
{ const s = Math.max(16, (W + HD + BACK) * 0.8); Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s }) }
sun.shadow.bias = -0.0006
scene.add(sun)

const toonRamp = (() => {
  const v = [120, 190, 235], d = new Uint8Array(v.length * 4)
  v.forEach((x, i) => { d.set([x, x, x, 255], i * 4) })
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat)
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true
  return t
})()
const toon = (color, extra = {}) => new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: toonRamp }, extra))

function tex (draw, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size
  draw(c.getContext('2d'), size)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4
  return t
}
// Детерминированный «случай»: одна и та же картинка при каждой загрузке.
let _seed = 7
const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646 }
const T = {
  planks: tex((x, s) => {
    x.fillStyle = '#e2b47c'; x.fillRect(0, 0, s, s)
    const n = 6, h = s / n
    for (let i = 0; i < n; i++) {
      x.fillStyle = ['#dcaa70', '#e8bd88', '#d9a56a', '#e4b67e', '#dfae74', '#e9c08c'][i]; x.fillRect(0, i * h + 1, s, h - 2)
      x.fillStyle = '#b9824c'; x.fillRect(0, i * h, s, 2)
      const j = (i % 2 ? 0.35 : 0.8) * s; x.fillRect(j, i * h, 2, h)
    }
  }),
  planksDark: tex((x, s) => {
    x.fillStyle = '#c98f5e'; x.fillRect(0, 0, s, s)
    const n = 6, h = s / n
    for (let i = 0; i < n; i++) {
      x.fillStyle = ['#c58a58', '#d29a68', '#c08454', '#cd9462', '#c78c5a', '#d49d6c'][i]; x.fillRect(0, i * h + 1, s, h - 2)
      x.fillStyle = '#9a6638'; x.fillRect(0, i * h, s, 2)
      const j = (i % 2 ? 0.3 : 0.75) * s; x.fillRect(j, i * h, 2, h)
    }
  }),
  tiles: tex((x, s) => {
    x.fillStyle = '#a9cfd6'; x.fillRect(0, 0, s, s)
    const n = 4, h = s / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#d9eef1' : '#cbe6ea'; x.fillRect(j * h + 2, i * h + 2, h - 4, h - 4) }
  }),
  terrazzo: tex((x, s) => {
    x.fillStyle = '#ece5da'; x.fillRect(0, 0, s, s)
    const cols = ['#c9b9a3', '#a99a86', '#e0a37c', '#9fb7a8']
    for (let i = 0; i < 220; i++) { x.fillStyle = cols[i % 4]; x.beginPath(); x.arc(rnd() * s, rnd() * s, 1 + rnd() * 3, 0, 7); x.fill() }
  }),
  deck: tex((x, s) => {
    x.fillStyle = '#c79a6b'; x.fillRect(0, 0, s, s)
    for (let i = 0; i < 8; i++) { x.fillStyle = '#a87a4c'; x.fillRect(i * s / 8, 0, 3, s) }
  }),
  grass: tex((x, s) => {
    x.fillStyle = '#78b955'; x.fillRect(0, 0, s, s)
    for (let i = 0; i < 500; i++) { x.fillStyle = rnd() < 0.5 ? '#6dad4b' : '#85c561'; x.fillRect(rnd() * s, rnd() * s, 3, 6) }
  }),
  water: tex((x, s) => {
    x.fillStyle = '#3fb6d3'; x.fillRect(0, 0, s, s)
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 4; x.lineCap = 'round'
    for (let i = 0; i < 14; i++) {
      const px = rnd() * s, py = rnd() * s, l = 20 + rnd() * 30
      x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 8, px + l, py); x.stroke()
    }
  }),
}
function texMat (t, rw, rd, color = 0xffffff) {
  const m = t.clone(); m.needsUpdate = true; m.repeat.set(rw, rd)
  return toon(color, { map: m })
}
const M = {
  wall: toon(0xefd9b8), cap: toon(0x8a5a36), wood: toon(0x9a6a44), woodL: toon(0xc89566),
  slab: toon(0xe9dfd0), sofa: toon(0x9fc490), cush: toon(0xf08a6b), mustard: toon(0xf0bd4f),
  teal: toon(0x4aa8a8), coral: toon(0xf08a6b), sage: toon(0x7fae95), white: toon(0xfdfcf9),
  steel: toon(0xd7e0e3), dark: toon(0x4a3a2e), leaf: toon(0x4fb35a), leafD: toon(0x3f9a4a),
  trunk: toon(0xa77a52), pot: toon(0xd9774c), dirt: toon(0xa9744a), stone: toon(0xd8d2c6),
  poolTile: toon(0x2f8fb0), navy: toon(0x41558f), grey: toon(0xa8a39b),
  glass: new THREE.MeshBasicMaterial({ color: 0xbfe6f2, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  bathWater: new THREE.MeshBasicMaterial({ color: 0x8fd3e3 }),
}
const waterTex = T.water.clone(); waterTex.needsUpdate = true; waterTex.repeat.set(1.5, 1)
const waterMat = new THREE.MeshBasicMaterial({ map: waterTex, transparent: true, opacity: 0.92 })

const floor1G = new THREE.Group(), floor2G = new THREE.Group(), siteG = new THREE.Group(), labelsG = new THREE.Group()
scene.add(floor1G, floor2G, siteG, labelsG)
const cx = W / 2, cz = (HD + BACK) / 2
const zOf = u => HD - u

const EDGE = new THREE.LineBasicMaterial({ color: 0x4a3526, transparent: true, opacity: 0.6 })
function edges (m, thr = 30) { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, thr), EDGE)) }
const HULL = new THREE.MeshBasicMaterial({ color: 0x4a3526, side: THREE.BackSide })

function box (g, w, h, d, x, y, z, mat, shadow = true, outline = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x - cx, y, z - cz); m.castShadow = shadow; m.receiveShadow = true
  if (outline) edges(m)
  g.add(m); return m
}
function rect (g, u1, u2, v1, v2, y, h, mat, shadow = true, outline = true) {
  return box(g, v2 - v1, h, u2 - u1, (v1 + v2) / 2, y + h / 2, zOf((u1 + u2) / 2), mat, shadow, outline)
}
function roundGeo (w, d, h, r) {
  r = Math.max(0.01, Math.min(r, w / 2 - 0.01, d / 2 - 0.01, h / 2 - 0.01))
  const a = w / 2 - r, b = d / 2 - r, rc = Math.min(a, b) * 0.6
  const s = new THREE.Shape()
  s.moveTo(-a + rc, -b); s.lineTo(a - rc, -b); s.quadraticCurveTo(a, -b, a, -b + rc)
  s.lineTo(a, b - rc); s.quadraticCurveTo(a, b, a - rc, b); s.lineTo(-a + rc, b)
  s.quadraticCurveTo(-a, b, -a, b - rc); s.lineTo(-a, -b + rc); s.quadraticCurveTo(-a, -b, -a + rc, -b)
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 4 })
  geo.rotateX(-Math.PI / 2); geo.translate(0, r, 0)
  return geo
}
function rr (g, u1, u2, v1, v2, y, h, mat, r = 0.08, hull = true) {
  const w = v2 - v1, d = u2 - u1
  const m = new THREE.Mesh(roundGeo(w, d, h, r), mat)
  m.position.set((v1 + v2) / 2 - cx, y, zOf((u1 + u2) / 2) - cz); m.castShadow = m.receiveShadow = true
  if (hull) { const t = 0.035, o = new THREE.Mesh(m.geometry, HULL); o.scale.set(1 + 2 * t / w, 1 + 2 * t / h, 1 + 2 * t / d); o.position.y = -t; m.add(o) }
  g.add(m); return m
}
function cyl (g, u, v, r1, r2, h, y, mat, seg = 24, outline = true) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat)
  m.position.set(v - cx, y + h / 2, zOf(u) - cz); m.castShadow = true; m.receiveShadow = true
  if (outline) { const o = new THREE.Mesh(m.geometry, HULL); o.scale.set(1.06, 1.04, 1.06); m.add(o) }
  g.add(m); return m
}
function ball (g, u, v, r, y, mat, sy = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat)
  m.scale.y = sy; m.position.set(v - cx, y, zOf(u) - cz); m.castShadow = true
  const o = new THREE.Mesh(m.geometry, HULL); o.scale.setScalar(1.07); m.add(o)
  g.add(m); return m
}

const cutWalls = []
function regWall (m, h) { cutWalls.push({ m, h, bottom: m.position.y - h / 2 }) }
function makeWall (g, base) {
  return (u1, v1, u2, v2, h, mat = M.wall) => {
    const x1 = v1, z1 = zOf(u1), x2 = v2, z2 = zOf(u2)
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz)
    const m = new THREE.Mesh(new THREE.BoxGeometry(len + WALL, h, WALL), mat)
    m.position.set((x1 + x2) / 2 - cx, base + h / 2, (z1 + z2) / 2 - cz)
    m.rotation.y = -Math.atan2(dz, dx); m.castShadow = m.receiveShadow = true; edges(m)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len + WALL + 0.02, 0.07, WALL + 0.03), M.cap); cap.position.y = h / 2; m.add(cap)
    const sk = new THREE.Mesh(new THREE.BoxGeometry(len + WALL + 0.01, 0.1, WALL + 0.02), M.woodL); sk.position.y = -h / 2 + 0.05; m.add(sk)
    g.add(m); regWall(m, h); return m
  }
}
function glassWall (g, u1, v1, u2, v2, base, h) {
  const x1 = v1, z1 = zOf(u1), x2 = v2, z2 = zOf(u2)
  const len = Math.hypot(x2 - x1, z2 - z1), ry = -Math.atan2(z2 - z1, x2 - x1)
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.05), M.glass)
  m.position.set((x1 + x2) / 2 - cx, base + h / 2, (z1 + z2) / 2 - cz); m.rotation.y = ry
  const fr = (w, hh, y, x) => { const f = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.09), M.dark); f.position.set(x, y, 0); m.add(f) }
  fr(len, 0.08, h / 2 - 0.04, 0); fr(len, 0.06, -h / 2 + 0.03, 0)
  const n = Math.max(1, Math.round(len / 1.5))
  for (let i = 0; i <= n; i++) fr(0.06, h, 0, -len / 2 + len * i / n)
  g.add(m); regWall(m, h)
}
/** Низкое стеклянное ограждение балкона/террасы (не срезается). */
function railing (g, u1, v1, u2, v2, base, h = 1.0) {
  const x1 = v1, z1 = zOf(u1), x2 = v2, z2 = zOf(u2)
  const len = Math.hypot(x2 - x1, z2 - z1)
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.04), M.glass)
  m.position.set((x1 + x2) / 2 - cx, base + h / 2, (z1 + z2) / 2 - cz); m.rotation.y = -Math.atan2(z2 - z1, x2 - x1)
  const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.07), M.dark); top.position.y = h / 2; m.add(top)
  g.add(m); return m
}
function floorPatch (g, u1, u2, v1, v2, y, t, k = 1) {
  return rect(g, u1, u2, v1, v2, y, 0.012, texMat(t, (v2 - v1) / k, (u2 - u1) / k), false, false)
}
function door (g, u, v1, v2, y, alongV = true, ang = 0.5) {
  // деревянное полотно в проёме, приоткрыто
  const d = alongV ? rect(g, u - 0.03, u + 0.03, v1, v2, y, 2.15, M.wood) : rect(g, v1, v2, u - 0.03, u + 0.03, y, 2.15, M.wood)
  d.rotation.y = ang; return d
}

// ---- мебель ----
function plant (g, u, v, y, s = 1) {
  cyl(g, u, v, 0.17 * s, 0.13 * s, 0.32 * s, y, M.pot, 16)
  ball(g, u, v, 0.3 * s, y + 0.55 * s, M.leaf, 1.1)
  ball(g, u + 0.1 * s, v - 0.12 * s, 0.2 * s, y + 0.8 * s, M.leafD)
}
function palm (g, u, v, h = 4.2, lean = 0.8) {
  const base = new THREE.Vector3(v - cx, 0, zOf(u) - cz)
  const curve = new THREE.CatmullRomCurve3([base.clone(), base.clone().add(new THREE.Vector3(lean * 0.15, h * 0.35, 0)),
    base.clone().add(new THREE.Vector3(lean * 0.5, h * 0.7, 0)), base.clone().add(new THREE.Vector3(lean, h, 0))])
  const tr = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.13, 10, false), M.trunk); tr.castShadow = true; g.add(tr)
  const top = curve.getPoint(1)
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2
    const lf = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6), i % 2 ? M.leaf : M.leafD)
    lf.scale.set(1.15, 0.07, 0.3)
    const piv = new THREE.Group(); piv.position.copy(top); piv.rotation.y = -a
    lf.position.set(1.0, -0.25, 0); lf.rotation.z = -0.4; lf.castShadow = true
    piv.add(lf); g.add(piv)
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M.trunk); nut.position.copy(top); g.add(nut)
}
/** Кровать: изголовье у стены v=headAtV (или null — без изголовья). */
function bed (g, u1, u2, v1, v2, headAtV, Yb, blanket) {
  rr(g, u1, u2, v1, v2, Yb, 0.28, M.woodL, 0.05)
  rr(g, u1 + 0.05, u2 - 0.05, v1 + 0.05, v2 - 0.05, Yb + 0.28, 0.2, M.white, 0.08, false)
  const L = v2 - v1, feet = headAtV === null || headAtV > (v1 + v2) / 2 ? [v1, v1 + L * 0.62] : [v2 - L * 0.62, v2]
  rr(g, u1 + 0.02, u2 - 0.02, feet[0], feet[1], Yb + 0.4, 0.12, blanket, 0.05)
  if (headAtV != null) {
    rr(g, u1, u2, headAtV - 0.08, headAtV + 0.08, Yb, 1.05, M.wood, 0.05)
    const pv = headAtV > (v1 + v2) / 2 ? headAtV - 0.45 : headAtV + 0.15
    const mid = (u1 + u2) / 2
    rr(g, u1 + 0.15, mid - 0.05, pv, pv + 0.3, Yb + 0.48, 0.14, M.white, 0.06)
    rr(g, mid + 0.05, u2 - 0.15, pv, pv + 0.3, Yb + 0.48, 0.14, M.white, 0.06)
  }
}
/** Кровать изголовьем к стене u=headAtU (кровать вытянута вдоль u). */
function bedU (g, u1, u2, v1, v2, headAtU, Yb, blanket) {
  rr(g, u1, u2, v1, v2, Yb, 0.28, M.woodL, 0.05)
  rr(g, u1 + 0.05, u2 - 0.05, v1 + 0.05, v2 - 0.05, Yb + 0.28, 0.2, M.white, 0.08, false)
  const L = u2 - u1, feet = headAtU > (u1 + u2) / 2 ? [u1, u1 + L * 0.62] : [u2 - L * 0.62, u2]
  rr(g, feet[0], feet[1], v1 + 0.02, v2 - 0.02, Yb + 0.4, 0.12, blanket, 0.05)
  rr(g, headAtU - 0.08, headAtU + 0.08, v1, v2, Yb, 1.05, M.wood, 0.05)
  const pu = headAtU > (u1 + u2) / 2 ? headAtU - 0.45 : headAtU + 0.15
  const mid = (v1 + v2) / 2
  rr(g, pu, pu + 0.3, v1 + 0.15, mid - 0.05, Yb + 0.48, 0.14, M.white, 0.06)
  rr(g, pu, pu + 0.3, mid + 0.05, v2 - 0.15, Yb + 0.48, 0.14, M.white, 0.06)
}
function toilet (g, u, v, y) { rr(g, u - 0.27, u + 0.27, v - 0.2, v + 0.2, y, 0.42, M.white, 0.1) }
function vanity (g, u1, u2, v1, v2, y) { rr(g, u1, u2, v1, v2, y, 0.85, M.woodL, 0.04); rr(g, u1 + 0.1, u2 - 0.1, v1 + 0.07, v2 - 0.07, y + 0.85, 0.08, M.white, 0.03) }
function tub (g, u1, u2, v1, v2, y) { rr(g, u1, u2, v1, v2, y, 0.55, M.white, 0.18); rr(g, u1 + 0.08, u2 - 0.08, v1 + 0.1, v2 - 0.1, y + 0.45, 0.12, M.bathWater, 0.05, false) }
function shower (g, u1, u2, v1, v2, y) { rect(g, u1, u2, v1, v2, y, 0.03, M.steel, false, false); cyl(g, (u1 + u2) / 2, (v1 + v2) / 2, 0.12, 0.12, 0.02, y + 2.05, M.steel, 16) }
function lounger (g, u1, u2, v1, v2, y, alongV = false) {
  rr(g, u1, u2, v1, v2, y, 0.24, M.white, 0.05)
  if (alongV) rr(g, u1 + 0.04, u2 - 0.04, v1 + 0.08, v1 + 0.6, y + 0.24, 0.12, M.coral, 0.03, false)
  else rr(g, u1 + 0.08, u1 + 0.6, v1 + 0.04, v2 - 0.04, y + 0.24, 0.12, M.coral, 0.03, false)
}
function stool (g, u, v, y, mat = M.coral) { cyl(g, u, v, 0.17, 0.17, 0.08, y + 0.5, mat, 16); cyl(g, u, v, 0.03, 0.03, 0.5, y, M.dark, 8, false) }
function chair (g, u, v, y, mat = M.teal) { rr(g, u - 0.22, u + 0.22, v - 0.22, v + 0.22, y, 0.45, mat, 0.07) }
function roundTable (g, u, v, y, r = 0.55) { cyl(g, u, v, r, r, 0.06, y + 0.68, M.woodL, 32); cyl(g, u, v, 0.08, 0.2, 0.68, y, M.wood, 12) }

/** Участок-«лот»: газон с земляным бортом, кусты, пальмы. */
function lot (extra = 0, vPlus = 0) {
  const g = siteG
  const u1 = -BACK - 1.4 - extra, u2 = HD + FRONT, v1 = -1.6 - extra, v2 = W + 1.6 + extra + vPlus
  rr(g, u1, u2, v1, v2, -0.6, 0.6, M.dirt, 0.12, true)
  rect(g, u1 + 0.05, u2 - 0.05, v1 + 0.05, v2 - 0.05, -0.02, 0.03, texMat(T.grass, (v2 - v1) / 2, (u2 - u1) / 2), false, false)
  for (const [u, v, s] of [[HD + FRONT - 0.6, v1 + 0.9, 1], [HD + FRONT - 0.5, v2 - 1.0, 1.2], [HD * 0.3, v1 + 0.6, 1.1], [HD * 0.8, v2 - 0.6, 0.9], [-BACK - 0.6, v1 + 0.7, 1], [-BACK - 0.7, v2 - 0.7, 0.9]]) {
    ball(g, u, v, 0.45 * s, 0.25 * s, M.leaf, 0.8)
  }
  palm(g, HD + FRONT - 0.7, v1 + 0.6, 4.6, -0.9)
  palm(g, HD + FRONT - 0.9, v2 - 0.6, 3.9)
  return g
}
/** Дорожка-плитки к входу у фасада. */
function path (v1, v2) { for (let i = 0; i < 3; i++) rr(siteG, HD + 0.25 + i * 0.65, HD + 0.75 + i * 0.65, v1, v2, 0, 0.05, M.stone, 0.02, false) }
/** Бассейн: чаша, вода и бортик. */
function pool (g, u1, u2, v1, v2, y = 0) {
  rect(g, u1, u2, v1, v2, y - 0.6, 0.6, M.poolTile, false, false)
  const w = rect(g, u1, u2, v1, v2, y, 0.07, waterMat, false, false)
  rect(g, u1 - 0.04, u1 + 0.04, v1 - 0.04, v2 + 0.04, y + 0.1, 0.04, M.stone)
  rect(g, u2 - 0.04, u2 + 0.04, v1 - 0.04, v2 + 0.04, y + 0.1, 0.04, M.stone)
  rect(g, u1, u2, v1 - 0.04, v1 + 0.04, y + 0.1, 0.04, M.stone)
  rect(g, u1, u2, v2 - 0.04, v2 + 0.04, y + 0.1, 0.04, M.stone)
  return w
}

// ============ люди ============
const plumbobs = []
function makePerson (g, h, x, z, ry, yBase, shirtC, pantsC) {
  const p = new THREE.Group()
  const skin = toon(0xe7b48d), shirt = toon(shirtC), pants = toon(pantsC), hair = toon(0x5a3a26)
  const legH = h * 0.42, torH = h * 0.33, headR = h * 0.1
  const mesh = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; const o = new THREE.Mesh(geo, HULL); o.scale.setScalar(1.08); m.add(o); p.add(m); return m }
  const lg = new THREE.CylinderGeometry(h * 0.05, h * 0.045, legH, 10)
  mesh(lg, pants, legH / 2).position.x = -h * 0.06
  mesh(lg, pants, legH / 2).position.x = h * 0.06
  mesh(new THREE.CylinderGeometry(h * 0.1, h * 0.085, torH, 12), shirt, legH + torH / 2)
  mesh(new THREE.SphereGeometry(h * 0.1, 12, 8), shirt, legH + torH)
  const arm = new THREE.CylinderGeometry(h * 0.035, h * 0.03, torH * 0.9, 8)
  const aL = mesh(arm, skin, legH + torH * 0.55); aL.position.x = -h * 0.14; aL.rotation.z = 0.15
  const aR = mesh(arm, skin, legH + torH * 0.55); aR.position.x = h * 0.14; aR.rotation.z = -0.15
  const hy = legH + torH + headR * 1.15
  mesh(new THREE.SphereGeometry(headR, 16, 12), skin, hy)
  const hr = mesh(new THREE.SphereGeometry(headR * 1.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, hy + headR * 0.08); hr.rotation.x = -0.25
  const pb = new THREE.Mesh(new THREE.OctahedronGeometry(h * 0.08), new THREE.MeshToonMaterial({ color: 0x3fe04a, emissive: 0x1f9a27, gradientMap: toonRamp }))
  pb.scale.y = 1.7; pb.position.y = hy + headR * 2.6 + h * 0.08; pb.userData.baseY = pb.position.y
  p.add(pb); plumbobs.push(pb)
  p.position.set(x - cx, yBase, z - cz); p.rotation.y = ry
  g.add(p); return p
}
const P = (g, h, u, v, ry, y, c1, c2) => makePerson(g, h, v, zOf(u), ry, y, c1, c2)

// ============ подписи ============
const DOT = { livingKitchen: '#f0bd4f', living: '#f0bd4f', kitchen: '#f0bd4f', bath: '#4aa8a8', bathroom: '#4aa8a8', laundry: '#4aa8a8', stairs: '#c89566', entrance: '#c89566', terrace: '#9fc490', balcony: '#9fc490', pool: '#3fb6d3', masterBedroom: '#f08a6b', bedroom: '#f08a6b', study: '#7fae95', hall: '#c89566' }
function makeLabel (text, x, y, z, key) {
  const cnv = document.createElement('canvas'); cnv.width = 320; cnv.height = 80
  const ctx = cnv.getContext('2d')
  ctx.fillStyle = 'rgba(74,53,38,.18)'; ctx.beginPath(); ctx.roundRect(6, 14, 308, 60, 30); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#4a3526'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(4, 6, 308, 60, 30); ctx.fill(); ctx.stroke()
  ctx.fillStyle = DOT[key] || '#9fc490'; ctx.beginPath(); ctx.arc(36, 36, 11, 0, 7); ctx.fill()
  ctx.strokeStyle = '#4a3526'; ctx.lineWidth = 2.5; ctx.stroke()
  ctx.fillStyle = '#2c2118'; ctx.textAlign = 'left'
  let size = 26
  do { ctx.font = '700 ' + size + 'px system-ui,-apple-system,sans-serif'; size -= 1 } while (size >= 15 && ctx.measureText(text).width > 250)
  ctx.fillText(text, 56, 45)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cnv), depthTest: false }))
  sp.scale.set(2.7, 0.68, 1); sp.position.set(x - cx, y, z - cz)
  labelsG.add(sp); return sp
}
/** Подпись комнаты: ключ словаря, площадь, точка (u, высота, v). outdoor — видна и в «Весь дом». */
const Lb = (key, area, u, y, v, outdoor = u < 0) => { const s = makeLabel(Model3D.room(key, area), v, y, zOf(u), key); s.userData.outdoor = outdoor; return s }

// ============ запуск: камера, UI, рендер ============
const ToonKit = {
  /**
   * @param {{ sub: string, facts: object[], L1: THREE.Sprite[], L2?: THREE.Sprite[] }} o
   */
  start (o) {
    document.getElementById('sub').textContent = o.sub
    Model3D.renderFacts(document.getElementById('facts'), o.facts)
    const L1 = o.L1, L2 = o.L2 || [], two = PLAN.floors === 2
    let theta = -0.75, phi = 1.05, dist = 17
    const target = new THREE.Vector3(0, 1.6, 0)
    let auto = true
    function updCam () {
      phi = Math.max(0.15, Math.min(1.45, phi)); dist = Math.max(5, Math.min(80, dist))
      camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta))
      camera.lookAt(target)
    }
    let drag = null, engaged = false
    const tapme = document.getElementById('tapme')
    const spinChk = document.getElementById('spin'), lblChk = document.getElementById('lbl')
    function engage () { if (engaged) return; engaged = true; canvas.classList.add('engaged'); tapme.classList.add('hide') }
    function disengage () { if (!engaged || drag) return; engaged = false; canvas.classList.remove('engaged'); tapme.classList.remove('hide') }
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') disengage() })
    addEventListener('blur', () => { drag = null; disengage() })
    canvas.addEventListener('pointerdown', e => {
      if (!engaged) { engage(); return }
      drag = { x: e.clientX, y: e.clientY, b: e.button }; auto = false; spinChk.checked = false; canvas.setPointerCapture(e.pointerId)
    })
    canvas.addEventListener('pointermove', e => {
      if (!drag) return
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y
      if (drag.b === 2) {
        const s = dist * 0.0012
        const right = new THREE.Vector3().subVectors(camera.position, target).cross(camera.up).normalize()
        target.addScaledVector(right, dx * s); target.y += dy * s
      } else { theta -= dx * 0.006; phi -= dy * 0.006 }
      drag.x = e.clientX; drag.y = e.clientY; updCam()
    })
    canvas.addEventListener('pointerup', () => { drag = null })
    canvas.addEventListener('contextmenu', e => e.preventDefault())
    canvas.addEventListener('wheel', e => { if (!engaged) return; e.preventDefault(); dist *= 1 + Math.sign(e.deltaY) * 0.08; updCam() }, { passive: false })
    let pinch = null
    canvas.addEventListener('touchmove', e => {
      if (!engaged) return
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        if (pinch) { dist *= pinch / d; updCam() }
        pinch = d; e.preventDefault()
      }
    }, { passive: false })
    canvas.addEventListener('touchend', () => { pinch = null })

    let curMode = 0
    function apply () {
      const on = lblChk.checked
      if (!two) { floor1G.visible = true; L1.forEach(s => { s.visible = on }) } else {
        floor1G.visible = true; floor2G.visible = curMode !== 1
        L1.forEach(s => { s.visible = on && (curMode === 1 || (curMode === 0 && s.userData.outdoor)) })
        L2.forEach(s => { s.visible = on && curMode !== 1 })
        const bs = ['b1', 'b2', 'bAll'].map(id => document.getElementById(id))
        bs.forEach(b => b.classList.remove('on'))
        bs[curMode === 1 ? 0 : curMode === 2 ? 1 : 2].classList.add('on')
      }
    }
    if (two) {
      document.getElementById('b1').onclick = () => { curMode = 1; apply() }
      document.getElementById('b2').onclick = () => { curMode = 2; apply() }
      document.getElementById('bAll').onclick = () => { curMode = 0; apply() }
    }
    lblChk.onchange = apply
    spinChk.onchange = () => { auto = spinChk.checked }
    apply()

    const wB = ['wAuto', 'wUp', 'wDown'].map(id => document.getElementById(id))
    let wallMode = 'auto'
    const setWalls = (m, btn) => { wallMode = m; wB.forEach(b => b.classList.remove('on')); btn.classList.add('on') }
    wB[0].onclick = () => setWalls('auto', wB[0]); wB[1].onclick = () => setWalls('up', wB[1]); wB[2].onclick = () => setWalls('down', wB[2])
    const STUB = 0.09
    const houseCtr = new THREE.Vector3(0, 0, HD / 2 - cz)
    const _cd = new THREE.Vector3(), _wo = new THREE.Vector3()
    function updateWalls () {
      _cd.set(camera.position.x - houseCtr.x, 0, camera.position.z - houseCtr.z).normalize()
      for (const w of cutWalls) {
        let t = 1
        if (wallMode === 'down') t = STUB
        else if (wallMode === 'auto') {
          _wo.set(w.m.position.x - houseCtr.x, 0, w.m.position.z - houseCtr.z)
          if (_wo.lengthSq() > 0.01) { _wo.normalize(); if (_wo.dot(_cd) > 0.25) t = STUB }
        }
        w.m.scale.y += (t - w.m.scale.y) * 0.18
        w.m.position.y = w.bottom + w.h * w.m.scale.y / 2
      }
    }

    // Кадр: на любом угле влезает сам дом (двор может уйти за край).
    scene.updateMatrixWorld(true)
    const fitBox = new THREE.Box3()
    ;[floor1G, floor2G].forEach(g => fitBox.expandByObject(g))
    target.copy(fitBox.getCenter(new THREE.Vector3()))
    const fitCorners = []
    for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) fitCorners.push(new THREE.Vector3(x, y, z).sub(target))
    function layoutBox () {
      const Wd = innerWidth, Ht = innerHeight, wide = Wd > 640
      const hud = document.querySelector('.hud')
      if (!hud) return { x: 0, y: 0, w: Wd, h: Ht, W: Wd, H: Ht }
      const r = hud.getBoundingClientRect()
      if (wide) { const left = r.right + 16; return { x: left, y: 0, w: Math.max(180, Wd - left), h: Ht, W: Wd, H: Ht } }
      const top = r.bottom + 8
      return { x: 0, y: top, w: Wd, h: Math.max(140, Ht - top), W: Wd, H: Ht }
    }
    function fitDistance () {
      const b = layoutBox(), t = Math.tan(camera.fov * Math.PI / 360)
      const vT = t * (b.h / b.H), hT = t * camera.aspect * (b.w / b.W)
      const up = new THREE.Vector3(0, 1, 0), zc = new THREE.Vector3(), xc = new THREE.Vector3(), yc = new THREE.Vector3()
      let need = 0
      for (let i = 0; i < 72; i++) {
        const th = i * Math.PI / 36
        zc.set(Math.sin(phi) * Math.sin(th), Math.cos(phi), Math.sin(phi) * Math.cos(th)).normalize()
        xc.crossVectors(up, zc).normalize(); yc.crossVectors(zc, xc)
        for (const p of fitCorners) { const along = p.dot(zc); need = Math.max(need, Math.abs(p.dot(xc)) / hT + along, Math.abs(p.dot(yc)) / vT + along) }
      }
      return need * 1.04
    }
    function resize () {
      const w = innerWidth, h = innerHeight
      renderer.setSize(w, h, false); camera.aspect = w / h
      const b = layoutBox(), bx = b.x + b.w / 2, by = b.y + b.h / 2
      camera.setViewOffset(w, h, w / 2 - bx, h / 2 - by, w, h); camera.updateProjectionMatrix()
      tapme.style.left = bx + 'px'; tapme.style.top = by + 'px'
      if (!engaged) dist = fitDistance()
      updCam()
    }
    addEventListener('resize', resize); resize()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { auto = false; spinChk.checked = false }
    updCam()
    let offscreen = false
    addEventListener('message', e => { if (e.origin !== location.origin) return; const d = e.data; if (d && d.type === 'model:visible') offscreen = !d.visible })
    ;(function loop (t) {
      requestAnimationFrame(loop)
      if (offscreen || document.hidden) return
      if (auto) { theta += 0.0018; updCam() }
      const s = (t || 0) * 0.001
      for (const pb of plumbobs) { pb.rotation.y = s * 1.6; pb.position.y = pb.userData.baseY + Math.sin(s * 2.2) * 0.03 }
      waterTex.offset.set(s * 0.025, Math.sin(s * 0.4) * 0.05)
      updateWalls()
      renderer.render(scene, camera)
    })()
  },
}
