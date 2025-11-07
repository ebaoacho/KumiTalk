"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function isiOS() {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

export default function ClientAR() {
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string>("initial");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        if (isiOS()) { setXrSupported(false); return; }
        const ok = !!(navigator as any).xr
          && await (navigator as any).xr.isSessionSupported?.("immersive-ar");
        setXrSupported(!!ok);
      } catch {
        setXrSupported(false);
      }
    })();
  }, []);

  const startXR = async () => {
    setStatus("starting XR…");
    const xr = (navigator as any).xr;
    if (!xr) { setStatus("XR not available"); return; }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current?.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    const geo = new THREE.TorusKnotGeometry(0.05, 0.015, 100, 16);
    const mat = new THREE.MeshNormalMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -0.5);
    scene.add(mesh);

    const session = await xr.requestSession("immersive-ar", { requiredFeatures: [] });
    renderer.xr.setSession(session);

    const animate = () => {
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    setStatus("XR running");
  };

  const iosARLink = useMemo(() => "/models/universe.reality", []);

  return (
    <div style={{marginTop: 16}}>
      <div style={{marginBottom: 8, fontFamily: "monospace"}}>
        status: {String(status)} / xrSupported: {String(xrSupported)}
      </div>

      {xrSupported === true && (
        <button onClick={startXR} style={{padding: "8px 12px", borderRadius: 8}}>
          Start AR (WebXR)
        </button>
      )}

      {xrSupported === false && isiOS() && (
        <a href={iosARLink} rel="ar"
           style={{display: "inline-block", padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8}}>
          View in AR (Quick Look)
        </a>
      )}

      {xrSupported === false && !isiOS() && (
        <p>この端末ではWebXR ARは未対応です（Chrome/Androidを推奨）。</p>
      )}

      <div ref={containerRef} style={{position: "fixed", inset: 0, pointerEvents: "none"}} />
    </div>
  );
}
