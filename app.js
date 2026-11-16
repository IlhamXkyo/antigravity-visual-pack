import * as THREE from "three";

const doc = document;
const $ = (sel, ctx = doc) => ctx.querySelector(sel);
const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, n) => a + (b - a) * n;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let isMotionPaused = reducedMotion;

// ============================================================================
// 0. TACTILE SYNTHESIZER (SUBTLE WEB AUDIO FEEDBACK)
// ============================================================================
let audioCtx = null;
function playTone(type = "click") {
  if (isMotionPaused) return;
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "chime") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.12);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.04);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now);
      osc.stop(now + 0.045);
    }
  } catch {
    // Ignore before user gesture
  }
}

// ============================================================================
// 1. UNIFIED LENIS + GSAP SCROLLTRIGGER LOOP & NAVIGATION
// ============================================================================
const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger);

let lenis = null;
if (typeof window.Lenis !== "undefined" && !reducedMotion) {
  lenis = new window.Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  if (hasGSAP) {
    lenis.on("scroll", window.ScrollTrigger.update);
    window.gsap.ticker.add((time) => {
      if (!isMotionPaused) lenis.raf(time * 1000);
    });
    window.gsap.ticker.lagSmoothing(0);
  }
}

// Scroll Progress & Active Section Observer
const progressBar = $("#scroll-progress-bar");
window.addEventListener(
  "scroll",
  () => {
    const sy = window.scrollY || 0;
    const max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    if (progressBar) {
      progressBar.style.transform = `scaleX(${clamp(sy / max, 0, 1)})`;
    }
  },
  { passive: true }
);

const sections = $$(".story-section");
const navLinks = $$(".nav-link");
const secObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("data-sec") === id));
      }
    });
  },
  { threshold: 0.25 }
);
sections.forEach((s) => secObserver.observe(s));

