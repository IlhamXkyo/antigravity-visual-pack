import * as THREE from "three";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let isMotionPaused = reducedMotionQuery.matches;

// Subtle Web Audio tactile synthesizer (safe, zero external audio files required)
let audioCtx = null;
function playSynthChirp(type = "click") {
  if (isMotionPaused) return;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "jump") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "chirp") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.start(now);
      osc.stop(now + 0.19);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.045);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {
    // Ignore audio restrictions if user hasn't interacted yet
  }
}

// ============================================================================
// 1. THREE.JS r186 INTERACTIVE 3D STAGE (3D CYBER-KITSUNE & GYRO CORE)
// ============================================================================
const canvasWrap = document.getElementById("webgl-canvas-wrap");
const fpsCounter = document.getElementById("fps-counter");

let trigger3DJump = () => {};
let set3DMode = () => {};

if (canvasWrap) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvasWrap.clientWidth, canvasWrap.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    canvasWrap.clientWidth / canvasWrap.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.4, 5.2);

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0xfff4e0, 0.75);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffb74d, 2.4);
  keyLight.position.set(3.5, 4.5, 4.0);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x14b8a6, 1.8);
  rimLight.position.set(-4.0, 2.0, -3.0);
  scene.add(rimLight);

  // Materials
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.35,
    flatShading: true,
  });
  const creamMat = new THREE.MeshStandardMaterial({
    color: 0xf4f3ef,
    roughness: 0.4,
    metalness: 0.1,
    flatShading: true,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x181b21,
    roughness: 0.3,
    metalness: 0.75,
  });
  const tealGlowMat = new THREE.MeshStandardMaterial({
    color: 0x14b8a6,
    emissive: 0x0d9488,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.5,
  });
  const allMaterials = [amberMat, creamMat, darkMetalMat, tealGlowMat];

  // Root group
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Group A: 3D Cyber-Kitsune ("Kuro")
  const kitsuneGroup = new THREE.Group();
  rootGroup.add(kitsuneGroup);

  // Head main polyhedron
  const headGeo = new THREE.OctahedronGeometry(1.05, 1);
  headGeo.scale(1.15, 0.92, 0.95);
  const headMesh = new THREE.Mesh(headGeo, amberMat);
  kitsuneGroup.add(headMesh);

  // Snout / Cheeks
  const snoutGeo = new THREE.ConeGeometry(0.68, 0.85, 4);
  snoutGeo.rotateX(Math.PI * 0.5);
  const snoutMesh = new THREE.Mesh(snoutGeo, creamMat);
  snoutMesh.position.set(0, -0.18, 0.75);
  kitsuneGroup.add(snoutMesh);

  // Nose tip
  const noseGeo = new THREE.OctahedronGeometry(0.13, 0);
  const noseMesh = new THREE.Mesh(noseGeo, darkMetalMat);
  noseMesh.position.set(0, -0.1, 1.18);
  kitsuneGroup.add(noseMesh);

  // Left & Right Articulated Ears
  const earGeo = new THREE.ConeGeometry(0.38, 0.95, 4);
  const earLeftPivot = new THREE.Group();
  earLeftPivot.position.set(-0.58, 0.65, 0.05);
  earLeftPivot.rotation.z = 0.28;
  const earLeftMesh = new THREE.Mesh(earGeo, amberMat);
  earLeftMesh.position.y = 0.38;
  earLeftPivot.add(earLeftMesh);
  kitsuneGroup.add(earLeftPivot);

  const earRightPivot = new THREE.Group();
  earRightPivot.position.set(0.58, 0.65, 0.05);
  earRightPivot.rotation.z = -0.28;
  const earRightMesh = new THREE.Mesh(earGeo, amberMat);
  earRightMesh.position.y = 0.38;
  earRightPivot.add(earRightMesh);
  kitsuneGroup.add(earRightPivot);

  // Glowing Cyber Eyes
  const eyeGeo = new THREE.BoxGeometry(0.24, 0.11, 0.1);
  const eyeLeft = new THREE.Mesh(eyeGeo, tealGlowMat);
  eyeLeft.position.set(-0.42, 0.12, 0.86);
  eyeLeft.rotation.z = -0.12;
  kitsuneGroup.add(eyeLeft);

  const eyeRight = new THREE.Mesh(eyeGeo, tealGlowMat);
  eyeRight.position.set(0.42, 0.12, 0.86);
  eyeRight.rotation.z = 0.12;
  kitsuneGroup.add(eyeRight);

  // Floating Origami Tails (3-plane parallax representation)
  const tailsGroup = new THREE.Group();
  tailsGroup.position.set(0, -0.35, -0.85);
  kitsuneGroup.add(tailsGroup);

  for (let i = -1; i <= 1; i++) {
    const tailGeo = new THREE.OctahedronGeometry(0.42, 0);
    tailGeo.scale(0.55, 1.45, 0.45);
    const tailMesh = new THREE.Mesh(tailGeo, i === 0 ? tealGlowMat : amberMat);
    tailMesh.position.set(i * 0.55, Math.abs(i) * -0.1, -0.2);
    tailMesh.rotation.z = -i * 0.45;
    tailMesh.rotation.x = -0.4;
    tailsGroup.add(tailMesh);
  }

  // Orbital Calibration Ring around Kitsune
  const orbitRingGeo = new THREE.TorusGeometry(1.72, 0.025, 12, 64);
  const orbitRingMesh = new THREE.Mesh(orbitRingGeo, tealGlowMat);
  orbitRingMesh.rotation.x = Math.PI * 0.42;
  kitsuneGroup.add(orbitRingMesh);

  // Group B: Gyroscopic Spatial Core
  const gyroGroup = new THREE.Group();
  gyroGroup.visible = false;
  rootGroup.add(gyroGroup);

  const coreCrystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), tealGlowMat);
  gyroGroup.add(coreCrystal);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.045, 16, 64), amberMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.035, 16, 64), creamMat);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.03, 16, 64), darkMetalMat);
  gyroGroup.add(ring1, ring2, ring3);

  // Floating Star Particles
  const particleCount = 45;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 2.0 + Math.random() * 1.1;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2.6;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xf59e0b,
    size: 0.06,
    transparent: true,
    opacity: 0.75,
  });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // Pointer & Drag Interactivity
  let targetRotY = 0.25;
  let targetRotX = 0.08;
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;
  let jumpVelocity = 0;
  let jumpOffset = 0;
  let spinBoost = 0;

  canvasWrap.addEventListener("pointerdown", (e) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener("pointermove", (e) => {
    if (isDragging) {
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      targetRotY += dx * 0.01;
      targetRotX = Math.max(-0.6, Math.min(0.6, targetRotX + dy * 0.008));
      prevX = e.clientX;
      prevY = e.clientY;
    } else {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      earLeftPivot.rotation.x = ny * 0.2;
      earRightPivot.rotation.x = -ny * 0.2;
      if (!isMotionPaused) {
        targetRotY = nx * 0.45;
        targetRotX = ny * 0.22;
      }
    }
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  // Scroll Coupling
  window.addEventListener("scroll", () => {
    if (isMotionPaused) return;
    const scrollY = window.scrollY || 0;
    orbitRingMesh.rotation.z = scrollY * 0.004;
  }, { passive: true });

  trigger3DJump = () => {
    playSynthChirp("jump");
    jumpVelocity = 0.14;
    spinBoost = 0.22;
  };

  set3DMode = (mode) => {
    playSynthChirp("click");
    if (mode === "kitsune") {
      kitsuneGroup.visible = true;
      gyroGroup.visible = false;
      allMaterials.forEach((m) => { m.wireframe = false; });
    } else if (mode === "gyro") {
      kitsuneGroup.visible = false;
      gyroGroup.visible = true;
      allMaterials.forEach((m) => { m.wireframe = false; });
    } else if (mode === "wireframe") {
      allMaterials.forEach((m) => { m.wireframe = true; });
    }
  };

  // Three.js r186 Timer Loop
  const timer = new THREE.Timer();
  timer.connect(document);

  let frameCounter = 0;
  let accTime = 0;

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const elapsed = timer.getElapsed();

    frameCounter++;
    accTime += dt;
    if (accTime >= 0.5) {
      const fps = Math.min(120, Math.round(frameCounter / accTime));
      if (fpsCounter) {
        fpsCounter.textContent = `${isMotionPaused ? "PAUSED" : fps + " FPS"} · THREE.Timer`;
      }
      frameCounter = 0;
      accTime = 0;
    }

    if (!isMotionPaused) {
      // Jump physics
      if (jumpOffset > 0 || jumpVelocity !== 0) {
        jumpOffset += jumpVelocity;
        jumpVelocity -= 0.0085;
        if (jumpOffset <= 0) {
          jumpOffset = 0;
          jumpVelocity = 0;
        }
      }
      spinBoost *= 0.92;

      rootGroup.position.y = Math.sin(elapsed * 2.2) * 0.12 + jumpOffset;
      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08 + spinBoost;
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;

      // Ear twitch & tail wave
      earLeftPivot.rotation.z = 0.28 + Math.sin(elapsed * 3.4) * 0.08;
      earRightPivot.rotation.z = -0.28 - Math.sin(elapsed * 3.4 + 0.6) * 0.08;
      tailsGroup.rotation.y = Math.sin(elapsed * 2.8) * 0.22;
      orbitRingMesh.rotation.y = elapsed * 0.6;

      // Periodic eye blink
      const blinkCycle = elapsed % 4.2;
      const eyeScaleY = blinkCycle > 4.05 ? 0.15 : 1.0;
      eyeLeft.scale.y = eyeScaleY;
      eyeRight.scale.y = eyeScaleY;

      // Gyro rotation
      coreCrystal.rotation.y = elapsed * 0.9;
      coreCrystal.rotation.x = elapsed * 0.5;
      ring1.rotation.x = elapsed * 1.1;
      ring2.rotation.y = elapsed * 0.85;
      ring3.rotation.z = elapsed * 0.65;

      particleSystem.rotation.y = elapsed * 0.12;
    }

    renderer.render(scene, camera);
  });

  window.addEventListener("resize", () => {
    if (!canvasWrap) return;
    camera.aspect = canvasWrap.clientWidth / canvasWrap.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasWrap.clientWidth, canvasWrap.clientHeight);
  });
}

