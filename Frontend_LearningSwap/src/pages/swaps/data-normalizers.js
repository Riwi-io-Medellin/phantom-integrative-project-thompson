import { getEntityUserId } from './avatar-utils.js';

export function normalizeMatchesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.data?.matches)) return payload.data.matches;
  return [];
}

export function normalizeMessagesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.data?.messages)) return payload.data.messages;
  return [];
}

export function normalizeFeedPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.feed)) return payload.feed;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  if (Array.isArray(payload?.data?.feed)) return payload.data.feed;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  if (Array.isArray(payload?.data?.profiles)) return payload.data.profiles;
  return [];
}

export function getFeedProfileId(profile = {}) {
  return getEntityUserId(profile);
}

export function normalizeSkillList(skills, options = {}) {
  const { limit = 5 } = options;

  const normalizeEntries = (items) => {
    return items
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }

        if (entry && typeof entry === 'object') {
          return (
            entry.name ||
            entry.skill ||
            entry.skill_name ||
            entry.title ||
            entry.label ||
            ''
          );
        }

        return String(entry || '');
      })
      .map((skill) => String(skill || '').trim())
      .filter(Boolean)
      .slice(0, Math.max(1, limit));
  };

  if (Array.isArray(skills)) {
    return normalizeEntries(skills);
  }

  if (typeof skills === 'string' && skills.trim()) {
    return normalizeEntries(
      skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    );
  }

  return [];
}

export function isAiMessage(message = {}) {
  if (!message || typeof message !== 'object') return false;

  if (message.is_ai === true || message.is_ai === 1) {
    return true;
  }

  if (typeof message.is_ai === 'string') {
    const normalized = message.is_ai.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  return false;
}

export function isMatchCreated(payload) {
  if (!payload || typeof payload !== 'object') return false;

  if (
    payload.match === true ||
    payload.matched === true ||
    payload.is_match === true ||
    payload.match_created === true
  ) {
    return true;
  }

  if (payload.room_id !== undefined && payload.room_id !== null && payload.room_id !== '') {
    return true;
  }

  const message = String(payload.message || payload.detail || '').toLowerCase();
  return message.includes('match') && !message.includes('no match');
}
