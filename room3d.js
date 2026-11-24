// Find Yo Zen — 3D scenes for the Zen Den rooms. Loaded on demand.
import * as THREE from "three";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js";

const GOLD = 0xd9b45a, GOLD2 = 0xf6dc8f;
const ctex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const glowTex = (col = "255,230,170") => ctex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, `rgba(${col},1)`); r.addColorStop(.25, `rgba(${col},.55)`); r.addColorStop(1, `rgba(${col},0)`); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
const sprite = (tex, s, color = 0xffffff, op = 1) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.set(s, s, 1); return m; };
const hex = c => new THREE.Color(c);

/* ---------------- shared stage ---------------- */
function stage(el, { bg = 0x08110c, fog = .045, cam = [0, 3, 8], target = [0, 1, 0], orbit = true, exposure = 1.1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement); renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
  const scene = new THREE.Scene(); scene.background = hex(bg); scene.fog = new THREE.FogExp2(bg, fog);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 200);
  const tgt = new THREE.Vector3(...target), off = new THREE.Vector3(...cam).sub(tgt);
  let theta = Math.atan2(off.x, off.z), phi = Math.acos(off.y / off.length()), dist = off.length(), uT = theta, uP = phi;
  const place = () => { camera.position.set(tgt.x + dist * Math.sin(phi) * Math.sin(theta), tgt.y + dist * Math.cos(phi), tgt.z + dist * Math.sin(phi) * Math.cos(theta)); camera.lookAt(tgt); };
  const resize = () => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  // fireflies
  const N = 120, fg = new THREE.BufferGeometry(), fp = new Float32Array(N * 3), ph = [];
  for (let i = 0; i < N; i++) { fp.set([(Math.random() - .5) * 16, Math.random() * 6, (Math.random() - .5) * 12], i * 3); ph.push(Math.random() * 6.28); }
  fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: GOLD2, size: .06, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(flies);
  // pointer: drag to orbit, click to pick
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let drag = null;
  const hitAt = (e, list) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.intersectObjects(list, true)[0]; };
  const S = { renderer, scene, camera, tgt, hitAt, pickables: [], onPick: null, onDown: null, onMove: null, onUp: null, tick: null, running: false, orbit };
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", e => {
    if (S.onDown) { const h = hitAt(e, S.pickables); if (S.onDown(h, e)) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} drag = { draw: true }; cv.style.touchAction = "none"; return; } }
    drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
  });
  cv.addEventListener("pointermove", e => {
    if (!drag) { if (S.onHover) S.onHover(hitAt(e, S.pickables), e); return; }
    if (drag.draw) { S.onMove && S.onMove(hitAt(e, S.pickables), e); return; }
    if (S.orbit && e.pointerType !== "touch") { uT -= (e.clientX - drag.x) * .006; uP = Math.max(.25, Math.min(1.45, uP - (e.clientY - drag.y) * .004)); }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = e => {
    if (drag && drag.draw) { S.onUp && S.onUp(); cv.style.touchAction = "pan-y"; }
    else if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8 && S.onPick) { const h = hitAt(e, S.pickables); if (h) S.onPick(h, e); }
    drag = null;
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", () => { drag = null; });
  let last = performance.now(), raf = 0;
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
    theta += (uT + Math.sin(t * .12) * .08 * (S.orbit ? 1 : .4) - theta) * .06; phi += (uP - phi) * .06; place();
    const p = fg.attributes.position.array; for (let i = 0; i < N; i++) { ph[i] += dt; p[i * 3 + 1] += Math.sin(ph[i] * 1.3) * .003; p[i * 3] += Math.cos(ph[i] * .7) * .003; } fg.attributes.position.needsUpdate = true;
    flies.material.opacity = .6 + Math.sin(t * 2.3) * .25;
    S.tick && S.tick(t, dt);
    renderer.render(scene, camera);
    if (S.running) raf = requestAnimationFrame(loop);
  };
  S.start = () => { if (S.running) return; S.running = true; last = performance.now(); resize(); raf = requestAnimationFrame(loop); };
  S.stop = () => { S.running = false; cancelAnimationFrame(raf); };
  return S;
}
const floorDisc = (S, r = 9, col = 0x13241c) => { const f = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: .8, metalness: .1 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; S.scene.add(f); return f; };
const keyLight = (S, col = 0xffe6b0, i = 2.2, pos = [3, 6, 4]) => { const d = new THREE.DirectionalLight(col, i); d.position.set(...pos); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.camera.left = d.shadow.camera.bottom = -6; d.shadow.camera.right = d.shadow.camera.top = 6; S.scene.add(d); S.scene.add(new THREE.HemisphereLight(0x9fd8b8, 0x1a120a, .5)); return d; };
const goldM = () => new THREE.MeshStandardMaterial({ color: GOLD, metalness: .9, roughness: .28, envMapIntensity: 1.2 });

