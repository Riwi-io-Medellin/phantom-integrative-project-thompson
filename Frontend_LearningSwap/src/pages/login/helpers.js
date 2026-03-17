import { loginUser } from '../../services/api.js';
import { getToken, saveUserData } from '../../utils/auth.js';

export function getUserIdFromResponse(data) {
  const candidates = [
    data?.user?.id,
    data?.data?.user?.id,
    data?.profile?.id,
    data?.id,
    data?.user_id,
    data?.data?.id,
    data?.data?.user_id,
  ];

  const found = candidates.find(
    (candidate) =>
      candidate !== undefined && candidate !== null && candidate !== ''
  );

  return found ?? null;
}

export async function ensureSessionAfterRegister(email, password) {
  if (getToken()) return true;

  if (!email || !password) return false;

  try {
    const loginData = await loginUser(email, password);
    saveUserData(loginData);
    return Boolean(getToken());
  } catch {
    return false;
  }
}

export async function navigateAfterAuthByRole(role) {
  if (role === 'admin') {
    const { AdminPage } = await import('../admin.js');
    AdminPage();
    return;
  }

  const { ProfilePage } = await import('../profile.js');
  ProfilePage();
}

export function getRegisterEmail() {
  return document.getElementById('register-email')?.value.trim() || '';
}

export function getRegisterPassword() {
  return document.getElementById('register-password')?.value || '';
}

export function normalizeSkill(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

export function clearError(el) {
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

export function setLoading(btn, loading, defaultLabel = '') {
  if (!btn) return;
  btn.disabled = loading;
  if (!btn.dataset.label) {
    btn.dataset.label = defaultLabel || btn.textContent;
  }
  btn.textContent = loading
    ? 'Cargando...'
    : btn.dataset.label || btn.textContent;
  if (!defaultLabel && !btn.dataset.label && !loading) {
    btn.textContent = btn.classList.contains('button-logIn')
      ? 'Iniciar sesion'
      : 'Registrarse';
  }
}
