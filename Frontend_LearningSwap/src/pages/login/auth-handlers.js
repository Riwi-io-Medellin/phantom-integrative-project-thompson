import {
  loginUser,
  registerUser,
  saveOnboardingSkills,
} from '../../services/api.js';
import {
  getCurrentUser,
  getCurrentUserId,
  getCurrentUserRole,
  saveCurrentUserId,
  saveUserData,
  setOnboardingPending,
} from '../../utils/auth.js';
import {
  clearError,
  ensureSessionAfterRegister,
  getRegisterEmail,
  getRegisterPassword,
  getUserIdFromResponse,
  navigateAfterAuthByRole,
  setLoading,
  showError,
} from './helpers.js';

export async function handleLoginRequest() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errorEl = document.getElementById('login-error');
  const btn = document.querySelector('#form-sign-in .button-logIn');

  if (!email || !password) {
    showError(errorEl, 'Por favor completa todos los campos.');
    return;
  }

  setLoading(btn, true);
  clearError(errorEl);

  try {
    const data = await loginUser(email, password);
    saveUserData(data);
    setOnboardingPending(false);

    if (!getCurrentUser()) {
      saveUserData({ user: { email } });
    }

    await navigateAfterAuthByRole(getCurrentUserRole());
  } catch (error) {
    showError(
      errorEl,
      error.message || 'El inicio de sesión falló. Inténtalo de nuevo.'
    );
  } finally {
    setLoading(btn, false);
  }
}

export async function handleRegisterRequest(registerState, showRegisterStep) {
  const firstName = document.getElementById('register-firstname')?.value.trim();
  const lastName = document.getElementById('register-lastname')?.value.trim();
  const email = document.getElementById('register-email')?.value.trim();
  const password = document.getElementById('register-password')?.value;
  const phone = document.getElementById('register-phone')?.value.trim();
  const errorEl = document.getElementById('register-error');
  const btn = document.getElementById('register-next');

  if (registerState.userId) {
    showRegisterStep(2);
    return;
  }

  if (!firstName || !lastName || !email || !password || !phone) {
    showError(errorEl, 'Por favor completa todos los campos.');
    return;
  }

  setLoading(btn, true);
  clearError(errorEl);

  try {
    const data = await registerUser(firstName, lastName, email, password, phone);
    saveUserData(data);
    registerState.email = email;
    registerState.password = password;

    const hasSession = await ensureSessionAfterRegister(email, password);

    if (!hasSession) {
      throw new Error(
        'Tu cuenta fue creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión para continuar.'
      );
    }

    const userId = getUserIdFromResponse(data);

    if (userId) {
      saveCurrentUserId(userId);
    }

    setOnboardingPending(true);

    saveUserData({
      user: {
        ...(getCurrentUser() || {}),
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      },
    });

    registerState.userId =
      userId || getCurrentUser()?.id || getCurrentUserId() || null;

    showRegisterStep(2);
  } catch (error) {
    showError(
      errorEl,
      error.message || 'El registro falló. Inténtalo de nuevo.'
    );
  } finally {
    setLoading(btn, false);
  }
}

export async function handleSkillsSubmitRequest(registerState) {
  const errorEl = document.getElementById('register-error');
  const btn = document.getElementById('register-submit');
  const registerEmail = registerState.email || getRegisterEmail();
  const registerPassword = registerState.password || getRegisterPassword();
  const learnSkills = Array.isArray(registerState.learnSkills)
    ? registerState.learnSkills
    : [];
  const teachSkills = Array.isArray(registerState.teachSkills)
    ? registerState.teachSkills
    : [];

  if (learnSkills.length === 0 || teachSkills.length === 0) {
    showError(
      errorEl,
      'Agrega al menos una habilidad para aprender y una para enseñar.'
    );
    return;
  }

  if (!registerState.userId) {
    registerState.userId = getCurrentUserId() || null;
  }

  setLoading(btn, true, 'Guardar habilidades');
  clearError(errorEl);

  try {
    const hasSession = await ensureSessionAfterRegister(
      registerEmail,
      registerPassword
    );

    if (!hasSession) {
      throw new Error(
        'Tu cuenta fue creada, pero no se pudo iniciar sesión automáticamente. Inicia sesión para continuar.'
      );
    }

    await saveOnboardingSkills(learnSkills, teachSkills);

    setOnboardingPending(false);

    const currentUser = getCurrentUser() || {};
    const resolvedUserId =
      registerState.userId ||
      currentUser?.id ||
      currentUser?.user_id ||
      getCurrentUserId() ||
      null;

    saveUserData({
      user: {
        ...currentUser,
        ...(resolvedUserId ? { id: resolvedUserId } : {}),
        learn_skills: [...learnSkills],
        teach_skills: [...teachSkills],
      },
    });

    await navigateAfterAuthByRole(getCurrentUserRole());
  } catch (error) {
    showError(
      errorEl,
      error.message ||
        'No se pudieron guardar las habilidades. Inténtalo de nuevo.'
    );
  } finally {
    setLoading(btn, false, 'Guardar habilidades');
  }
}