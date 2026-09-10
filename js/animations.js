/**
 * Site-wide motion layer: an animated "network" canvas background for
 * the home hero (drifting nodes + connecting lines, in the brand's
 * navy/blue/orange palette), a staggered entrance for the hero content,
 * and scroll-triggered reveals used across every page via the
 * `.reveal-up` / `.reveal-group` classes.
 *
 * Fully respects prefers-reduced-motion: the canvas still renders a
 * static frame (so the hero isn't empty) but never animates, and the
 * GSAP entrance/reveal animations are skipped entirely.
 */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  initNetworkCanvas(document.getElementById("page-network"), { reduceMotion, ambient: true });

  if (!reduceMotion && window.gsap) {
    initHeroEntrance();
    initScrollReveals();
  }
});

// ---------------------------------------------------------------------
// "CCTV network" animated canvas background.
//
// Layers, back to front:
//   1. Faint blueprint/schematic grid
//   2. Drifting particle nodes connected by thin lines
//   3. A handful of camera glyphs with a slowly panning field-of-view
//      cone and a blinking "recording" dot
//   4. A rotating radar-style sweep with a fading trail
//   5. A slow scanline band (CRT/monitor feel)
//   6. Occasional "motion detected" reticles that flash at a random
//      particle's position
//
// `ambient: true` renders everything a little dimmer/sparser — meant
// to sit fixed behind an entire page (e.g. the devis configurator)
// rather than inside a boxed hero.
// ---------------------------------------------------------------------
function initNetworkCanvas(canvas, { reduceMotion, ambient }) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dim = ambient ? 0.6 : 1;
  const LINK_DISTANCE = 140;
  const PARTICLE_COLORS = [
    `rgba(47,125,217,${0.9 * dim})`,
    `rgba(249,160,38,${0.9 * dim})`,
    `rgba(238,243,247,${0.55 * dim})`,
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let cameras = [];
  let reticles = [];
  let sweepAngle = Math.random() * Math.PI * 2;
  let scanY = 0;
  let frame = 0;
  let rafId = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticles() {
    const density = ambient ? 20000 : 14000;
    const count = Math.max(18, Math.min(ambient ? 45 : 70, Math.floor((width * height) / density)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
  }

  function makeCameras() {
    const count = ambient ? 3 : 5;
    cameras = Array.from({ length: count }, (_, i) => ({
      x: width * (0.12 + 0.76 * ((i + 0.5) / count)) + (Math.random() - 0.5) * 60,
      y: height * (0.18 + Math.random() * 0.55),
      baseAngle: Math.random() * Math.PI * 2,
      sweep: (Math.PI / 180) * 26,
      speed: 0.006 + Math.random() * 0.006,
      phase: Math.random() * Math.PI * 2,
      blinkPhase: Math.random() * Math.PI * 2,
    }));
  }

  function drawGrid() {
    const gap = 64;
    ctx.strokeStyle = `rgba(159,176,194,${0.05 * dim})`;
    ctx.lineWidth = 1;
    for (let x = (frame * 0.05) % gap; x < width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawLinks() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DISTANCE) {
          ctx.strokeStyle = `rgba(159,176,194,${0.2 * dim * (1 - dist / LINK_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCameras() {
    for (const cam of cameras) {
      const angle = cam.baseAngle + Math.sin(frame * cam.speed + cam.phase) * cam.sweep;
      const coneLength = ambient ? 130 : 190;
      const coneWidth = (Math.PI / 180) * 22;

      // Field-of-view cone
      const grad = ctx.createRadialGradient(cam.x, cam.y, 0, cam.x, cam.y, coneLength);
      grad.addColorStop(0, `rgba(249,160,38,${0.16 * dim})`);
      grad.addColorStop(1, "rgba(249,160,38,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.arc(cam.x, cam.y, coneLength, angle - coneWidth, angle + coneWidth);
      ctx.closePath();
      ctx.fill();

      // Camera body (small housing + lens)
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(238,243,247,${0.85 * dim})`;
      ctx.fillRect(-3, -5, 16, 10);
      ctx.beginPath();
      ctx.arc(13, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(47,125,217,${0.9 * dim})`;
      ctx.fill();
      ctx.restore();

      // Blinking "recording" dot
      const blink = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.04 + cam.blinkPhase));
      ctx.beginPath();
      ctx.fillStyle = `rgba(249,80,60,${blink * dim})`;
      ctx.arc(cam.x - 6, cam.y - 8, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSweep() {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const radius = Math.max(width, height) * 0.65;
    const sweepWidth = (Math.PI / 180) * 30;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(47,125,217,${0.1 * dim})`);
    grad.addColorStop(1, "rgba(47,125,217,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, sweepAngle - sweepWidth, sweepAngle + sweepWidth);
    ctx.closePath();
    ctx.fill();

    sweepAngle += 0.0035;
  }

  function drawScanline() {
    const bandHeight = 90;
    const grad = ctx.createLinearGradient(0, scanY - bandHeight, 0, scanY + bandHeight);
    grad.addColorStop(0, "rgba(159,176,194,0)");
    grad.addColorStop(0.5, `rgba(159,176,194,${0.05 * dim})`);
    grad.addColorStop(1, "rgba(159,176,194,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, scanY - bandHeight, width, bandHeight * 2);

    scanY += ambient ? 0.35 : 0.5;
    if (scanY > height + bandHeight) scanY = -bandHeight;
  }

  function maybeSpawnReticle() {
    const chance = ambient ? 0.006 : 0.01;
    if (particles.length > 0 && Math.random() < chance) {
      const p = particles[Math.floor(Math.random() * particles.length)];
      reticles.push({ x: p.x, y: p.y, life: 1, size: 34 + Math.random() * 14 });
    }
  }

  function drawReticles() {
    reticles = reticles.filter((r) => r.life > 0);
    for (const r of reticles) {
      const alpha = Math.min(1, r.life * 1.6) * dim;
      const s = r.size;
      const armLen = s * 0.28;
      ctx.strokeStyle = `rgba(249,160,38,${0.8 * alpha})`;
      ctx.lineWidth = 1.5;
      const corners = [
        [r.x - s / 2, r.y - s / 2, 1, 1],
        [r.x + s / 2, r.y - s / 2, -1, 1],
        [r.x - s / 2, r.y + s / 2, 1, -1],
        [r.x + s / 2, r.y + s / 2, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + armLen * dy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + armLen * dx, cy);
        ctx.stroke();
      }
      r.life -= 0.012;
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawSweep();
    drawScanline();
    drawLinks();
    drawParticles();
    drawCameras();
    drawReticles();
  }

  function step() {
    frame++;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }
    maybeSpawnReticle();
    drawFrame();
    rafId = requestAnimationFrame(step);
  }

  resize();
  makeParticles();
  makeCameras();
  drawFrame();
  if (!reduceMotion) rafId = requestAnimationFrame(step);

  window.addEventListener("resize", () => {
    resize();
    makeParticles();
    makeCameras();
    if (reduceMotion) drawFrame();
  });

  document.addEventListener("visibilitychange", () => {
    if (reduceMotion) return;
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(step);
    }
  });
}

// ---------------------------------------------------------------------
// Hero entrance — staggered fade/slide-in on load
// ---------------------------------------------------------------------
function initHeroEntrance() {
  if (!document.querySelector(".hero-title")) return;

  gsap
    .timeline({ defaults: { ease: "power3.out", duration: 0.8 } })
    .from(".hero-eyebrow", { y: 20, opacity: 0 })
    .from(".hero-title", { y: 30, opacity: 0 }, "-=0.5")
    .from(".hero-desc", { y: 20, opacity: 0 }, "-=0.5")
    .from(".hero-ctas", { y: 20, opacity: 0 }, "-=0.5")
    .from(".hero-stats", { y: 20, opacity: 0 }, "-=0.5")
    .from(".hero-panel", { x: 40, opacity: 0, duration: 1 }, "-=0.7");
}

// ---------------------------------------------------------------------
// Scroll-triggered reveals — add `.reveal-up` to any block that should
// fade/slide in on scroll, or `.reveal-group` to a container whose
// direct children should reveal with a stagger.
// ---------------------------------------------------------------------
function initScrollReveals() {
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(
      el,
      { y: 36, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      }
    );
  });

  gsap.utils.toArray(".reveal-group").forEach((group) => {
    gsap.fromTo(
      group.children,
      { y: 36, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 88%" },
      }
    );
  });
}
