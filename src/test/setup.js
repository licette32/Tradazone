import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix for happy-dom/jsdom localStorage.clear is not a function
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: (index) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
global.localStorage = localStorageMock;
