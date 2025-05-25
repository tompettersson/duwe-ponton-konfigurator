"use client";

import React, { useState } from "react";
import styles from "./Toolbar.module.css";
import {
  LevelIcon,
  SinglePontoonIcon,
  DoublePontoonIcon,
  DeleteIcon,
  CameraIcon,
} from "./Icons";
import { LEVELS, TOOLS } from "../../constants/grid";

/**
 * Toolbar component for the pontoon configurator
 */
function Toolbar({
  onSelect,
  onCameraSwitch,
  isPerspective,
  currentLevel,
  onLevelChange,
  onClear,
}) {
  const [selectedTool, setSelectedTool] = useState("");
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);

  const handleSelect = (tool) => {
    setSelectedTool(tool);
    onSelect(tool);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.levelSelector}>
        <button
          className={`${styles.toolButton} ${
            isLevelDropdownOpen ? styles.active : ""
          }`}
          onClick={() => setIsLevelDropdownOpen(!isLevelDropdownOpen)}
          aria-label="Select Level"
        >
          <LevelIcon />
          <span className={styles.levelDisplay}>{currentLevel}</span>
        </button>
        {isLevelDropdownOpen && (
          <div className={styles.levelDropup}>
            {LEVELS.map((level) => (
              <div
                key={level.id}
                className={`${styles.levelOption} ${
                  level.id === currentLevel ? styles.selected : ""
                }`}
                onClick={() => {
                  onLevelChange(level.id);
                  setIsLevelDropdownOpen(false);
                }}
                role="button"
                tabIndex={0}
              >
                {level.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => handleSelect(TOOLS.SINGLE_PONTOON)}
        className={`${styles.toolButton} ${
          selectedTool === TOOLS.SINGLE_PONTOON ? styles.active : ""
        }`}
        aria-label="Single Pontoon"
      >
        <SinglePontoonIcon />
      </button>

      <button
        onClick={() => handleSelect(TOOLS.DOUBLE_PONTOON)}
        className={`${styles.toolButton} ${
          selectedTool === TOOLS.DOUBLE_PONTOON ? styles.active : ""
        }`}
        aria-label="Double Pontoon"
      >
        <DoublePontoonIcon />
      </button>

      <button
        onClick={() => handleSelect(TOOLS.DELETE_TOOL)}
        className={`${styles.toolButton} ${
          selectedTool === TOOLS.DELETE_TOOL ? styles.active : ""
        }`}
        aria-label="Delete"
      >
        <DeleteIcon />
      </button>

      <div className={styles.separator} />

      <button
        onClick={onClear}
        className={`${styles.toolButton} ${styles.clearButton}`}
        aria-label="Clear All"
        title="Clear all pontoons"
      >
        <span className={styles.clearIcon}>🗑️</span>
        <span className={styles.clearLabel}>Clear</span>
      </button>

      <div className={styles.separator} />

      <button
        onClick={onCameraSwitch}
        className={styles.toolButton}
        aria-label="Switch Camera"
      >
        <CameraIcon />
        <span className={styles.cameraLabel}>
          {isPerspective ? "3D" : "2D"}
        </span>
      </button>
    </div>
  );
}

export default Toolbar;
