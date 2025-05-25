"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Simple toast notification component
 */
function Toast({ message, type = "error", duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const baseStyles = {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "12px 20px",
    borderRadius: "8px",
    color: "white",
    fontWeight: "500",
    fontSize: "14px",
    zIndex: 9999,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    animation: "slideIn 0.3s ease-out",
    maxWidth: "320px",
    wordWrap: "break-word"
  };

  const typeStyles = {
    error: { backgroundColor: "#ef4444" },
    warning: { backgroundColor: "#f59e0b" },
    info: { backgroundColor: "#3b82f6" },
    success: { backgroundColor: "#10b981" }
  };

  const combinedStyles = { ...baseStyles, ...typeStyles[type] };

  return createPortal(
    <div style={combinedStyles}>
      {message}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default Toast;