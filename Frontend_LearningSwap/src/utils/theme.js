const THEME_STORAGE_KEY = 'learning-swap:theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';
const DARK_CLASS = 'theme-dark';

function normalizeTheme(theme) {
  return theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
}

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === DARK_THEME || stored === LIGHT_THEME) {
      return stored;
    }
  } catch {
    // Ignore storage access errors.
  }

  return null;
}

export function getSystemPreferredTheme() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return LIGHT_THEME;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? DARK_THEME
    : LIGHT_THEME;
}

export function getResolvedTheme() {
  return getStoredTheme() || getSystemPreferredTheme();
}

export function applyTheme(theme, options = {}) {
  const { persist = true } = options;
  const normalizedTheme = normalizeTheme(theme);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.documentElement.classList.toggle(
      DARK_CLASS,
      normalizedTheme === DARK_THEME
    );

    const syncBodyThemeClass = () => {
      if (!document.body) return;

      document.body.classList.toggle(
        DARK_CLASS,
        normalizedTheme === DARK_THEME
      );
    };

    if (document.body) {
      syncBodyThemeClass();
    } else {
      document.addEventListener('DOMContentLoaded', syncBodyThemeClass, {
        once: true,
      });
    }

    document.documentElement.style.colorScheme = normalizedTheme;
  }

  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    } catch {
      // Ignore storage write errors.
    }
  }

  return normalizedTheme;
}

export function initializeTheme() {
  return applyTheme(getResolvedTheme(), { persist: false });
}

export function isDarkThemeActive() {
  if (typeof document === 'undefined') return false;

  if (document.body?.classList.contains(DARK_CLASS)) {
    return true;
  }

  return document.documentElement.getAttribute('data-theme') === DARK_THEME;
}

export function toggleTheme() {
  const nextTheme = isDarkThemeActive() ? LIGHT_THEME : DARK_THEME;
  return applyTheme(nextTheme, { persist: true });
}
