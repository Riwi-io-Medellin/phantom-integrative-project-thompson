export function forceLogoutToLogin() {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('user_id');
  localStorage.removeItem('role');
  localStorage.removeItem('pendingOnboarding');

  import('../login.js').then(({ LoginPage }) => {
    LoginPage('login');
  });
}

export function getResourceEndpointCandidates(resource, resourceConfig, apiUrl) {
  const config = resourceConfig[resource];
  const envValue = import.meta.env[config.endpointEnv];

  if (envValue) {
    return [toAbsoluteUrl(envValue, apiUrl)];
  }

  return config.endpointFallbacks.map((path) => toAbsoluteUrl(path, apiUrl));
}

export function getStatsEndpointCandidates(apiUrl) {
  const envValue = import.meta.env.VITE_ADMIN_STATS_ENDPOINT;
  if (envValue) {
    return [toAbsoluteUrl(envValue, apiUrl)];
  }

  return ['/stats', '/admin/stats'].map((path) => toAbsoluteUrl(path, apiUrl));
}

export function toAbsoluteUrl(path, apiUrl) {
  const value = String(path || '').trim();
  if (!value) return apiUrl;

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/$/, '');
  }

  if (!apiUrl) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${apiUrl}${normalizedPath}`.replace(/\/$/, '');
}

export function getFieldByAliases(entity, aliases = []) {
  if (!entity || typeof entity !== 'object') return null;

  for (const alias of aliases) {
    if (entity[alias] !== undefined && entity[alias] !== null) {
      return entity[alias];
    }
  }

  return null;
}

export function getPath(payload, path) {
  if (!path) return payload;

  return path.split('.').reduce((acc, segment) => {
    if (acc && typeof acc === 'object') {
      return acc[segment];
    }
    return undefined;
  }, payload);
}

export function toSafeNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