// Ambient Spotlight Pointer Tracking
window.addEventListener(
  "pointermove",
  (e) => {
    doc.documentElement.style.setProperty("--mx", `${e.clientX}px`);
    doc.documentElement.style.setProperty("--my", `${e.clientY}px`);

    const eyes = $("#fox-dock-eyes");
    if (eyes && !isMotionPaused) {
      const dx = clamp(((e.clientX / window.innerWidth) - 0.85) * 6, -3.5, 3.5);
      const dy = clamp(((e.clientY / window.innerHeight) - 0.85) * 6, -3.5, 3.5);
      eyes.setAttribute("transform", `translate(${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    }
  },
  { passive: true }
);

// ============================================================================
// 2. THREE.JS r186 REAL-TIME 3D STAGE (ORIGAMI FOX & EXPLODED SPATIAL CORE)
// ============================================================================
const stage3d = $("#webgl-stage");
const fpsReadout = $("#fps-readout");
let pulse3D = () => {};

if (stage3d) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage3d.clientWidth, stage3d.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  stage3d.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, stage3d.clientWidth / stage3d.clientHeight, 0.1, 100);
  camera.position.set(0, 0.35, 5.1);

  scene.add(new THREE.AmbientLight(0xfff8eb, 0.85));
  const keyLight = new THREE.DirectionalLight(0xe2ff54, 2.3);
  keyLight.position.set(3.5, 4.5, 4.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x2dd4bf, 2.0);
  rimLight.position.set(-4.0, 2.0, -3.0);
  scene.add(rimLight);

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.26,
    metalness: 0.38,
    flatShading: true,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xf4f2ed,
    roughness: 0.35,
    metalness: 0.15,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x101219,
    roughness: 0.25,
    metalness: 0.8,
  });
  const limeMat = new THREE.MeshStandardMaterial({
    color: 0xe2ff54,
    emissive: 0x65a30d,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.5,
  });
  const tealMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    metalness: 0.5,
  });
  const allMaterials = [amberMat, boneMat, darkMat, limeMat, tealMat];

  const root = new THREE.Group();
  scene.add(root);

  // Group 1: Origami Fox
  const foxGroup = new THREE.Group();
  root.add(foxGroup);

  const headGeo = new THREE.OctahedronGeometry(1.04, 1);
  headGeo.scale(1.15, 0.92, 0.95);
  foxGroup.add(new THREE.Mesh(headGeo, amberMat));

  const snoutGeo = new THREE.ConeGeometry(0.66, 0.86, 4);
  snoutGeo.rotateX(Math.PI * 0.5);
  const snout = new THREE.Mesh(snoutGeo, boneMat);
  snout.position.set(0, -0.18, 0.75);
  foxGroup.add(snout);

  const nose = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), darkMat);
  nose.position.set(0, -0.1, 1.18);
  foxGroup.add(nose);

  const earGeo = new THREE.ConeGeometry(0.36, 0.95, 4);
  const earL = new THREE.Group();
  earL.position.set(-0.56, 0.65, 0.05);
  earL.rotation.z = 0.28;
  const earLM = new THREE.Mesh(earGeo, amberMat);
  earLM.position.y = 0.38;
  earL.add(earLM);
  foxGroup.add(earL);

  const earR = new THREE.Group();
  earR.position.set(0.56, 0.65, 0.05);
  earR.rotation.z = -0.28;
  const earRM = new THREE.Mesh(earGeo, amberMat);
  earRM.position.y = 0.38;
  earR.add(earRM);
  foxGroup.add(earR);

  const eyeGeo = new THREE.BoxGeometry(0.24, 0.1, 0.1);
  const eyeL = new THREE.Mesh(eyeGeo, limeMat);
  eyeL.position.set(-0.4, 0.12, 0.86);
  eyeL.rotation.z = -0.1;
  foxGroup.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, limeMat);
  eyeR.position.set(0.4, 0.12, 0.86);
  eyeR.rotation.z = 0.1;
  foxGroup.add(eyeR);

  const orbitA = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.02, 12, 72), limeMat);
  orbitA.rotation.x = Math.PI * 0.42;
  const orbitB = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.015, 12, 72), tealMat);
  orbitB.rotation.y = Math.PI * 0.25;
  foxGroup.add(orbitA, orbitB);

  // Group 2: Exploded Spatial Core
  const coreGroup = new THREE.Group();
  coreGroup.visible = false;
  root.add(coreGroup);

  const centerCrystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 0), limeMat);
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 16, 64), amberMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.03, 16, 64), tealMat);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.025, 16, 64), boneMat);
  coreGroup.add(centerCrystal, ring1, ring2, ring3);

  const satellites = [];
  for (let i = 0; i < 6; i++) {
    const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), i % 2 === 0 ? amberMat : tealMat);
    const angle = (i / 6) * Math.PI * 2;
    sat.userData = { angle };
    sat.position.set(Math.cos(angle) * 1.45, Math.sin(angle) * 1.45, 0);
    coreGroup.add(sat);
    satellites.push(sat);
  }

  let isDragging = false;
  let px = 0, py = 0;
  let targetY = 0.25, targetX = 0.08;
  let jumpVel = 0, jumpY = 0, spinBoost = 0;

  stage3d.addEventListener("pointerdown", (e) => {
    isDragging = true;
    px = e.clientX;
    py = e.clientY;
  });
  window.addEventListener("pointermove", (e) => {
    if (isDragging) {
      targetY += (e.clientX - px) * 0.01;
      targetX = clamp(targetX + (e.clientY - py) * 0.008, -0.6, 0.6);
      px = e.clientX;
      py = e.clientY;
    } else if (!isMotionPaused) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetY = nx * 0.42;
      targetX = ny * 0.22;
    }
  });
  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  pulse3D = () => {
    playTone("chime");
    jumpVel = 0.14;
    spinBoost = 0.24;
  };

  $$("[data-3d]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playTone("click");
      $$("[data-3d]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.getAttribute("data-3d");
      if (mode === "fox") {
        foxGroup.visible = true;
        coreGroup.visible = false;
        allMaterials.forEach((m) => (m.wireframe = false));
      } else if (mode === "core") {
        foxGroup.visible = false;
        coreGroup.visible = true;
        allMaterials.forEach((m) => (m.wireframe = false));
      } else {
        allMaterials.forEach((m) => (m.wireframe = true));
      }
    });
  });

  $("#btn-3d-pulse")?.addEventListener("click", () => pulse3D());

  const timer = new THREE.Timer();
  timer.connect(doc);
  let frames = 0, acc = 0;

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const el = timer.getElapsed();

    frames++;
    acc += dt;
    if (acc >= 0.5) {
      if (fpsReadout) {
        fpsReadout.textContent = `${isMotionPaused ? "PAUSED" : Math.min(120, Math.round(frames / acc)) + " FPS"} · THREE.Timer`;
      }
      frames = 0;
      acc = 0;
    }

    if (!isMotionPaused) {
      if (jumpY > 0 || jumpVel !== 0) {
        jumpY += jumpVel;
        jumpVel -= 0.0085;
        if (jumpY <= 0) {
          jumpY = 0;
          jumpVel = 0;
        }
      }
      spinBoost *= 0.91;

      root.position.y = Math.sin(el * 2.2) * 0.1 + jumpY;
      root.rotation.y += (targetY - root.rotation.y) * 0.08 + spinBoost;
      root.rotation.x += (targetX - root.rotation.x) * 0.08;

      earL.rotation.z = 0.28 + Math.sin(el * 3.4) * 0.08;
      earR.rotation.z = -0.28 - Math.sin(el * 3.4 + 0.5) * 0.08;
      orbitA.rotation.z = el * 0.5;
      orbitB.rotation.x = el * 0.38;

      const blink = el % 4.0 > 3.86 ? 0.15 : 1.0;
      eyeL.scale.y = blink;
      eyeR.scale.y = blink;

      centerCrystal.rotation.y = el * 0.85;
      centerCrystal.rotation.x = el * 0.5;
      ring1.rotation.x = el * 1.1;
      ring2.rotation.y = el * 0.8;
      ring3.rotation.z = el * 0.6;
      satellites.forEach((sat, idx) => {
        const r = 1.4 + Math.sin(el * 2.5 + idx) * 0.22;
        const a = sat.userData.angle + el * 0.45;
        sat.position.set(Math.cos(a) * r, Math.sin(a) * r, Math.sin(el * 2 + idx) * 0.3);
        sat.rotation.y = el * 1.5;
      });
    }

    renderer.render(scene, camera);
  });

  window.addEventListener(
    "resize",
    () => {
      camera.aspect = stage3d.clientWidth / stage3d.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage3d.clientWidth, stage3d.clientHeight);
    },
    { passive: true }
  );
}

// ============================================================================
// 3. BAB 02: 3-TIER SETUP KERJA AWAL SWITCHER
// ============================================================================
const tierContent = {
  tier1: {
    title: "Lapis 01 // ~/.gemini/GEMINI.md (Global Workspace Rules)",
    code: `<span class="hl-muted"># 1. Disiplin Rekayasa Kode (Karpathy Guardrails)</span>
- <span class="hl-lime">Think Before Coding</span>: Periksa package.json / pyproject.toml nyata sebelum menulis import.
- <span class="hl-lime">Simplicity First</span>: Tulis kode seminimal mungkin yang menyelesaikan masalah nyata, zero // TODO.
- <span class="hl-lime">Surgical Changes</span>: Sentuh hanya file yang berkaitan dengan tugas, bersihkan import yatim.

<span class="hl-muted"># 2. Progressive Disclosure (On-Demand Skill Routing)</span>
Jangan menumpuk seluruh instruksi di awal sesi. Muat SKILL.md hanya saat dipanggil:
  • <span class="hl-teal">/architect</span>  -&gt; pro-architect (4-Layer Headless Engine vs UI)
  • <span class="hl-teal">/ui-modern</span>  -&gt; ui-modern + design-md (Concentric Math &amp; 4-Layer Surface)
  • <span class="hl-teal">/motionilo</span>  -&gt; motionilo + scene_qa.py (Programmatic Video &amp; Safe-Area Gate)
  • <span class="hl-teal">web-motion</span>  -&gt; GSAP 3.13 + Lenis Single Ticker Loop
  • <span class="hl-teal">threejs-dev</span> -&gt; Three.js r186 THREE.Timer &amp; WebGPU Shaders
  • <span class="hl-teal">/rea</span>        -&gt; Clean-Room Forensic UI &amp; Motion Reconstruction`,
  },
  tier2: {
    title: "Lapis 02 // Arsitektur 4-Layer (/architect) & Modular SKILL.md",
    code: `<span class="hl-muted"># Struktur 4-Layer Headless (pro-architect)</span>
src/
├── <span class="hl-lime">core/</span>        # LAYER 1: Headless Business Engine (TypeScript murni, zero UI)
│   ├── engine/  # State machine, kalkulasi matematika, model komputasi
│   └── store/   # Transactional store / signals 60fps
├── <span class="hl-teal">services/</span>    # LAYER 2: I/O &amp; External Adapters (API, Storage)
├── <span class="hl-amber">features/</span>    # LAYER 3: Colocated Feature Slices (Components + Hooks)
└── <span class="hl-lime">shared/</span>      # LAYER 4: Design System Primitives &amp; Tokens

<span class="hl-muted"># Kontrak Mode Eksekusi di Setiap SKILL.md:</span>
mode: <span class="hl-lime">fast</span> | <span class="hl-teal">standard</span> | <span class="hl-amber">deep</span>
- fast     : &le; 1 komponen, gunakan starter mandiri di SKILL.md (0 file referensi dibuka)
- standard : 1 halaman / video &le; 30s, muat 1-2 file referensi terkait
- deep     : multi-scene / multi-section, wajib jalankan gate scene_qa.py &amp; verify.ps1`,
  },
  tier3: {
    title: "Lapis 03 // project/DESIGN.md (Visual System Specification)",
    code: `<span class="hl-muted">---</span>
<span class="hl-lime">colors:</span>
  canvas: "#08090d"
  surface-1: "#101219"
  surface-2: "#161923"
  hairline: "rgba(244, 242, 237, 0.08)"
  primary: "#e2ff54"
  secondary: "#2dd4bf"
<span class="hl-lime">geometry:</span>
  concentric-rule: "R_inner = max(0, R_outer - Padding)"
  tactile-press: "50ms cubic-bezier(0.16, 1, 0.3, 1) scale(0.97)"
<span class="hl-muted">---</span>
<span class="hl-teal"># Aturan Disiplin Visual:</span>
1. Dilarang mengarang warna hex di luar variabel CSS root.
2. Semua angka dinamis &amp; metrik wajib memakai font-variant-numeric: tabular-nums.
3. Tersedia 7 preset siap pakai: Linear, Vercel, Apple, Raycast, Claude, PostHog, CAD.`,
  },
};

$$("[data-tier]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const key = btn.getAttribute("data-tier");
    const item = tierContent[key];
    if (!item) return;
    $$("[data-tier]").forEach((b) => b.classList.toggle("active", b === btn));
    $("#tier-window-title").textContent = item.title;
    $("#tier-window-code").innerHTML = item.code;
  });
});

// ============================================================================
// 4. BAB 03: LIVE PROCEDURAL MOTION GRAPHICS PLAYER & INTERACTIVE LABS
// ============================================================================
const mgViewport = $("#mg-viewport");
const mgSafeGuide = $("#mg-safe-guide");
const mgRatioTag = $("#mg-ratio-tag");
const mgBgOrb = $("#mg-bg-orb");
const mgMidCard = $("#mg-mid-card");
const mgBeatLabel = $("#mg-beat-label");
const mgHeadline = $("#mg-headline");
const mgSubtitle = $("#mg-subtitle");
const mgScrubber = $("#mg-scrubber");
const mgFrameReadout = $("#mg-frame-readout");
const mgPlayBtn = $("#btn-mg-play");
const mgBars = $$("#mg-bars .mograph-bar");

const ratioConfigs = {
  "9:16": { w: "175px", h: "245px", inset: "12% 10% 20% 10%", label: "9:16" },
  "16:9": { w: "285px", h: "165px", inset: "8% 6% 16% 6%", label: "16:9" },
  "1:1":  { w: "215px", h: "215px", inset: "8% 8% 16% 8%", label: "1:1" },
};

$$("[data-ratio]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const r = btn.getAttribute("data-ratio");
    const cfg = ratioConfigs[r];
    if (!cfg) return;
    $$("[data-ratio]").forEach((b) => b.classList.toggle("btn--primary", b === btn));
    if (mgViewport) {
      mgViewport.style.width = cfg.w;
      mgViewport.style.height = cfg.h;
    }
    if (mgSafeGuide) mgSafeGuide.style.inset = cfg.inset;
    if (mgRatioTag) mgRatioTag.textContent = cfg.label;
  });
});

let mgPlaying = true;
let mgFrame = 0;

function renderMographFrame(f) {
  const norm = f / 300;
  if (mgFrameReadout) mgFrameReadout.textContent = `F: ${String(f).padStart(3, "0")} / 300`;
  if (mgScrubber && document.activeElement !== mgScrubber) mgScrubber.value = String(f);

  // 3-Beat Scene Progression
  if (f < 100) {
    if (mgBeatLabel) mgBeatLabel.textContent = "SCENE 01 // HOOK (0.0s - 3.3s)";
    if (mgHeadline) mgHeadline.textContent = "Ritme Visual Terukur";
    if (mgSubtitle) mgSubtitle.textContent = "Safe-Area terkunci otomatis";
  } else if (f < 200) {
    if (mgBeatLabel) mgBeatLabel.textContent = "SCENE 02 // DATA (3.3s - 6.6s)";
    if (mgHeadline) mgHeadline.textContent = "3-Plane Depth Parallax";
    if (mgSubtitle) mgSubtitle.textContent = "Kontras >= 4.5:1 & Spring Damping 20";
  } else {
    if (mgBeatLabel) mgBeatLabel.textContent = "SCENE 03 // CTA (6.6s - 10.0s)";
    if (mgHeadline) mgHeadline.textContent = "Lolos Gate scene_qa.py";
    if (mgSubtitle) mgSubtitle.textContent = "Siap Render MP4 60fps di Remotion v4";
  }

  const wave = Math.sin(norm * Math.PI * 4);
  if (mgBgOrb) {
    mgBgOrb.style.transform = `translate(${(wave * 18).toFixed(1)}px, ${(Math.cos(norm * Math.PI * 2) * 12).toFixed(1)}px)`;
  }
  if (mgMidCard) {
    mgMidCard.style.transform = `translateY(${(Math.sin(norm * Math.PI * 2) * -4).toFixed(1)}px)`;
  }
  mgBars.forEach((bar, i) => {
    const h = 28 + Math.abs(Math.sin(norm * Math.PI * 3 + i * 0.7)) * 68;
    bar.style.height = `${h.toFixed(0)}%`;
  });
}

mgPlayBtn?.addEventListener("click", () => {
  playTone("click");
  mgPlaying = !mgPlaying;
  mgPlayBtn.textContent = mgPlaying ? "⏸ Pause" : "▶ Play";
});

mgScrubber?.addEventListener("input", () => {
  mgFrame = parseInt(mgScrubber.value, 10) || 0;
  renderMographFrame(mgFrame);
});

setInterval(() => {
  if (!isMotionPaused && mgPlaying) {
    mgFrame = (mgFrame + 1) % 301;
    renderMographFrame(mgFrame);
  }
}, 40);

// Concentric Radius Calculator
const inpROut = $("#inp-r-out");
const inpPad = $("#inp-pad");
function updateConcentric() {
  const ro = parseInt(inpROut.value, 10);
  const pd = parseInt(inpPad.value, 10);
  const ri = Math.max(0, ro - pd);
  $("#val-r-out").textContent = `${ro}px`;
  $("#val-pad").textContent = `${pd}px`;
  $("#val-r-in").textContent = `${ri}px`;
  $("#calc-formula-badge").textContent = `${ro}px - ${pd}px = ${ri}px`;
  const outer = $("#demo-outer");
  const inner = $("#demo-inner");
  if (outer) {
    outer.style.borderRadius = `${ro}px`;
    outer.style.padding = `${pd}px`;
  }
  if (inner) inner.style.borderRadius = `${ri}px`;
}
inpROut?.addEventListener("input", updateConcentric);
inpPad?.addEventListener("input", updateConcentric);

// Easing Race Lab
$("#btn-run-easing")?.addEventListener("click", () => {
  playTone("chime");
  const pLin = $("#puck-linear");
  const pExp = $("#puck-expo");
  const pSpr = $("#puck-spring");
  if (!pLin || !pExp || !pSpr) return;
  const dist = pLin.parentElement.clientWidth - 46;

  pLin.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 920,
    easing: "linear",
    fill: "forwards",
  });
  pExp.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 920,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "forwards",
  });
  pSpr.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${dist * 1.06}px)`, offset: 0.7 },
      { transform: `translateX(${dist * 0.985}px)`, offset: 0.86 },
      { transform: `translateX(${dist}px)`, offset: 1 },
    ],
    { duration: 920, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );
});

