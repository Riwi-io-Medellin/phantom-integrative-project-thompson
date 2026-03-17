/**
 * Auth Utilities
 * Helper functions for authentication state management
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'userData';
const CURRENT_USER_ID_KEY = 'currentUser';
const LEGACY_USER_ID_KEY = 'user_id';
const ROLE_KEY = 'role';
const PENDING_ONBOARDING_KEY = 'pendingOnboarding';

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated() {
  if (isOnboardingPending()) return false;
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token;
}

/**
 * Save user data to localStorage after login/register
 */
export function saveUserData(data) {
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.authToken ||
    data?.user?.token ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  const directRole =
    data?.role ||
    data?.user?.role ||
    data?.data?.role ||
    data?.data?.user?.role ||
    data?.profile?.role;

  if (
    directRole !== undefined &&
    directRole !== null &&
    String(directRole).trim() !== ''
  ) {
    saveCurrentUserRole(directRole);
  }

  const directUserId =
    data?.user_id ||
    data?.user?.id ||
    data?.user?.user_id ||
    data?.data?.user_id ||
    data?.data?.user?.id ||
    data?.data?.user?.user_id ||
    data?.profile?.id ||
    data?.profile?.user_id ||
    data?.id;

  if (
    directUserId !== undefined &&
    directUserId !== null &&
    directUserId !== ''
  ) {
    saveCurrentUserId(directUserId);
  }

  const current = getCurrentUser() || {};
  const candidate =
    data?.user ||
    data?.data?.user ||
    data?.profile ||
    (data && typeof data === 'object' ? data : null);

  if (!candidate || typeof candidate !== 'object') return;

  const hasIdentityFields =
    'id' in candidate ||
    'user_id' in candidate ||
    'email' in candidate ||
    'first_name' in candidate ||
    'last_name' in candidate ||
    'name' in candidate ||
    'phone' in candidate ||
    'bio' in candidate ||
    'about_me' in candidate;

  if (!hasIdentityFields) return;

  const user = { ...current, ...candidate };
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  const persistedId = user.id ?? user.user_id;
  if (persistedId !== undefined && persistedId !== null && persistedId !== '') {
    saveCurrentUserId(persistedId);
  }

  const persistedRole = user.role ?? user.user_role;
  if (
    persistedRole !== undefined &&
    persistedRole !== null &&
    String(persistedRole).trim() !== ''
  ) {
    saveCurrentUserRole(persistedRole);
  }
}

/**
 * Get stored user data from localStorage
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    const user = JSON.parse(raw);
    if (!user || typeof user !== 'object') return null;

    if (
      (user.id === undefined || user.id === null || user.id === '') &&
      user.user_id !== undefined &&
      user.user_id !== null &&
      user.user_id !== ''
    ) {
      user.id = user.user_id;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Get the stored auth token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveCurrentUserId(userId) {
  localStorage.setItem(CURRENT_USER_ID_KEY, String(userId));
  localStorage.setItem(LEGACY_USER_ID_KEY, String(userId));
}

export function getCurrentUserId() {
  const storedId = localStorage.getItem(CURRENT_USER_ID_KEY);
  if (storedId) return storedId;

  const legacyStoredId = localStorage.getItem(LEGACY_USER_ID_KEY);
  if (legacyStoredId) {
    localStorage.setItem(CURRENT_USER_ID_KEY, legacyStoredId);
    return legacyStoredId;
  }

  const user = getCurrentUser();
  const userId = user?.id ?? user?.user_id ?? null;
  if (userId !== null && userId !== undefined && userId !== '') {
    saveCurrentUserId(userId);
    return String(userId);
  }

  const token = getToken();
  const tokenId = extractUserIdFromToken(token);
  if (tokenId !== null) {
    saveCurrentUserId(tokenId);
    return String(tokenId);
  }

  return null;
}

export function saveCurrentUserRole(role) {
  if (role === undefined || role === null) return;

  const normalizedRole = String(role).trim().toLowerCase();
  if (!normalizedRole) return;

  localStorage.setItem(ROLE_KEY, normalizedRole);
}

export function getCurrentUserRole() {
  const storedRole = localStorage.getItem(ROLE_KEY);
  if (storedRole && storedRole.trim()) {
    return storedRole.trim().toLowerCase();
  }

  const user = getCurrentUser();
  const candidateRole = user?.role ?? user?.user_role ?? null;
  if (
    candidateRole !== undefined &&
    candidateRole !== null &&
    String(candidateRole).trim() !== ''
  ) {
    saveCurrentUserRole(candidateRole);
    return String(candidateRole).trim().toLowerCase();
  }

  return null;
}

export function isAdminRole() {
  return getCurrentUserRole() === 'admin';
}

function extractUserIdFromToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  try {
    const payloadBase64 = token.split('.')[1];
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    );
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson);

    const candidate = payload?.user_id ?? payload?.id ?? payload?.sub ?? null;
    if (candidate === null || candidate === undefined || candidate === '') {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

export function setOnboardingPending(value) {
  if (value) {
    localStorage.setItem(PENDING_ONBOARDING_KEY, '1');
    return;
  }
  localStorage.removeItem(PENDING_ONBOARDING_KEY);
}

export function isOnboardingPending() {
  return localStorage.getItem(PENDING_ONBOARDING_KEY) === '1';
}

/**
 * Clear all auth data and navigate to home
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CURRENT_USER_ID_KEY);
  localStorage.removeItem(LEGACY_USER_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PENDING_ONBOARDING_KEY);

  // Remove auth classes from body
  document.body.classList.remove('auth-page', 'register-mode');

  // Navigate to home
  import('../pages/home.js').then(({ HomePage }) => {
    HomePage();
  });
}

/**
 * Get user initials from name (for avatar)
 */
export function getUserInitials(firstName = '', lastName = '') {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  return f + l || '?';
}
