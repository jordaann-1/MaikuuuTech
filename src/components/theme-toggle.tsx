'use client';
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
const eventName = 'maikuuu-theme-change';
function snapshot() {
  return document.documentElement.dataset.theme || 'dark';
}
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === 'maikuuu-theme') {
      document.documentElement.dataset.theme = event.newValue === 'light' ? 'light' : 'dark';
      callback();
    }
  };
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', storage);
  };
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'dark');
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('maikuuu-theme', next);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
    window.dispatchEvent(new Event(eventName));
  }
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
