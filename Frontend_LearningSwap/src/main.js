import { HomePage } from './pages/home.js';
import { getCurrentUserRole, isAuthenticated } from './utils/auth.js';
import { initializeTheme } from './utils/theme.js';

initializeTheme();

const HOME_HASHES = new Set([
  '',
  '#home',
  '#hero',
  '#how',
  '#features',
  '#prices',
  '#why',
  '#cta',
]);

function cleanupRenderedView() {
  if (window.__homeCleanup) {
    window.__homeCleanup();
    window.__homeCleanup = null;
  }

  if (window.__homeScrollHandler) {
    window.removeEventListener('scroll', window.__homeScrollHandler);
    window.__homeScrollHandler = null;
  }

  if (window.__swapsCleanup) {
    window.__swapsCleanup();
    window.__swapsCleanup = null;
  }

  document.body.style.overflow = '';
}

async function initializeApp() {
  const path = window.location.hash || '#home';

  cleanupRenderedView();

  if (HOME_HASHES.has(path)) {
    const sectionId = path === '#home' || path === '' ? null : path.slice(1);
    HomePage(sectionId);
    return;
  }

  if (path === '#profile' && isAuthenticated()) {
    const { ProfilePage } = await import('./pages/profile.js');
    ProfilePage();
    return;
  }

  if (path === '#swaps' && isAuthenticated()) {
    const { SwapsPage } = await import('./pages/swaps.js');
    SwapsPage('matches');
    return;
  }

  if (path === '#chats' && isAuthenticated()) {
    const { ChatsPage } = await import('./pages/chats.js');
    ChatsPage();
    return;
  }

  if (path === '#admin' && isAuthenticated()) {
    if (getCurrentUserRole() === 'admin') {
      const { AdminPage } = await import('./pages/admin.js');
      AdminPage();
      return;
    }

    const { ProfilePage } = await import('./pages/profile.js');
    ProfilePage();
    return;
  }

  if (path === '#memberships' && isAuthenticated()) {
    const { MembershipsPage } = await import('./pages/memberships.js');
    MembershipsPage();
    return;
  }

  if (path === '#checkout' && isAuthenticated()) {
    const { CheckoutPage } = await import('./pages/checkout.js');
    CheckoutPage();
    return;
  }

  if (
    path === '#profile' ||
    path === '#swaps' ||
    path === '#chats' ||
    path === '#memberships' ||
    path === '#checkout' ||
    path === '#admin'
  ) {
    window.history.replaceState(null, '', '#home');
    HomePage();
    return;
  }

  window.history.replaceState(null, '', '#home');
  HomePage();

}

document.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('hashchange', initializeApp);
if (document.readyState !== 'loading') {
  initializeApp();
}
