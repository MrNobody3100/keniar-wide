/**
 * scene-3d.js — the site's persistent "alive" 3D background.
 *
 * Mounts a full-viewport, fixed WebGL canvas (#bg-3d) behind every page's
 * content. It's a tunnel of glowing rings receding into the distance,
 * with floating stylised CCTV sentries mounted along the way and a
 * central pulsing "network core" near the top of the page.
 *
 * The key trick for the "video / flythrough" feel: the camera's
 * position along the tunnel is driven by scroll progress (0% scrolled
 * = tunnel entrance, 100% scrolled = far end), smoothed with an easing
 * lerp so it feels cinematic rather than jumpy. On top of that, every
 * ring and sentry has its own idle animation (rotation, bob, blink) so
 * the scene never looks frozen even if the visitor isn't scrolling.
 *
 * Loaded as an ES module directly from a CDN (see the
 * <script type="module"> tag near the end of each page) — no build
 * step needed. Respects prefers-reduced-motion (renders one static
 * frame, no scroll-driven camera, no loop) and pauses the render loop
 * when the tab is hidden. Fails silently if WebGL isn't available.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/UnrealBloomPass.js";

const BRAND_BLUE = 0x2f7dd9;
const BRAND_ORANGE = 0xf9a026;
const BODY_DARK = 0x2a2f33;
const LENS_DARK = 0x14171a;

const RING_SPACING = 7;
const RING_RADIUS = 3.4;
const RING_COUNT = 34; // ~238 units of tunnel depth
const TUNNEL_DEPTH = RING_SPACING * (RING_COUNT - 1);
const SENTRY_EVERY = 3; // mount a camera sentry every Nth ring

initScene3D();

function initScene3D() {
  const canvas = document.getElementById("bg-3d");
  if (!canvas || !window.WebGLRenderingContext) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (err) {
    return; // WebGL unavailable — page background color still covers us
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 6);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const world = new THREE.Group();
  scene.add(world);

  // ---- Lighting ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const keyLight = new THREE.PointLight(BRAND_BLUE, 8, 30, 2);
  keyLight.position.set(-3, 3, 4);
  world.add(keyLight);
  const rimLight = new THREE.PointLight(BRAND_ORANGE, 5, 30, 2);
  rimLight.position.set(3, -2, 2);
  world.add(rimLight);

  // ---- Central network core (sits at the tunnel entrance) ----
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.MeshBasicMaterial({ color: BRAND_BLUE, wireframe: true, transparent: true, opacity: 0.25 })
  );
  world.add(core);
  const coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.MeshBasicMaterial({ color: BRAND_ORANGE, transparent: true, opacity: 0.85 })
  );
  world.add(coreInner);

  // ---- The tunnel: a sequence of glowing rings receding in -Z ----
  const rings = [];
  const sentries = [];
  const isMobile = window.innerWidth < 640;

  for (let i = 0; i < RING_COUNT; i++) {
    const z = -i * RING_SPACING - 4;
    const color = i % 2 === 0 ? BRAND_BLUE : BRAND_ORANGE;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.035, 10, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
    );
    ring.position.z = z;
    ring.userData.spinSpeed = (Math.random() - 0.5) * 0.15;
    ring.userData.baseOpacity = 0.35;
    world.add(ring);
    rings.push(ring);

    // A few thin cross-struts so it reads as a structure, not just a hoop
    for (let s = 0; s < 4; s++) {
      const angle = (s / 4) * Math.PI * 2;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2 })
      );
      strut.position.set(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, z);
      strut.rotation.z = angle + Math.PI / 2;
      strut.rotation.x = Math.PI / 2;
      ring.userData.struts = ring.userData.struts || [];
      world.add(strut);
      ring.userData.struts.push(strut);
    }

    if (i > 0 && i % SENTRY_EVERY === 0 && (!isMobile || i % (SENTRY_EVERY * 2) === 0)) {
      const angle = Math.random() * Math.PI * 2;
      const sentry = createCameraModel();
      sentry.position.set(Math.cos(angle) * (RING_RADIUS - 0.4), Math.sin(angle) * (RING_RADIUS - 0.4), z + RING_SPACING * 0.4);
      sentry.lookAt(0, 0, z - 6);
      sentry.userData.bobPhase = Math.random() * Math.PI * 2;
      sentry.userData.bobSpeed = 0.5 + Math.random() * 0.4;
      sentry.userData.baseRotationY = sentry.rotation.y;
      sentry.userData.panSpeed = 0.2 + Math.random() * 0.2;
      sentry.userData.panAmount = 0.25 + Math.random() * 0.2;
      world.add(sentry);
      sentries.push(sentry);
    }
  }

  // ---- Ambient particle field, scattered through the whole tunnel ----
  const particleCount = isMobile ? 260 : 520;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const palette = [new THREE.Color(BRAND_BLUE), new THREE.Color(BRAND_ORANGE), new THREE.Color(0xeef3f7)];
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * RING_RADIUS * 0.95;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = -Math.random() * (TUNNEL_DEPTH + 10);
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
      size: 0.05,
      map: makeSoftDotTexture(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  world.add(particles);

  // ---- Post-processing: bloom for that glowing, cinematic feel ----
  let composer = null;
  if (!reduceMotion) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.95, 0.55, 0.15));
  }

  // ---- Sizing ----
  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (composer) composer.setSize(width, height);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- Scroll → tunnel depth ----
  let scrollTargetZ = 0;
  function updateScrollTarget() {
    const doc = document.documentElement;
    const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
    scrollTargetZ = -progress * TUNNEL_DEPTH;
  }
  window.addEventListener("scroll", updateScrollTarget, { passive: true });
  updateScrollTarget();

  // ---- Mouse parallax (subtle look-around while flying through) ----
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ---- Render loop ----
  let currentZ = 6;
  let parallaxX = 0;
  let parallaxY = 0;
  let rafId = null;
  let running = false;
  const clock = new THREE.Clock();

  function renderFrame() {
    const t = clock.getElapsedTime();

    core.rotation.y = t * 0.15;
    core.rotation.x = t * 0.06;
    coreInner.scale.setScalar(0.85 + Math.sin(t * 1.6) * 0.15);
    coreInner.rotation.y = -t * 0.3;

    rings.forEach((ring) => {
      ring.rotation.z = t * ring.userData.spinSpeed;
      if (ring.userData.struts) {
        ring.userData.struts.forEach((strut) => (strut.rotation.y = t * ring.userData.spinSpeed * 0.5));
      }
    });

    sentries.forEach((s) => {
      s.rotation.y = s.userData.baseRotationY + Math.sin(t * s.userData.panSpeed) * s.userData.panAmount;
      s.position.y += Math.sin(t * s.userData.bobSpeed + s.userData.bobPhase) * 0.0008;
      if (s.userData.glow) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.2 + s.userData.bobPhase));
        s.userData.glow.material.opacity = 0.4 + blink * 0.6;
      }
    });

    // Cinematic easing toward the scroll-driven depth target.
    currentZ += (6 + scrollTargetZ - currentZ) * 0.055;
    parallaxX += (mouse.x * 0.5 - parallaxX) * 0.04;
    parallaxY += (-mouse.y * 0.35 - parallaxY) * 0.04;

    camera.position.x = parallaxX;
    camera.position.y = parallaxY;
    camera.position.z = currentZ;
    camera.lookAt(parallaxX * 0.4, parallaxY * 0.4, currentZ - 14);

    world.rotation.z = Math.sin(t * 0.04) * 0.02;

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    renderFrame();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  renderFrame(); // always show at least one frame, even under reduced motion

  if (!reduceMotion) {
    start();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
  }
}

/** Stylised CCTV camera: body + lens + blinking "recording" dot + faint FOV cone. */
function createCameraModel() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.17, 0.48, 12),
    new THREE.MeshStandardMaterial({ color: BODY_DARK, metalness: 0.6, roughness: 0.4 })
  );
  body.rotation.z = Math.PI / 2;
  group.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: LENS_DARK, metalness: 0.8, roughness: 0.2 })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.3;
  group.add(lens);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.9 })
  );
  glow.position.set(-0.05, 0.12, 0);
  group.add(glow);
  group.userData.glow = glow;

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 1.7, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: BRAND_ORANGE,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = 1.15;
  group.add(cone);

  const mount = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 0.09),
    new THREE.MeshStandardMaterial({ color: BODY_DARK, metalness: 0.5, roughness: 0.5 })
  );
  mount.position.set(-0.18, -0.1, 0);
  group.add(mount);

  return group;
}

/** Soft radial-gradient sprite so particles render as glowing dots. */
function makeSoftDotTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(c);
  texture.needsUpdate = true;
  return texture;
}