/* ---------------- Sound Chamber: singing bowl ---------------- */
function sound(S, api) {
  keyLight(S); floorDisc(S);
  const prof = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * .5; prof.push(new THREE.Vector2(.25 + Math.sin(a) * 1.55, 1.05 - Math.cos(a) * 1.05)); }
  prof.push(new THREE.Vector2(1.86, 1.1)); prof.push(new THREE.Vector2(1.72, 1.12)); for (let i = 24; i >= 0; i--) { const a = i / 24 * Math.PI * .5; prof.push(new THREE.Vector2(.2 + Math.sin(a) * 1.46, 1.12 - Math.cos(a) * .97)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: .95, roughness: .22, side: THREE.DoubleSide, envMapIntensity: 1.4 }));
  bowl.castShadow = true; const grp = new THREE.Group(); grp.add(bowl); grp.position.y = .35; S.scene.add(grp);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.74, .03, 8, 96), goldM()); band.rotation.x = Math.PI / 2; band.position.y = 1.0; grp.add(band);
  const cushion = new THREE.Mesh(new THREE.TorusGeometry(1.05, .38, 24, 64), new THREE.MeshStandardMaterial({ color: 0x7a1f2a, roughness: .9 })); cushion.rotation.x = Math.PI / 2; cushion.position.y = .3; cushion.receiveShadow = true; S.scene.add(cushion);
  const wg = new THREE.CircleGeometry(1.45, 64, 0, Math.PI * 2); wg.rotateX(-Math.PI / 2); const wb = wg.attributes.position.array.slice();
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x2a5a6a, metalness: .6, roughness: .08, transparent: true, opacity: .85, envMapIntensity: 1.6 })); water.position.y = .9; grp.add(water);
  const mallet = new THREE.Group(); const stick = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x5a3218, roughness: .6 })); stick.rotation.z = Math.PI / 2; const suede = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .6, 16), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 })); suede.rotation.z = Math.PI / 2; suede.position.x = .7; mallet.add(stick, suede); mallet.position.set(2.6, .12, 1.2); mallet.rotation.y = .5; S.scene.add(mallet);
  // audio ring
  const RN = 128, rg = new THREE.BufferGeometry(), rp = new Float32Array(RN * 3); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const ring = new THREE.Points(rg, new THREE.PointsMaterial({ size: .09, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffffff })); S.scene.add(ring);
  const glow = sprite(glowTex(), 4, 0xffffff, .0); glow.position.y = 1.6; S.scene.add(glow);
  const pl = new THREE.PointLight(0xffffff, 0, 8, 1.6); pl.position.set(0, 2.2, 0); S.scene.add(pl);
  let ripples = [], wob = 0;
  S.pickables = [bowl, band, water]; S.onPick = () => { api.strike(); };
  api.onStrike = () => { ripples.push({ t: 0 }); wob = 1; };
  S.tick = (t, dt) => {
    const lv = api.level(), col = hex(api.noteColor());
    ring.material.color.copy(col); glow.material.color.copy(col); pl.color.copy(col);
    glow.material.opacity = Math.min(.9, lv * 2.2); pl.intensity = lv * 30;
    const sp = api.spectrum();
    for (let i = 0; i < RN; i++) { const a = i / RN * Math.PI * 2, v = sp ? sp[i % 64] / 255 : 0, r = 2.3 + v * 1.2 + Math.sin(t * 2 + i * .3) * .03; rp[i * 3] = Math.cos(a + t * .2) * r; rp[i * 3 + 1] = 1.4 + v * .8 + Math.sin(a * 3 + t) * .06; rp[i * 3 + 2] = Math.sin(a + t * .2) * r; }
    rg.attributes.position.needsUpdate = true;
    ripples.forEach(r => r.t += dt); ripples = ripples.filter(r => r.t < 6);
    const p = wg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = wb[i], z = wb[i + 2], d = Math.hypot(x, z); let y = 0; for (const r of ripples) y += Math.sin(d * 14 - r.t * 9) * Math.exp(-r.t * .7) * .035 * Math.max(0, 1 - Math.abs(d - r.t * .6) * .9); y += Math.sin(d * 10 - t * 6) * lv * .02; p[i + 1] = y; }
    wg.attributes.position.needsUpdate = true; wg.computeVertexNormals();
    wob *= .97; grp.rotation.z = Math.sin(t * 22) * .012 * wob; grp.rotation.x = Math.cos(t * 19) * .01 * wob;
  };
}

