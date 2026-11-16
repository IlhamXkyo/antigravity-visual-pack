import * as THREE from "three";

const doc = document;
const $ = (sel, ctx = doc) => ctx.querySelector(sel);
const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, n) => a + (b - a) * n;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let isMotionPaused = reducedMotion;

// ============================================================================
// 0. WEB AUDIO TACTILE & PET SYNTHESIZER
// ============================================================================
let audioCtx = null;
function playSound(kind = "tick") {
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

    if (kind === "meow") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.11);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.24);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (kind === "catch") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.12);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (kind === "fail") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.18);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.start(now);
      osc.stop(now + 0.045);
    }
  } catch {
    // Ignore if blocked before user gesture
  }
}

// ============================================================================
// 1. PRELOADER -> HERO ENTRANCE & CLOCK
// ============================================================================
const clockEl = $("#clock");
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jayapura",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
function updateClock() {
  if (clockEl) clockEl.innerHTML = `${timeFmt.format(new Date())} <em>WIT</em>`;
}
updateClock();
setInterval(updateClock, 1000);

const loader = $("#loader");
if (!loader || reducedMotion) {
  loader?.remove();
  doc.body.classList.add("is-ready");
} else {
  doc.body.classList.add("is-locked");
  const numEl = $("#loadNum");
  const barEl = $("#loadBar");
  const t0 = performance.now();
  const dur = 1150;
  let done = false;

  const finishLoader = () => {
    if (done) return;
    done = true;
    if (numEl) numEl.textContent = "100";
    if (barEl) barEl.style.width = "100%";
    setTimeout(() => {
      loader.classList.add("is-done");
      doc.body.classList.remove("is-locked");
      doc.body.classList.add("is-ready");
      setTimeout(() => loader.remove(), 1100);
    }, 120);
  };

  const stepLoader = (now) => {
    const k = clamp((now - t0) / dur, 0, 1);
    const eased = 1 - Math.pow(1 - k, 3);
    const val = Math.round(eased * 100);
    if (numEl) numEl.textContent = String(val).padStart(3, "0");
    if (barEl) barEl.style.width = `${val}%`;
    if (k < 1) requestAnimationFrame(stepLoader);
    else finishLoader();
  };
  requestAnimationFrame(stepLoader);
  setTimeout(finishLoader, 2400);
}

// ============================================================================
// 2. LENIS SMOOTH SCROLL + GSAP SCROLLTRIGGER + MAGNETIC CURSOR
// ============================================================================
const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger);

let lenis = null;
if (typeof window.Lenis !== "undefined" && !reducedMotion) {
  lenis = new window.Lenis({
    duration: 1.12,
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

const nav = $("#nav");
const scrollFill = $("#scrollFill");
window.addEventListener(
  "scroll",
  () => {
    const sy = window.scrollY || 0;
    nav?.classList.toggle("is-scrolled", sy > 48);
    const maxScroll = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    if (scrollFill) {
      scrollFill.style.transform = `scaleX(${clamp(sy / maxScroll, 0, 1)})`;
    }
  },
  { passive: true }
);

// Magnetic Cursor & Spotlight
const cursor = $("#cursor");
const cursorDot = $("#cursorDot");
const cursorRing = $("#cursorRing");
const cursorLabel = $("#cursorLabel");
const coordX = $("#coordX");
const coordY = $("#coordY");
let px = window.innerWidth * 0.5;
let py = window.innerHeight * 0.4;
let rx = px;
let ry = py;

if (finePointer && !reducedMotion && cursor) {
  window.addEventListener(
    "pointermove",
    (e) => {
      px = e.clientX;
      py = e.clientY;
      if (cursorDot) {
        cursorDot.style.transform = `translate3d(${px}px,${py}px,0) translate(-50%,-50%)`;
      }
      if (coordX) coordX.textContent = `X ${String(Math.round(px)).padStart(4, "0")}`;
      if (coordY) coordY.textContent = `Y ${String(Math.round(py)).padStart(4, "0")}`;
      doc.documentElement.style.setProperty("--mx", `${px}px`);
      doc.documentElement.style.setProperty("--my", `${py}px`);
    },
    { passive: true }
  );

  const tickCursor = () => {
    rx = lerp(rx, px, 0.18);
    ry = lerp(ry, py, 0.18);
    if (cursorRing) {
      cursorRing.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    }
    requestAnimationFrame(tickCursor);
  };
  requestAnimationFrame(tickCursor);

  $$("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      cursor.classList.add("is-active");
      if (cursorLabel) cursorLabel.textContent = el.getAttribute("data-cursor") || "OPEN";
    });
    el.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-active");
    });
  });
}

