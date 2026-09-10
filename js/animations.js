
/**
 * Keniar Wide — enhanced motion system
 * - Cinematic CCTV/network background
 * - Moving data pulses between nodes
 * - Radar sweep + scanline
 * - Camera FOV/lens animation
 * - Motion-detection reticles
 * - Subtle mouse parallax
 * - Premium GSAP entrance/scroll reveals
 * - Full prefers-reduced-motion support
 */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  initSecurityCanvas(document.getElementById("hero-network"), {
    reduceMotion,
    ambient: false
  });

  initSecurityCanvas(document.getElementById("page-network"), {
    reduceMotion,
    ambient: true
  });

  if (!reduceMotion && window.gsap) {
    initHeroEntrance();
    initScrollReveals();
    initMagneticButtons();
  }
});

function initSecurityCanvas(canvas, { reduceMotion, ambient }) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dim = ambient ? 0.48 : 1;
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let cameras = [];
  let pulses = [];
  let reticles = [];
  let frame = 0;
  let rafId = null;
  let sweepAngle = Math.random() * Math.PI * 2;
  let scanY = -120;

  const maxParticles = ambient ? 42 : 68;
  const linkDistance = ambient ? 125 : 155;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    const density = ambient ? 23000 : 15000;
    const count = Math.max(
      18,
      Math.min(maxParticles, Math.floor((width * height) / density))
    );

    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (ambient ? 0.20 : 0.30),
      vy: (Math.random() - 0.5) * (ambient ? 0.20 : 0.30),
      r: 1 + Math.random() * 1.7,
      phase: Math.random() * Math.PI * 2,
      color: i % 7 === 0 ? "orange" : (i % 3 === 0 ? "light" : "blue")
    }));
  }

  function createCameras() {
    const count = ambient ? 3 : 5;

    cameras = Array.from({ length: count }, (_, i) => ({
      x: width * (0.12 + 0.76 * ((i + 0.5) / count)) + (Math.random() - 0.5) * 70,
      y: height * (0.18 + Math.random() * 0.58),
      angle: Math.random() * Math.PI * 2,
      sweep: (Math.PI / 180) * (18 + Math.random() * 13),
      speed: 0.004 + Math.random() * 0.004,
      phase: Math.random() * Math.PI * 2,
      blink: Math.random() * Math.PI * 2
    }));
  }

  function colorFor(p, alpha) {
    if (p.color === "orange") return `rgba(249,160,38,${alpha * dim})`;
    if (p.color === "light") return `rgba(238,243,247,${alpha * dim})`;
    return `rgba(47,125,217,${alpha * dim})`;
  }

  function drawGrid() {
    const gap = 58;
    const driftX = (frame * 0.018) % gap;
    const driftY = (frame * 0.010) % gap;

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(159,176,194,${0.045 * dim})`;

    for (let x = -gap + driftX; x < width + gap; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = -gap + driftY; y < height + gap; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Larger HUD crosshair in the hero
    if (!ambient) {
      const cx = width * 0.78;
      const cy = height * 0.46;
      const s = 105 + Math.sin(frame * 0.012) * 5;

      ctx.strokeStyle = `rgba(47,125,217,${0.10 * dim})`;
      ctx.beginPath();
      ctx.arc(cx, cy, s, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - s - 16, cy);
      ctx.lineTo(cx + s + 16, cy);
      ctx.moveTo(cx, cy - s - 16);
      ctx.lineTo(cx, cy + s + 16);
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
        const dist = Math.hypot(dx, dy);

        if (dist < linkDistance) {
          const alpha = 0.22 * (1 - dist / linkDistance) * dim;
          ctx.strokeStyle = `rgba(159,176,194,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Data pulse travelling along a live connection
          if (!reduceMotion && (i + j) % 9 === 0 && frame % 90 === (i * 7 + j * 3) % 90) {
            pulses.push({
              x1: a.x, y1: a.y,
              x2: b.x, y2: b.y,
              t: 0,
              speed: 0.018 + Math.random() * 0.018
            });
          }
        }
      }
    }
  }

  function drawPulses() {
    pulses = pulses.filter(p => p.t < 1);

    for (const p of pulses) {
      p.t += p.speed;

      const x = p.x1 + (p.x2 - p.x1) * p.t;
      const y = p.y1 + (p.y2 - p.y1) * p.t;

      ctx.beginPath();
      ctx.fillStyle = `rgba(249,160,38,${0.8 * (1 - p.t) * dim})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(249,160,38,${0.6 * dim})`;
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const pulse = 0.75 + Math.sin(frame * 0.025 + p.phase) * 0.25;

      ctx.beginPath();
      ctx.fillStyle = colorFor(p, 0.75 * pulse);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (p.color === "orange" && !ambient) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(249,160,38,${0.12 * dim})`;
        ctx.arc(p.x, p.y, p.r + 5 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawCameras() {
    for (const cam of cameras) {
      const angle =
        cam.angle +
        Math.sin(frame * cam.speed + cam.phase) * cam.sweep;

      const length = ambient ? 125 : 185;
      const cone = (Math.PI / 180) * 22;

      const grad = ctx.createRadialGradient(
        cam.x, cam.y, 0,
        cam.x, cam.y, length
      );
      grad.addColorStop(0, `rgba(249,160,38,${0.17 * dim})`);
      grad.addColorStop(0.42, `rgba(47,125,217,${0.045 * dim})`);
      grad.addColorStop(1, "rgba(47,125,217,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.arc(cam.x, cam.y, length, angle - cone, angle + cone);
      ctx.closePath();
      ctx.fill();

      // FOV edges
      ctx.strokeStyle = `rgba(249,160,38,${0.16 * dim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.lineTo(
        cam.x + Math.cos(angle - cone) * length,
        cam.y + Math.sin(angle - cone) * length
      );
      ctx.moveTo(cam.x, cam.y);
      ctx.lineTo(
        cam.x + Math.cos(angle + cone) * length,
        cam.y + Math.sin(angle + cone) * length
      );
      ctx.stroke();

      // Camera housing
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.rotate(angle);

      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(47,125,217,${0.35 * dim})`;
      ctx.fillStyle = `rgba(238,243,247,${0.9 * dim})`;
      ctx.fillRect(-4, -6, 17, 12);

      ctx.beginPath();
      ctx.fillStyle = `rgba(47,125,217,${0.95 * dim})`;
      ctx.arc(14, 0, 4.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();

      // REC indicator
      const blink = 0.25 + 0.75 * Math.abs(
        Math.sin(frame * 0.045 + cam.blink)
      );

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,70,60,${blink * dim})`;
      ctx.arc(cam.x - 7, cam.y - 10, 2.3, 0, Math.PI * 2);
      ctx.fill();

      if (!ambient) {
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = `rgba(159,176,194,${0.48 * dim})`;
        ctx.fillText("CAM", cam.x + 8, cam.y + 17);
      }
    }
  }

  function drawRadar() {
    const cx = width * (ambient ? 0.50 : 0.77);
    const cy = height * (ambient ? 0.50 : 0.46);
    const radius = Math.min(width, height) * (ambient ? 0.34 : 0.48);

    ctx.save();

    ctx.translate(
      (mouse.x - 0.5) * (ambient ? 4 : 10),
      (mouse.y - 0.5) * (ambient ? 4 : 10)
    );

    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = `rgba(47,125,217,${0.055 * dim})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (i / 3), 0, Math.PI * 2);
      ctx.stroke();
    }

    const widthArc = (Math.PI / 180) * 28;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(47,125,217,${0.12 * dim})`);
    grad.addColorStop(0.7, `rgba(47,125,217,${0.035 * dim})`);
    grad.addColorStop(1, "rgba(47,125,217,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, sweepAngle - widthArc, sweepAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(47,125,217,${0.32 * dim})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepAngle) * radius,
      cy + Math.sin(sweepAngle) * radius
    );
    ctx.stroke();

    ctx.restore();

    sweepAngle += ambient ? 0.0022 : 0.0038;
  }

  function drawScanline() {
    const band = ambient ? 70 : 95;
    const gradient = ctx.createLinearGradient(
      0, scanY - band,
      0, scanY + band
    );

    gradient.addColorStop(0, "rgba(159,176,194,0)");
    gradient.addColorStop(0.5, `rgba(159,176,194,${0.045 * dim})`);
    gradient.addColorStop(1, "rgba(159,176,194,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanY - band, width, band * 2);

    scanY += ambient ? 0.28 : 0.45;
    if (scanY > height + band) scanY = -band;
  }

  function spawnReticle() {
    if (particles.length === 0) return;

    const chance = ambient ? 0.003 : 0.007;

    if (Math.random() < chance) {
      const p = particles[Math.floor(Math.random() * particles.length)];
      reticles.push({
        x: p.x,
        y: p.y,
        life: 1,
        size: 32 + Math.random() * 26
      });
    }
  }

  function drawReticles() {
    reticles = reticles.filter(r => r.life > 0);

    for (const r of reticles) {
      const alpha = Math.min(1, r.life * 1.8) * dim;
      const size = r.size;
      const arm = size * 0.28;

      ctx.strokeStyle = `rgba(249,160,38,${0.85 * alpha})`;
      ctx.lineWidth = 1.4;

      const corners = [
        [r.x - size / 2, r.y - size / 2, 1, 1],
        [r.x + size / 2, r.y - size / 2, -1, 1],
        [r.x - size / 2, r.y + size / 2, 1, -1],
        [r.x + size / 2, r.y + size / 2, -1, -1]
      ];

      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x, y + arm * dy);
        ctx.lineTo(x, y);
        ctx.lineTo(x + arm * dx, y);
        ctx.stroke();
      }

      if (!ambient) {
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.fillStyle = `rgba(249,160,38,${0.7 * alpha})`;
        ctx.fillText("MOTION", r.x + size / 2 + 5, r.y);
      }

      r.life -= 0.018;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Subtle parallax without moving the actual DOM
    ctx.save();
    ctx.translate(
      (mouse.x - 0.5) * (ambient ? 2 : 6),
      (mouse.y - 0.5) * (ambient ? 2 : 6)
    );

    drawGrid();
    drawRadar();
    drawScanline();
    drawLinks();
    drawPulses();
    drawParticles();
    drawCameras();
    drawReticles();

    ctx.restore();
  }

  function update() {
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10 || p.x > width + 10) p.vx *= -1;
      if (p.y < -10 || p.y > height + 10) p.vy *= -1;
    }

    spawnReticle();
  }

  function step() {
    frame++;
    update();
    draw();
    rafId = requestAnimationFrame(step);
  }

  resize();
  createParticles();
  createCameras();
  draw();

  if (!reduceMotion) {
    rafId = requestAnimationFrame(step);

    const pointerMove = (event) => {
      mouse.tx = event.clientX / Math.max(window.innerWidth, 1);
      mouse.ty = event.clientY / Math.max(window.innerHeight, 1);
    };

    window.addEventListener("pointermove", pointerMove, { passive: true });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && !rafId) {
        rafId = requestAnimationFrame(step);
      }
    });
  }

  window.addEventListener("resize", () => {
    resize();
    createParticles();
    createCameras();
    draw();
  });
}

