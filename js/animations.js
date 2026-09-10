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

  initHeroNetwork(reduceMotion);

  if (!reduceMotion && window.gsap) {
    initHeroEntrance();
    initScrollReveals();
  }
});

// ---------------------------------------------------------------------
// Animated network background (hero canvas)
// ---------------------------------------------------------------------
function initHeroNetwork(reduceMotion) {
  const canvas = document.getElementById("hero-network");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const LINK_DISTANCE = 140;
  const PARTICLE_COLORS = ["rgba(47,125,217,0.9)", "rgba(249,160,38,0.9)", "rgba(238,243,247,0.55)"];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
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
    const count = Math.max(24, Math.min(70, Math.floor((width * height) / 14000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    }));
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DISTANCE) {
          ctx.strokeStyle = `rgba(159,176,194,${0.2 * (1 - dist / LINK_DISTANCE)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function step() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
    }
    drawFrame();
    rafId = requestAnimationFrame(step);
  }

  resize();
  makeParticles();
  drawFrame();
  if (!reduceMotion) rafId = requestAnimationFrame(step);

  window.addEventListener("resize", () => {
    resize();
    makeParticles();
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
