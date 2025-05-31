"use client";

import React from "react";
import PontoonScene from "./3d/PontoonScene";

/**
 * Main application component for the pontoon configurator
 */
function App() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(to bottom, #a9d8ff 0%, #e6f6ff 100%)",
        overflow: "hidden",
      }}
    >
      <PontoonScene />
    </div>
  );
}

export default App;