// ============================================================================
// 3. HERO WEBGL LUMINOUS FBM FLOW SHADER (#gl-hero)
// ============================================================================
(function initHeroShader() {
  const canvas = $("#gl-hero");
  if (!canvas || reducedMotion) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false });
  if (!gl) return;

  const VERT = `
    attribute vec2 aPos;
    void main() {
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;
  const FRAG = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    float fbm(vec2 p) {
      float s = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p = p * 2.02 + vec2(1.7, -2.3);
        a *= 0.5;
      }
      return s;
    }
    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);
      float t = uTime * 0.06;
      vec2 m = uMouse * 0.22;

      vec3 col = vec3(0.025, 0.027, 0.036);
      float warp = fbm(p * 1.18 + vec2(t * 0.48, -t * 0.3) + m * 0.5);

      float curve = 0.25 + 0.12 * sin(p.x * 1.1 + 0.5) + 0.09 * warp;
      float dy = p.y - curve;
      float band = exp(-dy * dy * 6.5);
      float core = exp(-dy * dy * 36.0);

      vec3 arcCol = mix(vec3(0.0, 0.82, 0.70), vec3(0.85, 1.0, 0.29), smoothstep(-0.9, 0.9, p.x));
      col += arcCol * band * 0.38;
      col += vec3(0.98, 1.0, 0.82) * core * 0.18;

      float fl = pow(1.0 - abs(sin(p.y * 30.0 + warp * 4.2 + t * 2.2)), 30.0);
      col += vec3(0.85, 1.0, 0.35) * fl * band * 0.55;

      float v = length(p * vec2(0.75, 0.95));
      col *= 1.0 - 0.45 * smoothstep(0.55, 1.8, v);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uMouse = gl.getUniformLocation(prog, "uMouse");

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true }
  );

  const tStart = performance.now();
  const loop = (now) => {
    if (!isMotionPaused) {
      mx = lerp(mx, tx, 0.05);
      my = lerp(my, ty, 0.05);
      gl.uniform1f(uTime, (now - tStart) * 0.001);
      gl.uniform2f(uMouse, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

// ============================================================================
// 4. THREE.JS r186 REAL-TIME 3D STAGE (#webgl-canvas-wrap)
// ============================================================================
const wrap3d = $("#webgl-canvas-wrap");
const fpsBadge = $("#fps-badge");
let trigger3DJump = () => {};

if (wrap3d) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(wrap3d.clientWidth, wrap3d.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  wrap3d.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, wrap3d.clientWidth / wrap3d.clientHeight, 0.1, 100);
  camera.position.set(0, 0.35, 5.1);

  scene.add(new THREE.AmbientLight(0xfff6e5, 0.85));
  const keyLight = new THREE.DirectionalLight(0xd9ff4b, 2.5);
  keyLight.position.set(3.5, 4.5, 4.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x00d1b2, 2.1);
  rimLight.position.set(-4.0, 2.2, -3.2);
  scene.add(rimLight);

  const warmLight = new THREE.PointLight(0xffb020, 2.2, 10);
  warmLight.position.set(0, -1.8, 2.5);
  scene.add(warmLight);

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xffb020,
    roughness: 0.25,
    metalness: 0.4,
    flatShading: true,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xf3efe6,
    roughness: 0.35,
    metalness: 0.15,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x13151c,
    roughness: 0.25,
    metalness: 0.8,
  });
  const limeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xd9ff4b,
    emissive: 0x84cc16,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.5,
  });
  const tealGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00d1b2,
    emissive: 0x0d9488,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.5,
  });
  const allMats = [amberMat, boneMat, darkMat, limeGlowMat, tealGlowMat];

  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // Mode 1: 3D Cyber-Kitsune ("Kuro")
  const kitsuneGroup = new THREE.Group();
  rootGroup.add(kitsuneGroup);

  const headGeo = new THREE.OctahedronGeometry(1.05, 1);
  headGeo.scale(1.16, 0.92, 0.95);
  kitsuneGroup.add(new THREE.Mesh(headGeo, amberMat));

  const snoutGeo = new THREE.ConeGeometry(0.68, 0.88, 4);
  snoutGeo.rotateX(Math.PI * 0.5);
  const snout = new THREE.Mesh(snoutGeo, boneMat);
  snout.position.set(0, -0.18, 0.76);
  kitsuneGroup.add(snout);

  const nose = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), darkMat);
  nose.position.set(0, -0.1, 1.2);
  kitsuneGroup.add(nose);

  const earGeo = new THREE.ConeGeometry(0.38, 0.98, 4);
  const earL = new THREE.Group();
  earL.position.set(-0.58, 0.66, 0.05);
  earL.rotation.z = 0.28;
  const earLMesh = new THREE.Mesh(earGeo, amberMat);
  earLMesh.position.y = 0.4;
  earL.add(earLMesh);
  kitsuneGroup.add(earL);

  const earR = new THREE.Group();
  earR.position.set(0.58, 0.66, 0.05);
  earR.rotation.z = -0.28;
  const earRMesh = new THREE.Mesh(earGeo, amberMat);
  earRMesh.position.y = 0.4;
  earR.add(earRMesh);
  kitsuneGroup.add(earR);

  const eyeGeo = new THREE.BoxGeometry(0.26, 0.11, 0.1);
  const eyeL = new THREE.Mesh(eyeGeo, limeGlowMat);
  eyeL.position.set(-0.42, 0.12, 0.87);
  eyeL.rotation.z = -0.12;
  kitsuneGroup.add(eyeL);

  const eyeR = new THREE.Mesh(eyeGeo, limeGlowMat);
  eyeR.position.set(0.42, 0.12, 0.87);
  eyeR.rotation.z = 0.12;
  kitsuneGroup.add(eyeR);

  // 3-Plane Origami Tails
  const tails = new THREE.Group();
  tails.position.set(0, -0.35, -0.88);
  kitsuneGroup.add(tails);
  for (let i = -1; i <= 1; i++) {
    const tGeo = new THREE.OctahedronGeometry(0.42, 0);
    tGeo.scale(0.55, 1.5, 0.45);
    const tMesh = new THREE.Mesh(tGeo, i === 0 ? limeGlowMat : amberMat);
    tMesh.position.set(i * 0.56, Math.abs(i) * -0.1, -0.2);
    tMesh.rotation.z = -i * 0.46;
    tMesh.rotation.x = -0.42;
    tails.add(tMesh);
  }

  // Dual Calibration Rings
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.022, 12, 72), limeGlowMat);
  ringA.rotation.x = Math.PI * 0.42;
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.88, 0.016, 12, 72), tealGlowMat);
  ringB.rotation.y = Math.PI * 0.25;
  kitsuneGroup.add(ringA, ringB);

  // Mode 2: Gyroscopic Spatial Core
  const gyroGroup = new THREE.Group();
  gyroGroup.visible = false;
  rootGroup.add(gyroGroup);

  const coreIco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), limeGlowMat);
  const gRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.045, 16, 64), amberMat);
  const gRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.035, 16, 64), tealGlowMat);
  const gRing3 = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.028, 16, 64), boneMat);
  gyroGroup.add(coreIco, gRing1, gRing2, gRing3);

  let dragging = false;
  let prevX = 0, prevY = 0;
  let targetRotY = 0.28, targetRotX = 0.08;
  let jumpVel = 0, jumpY = 0, spinVel = 0;

  wrap3d.addEventListener("pointerdown", (e) => {
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener("pointermove", (e) => {
    if (dragging) {
      targetRotY += (e.clientX - prevX) * 0.011;
      targetRotX = clamp(targetRotX + (e.clientY - prevY) * 0.008, -0.65, 0.65);
      prevX = e.clientX;
      prevY = e.clientY;
    } else if (!isMotionPaused) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = nx * 0.48;
      targetRotX = ny * 0.24;
    }
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });

  trigger3DJump = () => {
    playSound("catch");
    jumpVel = 0.15;
    spinVel = 0.26;
  };

  $$("[data-3d-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("tick");
      $$("[data-3d-mode]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.getAttribute("data-3d-mode");
      if (mode === "kitsune") {
        kitsuneGroup.visible = true;
        gyroGroup.visible = false;
        allMats.forEach((m) => (m.wireframe = false));
      } else if (mode === "gyro") {
        kitsuneGroup.visible = false;
        gyroGroup.visible = true;
        allMats.forEach((m) => (m.wireframe = false));
      } else {
        allMats.forEach((m) => (m.wireframe = true));
      }
    });
  });

  $("#btn-3d-jump")?.addEventListener("click", () => trigger3DJump());

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
      if (fpsBadge) {
        fpsBadge.textContent = `${isMotionPaused ? "PAUSED" : Math.min(120, Math.round(frames / acc)) + " FPS"} · THREE.Timer`;
      }
      frames = 0;
      acc = 0;
    }

    if (!isMotionPaused) {
      if (jumpY > 0 || jumpVel !== 0) {
        jumpY += jumpVel;
        jumpVel -= 0.009;
        if (jumpY <= 0) {
          jumpY = 0;
          jumpVel = 0;
        }
      }
      spinVel *= 0.91;

      rootGroup.position.y = Math.sin(el * 2.3) * 0.12 + jumpY;
      rootGroup.rotation.y += (targetRotY - rootGroup.rotation.y) * 0.08 + spinVel;
      rootGroup.rotation.x += (targetRotX - rootGroup.rotation.x) * 0.08;

      earL.rotation.z = 0.28 + Math.sin(el * 3.6) * 0.09;
      earR.rotation.z = -0.28 - Math.sin(el * 3.6 + 0.5) * 0.09;
      tails.rotation.y = Math.sin(el * 2.9) * 0.24;
      ringA.rotation.z = el * 0.55;
      ringB.rotation.x = el * 0.42;

      const blink = el % 3.8 > 3.66 ? 0.12 : 1.0;
      eyeL.scale.y = blink;
      eyeR.scale.y = blink;

      coreIco.rotation.y = el * 0.9;
      coreIco.rotation.x = el * 0.55;
      gRing1.rotation.x = el * 1.15;
      gRing2.rotation.y = el * 0.85;
      gRing3.rotation.z = el * 0.65;
    }
    renderer.render(scene, camera);
  });

  window.addEventListener(
    "resize",
    () => {
      camera.aspect = wrap3d.clientWidth / wrap3d.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap3d.clientWidth, wrap3d.clientHeight);
    },
    { passive: true }
  );
}

// Chibi Operator Poke Interaction
const chibiBtn = $("#btn-chibi-poke");
const chibiStatus = $("#chibi-status-text");
const chibiQuotes = [
  "(*^▽^*) Halo! Semua 305 file sudah lolos verify.ps1!",
  "(•̀ᴗ•́)و Gate scene_qa.py siap menjaga safe-area videomu!",
  "(=^･ω･^=) Coba klik Kyo di pojok kanan bawah!",
  "⚡ Mode fast/standard/deep jalan mulus di Hydrogen & Argon!",
];
let chibiIdx = 0;
chibiBtn?.addEventListener("click", () => {
  playSound("meow");
  const img = chibiBtn.querySelector("img");
  if (img) {
    img.src = chibiIdx % 2 === 0 ? "./assets/projects/chibi-coding.png" : "./assets/projects/chibi-wave.png";
  }
  if (chibiStatus) {
    chibiStatus.textContent = chibiQuotes[chibiIdx % chibiQuotes.length];
  }
  chibiIdx++;
  trigger3DJump();
});

// ============================================================================
// 5. WORD-BY-WORD SCRUB STATEMENT & HORIZONTAL PINNED CINEMA GALLERY
// ============================================================================
const scrubEl = $("#scrub-statement");
if (scrubEl) {
  const accentSet = new Set(["gate", "mesin:", "safe-area,", "305", "matematis"]);
  const words = scrubEl.textContent.trim().split(/\s+/);
  scrubEl.innerHTML = words
    .map((w) => {
      const cls = accentSet.has(w.toLowerCase()) ? "w is-accent" : "w";
      return `<span class="${cls}">${w}</span>`;
    })
    .join(" ");

  const wordSpans = $$(".w", scrubEl);
  if (hasGSAP && !reducedMotion) {
    window.gsap.to(wordSpans, {
      className: "+=is-lit",
      stagger: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: scrubEl,
        start: "top 82%",
        end: "bottom 52%",
        scrub: 0.6,
      },
    });
  } else {
    wordSpans.forEach((w) => w.classList.add("is-lit"));
  }
}

// Horizontal Pinned Cinema Track on Desktop (> 980px)
const cinemaSection = $("#cinema");
const cinemaTrack = $("#cinemaTrack");
if (hasGSAP && cinemaSection && cinemaTrack && window.innerWidth > 980 && !reducedMotion) {
  const getScrollDist = () => Math.max(0, cinemaTrack.scrollWidth - window.innerWidth + 80);
  window.gsap.to(cinemaTrack, {
    x: () => -getScrollDist(),
    ease: "none",
    scrollTrigger: {
      trigger: cinemaSection,
      start: "top top",
      end: () => `+=${getScrollDist()}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
}

