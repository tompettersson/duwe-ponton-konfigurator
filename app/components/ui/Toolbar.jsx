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
import { LEVELS, TOOLS, PONTOON_COLORS, PONTOON_COLOR_NAMES } from "../../constants/grid";
import useStore from "../../store/useStore";

/**
 * Toolbar component for the pontoon configurator
 */
function Toolbar({
  onCameraSwitch,
  isPerspective,
}) {
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);
  
  // Get state from store
  const currentTool = useStore(state => state.tool.current);
  const currentLevel = useStore(state => state.grid.currentLevel);
  const pontoonColor = useStore(state => state.tool.pontoonColor);
  
  // Get actions from store
  const setCurrentTool = useStore(state => state.setCurrentTool);
  const setCurrentLevel = useStore(state => state.setCurrentLevel);
  const setPontoonColor = useStore(state => state.setPontoonColor);
  const clearGrid = useStore(state => state.clearGrid);

  const handleSelect = (tool) => {
    setCurrentTool(tool);
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
                  setCurrentLevel(level.id);
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

      {/* Color Selector */}
      <div className={styles.colorSelector}>
        <button
          className={`${styles.toolButton} ${
            isColorDropdownOpen ? styles.active : ""
          }`}
          onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
          aria-label="Farbe auswählen"
        >
          <div
            className={styles.colorSwatch}
            style={{ backgroundColor: pontoonColor }}
          />
        </button>
        {isColorDropdownOpen && (
          <div className={styles.colorDropup}>
            {Object.entries(PONTOON_COLORS).map(([key, color]) => (
              <div
                key={key}
                className={`${styles.colorOption} ${
                  color === pontoonColor ? styles.selected : ""
                }`}
                onClick={() => {
                  setPontoonColor(color);
                  setIsColorDropdownOpen(false);
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className={styles.colorSwatch}
                  style={{ backgroundColor: color }}
                />
                <span>{PONTOON_COLOR_NAMES[color]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Temporarily hidden - single pontoon not working
      <button
        onClick={() => handleSelect(TOOLS.SINGLE_PONTOON)}
        className={`${styles.toolButton} ${
          currentTool === TOOLS.SINGLE_PONTOON ? styles.active : ""
        }`}
        aria-label="Einzel-Ponton"
      >
        <SinglePontoonIcon />
      </button>
      */}

      <button
        onClick={() => handleSelect(TOOLS.DOUBLE_PONTOON)}
        className={`${styles.toolButton} ${
          currentTool === TOOLS.DOUBLE_PONTOON ? styles.active : ""
        }`}
        aria-label="Doppel-Ponton"
      >
        <DoublePontoonIcon />
      </button>

      <button
        onClick={() => handleSelect(TOOLS.DELETE_TOOL)}
        className={`${styles.toolButton} ${
          currentTool === TOOLS.DELETE_TOOL ? styles.active : ""
        }`}
        aria-label="Löschen"
      >
        <DeleteIcon />
      </button>

      <div className={styles.separator} />

      <button
        onClick={clearGrid}
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