// REA Forensic X-Ray Slider
const inpXray = $("#inp-xray");
const valXray = $("#val-xray");
const xrayCodeLayer = $("#xray-code-layer");
inpXray?.addEventListener("input", () => {
  const v = parseInt(inpXray.value, 10);
  if (valXray) valXray.textContent = `${v}%`;
  if (xrayCodeLayer) xrayCodeLayer.style.clipPath = `inset(0 0 0 ${100 - v}%)`;
});

// ============================================================================
// 5. BAB 05: DRIVE PACKAGE EXPLORER & COPY AI COMMAND
// ============================================================================
const pkgData = {
  p00: {
    title: "drive-package // 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md",
    body: `Perintah 1-Baris untuk Dikirim ke AI:
"Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu pasangkan setup kerjaan awal serta seluruh skill visual dan web-nya ke lingkunganku."

Struktur Paket Lengkap:
├── 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md
├── 01-Setup-Motion-Graphics-Motionilo/
├── 02-Setup-Web-Motion-Choreography/
├── 03-Setup-UI-Modern-Design-System/
├── 04-Setup-3D-WebGL-ThreeJS/
├── 05-Setup-Reverse-Engineering-REA/
└── 06-Bonus-Setup-Utama-Arsitektur-Global/`,
  },
  p06: {
    title: "drive-package // 06-Bonus-Setup-Utama-Arsitektur-Global",
    body: `06-Bonus-Setup-Utama-Arsitektur-Global/
├── SETUP-DAN-PANDUAN-AI.md
├── GEMINI-GLOBAL-RULES.md         (Aturan global &amp; progressive skill routing)
├── DAFTAR-KURASI-PLUGIN-PENDUKUNG.md
├── plugins.manifest.json          (Manifest hash SHA-256 seluruh file)
├── install-all.ps1                (Installer otomatis 1-klik)
├── verify.ps1                     (Verifikasi integritas SHA-256)
├── uninstall.ps1                  (Pembersih terukur)
├── pro-architect/                 (Skill /architect 4-layer headless)
└── dialectic-architect/           (Skill pengujian arsitektur multi-agen)`,
  },
  p01: {
    title: "drive-package // 01-Setup-Motion-Graphics-Motionilo",
    body: `01-Setup-Motion-Graphics-Motionilo/
├── SETUP-DAN-PANDUAN-AI.md
├── motionilo/
│   ├── plugin.json
│   ├── scripts/
│   │   ├── scene_qa.py            (Validator 47 aturan safe-rect, durasi, kontras, CPS)
│   │   └── storyboard.py          (Generator pratinjau zona aman PNG)
│   └── skills/motionilo/
│       ├── SKILL.md               (Mode fast, standard, deep)
│       ├── types/                 (01-story, 02-kinetic, 03-brand)
│       ├── shared/                (01-safearea s.d. 07-qa-checklist)
│       └── templates/             (Scene &amp; SRT subtitle templates)
└── remotion-best-practices/       (Router teknis Remotion v4)`,
  },
  p02: {
    title: "drive-package // 02-Setup-Web-Motion-Choreography",
    body: `02-Setup-Web-Motion-Choreography/
├── SETUP-DAN-PANDUAN-AI.md
└── motion-stack/
    ├── plugin.json
    └── skills/web-motion/
        ├── SKILL.md               (Starter GSAP 3.13 + Lenis Single Ticker Loop)
        ├── references/            (ScrollTrigger, SplitText, Flip, 60fps, OKLCH)
        ├── examples/              (hero-timeline.js, standalone-template.html)
        └── scripts/media_verify.py (Inspeksi FPS &amp; resolusi video via FFprobe)`,
  },
  p03: {
    title: "drive-package // 03-Setup-UI-Modern-Design-System",
    body: `03-Setup-UI-Modern-Design-System/
├── SETUP-DAN-PANDUAN-AI.md
├── ui-modern/
│   ├── plugin.json
│   ├── primitives-kit/            (7 Komponen Primitif + Playwright E2E Runner)
│   └── skills/ui-modern/
│       ├── SKILL.md               (Token CSS mandiri, Concentric Math, 50ms Physics)
│       └── references/            (spatial-math, motion-physics, color-elevation)
└── design-md/
    ├── SKILL.md
    └── references/presets/        (linear, vercel, apple, raycast, claude, posthog, cad)`,
  },
  p04: {
    title: "drive-package // 04-Setup-3D-WebGL-ThreeJS",
    body: `04-Setup-3D-WebGL-ThreeJS/
├── SETUP-DAN-PANDUAN-AI.md
└── threejs-dev/
    ├── plugin.json
    └── skills/threejs-dev/
        ├── SKILL.md               (Three.js r186 THREE.Timer, HDRLoader, WebGPU)
        └── references/            (13 modul: shaders, lighting, r3f, asset-pipeline)`,
  },
  p05: {
    title: "drive-package // 05-Setup-Reverse-Engineering-REA",
    body: `05-Setup-Reverse-Engineering-REA/
├── SETUP-DAN-PANDUAN-AI.md
└── rea/
    ├── plugin.json
    ├── scripts/extract_animation.py
    └── skills/rea/
        ├── SKILL.md               (Ekstraksi 1-putaran &amp; 5 fase forensik clean-room)
        └── references/            (web-animation-extraction, clean-room-synthesis)`,
  },
};

