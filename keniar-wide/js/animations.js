/**
 * Site-wide motion layer: GSAP staggered entrance for the hero content
 * and scroll-triggered reveals used across every page via the
 * `.reveal-up` / `.reveal-group` classes.
 *
 * The animated 3D background (tunnel + CCTV sentries) lives in
 * js/scene-3d.js — this file only handles the 2D content animations
 * (text/card reveals), fully skipped under prefers-reduced-motion.
 */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  if (!reduceMotion && window.gsap) {
    initHeroEntrance();
    initScrollReveals();
  }
});

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
