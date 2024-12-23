"use client";

import React, { useState } from "react";

function Toolbar({
  onSelect,
  onCameraSwitch,
  isPerspective,
  onLevelChange,
  currentLevel,
}) {
  const [selectedTool, setSelectedTool] = useState("");

  const handleSelect = (tool) => {
    setSelectedTool(tool);
    onSelect(tool);
  };

  return (
    <div className="fixed z-50 flex flex-col p-2 transform -translate-x-1/2 bg-white shadow-lg bottom-12 left-1/2 rounded-xl">
      <div className="flex mb-2">
        {[-1, 0, 1, 2].map((level) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className="flex items-center justify-center m-1 rounded-lg size-12 hover:cursor-pointer"
            style={{
              background: currentLevel === level ? "lightblue" : "white",
            }}
          >
            <span className="text-lg font-bold">{level}</span>
          </button>
        ))}
      </div>
      <div className="flex">
        <button
          onClick={() => handleSelect("singlePontoon")}
          className="flex items-center content-center justify-center p-1 m-2 rounded-lg size-12 hover:cursor-pointer"
          style={{
            background:
              selectedTool === "singlePontoon" ? "lightblue" : "white",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1 size-8"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z"
              stroke="black"
            />
          </svg>
        </button>
        <button
          onClick={() => handleSelect("doublePontoon")}
          className="flex items-center justify-center m-2 rounded-lg size-12 hover:cursor-pointer"
          style={{
            background:
              selectedTool === "doublePontoon" ? "lightblue" : "white",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1 size-8"
            viewBox="0 0 16 31"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2.062 15.5C0.832288 14.8176 0 13.506 0 12V4C0 1.79086 1.79086 0 4 0H12C14.2091 0 16 1.79086 16 4V12C16 13.506 15.1677 14.8176 13.938 15.5C15.1677 16.1824 16 17.494 16 19V27C16 29.2091 14.2091 31 12 31H4C1.79086 31 0 29.2091 0 27V19C0 17.494 0.832288 16.1824 2.062 15.5ZM4 1H12C13.6569 1 15 2.34315 15 4V12C15 13.6569 13.6569 15 12 15H4C2.34315 15 1 13.6569 1 12V4C1 2.34315 2.34315 1 4 1ZM12 16H4C2.34315 16 1 17.3431 1 19V27C1 28.6569 2.34315 30 4 30H12C13.6569 30 15 28.6569 15 27V19C15 17.3431 13.6569 16 12 16Z"
              fill="black"
            />
          </svg>
        </button>
        <button
          onClick={() => handleSelect("deleteTool")}
          className="flex items-center justify-center m-2 rounded-lg size-12"
          style={{
            background: selectedTool === "deleteTool" ? "lightblue" : "white",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 18 21"
            fill="none"
            className="size-8"
          >
            <path
              d="M11.99 7.75052L11.644 16.7505M6.856 16.7505L6.51 7.75052M16.478 4.54052C16.82 4.59252 17.16 4.64752 17.5 4.70652M16.478 4.54052L15.41 18.4235C15.3664 18.9887 15.1111 19.5167 14.695 19.9018C14.279 20.2868 13.7329 20.5007 13.166 20.5005H5.334C4.7671 20.5007 4.22102 20.2868 3.80498 19.9018C3.38894 19.5167 3.13359 18.9887 3.09 18.4235L2.022 4.54052M16.478 4.54052C15.3239 4.36604 14.1638 4.23362 13 4.14352M2.022 4.54052C1.68 4.59152 1.34 4.64652 1 4.70552M2.022 4.54052C3.17613 4.36604 4.33623 4.23362 5.5 4.14352M13 4.14352V3.22752C13 2.04752 12.09 1.06352 10.91 1.02652C9.80362 0.99116 8.69638 0.99116 7.59 1.02652C6.41 1.06352 5.5 2.04852 5.5 3.22752V4.14352M13 4.14352C10.5037 3.9506 7.99628 3.9506 5.5 4.14352"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={onCameraSwitch}
          className="flex flex-col items-center content-center justify-center pl-4 m-2 border-l border-gray-300 hover:cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 21 18"
            fill="none"
            className="size-8"
          >
            <path
              d="M5.577 3.42521C5.39699 3.71012 5.15682 3.95219 4.87334 4.13444C4.58985 4.31669 4.26993 4.43471 3.936 4.48021C3.556 4.53421 3.179 4.59221 2.802 4.65521C1.749 4.83021 1 5.75721 1 6.82421V15.2502C1 15.8469 1.23705 16.4192 1.65901 16.8412C2.08097 17.2632 2.65326 17.5002 3.25 17.5002H18.25C18.8467 17.5002 19.419 17.2632 19.841 16.8412C20.2629 16.4192 20.5 15.8469 20.5 15.2502V6.82421C20.5 5.75721 19.75 4.83021 18.698 4.65521C18.3207 4.59234 17.9427 4.53401 17.564 4.48021C17.2302 4.43457 16.9105 4.31649 16.6272 4.13424C16.3439 3.952 16.1039 3.71 15.924 3.42521L15.102 2.10921C14.9174 1.8093 14.6632 1.5583 14.361 1.37744C14.0589 1.19658 13.7175 1.0912 13.366 1.07021C11.6233 0.976598 9.87674 0.976598 8.134 1.07021C7.78245 1.0912 7.44114 1.19658 7.13896 1.37744C6.83678 1.5583 6.58262 1.8093 6.398 2.10921L5.577 3.42521Z"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15.25 10.0002C15.25 11.1937 14.7759 12.3383 13.932 13.1822C13.0881 14.0261 11.9435 14.5002 10.75 14.5002C9.55653 14.5002 8.41193 14.0261 7.56802 13.1822C6.72411 12.3383 6.25 11.1937 6.25 10.0002C6.25 8.80673 6.72411 7.66214 7.56802 6.81822C8.41193 5.97431 9.55653 5.50021 10.75 5.50021C11.9435 5.50021 13.0881 5.97431 13.932 6.81822C14.7759 7.66214 15.25 8.80673 15.25 10.0002ZM17.5 7.75021H17.508V7.75821H17.5V7.75021Z"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs text-center text-black transform">
            {isPerspective ? "3D" : "2D"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
