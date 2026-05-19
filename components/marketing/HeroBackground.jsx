"use client";

import { useEffect, useRef } from "react";

/**
 * Bold animated canvas background for the DC hero section.
 * High-visibility version with prominent floating particles,
 * thick connection lines, bold light sweeps, and pulsing orbs.
 */
export default function HeroBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        let animationId;
        let time = 0;
        let dpr = 1;
        let prefersReducedMotion = motionQuery.matches;
        let isInViewport = true;
        let isDocumentVisible = !document.hidden;
        let activeParticleCount = 36;
        let activeOrbCount = 3;
        let beamCount = 2;
        let connectionDistance = 145;
        let frameInterval = 1000 / 24;
        let lastFrameTime = 0;
        let useParticleGlow = true;
        const shouldAnimate = () =>
            !prefersReducedMotion && isInViewport && isDocumentVisible;

        const stopAnimation = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = undefined;
            }
        };

        const startAnimation = () => {
            if (!animationId && shouldAnimate()) {
                animationId = requestAnimationFrame(draw);
            }
        };

        const configureQuality = () => {
            const compact = window.innerWidth < 768;
            activeParticleCount = compact ? 22 : 36;
            activeOrbCount = compact ? 1 : 3;
            beamCount = compact ? 1 : 2;
            connectionDistance = compact ? 105 : 145;
            frameInterval = 1000 / (compact ? 15 : 24);
            useParticleGlow = !compact;
            dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.6);
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            configureQuality();
            const w = parent.offsetWidth;
            const h = parent.offsetHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
        };

        resize();
        window.addEventListener("resize", resize);

        // ── Particles ──
        const COUNT = 36;
        const particles = Array.from({ length: COUNT }, () => ({
            x: Math.random(),
            y: Math.random(),
            r: Math.random() * 4 + 2,            // bigger radius 2-6
            vx: (Math.random() - 0.5) * 0.001,   // faster
            vy: (Math.random() - 0.5) * 0.001,
            phase: Math.random() * Math.PI * 2,
        }));

        // ── Floating orbs (large glowing circles) ──
        const orbs = [
            { x: 0.15, y: 0.3, r: 140, speed: 0.0002, phase: 0 },
            { x: 0.75, y: 0.6, r: 120, speed: 0.00025, phase: 2 },
            { x: 0.5, y: 0.2, r: 160, speed: 0.00015, phase: 4 },
        ];

        const draw = (timestamp = 0) => {
            if (shouldAnimate() && timestamp && timestamp - lastFrameTime < frameInterval) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            lastFrameTime = timestamp || performance.now();
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            time += 0.016;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            // ── Base gradient (dark) ──
            const bg = ctx.createLinearGradient(0, 0, w, h);
            bg.addColorStop(0, "#050508");
            bg.addColorStop(0.5, "#08080e");
            bg.addColorStop(1, "#0a0a12");
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);

            // ── Moving grid ──
            const gridSize = 50;
            const gridOffX = (time * 12) % gridSize;
            const gridOffY = (time * 8) % gridSize;

            ctx.strokeStyle = "rgba(245, 238, 48, 0.06)";
            ctx.lineWidth = 0.8;
            for (let x = -gridSize + gridOffX; x < w + gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = -gridSize + gridOffY; y < h + gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // ── Pulsing orbs ──
            for (let index = 0; index < activeOrbCount; index++) {
                const orb = orbs[index];
                orb.x += Math.sin(time * 0.5 + orb.phase) * orb.speed;
                orb.y += Math.cos(time * 0.4 + orb.phase) * orb.speed;

                const ox = orb.x * w;
                const oy = orb.y * h;
                const pulseFactor = 1 + 0.2 * Math.sin(time + orb.phase);
                const radius = orb.r * pulseFactor;

                const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
                grad.addColorStop(0, "rgba(245, 238, 48, 0.12)");
                grad.addColorStop(0.4, "rgba(245, 238, 48, 0.05)");
                grad.addColorStop(1, "rgba(245, 238, 48, 0)");

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(ox, oy, radius, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── Bold sweeping light beams ──
            for (let i = 0; i < beamCount; i++) {
                const phase = time * 0.25 + i * Math.PI;
                const beamX = w * (0.5 + 0.7 * Math.sin(phase));
                const beamW = w * 0.2;

                const beamGrad = ctx.createLinearGradient(beamX - beamW, 0, beamX + beamW, 0);
                beamGrad.addColorStop(0, "rgba(245, 238, 48, 0)");
                beamGrad.addColorStop(0.5, `rgba(245, 238, 48, ${0.07 + 0.03 * Math.sin(time * 2 + i)})`);
                beamGrad.addColorStop(1, "rgba(245, 238, 48, 0)");

                ctx.fillStyle = beamGrad;
                ctx.fillRect(beamX - beamW, 0, beamW * 2, h);
            }

            // ── Diagonal light sweep (prominent) ──
            const sweepPos = ((time * 0.08) % 1.8 - 0.4);
            const sweepX = sweepPos * w;
            const sweepWidth = w * 0.35;

            ctx.save();
            ctx.translate(sweepX, 0);
            ctx.rotate(-0.35);
            const sweepGrad = ctx.createLinearGradient(0, 0, sweepWidth, 0);
            sweepGrad.addColorStop(0, "rgba(245, 238, 48, 0)");
            sweepGrad.addColorStop(0.35, "rgba(245, 238, 48, 0.06)");
            sweepGrad.addColorStop(0.65, "rgba(245, 238, 48, 0.06)");
            sweepGrad.addColorStop(1, "rgba(245, 238, 48, 0)");
            ctx.fillStyle = sweepGrad;
            ctx.fillRect(0, -h, sweepWidth, h * 3);
            ctx.restore();

            // ── Update + draw particles ──
            for (let index = 0; index < activeParticleCount; index++) {
                const p = particles[index];
                p.x += p.vx;
                p.y += p.vy;
                p.phase += 0.03;

                // Wrap
                if (p.x < -0.03) p.x = 1.03;
                if (p.x > 1.03) p.x = -0.03;
                if (p.y < -0.03) p.y = 1.03;
                if (p.y > 1.03) p.y = -0.03;

                const px = p.x * w;
                const py = p.y * h;
                const pulse = 0.6 + 0.4 * Math.sin(p.phase);
                const cr = p.r * pulse;

                if (useParticleGlow) {
                    const glow = ctx.createRadialGradient(px, py, 0, px, py, cr * 6);
                    glow.addColorStop(0, `rgba(245, 238, 48, ${0.25 * pulse})`);
                    glow.addColorStop(0.5, `rgba(245, 238, 48, ${0.08 * pulse})`);
                    glow.addColorStop(1, "rgba(245, 238, 48, 0)");
                    ctx.fillStyle = glow;
                    ctx.fillRect(px - cr * 6, py - cr * 6, cr * 12, cr * 12);
                }

                // Core dot
                ctx.beginPath();
                ctx.arc(px, py, cr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(200, 200, 220, ${0.5 * pulse})`;
                ctx.fill();

                // Bright center
                ctx.beginPath();
                ctx.arc(px, py, cr * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(245, 238, 48, ${0.4 * pulse})`;
                ctx.fill();
            }

            // ── Connection lines ──
            ctx.lineWidth = 1;
            for (let i = 0; i < activeParticleCount; i++) {
                for (let j = i + 1; j < activeParticleCount; j++) {
                    const dx = (particles[i].x - particles[j].x) * w;
                    const dy = (particles[i].y - particles[j].y) * h;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectionDistance) {
                        const alpha = (1 - dist / connectionDistance) * 0.15;
                        ctx.strokeStyle = `rgba(245, 238, 48, ${alpha})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x * w, particles[i].y * h);
                        ctx.lineTo(particles[j].x * w, particles[j].y * h);
                        ctx.stroke();
                    }
                }
            }

            // ── Edge vignette ──
            const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, Math.max(w, h) * 0.75);
            vig.addColorStop(0, "rgba(0, 0, 0, 0)");
            vig.addColorStop(1, "rgba(0, 0, 0, 0.08)");
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, w, h);

            if (shouldAnimate()) {
                animationId = requestAnimationFrame(draw);
            } else {
                animationId = undefined;
            }
        };

        draw();

        const handleMotionChange = (event) => {
            prefersReducedMotion = event.matches;
            if (prefersReducedMotion) {
                stopAnimation();
                draw();
                return;
            }

            startAnimation();
        };

        const handleVisibilityChange = () => {
            isDocumentVisible = !document.hidden;

            if (isDocumentVisible) {
                startAnimation();
            } else {
                stopAnimation();
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                isInViewport = entry.isIntersecting;

                if (isInViewport) {
                    startAnimation();
                } else {
                    stopAnimation();
                }
            },
            { rootMargin: "100px 0px" },
        );

        observer.observe(canvas);
        motionQuery.addEventListener("change", handleMotionChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            stopAnimation();
            observer.disconnect();
            window.removeEventListener("resize", resize);
            motionQuery.removeEventListener("change", handleMotionChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return (
        <>
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[#050508]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(245,238,48,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,238,48,0.05) 1px, transparent 1px), linear-gradient(135deg, rgba(245,238,48,0.10), rgba(0,0,0,0) 55%)",
                    backgroundSize: "56px 56px, 56px 56px, 100% 100%",
                }}
            />
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
            />
        </>
    );
}
