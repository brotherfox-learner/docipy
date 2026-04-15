"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function createDocumentTexture(accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  roundedRect(context, 28, 28, 456, 648, 42);
  context.fillStyle = "#f8fbff";
  context.fill();

  context.strokeStyle = "rgba(148,163,184,0.28)";
  context.lineWidth = 3;
  context.stroke();

  roundedRect(context, 56, 58, 400, 96, 28);
  context.fillStyle = accent;
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.95)";
  context.fillRect(82, 92, 180, 12);
  context.fillRect(82, 118, 250, 10);

  context.fillStyle = "rgba(49,94,251,0.08)";
  for (let index = 0; index < 7; index += 1) {
    roundedRect(context, 56, 188 + index * 58, 400, 34, 17);
    context.fill();
  }

  context.fillStyle = "rgba(15,23,42,0.08)";
  context.fillRect(84, 524, 132, 70);
  context.fillRect(236, 524, 86, 70);
  context.fillRect(340, 524, 92, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function LandingHeroScene() {
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
    const pixelRatioCap = window.innerWidth < 768 ? 1.1 : 1.35;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "h-full w-full";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0.25, 7.4);

    const ambientLight = new THREE.AmbientLight(0xe2f2ff, 1.45);
    const topLight = new THREE.PointLight(0x63d7ff, 13, 22, 2);
    topLight.position.set(-1.8, 2.6, 4.5);
    const rimLight = new THREE.PointLight(0x4ade80, 7.5, 18, 2);
    rimLight.position.set(2.6, -1.2, 3.2);
    const coreLight = new THREE.PointLight(0x315efb, 12, 20, 2);
    coreLight.position.set(0, 0.6, 2.4);
    scene.add(ambientLight, topLight, rimLight, coreLight);

    const root = new THREE.Group();
    scene.add(root);

    const halo = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.45, 1),
      new THREE.MeshPhysicalMaterial({
        color: 0x6be5ff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.16,
        metalness: 0.04,
        transmission: 0.2,
        depthWrite: false,
      })
    );
    root.add(halo);

    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.04, 16, 120),
      new THREE.MeshBasicMaterial({
        color: 0x57d8ff,
        transparent: true,
        opacity: 0.32,
      })
    );
    ringA.rotation.x = Math.PI * 0.42;
    ringA.rotation.y = Math.PI * 0.18;
    root.add(ringA);

    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(1.78, 0.03, 16, 100),
      new THREE.MeshBasicMaterial({
        color: 0x315efb,
        transparent: true,
        opacity: 0.26,
      })
    );
    ringB.rotation.x = Math.PI * 0.68;
    ringB.rotation.z = Math.PI * 0.2;
    root.add(ringB);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.7, -1.15, -0.6),
      new THREE.Vector3(-1.15, 1.4, 0.75),
      new THREE.Vector3(0.4, 0.15, 0.45),
      new THREE.Vector3(1.55, -1.45, 0.2),
      new THREE.Vector3(2.55, 1.05, -0.65),
    ]);

    const trailGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
    const trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.34,
      })
    );
    root.add(trail);

    const textures = ["#315efb", "#0f9cf5", "#0ea5a4", "#14b8a6"].map((accent) =>
      createDocumentTexture(accent)
    );

    const documentGroup = new THREE.Group();
    const documentCards: THREE.Group[] = [];
    const cardOffsets = [
      { t: 0.1, scale: 1.08, rotationZ: -0.22, rotationY: 0.32 },
      { t: 0.3, scale: 0.94, rotationZ: 0.18, rotationY: -0.28 },
      { t: 0.5, scale: 1.02, rotationZ: -0.1, rotationY: 0.14 },
      { t: 0.7, scale: 0.9, rotationZ: 0.2, rotationY: -0.3 },
      { t: 0.88, scale: 1.12, rotationZ: -0.18, rotationY: 0.22 },
    ];

    cardOffsets.forEach((config, index) => {
      const group = new THREE.Group();
      const geometry = new THREE.PlaneGeometry(1.26, 1.78, 1, 1);
      const texture = textures[index % textures.length] ?? null;
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture,
        transparent: true,
        opacity: 0.98,
        roughness: 0.3,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: 0xd8e7ff,
          transparent: true,
          opacity: 0.26,
        })
      );

      const point = curve.getPointAt(config.t);
      group.position.copy(point);
      group.scale.setScalar(config.scale);
      group.rotation.z = config.rotationZ;
      group.rotation.y = config.rotationY;
      group.userData = {
        baseX: point.x,
        baseY: point.y,
        baseZ: point.z,
        rotationZ: config.rotationZ,
        rotationY: config.rotationY,
        phase: index * 0.75,
      };

      group.add(mesh);
      group.add(outline);
      documentGroup.add(group);
      documentCards.push(group);
    });

    root.add(documentGroup);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 96;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.2 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
      particlePositions[index * 3 + 2] = radius * Math.cos(phi) * 0.65;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0x9fe8ff,
        size: 0.035,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      })
    );
    root.add(particles);

    const observer = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    });
    observer.observe(container);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!mediaQuery.matches) {
        root.rotation.y = elapsed * 0.16;
        root.rotation.x = Math.sin(elapsed * 0.38) * 0.08;
        ringA.rotation.z = elapsed * 0.18;
        ringB.rotation.x = Math.PI * 0.68 + elapsed * 0.12;
        halo.rotation.y = -elapsed * 0.14;
        halo.scale.setScalar(1 + Math.sin(elapsed * 0.9) * 0.035);
        particles.rotation.y = -elapsed * 0.045;
        particles.rotation.z = elapsed * 0.02;

        documentCards.forEach((group) => {
          const data = group.userData as {
            baseX: number;
            baseY: number;
            baseZ: number;
            rotationZ: number;
            rotationY: number;
            phase: number;
          };
          group.position.x = data.baseX + Math.sin(elapsed * 0.45 + data.phase) * 0.14;
          group.position.y = data.baseY + Math.cos(elapsed * 0.7 + data.phase) * 0.18;
          group.position.z = data.baseZ + Math.sin(elapsed * 0.5 + data.phase) * 0.2;
          group.rotation.z = data.rotationZ + Math.sin(elapsed * 0.55 + data.phase) * 0.06;
          group.rotation.y = data.rotationY + Math.cos(elapsed * 0.42 + data.phase) * 0.08;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      textures.forEach((texture) => texture?.dispose());
      trailGeometry.dispose();
      (trail.material as THREE.Material).dispose();
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      (halo.geometry as THREE.BufferGeometry).dispose();
      (halo.material as THREE.Material).dispose();
      (ringA.geometry as THREE.BufferGeometry).dispose();
      (ringA.material as THREE.Material).dispose();
      (ringB.geometry as THREE.BufferGeometry).dispose();
      (ringB.material as THREE.Material).dispose();
      documentCards.forEach((group) => {
        group.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) {
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            const material = mesh.material;
            if (Array.isArray(material)) {
              material.forEach((item) => item.dispose());
            } else {
              material.dispose();
            }
          }
        });
      });
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden />;
}