// Live Overlay Canvases inside Cinema Panels (Safe-Rect HUD & Wave HUD)
(function initPanelCanvases() {
  const c1 = $("#canvas-panel-01");
  const c2 = $("#canvas-panel-02");
  if (!c1 && !c2) return;

  const setup = (c) => {
    if (!c) return null;
    const r = c.parentElement.getBoundingClientRect();
    c.width = Math.max(300, Math.round(r.width));
    c.height = Math.max(200, Math.round(r.height));
    return c.getContext("2d");
  };
  const ctx1 = setup(c1);
  const ctx2 = setup(c2);

  let t = 0;
  const drawOverlays = () => {
    if (!isMotionPaused) {
      t += 0.03;
      if (ctx1 && c1) {
        ctx1.clearRect(0, 0, c1.width, c1.height);
        const scanY = ((Math.sin(t) * 0.5 + 0.5) * (c1.height - 40)) + 20;
        ctx1.strokeStyle = "rgba(217, 255, 75, 0.65)";
        ctx1.lineWidth = 1.5;
        ctx1.beginPath();
        ctx1.moveTo(0, scanY);
        ctx1.lineTo(c1.width, scanY);
        ctx1.stroke();

        ctx1.strokeStyle = "rgba(0, 209, 178, 0.55)";
        ctx1.setLineDash([5, 5]);
        ctx1.strokeRect(24, 24, c1.width - 48, c1.height - 48);
        ctx1.setLineDash([]);
      }
      if (ctx2 && c2) {
        ctx2.clearRect(0, 0, c2.width, c2.height);
        ctx2.strokeStyle = "rgba(217, 255, 75, 0.75)";
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        for (let x = 0; x < c2.width; x += 6) {
          const y = c2.height - 38 + Math.sin(x * 0.03 + t * 2.2) * 14 * Math.sin(t);
          if (x === 0) ctx2.moveTo(x, y);
          else ctx2.lineTo(x, y);
        }
        ctx2.stroke();
      }
    }
    requestAnimationFrame(drawOverlays);
  };
  requestAnimationFrame(drawOverlays);
})();

