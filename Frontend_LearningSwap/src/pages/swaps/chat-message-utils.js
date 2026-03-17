import {
  CHAT_AUDIO_EXTENSIONS,
  CHAT_AUDIO_MIME_TYPES,
  CHAT_IMAGE_EXTENSIONS,
  CHAT_IMAGE_MIME_TYPES,
} from './constants.js';
import { isAiMessage } from './data-normalizers.js';

export function normalizeIncomingChatMessage(message) {
  if (message && typeof message === 'object') {
    return message;
  }

  if (typeof message === 'string' || typeof message === 'number') {
    const parsedMessage = parseChatMessageJson(String(message));

    if (parsedMessage && typeof parsedMessage === 'object' && !Array.isArray(parsedMessage)) {
      return parsedMessage;
    }

    if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
      return {
        message: parsedMessage.trim(),
      };
    }

    return {
      message: String(message),
    };
  }

  return {};
}

export function getChatMessageText(message = {}) {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const candidates = [message.message, message.text, message.content, message.body];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (value && typeof value === 'object') {
      const nestedTextCandidates = [
        value.message,
        value.text,
        value.content,
        value.body,
        value.caption,
      ];

      for (const nestedValue of nestedTextCandidates) {
        if (typeof nestedValue === 'string' && nestedValue.trim()) {
          return nestedValue.trim();
        }
      }
    }
  }

  return '';
}

