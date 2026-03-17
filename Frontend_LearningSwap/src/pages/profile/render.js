import {
  getNavbar,
  setupNavbarAuthActions,
  setupNavbarBurger,
  setupNavbarSectionLinks,
} from '../../components/navbar.js';
import { getUserInitials } from '../../utils/auth.js';
import {
  countUniqueSkills,
  createEmptyProfileStats,
  escapeHtml,
  getSkillList,
  renderEditableSkillTags,
  renderSkills,
} from './helpers.js';

export function renderProfile(
  app,
  user,
  profileStats = createEmptyProfileStats(),
  actions = {}
) {
  const avatarUrl = user.avatar_url || user.avatar || '';
  const initials = getUserInitials(
    user.first_name || user.name,
    user.last_name
  );
  const bio = (user.bio || user.about_me || '').trim();
  const membershipPlan = localStorage.getItem('user-membership') || null;
  const MEMBERSHIP_BADGES = {
  emerald: { label: 'Emerald', icon: 'sparkles-outline', color: '#10b981' },
  ruby:    { label: 'Ruby',    icon: 'rose-outline',     color: '#e11d48' },
  diamond: { label: 'Diamond', icon: 'diamond-outline',  color: '#6366f1' },
};
const badge = membershipPlan ? MEMBERSHIP_BADGES[membershipPlan] : null;
  const safeBio = escapeHtml(bio).replace(/\n/g, '<br>');
  const fullName = [user.first_name || user.name, user.last_name]
    .filter(Boolean)
    .join(' ');
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      })
    : 'Se unió recientemente';
  const teachSkills = getSkillList(user, 'teach');
  const learnSkills = getSkillList(user, 'learn');
  const offeredSkillsCount =
    profileStats.offeredSkills ?? countUniqueSkills(teachSkills);
  const sessionsCount = profileStats.sessions ?? 0;
  const parsedPoints = Number.parseInt(user?.points ?? user?.puntos ?? 0, 10);
  const pointsCount = Number.isNaN(parsedPoints) ? 0 : parsedPoints;

  app.innerHTML = `
    ${getNavbar()}

    <main class="profile-main">
      
      <!-- Hero Section -->
      <section class="profile-hero">
        <div class="profile-hero-bg"></div>
        <div class="profile-hero-content">

          <!-- Avatar -->
          <div class="profile-avatar">
            ${
              avatarUrl
                ? `<img class="profile-avatar-image" src="${escapeHtml(avatarUrl)}" alt="Foto de perfil" />`
                : `<span class="profile-avatar-initials">${initials}</span>`
            }
            <div class="profile-avatar-ring"></div>
          </div>

          <div class="profile-hero-info">
            <h1 class="profile-name">
              ${fullName || 'Usuario de Learning Swap'}
              ${badge ? `
                <span class="membership-badge" style="--badge-color: ${badge.color}">
                  <ion-icon name="${badge.icon}"></ion-icon>
                  ${badge.label}
              </span>
              ` : ''}
            </h1>
            <p class="profile-email">
              <ion-icon name="mail-outline"></ion-icon>
              ${user.email || ''}
            </p>
            ${
              user.phone
                ? `
            <p class="profile-phone">
              <ion-icon name="call-outline"></ion-icon>
              ${user.phone}
            </p>`
                : ''
            }
            <p class="profile-since">
              <ion-icon name="calendar-outline"></ion-icon>
              Miembro desde ${memberSince}
            </p>
          </div>

          <div class="profile-hero-actions">
            <button class="btn-profile-edit" id="btnEditProfile">
              <ion-icon name="create-outline"></ion-icon>
              Editar perfil
            </button>
            <button class="btn-profile-logout" id="btnLogout">
              <ion-icon name="log-out-outline"></ion-icon>
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>

      <!-- Stats Bar -->
      <section class="profile-stats">
        <div class="stat-card">
          <span class="stat-number">${offeredSkillsCount}</span>
          <span class="stat-label">Habilidades ofrecidas</span>
          <ion-icon name="school-outline"></ion-icon>
        </div>
        <div class="stat-card">
          <span class="stat-number">${sessionsCount}</span>
          <span class="stat-label">Sesiones realizadas</span>
          <ion-icon name="swap-horizontal-outline"></ion-icon>
        </div>
        <div class="stat-card">
          <span class="stat-number">0</span>
          <span class="stat-label">Personas ayudadas</span>
          <ion-icon name="people-outline"></ion-icon>
        </div>
        <div class="stat-card">
          <span class="stat-number" data-current-user-points>${pointsCount}</span>
          <span class="stat-label">Puntos ganados</span>
          <ion-icon name="star-outline"></ion-icon>
        </div>
      </section>

      <!-- Content Grid -->
      <section class="profile-grid">

        <!-- About Card -->
        <div class="profile-card" id="aboutCard">
          <div class="profile-card-header">
            <ion-icon name="person-circle-outline"></ion-icon>
            <h3>Sobre mí</h3>
          </div>
          <div class="profile-card-body" id="aboutBody">
            ${
              bio
                ? `<p class="profile-about-text">${safeBio}</p>`
                : `<p class="profile-placeholder">
              <ion-icon name="sparkles-outline"></ion-icon>
              Aún no tienes biografía — ¡cuéntale a la comunidad quién eres!
            </p>`
            }
          </div>
        </div>

        <!-- Skills Offered Card -->
        <div class="profile-card">
          <div class="profile-card-header">
            <ion-icon name="bulb-outline"></ion-icon>
            <h3>Habilidades que puedo enseñar</h3>
          </div>
          <div class="profile-card-body">
            <div class="skills-grid" id="skillsOffered">
              ${renderSkills(teachSkills, 'teach')}
            </div>
          </div>
        </div>

        <!-- Skills Wanted Card -->
        <div class="profile-card">
          <div class="profile-card-header">
            <ion-icon name="telescope-outline"></ion-icon>
            <h3>Habilidades que quiero aprender</h3>
          </div>
          <div class="profile-card-body">
            <div class="skills-grid" id="skillsWanted">
              ${renderSkills(learnSkills, 'learn')}
            </div>
          </div>
        </div>

        <!-- Account Info Card -->
        <div class="profile-card">
          <div class="profile-card-header">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <h3>Información de la cuenta</h3>
          </div>
          <div class="profile-card-body account-info">
            <div class="info-row">
              <span class="info-label">Nombre</span>
              <span class="info-value">${fullName || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Correo</span>
              <span class="info-value">${user.email || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono</span>
              <span class="info-value">${user.phone || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado</span>
              <span class="info-value info-badge">
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                Activa
              </span>
            </div>
          </div>
        </div>

      </section>

      <!-- Edit Profile Modal -->
      <div class="modal-overlay" id="editModal" hidden>
        <div class="modal">
          <div class="modal-header">
            <h3>Editar perfil</h3>
            <button class="modal-close" id="btnCloseModal">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          <form class="modal-form" id="editProfileForm">
            <div class="modal-input-group">
              <label>Nombre</label>
              <div class="modal-input">
                <ion-icon name="person-outline"></ion-icon>
                <input type="text" id="edit-firstname" value="${user.first_name || user.name || ''}" placeholder="Nombre" required>
              </div>
            </div>
            <div class="modal-input-group">
              <label>Apellido</label>
              <div class="modal-input">
                <ion-icon name="person-outline"></ion-icon>
                <input type="text" id="edit-lastname" value="${user.last_name || ''}" placeholder="Apellido" required>
              </div>
            </div>
            <div class="modal-input-group">
              <label>Teléfono</label>
              <div class="modal-input">
                <ion-icon name="call-outline"></ion-icon>
                <input type="tel" id="edit-phone" value="${user.phone || ''}" placeholder="Número de teléfono">
              </div>
            </div>
            <div class="modal-input-group">
              <label>Biografía</label>
              <div class="modal-input modal-input--textarea">
                <textarea id="edit-bio" rows="3" placeholder="Cuéntale a la comunidad quién eres">${escapeHtml(user.bio || user.about_me || '')}</textarea>
              </div>
            </div>
            <div class="modal-input-group">
              <label>Habilidades que puedo enseñar</label>
              <div class="modal-skill-editor">
                <div class="modal-skill-input-row">
                  <div class="modal-input">
                    <ion-icon name="bulb-outline"></ion-icon>
                    <input type="text" id="edit-teach-skill-input" placeholder="Ej: JavaScript">
                  </div>
                  <button type="button" class="btn-modal-skill-add" data-edit-skill-add="teach">
                    Agregar
                  </button>
                </div>
                <div class="modal-skill-list" id="edit-teach-skill-list">
                  ${renderEditableSkillTags(teachSkills, 'teach')}
                </div>
              </div>
            </div>
            <div class="modal-input-group">
              <label>Habilidades que quiero aprender</label>
              <div class="modal-skill-editor">
                <div class="modal-skill-input-row">
                  <div class="modal-input">
                    <ion-icon name="book-outline"></ion-icon>
                    <input type="text" id="edit-learn-skill-input" placeholder="Ej: Inglés">
                  </div>
                  <button type="button" class="btn-modal-skill-add" data-edit-skill-add="learn">
                    Agregar
                  </button>
                </div>
                <div class="modal-skill-list" id="edit-learn-skill-list">
                  ${renderEditableSkillTags(learnSkills, 'learn')}
                </div>
              </div>
            </div>
            <div class="modal-input-group">
              <label>Foto de perfil</label>
              <div class="modal-input modal-input--file">
                <input type="file" id="edit-avatar" accept="image/*">
              </div>
            </div>
            <div class="form-error" id="edit-error"></div>
            <div class="modal-actions">
              <button type="button" class="btn-modal-cancel" id="btnCancelEdit">Cancelar</button>
              <button type="submit" class="btn-modal-save">
                <ion-icon name="save-outline"></ion-icon>
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>

    </main>
  `;

  setupNavbarBurger();
  setupNavbarAuthActions();
  setupNavbarSectionLinks();

  if (typeof actions.setupProfileNavbar === 'function') {
    actions.setupProfileNavbar();
  }

  if (typeof actions.setupProfileActions === 'function') {
    actions.setupProfileActions(user);
  }
}