// ============================================================================
// 6. FULL-VIEWPORT INTERACTIVE ANIMAL PLAYGROUND (KYO & KURO CHASING FISH!)
// ============================================================================
const petCanvas = $("#pet-playground-canvas");
const kyoDialog = $("#kyo-dialog");
const kyoSpeech = $("#kyo-speech");
const kyoBadge = $("#kyo-badge");

let spawnFishAt = () => {};

if (petCanvas) {
  const ctx = petCanvas.getContext("2d");
  let W = window.innerWidth;
  let H = window.innerHeight;

  const resizePetCanvas = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    petCanvas.width = W;
    petCanvas.height = H;
  };
  resizePetCanvas();
  window.addEventListener("resize", resizePetCanvas, { passive: true });

  // Active fish treats and celebration particles
  const fishes = [];
  const sparks = [];
  const floatTexts = [];

  // Two autonomous studio pets that run along the bottom/screen when summoned!
  const pets = [
    {
      name: "Kuro",
      color: "#ffb020",
      earColor: "#fde68a",
      eyeColor: "#070709",
      x: -90,
      y: H - 28,
      vx: 0,
      vy: 0,
      dir: 1,
      active: false,
      timer: 0,
    },
    {
      name: "Mochi",
      color: "#d9ff4b",
      earColor: "#00d1b2",
      eyeColor: "#070709",
      x: W + 90,
      y: H - 28,
      vx: 0,
      vy: 0,
      dir: -1,
      active: false,
      timer: 0,
    },
  ];

  const petMessages = [
    "Nyam! 🐟 Kyo & Kuro barusan menangkap ikan! Gate scene_qa.py siap menjaga videomu tetap 60fps!",
    "Purrr (=^･ω･^=) Tahukah kamu? Double-klik di titik mana saja di halaman ini untuk melempar ikan ke sana!",
    "Hup! 🦊 Semua 305 file di paket Drive sudah dikunci dengan hash SHA-256 di verify.ps1!",
    "Meow! 🐾 Komponen primitif UI-Modern dan Playwright E2E runner sekarang sudah ikut masuk di dalam paket!",
  ];
  let msgCounter = 0;

  spawnFishAt = (tx, ty, customSpeech) => {
    playSound("meow");
    trigger3DJump();

    if (kyoBadge) kyoBadge.textContent = "⚡ AKTIF!";
    if (kyoDialog && kyoSpeech) {
      kyoDialog.classList.remove("is-hidden");
      kyoSpeech.textContent = customSpeech || petMessages[msgCounter % petMessages.length];
      msgCounter++;
    }

    if (isMotionPaused) return;

    fishes.push({
      x: clamp(tx, 60, W - 60),
      y: clamp(ty - 80, 60, H - 140),
      vy: -4.5,
      targetY: clamp(ty, 140, H - 36),
      rot: 0,
      caught: false,
    });

    pets.forEach((p, idx) => {
      if (!p.active) {
        p.active = true;
        p.x = idx === 0 ? -40 : W + 40;
        p.y = H - 28;
      }
      p.timer = 420; // Stay playful on screen for ~7 seconds
    });
  };

  function drawOrigamiPet(ctx, p, time) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);

    const bounce = Math.abs(Math.sin(time * 14)) * 6;
    ctx.translate(0, -bounce);

    // Tail wagging
    const tailWag = Math.sin(time * 16) * 0.35;
    ctx.save();
    ctx.translate(-18, -12);
    ctx.rotate(tailWag);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, -14);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.roundRect(-18, -24, 34, 20, 8);
    ctx.fill();

    // Running paws
    const pawOffset = Math.sin(time * 18) * 6;
    ctx.fillStyle = "#f3efe6";
    ctx.fillRect(-14 + pawOffset, -5, 6, 6);
    ctx.fillRect(8 - pawOffset, -5, 6, 6);

    // Head
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(14, -24, 13, 0, Math.PI * 2);
    ctx.fill();

    // Pointed Ears
    ctx.fillStyle = p.earColor;
    ctx.beginPath();
    ctx.moveTo(6, -33);
    ctx.lineTo(10, -47);
    ctx.lineTo(17, -34);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, -33);
    ctx.lineTo(22, -46);
    ctx.lineTo(25, -31);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = p.eyeColor;
    ctx.beginPath();
    ctx.arc(19, -25, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Name tag above head
    ctx.scale(p.dir, 1);
    ctx.font = "700 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#d9ff4b";
    ctx.textAlign = "center";
    ctx.fillText(p.name, 0, -52);

    ctx.restore();
  }

  let clock = 0;
  const stepPlayground = () => {
    ctx.clearRect(0, 0, W, H);
    if (!isMotionPaused) {
      clock += 0.016;

      // Update fishes
      for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        f.vy += 0.28;
        f.y += f.vy;
        f.rot += 0.08;
        if (f.y > f.targetY) {
          f.y = f.targetY;
          f.vy = -Math.abs(f.vy) * 0.45;
          if (Math.abs(f.vy) < 0.8) f.vy = 0;
        }

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(Math.sin(clock * 6) * 0.2);
        ctx.font = "26px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🐟", 0, 0);
        ctx.restore();
      }

      // Update pets chasing fishes
      pets.forEach((p, idx) => {
        if (!p.active) return;
        p.timer--;

        const targetFish = fishes[0];
        if (targetFish) {
          const dx = targetFish.x - p.x;
          p.dir = dx >= 0 ? 1 : -1;
          p.vx = lerp(p.vx, Math.sign(dx) * 7.5, 0.15);
          p.x += p.vx;

          // Jump up to catch fish when horizontally close!
          if (Math.abs(dx) < 65 && p.y >= H - 32) {
            p.vy = -13.5;
          }
          p.vy += 0.55;
          p.y += p.vy;
          if (p.y > H - 28) {
            p.y = H - 28;
            p.vy = 0;
          }

          // Check catch collision
          const dist = Math.hypot(targetFish.x - p.x, targetFish.y - (p.y - 20));
          if (dist < 46 || (Math.abs(dx) < 28 && Math.abs(p.y - targetFish.y) < 90)) {
            playSound("catch");
            for (let s = 0; s < 14; s++) {
              const ang = (Math.PI * 2 * s) / 14;
              sparks.push({
                x: targetFish.x,
                y: targetFish.y,
                vx: Math.cos(ang) * (2.5 + Math.random() * 4),
                vy: Math.sin(ang) * (2.5 + Math.random() * 4) - 2,
                life: 1.0,
                color: s % 2 === 0 ? "#d9ff4b" : "#ffb020",
              });
            }
            floatTexts.push({
              x: targetFish.x,
              y: targetFish.y - 16,
              text: `${p.name}: NYAM! +60 FPS (=^･ω･^=)`,
              life: 1.0,
            });
            fishes.shift();
          }
        } else {
          // Patrol or exit if timer done
          const homeX = idx === 0 ? W * 0.35 : W * 0.65;
          if (p.timer > 0) {
            const patrolX = homeX + Math.sin(clock * 1.8 + idx * 2) * 140;
            const dx = patrolX - p.x;
            p.dir = dx >= 0 ? 1 : -1;
            p.x += clamp(dx * 0.06, -4.5, 4.5);
            p.vy += 0.55;
            p.y = Math.min(H - 28, p.y + p.vy);
          } else {
            const exitX = idx === 0 ? -90 : W + 90;
            const dx = exitX - p.x;
            p.dir = dx >= 0 ? 1 : -1;
            p.x += Math.sign(dx) * 6;
            p.y = H - 28;
            if (Math.abs(dx) < 12) {
              p.active = false;
              if (kyoBadge) kyoBadge.textContent = "Zzz";
            }
          }
        }

        drawOrigamiPet(ctx, p, clock + idx);
      });

      // Update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.15;
        sp.life -= 0.028;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.life;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Update floating texts
      for (let i = floatTexts.length - 1; i >= 0; i--) {
        const ft = floatTexts[i];
        ft.y -= 1.1;
        ft.life -= 0.02;
        if (ft.life <= 0) {
          floatTexts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ft.life;
        ctx.font = "700 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#d9ff4b";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }
    requestAnimationFrame(stepPlayground);
  };
  requestAnimationFrame(stepPlayground);
}