// Wire 3D HUD buttons
document.querySelectorAll("[data-3d-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-3d-mode]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    set3DMode(btn.getAttribute("data-3d-mode"));
  });
});

document.getElementById("btn-3d-jump")?.addEventListener("click", () => {
  trigger3DJump();
});

// ============================================================================
// 2. SURPRISE ANIMAL COMPANION ("KURO" PEEK, LEAP & FISH PARTICLES)
// ============================================================================
const kuroLeaper = document.getElementById("kuro-leaper");
const kuroBubble = document.getElementById("kuro-bubble");
const kuroSpeechText = document.getElementById("kuro-speech-text");
const kuroEyes = document.getElementById("kuro-eyes");

const kuroQuotes = [
  "Aku cek barusan: semua path hardcoded C:\\Users\\ACER NITRO sudah dibersihkan dari paket Drive. Aman dipasang di laptop siapa saja!",
  "Tahukah kamu? Di Gemini Hydrogen, AI langsung baca kontrak 30 baris pertama biar hemat token dan tidak tanya-jawab berbelit!",
  "Rumus wajib UI-Modern: R_inner = max(0, R_outer - Padding). Sudut kartu dijamin presisi dan tidak kelihatan murahan.",
  "Coba geser slider X-Ray di Bab 04! Skill /rea bisa membedah kurva cubic-bezier dan state komponen web mana pun.",
  "Di Three.js r186, THREE.Clock sudah diganti THREE.Timer. Paket ini menjaga AI kamu agar tidak pakai API usang!",
];
let quoteIdx = 0;

