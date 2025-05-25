// LocalStorage utilities for persisting state

const STORAGE_KEY = 'pontoon-configurator-state';

export const saveToLocalStorage = (state) => {
  try {
    const stateToSave = {
      project: state.project,
      grid: {
        size: state.grid.size,
        elements: state.grid.elements,
        currentLevel: state.grid.currentLevel,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

export const loadFromLocalStorage = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) return null;
    
    const parsed = JSON.parse(savedState);
    // Validate the loaded data structure
    if (parsed && parsed.project && parsed.grid) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

export const clearLocalStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    return false;
  }
};