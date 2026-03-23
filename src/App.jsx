import React, { useRef, useState, useEffect } from "react";
import KolkataMap from "./KolkataMap";
import Vegebatel from "./Vegebatel";
import DONOTWANT from "./DONOTWANT";
import "./App.css";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

function App() {
  const [page, setPage] = useState("landing");

  useEffect(() => {
    document.body.classList.add("dark-mode");
  }, []);

  if (page === "heat") return <KolkataMap />;
  if (page === "vegetation") return <Vegebatel />;
  if (page == "donotwant") return <DONOTWANT />;

  return <Landing setPage={setPage} />;
}

export default App;





function Landing({ setPage }) {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowButtons(true), 4000);
  }, []);

  return (
    <div style={{ height: "100vh", background: "#0a0a0a", position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={1} />
        <MapModel />
      </Canvas>

      {showButtons && <Buttons setPage={setPage} />}
    </div>
  );
}




function MapModel({ onDone }) {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, "/Pp4p.png");
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    if (!meshRef.current) return;

    if (t < 2) {
      
      const scale = t / 2; // 0 → 1
      meshRef.current.scale.set(scale, scale, 1);
    } else if (t < 3) {
      
      const settle = 1 + Math.sin((t - 2) * Math.PI) * 0.05;
      meshRef.current.scale.set(settle, settle, 1);
    } else {
      
      meshRef.current.scale.set(1, 1, 1);
      onDone?.();
    }
  });

return (
  <mesh ref={meshRef} scale={[0, 0, 1]}>
    <planeGeometry args={[8, 6]} />
    <meshBasicMaterial map={texture} transparent />
  </mesh>
);
}



function Buttons({ setPage }) {
  const makeStyle = (color) => ({
    padding: "8px 14px",
    margin: "6px",
    borderRadius: "8px",
    border: `1px solid ${color}`,
    color: color,
    background: "transparent",
    boxShadow: `0 0 10px ${color}`,
    cursor: "pointer",
    fontSize: "12px",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "65%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        zIndex: 10,
      }}
    >
      <button style={makeStyle("yellow")} onClick={() => setPage("heat")}>
        HeatIndex
      </button>

      <button style={makeStyle("#27c037")} onClick={() => setPage("vegetation")}>
        Vegetation
      </button>

      <button style={makeStyle("#00aaff")} onClick={() => setPage("donotwant")}>
        Rainfall
      </button>

      <button style={makeStyle("#ff00ff")}>
        Predictor
      </button>
    </div>
  );
}