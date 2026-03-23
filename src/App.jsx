import React, { useRef, useState, useEffect } from "react";
import KolkataMap from "./KolkataMap";
import Vegebatel from "./Vegebatel";
import DONOTWANT from "./DONOTWANT";
import "./App.css";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";

function App() {
  const [page, setPage] = useState("landing");

  useEffect(() => {
    document.body.classList.add("dark-mode");
  }, []);

  if (page === "heat") return <KolkataMap setPage={setPage} />;
  if (page === "vegetation") return <Vegebatel setPage={setPage} />;
  if (page === "donotwant") return <DONOTWANT setPage={setPage} />;

  return <Landing setPage={setPage} />;
}

export default App;

function Landing({ setPage }) {
  return (
    <div style={{ height: "100vh", background: "#0a0a0a", position: "relative" }}>
      {<Buttons setPage={setPage} />}
    </div>
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
    cursor: "pointer",
    fontSize: "100px",
  });

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden"
    }}>
      <div
        style={{
          position: "absolute",
          top: "40%",
          width: "100%",
          display: "grid",
          gridTemplateColumns: "auto auto auto",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <button style={makeStyle("#fcc11a")} onClick={() => setPage("heat")}>
          🌤️
        </button>

        <button style={makeStyle("#27c037")} onClick={() => setPage("vegetation")}>
          🌿
        </button>

        <button style={makeStyle("#00aaff")} onClick={() => setPage("donotwant")}>
          🌧️
        </button>

        <span> Heat Index </span>
        <span> Vegetation </span>
        <span> Precipitation </span>
      </div>
    </div>
  );
}
