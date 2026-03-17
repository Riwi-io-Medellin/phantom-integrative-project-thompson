/**
 * Profile Page Component
 * Displays the authenticated user's profile
 */

import {
  getNavbar,
  setupNavbarAuthActions,
  setupNavbarBurger,
  setupNavbarSectionLinks,
} from '../components/navbar.js';
import {
  getCurrentUser,
  getCurrentUserId,
  logout,
} from '../utils/auth.js';
import {
  getMyProfile,
  saveOnboardingSkills,
  updateUserByIdFormData,
} from '../services/api.js';
import { saveUserData } from '../utils/auth.js';
import {
  getEditSkillValues,
  getProfilePayload,
  getProfileStats,
  getSkillList,
  normalizeSkillCollection,
  normalizeSkillInput,
  normalizeUserResponse,
  renderEditableSkillTags,
} from './profile/helpers.js';
import { renderProfile } from './profile/render.js';

export async function ProfilePage() {
  const app = document.getElementById('app');

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

  document.body.classList.remove('auth-page', 'register-mode', 'swaps-page');
  document.body.classList.add('profile-page');
  document.body.style.overflow = '';
  window.history.replaceState(null, '', '#profile');
  window.scrollTo({ top: 0, behavior: 'auto' });

  // Show skeleton while loading
  app.innerHTML = `
    ${getNavbar()}
    <main class="profile-main">
      <div class="profile-loading">
        <div class="spinner"></div>
        <p>Cargando tu perfil…</p>
      </div>
    </main>
  `;

  setupNavbarBurger();
  setupNavbarAuthActions();
  setupNavbarSectionLinks();
  setupProfileNavbar();

  // Fetch fresh data from DB only via user id endpoint
  let user = null;
  const localUser = getCurrentUser();
  const currentUserId =
    localUser?.id || localUser?.user_id || getCurrentUserId();

  try {
    user = await getMyProfile();

    user = normalizeUserResponse(getProfilePayload(user));
    // Update local cache with fresh data
    saveUserData({ user });
  } catch {
    user = localUser;
  }

  if (!user) {
    // Not logged in — send to login
    document.body.classList.remove('profile-page');
    const { LoginPage } = await import('./login.js');
    LoginPage();
    return;
  }

  const profileStats = await getProfileStats(user);

  renderProfile(app, user, profileStats, {
    setupProfileNavbar,
    setupProfileActions,
  });
}

// ─── Setup actions ────────────────────────────────────────────────────────────

function setupProfileNavbar() {
  const logoLink = document.querySelector('.navbar-brand');
  if (logoLink) {
    logoLink.addEventListener('click', async (e) => {
      e.preventDefault();
      document.body.classList.remove('profile-page');
      const { HomePage } = await import('./home.js');
      HomePage();
    });
  }
  // Home nav links
  const btnLogin = document.getElementById('btnLogin');
  const btnSignup = document.getElementById('btnSignup');
  const goLogin = async () => {
    document.body.classList.remove('profile-page');
    const { LoginPage } = await import('./login.js');
    LoginPage();
  };
  btnLogin?.addEventListener('click', goLogin);
  btnSignup?.addEventListener('click', goLogin);
}

