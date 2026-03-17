import { getMatchAvatar } from './avatar-utils.js';
import { groupFeedProfilesByCategory } from './feed-categorization.js';
import { getFeedProfileId, normalizeSkillList } from './data-normalizers.js';
import { escapeHtml } from './ui-utils.js';

export function renderFeedLoadingState() {
  return `
    <article class="nft-card nft-card--feed-state">
      <p class="feed-card-empty-text">Cargando perfiles sugeridos...</p>
    </article>
  `;
}

export function renderFeedEmptyState() {
  return `
    <article class="nft-card nft-card--feed-state">
      <p class="feed-card-empty-text">
        No hay perfiles disponibles en tu feed por ahora.
      </p>
    </article>
  `;
}

export function renderFeedCategoryCarousel(category, index) {
  const carouselId = `feed-${escapeHtml(category.key)}-${index}`;
  const cardsMarkup = category.profiles.map((profile) => renderFeedSwipeCard(profile)).join('');

  return `
    <section class="users-grid-section users-grid-section--feed-category">
      <div class="section-header">
        <div class="section-header-copy">
          <h3>${escapeHtml(category.title)}</h3>
          <p class="feed-category-subtitle">${escapeHtml(category.subtitle)}</p>
        </div>
      </div>

      <div class="carousel" data-carousel="${carouselId}">
        <button
          class="prev"
          type="button"
          aria-label="Ver perfiles anteriores de ${escapeHtml(category.title)}"
        >
          ‹
        </button>

        <div class="carousel-container">
          <div class="card-wrapper">
            ${cardsMarkup}
          </div>
        </div>

        <button
          class="next"
          type="button"
          aria-label="Ver perfiles siguientes de ${escapeHtml(category.title)}"
        >
          ›
        </button>
      </div>
    </section>
  `;
}

export function renderFeedSwipeCard(profile = {}) {
  const profileId = getFeedProfileId(profile);
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const avatarUrl = getMatchAvatar(profile);
  const bioText = String(profile?.bio || '').trim() || 'Sin bio registrada todavia.';
  const learnSkills = normalizeSkillList(
    profile?.skills_to_learn || profile?.learn_skills
  );
  const teachSkills = normalizeSkillList(
    profile?.skills_to_teach || profile?.teach_skills
  );

  const learnText = learnSkills.length ? learnSkills.join(', ') : 'Por definir';
  const teachText = teachSkills.length ? teachSkills.join(', ') : 'Por definir';

  return `
    <article class="nft-card nft-card--swipe" data-feed-card-id="${escapeHtml(profileId || '')}">
      <div class="main-image">
        <img
          class="feed-card-avatar"
          data-feed-avatar-id="${escapeHtml(profileId || '')}"
          src="${escapeHtml(avatarUrl)}"
          alt="Perfil de ${escapeHtml(fullName || 'usuario')}"
        />
        <span class="badge">Descubrir</span>
      </div>

      <div class="card-body">
        <h3>${escapeHtml(fullName || `Usuario #${profileId || 'sin id'}`)}</h3>
        <p class="feed-card-bio">${escapeHtml(bioText)}</p>
        <p class="feed-card-skills">Aprende: ${escapeHtml(learnText)}</p>
        <p class="feed-card-skills">Ensena: ${escapeHtml(teachText)}</p>
      </div>

      <div class="card-footer feed-card-footer">
        <button
          class="swipe-btn swipe-btn-pass feed-swipe-btn"
          type="button"
          data-action="pass"
          data-user-id="${escapeHtml(profileId || '')}"
          ${profileId ? '' : 'disabled'}
        >
          Pass
        </button>
        <button
          class="swipe-btn swipe-btn-like feed-swipe-btn"
          type="button"
          data-action="like"
          data-user-id="${escapeHtml(profileId || '')}"
          ${profileId ? '' : 'disabled'}
        >
          Like
        </button>
      </div>
    </article>
  `;
}

export function renderFeedCategoryBoard(profiles = []) {
  const categories = groupFeedProfilesByCategory(profiles);
  if (categories.length === 0) {
    return renderFeedEmptyState();
  }

  return categories
    .map((category, index) => renderFeedCategoryCarousel(category, index))
    .join('');
}