/* ---------------- Breath Hall: breathing orb over a lotus pond ---------------- */
function breath(S, api) {
  keyLight(S, 0xcfe6ff, 1.2);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x0c2a26, metalness: .8, roughness: .12, envMapIntensity: 1.2 })); pond.rotation.x = -Math.PI / 2; S.scene.add(pond);
  for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 4.5, pad = new THREE.Mesh(new THREE.CylinderGeometry(.5 + Math.random() * .35, .5, .03, 24, 1, false, .3, Math.PI * 1.85), new THREE.MeshStandardMaterial({ color: 0x2f7a4c, roughness: .6 })); pad.position.set(Math.cos(a) * r, .02, Math.sin(a) * r); pad.rotation.y = Math.random() * 6; S.scene.add(pad);
    if (i % 3 === 0) { const fl = new THREE.Group(); for (let k = 0; k < 8; k++) { const pe = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: k % 2 ? 0xf3b6cf : 0xe98fb6, roughness: .5, emissive: 0x3a1020 })); pe.scale.set(.5, 1.4, 1); pe.position.set(Math.cos(k / 8 * 6.28) * .14, .08, Math.sin(k / 8 * 6.28) * .14); pe.lookAt(pad.position.x * 0, 2, 0); fl.add(pe); } fl.position.copy(pad.position); fl.position.y = .05; S.scene.add(fl); } }
  const orbM = new THREE.MeshPhysicalMaterial({ color: 0xfff3c4, emissive: 0x4fb487, emissiveIntensity: .55, roughness: .15, metalness: 0, clearcoat: 1, transparent: true, opacity: .92 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.5, 64, 32), orbM); orb.position.y = 2.2; S.scene.add(orb);
  const halo = sprite(glowTex("246,220,143"), 5, 0xffffff, .7); halo.position.copy(orb.position); S.scene.add(halo);
  const pl = new THREE.PointLight(0xf6dc8f, 25, 12, 1.6); pl.position.copy(orb.position); S.scene.add(pl);
  const N = 900, g = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), dir = [], rr = [];
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection(); dir.push(v); rr.push(1.2 + Math.random() * 3.2); }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fe8c8, size: .05, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); S.scene.add(pts);
  const reflect = sprite(glowTex("246,220,143"), 3, 0xffffff, .35); reflect.position.set(0, -.01, 0); reflect.scale.set(4, 1, 1); S.scene.add(reflect);
  let sm = 1;
  S.tick = (t) => {
    const s = api.breathScale(); sm += (s - sm) * .08;
    orb.scale.setScalar(.8 + (sm - 1) * .55); orbM.emissive.setHSL(.38 - (sm - 1) * .2, .6, .45); halo.scale.setScalar(2.6 + sm * 1.4); pl.intensity = 14 + sm * 14; orb.position.y = 2.2 + Math.sin(t * .8) * .05; halo.position.y = orb.position.y;
    const k = (sm - 1) / 1.4, p = g.attributes.position.array;
    for (let i = 0; i < N; i++) { const r = .55 * sm + rr[i] * (1.15 - k * .65) + Math.sin(t + i) * .04, d = dir[i]; p[i * 3] = d.x * r; p[i * 3 + 1] = 2.2 + d.y * r * .8; p[i * 3 + 2] = d.z * r; }
    g.attributes.position.needsUpdate = true; pts.rotation.y = t * .05;
    reflect.material.opacity = .2 + k * .3;
  };
}

