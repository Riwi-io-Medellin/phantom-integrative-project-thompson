import { getMatches } from '../../services/api.js';

function resolvePointsValue(payload = {}) {
  const candidate =
    payload?.points ??
    payload?.puntos ??
    payload?.score ??
    payload?.total_points ??
    payload?.user_points ??
    0;

  const parsedPoints = Number.parseInt(candidate, 10);
  return Number.isNaN(parsedPoints) ? 0 : parsedPoints;
}

export function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function normalizeUserResponse(payload = {}) {
  return {
    ...payload,
    id: payload.id ?? payload.user_id,
    user_id: payload.user_id ?? payload.id,
    first_name:
      payload.first_name ??
      payload.nombre ??
      payload.firstName ??
      payload.name ??
      '',
    last_name: payload.last_name ?? '',
    email: payload.email ?? '',
    phone: payload.phone ?? payload.telefono ?? payload.mobile ?? null,
    bio: payload.bio ?? payload.about_me ?? '',
    about_me: payload.about_me ?? payload.bio ?? '',
    avatar_url:
      payload.avatar_url ??
      payload.avatar ??
      payload.foto_url ??
      payload.photo_url ??
      payload.image_url ??
      '',
    learn_skills:
      payload.learn_skills ??
      payload.learning_skills ??
      payload.skills_to_learn ??
      [],
    teach_skills:
      payload.teach_skills ??
      payload.teaching_skills ??
      payload.skills_to_teach ??
      payload.skills ??
      [],
    points: resolvePointsValue(payload),
  };
}

export function getProfilePayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const basePayload =
    payload.user ||
    payload.profile ||
    payload.data?.user ||
    payload.data ||
    payload;

  if (!basePayload || typeof basePayload !== 'object' || Array.isArray(basePayload)) {
    return {};
  }

  return {
    ...payload,
    ...basePayload,
  };
}

export function createEmptyProfileStats() {
  return {
    offeredSkills: 0,
    sessions: 0,
  };
}

export async function getProfileStats(user = {}) {
  const teachSkills = getSkillList(user, 'teach');
  const offeredSkills = countUniqueSkills(teachSkills);

  try {
    const matchesPayload = await getMatches();
    const matches = normalizeMatchesPayload(matchesPayload);
    const matchesWithRoom = matches.filter((match) => {
      return hasValidRoomId(match?.room_id ?? match?.roomId ?? match?.chat_room_id);
    });
    const sessions = matchesWithRoom.length > 0 ? matchesWithRoom.length : matches.length;

    return {
      offeredSkills,
      sessions,
    };
  } catch {
    return {
      offeredSkills,
      sessions: 0,
    };
  }
}

export function countUniqueSkills(skills = []) {
  if (!Array.isArray(skills) || skills.length === 0) return 0;

  const uniqueSkills = new Set(
    skills
      .map((skill) => String(skill || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return uniqueSkills.size;
}

export function normalizeMatchesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.data?.matches)) return payload.data.matches;
  return [];
}

export function hasValidRoomId(roomId) {
  return roomId !== undefined && roomId !== null && String(roomId).trim() !== '';
}

export function getSkillList(user = {}, type = 'teach') {
  const source =
    type === 'teach'
      ? user.teach_skills || user.skills_to_teach || user.teaching_skills || []
      : user.learn_skills || user.skills_to_learn || user.learning_skills || [];

  if (!Array.isArray(source)) return [];

  return source
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return (
          item.name ||
          item.skill ||
          item.title ||
          item.label ||
          item.value ||
          ''
        )
          .toString()
          .trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function renderSkills(skills = [], type = 'teach') {
  if (!skills.length) {
    const emptyClass =
      type === 'learn'
        ? 'skill-tag--empty skill-tag--want'
        : 'skill-tag--empty';
    return `
      <span class="skill-tag ${emptyClass}">
        <ion-icon name="add-circle-outline"></ion-icon>
        Agregar una habilidad
      </span>
    `;
  }

  return skills
    .map(
      (skill) => `
        <span class="skill-tag ${type === 'learn' ? 'skill-tag--want' : ''}">${escapeHtml(skill)}</span>
      `
    )
    .join('');
}

export function renderEditableSkillTags(skills = [], type = 'teach') {
  if (!Array.isArray(skills) || skills.length === 0) {
    const emptyLabel =
      type === 'learn'
        ? 'Aún no agregas habilidades para aprender.'
        : 'Aún no agregas habilidades para enseñar.';

    return `<span class="modal-skill-empty">${escapeHtml(emptyLabel)}</span>`;
  }

  return skills
    .map((skill, index) => {
      const normalizedSkill = normalizeSkillInput(skill);
      if (!normalizedSkill) return '';

      return `
        <span class="modal-skill-chip ${
          type === 'learn' ? 'modal-skill-chip--learn' : ''
        }" data-edit-skill-value="${escapeHtml(normalizedSkill)}">
          ${escapeHtml(normalizedSkill)}
          <button
            type="button"
            class="modal-skill-remove"
            data-edit-skill-remove="${type}"
            data-edit-skill-index="${index}"
            aria-label="Eliminar ${escapeHtml(normalizedSkill)}"
          >
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </span>
      `;
    })
    .join('');
}

export function normalizeSkillInput(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeSkillCollection(skills = []) {
  if (!Array.isArray(skills)) return [];

  const uniqueSkills = [];

  skills.forEach((skill) => {
    const normalizedSkill = normalizeSkillInput(skill);
    if (!normalizedSkill) return;

    const alreadyExists = uniqueSkills.some((candidate) => {
      return candidate.toLowerCase() === normalizedSkill.toLowerCase();
    });

    if (!alreadyExists) {
      uniqueSkills.push(normalizedSkill);
    }
  });

  return uniqueSkills;
}

export function getEditSkillValues(type = 'teach') {
  if (type !== 'teach' && type !== 'learn') return [];

  const list = document.getElementById(`edit-${type}-skill-list`);
  if (!list) return [];

  const skillsFromDataset = (() => {
    try {
      const parsed = JSON.parse(list.dataset.skills || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  if (skillsFromDataset.length > 0) {
    return normalizeSkillCollection(skillsFromDataset);
  }

  const skillsFromTags = Array.from(
    list.querySelectorAll('[data-edit-skill-value]')
  )
    .map((element) => element.getAttribute('data-edit-skill-value') || '')
    .filter(Boolean);

  return normalizeSkillCollection(skillsFromTags);
}