// Triggers for Pet Surprise
$("#btn-summon-pets")?.addEventListener("click", () => {
  spawnFishAt(window.innerWidth * 0.5, window.innerHeight - 50);
});
$("#btn-hero-fish")?.addEventListener("click", () => {
  spawnFishAt(window.innerWidth * 0.45, window.innerHeight - 60);
});
$("#btn-kyo-pet")?.addEventListener("click", () => {
  spawnFishAt(window.innerWidth * 0.6, window.innerHeight - 50);
});
$("#btn-kyo-hide")?.addEventListener("click", () => {
  kyoDialog?.classList.add("is-hidden");
});

// Double-click anywhere to drop a fish at cursor!
window.addEventListener("dblclick", (e) => {
  spawnFishAt(
    e.clientX,
    Math.max(160, e.clientY),
    "Kejutan Double-Klik! 🐟 Kuro & Mochi langsung meluncur menangkap ikan di posisi klikmu!"
  );
});

// Automatic surprise once when user scrolls into Section 01
let autoSurpriseFired = false;
window.addEventListener(
  "scroll",
  () => {
    if (!autoSurpriseFired && window.scrollY > 420) {
      autoSurpriseFired = true;
      spawnFishAt(
        window.innerWidth * 0.5,
        window.innerHeight - 45,
        "Kejutan! 🦊🐾 Kyo & Kuro bangun menyambutmu di Bab Filosofi & Gate Mesin!"
      );
    }
  },
  { passive: true }
);