function initHeroEntrance() {
  const hero = document.querySelector("#hero");
  if (!hero) return;

  const tl = gsap.timeline({
    defaults: {
      ease: "power4.out"
    }
  });

  tl.from(".hero-eyebrow", {
    y: 24,
    opacity: 0,
    duration: 0.65
  })
  .from(".hero-title", {
    y: 46,
    opacity: 0,
    duration: 0.9
  }, "-=0.42")
  .from(".hero-desc", {
    y: 25,
    opacity: 0,
    duration: 0.7
  }, "-=0.55")
  .from(".hero-ctas", {
    y: 24,
    opacity: 0,
    duration: 0.65
  }, "-=0.45")
  .from(".hero-stats > div", {
    y: 18,
    opacity: 0,
    duration: 0.55,
    stagger: 0.09
  }, "-=0.38");

  const panel = document.querySelector(".hero-panel");
  if (panel) {
    tl.from(panel, {
      x: 70,
      y: 12,
      scale: 0.96,
      opacity: 0,
      duration: 1
    }, "-=0.9");
  }
}

function initScrollReveals() {
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.fromTo(
      el,
      { y: 44, opacity: 0, filter: "blur(5px)" },
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true
        }
      }
    );
  });

  gsap.utils.toArray(".reveal-group").forEach((group) => {
    gsap.fromTo(
      group.children,
      { y: 34, opacity: 0, scale: 0.985 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: {
          trigger: group,
          start: "top 88%",
          once: true
        }
      }
    );
  });
}

function initMagneticButtons() {
  const buttons = document.querySelectorAll(".btn-glow, .btn-glow-orange");

  buttons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      gsap.to(button, {
        x: x * 0.06,
        y: y * 0.06,
        duration: 0.25,
        ease: "power2.out",
        overwrite: true
      });
    });

    button.addEventListener("pointerleave", () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.4,
        ease: "elastic.out(1, 0.45)",
        overwrite: true
      });
    });
  });
}
