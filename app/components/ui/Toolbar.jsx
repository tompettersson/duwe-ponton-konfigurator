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
          aria-label="Ebene auswählen"
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
        aria-label="Einzel-Ponton"
      >
        <SinglePontoonIcon />
      </button>

      <button
        onClick={() => handleSelect(TOOLS.DOUBLE_PONTOON)}
        className={`${styles.toolButton} ${
          selectedTool === TOOLS.DOUBLE_PONTOON ? styles.active : ""
        }`}
        aria-label="Doppel-Ponton"
      >
        <DoublePontoonIcon />
      </button>

      <button
        onClick={() => handleSelect(TOOLS.DELETE_TOOL)}
        className={`${styles.toolButton} ${
          selectedTool === TOOLS.DELETE_TOOL ? styles.active : ""
        }`}
        aria-label="Löschen"
      >
        <DeleteIcon />
      </button>

      <div className={styles.separator} />

      <button
        onClick={onClear}
        className={`${styles.toolButton} ${styles.clearButton}`}
        aria-label="Alles löschen"
        title="Alle Pontons löschen"
      >
        <span className={styles.clearIcon}>🗑️</span>
        <span className={styles.clearLabel}>Löschen</span>
      </button>

      <div className={styles.separator} />

      <button
        onClick={onCameraSwitch}
        className={styles.toolButton}
        aria-label="Kamera wechseln"
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
