"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ThreeConfettiProps = {
  active: boolean;
  className?: string;
};

const COLORS = [0x22d3ee, 0xfbbf24, 0x34d399, 0xa78bfa, 0xf472b6, 0x38bdf8, 0xfcd34d];

/**
 * Lightweight full-viewport particle confetti using Three.js (Points).
 * Renders only while `active`; pointer-events none for overlays.
 */
export function ThreeConfetti({ active, className = "" }: ThreeConfettiProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !mountRef.current) return;

    const mount = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    camera.position.set(0, 0, 45);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "block h-full w-full";
    mount.appendChild(renderer.domElement);

    const count = 280;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    type Particle = { vx: number; vy: number; vz: number; drag: number };
    const meta: Particle[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = 35 + Math.random() * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 35;

      const hex = COLORS[Math.floor(Math.random() * COLORS.length)]!;
      const c = new THREE.Color(hex);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      meta.push({
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.15 - Math.random() * 0.55,
        vz: (Math.random() - 0.5) * 0.25,
        drag: 0.998 + Math.random() * 0.002,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    function resetParticle(i: number) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = 38 + Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      meta[i]!.vx = (Math.random() - 0.5) * 0.5;
      meta[i]!.vy = -0.12 - Math.random() * 0.5;
      meta[i]!.vz = (Math.random() - 0.5) * 0.22;
    }

    function animate() {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const pos = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const m = meta[i]!;
        m.vx *= m.drag;
        m.vy -= 0.012 * dt * 60;
        m.vz *= m.drag;

        pos[i * 3] += m.vx * dt * 60;
        pos[i * 3 + 1] += m.vy * dt * 60;
        pos[i * 3 + 2] += m.vz * dt * 60;

        if (pos[i * 3 + 1] < -42) {
          resetParticle(i);
        }
      }

      geometry.attributes.position.needsUpdate = true;
      points.rotation.y += 0.0008 * dt * 60;
      points.rotation.z += 0.0004 * dt * 60;
      renderer.render(scene, camera);
    }

    raf = requestAnimationFrame(animate);

    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
      aria-hidden
    />
  );
}