/* ---------------- Zen Garden: raked sand in 3D ---------------- */
function garden(S, api) {
  S.orbit = false;
  const sun = keyLight(S, 0xffe2b8, 2.6, [-4, 7, 3]);
  floorDisc(S, 14, 0x1c3326);
  const tex = new THREE.CanvasTexture(api.sandCanvas()); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const bump = new THREE.CanvasTexture(api.sandCanvas());
  const W = 8, H = 5, sand = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 6, roughness: .95, color: 0xd8ceb6 }));
  sand.rotation.x = -Math.PI / 2; sand.position.y = .06; sand.receiveShadow = true; S.scene.add(sand);
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .8 });
  [[0, H / 2 + .1, W + .4, .2], [0, -H / 2 - .1, W + .4, .2], [W / 2 + .1, 0, .2, H], [-W / 2 - .1, 0, .2, H]].forEach(([x, z, w, d]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .25, d), wood); b.position.set(x, .12, z); b.castShadow = b.receiveShadow = true; S.scene.add(b); });
  // stone lantern (toro)
  const stone = new THREE.MeshStandardMaterial({ color: 0x8a8f88, roughness: .9 });
  const toro = new THREE.Group(); [[.5, .25, .5, .12], [.12, .12, .9, .7], [.45, .45, .35, 1.3], [.62, .05, .3, 1.62]].forEach(([r1, r2, h, y]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 6), stone); m.position.y = y; m.castShadow = true; toro.add(m); });
  const lamp = new THREE.PointLight(0xffc070, 6, 5, 2); lamp.position.y = 1.3; toro.add(lamp); const lg = sprite(glowTex("255,200,120"), .9, 0xffffff, .9); lg.position.y = 1.3; toro.add(lg);
  toro.position.set(-W / 2 - 1.2, 0, -H / 2 + .3); S.scene.add(toro);
  // maple + bamboo
  const tree = new THREE.Group(); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x3a2414 })); trunk.position.y = 1.2; trunk.castShadow = true; tree.add(trunk);
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(.55 + Math.random() * .3, 1), new THREE.MeshStandardMaterial({ color: [0xc0392b, 0xd35400, 0xa93226][i % 3], roughness: .8, flatShading: true })); c.position.set((Math.random() - .5) * 1.6, 2.4 + Math.random() * .9, (Math.random() - .5) * 1.2); c.castShadow = true; tree.add(c); }
  tree.position.set(W / 2 + 1.3, 0, -H / 2 + .2); S.scene.add(tree);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 3 + Math.random() * 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: .6 })); b.position.set(-2 + i * .35, 1.6, -H / 2 - 1.1 - Math.random() * .4); b.castShadow = true; S.scene.add(b); }
  const rocks = [];
  const addRock = (u, v) => { const r = .22 + Math.random() * .22, m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: 0x5a605a, roughness: .85, flatShading: true })); m.scale.y = .6; m.position.set((u - .5) * W, .06 + r * .3, (v - .5) * H); m.rotation.y = Math.random() * 6; m.castShadow = true; S.scene.add(m); rocks.push(m); };
  const mossM = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 1 });
  const addMoss = (u, v) => { for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.05 + Math.random() * .06, 6, 4), mossM); m.position.set((u - .5) * W + (Math.random() - .5) * .45, .08, (v - .5) * H + (Math.random() - .5) * .35); m.scale.y = .5; S.scene.add(m); rocks.push(m); } };
  api.onClear = () => { rocks.forEach(r => S.scene.remove(r)); rocks.length = 0; };
  S.pickables = [sand];
  const uv = h => h && h.object === sand ? h.uv : null;
  S.onDown = (h) => { const u = uv(h); if (!u) return false; const kind = api.gardenDown(u.x, 1 - u.y); if (kind === "stone") addRock(u.x, 1 - u.y); if (kind === "moss") addMoss(u.x, 1 - u.y); return kind === "rake"; };
  S.onMove = (h) => { const u = uv(h); if (u) api.gardenMove(u.x, 1 - u.y); };
  S.onUp = () => api.gardenUp();
  S.camera.fov = 38;
  S.tick = (t) => { if (api.sandDirty()) { tex.needsUpdate = true; bump.needsUpdate = true; } lamp.intensity = 5 + Math.sin(t * 7) * .6 + Math.sin(t * 13) * .4; tree.rotation.z = Math.sin(t * .6) * .01; sun.position.x = -4 + Math.sin(t * .05) * 1; };
}