$$("[data-pkg]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const key = btn.getAttribute("data-pkg");
    const info = pkgData[key];
    if (!info) return;
    $$("[data-pkg]").forEach((b) => b.classList.toggle("active", b === btn));
    $("#pkg-window-title").textContent = info.title;
    $("#pkg-window-body").innerHTML = info.body;
  });
});

$("#btn-copy-ai-cmd")?.addEventListener("click", async (e) => {
  playTone("chime");
  const cmd =
    "Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu pasangkan setup kerjaan awal serta seluruh skill visual dan web-nya ke lingkunganku.";
  try {
    await navigator.clipboard.writeText(cmd);
    const btn = e.currentTarget;
    const orig = btn.textContent;
    btn.textContent = "✓ Perintah Setup Tersalin!";
    setTimeout(() => (btn.textContent = orig), 1800);
  } catch {
    // Ignore clipboard restriction
  }
});

// ============================================================================
// 6. COHESIVE ORIGAMI FOX PLAYGROUND (SURPRISE COMPANION)
// ============================================================================
const foxCanvas = $("#fox-playground-canvas");
const foxBubble = $("#fox-bubble");
const foxSpeech = $("#fox-speech");

let summonFoxSurprise = () => {};

if (foxCanvas) {
  const ctx = foxCanvas.getContext("2d");
  let W = window.innerWidth;
  let H = window.innerHeight;
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    foxCanvas.width = W;
    foxCanvas.height = H;
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const orbs = [];
  const sparks = [];
  const fox = {
    x: -80,
    y: H - 24,
    vx: 0,
    vy: 0,
    dir: 1,
    active: false,
    timer: 0,
  };

  const tips = [
    "Kejutan! 🦊 Setup 3-Tier di Bab 02 menjaga agar AI kamu tidak mengarang dependensi atau memboroskan token.",
    "Tahukah kamu? Semua simulasi di Bab 03 dirender 100% secara live dengan kode, bukan gambar tempelan!",
    "Double-klik di titik mana saja di layar untuk melempar Orb Energi ke arahku!",
    "Skill ini otomatis menyesuaikan mode fast, standard, atau deep baik di Gemini Hydrogen maupun Argon.",
  ];
  let tipIdx = 0;

  summonFoxSurprise = (tx, ty, customText) => {
    playTone("chime");
    pulse3D();

    if (foxBubble && foxSpeech) {
      foxBubble.classList.remove("is-hidden");
      foxSpeech.textContent = customText || tips[tipIdx % tips.length];
      tipIdx++;
    }

    if (isMotionPaused) return;

    orbs.push({
      x: clamp(tx, 60, W - 60),
      y: clamp(ty - 60, 60, H - 120),
      vy: -4,
      targetY: clamp(ty, 140, H - 34),
    });

    if (!fox.active) {
      fox.active = true;
      fox.x = -40;
      fox.y = H - 24;
    }
    fox.timer = 340;
  };

  function drawGeometricFox(ctx, f, t) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.dir, 1);
    const hop = Math.abs(Math.sin(t * 14)) * 5;
    ctx.translate(0, -hop);

    // Tail
    ctx.save();
    ctx.translate(-16, -12);
    ctx.rotate(Math.sin(t * 15) * 0.3);
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -12);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 18, 7);
    ctx.fill();

    // Head
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(6, -34);
    ctx.lineTo(26, -24);
    ctx.lineTo(12, -12);
    ctx.closePath();
    ctx.fill();

    // Ears
    ctx.fillStyle = "#e2ff54";
    ctx.beginPath();
    ctx.moveTo(8, -32);
    ctx.lineTo(13, -45);
    ctx.lineTo(19, -31);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  let t = 0;
  const loop = () => {
    ctx.clearRect(0, 0, W, H);
    if (!isMotionPaused) {
      t += 0.016;

      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i];
        o.vy += 0.25;
        o.y += o.vy;
        if (o.y > o.targetY) {
          o.y = o.targetY;
          o.vy = -Math.abs(o.vy) * 0.45;
        }
        ctx.fillStyle = "#e2ff54";
        ctx.beginPath();
        ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (fox.active) {
        fox.timer--;
        const target = orbs[0];
        if (target) {
          const dx = target.x - fox.x;
          fox.dir = dx >= 0 ? 1 : -1;
          fox.vx = lerp(fox.vx, Math.sign(dx) * 7.2, 0.16);
          fox.x += fox.vx;

          if (Math.abs(dx) < 60 && fox.y >= H - 28) {
            fox.vy = -13;
          }
          fox.vy += 0.55;
          fox.y = Math.min(H - 24, fox.y + fox.vy);

          if (Math.hypot(target.x - fox.x, target.y - (fox.y - 18)) < 42) {
            playTone("chime");
            for (let s = 0; s < 12; s++) {
              const a = (Math.PI * 2 * s) / 12;
              sparks.push({
                x: target.x,
                y: target.y,
                vx: Math.cos(a) * 3.5,
                vy: Math.sin(a) * 3.5 - 1.5,
                life: 1.0,
              });
            }
            orbs.shift();
          }
        } else if (fox.timer > 0) {
          const patrolX = W * 0.5 + Math.sin(t * 1.6) * 140;
          const dx = patrolX - fox.x;
          fox.dir = dx >= 0 ? 1 : -1;
          fox.x += clamp(dx * 0.05, -4, 4);
          fox.vy += 0.55;
          fox.y = Math.min(H - 24, fox.y + fox.vy);
        } else {
          fox.dir = -1;
          fox.x -= 6;
          fox.y = H - 24;
          if (fox.x < -70) fox.active = false;
        }
        drawGeometricFox(ctx, fox, t);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.035;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = "#e2ff54";
        ctx.globalAlpha = sp.life;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

$("#btn-nav-fox")?.addEventListener("click", () => {
  summonFoxSurprise(window.innerWidth * 0.5, window.innerHeight - 50);
});
$("#btn-hero-orb")?.addEventListener("click", () => {
  summonFoxSurprise(window.innerWidth * 0.55, window.innerHeight - 60);
});
$("#btn-fox-dock")?.addEventListener("click", () => {
  summonFoxSurprise(window.innerWidth * 0.45, window.innerHeight - 50);
});
$("#btn-fox-close")?.addEventListener("click", () => {
  foxBubble?.classList.add("is-hidden");
});
window.addEventListener("dblclick", (e) => {
  summonFoxSurprise(e.clientX, Math.max(150, e.clientY));
});

// Auto-trigger once when scrolling into Bab 02
let scrollSurpriseDone = false;
window.addEventListener(
  "scroll",
  () => {
    if (!scrollSurpriseDone && window.scrollY > 480) {
      scrollSurpriseDone = true;
      summonFoxSurprise(
        window.innerWidth * 0.5,
        window.innerHeight - 45,
        "Hup! 🦊 Kamu masuk ke Bab Setup Kerjaan Awal (3-Tier Architecture). Klik tiap lapis untuk melihat isinya!"
      );
    }
  },
  { passive: true }
);

// Theme & Motion Pause
$("#btn-theme-toggle")?.addEventListener("click", (e) => {
  playTone("click");
  const html = doc.documentElement;
  const next = html.getAttribute("data-theme") === "daylight" ? "dark" : "daylight";
  html.setAttribute("data-theme", next);
  e.currentTarget.textContent = next === "daylight" ? "🌙 Mode Gelap" : "☀ Mode Terang";
});

$("#btn-pause-motion")?.addEventListener("click", (e) => {
  isMotionPaused = !isMotionPaused;
  e.currentTarget.textContent = isMotionPaused ? "Play Motion" : "Pause Motion";
});
