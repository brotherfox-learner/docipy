"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type LearnMapAmbientSceneProps = {
  height: number;
};

export function LearnMapAmbientScene({ height }: LearnMapAmbientSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId = 0;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.05));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "h-full w-full";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.z = 10;

    const root = new THREE.Group();
    scene.add(root);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 1000;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 460;
      particlePositions[index * 3 + 1] = height * 0.5 - Math.random() * height;
      particlePositions[index * 3 + 2] = -40 - Math.random() * 30;
      particleSizes[index] = 0.9 + Math.random() * 2.5;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        colorA: { value: new THREE.Color(0xe0f2fe) },
        colorB: { value: new THREE.Color(0x7dd3fc) },
      },
      vertexShader: `
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying float vSize;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.3;
          vec3 color = mix(colorA, colorB, clamp(vSize / 3.2, 0.0, 1.0));
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    root.add(particles);

    const orbGeometry = new THREE.BufferGeometry();
    const orbCount = 100;
    const orbPositions = new Float32Array(orbCount * 3);
    const orbSizes = new Float32Array(orbCount);
    for (let index = 0; index < orbCount; index += 1) {
      orbPositions[index * 3] = (Math.random() - 0.5) * 420;
      orbPositions[index * 3 + 1] = height * 0.5 - Math.random() * height;
      orbPositions[index * 3 + 2] = -65 - Math.random() * 18;
      orbSizes[index] = 3.6 + Math.random() * 5.8;
    }
    orbGeometry.setAttribute("position", new THREE.BufferAttribute(orbPositions, 3));
    orbGeometry.setAttribute("size", new THREE.BufferAttribute(orbSizes, 1));

    const orbMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        colorA: { value: new THREE.Color(0xe0f2fe) },
        colorB: { value: new THREE.Color(0x93c5fd) },
      },
      vertexShader: `
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying float vSize;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.18;
          vec3 color = mix(colorA, colorB, clamp(vSize / 8.0, 0.0, 1.0));
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const orbs = new THREE.Points(orbGeometry, orbMaterial);
    root.add(orbs);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 300;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      starPositions[index * 3] = (Math.random() - 0.5) * 440;
      starPositions[index * 3 + 1] = height * 0.5 - Math.random() * height;
      starPositions[index * 3 + 2] = -20 - Math.random() * 20;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.62,
        sizeAttenuation: false,
        depthWrite: false,
      })
    );
    root.add(stars);

    const updateCamera = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.left = -clientWidth / 2;
      camera.right = clientWidth / 2;
      camera.top = clientHeight / 2;
      camera.bottom = -clientHeight / 2;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(updateCamera);
    observer.observe(container);
    updateCamera();

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!mediaQuery.matches) {
        particles.rotation.z = elapsed * 0.006;
        stars.rotation.z = -elapsed * 0.003;
        orbs.rotation.z = elapsed * 0.0025;
        orbs.position.y = Math.sin(elapsed * 0.08) * 10;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      orbGeometry.dispose();
      orbMaterial.dispose();
      starGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      container.removeChild(renderer.domElement);
    };
  }, [height]);

  return <div ref={containerRef} className="absolute inset-0 opacity-85" aria-hidden />;
}
