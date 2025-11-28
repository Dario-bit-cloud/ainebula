// Utility per logging condizionale (solo in sviluppo)
export const isDev = typeof window !== 'undefined' && (import.meta.env.DEV || window.location.hostname === 'localhost');

export const log = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

export const logWarn = (...args) => {
  if (isDev) {
    console.warn(...args);
  }
};

export const logError = (...args) => {
  // Gli errori vengono sempre loggati
  console.error(...args);
};

export const logDebug = (...args) => {
  if (isDev) {
    console.debug(...args);
  }
};

