/** Registers the worker that makes the admin installable; dev builds skip it so Vite's HMR isn't intercepted. */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', (): void => {
    void navigator.serviceWorker.register('/sw.js');
  });
};