/* ---------------- Meditation Room: candle, incense, moon window ---------------- */
function meditate(S, api) {
  S.scene.add(new THREE.HemisphereLight(0x6a8ab8, 0x1a120a, .35)); floorDisc(S, 10, 0x1a140e);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: 0x14201a, roughness: 1 })); wall.position.set(0, 4, -3.5); S.scene.add(wall);
  const win = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.62, 96), goldM()); win.position.set(0, 3.6, -3.45); S.scene.add(win);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(1.5, 96), new THREE.MeshBasicMaterial({ map: ctex(256, 256, (g) => { const r = g.createLinearGradient(0, 0, 0, 256); r.addColorStop(0, "#0b1a2e"); r.addColorStop(1, "#1d3b4a"); g.fillStyle = r; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(Math.random() * 256, Math.random() * 200, 1.5, 1.5); } g.fillStyle = "#f4ecd6"; g.beginPath(); g.arc(170, 90, 34, 0, 7); g.fill(); g.fillStyle = "#0b1a2e"; g.beginPath(); g.arc(184, 82, 30, 0, 7); g.fill(); g.fillStyle = "#0f2418"; g.beginPath(); g.moveTo(0, 256); g.lineTo(60, 190); g.lineTo(110, 230); g.lineTo(170, 170); g.lineTo(256, 240); g.lineTo(256, 256); g.fill(); }) })); sky.position.set(0, 3.6, -3.46); S.scene.add(sky);
  const moonL = new THREE.SpotLight(0xa8c4ff, 12, 12, .5, .8); moonL.position.set(0, 3.6, -3.2); moonL.target.position.set(0, 0, 1.5); S.scene.add(moonL, moonL.target);
  const zafu = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, .45, 48), new THREE.MeshStandardMaterial({ color: 0x5c1d1d, roughness: .95 })); zafu.position.set(0, .22, .8); zafu.castShadow = zafu.receiveShadow = true; S.scene.add(zafu);
  const mat = new THREE.Mesh(new THREE.BoxGeometry(3.6, .06, 2.4), new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 1 })); mat.position.set(0, .03, .9); mat.receiveShadow = true; S.scene.add(mat);
  // candle
  const candle = new THREE.Group(); const wax = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .9, 32), new THREE.MeshStandardMaterial({ color: 0xefe3c8, roughness: .5, emissive: 0x3a2410, emissiveIntensity: .3 })); wax.position.y = .45; wax.castShadow = true; candle.add(wax);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a })); flame.scale.set(1, 2.4, 1); flame.position.y = 1.05; candle.add(flame);
  const fg = sprite(glowTex("255,190,90"), 1.4, 0xffffff, .9); fg.position.y = 1.08; candle.add(fg);
  const cl = new THREE.PointLight(0xffb060, 12, 9, 1.6); cl.position.y = 1.15; cl.castShadow = true; candle.add(cl);
  candle.position.set(-1.4, 0, 1.6); S.scene.add(candle);
  // incense + smoke
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, .12, 24), goldM()); holder.position.set(1.4, .06, 1.6); S.scene.add(holder);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .9, 6), new THREE.MeshStandardMaterial({ color: 0x5a3218 })); stick.position.set(1.4, .5, 1.6); stick.rotation.z = .15; S.scene.add(stick);
  const ember = sprite(glowTex("255,120,60"), .18, 0xffffff, 1); ember.position.set(1.33, .94, 1.6); S.scene.add(ember);
  const smokeT = glowTex("210,210,220"), puffs = [];
  for (let i = 0; i < 40; i++) { const s = sprite(smokeT, .3, 0xffffff, 0); s.material.blending = THREE.NormalBlending; S.scene.add(s); puffs.push({ s, a: Math.random() * 4 }); }
  S.tick = (t, dt) => {
    const run = api.medRunning(), f = .85 + Math.sin(t * 17) * .08 + Math.sin(t * 31) * .06;
    flame.scale.set(1, 2.4 * f, 1); flame.position.x = Math.sin(t * 5) * .01; cl.intensity = (run ? 16 : 11) * f; fg.material.opacity = .7 + f * .2;
    S.scene.fog.density = run ? .065 : .045;
    puffs.forEach(p => { p.a += dt * (run ? .9 : .6); if (p.a > 4) p.a = 0; const k = p.a / 4; p.s.position.set(1.33 + Math.sin(p.a * 2.2 + t) * .15 * k * 3, .95 + p.a * .7, 1.6 + Math.cos(p.a * 1.7) * .1 * k * 3); p.s.scale.setScalar(.15 + k * 1.1); p.s.material.opacity = (run ? .32 : .22) * Math.sin(Math.PI * k); });
    ember.material.opacity = .7 + Math.sin(t * 3) * .3;
  };
}