function spawnFishShower(originX, originY) {
  if (isMotionPaused) return;
  const icons = ["🐟", "✨", "🦊", "⚡"];
  for (let i = 0; i < 7; i++) {
    const el = document.createElement("div");
    el.className = "fish-particle";
    el.textContent = icons[i % icons.length];
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;
    document.body.appendChild(el);

    const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
    const dist = 60 + Math.random() * 80;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 40;

    el.animate(
      [
        { transform: "translate(0, 0) scale(0.6)", opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(1.15) rotate(${Math.round(tx * 2)}deg)`, opacity: 0 },
      ],
      { duration: 780, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    ).onfinish = () => el.remove();
  }
}

function launchKuroScreenLeap(customMessage) {
  playSynthChirp("chirp");
  trigger3DJump();

  if (kuroBubble && kuroSpeechText) {
    kuroBubble.classList.remove("hidden");
    kuroSpeechText.textContent = customMessage || kuroQuotes[quoteIdx % kuroQuotes.length];
    quoteIdx++;
  }

  if (isMotionPaused || !kuroLeaper) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  spawnFishShower(vw * 0.5, vh * 0.42);

  kuroLeaper.animate(
    [
      { transform: "translate(0px, 0px) rotate(-18deg) scale(0.8)", opacity: 1 },
      { transform: `translate(${vw * 0.45}px, ${-vh * 0.36}px) rotate(12deg) scale(1.18)`, opacity: 1, offset: 0.48 },
      { transform: `translate(${vw + 180}px, ${-vh * 0.08}px) rotate(38deg) scale(0.9)`, opacity: 0 },
    ],
    {
      duration: 1250,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    }
  );
}

// Eye tracking on bottom-right Kuro companion
window.addEventListener("pointermove", (e) => {
  if (!kuroEyes || isMotionPaused) return;
  const dx = Math.max(-3.5, Math.min(3.5, ((e.clientX / window.innerWidth) - 0.85) * 6));
  const dy = Math.max(-3.5, Math.min(3.5, ((e.clientY / window.innerHeight) - 0.85) * 6));
  kuroEyes.setAttribute("transform", `translate(${dx.toFixed(1)}, ${dy.toFixed(1)})`);
});

document.getElementById("btn-trigger-surprise")?.addEventListener("click", () => {
  launchKuroScreenLeap("Kejutan! Aku Kuro si rubah inspektur visual. Semua 6 modul skill + bonus setup di halaman ini siap kamu bungkus ke Google Drive!");
});

document.getElementById("btn-hero-fish")?.addEventListener("click", (e) => {
  spawnFishShower(e.clientX || window.innerWidth * 0.5, e.clientY || 300);
  launchKuroScreenLeap("Nyam! 🐟 Model 3D di atas dirender langsung di browser pakai Three.js r186 & THREE.Timer!");
});

document.getElementById("btn-feed-kuro")?.addEventListener("click", (e) => {
  spawnFishShower(e.clientX || window.innerWidth - 80, e.clientY || window.innerHeight - 80);
  launchKuroScreenLeap("Terima kasih ikannya! 🐟 Bonus tip: suruh AI pembelimu baca file 00-PANDUAN-UTAMA, nanti semua skill langsung terpasang otomatis.");
});

document.getElementById("btn-kuro-tip")?.addEventListener("click", () => {
  playSynthChirp("click");
  if (kuroBubble && kuroSpeechText) {
    kuroBubble.classList.remove("hidden");
    kuroSpeechText.textContent = kuroQuotes[quoteIdx % kuroQuotes.length];
    quoteIdx++;
  }
});

document.getElementById("btn-kuro-avatar")?.addEventListener("click", () => {
  if (kuroBubble?.classList.contains("hidden")) {
    kuroBubble.classList.remove("hidden");
    playSynthChirp("chirp");
  } else {
    launchKuroScreenLeap();
  }
});

document.getElementById("btn-hide-bubble")?.addEventListener("click", () => {
  kuroBubble?.classList.add("hidden");
});

// Automatic scroll surprise once when user reaches Chapter 2 / Chapter 3
let hasTriggeredScrollSurprise = false;
window.addEventListener("scroll", () => {
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight > 0) {
    const bar = document.getElementById("scroll-bar-fallback");
    if (bar && !CSS.supports("(animation-timeline: scroll()) and (animation-range: 0% 100%)")) {
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / docHeight))})`;
    }
  }

  if (!hasTriggeredScrollSurprise && scrollY > 520) {
    hasTriggeredScrollSurprise = true;
    launchKuroScreenLeap("Hup! 🦊 Kamu baru masuk ke Bab Arsitektur Dual-Engine. Coba klik tab Hydrogen vs Argon untuk lihat bedanya!");
  }
}, { passive: true });

// ============================================================================
// 3. CHAPTER NAVIGATION HIGHLIGHT & THEME / MOTION CONTROLS
// ============================================================================
const chapterSections = document.querySelectorAll(".story-chapter");
const chapterLinks = document.querySelectorAll(".chapter-link");

const chapterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        chapterLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("data-chapter") === id);
        });
      }
    });
  },
  { threshold: 0.28 }
);