export function getChatMediaSource(message = {}) {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const directCandidates = [
    message.url,
    message.media_url,
    message.file_url,
    message.src,
    message.attachment_url,
    message.audio_url,
    message.image_url,
    message.file,
    message.media,
    message.attachment,
    message.message,
  ];

  for (const candidate of directCandidates) {
    const normalizedCandidate = normalizeChatMediaCandidate(candidate);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return getChatMessageText(message);
}

export function normalizeChatMessageType(type = '') {
  const normalizedType = String(type || '').trim().toLowerCase();
  if (!normalizedType) return '';

  if (normalizedType.startsWith('image/')) {
    return 'image';
  }

  if (normalizedType.startsWith('audio/')) {
    return 'audio';
  }

  if (normalizedType === 'image' || normalizedType === 'img' || normalizedType === 'imagen') {
    return 'image';
  }

  if (normalizedType === 'audio' || normalizedType === 'voice') {
    return 'audio';
  }

  if (normalizedType.includes('image') || normalizedType.includes('imagen')) {
    return 'image';
  }

  if (normalizedType.includes('audio') || normalizedType.includes('voice')) {
    return 'audio';
  }

  return '';
}

export function normalizeEscapedChatValue(value = '') {
  return String(value || '')
    .replace(/\\u002f/gi, '/')
    .replace(/\\\//g, '/')
    .trim();
}

export function parseChatMessageJson(value = '') {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const parseCandidates = [rawValue, normalizeEscapedChatValue(rawValue)];

  for (const candidate of parseCandidates) {
    const trimmed = String(candidate || '').trim();
    if (!trimmed) continue;

    const isLikelyJson =
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'));

    if (!isLikelyJson) continue;

    try {
      return JSON.parse(trimmed);
    } catch {
      // Ignore parse errors and continue with next candidate.
    }
  }

  return null;
}

export function normalizeChatMediaCandidate(candidate) {
  if (typeof candidate === 'string') {
    const cleaned = normalizeEscapedChatValue(candidate);
    if (!cleaned) return '';

    const parsed = parseChatMessageJson(cleaned);
    if (parsed !== null && parsed !== undefined) {
      const nestedCandidate = normalizeChatMediaCandidate(parsed);
      if (nestedCandidate) return nestedCandidate;
    }

    return cleaned;
  }

  if (!candidate || typeof candidate !== 'object') {
    return '';
  }

  const objectCandidates = [
    candidate.url,
    candidate.media_url,
    candidate.file_url,
    candidate.src,
    candidate.attachment_url,
    candidate.audio_url,
    candidate.image_url,
    candidate.public_url,
    candidate.path,
    candidate.file,
    candidate.media,
    candidate.attachment,
    candidate.message,
  ];

  for (const value of objectCandidates) {
    const nested = normalizeChatMediaCandidate(value);
    if (nested) return nested;
  }

  return '';
}

export function extractFirstUrl(value = '') {
  const rawValue = normalizeEscapedChatValue(value);
  if (!rawValue) return '';

  const match = rawValue.match(/https?:\/\/[^\s"'<>]+/i);
  if (!match || !match[0]) return '';

  return match[0].replace(/[.,;:!?)]$/, '');
}

export function getFileExtension(fileName = '') {
  const normalizedName = String(fileName || '').trim().toLowerCase();
  if (!normalizedName || !normalizedName.includes('.')) return '';

  const segments = normalizedName.split('.');
  return segments.pop() || '';
}

export function normalizeChatMediaUrl(url = '') {
  const extractedUrl = extractFirstUrl(url);
  const mediaUrl = extractedUrl || String(url || '').trim();
  if (!mediaUrl) return '';

  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }

  return '';
}

export function detectChatMediaTypeFromUrl(url = '') {
  const rawValue = normalizeEscapedChatValue(url);
  if (!rawValue) return '';

  const mediaUrl = normalizeChatMediaUrl(rawValue);
  const lowerRaw = rawValue.toLowerCase();

  if (
    lowerRaw.includes('/chat/images/') ||
    lowerRaw.includes('/chat-media/chat/images/')
  ) {
    return 'image';
  }

  if (
    lowerRaw.includes('/chat/audio/') ||
    lowerRaw.includes('/chat-media/chat/audio/')
  ) {
    return 'audio';
  }

  const imagePattern = /\.(jpg|jpeg|png|gif|webp)(\b|\?|#|&|$)/i;
  const audioPattern = /\.(mp3|ogg|wav|webm)(\b|\?|#|&|$)/i;
  const sourceForPatterns = mediaUrl || lowerRaw;

  if (imagePattern.test(sourceForPatterns)) return 'image';
  if (audioPattern.test(sourceForPatterns)) return 'audio';

  if (!mediaUrl) return '';

  try {
    const parsed = new URL(mediaUrl);
    const pathname = decodeURIComponent(parsed.pathname || '');
    const extension = getFileExtension(pathname);

    if (CHAT_IMAGE_EXTENSIONS.has(extension)) {
      return 'image';
    }

    if (CHAT_AUDIO_EXTENSIONS.has(extension)) {
      return 'audio';
    }
  } catch {
    // Ignore URL parsing errors.
  }

  return '';
}

export function resolveChatMessageType(message = {}) {
  const normalizedMessage = normalizeIncomingChatMessage(message);
  if (!normalizedMessage || typeof normalizedMessage !== 'object') {
    return '';
  }

  const explicitType = normalizeChatMessageType(
    normalizedMessage.type ||
      normalizedMessage.message_type ||
      normalizedMessage.media_type ||
      normalizedMessage.file_type ||
      normalizedMessage.content_type ||
      normalizedMessage.mime_type ||
      normalizedMessage.mimeType ||
      normalizedMessage.message?.type ||
      normalizedMessage.message?.media_type ||
      normalizedMessage.message?.content_type
  );

  if (explicitType) {
    return explicitType;
  }

  const mediaSource = getChatMediaSource(normalizedMessage);
  return detectChatMediaTypeFromUrl(mediaSource);
}

export function detectChatUploadFileType(file) {
  if (!file) return '';

  const mimeType = String(file.type || '')
    .trim()
    .toLowerCase()
    .split(';')[0]
    .trim();
  const extension = getFileExtension(file.name);

  if (CHAT_IMAGE_MIME_TYPES.has(mimeType) || CHAT_IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (CHAT_AUDIO_MIME_TYPES.has(mimeType) || CHAT_AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }

  return '';
}

export function buildChatNotificationPreview(message = {}) {
  const normalizedMessage = normalizeIncomingChatMessage(message);
  if (!normalizedMessage || typeof normalizedMessage !== 'object') {
    return 'Te envio un mensaje nuevo.';
  }

  const mediaType = resolveChatMessageType(normalizedMessage);
  if (mediaType === 'image') {
    return 'Te envio una imagen.';
  }

  if (mediaType === 'audio') {
    return 'Te envio un audio.';
  }

  const text = getChatMessageText(normalizedMessage);
  if (text) {
    return text;
  }

  if (isAiMessage(normalizedMessage)) {
    return 'El asistente IA te envio un mensaje.';
  }

  return 'Te envio un mensaje nuevo.';
}

export function isSignalingMessageType(type = '') {
  const normalizedType = String(type || '').trim().toLowerCase();

  return (
    normalizedType === 'offer' ||
    normalizedType === 'answer' ||
    normalizedType === 'candidate' ||
    normalizedType === 'hang-up' ||
    normalizedType === 'hangup'
  );
}
