import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, EdgesGeometry, Group, IcosahedronGeometry,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, Scene,
  ShaderMaterial, SRGBColorSpace, Vector3, WebGLRenderer, type Texture,
} from 'three';

/**
 * The home page hero: a floating "digital architecture" — a glowing core, orbiting interface
 * panels (website, dashboard, mobile app), data streams with travelling pulses and a particle
 * field. Everything is generated in code (no models or image downloads). The render loop runs
 * only while the hero is on screen and the tab is visible.
 */

const BRAND = new Color('#4170ff');
const ACCENT = new Color('#8b5cf6');
const SOFT = new Color('#8aa6ff');

export interface HeroScene {
  setPointer(x: number, y: number): void;
  setScroll(progress: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}

// ─────────── procedural textures ───────────

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function frame(g: CanvasRenderingContext2D, w: number, h: number, r: number) {
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, 'rgba(18,26,52,0.94)');
  bg.addColorStop(1, 'rgba(9,13,28,0.94)');
  rr(g, 2, 2, w - 4, h - 4, r);
  g.fillStyle = bg;
  g.fill();
  const edge = g.createLinearGradient(0, 0, w, h);
  edge.addColorStop(0, 'rgba(138,166,255,0.85)');
  edge.addColorStop(0.5, 'rgba(65,112,255,0.25)');
  edge.addColorStop(1, 'rgba(139,92,246,0.75)');
  g.lineWidth = 3;
  g.strokeStyle = edge;
  g.stroke();
}

const bar = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string | CanvasGradient) => { rr(g, x, y, w, h, h / 2); g.fillStyle = color; g.fill(); };

function websiteTexture(): Texture {
  const [c, g] = canvas(1024, 680);
  frame(g, 1024, 680, 28);
  [['#ff6b81', 34], ['#fbbf24', 58], ['#34d399', 82]].forEach(([col, x]) => { g.beginPath(); g.arc(x as number, 36, 7, 0, Math.PI * 2); g.fillStyle = col as string; g.fill(); });
  bar(g, 380, 28, 270, 16, 'rgba(255,255,255,0.08)');
  g.fillStyle = 'rgba(148,163,255,0.12)'; g.fillRect(2, 70, 1020, 2);
  bar(g, 60, 110, 120, 18, 'rgba(255,255,255,0.75)');
  [560, 650, 740].forEach((x) => bar(g, x, 114, 64, 12, 'rgba(255,255,255,0.28)'));
  bar(g, 840, 104, 120, 32, 'rgba(65,112,255,0.95)');
  const head = g.createLinearGradient(60, 0, 620, 0);
  head.addColorStop(0, '#eef0f8'); head.addColorStop(1, '#b9a2ff');
  bar(g, 60, 200, 520, 40, head);
  bar(g, 60, 256, 400, 40, head);
  bar(g, 60, 330, 440, 14, 'rgba(255,255,255,0.28)');
  bar(g, 60, 356, 360, 14, 'rgba(255,255,255,0.2)');
  bar(g, 60, 410, 170, 46, 'rgba(65,112,255,0.95)');
  bar(g, 246, 410, 150, 46, 'rgba(255,255,255,0.1)');
  const art = g.createRadialGradient(800, 300, 10, 800, 300, 190);
  art.addColorStop(0, 'rgba(139,92,246,0.9)'); art.addColorStop(0.55, 'rgba(65,112,255,0.35)'); art.addColorStop(1, 'rgba(65,112,255,0)');
  g.fillStyle = art; g.fillRect(600, 110, 400, 380);
  g.strokeStyle = 'rgba(185,162,255,0.7)'; g.lineWidth = 2;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(800, 300, 140 - i * 22, 60 - i * 9, -0.4, 0, Math.PI * 2); g.stroke(); }
  [60, 370, 680].forEach((x) => { rr(g, x, 510, 284, 130, 16); g.fillStyle = 'rgba(255,255,255,0.04)'; g.fill(); bar(g, x + 24, 540, 44, 44, 'rgba(65,112,255,0.4)'); bar(g, x + 24, 600, 180, 10, 'rgba(255,255,255,0.25)'); });
  return finish(c);
}