chapterSections.forEach((sec) => chapterObserver.observe(sec));

// Theme Toggle (Warm Dark Studio vs Daylight Paper Editorial)
const btnThemeToggle = document.getElementById("btn-theme-toggle");
btnThemeToggle?.addEventListener("click", () => {
  playSynthChirp("click");
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "daylight" ? "dark" : "daylight";
  html.setAttribute("data-theme", next);
  btnThemeToggle.textContent = next === "daylight" ? "🌙 Mode Gelap" : "☀ Mode Siang";
});

// WCAG 2.2.2 Pause / Play Motion Button
const btnPauseMotion = document.getElementById("btn-pause-motion");
btnPauseMotion?.addEventListener("click", () => {
  isMotionPaused = !isMotionPaused;
  btnPauseMotion.textContent = isMotionPaused ? "Play Motion" : "Pause Motion";
});

// ============================================================================
// 4. DUAL-ENGINE SIMULATOR (GEMINI HYDROGEN VS GEMINI ARGON)
// ============================================================================
const engineData = {
  hydrogen: {
    heading: "Gemini Hydrogen: Eksekusi Instan Tanpa Tanya-Jawab Berbelit",
    desc: "Saat kamu memakai Gemini Hydrogen untuk iterasi cepat, AI langsung membaca 30 baris pertama (Fast-Path Contract). Tidak perlu membuka belasan file referensi: token CSS mandiri, rumus radius konsentris, dan boilerplate GSAP/Three.js r186 sudah tersedia langsung di entry point.",
    bullets: [
      "Hemat konteks: langsung mengeksekusi dengan preset parameter aman (misal 9:16 Reels, 30fps, spring damping 20).",
      "Self-contained CSS tokens: tidak error mencari modul lokal yang belum diinstal di proyek baru.",
      "Anti-API usang: mengunci THREE.Timer dan HDRLoader sejak baris pertama.",
    ],
    code: `/* Kontrak Fast-Path yang Dibaca Gemini Hydrogen */
[Mode: Gemini Hydrogen // Zero-Lookup Execution]
1. Surface Elevation : #0b0c0e -> #121418 -> #181b21
2. Concentric Math   : R_inner = max(0, R_outer - Padding)
3. Tactile Physics   : 50ms cubic-bezier(0.16, 1, 0.3, 1)
4. MotionIlo SafeRect: x: 108..900, y: 380..1440 (9:16 Reels)
5. Output            : Self-contained code, 0 placeholder`,
  },
  argon: {
    heading: "Gemini Argon: Arsitektur Multi-File, Forensik 5 Fase & Audit QA Penuh",
    desc: "Saat beralih ke Gemini Argon untuk proyek berskala besar, AI otomatis menelusuri pohon sub-referensi mendalam (shared/01..07, references/shaders.md, state-and-engines.md), menyusun arsitektur 4-layer headless, dan memvalidasi checklist QA sebelum selesai.",
    bullets: [
      "Arsitektur 4-Layer (Core Headless Engine terpisah tegas dari UI komponen).",
      "Produksi video multi-scene dengan JSON Scene Manifest lengkap, file subtitle SRT, dan tabel QA.",
      "Dekonstruksi forensik 5 fase (/rea) dan debat arsitektur adversarial (Thesis, Antithesis, Synthesis).",
    ],
    code: `/* Alur Deep-Architecture pada Gemini Argon */
[Mode: Gemini Argon // Full Reference & QA Pipeline]
├── 1. Load Domain Spec : types/01-story-flat-3d.md + shared/01..07
├── 2. Architecture     : src/core/ (Headless) <-> src/features/ (UI)
├── 3. Scene Manifest   : 5 scenes, 3-plane parallax (0.4x, 1.0x, 1.2x)
├── 4. WebGPU / Three   : TSL Node Material + BatchedMesh disposal
└── 5. Verification Gate: Run media_verify.py & 07-qa-checklist.md [PASS]`,
  },
};