/* ---------------- Chakra Shrine: the master with 3D chakra wheels ---------------- */
function chakras(S, api) {
  S.scene.add(new THREE.HemisphereLight(0x9fd8b8, 0x1a120a, .6)); floorDisc(S, 9);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.48), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .05, color: 0xb0a8a0 }));
  plane.position.y = 2.24; S.scene.add(plane);
  const img = new Image(); img.onload = () => { plane.material.map = ctex(900, 960, g => g.drawImage(img, 0, 0, 900, 960)); plane.material.needsUpdate = true; }; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(api.masterSVG());
  const CK = api.chakras(), Y = { root: .62, sacral: .98, solar: 1.32, heart: 1.66, throat: 2.17, third: 2.79, crown: 3.1 }, wheels = [];
  CK.forEach(c => {
    const g = new THREE.Group(); g.position.set(0, Y[c.k], .35);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.08, 24, 16), new THREE.MeshStandardMaterial({ color: c.c, emissive: c.c, emissiveIntensity: 2 })); g.add(core);
    const petals = new THREE.Group(); const n = [4, 6, 10, 12, 16, 2, 20][CK.indexOf(c)];
    for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.042, 10, 6), new THREE.MeshStandardMaterial({ color: c.c, emissive: c.c, emissiveIntensity: .9, transparent: true, opacity: .85 })); const a = i / n * Math.PI * 2; p.scale.set(.6, 1.8, .4); p.position.set(Math.cos(a) * .15, Math.sin(a) * .15, 0); p.rotation.z = a - Math.PI / 2; petals.add(p); }
    g.add(petals);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.22, .008, 8, 64), new THREE.MeshBasicMaterial({ color: c.c, transparent: true, opacity: .7 })); g.add(ring);
    const gl = sprite(glowTex(), .6, hex(c.c), .7); g.add(gl);
    const pl = new THREE.PointLight(c.c, 0, 3, 2); g.add(pl);
    S.scene.add(g); wheels.push({ c, g, petals, ring, gl, pl, core }); core.userData.k = c.k; petals.children.forEach(p => p.userData.k = c.k);
  });
  // kundalini spiral
  const N = 500, sg = new THREE.BufferGeometry(), sp = new Float32Array(N * 3), cols = new Float32Array(N * 3); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); sg.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const spiral = new THREE.Points(sg, new THREE.PointsMaterial({ size: .04, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); S.scene.add(spiral);
  S.pickables = wheels.flatMap(w => [w.core, ...w.petals.children]);
  S.onPick = h => { const k = h.object.userData.k; if (k) api.selectChakra(k); };
  S.camera.position.set(0, 2, 6); S.tgt.set(0, 1.9, 0);
  S.tick = (t) => {
    const sel = api.selectedChakra();
    wheels.forEach((w, i) => { const on = w.c.k === sel; w.petals.rotation.z = t * (on ? 2.4 : .6) * (i % 2 ? 1 : -1); w.ring.rotation.z = -t * .4; w.g.scale.setScalar(on ? 1.35 + Math.sin(t * 4) * .05 : 1); w.gl.material.opacity = on ? .95 : .45; w.gl.scale.setScalar(on ? 1.1 : .6); w.pl.intensity = on ? 6 : 0; w.g.lookAt(S.camera.position.x, w.g.position.y, S.camera.position.z); });
    plane.lookAt(S.camera.position.x, plane.position.y, S.camera.position.z);
    for (let i = 0; i < N; i++) { const k = ((i / N) + t * .08) % 1, y = .5 + k * 2.75, a = k * 28 + (i % 2) * Math.PI, r = .12 + Math.sin(k * Math.PI) * .12; sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = y; sp[i * 3 + 2] = .35 + Math.sin(a) * r; const ci = Math.min(6, Math.floor(k * 7)), cc = hex(CK[ci].c); cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b; }
    sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
  };
}

/* ---------------- Lantern Garden: lanterns over a moonlit lake ---------------- */
function lantern(S, api) {
  S.scene.background = hex(0x050b10); S.scene.fog = new THREE.FogExp2(0x0a1420, .03);
  S.scene.add(new THREE.HemisphereLight(0x3a5a8a, 0x05080a, .4));
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x0a1a24, metalness: .9, roughness: .08, envMapIntensity: .6 })); lake.rotation.x = -Math.PI / 2; S.scene.add(lake);
  const moon = sprite(glowTex("235,240,255"), 9, 0xffffff, .9); moon.position.set(-8, 9, -30); S.scene.add(moon);
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ color: 0xf4f1e6, fog: false })); moonDisc.position.copy(moon.position); S.scene.add(moonDisc);
  for (let i = 0; i < 9; i++) { const h = 3 + Math.random() * 6, m = new THREE.Mesh(new THREE.ConeGeometry(4 + Math.random() * 4, h, 5), new THREE.MeshStandardMaterial({ color: 0x0b1a14, roughness: 1, flatShading: true })); m.position.set(-36 + i * 9, h / 2 - .1, -34 - Math.random() * 6); S.scene.add(m); }
  const starG = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 900; i++) { const a = Math.random() * 6.28, e = Math.random() * 1.2 + .15; sp.push(Math.cos(a) * Math.cos(e) * 70, Math.sin(e) * 70, Math.sin(a) * Math.cos(e) * 70 - 10); } starG.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  S.scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: .18, fog: false })));
  const shell = new THREE.MeshStandardMaterial({ color: 0xffb35a, emissive: 0xff8a2a, emissiveIntensity: 1.6, roughness: .7, transparent: true, opacity: .95 });
  const geo = new THREE.CylinderGeometry(.22, .17, .42, 12, 1, true), gt = glowTex("255,170,80"), L = [];
  const make = (txt, rise) => { const g = new THREE.Group(); const body = new THREE.Mesh(geo, shell); const top = new THREE.Mesh(new THREE.CircleGeometry(.22, 12), shell); top.rotation.x = -Math.PI / 2; top.position.y = .21; g.add(body, top); const gl = sprite(gt, 1.8, 0xffffff, .9); g.add(gl); const refl = sprite(gt, 1.2, 0xffffff, .25); S.scene.add(refl);
    const l = { g, refl, x: (Math.random() - .5) * 10, z: -1 - Math.random() * 10, y: rise ? .2 : 1.5 + Math.random() * 6, vy: rise ? .9 : .05 + Math.random() * .05, ph: Math.random() * 6, txt }; g.userData.txt = txt; body.userData.txt = txt; S.scene.add(g); L.push(l); return l; };
  api.lanterns().forEach(t => make(t, false));
  api.onRelease = t => { const l = make(t, true); l.x = (Math.random() - .5) * 2; l.z = 1.5; };
  if (!L.length) for (let i = 0; i < 6; i++) make("", false);
  S.camera.position.set(0, 1.6, 7); S.tgt.set(0, 2.6, -4);
  S.tick = (t, dt) => { L.forEach(l => { l.vy = Math.max(.05, l.vy * .995); l.y += l.vy * dt; if (l.y > 14) { l.y = 1.2; } l.x += Math.sin(t * .3 + l.ph) * .003; l.z -= dt * .05; if (l.z < -20) l.z = -2; l.g.position.set(l.x, l.y + Math.sin(t + l.ph) * .08, l.z); l.g.rotation.y = t * .3 + l.ph; l.refl.position.set(l.x, .02, l.z); l.refl.material.opacity = .25 * Math.max(0, 1 - l.y / 10); }); };
}