function dashboardTexture(): Texture {
  const [c, g] = canvas(1024, 700);
  frame(g, 1024, 700, 28);
  g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(4, 4, 190, 692);
  bar(g, 34, 40, 110, 18, 'rgba(255,255,255,0.75)');
  for (let i = 0; i < 6; i++) bar(g, 34, 110 + i * 52, i === 1 ? 130 : 100, 14, i === 1 ? 'rgba(138,166,255,0.95)' : 'rgba(255,255,255,0.22)');
  [[230, '#4170ff'], [490, '#8b5cf6'], [750, '#5eead4']].forEach(([x, col]) => {
    rr(g, x as number, 40, 240, 120, 18); g.fillStyle = 'rgba(255,255,255,0.045)'; g.fill();
    bar(g, (x as number) + 24, 66, 90, 12, 'rgba(255,255,255,0.3)');
    bar(g, (x as number) + 24, 98, 130, 28, 'rgba(255,255,255,0.85)');
    bar(g, (x as number) + 170, 104, 46, 16, `${col}`);
  });
  rr(g, 230, 190, 500, 320, 18); g.fillStyle = 'rgba(255,255,255,0.035)'; g.fill();
  const area = g.createLinearGradient(0, 260, 0, 490);
  area.addColorStop(0, 'rgba(65,112,255,0.55)'); area.addColorStop(1, 'rgba(65,112,255,0)');
  const pts = [470, 430, 450, 380, 400, 330, 350, 300, 320, 270];
  g.beginPath(); g.moveTo(260, 490);
  pts.forEach((y, i) => g.lineTo(260 + i * 48, y));
  g.lineTo(260 + 9 * 48, 490); g.closePath(); g.fillStyle = area; g.fill();
  g.beginPath(); pts.forEach((y, i) => (i ? g.lineTo(260 + i * 48, y) : g.moveTo(260, y)));
  g.strokeStyle = '#8aa6ff'; g.lineWidth = 4; g.stroke();
  rr(g, 750, 190, 240, 320, 18); g.fillStyle = 'rgba(255,255,255,0.035)'; g.fill();
  [0.8, 0.55, 0.95, 0.4, 0.7].forEach((v, i) => { const h = 220 * v; rr(g, 778 + i * 42, 480 - h, 24, h, 8); g.fillStyle = i % 2 ? 'rgba(139,92,246,0.85)' : 'rgba(65,112,255,0.9)'; g.fill(); });
  for (let i = 0; i < 3; i++) { rr(g, 230, 540 + i * 50, 760, 38, 10); g.fillStyle = 'rgba(255,255,255,0.03)'; g.fill(); bar(g, 254, 552 + i * 50, 200, 12, 'rgba(255,255,255,0.3)'); bar(g, 880, 550 + i * 50, 80, 16, i ? 'rgba(52,211,153,0.6)' : 'rgba(251,191,36,0.6)'); }
  return finish(c);
}

function phoneTexture(): Texture {
  const [c, g] = canvas(420, 820);
  frame(g, 420, 820, 56);
  bar(g, 160, 24, 100, 22, 'rgba(0,0,0,0.6)');
  bar(g, 36, 86, 140, 18, 'rgba(255,255,255,0.8)');
  g.beginPath(); g.arc(360, 96, 20, 0, Math.PI * 2); g.fillStyle = 'rgba(139,92,246,0.8)'; g.fill();
  const card = g.createLinearGradient(36, 140, 384, 330);
  card.addColorStop(0, '#2f5bea'); card.addColorStop(1, '#8b5cf6');
  rr(g, 36, 140, 348, 190, 26); g.fillStyle = card; g.fill();
  bar(g, 64, 176, 110, 14, 'rgba(255,255,255,0.7)');
  bar(g, 64, 206, 200, 34, 'rgba(255,255,255,0.95)');
  bar(g, 64, 284, 140, 14, 'rgba(255,255,255,0.55)');
  for (let i = 0; i < 4; i++) {
    rr(g, 36, 360 + i * 100, 348, 82, 20); g.fillStyle = 'rgba(255,255,255,0.045)'; g.fill();
    rr(g, 56, 377 + i * 100, 48, 48, 14); g.fillStyle = ['rgba(65,112,255,0.6)', 'rgba(139,92,246,0.6)', 'rgba(94,234,212,0.5)', 'rgba(251,191,36,0.5)'][i]; g.fill();
    bar(g, 124, 384 + i * 100, 150, 13, 'rgba(255,255,255,0.7)');
    bar(g, 124, 408 + i * 100, 100, 11, 'rgba(255,255,255,0.3)');
  }
  rr(g, 36, 742, 348, 50, 25); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fill();
  return finish(c);
}

