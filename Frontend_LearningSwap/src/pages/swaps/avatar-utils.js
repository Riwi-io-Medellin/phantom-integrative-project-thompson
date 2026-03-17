import { getUserById } from '../../services/api.js';
import { DEFAULT_MATCH_AVATAR } from './constants.js';

export function getAvatarCandidate(entity = {}) {
  const candidate =
    entity?.avatar_url ||
    entity?.avatar ||
    entity?.photo_url ||
    entity?.profile_picture ||
    entity?.foto ||
    entity?.photo ||
    entity?.image_url ||
    '';

  if (typeof candidate !== 'string') return null;

  const cleaned = candidate.trim();
  return cleaned || null;
}

export function normalizeAvatarUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const cleaned = url.trim();
  if (!cleaned) return null;

  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:')
  ) {
    return cleaned;
  }

  if (cleaned.startsWith('//')) {
    return `${window.location.protocol}${cleaned}`;
  }

  const apiBase = import.meta.env.VITE_API_URL;

  if (!apiBase) {
    return cleaned;
  }

  try {
    const origin = new URL(apiBase).origin;
    if (cleaned.startsWith('/')) {
      return `${origin}${cleaned}`;
    }

    return `${origin}/${cleaned.replace(/^\/+/, '')}`;
  } catch {
    return cleaned;
  }
}

export function getEntityUserId(entity = {}) {
  const candidateId =
    entity?.user_id ??
    entity?.id ??
    entity?.target_user_id ??
    entity?.userToId ??
    entity?.matched_user_id ??
    entity?.match_user_id ??
    null;

  if (candidateId === null || candidateId === undefined || candidateId === '') {
    return null;
  }

  return String(candidateId);
}

export function getMatchId(match = {}) {
  const matchId =
    match?.match_id ??
    match?.id ??
    match?.matchId ??
    match?.id_match ??
    match?.interaction_id ??
    match?.swap_id ??
    null;

  if (matchId === null || matchId === undefined || String(matchId).trim() === '') {
    return null;
  }

  return String(matchId);
}

export function getMatchRoomId(match = {}) {
  const roomId = match?.room_id ?? match?.roomId ?? match?.chat_room_id ?? null;

  if (roomId === null || roomId === undefined || String(roomId).trim() === '') {
    return null;
  }

  return String(roomId);
}

export function getMatchAvatar(match = {}) {
  const normalizedAvatar = normalizeAvatarUrl(getAvatarCandidate(match));
  return normalizedAvatar || DEFAULT_MATCH_AVATAR;
}

export async function resolveAvatarForEntity(entity = {}, avatarCache) {
  const entityId = getEntityUserId(entity);
  const normalizedFromEntity = normalizeAvatarUrl(getAvatarCandidate(entity));

  if (normalizedFromEntity) {
    if (entityId) {
      avatarCache?.set(entityId, normalizedFromEntity);
    }
    return normalizedFromEntity;
  }

  if (!entityId) {
    return DEFAULT_MATCH_AVATAR;
  }

  if (avatarCache?.has(entityId)) {
    return avatarCache.get(entityId);
  }

  try {
    const profile = await getUserById(entityId);
    const normalizedFromProfile = normalizeAvatarUrl(getAvatarCandidate(profile));
    const resolvedAvatar = normalizedFromProfile || DEFAULT_MATCH_AVATAR;
    avatarCache?.set(entityId, resolvedAvatar);
    return resolvedAvatar;
  } catch {
    avatarCache?.set(entityId, DEFAULT_MATCH_AVATAR);
    return DEFAULT_MATCH_AVATAR;
  }
}