// ============================================================================
// 7. WORKBENCHES (SCENE_QA.PY LIVE SIMULATOR, CONCENTRIC MATH, REA X-RAY, DRIVE)
// ============================================================================
$$("[data-wb]").forEach((tab) => {
  tab.addEventListener("click", () => {
    playSound("tick");
    const target = tab.getAttribute("data-wb");
    $$("[data-wb]").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".wb-panel").forEach((p) => p.classList.toggle("active", p.id === target));
  });
});

// Workbench 1: scene_qa.py & storyboard.py Patuh vs Cacat
const qaTerm = $("#qa-terminal-out");
const sbImg = $("#storyboard-preview-img");
const sbStage = $("#storyboard-preview-stage");
const sbCap = $("#storyboard-caption-tag");

$("#btn-run-patuh")?.addEventListener("click", () => {
  playSound("catch");
  if (qaTerm) {
    qaTerm.innerHTML = `<span class="t-cmd">$ python scene_qa.py demo-patuh.json</span>
<span class="t-pass">LULUS  demo-patuh.json  (47 pemeriksaan)</span>
  ✓ aspect_ratio 9:16 (1080x1920 @ 30fps)
  ✓ S01..S03 durasi 3.0s, 4.0s, 3.0s (dalam rentang 1.5s..6.0s)
  ✓ Semua text_rect berada di dalam zona aman TikTok/Reels [108, 380, 900, 1440]
  ✓ Ukuran font 72px, 56px, 64px (&ge; minimum 54px)
  ✓ Kontras warna #F5F7FF di atas #0B1020 = 17.42:1 (&ge; 4.5:1 WCAG AA)
  ✓ Subtitle CPS = 7.4 char/s (&le; 20.0), 0 cue tumpang tindih
  <span class="t-pass">exit code: 0 (AMAN UNTUK RENDER REMOTION)</span>`;
  }
  if (sbImg) sbImg.src = "./assets/projects/storyboard-patuh.png";
  if (sbStage) sbStage.setAttribute("data-lightbox", "./assets/projects/storyboard-patuh.png");
  if (sbCap) {
    sbCap.textContent = "OUTPUT NYATA STORYBOARD.PY (DEMO-PATUH.PNG)";
    sbCap.style.color = "var(--teal)";
  }
});

