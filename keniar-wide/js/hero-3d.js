/**
 * hero-3d.js — a genuine WebGL 3D scene for the homepage hero, built
 * with Three.js. Replaces the flat 2D canvas with real depth: floating
 * stylised CCTV camera models slowly panning, a glowing particle field,
 * a slowly rotating wireframe "network core", soft bloom, and a subtle
 * mouse-parallax + idle auto-rotation so the whole thing feels alive
 * even before the visitor interacts with anything.
 *
 * Loaded as an ES module (see the <script type="module"> tag in
 * index.html) directly from a CDN — no build step needed.
 *
 * Respects prefers-reduced-motion (renders one static frame, no loop),
 * pauses rendering when the hero scrolls out of view or the tab is
 * hidden (battery/CPU friendly), and fails silently if WebGL isn't
 * available so the page's CSS gradient background still looks fine.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/UnrealBloomPass.js";

const BRAND_BLUE = 0x2f7dd9;
const BRAND_ORANGE = 0xf9a026;
const BODY_DARK = 0x2a2f33;
const LENS_DARK = 0x14171a;

initHero3D();

function initHero3D() {
  const canvas = document.getElementById("hero-network");
  if (!canvas || !window.WebGLRenderingContext) return;

  const heroSection = canvas.closest("section") || canvas.parentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (err) {
    return; // WebGL unavailable — the CSS gradient background still covers us
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  // A "world" group so we can idle-rotate everything together as one gesture.
  const world = new THREE.Group();
  scene.add(world);

  // ---- Lighting (soft — most of the "glow" comes from bloom on the
  // unlit accent materials below, not from realistic lighting) ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const keyLight = new THREE.PointLight(BRAND_BLUE, 6, 20, 2);
  keyLight.position.set(-4, 3, 4);
  world.add(keyLight);
  const rimLight = new THREE.PointLight(BRAND_ORANGE, 4, 20, 2);
  rimLight.position.set(4, -2, 3);
  world.add(rimLight);

  // ---- Central "network core" — rotating wireframe icosahedron ----
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 1),
    new THREE.MeshBasicMaterial({ color: BRAND_BLUE, wireframe: true, transparent: true, opacity: 0.22 })
  );
  world.add(core);

  const coreInner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshBasicMaterial({ color: BRAND_ORANGE, transparent: true, opacity: 0.85 })
  );
  world.add(coreInner);

  // ---- Floating stylised CCTV camera models ----
  const cameraCount = window.innerWidth < 640 ? 3 : 5;
  const cameraRigs = [];
  for (let i = 0; i < cameraCount; i++) {
    const rig = createCameraModel();
    const angle = (i / cameraCount) * Math.PI * 2;
    const radius = 3.4 + Math.random() * 1.4;
    rig.position.set(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 2.6,
      Math.sin(angle) * radius * 0.6 - 1
    );
    rig.lookAt(0, 0, 0);
    rig.userData.bobPhase = Math.random() * Math.PI * 2;
    rig.userData.bobSpeed = 0.6 + Math.random() * 0.4;
    rig.userData.baseY = rig.position.y;
    rig.userData.panSpeed = 0.25 + Math.random() * 0.25;
    rig.userData.panAmount = 0.3 + Math.random() * 0.25;
    rig.userData.baseRotationY = rig.rotation.y;
    world.add(rig);
    cameraRigs.push(rig);

    // Faint data-link line from the core to each camera
    const linkGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), rig.position.clone()]);
    const linkMat = new THREE.LineBasicMaterial({ color: BRAND_BLUE, transparent: true, opacity: 0.12 });
    const link = new THREE.Line(linkGeo, linkMat);
    link.userData.phase = Math.random() * Math.PI * 2;
    world.add(link);
    rig.userData.link = link;
  }

  // ---- Glowing particle field ----
  const particleCount = window.innerWidth < 640 ? 220 : 420;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const palette = [
    new THREE.Color(BRAND_BLUE),
    new THREE.Color(BRAND_ORANGE),
    new THREE.Color(0xeef3f7),
  ];
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.045,
    map: makeSoftDotTexture(),
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  world.add(particles);
  const particleVelocities = new Float32Array(particleCount).map(() => (Math.random() - 0.5) * 0.06);

  // ---- Post-processing: subtle bloom so the accent/emissive bits glow ----
  let composer = null;
  if (!reduceMotion) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.5, 0.18);
    composer.addPass(bloom);
  }

  // ---- Sizing ----
  function resize() {
    const width = canvas.clientWidth || heroSection.clientWidth;
    const height = canvas.clientHeight || heroSection.clientHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (composer) composer.setSize(width, height);
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- Mouse parallax ----
  const mouse = { x: 0, y: 0 };
  const targetCam = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ---- Render loop ----
  let rafId = null;
  let running = false;
  const clock = new THREE.Clock();

  function renderFrame() {
    const t = clock.getElapsedTime();

    core.rotation.y = t * 0.15;
    core.rotation.x = t * 0.06;
    coreInner.rotation.y = -t * 0.3;
    const pulse = 0.85 + Math.sin(t * 1.6) * 0.15;
    coreInner.scale.setScalar(pulse);

    cameraRigs.forEach((rig) => {
      rig.position.y = rig.userData.baseY + Math.sin(t * rig.userData.bobSpeed + rig.userData.bobPhase) * 0.25;
      rig.rotation.y = rig.userData.baseRotationY + Math.sin(t * rig.userData.panSpeed) * rig.userData.panAmount;
      if (rig.userData.glow) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin(t * 2.2 + rig.userData.bobPhase));
        rig.userData.glow.material.opacity = 0.4 + blink * 0.6;
      }
      const link = rig.userData.link;
      if (link) {
        const posAttr = link.geometry.attributes.position;
        posAttr.setXYZ(1, rig.position.x, rig.position.y, rig.position.z);
        posAttr.needsUpdate = true;
        link.material.opacity = 0.08 + (0.5 + 0.5 * Math.sin(t * 0.8 + link.userData.phase)) * 0.12;
      }
    });

    const posAttr = particleGeo.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      let y = posAttr.getY(i) + particleVelocities[i] * 0.02;
      if (y > 4.6) y = -4.6;
      if (y < -4.6) y = 4.6;
      posAttr.setY(i, y);
    }
    posAttr.needsUpdate = true;

    // Idle "alive" auto-rotation, gently eased toward mouse parallax too.
    targetCam.x += (mouse.x * 0.6 - targetCam.x) * 0.04;
    targetCam.y += (-mouse.y * 0.4 - targetCam.y) * 0.04;
    camera.position.x = targetCam.x;
    camera.position.y = targetCam.y;
    camera.lookAt(0, 0, 0);
    world.rotation.y = Math.sin(t * 0.05) * 0.15 + t * 0.015;

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

  // Always render one frame so reduced-motion users still see the scene.
  renderFrame();

  if (!reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => (entry.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    );
    observer.observe(heroSection);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (heroInView(heroSection)) start();
    });
  }
}

function heroInView(el) {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

/** Stylised CCTV camera: body + lens + glowing "recording" dot + faint FOV cone. */
function createCameraModel() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.19, 0.55, 12),
    new THREE.MeshStandardMaterial({ color: BODY_DARK, metalness: 0.6, roughness: 0.4 })
  );
  body.rotation.z = Math.PI / 2;
  group.add(body);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: LENS_DARK, metalness: 0.8, roughness: 0.2 })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = 0.34;
  group.add(lens);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.9 })
  );
  glow.position.set(-0.05, 0.14, 0);
  group.add(glow);
  group.userData.glow = glow;

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.85, 2, 20, 1, true),
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
  cone.position.x = 1.35;
  group.add(cone);

  const mount = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: BODY_DARK, metalness: 0.5, roughness: 0.5 })
  );
  mount.position.set(-0.2, -0.12, 0);
  group.add(mount);

  return group;
}

/** Small radial-gradient sprite used as the point material's texture, so
 *  particles render as soft glowing dots instead of hard-edged squares. */
function makeSoftDotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