function setupProfileActions(user) {
  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    document.body.classList.remove('profile-page');
    logout();
  });

  // Open edit modal
  const modal = document.getElementById('editModal');
  const editSkillInputs = {
    teach: document.getElementById('edit-teach-skill-input'),
    learn: document.getElementById('edit-learn-skill-input'),
  };
  const editSkillState = {
    teach: normalizeSkillCollection(getSkillList(user, 'teach')),
    learn: normalizeSkillCollection(getSkillList(user, 'learn')),
  };

  const renderEditSkillList = (type = 'teach') => {
    if (type !== 'teach' && type !== 'learn') return;

    const list = document.getElementById(`edit-${type}-skill-list`);
    if (!list) return;

    const normalizedSkills = normalizeSkillCollection(editSkillState[type]);
    editSkillState[type] = normalizedSkills;
    list.dataset.skills = JSON.stringify(normalizedSkills);
    list.innerHTML = renderEditableSkillTags(normalizedSkills, type);

    list.querySelectorAll('[data-edit-skill-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const skillType = button.getAttribute('data-edit-skill-remove');
        const index = Number.parseInt(
          button.getAttribute('data-edit-skill-index') || '-1',
          10
        );

        if (
          (skillType !== 'teach' && skillType !== 'learn') ||
          Number.isNaN(index) ||
          index < 0
        ) {
          return;
        }

        editSkillState[skillType] = (editSkillState[skillType] || []).filter(
          (_, itemIndex) => itemIndex !== index
        );
        renderEditSkillList(skillType);
      });
    });
  };

  const resetEditSkills = () => {
    editSkillState.teach = normalizeSkillCollection(getSkillList(user, 'teach'));
    editSkillState.learn = normalizeSkillCollection(getSkillList(user, 'learn'));
    Object.values(editSkillInputs).forEach((input) => {
      if (input) input.value = '';
    });
    renderEditSkillList('teach');
    renderEditSkillList('learn');
  };

  const addSkillToEditor = (type = 'teach') => {
    if (type !== 'teach' && type !== 'learn') return;

    const input = editSkillInputs[type];
    const normalizedSkill = normalizeSkillInput(input?.value || '');
    if (!normalizedSkill) return;

    const alreadyExists = (editSkillState[type] || []).some((skill) => {
      return String(skill || '').toLowerCase() === normalizedSkill.toLowerCase();
    });

    if (!alreadyExists) {
      editSkillState[type] = [...(editSkillState[type] || []), normalizedSkill];
      renderEditSkillList(type);
    }

    if (input) {
      input.value = '';
      input.focus();
    }
  };

  document.querySelectorAll('[data-edit-skill-add]').forEach((button) => {
    button.addEventListener('click', () => {
      addSkillToEditor(button.getAttribute('data-edit-skill-add') || 'teach');
    });
  });

  Object.entries(editSkillInputs).forEach(([type, input]) => {
    input?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addSkillToEditor(type);
    });
  });

  resetEditSkills();

  document.getElementById('btnEditProfile')?.addEventListener('click', () => {
    resetEditSkills();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  document
    .getElementById('btnCloseModal')
    ?.addEventListener('click', closeModal);
  document
    .getElementById('btnCancelEdit')
    ?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Edit form submit
  document
    .getElementById('editProfileForm')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleEditProfile();
    });
}

function closeModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
}

async function handleEditProfile() {
  const firstNameEl = document.getElementById('edit-firstname');
  const lastNameEl = document.getElementById('edit-lastname');
  const phoneEl = document.getElementById('edit-phone');
  const bioEl = document.getElementById('edit-bio');
  const avatarEl = document.getElementById('edit-avatar');
  const errorEl = document.getElementById('edit-error');
  const saveBtn = document.querySelector('.btn-modal-save');
  const userId =
    getCurrentUser()?.id || getCurrentUser()?.user_id || getCurrentUserId();

  const first_name = firstNameEl?.value.trim();
  const last_name = lastNameEl?.value.trim();
  const phone = phoneEl?.value.trim();
  const bio = bioEl?.value.trim();
  const avatarFile = avatarEl?.files?.[0] || null;
  const teach_skills = getEditSkillValues('teach');
  const learn_skills = getEditSkillValues('learn');

  if (!first_name || !last_name) {
    errorEl.textContent = 'El nombre y el apellido son obligatorios.';
    errorEl.style.display = 'block';
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando…';
  errorEl.style.display = 'none';

  try {
    if (!userId) {
      throw new Error('No se encontró user_id para actualizar el perfil.');
    }

    const updated = await updateUserByIdFormData(
      userId,
      {
        first_name,
        last_name,
        bio,
        phone,
      },
      avatarFile
    );

    await saveOnboardingSkills(learn_skills, teach_skills);

    let freshUser = null;

    try {
      const profileResponse = await getMyProfile();
      freshUser = normalizeUserResponse(getProfilePayload(profileResponse));
    } catch {
      freshUser = normalizeUserResponse({
        ...getCurrentUser(),
        ...getProfilePayload(updated),
      });
    }

    freshUser.learn_skills = normalizeSkillCollection(
      Array.isArray(freshUser.learn_skills) && freshUser.learn_skills.length > 0
        ? freshUser.learn_skills
        : learn_skills
    );
    freshUser.teach_skills = normalizeSkillCollection(
      Array.isArray(freshUser.teach_skills) && freshUser.teach_skills.length > 0
        ? freshUser.teach_skills
        : teach_skills
    );

    saveUserData({ user: freshUser });
    const updatedStats = await getProfileStats(freshUser);
    closeModal();
    // Re-render with updated data
    const app = document.getElementById('app');
    renderProfile(app, freshUser, updatedStats, {
      setupProfileNavbar,
      setupProfileActions,
    });
  } catch (err) {
    errorEl.textContent =
      err.message || 'No se pudo guardar. Inténtalo de nuevo.';
    errorEl.style.display = 'block';
    saveBtn.disabled = false;
    saveBtn.innerHTML =
      '<ion-icon name="save-outline"></ion-icon> Guardar cambios';
  }
}