$("#btn-run-cacat")?.addEventListener("click", () => {
  playSound("fail");
  if (qaTerm) {
    qaTerm.innerHTML = `<span class="t-cmd">$ python scene_qa.py demo-cacat.json</span>
<span class="t-fail">GAGAL  demo-cacat.json  (16 CRITICAL FAIL ditemukan)</span>
  <span class="t-fail">CRITICAL</span>  S01: durasi 1.00s &lt; minimum 1.5s
  <span class="t-fail">CRITICAL</span>  S01: text_rect [20, 100, 1060, 1880] keluar platform text rect [108, 380, 900, 1440]
  <span class="t-fail">CRITICAL</span>  S01: ukuran teks 28px &lt; minimum 54px (9:16)
  <span class="t-fail">CRITICAL</span>  S01: in memakai linear tanpa justifikasi
  <span class="t-fail">CRITICAL</span>  S02: start 20 menimpa scene sebelumnya (cursor 30)
  <span class="t-fail">CRITICAL</span>  palet 7 warna &gt; maksimum 5
  <span class="t-fail">CRITICAL</span>  kontras teks 1.84:1 &lt; 4.5:1
  <span class="t-fail">CRITICAL</span>  cue 1: CPS 31.2 &gt; 20.0
  <span class="t-fail">exit code: 1 (RENDER DIBLOKIR OLEH GATE MESIN)</span>`;
  }
  if (sbImg) sbImg.src = "./assets/projects/storyboard-cacat.png";
  if (sbStage) sbStage.setAttribute("data-lightbox", "./assets/projects/storyboard-cacat.png");
  if (sbCap) {
    sbCap.textContent = "OUTPUT STORYBOARD.PY: PELANGGARAN DITANDAI MERAH (DEMO-CACAT.PNG)";
    sbCap.style.color = "var(--coral)";
  }
});

// Workbench 2: Concentric Radius & Easing Race
const rngRouter = $("#rng-router");
const rngPad = $("#rng-pad");
function updateConcentric() {
  const ro = parseInt(rngRouter.value, 10);
  const pd = parseInt(rngPad.value, 10);
  const ri = Math.max(0, ro - pd);
  $("#lbl-router").textContent = `${ro}px`;
  $("#lbl-pad").textContent = `${pd}px`;
  $("#lbl-rinner").textContent = `${ri}px`;
  const bo = $("#box-router");
  const bi = $("#box-rinner");
  if (bo) {
    bo.style.borderRadius = `${ro}px`;
    bo.style.padding = `${pd}px`;
  }
  if (bi) {
    bi.style.borderRadius = `${ri}px`;
    bi.innerHTML = `R_inner = <strong style="color:var(--lime);">${ri}px</strong> (${ro}px - ${pd}px) · Sudut Konsentris Presisi`;
  }
}
rngRouter?.addEventListener("input", updateConcentric);
rngPad?.addEventListener("input", updateConcentric);

$("#btn-race-start")?.addEventListener("click", () => {
  playSound("catch");
  const pLin = $("#puck-lin");
  const pSnap = $("#puck-snappy");
  const pSpr = $("#puck-spr");
  if (!pLin || !pSnap || !pSpr) return;
  const dist = pLin.parentElement.clientWidth - 54;

  pLin.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 950,
    easing: "linear",
    fill: "forwards",
  });
  pSnap.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dist}px)` }], {
    duration: 950,
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
    { duration: 950, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
  );
});

// Workbench 3: REA Forensic X-Ray
const rngXray = $("#rng-xray");
const xrayPane = $("#xray-pane");
const lblXray = $("#lbl-xray");
rngXray?.addEventListener("input", () => {
  const v = parseInt(rngXray.value, 10);
  if (xrayPane) xrayPane.style.clipPath = `inset(0 0 0 ${100 - v}%)`;
  if (lblXray) lblXray.textContent = `${v}%`;
});

// Section 04: Drive Explorer
const driveContents = {
  d00: `Perintah Instan untuk Dikirim Pembeli ke AI-nya:
"Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu jalankan instalasi seluruh skill dan bonus setup-nya ke direktori konfigurasi Antigravity milikku serta verifikasi hasilnya dengan verify.ps1."

Hasil Eksekusi Otomatis:
$ powershell -ExecutionPolicy Bypass -File ./06-Bonus-Setup-Utama-Arsitektur-Global/install-all.ps1
Instalasi selesai. Menjalankan verifikasi SHA-256 (verify.ps1)...
VERIFY PASS: 305/305 file cocok 100% (SHA-256 verified, 0 missing, 0 drift).`,

  d01: `01-Setup-Motion-Graphics-Motionilo/
├── SETUP-DAN-PANDUAN-AI.md
├── motionilo/
│   ├── plugin.json
│   ├── scripts/
│   │   ├── scene_qa.py          (Gate 47 pemeriksaan matematis)
│   │   ├── storyboard.py        (Generator contact sheet PNG)
│   │   ├── verify_png.py        (Verifikasi piksel numerik)
│   │   ├── demo-patuh.json      (Contoh manifest LULUS)
│   │   └── demo-cacat.json      (Contoh manifest 16 CRITICAL FAIL)
│   └── skills/motionilo/        (SKILL.md + types + shared + templates)
└── remotion-best-practices/     (Bebas duplikasi 488 KB)`,

  d02: `02-Setup-Web-Motion-Choreography/
