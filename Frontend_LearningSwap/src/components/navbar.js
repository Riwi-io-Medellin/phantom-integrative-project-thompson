/**
 * Navbar Component - Shared across all pages
 * Returns the navbar HTML structure
 */

import {
  getCurrentUser,
  getCurrentUserRole,
  isAuthenticated,
  logout,
} from '../utils/auth.js';
import {
  getResolvedTheme,
  isDarkThemeActive,
  toggleTheme,
} from '../utils/theme.js';

export function getNavbar() {
  const user = getCurrentUser();
  const authenticated = isAuthenticated();
  const darkModeActive = isDarkThemeActive() || getResolvedTheme() === 'dark';
  const themeButtonLabel = darkModeActive ? 'Claro' : 'Oscuro';
  const themeButtonIcon = darkModeActive ? 'sunny-outline' : 'moon-outline';
  const profileLabel = user?.first_name || user?.name || 'Perfil';
  const role = getCurrentUserRole();
  const isAdmin = role === 'admin';
  const themeDesktopAction = `
      <button class="btn secondary theme-toggle-btn" id="btnThemeToggle" type="button" aria-pressed="${
        darkModeActive ? 'true' : 'false'
      }" title="Cambiar tema">
        <ion-icon name="${themeButtonIcon}"></ion-icon>
        <span>${themeButtonLabel}</span>
      </button>
    `;
  const themeMobileAction = `
      <button class="btn secondary theme-toggle-btn" id="btnThemeToggleMobile" type="button" aria-pressed="${
        darkModeActive ? 'true' : 'false'
      }" title="Cambiar tema">
        <ion-icon name="${themeButtonIcon}"></ion-icon>
        <span>${themeButtonLabel}</span>
      </button>
    `;
  const adminDesktopAction = isAdmin
    ? '<a class="btn secondary navbar-swap-link" href="#admin">Admin</a>'
    : '';
  const adminMobileAction = isAdmin
    ? '<a class="btn secondary navbar-swap-link" href="#admin">Admin</a>'
    : '';

  const desktopActions = authenticated
    ? `
      <a class="btn secondary navbar-swap-link" href="#swaps">Swaps</a>
      <a class="btn secondary navbar-swap-link" href="#chats">Chats</a>
      ${adminDesktopAction}
      <button class="btn secondary" id="btnProfile">${profileLabel}</button>
      <button class="btn primary" id="btnLogoutNav">Cerrar sesión</button>
      ${themeDesktopAction}
    `
    : `
      <button class="btn secondary" id="btnLogin">Iniciar sesión</button>
      <button class="btn primary" id="btnSignup">Crear cuenta</button>
      ${themeDesktopAction}
    `;

  const mobileActions = authenticated
    ? `
      <a class="btn secondary navbar-swap-link" href="#swaps">Swaps</a>
      <a class="btn secondary navbar-swap-link" href="#chats">Chats</a>
      ${adminMobileAction}
      <button class="btn secondary" id="btnProfileMobile">${profileLabel}</button>
      <button class="btn primary" id="btnLogoutMobile">Cerrar sesión</button>
      ${themeMobileAction}
    `
    : `
      <button class="btn secondary" id="btnLoginMobile">Iniciar sesión</button>
      <button class="btn primary" id="btnSignupMobile">Crear cuenta</button>
      ${themeMobileAction}
    `;

  return `
        <!-- NAVBAR -->
        <header class="navbar">
            <div class="navbar-container">
                <a class="navbar-brand" href="#home" data-link>
                  <img class="navbar-logo" src="/assets/logos/logo.png" alt="Logo de Learning Swap" />
                    <span>Learning Swap</span>
                </a>

                <nav class="navbar-links">
                  <a href="#why" class="nav-link">Por qué nosotros</a>
                  <a href="#how" class="nav-link">Cómo funciona</a>
                  <a href="#features" class="nav-link">Funciones</a>
                  <a href="#prices" class="nav-link">Planes</a>
                  <a href="#cta" class="nav-link">Comenzar</a>
                </nav>

                <div class="navbar-actions">
                  ${desktopActions}
                </div>

                <button
                    class="navbar-burger"
                    id="navToggle"
                  aria-label="Abrir o cerrar menú"
                    aria-expanded="false"
                    aria-controls="navMobile"
                >
                    <span></span><span></span><span></span>
                </button>
            </div>

            <div class="navbar-mobile" id="navMobile">
                <a href="#how" class="nav-link">Cómo funciona</a>
                <a href="#features" class="nav-link">Funciones</a>
                <a href="#prices" class="nav-link">Planes</a>
                <a href="#why" class="nav-link">Por qué nosotros</a>
                <a href="#cta" class="nav-link">Comenzar</a>
                <div class="navbar-mobile-actions">
                  ${mobileActions}
                </div>
            </div>
        </header>
    `;
}

/**
 * Setup navbar burger for mobile menu toggle
 */
export function setupNavbarBurger() {
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navMobile.classList.toggle('open');
      navToggle.setAttribute(
        'aria-expanded',
        navToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
      );
    });
  }
}

export function setupNavbarAuthActions() {
  setupNavbarThemeToggle();

  const goProfile = async () => {
    const { ProfilePage } = await import('../pages/profile.js');
    ProfilePage();
  };

  document.getElementById('btnProfile')?.addEventListener('click', goProfile);
  document
    .getElementById('btnProfileMobile')
    ?.addEventListener('click', goProfile);

  document.getElementById('btnLogoutNav')?.addEventListener('click', () => {
    logout();
  });

  document.getElementById('btnLogoutMobile')?.addEventListener('click', () => {
    logout();
  });
}

export function setupNavbarSectionLinks() {
  const navLinks = Array.from(document.querySelectorAll('.navbar .nav-link'));
  if (!navLinks.length) return;

  navLinks.forEach((link) => {
    link.addEventListener('click', async (e) => {
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;

      const targetId = href.slice(1);
      if (!targetId) return;

      const isHomeRendered = Boolean(document.querySelector('.home'));
      if (isHomeRendered) return;

      e.preventDefault();

      document.body.classList.remove(
        'auth-page',
        'register-mode',
        'profile-page'
      );
      const { HomePage } = await import('../pages/home.js');
      HomePage(targetId);
    });
  });
}

function setupNavbarThemeToggle() {
  const syncThemeButtons = () => {
    const darkModeActive = isDarkThemeActive();
    const themeButtonLabel = darkModeActive ? 'Claro' : 'Oscuro';
    const themeButtonIcon = darkModeActive
      ? 'sunny-outline'
      : 'moon-outline';

    ['btnThemeToggle', 'btnThemeToggleMobile'].forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;

      button.setAttribute('aria-pressed', darkModeActive ? 'true' : 'false');
      button.innerHTML = `
        <ion-icon name="${themeButtonIcon}"></ion-icon>
        <span>${themeButtonLabel}</span>
      `;
    });
  };

  const onToggleTheme = () => {
    toggleTheme();
    syncThemeButtons();
  };

  const desktopToggle = document.getElementById('btnThemeToggle');
  const mobileToggle = document.getElementById('btnThemeToggleMobile');

  desktopToggle?.addEventListener('click', onToggleTheme);
  mobileToggle?.addEventListener('click', onToggleTheme);

  syncThemeButtons();
}