/* ---------------- Koan Room: unrolling scroll and enso ---------------- */
function koan(S, api) {
  S.scene.add(new THREE.HemisphereLight(0xffe8c8, 0x1a120a, .7)); keyLight(S, 0xffe6b0, 1.4, [2, 5, 6]); floorDisc(S, 9, 0x1a140e);
  const enso = new THREE.Mesh(new THREE.TorusGeometry(2.4, .09, 12, 160, Math.PI * 1.88), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .9 })); enso.position.set(0, 3, -2.5); enso.rotation.z = .6; S.scene.add(enso);
  const paperT = (txt) => ctex(1024, 512, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, "#f3e6c8"); r.addColorStop(1, "#e4d2a8"); g.fillStyle = r; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(120,90,40,${Math.random() * .06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = "#1a1208"; g.textAlign = "center"; g.textBaseline = "middle"; let size = 56; g.font = `600 ${size}px Cinzel, Georgia, serif`; const words = (txt || "Draw a koan").split(" "), lines = []; let line = "";
    words.forEach(wd => { const tt = line ? line + " " + wd : wd; if (g.measureText(tt).width > w - 160) { lines.push(line); line = wd; } else line = tt; }); lines.push(line);
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25)); g.fillStyle = "#b02a2a"; g.fillRect(w - 110, h - 110, 56, 56); });
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1, 40, 1), new THREE.MeshStandardMaterial({ map: paperT(""), roughness: .9, side: THREE.DoubleSide })); scroll.position.set(0, 2.2, 0); scroll.castShadow = true; S.scene.add(scroll);
  const rodM = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: .6 });
  const rodL = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 2.4, 16), rodM), rodR = rodL.clone(); [rodL, rodR].forEach(r => { r.position.y = 2.2; S.scene.add(r); });
  const ink = [], inkT = glowTex("20,20,20"); for (let i = 0; i < 30; i++) { const s = sprite(inkT, .2, 0xffffff, 0); s.material.blending = THREE.NormalBlending; S.scene.add(s); ink.push({ s, a: 9 }); }
  let cur = null, open = 0;
  S.pickables = [scroll]; S.onPick = () => api.drawKoan();
  S.tick = (t, dt) => {
    const k = api.koanText(); if (k !== cur) { cur = k; scroll.material.map = paperT(k); scroll.material.needsUpdate = true; open = 0; ink.forEach(p => { p.a = Math.random() * .3; p.x = (Math.random() - .5) * 3; }); }
    open = Math.min(1, open + dt * .7); const e = 1 - Math.pow(1 - open, 3);
    scroll.scale.x = .04 + e * .96; rodL.position.x = -2.1 * scroll.scale.x - .05; rodR.position.x = 2.1 * scroll.scale.x + .05;
    scroll.position.y = 2.2 + Math.sin(t * .8) * .05; rodL.position.y = rodR.position.y = scroll.position.y;
    const p = scroll.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 1.5 + t) * .05); p.needsUpdate = true;
    enso.rotation.z = .6 + t * .05;
    ink.forEach(q => { q.a += dt; const k2 = q.a / 2.5; q.s.position.set(q.x, 1.1 - k2 * .8, .3); q.s.scale.setScalar(.05 + k2 * .3); q.s.material.opacity = k2 < 1 ? .5 * (1 - k2) : 0; });
  };
}