document.querySelectorAll("[data-engine]").forEach((tab) => {
  tab.addEventListener("click", () => {
    playSynthChirp("click");
    const key = tab.getAttribute("data-engine");
    const info = engineData[key];
    if (!info) return;

    document.querySelectorAll("[data-engine]").forEach((t) => {
      const active = t === tab;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", String(active));
    });

    document.getElementById("engine-mode-heading").textContent = info.heading;
    document.getElementById("engine-mode-desc").textContent = info.desc;
    document.getElementById("engine-code-box").textContent = info.code;

    const ul = document.getElementById("engine-mode-bullets");
    ul.innerHTML = info.bullets.map((b) => `<li>${b}</li>`).join("");
  });
});

// ============================================================================
// 5. INTERACTIVE LABS (MOTIONILO, UI-MODERN, WEB-MOTION, REA)
// ============================================================================

// Lab 01: MotionIlo Aspect Ratio & Safe Area
const aspectSpecs = {
  "9:16": { w: "132px", h: "215px", label: "9:16 (1080×1920)", inset: "14% 10% 22% 10%", coord: "x:108..900" },
  "16:9": { w: "248px", h: "140px", label: "16:9 (1920×1080)", inset: "8% 6% 15% 6%", coord: "margin: 5%" },
  "1:1":  { w: "185px", h: "185px", label: "1:1 (1080×1080)", inset: "8% 8% 15% 8%", coord: "90% safe" },
};

