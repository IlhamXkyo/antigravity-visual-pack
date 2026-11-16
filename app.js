import * as THREE from "three";

const doc = document;
const $ = (sel, ctx = doc) => ctx.querySelector(sel);
const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, n) => a + (b - a) * n;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let isMotionPaused = reducedMotion;

// ============================================================================
// 0. TACTILE SYNTHESIZER (WEB AUDIO API)
// ============================================================================
let audioCtx = null;
function playTone(kind = "tick") {
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

    if (kind === "chime") {
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
    // Ignore before user interaction
  }
}

// ============================================================================
// 1. UNIFIED LENIS + GSAP SCROLLTRIGGER LOOP
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

window.addEventListener(
  "pointermove",
  (e) => {
    doc.documentElement.style.setProperty("--mx", `${e.clientX}px`);
    doc.documentElement.style.setProperty("--my", `${e.clientY}px`);

    const eyes = $("#fox-eyes");
    if (eyes && !isMotionPaused) {
      const dx = clamp(((e.clientX / window.innerWidth) - 0.85) * 6, -3.5, 3.5);
      const dy = clamp(((e.clientY / window.innerHeight) - 0.85) * 6, -3.5, 3.5);
      eyes.setAttribute("transform", `translate(${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    }
  },
  { passive: true }
);

// ============================================================================
// 2. STICKY STAGE THREE.JS r186 ENGINE (MORPHS PER STORYSCROLL STEP!)
// ============================================================================
const webglWrap = $("#sticky-webgl-wrap");
const webglStateTag = $("#webgl-state-tag");

let setStage3DStep = () => {};
let setExplodeFactor = () => {};
let trigger3DJump = () => {};

if (webglWrap) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(webglWrap.clientWidth, webglWrap.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  webglWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, webglWrap.clientWidth / webglWrap.clientHeight, 0.1, 100);
  camera.position.set(0, 0.3, 4.9);

  scene.add(new THREE.AmbientLight(0xfff8eb, 0.85));
  const keyLight = new THREE.DirectionalLight(0xe2ff54, 2.4);
  keyLight.position.set(3.5, 4.5, 4.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x2dd4bf, 2.0);
  rimLight.position.set(-4.0, 2.0, -3.0);
  scene.add(rimLight);

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
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
    emissiveIntensity: 0.78,
    roughness: 0.2,
    metalness: 0.5,
  });
  const tealMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0d9488,
    emissiveIntensity: 0.72,
    roughness: 0.2,
    metalness: 0.5,
  });
  const allMats = [amberMat, boneMat, darkMat, limeMat, tealMat];

  const root = new THREE.Group();
  scene.add(root);

  // Origami Fox Head & Articulated Parts (Supports Exploded View!)
  const headGeo = new THREE.OctahedronGeometry(0.95, 1);
  headGeo.scale(1.15, 0.92, 0.95);
  const headMesh = new THREE.Mesh(headGeo, amberMat);
  root.add(headMesh);

  const snoutGeo = new THREE.ConeGeometry(0.62, 0.82, 4);
  snoutGeo.rotateX(Math.PI * 0.5);
  const snoutMesh = new THREE.Mesh(snoutGeo, boneMat);
  snoutMesh.position.set(0, -0.16, 0.7);
  root.add(snoutMesh);

  const noseMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), darkMat);
  noseMesh.position.set(0, -0.09, 1.1);
  root.add(noseMesh);

  const earGeo = new THREE.ConeGeometry(0.34, 0.88, 4);
  const earL = new THREE.Group();
  earL.position.set(-0.52, 0.6, 0.05);
  earL.rotation.z = 0.28;
  const earLM = new THREE.Mesh(earGeo, amberMat);
  earLM.position.y = 0.35;
  earL.add(earLM);
  root.add(earL);

  const earR = new THREE.Group();
  earR.position.set(0.52, 0.6, 0.05);
  earR.rotation.z = -0.28;
  const earRM = new THREE.Mesh(earGeo, amberMat);
  earRM.position.y = 0.35;
  earR.add(earRM);
  root.add(earR);

  const eyeGeo = new THREE.BoxGeometry(0.22, 0.09, 0.09);
  const eyeL = new THREE.Mesh(eyeGeo, limeMat);
  eyeL.position.set(-0.38, 0.11, 0.8);
  eyeL.rotation.z = -0.1;
  root.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, limeMat);
  eyeR.position.set(0.38, 0.11, 0.8);
  eyeR.rotation.z = 0.1;
  root.add(eyeR);

  // Concentric Gyro Rings & Orbital Satellites around the Fox
  const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.022, 14, 72), limeMat);
  ringOuter.rotation.x = Math.PI * 0.42;
  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.018, 14, 72), tealMat);
  ringInner.rotation.y = Math.PI * 0.25;
  root.add(ringOuter, ringInner);

  const satellites = [];
  for (let i = 0; i < 6; i++) {
    const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), i % 2 === 0 ? limeMat : tealMat);
    const angle = (i / 6) * Math.PI * 2;
    sat.userData = { angle };
    root.add(sat);
    satellites.push(sat);
  }

  // Dynamic target state controlled by active Storyscroll chapter (0..5)
  let targetCamZ = 4.9;
  let targetRotY = 0.25;
  let targetRotX = 0.08;
  let explodeAmount = 0.0;
  let targetExplode = 0.0;
  let jumpVel = 0;
  let jumpY = 0;
  let spinBoost = 0;
  let isWireframe = false;

  const stepConfigs = [
    { tag: "BAB 01 // 3-TIER SETUP & GRILL-ME GATE", rotY: 0.25, rotX: 0.08, camZ: 4.8, exp: 0.0 },
    { tag: "BAB 02 // CONCENTRIC GEOMETRY & 4-LAYER ELEVATION", rotY: -0.45, rotX: 0.22, camZ: 4.5, exp: 0.25 },
    { tag: "BAB 03 // GSAP 3.13 + LENIS SPRING PHYSICS", rotY: 0.65, rotX: -0.12, camZ: 4.6, exp: 0.1 },
    { tag: "BAB 04 // MOTIONILO 3-PLANE PARALLAX ENGINE", rotY: -0.2, rotX: 0.3, camZ: 4.7, exp: 0.35 },
    { tag: "BAB 05 // THREE.JS r186 EXPLODED SPATIAL VIEW", rotY: 0.4, rotX: 0.15, camZ: 5.1, exp: 0.65 },
    { tag: "BAB 06 // REA CLEAN-ROOM FORENSIC X-RAY", rotY: -0.55, rotX: 0.05, camZ: 4.6, exp: 0.45 },
  ];

  setStage3DStep = (stepIdx) => {
    const cfg = stepConfigs[stepIdx] || stepConfigs[0];
    targetRotY = cfg.rotY;
    targetRotX = cfg.rotX;
    targetCamZ = cfg.camZ;
    targetExplode = cfg.exp;
    spinBoost = 0.12;
    if (webglStateTag) webglStateTag.textContent = cfg.tag;
  };

  setExplodeFactor = (norm) => {
    targetExplode = clamp(norm, 0, 1);
  };

  trigger3DJump = () => {
    playTone("chime");
    jumpVel = 0.14;
    spinBoost = 0.25;
  };

  $("#btn-stage-wire")?.addEventListener("click", (e) => {
    playTone("click");
    isWireframe = !isWireframe;
    allMats.forEach((m) => (m.wireframe = isWireframe));
    e.currentTarget.classList.toggle("btn--primary", isWireframe);
  });

  $("#btn-stage-jump")?.addEventListener("click", () => trigger3DJump());

  let dragging = false;
  let prevX = 0, prevY = 0;
  webglWrap.addEventListener("pointerdown", (e) => {
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    targetRotY += (e.clientX - prevX) * 0.011;
    targetRotX = clamp(targetRotX + (e.clientY - prevY) * 0.008, -0.65, 0.65);
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });

  const timer = new THREE.Timer();
  timer.connect(doc);

  renderer.setAnimationLoop(() => {
    timer.update();
    const el = timer.getElapsed();

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
      explodeAmount = lerp(explodeAmount, targetExplode, 0.08);
      camera.position.z = lerp(camera.position.z, targetCamZ, 0.06);

      root.position.y = Math.sin(el * 2.2) * 0.08 + jumpY;
      root.rotation.y += (targetRotY - root.rotation.y) * 0.07 + spinBoost;
      root.rotation.x += (targetRotX - root.rotation.x) * 0.07;

      // Exploded view offsets
      snoutMesh.position.z = 0.7 + explodeAmount * 0.55;
      noseMesh.position.z = 1.1 + explodeAmount * 0.85;
      earL.position.set(-0.52 - explodeAmount * 0.45, 0.6 + explodeAmount * 0.45, 0.05);
      earR.position.set(0.52 + explodeAmount * 0.45, 0.6 + explodeAmount * 0.45, 0.05);
      ringOuter.scale.setScalar(1 + explodeAmount * 0.25);
      ringInner.scale.setScalar(1 + explodeAmount * 0.15);

      earL.rotation.z = 0.28 + Math.sin(el * 3.4) * 0.08;
      earR.rotation.z = -0.28 - Math.sin(el * 3.4 + 0.5) * 0.08;
      ringOuter.rotation.z = el * 0.52;
      ringInner.rotation.x = el * 0.4;

      const blink = el % 4.0 > 3.86 ? 0.14 : 1.0;
      eyeL.scale.y = blink;
      eyeR.scale.y = blink;

      satellites.forEach((sat, idx) => {
        const rad = 1.38 + explodeAmount * 0.65 + Math.sin(el * 2.2 + idx) * 0.12;
        const a = sat.userData.angle + el * 0.5;
        sat.position.set(Math.cos(a) * rad, Math.sin(a) * rad, Math.sin(el * 2 + idx) * 0.25);
        sat.rotation.y = el * 1.4;
      });
    }

    renderer.render(scene, camera);
  });

  window.addEventListener(
    "resize",
    () => {
      camera.aspect = webglWrap.clientWidth / webglWrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(webglWrap.clientWidth, webglWrap.clientHeight);
    },
    { passive: true }
  );
}

// ============================================================================
// 3. STORYSCROLL STEP SYNCHRONIZATION (SCROLL -> STICKY STAGE MORPH)
// ============================================================================
const storySteps = $$(".story-step");
const deckPanes = $$(".deck-pane");
const stageDots = $$("[data-goto-step]");
const stageActiveLabel = $("#stage-active-label");

const stepTitles = [
  "● STAGE AKTIF: BAB 01 // SETUP & GRILL-ME",
  "● STAGE AKTIF: BAB 02 // UI-MODERN & TAILWIND v4",
  "● STAGE AKTIF: BAB 03 // WEB-MOTION CHOREOGRAPHY",
  "● STAGE AKTIF: BAB 04 // MOTIONILO VIDEO ENGINE",
  "● STAGE AKTIF: BAB 05 // THREE.JS r186 & WEBGPU",
  "● STAGE AKTIF: BAB 06 // REA CLEAN-ROOM FORENSICS",
];

function activateStep(idx) {
  storySteps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
  deckPanes.forEach((d, i) => d.classList.toggle("active", i === idx));
  stageDots.forEach((b, i) => b.classList.toggle("active", i === idx));
  if (stageActiveLabel && stepTitles[idx]) {
    stageActiveLabel.textContent = stepTitles[idx];
  }
  setStage3DStep(idx);
}

const stepObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.getAttribute("data-step"), 10) || 0;
        activateStep(idx);
      }
    });
  },
  { rootMargin: "-28% 0px -42% 0px", threshold: 0.05 }
);

storySteps.forEach((step) => stepObserver.observe(step));

stageDots.forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const idx = parseInt(btn.getAttribute("data-goto-step"), 10) || 0;
    activateStep(idx);
    const targetEl = $(`#step-${idx}`);
    if (targetEl) targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

// ============================================================================
// 4. STICKY STAGE DECK INTERACTIONS (DECKS 0..5)
// ============================================================================

// Deck 0: Grill-Me 3-Choice Simulator
const grillResponses = {
  opt1: `[Prompt Pemilik]: "Buatkan halaman produk untuk aplikasiku" (Masih Abu-Abu)
[Respon AI dengan Grill-Me Gate]:
❓ Q1 (Target Stack): Rekomendasi -> Next.js App Router + Tailwind v4 + GSAP.
❓ Q2 (Cara Kerja Planning): Pilih mode kerja kita:
  ▸ [Aktif: Opsi 1 - AI Full Planning] Baik, aku susun arsitektur 4-layer, DESIGN.md, dan seluruh komponennya dari awal sampai selesai sekarang!`,

  opt2: `[Prompt Pemilik]: "Buatkan halaman produk untuk aplikasiku" (Masih Abu-Abu)
[Respon AI dengan Grill-Me Gate]:
  ▸ [Aktif: Opsi 2 - Pemilik yang Planning] Siap! Silakan kirimkan poin-poin struktur halaman atau sketsa alur yang kamu mau, nanti aku eksekusi kodenya persis mengikuti rencana utamamu tanpa mengubah arahnya.`,

  opt3: `[Prompt Pemilik]: "Buatkan halaman produk untuk aplikasiku" (Masih Abu-Abu)
[Respon AI dengan Grill-Me Gate]:
  ▸ [Aktif: Opsi 3 - Kolaborasi Sambil Tanya-Jawab (/grill-me)]
  Putaran 1:
  1. Apakah halaman ini fokus ke konversi langsung (checkout) atau demo interaktif? (Rekomendasi: Demo + Pricing)
  2. Tema permukaan gelap (Obsidian) atau terang (Editorial)? (Ketik "ya" bila setuju rekomendasi)`,
};

$$("[data-grill]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const key = btn.getAttribute("data-grill");
    $$("[data-grill]").forEach((b) => b.classList.toggle("active", b === btn));
    const box = $("#grill-sim-out");
    if (box && grillResponses[key]) box.textContent = grillResponses[key];
  });
});

// Deck 1: UI-Modern Concentric Radius Calculator
const rngROut = $("#rng-r-out");
const rngRPad = $("#rng-r-pad");
function updateConcentricDeck() {
  const ro = parseInt(rngROut.value, 10);
  const pd = parseInt(rngRPad.value, 10);
  const ri = Math.max(0, ro - pd);
  $("#lbl-r-out").textContent = `${ro}px`;
  $("#lbl-r-pad").textContent = `${pd}px`;
  $("#lbl-r-in").textContent = `${ri}px`;
  $("#deck-radius-formula").textContent = `${ro}px - ${pd}px = ${ri}px`;
  const outer = $("#preview-outer-box");
  const inner = $("#preview-inner-box");
  if (outer) {
    outer.style.borderRadius = `${ro}px`;
    outer.style.padding = `${pd}px`;
  }
  if (inner) inner.style.borderRadius = `${ri}px`;
}
rngROut?.addEventListener("input", updateConcentricDeck);
rngRPad?.addEventListener("input", updateConcentricDeck);

// Deck 2: Web-Motion Physics Arena
$("#btn-deck-race")?.addEventListener("click", () => {
  playTone("chime");
  const p1 = $("#puck-1");
  const p2 = $("#puck-2");
  const p3 = $("#puck-3");
  if (!p1 || !p2 || !p3) return;
  const dist = p1.parentElement.clientWidth - 42;

  p1.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 900,
    easing: "linear",
    fill: "forwards",
  });
  p2.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 900,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "forwards",
  });
  p3.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${dist * 1.06}px)`, offset: 0.7 },
      { transform: `translateX(${dist * 0.985}px)`, offset: 0.86 },
      { transform: `translateX(${dist}px)`, offset: 1 },
    ],
    { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );
});

// Deck 3: MotionIlo Aspect Ratio Switcher
const miniScreen = $("#mini-mg-screen");
const miniTag = $("#mini-mg-tag");
const mgRatios = {
  "9:16": { w: "112px", h: "158px", tag: "SAFE 9:16" },
  "16:9": { w: "185px", h: "108px", tag: "SAFE 16:9" },
  "1:1":  { w: "140px", h: "140px", tag: "SAFE 1:1" },
};
$$("[data-mg-ratio]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const r = btn.getAttribute("data-mg-ratio");
    const cfg = mgRatios[r];
    if (!cfg) return;
    $$("[data-mg-ratio]").forEach((b) => b.classList.toggle("btn--primary", b === btn));
    if (miniScreen) {
      miniScreen.style.width = cfg.w;
      miniScreen.style.height = cfg.h;
    }
    if (miniTag) miniTag.textContent = cfg.tag;
  });
});

// Deck 4: Three.js r186 Exploded View Slider
const rngExplode = $("#rng-explode");
const lblExplode = $("#lbl-explode");
rngExplode?.addEventListener("input", () => {
  const v = parseInt(rngExplode.value, 10);
  if (lblExplode) lblExplode.textContent = `Explode: ${v}%`;
  setExplodeFactor(v / 100);
});

// Deck 5: REA Forensic X-Ray Slider
const rngXray = $("#rng-xray");
const lblXray = $("#lbl-xray");
const xrayBackPane = $("#xray-back-pane");
rngXray?.addEventListener("input", () => {
  const v = parseInt(rngXray.value, 10);
  if (lblXray) lblXray.textContent = `${v}%`;
  if (xrayBackPane) xrayBackPane.style.clipPath = `inset(0 0 0 ${100 - v}%)`;
});

// ============================================================================
// 5. PRICING CALCULATOR, BUNDLE BUILDER & DIRECT CONTACT TO ILHAM
// ============================================================================
const checkboxes = $$(".skill-checkbox");
const totalDisplay = $("#cart-total-display");
const orderPreview = $("#order-message-preview");
const cartModeBadge = $("#cart-mode-badge");
const emailLink = $("#link-email-ilham");

function formatRp(num) {
  return "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function recalculateCart() {
  const selected = [];
  let sum = 0;

  checkboxes.forEach((cb) => {
    const card = cb.closest(".skill-check-card");
    card?.classList.toggle("is-selected", cb.checked);
    if (cb.checked) {
      selected.push(cb.getAttribute("data-name"));
      sum += parseInt(cb.getAttribute("data-price"), 10) || 0;
    }
  });

  // Update step buttons in narrative track
  checkboxes.forEach((cb) => {
    const key = cb.value;
    const stepBtn = $(`[data-toggle-cart="${key}"]`);
    if (stepBtn) {
      stepBtn.textContent = cb.checked ? "✓ Masuk di Paket" : "+ Pilih Skill Ini";
      stepBtn.classList.toggle("btn--primary", cb.checked);
    }
  });

  const isFullBundle = selected.length === checkboxes.length;
  const finalPrice = isFullBundle ? 349000 : sum;

  if (totalDisplay) {
    totalDisplay.textContent = formatRp(finalPrice);
  }
  if (cartModeBadge) {
    cartModeBadge.textContent = isFullBundle
      ? "PAKET LENGKAP (HEMAT Rp 346.000)"
      : `${selected.length} MODUL DIPILIH`;
  }

  let msg = "";
  if (isFullBundle) {
    msg = `Halo Ilham! Aku tertarik beli Paket Bundling Lengkap (Semua 5 Skill Visual/Web + Bonus Setup Kerja Awal 3-Tier & Grill-Me Protocol).\nEstimasi Total: Rp 349.000 (Hemat Rp 346.000).\nBoleh minta info pembayaran dan link Google Drive-nya?`;
  } else if (selected.length > 0) {
    const listStr = selected.map((s, i) => `${i + 1}. ${s}`).join("\n");
    msg = `Halo Ilham! Aku tertarik beli skill Antigravity berikut:\n${listStr}\nEstimasi Total: ${formatRp(finalPrice)}.\nBoleh minta info pembayaran dan link Google Drive-nya?`;
  } else {
    msg = `Halo Ilham! Aku tertarik tanya-tanya dulu soal paket Skill Visual & Setup Antigravity kamu.`;
  }

  if (orderPreview) orderPreview.textContent = msg;
  if (emailLink) {
    emailLink.href = `mailto:xanderilham4@gmail.com?subject=${encodeURIComponent("Order Antigravity Visual Skill Pack")}&body=${encodeURIComponent(msg)}`;
  }
}

checkboxes.forEach((cb) => {
  cb.addEventListener("change", () => {
    playTone("click");
    recalculateCart();
  });
});

$("#btn-select-all-bundle")?.addEventListener("click", () => {
  playTone("chime");
  checkboxes.forEach((cb) => (cb.checked = true));
  recalculateCart();
});

$$("[data-toggle-cart]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone("click");
    const key = btn.getAttribute("data-toggle-cart");
    const cb = $(`.skill-checkbox[value="${key}"]`);
    if (cb) {
      cb.checked = !cb.checked;
      recalculateCart();
    }
  });
});

$("#btn-copy-order")?.addEventListener("click", async (e) => {
  playTone("chime");
  const text = orderPreview ? orderPreview.textContent : "";
  try {
    await navigator.clipboard.writeText(text);
    const btn = e.currentTarget;
    const orig = btn.textContent;
    btn.textContent = "✓ Pesan Order Tersalin! Tinggal Kirim ke Ilham";
    setTimeout(() => (btn.textContent = orig), 2200);
  } catch {
    // Ignore clipboard fallback
  }
});

// ============================================================================
// 6. FULL-VIEWPORT ORIGAMI FOX SURPRISE PLAYGROUND
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

  const foxTips = [
    "Kejutan! 🦊 Kalau prompt kamu masih abu-abu, protokol Grill-Me otomatis memberi 3 pilihan cara planning!",
    "Coba scroll dari Bab 01 sampai Bab 06: panggung 3D di sebelah kanan otomatis berubah mengikuti bab!",
    "Ambil Paket Bundling Lengkap (Rp 349rb) untuk hemat Rp 346rb + gratis Setup Kerja Awal!",
    "Double-klik di titik mana saja di layar untuk melempar Orb Energi ke arahku!",
  ];
  let tipIdx = 0;

  summonFoxSurprise = (tx, ty, customText) => {
    playTone("chime");
    trigger3DJump();

    if (foxBubble && foxSpeech) {
      foxBubble.classList.remove("is-hidden");
      foxSpeech.textContent = customText || foxTips[tipIdx % foxTips.length];
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
    fox.timer = 320;
  };

  function drawFox(ctx, f, t) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.dir, 1);
    const hop = Math.abs(Math.sin(t * 14)) * 5;
    ctx.translate(0, -hop);

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

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 18, 7);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(6, -34);
    ctx.lineTo(26, -24);
    ctx.lineTo(12, -12);
    ctx.closePath();
    ctx.fill();

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
        drawFox(ctx, fox, t);
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

$("#btn-nav-surprise")?.addEventListener("click", () => {
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

// Theme & Motion Pause
$("#btn-theme-toggle")?.addEventListener("click", (e) => {
  playTone("click");
  const html = doc.documentElement;
  const next = html.getAttribute("data-theme") === "daylight" ? "dark" : "daylight";
  html.setAttribute("data-theme", next);
  e.currentTarget.textContent = next === "daylight" ? "🌙 Gelap" : "☀ Terang";
});

$("#btn-pause-motion")?.addEventListener("click", (e) => {
  isMotionPaused = !isMotionPaused;
  e.currentTarget.textContent = isMotionPaused ? "Play" : "Pause";
});