function dotTexture(): Texture {
  const [c, g] = canvas(64, 64);
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return finish(c);
}

function finish(c: HTMLCanvasElement): Texture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ─────────── scene ───────────

export function createHeroScene(canvasEl: HTMLCanvasElement, { onFirstFrame }: { onFirstFrame?: () => void } = {}): HeroScene {
  const renderer = new WebGLRenderer({ canvas: canvasEl, antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => { disposables.push(x); return x; };

  const root = new Group();
  scene.add(root);

  // Core: fresnel-lit sphere inside a wireframe icosahedron.
  const coreMat = keep(new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: BRAND }, uB: { value: ACCENT } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2); vec3 c = mix(uA, uB, 0.5 + 0.5*sin(uTime*0.6 + vN.y*2.0)); gl_FragColor = vec4(c * (0.25 + f*1.6), 0.18 + f*0.9); }`,
  }));
  const core = new Mesh(keep(new IcosahedronGeometry(1.15, 5)), coreMat);
  root.add(core);
  const shellGeo = keep(new EdgesGeometry(keep(new IcosahedronGeometry(1.6, 1))));
  const shell = new LineSegments(shellGeo, keep(new LineBasicMaterial({ color: SOFT, transparent: true, opacity: 0.45 })));
  root.add(shell);

  // Orbit rings.
  const ringMat = keep(new LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.28 }));
  const rings: LineSegments[] = [];
  for (const [r, tiltX, tiltZ] of [[2.5, 1.15, 0.2], [3.2, 1.35, -0.5], [4.1, 1.5, 0.35]] as const) {
    const pts: number[] = [];
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
      if (i % 4 === 3) continue; // dashed
      pts.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(b) * r, Math.sin(b) * r, 0);
    }
    const g = keep(new BufferGeometry());
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const ring = new LineSegments(g, ringMat);
    ring.rotation.set(tiltX, 0, tiltZ);
    rings.push(ring);
    root.add(ring);
  }

  // Interface panels.
  const panels: { mesh: Mesh; base: Vector3; phase: number; rotY: number }[] = [];
  const addPanel = (tex: Texture, w: number, h: number, pos: [number, number, number], rotY: number, phase: number) => {
    keep(tex);
    const mesh = new Mesh(keep(new PlaneGeometry(w, h)), keep(new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide, depthWrite: false })));
    mesh.position.set(...pos);
    mesh.rotation.y = rotY;
    root.add(mesh);
    panels.push({ mesh, base: new Vector3(...pos), phase, rotY });
  };
  // Kept to the right of the hero text: website above and behind the core, dashboard right, phone in front.
  addPanel(websiteTexture(), 3.3, 2.2, [0.1, 2.4, -2.8], 0.18, 0);
  addPanel(dashboardTexture(), 3.3, 2.25, [3.35, -0.1, -0.4], -0.48, 1.9);
  addPanel(phoneTexture(), 1.0, 1.95, [1.25, -2.15, 1.5], -0.18, 3.6);

  // Network nodes on a shell, linked to the core and to the panels.
  const nodes: Vector3[] = [];
  for (let i = 0; i < 16; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 16), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    nodes.push(new Vector3(Math.cos(theta) * Math.sin(phi), Math.cos(phi) * 0.8, Math.sin(theta) * Math.sin(phi)).multiplyScalar(2.6));
  }
  const segments: [Vector3, Vector3][] = [];
  nodes.forEach((n, i) => {
    segments.push([n, new Vector3()]);
    const near = nodes.map((m, j) => [j, n.distanceTo(m)] as const).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1])[0][0];
    if (near > i) segments.push([n, nodes[near]]);
  });
  panels.forEach((p) => segments.push([nodes.reduce((a, b) => (a.distanceTo(p.base) < b.distanceTo(p.base) ? a : b)), p.base]));
  const linePos = new Float32Array(segments.length * 6);
  segments.forEach(([a, b], i) => linePos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6));
  const linesGeo = keep(new BufferGeometry());
  linesGeo.setAttribute('position', new BufferAttribute(linePos, 3));
  root.add(new LineSegments(linesGeo, keep(new LineBasicMaterial({ color: SOFT, transparent: true, opacity: 0.16 }))));

  const dot = keep(dotTexture());
  const nodeGeo = keep(new BufferGeometry());
  nodeGeo.setAttribute('position', new BufferAttribute(new Float32Array(nodes.flatMap((n) => [n.x, n.y, n.z])), 3));
  root.add(new Points(nodeGeo, keep(new PointsMaterial({ size: 0.16, map: dot, color: SOFT, transparent: true, depthWrite: false, blending: AdditiveBlending }))));

  // Data pulses travelling along the streams.
  const PULSES = 26;
  const pulseState = Array.from({ length: PULSES }, (_, i) => ({ seg: i % segments.length, t: Math.random(), speed: 0.18 + Math.random() * 0.35 }));
  const pulsePos = new Float32Array(PULSES * 3);
  const pulseGeo = keep(new BufferGeometry());
  pulseGeo.setAttribute('position', new BufferAttribute(pulsePos, 3));
  root.add(new Points(pulseGeo, keep(new PointsMaterial({ size: 0.13, map: dot, color: new Color('#c4b5fd'), transparent: true, depthWrite: false, blending: AdditiveBlending }))));

  // Particle field.
  const STARS = 700;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const r = 7 + Math.random() * 9, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    starPos.set([r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.6, r * Math.sin(p) * Math.sin(t) - 4], i * 3);
  }
  const starGeo = keep(new BufferGeometry());
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const stars = new Points(starGeo, keep(new PointsMaterial({ size: 0.05, map: dot, color: new Color('#9fb3ff'), transparent: true, opacity: 0.7, depthWrite: false })));
  scene.add(stars);

  // ─────────── loop ───────────
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;
  let active = true;
  let raf = 0;
  let last = performance.now();
  let elapsed = 0;
  let first = true;

  const resize = () => {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on narrow screens so the panels stay in frame.
    camera.position.z = w / h < 1 ? 15.5 : w / h < 1.4 ? 13.5 : 12;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvasEl);
  resize();

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    root.rotation.y = elapsed * 0.06 + pointer.x * 0.35 + scroll * 0.6;
    root.rotation.x = pointer.y * 0.18 + scroll * 0.25;
    root.position.y = scroll * 1.6;
    core.rotation.y = elapsed * 0.25;
    shell.rotation.set(elapsed * 0.08, -elapsed * 0.12, 0);
    rings.forEach((r, i) => { r.rotation.z += dt * (0.05 + i * 0.03) * (i % 2 ? -1 : 1); });
    coreMat.uniforms.uTime.value = elapsed;
    panels.forEach((p) => {
      p.mesh.position.y = p.base.y + Math.sin(elapsed * 0.7 + p.phase) * 0.12;
      p.mesh.rotation.y = p.rotY - root.rotation.y * 0.35;
    });
    pulseState.forEach((s, i) => {
      s.t += dt * s.speed;
      if (s.t > 1) { s.t = 0; s.seg = Math.floor(Math.random() * segments.length); }
      const [a, b] = segments[s.seg];
      pulsePos.set([a.x + (b.x - a.x) * s.t, a.y + (b.y - a.y) * s.t, a.z + (b.z - a.z) * s.t], i * 3);
    });
    pulseGeo.attributes.position.needsUpdate = true;
    stars.rotation.y = elapsed * 0.01;
    camera.position.x = pointer.x * 0.6;
    camera.position.y = -pointer.y * 0.4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (first) { first = false; onFirstFrame?.(); }
  };

  const start = () => { if (!raf && active && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return {
    setPointer(x, y) { pointer.tx = x; pointer.ty = y; },
    setScroll(p) { scroll = p; },
    setActive(a) { active = a; if (a) start(); else stop(); },
    dispose() {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