document.querySelectorAll("[data-aspect]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playSynthChirp("click");
    const ratio = btn.getAttribute("data-aspect");
    const spec = aspectSpecs[ratio];
    if (!spec) return;

    document.querySelectorAll("[data-aspect]").forEach((b) => b.classList.remove("primary"));
    btn.classList.add("primary");

    const box = document.getElementById("aspect-preview-box");
    const safe = document.getElementById("safe-rect-box");
    box.style.width = spec.w;
    box.style.height = spec.h;
    safe.style.inset = spec.inset;
    document.getElementById("aspect-readout").textContent = spec.label;
    document.getElementById("safe-coord-label").textContent = spec.coord;
  });
});

const parallaxStage = document.getElementById("parallax-stage");
const parallaxChip = document.getElementById("parallax-fg-chip");
parallaxStage?.addEventListener("pointermove", (e) => {
  if (isMotionPaused || !parallaxChip) return;
  const rect = parallaxStage.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 24;
  const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 18;
  parallaxChip.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px)`;
});

// Lab 02: UI-Modern Concentric Radius Calculator
const sliderRouter = document.getElementById("slider-router");
const sliderPadding = document.getElementById("slider-padding");

function updateRadiusMath() {
  const rOut = parseInt(sliderRouter.value, 10);
  const pad = parseInt(sliderPadding.value, 10);
  const rIn = Math.max(0, rOut - pad);

  document.getElementById("val-router").textContent = `${rOut}px`;
  document.getElementById("val-padding").textContent = `${pad}px`;
  document.getElementById("val-rinner").textContent = `${rIn}px`;
  document.getElementById("formula-readout").textContent = `R_in = ${rOut} - ${pad} = ${rIn}px`;

  const outerBox = document.getElementById("demo-outer-box");
  const innerBox = document.getElementById("demo-inner-box");
  outerBox.style.borderRadius = `${rOut}px`;
  outerBox.style.padding = `${pad}px`;
  innerBox.style.borderRadius = `${rIn}px`;
}

sliderRouter?.addEventListener("input", updateRadiusMath);
sliderPadding?.addEventListener("input", updateRadiusMath);

// Lab 03: Web-Motion Easing Race
document.getElementById("btn-run-race")?.addEventListener("click", () => {
  playSynthChirp("jump");
  const pLinear = document.getElementById("puck-linear");
  const pExpo = document.getElementById("puck-expo");
  const pSpring = document.getElementById("puck-spring");
  if (!pLinear || !pExpo || !pSpring) return;

  const trackWidth = pLinear.parentElement.clientWidth - 46;

  pLinear.animate(
    [{ transform: "translateX(0px)" }, { transform: `translateX(${trackWidth}px)` }],
    { duration: 950, easing: "linear", fill: "forwards" }
  );

  pExpo.animate(
    [{ transform: "translateX(0px)" }, { transform: `translateX(${trackWidth}px)` }],
    { duration: 950, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" }
  );

  pSpring.animate(
    [
      { transform: "translateX(0px)" },
      { transform: `translateX(${trackWidth * 1.06}px)`, offset: 0.72 },
      { transform: `translateX(${trackWidth * 0.985}px)`, offset: 0.88 },
      { transform: `translateX(${trackWidth}px)`, offset: 1 },
    ],
    { duration: 950, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );
});

// Lab 04: REA Forensic X-Ray Slider
const sliderXray = document.getElementById("slider-xray");
const xrayForensicPane = document.getElementById("xray-forensic-pane");
const xrayReadout = document.getElementById("xray-readout");

sliderXray?.addEventListener("input", () => {
  const val = parseInt(sliderXray.value, 10);
  const clipLeft = 100 - val;
  if (xrayForensicPane) {
    xrayForensicPane.style.clipPath = `inset(0 0 0 ${clipLeft}%)`;
  }
  if (xrayReadout) {
    xrayReadout.textContent = `X-Ray: ${val}%`;
  }
});

// ============================================================================
// 6. PROJECT LIGHTBOX & GOOGLE DRIVE FOLDER EXPLORER
// ============================================================================
const lightbox = document.getElementById("project-lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxTitle = document.getElementById("lightbox-title");

document.querySelectorAll(".work-card").forEach((card) => {
  card.addEventListener("click", () => {
    playSynthChirp("click");
    const imgSrc = card.getAttribute("data-img");
    const title = card.getAttribute("data-title");
    if (lightbox && lightboxImg && imgSrc) {
      lightboxImg.src = imgSrc;
      if (lightboxTitle) lightboxTitle.textContent = title || "Preview Proyek";
      lightbox.showModal();
    }
  });
});

document.getElementById("btn-close-lightbox")?.addEventListener("click", () => {
  lightbox?.close();
});
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.close();
});

const driveFolders = {
  f00: `Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu jalankan instalasi seluruh skill dan bonus setup-nya ke direktori konfigurasi Antigravity milikku serta verifikasi hasilnya.

Isi Paket Master:
├── 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md
├── 01-Setup-Motion-Graphics-Motionilo/
├── 02-Setup-Web-Motion-Choreography/
├── 03-Setup-UI-Modern-Design-System/
├── 04-Setup-3D-WebGL-ThreeJS/
├── 05-Setup-Reverse-Engineering-REA/
└── 06-Bonus-Setup-Utama-Arsitektur-Global/`,

  f01: `01-Setup-Motion-Graphics-Motionilo/
├── SETUP-DAN-PANDUAN-AI.md  (Bacaan otomatis untuk AI)
├── motionilo/
│   ├── plugin.json
│   └── skills/motionilo/
│       ├── SKILL.md (Dual-Engine: Hydrogen Fast-Path & Argon Full QA)
│       ├── types/ (01-story, 02-kinetic, 03-brand)
│       ├── shared/ (01-safearea s.d. 07-qa-checklist)
│       └── templates/ (scene templates & SRT style guide)
└── remotion-best-practices/
    └── skills/remotion-best-practices/SKILL.md`,

  f02: `02-Setup-Web-Motion-Choreography/
├── SETUP-DAN-PANDUAN-AI.md  (Bacaan otomatis untuk AI)
└── motion-stack/
    ├── plugin.json
    └── skills/web-motion/
        ├── SKILL.md (GSAP 3.13+, ScrollTrigger & Lenis Sync Starter)
        ├── references/ (gsap-web, scrolltrigger-lenis, 60fps, oklch, dll.)
        ├── examples/ (hero-timeline.js, standalone-template.html)
        └── scripts/media_verify.py (Auto FFmpeg/FFprobe discovery)`,

  f03: `03-Setup-UI-Modern-Design-System/
├── SETUP-DAN-PANDUAN-AI.md  (Bacaan otomatis untuk AI)
├── ui-modern/
│   ├── plugin.json
│   └── skills/ui-modern/
│       ├── SKILL.md (Self-Contained Tokens + Concentric Math + 50ms Physics)
│       └── references/ (spatial-math, motion-physics, color-elevation)
└── design-md/
    ├── SKILL.md
    └── references/presets/ (linear, vercel, apple, raycast, claude, posthog, cad)`,

  f04: `04-Setup-3D-WebGL-ThreeJS/
├── SETUP-DAN-PANDUAN-AI.md  (Bacaan otomatis untuk AI)
└── threejs-dev/
    ├── plugin.json
    └── skills/threejs-dev/
        ├── SKILL.md (Three.js r186 THREE.Timer, HDRLoader, WebGPU Starter)
        └── references/ (13 modul: shaders, lighting, r3f, asset-pipeline, dll.)`,

  f05: `05-Setup-Reverse-Engineering-REA/
├── SETUP-DAN-PANDUAN-AI.md  (Bacaan otomatis untuk AI)
└── rea/
    ├── plugin.json
    ├── scripts/extract_animation.py
    └── skills/rea/
        ├── SKILL.md (Hydrogen 1-Pass Extract & Argon 5-Phase Forensics)
        └── references/ (web-animation-extraction, clean-room-synthesis, dll.)`,

  f06: `06-Bonus-Setup-Utama-Arsitektur-Global/
├── SETUP-DAN-PANDUAN-AI.md
├── GEMINI-GLOBAL-RULES.md         (Aturan global hemat token & anti-slop)
├── DAFTAR-KURASI-PLUGIN-PENDUKUNG.md (Rekomendasi plugin resmi pelengkap)
├── install-all.ps1                (Installer otomatis 1-klik semua modul)
├── pro-architect/                 (/architect 4-layer headless pattern)
└── dialectic-architect/           (Adversarial Triad system architecture)`,
};

document.querySelectorAll("[data-folder]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playSynthChirp("click");
    const key = btn.getAttribute("data-folder");
    document.querySelectorAll("[data-folder]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const box = document.getElementById("drive-preview-box");
    if (box && driveFolders[key]) {
      box.textContent = driveFolders[key];
    }
  });
});

document.getElementById("btn-copy-ai-prompt")?.addEventListener("click", async (e) => {
  const promptText = "Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu jalankan instalasi seluruh skill dan bonus setup-nya ke direktori konfigurasi Antigravity milikku serta verifikasi hasilnya.";
  try {
    await navigator.clipboard.writeText(promptText);
    const btn = e.currentTarget;
    const orig = btn.textContent;
    btn.textContent = "✓ Tersalin ke Clipboard!";
    setTimeout(() => { btn.textContent = orig; }, 1800);
  } catch {
    // Fallback if clipboard permission denied
  }
});