├── SETUP-DAN-PANDUAN-AI.md
└── motion-stack/
    ├── plugin.json              (Atribusi bersih & versi 2.1.0)
    └── skills/web-motion/
        ├── SKILL.md             (Observable mode: fast | standard | deep)
        ├── references/          (GSAP 3.13+, ScrollTrigger, Lenis, 60fps, OKLCH)
        ├── examples/            (hero-timeline.js, standalone-template.html)
        └── scripts/media_verify.py (Auto FFmpeg/FFprobe discovery lintas OS)`,

  d03: `03-Setup-UI-Modern-Design-System/
├── SETUP-DAN-PANDUAN-AI.md
├── ui-modern/
│   ├── plugin.json              (v2.1.0)
│   ├── primitives-kit/          (BUNDLED: 7 Komponen Primitif + Playwright E2E)
│   │   ├── components/          (SurfaceCard, TactileButton, MagneticButton, dll.)
│   │   ├── tokens.css & motion/
│   │   └── test-bench/e2e-runner.js
│   └── skills/ui-modern/SKILL.md
└── design-md/
    └── references/presets/      (linear, vercel, apple, raycast, claude, posthog, cad)`,

  d04: `04-Setup-3D-WebGL-ThreeJS/
├── SETUP-DAN-PANDUAN-AI.md
└── threejs-dev/
    ├── plugin.json
    └── skills/threejs-dev/
        ├── SKILL.md             (Three.js r186 THREE.Timer, HDRLoader, WebGPU)
        └── references/          (13 modul: shaders, lighting, r3f, asset-pipeline)`,

  d05: `05-Setup-Reverse-Engineering-REA/
├── SETUP-DAN-PANDUAN-AI.md
└── rea/
    ├── plugin.json
    ├── scripts/extract_animation.py
    └── skills/rea/
        ├── SKILL.md             (Mode fast 1-pass & deep 5-phase forensics)
        └── references/          (web-animation-extraction, clean-room-synthesis)`,

  d06: `06-Bonus-Setup-Utama-Arsitektur-Global/
├── SETUP-DAN-PANDUAN-AI.md
├── GEMINI-GLOBAL-RULES.md       (0 em-dash, Karpathy guardrails, on-demand routing)
├── plugins.manifest.json        (305 file dengan hash SHA-256 eksak)
├── install-all.ps1              (Installer idempoten + auto-verify)
├── verify.ps1                   (Gate verifikasi SHA-256, exit 0 jika 100% cocok)
├── uninstall.ps1                (Pembersih terukur berbasis manifest)
├── pro-architect/               (/architect 4-layer headless engine)
└── dialectic-architect/         (Adversarial Triad architecture)`,
};

$$("[data-drive]").forEach((btn) => {
  btn.addEventListener("click", () => {
    playSound("tick");
    const key = btn.getAttribute("data-drive");
    $$("[data-drive]").forEach((b) => b.classList.toggle("active", b === btn));
    const body = $("#drive-term-body");
    if (body && driveContents[key]) body.textContent = driveContents[key];
  });
});

$("#btn-copy-prompt")?.addEventListener("click", async (e) => {
  playSound("catch");
  const txt =
    "Tolong baca file 00-PANDUAN-UTAMA-UNTUK-AI-DAN-PEMBELI.md di folder ini, lalu jalankan instalasi seluruh skill dan bonus setup-nya ke direktori konfigurasi Antigravity milikku serta verifikasi hasilnya dengan verify.ps1.";
  try {
    await navigator.clipboard.writeText(txt);
    const span = e.currentTarget.querySelector("span");
    if (span) {
      const orig = span.textContent;
      span.textContent = "✓ Perintah Setup AI Tersalin!";
      setTimeout(() => (span.textContent = orig), 2000);
    }
  } catch {
    // Ignore clipboard fallback
  }
});

// Lightbox Modal
const lightbox = $("#lightbox");
const lightboxImg = $("#lightbox-img");
const lightboxCap = $("#lightbox-cap");

$$("[data-lightbox]").forEach((el) => {
  el.addEventListener("click", () => {
    playSound("tick");
    const src = el.getAttribute("data-lightbox");
    const cap = el.getAttribute("data-caption");
    if (lightbox && lightboxImg && src) {
      lightboxImg.src = src;
      if (lightboxCap) lightboxCap.textContent = cap || "Preview";
      lightbox.showModal();
    }
  });
});
$("#btn-lightbox-close")?.addEventListener("click", () => lightbox?.close());
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.close();
});

// Theme & Motion Pause Controls
$("#btn-theme")?.addEventListener("click", (e) => {
  playSound("tick");
  const html = doc.documentElement;
  const next = html.getAttribute("data-theme") === "daylight" ? "dark" : "daylight";
  html.setAttribute("data-theme", next);
  e.currentTarget.textContent = next === "daylight" ? "🌙 Gelap" : "☀ Siang";
});

$("#btn-pause-motion")?.addEventListener("click", (e) => {
  isMotionPaused = !isMotionPaused;
  e.currentTarget.textContent = isMotionPaused ? "Play Motion" : "Pause Motion";
});