/* ---------------- Cosmos Chamber: 3D orrery of your chart ---------------- */
function cosmos(S, api) {
  S.scene.background = hex(0x04060e); S.scene.fog = null;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.45, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a })); S.scene.add(sun);
  const sg = sprite(glowTex("255,200,110"), 3.6, 0xffffff, .9); S.scene.add(sg); S.scene.add(new THREE.PointLight(0xffe0a0, 40, 30, 1.4)); S.scene.add(new THREE.AmbientLight(0x404060, .6));
  const R = 4.6, zod = new THREE.Mesh(new THREE.TorusGeometry(R, .015, 8, 256), new THREE.MeshBasicMaterial({ color: GOLD2, transparent: true, opacity: .6 })); zod.rotation.x = Math.PI / 2; S.scene.add(zod);
  const signs = api.signGlyphs(), names = api.signNames();
  signs.forEach((gph, i) => { const a = (i * 30 + 15) * Math.PI / 180, t = ctex(128, 128, (g) => { g.fillStyle = "#f6dc8f"; g.font = "88px 'Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(gph, 64, 66); }), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(.55, .55, 1); s.position.set(Math.cos(a) * (R + .55), 0, -Math.sin(a) * (R + .55)); S.scene.add(s);
    const tk = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .35), new THREE.MeshBasicMaterial({ color: GOLD })); const b = i * 30 * Math.PI / 180; tk.position.set(Math.cos(b) * R, 0, -Math.sin(b) * R); tk.rotation.y = b; S.scene.add(tk); });
  const starG = new THREE.BufferGeometry(), stp = []; for (let i = 0; i < 1500; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 20); stp.push(v.x, v.y, v.z); } starG.setAttribute("position", new THREE.Float32BufferAttribute(stp, 3)); S.scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: .15 })));
  const PL = [["sun", 0xffd27a, .0, 0], ["moon", 0xe8e8f0, .14, 1.1], ["mercury", 0xb0a090, .1, 1.5], ["venus", 0xf3d6a0, .14, 1.9], ["mars", 0xd8603a, .13, 2.3], ["jupiter", 0xe0b080, .26, 2.8], ["saturn", 0xd9c38a, .22, 3.3], ["uranus", 0x9fe3ec, .17, 3.7], ["neptune", 0x5a7cf0, .17, 4.05], ["pluto", 0xb09a9a, .08, 4.35]];
  const bodies = PL.filter(p => p[2]).map(([k, col, size, orbit]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 16), new THREE.MeshStandardMaterial({ color: col, roughness: .7, emissive: col, emissiveIntensity: .15 }));
    const o = new THREE.Mesh(new THREE.TorusGeometry(orbit, .004, 4, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .12 })); o.rotation.x = Math.PI / 2; S.scene.add(o, m);
    if (k === "saturn") { const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.4, size * 2.2, 48), new THREE.MeshBasicMaterial({ color: 0xd9c38a, side: THREE.DoubleSide, transparent: true, opacity: .7 })); ring.rotation.x = Math.PI / 2.4; m.add(ring); }
    const lt = ctex(256, 64, (g) => { g.fillStyle = "#f3ead4"; g.font = "600 30px Cinzel, Georgia, serif"; g.textAlign = "center"; g.fillText(k[0].toUpperCase() + k.slice(1), 128, 40); }), label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, transparent: true, depthWrite: false, opacity: .8 })); label.scale.set(1, .25, 1); S.scene.add(label);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .35 })); S.scene.add(line);
    return { k, m, label, line, orbit, ang: Math.random() * 6.28, cur: Math.random() * 6.28 };
  });
  const sunMark = sprite(glowTex("255,200,110"), .7, 0xffffff, 1); S.scene.add(sunMark);
  S.camera.position.set(0, 6.5, 8.5); S.tgt.set(0, 0, 0);
  S.tick = (t) => {
    const pos = api.positions(); sun.rotation.y = t * .1;
    bodies.forEach(b => { const target = pos && pos[b.k] != null ? pos[b.k] * Math.PI / 180 : b.ang + t * (.3 / b.orbit); let d = target - b.cur; d = Math.atan2(Math.sin(d), Math.cos(d)); b.cur += d * .05;
      const x = Math.cos(b.cur) * b.orbit, z = -Math.sin(b.cur) * b.orbit; b.m.position.set(x, 0, z); b.m.rotation.y = t * .5; b.label.position.set(x, b.m.geometry.parameters.radius + .22, z);
      const pts = b.line.geometry.attributes.position; pts.setXYZ(0, x, 0, z); pts.setXYZ(1, Math.cos(b.cur) * R, 0, -Math.sin(b.cur) * R); pts.needsUpdate = true; b.line.visible = !!pos; });
    if (pos && pos.sun != null) { const a = pos.sun * Math.PI / 180; sunMark.position.set(Math.cos(a) * R, 0, -Math.sin(a) * R); sunMark.visible = true; } else sunMark.visible = false;
  };
}

const BUILD = { sound, breath, garden, meditate, chakras, lantern, koan, cosmos };
const CFG = {
  sound: { cam: [0, 4.2, 6.8], target: [0, .9, 0] }, breath: { cam: [0, 3.4, 9.5], target: [0, 1.8, 0], bg: 0x06120f },
  garden: { cam: [0, 7.2, 6.4], target: [0, 0, .2], orbit: false, bg: 0x0d1a12, fog: .02 }, meditate: { cam: [0, 2.6, 6.5], target: [0, 1.2, 0], bg: 0x0a0d0b },
  chakras: { cam: [0, 2, 6], target: [0, 1.9, 0] }, lantern: { cam: [0, 1.6, 7], target: [0, 2.6, -4], fog: .03 },
  koan: { cam: [0, 2.6, 6.2], target: [0, 2, 0], bg: 0x0d0b08 }, cosmos: { cam: [0, 6.5, 8.5], target: [0, 0, 0], bg: 0x04060e, fog: .0001 }
};
export function mountRoom(el, kind, api) { const S = stage(el, CFG[kind] || {}); BUILD[kind](S, api); return S; }
