import {
  forceLogoutToLogin,
  getPath,
  getResourceEndpointCandidates,
  getStatsEndpointCandidates,
  toSafeNumber,
} from './helpers.js';
import { renderResourceTable } from './render.js';

export async function loadStats(state, apiUrl) {
  const statusElement = document.getElementById('stats-status');

  if (statusElement) {
    statusElement.textContent = 'Cargando estadisticas...';
    statusElement.className = 'admin-status admin-status--muted';
  }

  const candidates = getStatsEndpointCandidates(apiUrl);
  let lastError = null;

  for (const endpoint of candidates) {
    try {
      const payload = await callApi(endpoint, { method: 'GET' });
      state.endpoints.stats = endpoint;
      applyStats(payload || {});

      if (statusElement) {
        statusElement.textContent = 'Estadisticas cargadas.';
        statusElement.className = 'admin-status admin-status--success';
      }
      return;
    } catch (error) {
      lastError = error;
      if (error.status !== 404 && error.status !== 405) {
        break;
      }
    }
  }

  applyStats({});

  if (statusElement) {
    statusElement.textContent =
      lastError?.message || 'No se pudieron cargar las estadisticas.';
    statusElement.className = 'admin-status admin-status--error';
  }
}

export async function loadResource(
  state,
  resource,
  resourceConfig,
  apiUrl,
  options = {}
) {
  const { silentSuccessStatus = false } = options;

  setResourceStatus(resource, 'Cargando registros...', 'muted');

  try {
    const payload = await requestResource(state, resource, resourceConfig, apiUrl, {
      method: 'GET',
    });
    const items = extractCollection(payload, resource, resourceConfig);
    state.resources[resource] = items;

    renderResourceTable(resource, state.resources, resourceConfig);
    if (!silentSuccessStatus) {
      const amount = items.length;
      setResourceStatus(
        resource,
        `${amount} ${amount === 1 ? 'registro cargado' : 'registros cargados'}.`,
        'success'
      );
    }
  } catch (error) {
    state.resources[resource] = [];
    renderResourceTable(resource, state.resources, resourceConfig);
    setResourceStatus(
      resource,
      error.message || 'No se pudo cargar la informacion.',
      'error'
    );
  }
}

export async function requestResource(
  state,
  resource,
  resourceConfig,
  apiUrl,
  requestOptions
) {
  const { method, id = null, payload = null } = requestOptions;

  const candidates = [];
  const resolvedEndpoint = state.endpoints[resource];
  if (resolvedEndpoint) {
    candidates.push(resolvedEndpoint);
  }

  getResourceEndpointCandidates(resource, resourceConfig, apiUrl).forEach(
    (endpoint) => {
      if (!candidates.includes(endpoint)) {
        candidates.push(endpoint);
      }
    }
  );

  let lastError = null;

  for (const baseEndpoint of candidates) {
    const url =
      id === null || id === undefined
        ? baseEndpoint
        : `${baseEndpoint.replace(/\/$/, '')}/${encodeURIComponent(String(id))}`;

    try {
      const response = await callApi(url, {
        method,
        body: payload,
      });
      state.endpoints[resource] = baseEndpoint;
      return response;
    } catch (error) {
      lastError = error;

      const shouldTryNextEndpoint =
        error.status === 404 || error.status === 405 || error.status === 501;

      if (!shouldTryNextEndpoint) {
        throw error;
      }
    }
  }

  throw (
    lastError ||
    new Error(`No se encontro endpoint disponible para ${resourceConfig[resource].title}.`)
  );
}

export function setResourceStatus(resource, message, tone = 'muted') {
  const statusElement = document.getElementById(`status-${resource}`);
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.className = `admin-status admin-status--${tone}`;
}

function applyStats(stats = {}) {
  document.getElementById('stat-total-users').textContent = String(
    toSafeNumber(stats.total_users)
  );
  document.getElementById('stat-total-matches').textContent = String(
    toSafeNumber(stats.total_matches)
  );
  document.getElementById('stat-total-skills').textContent = String(
    toSafeNumber(stats.total_skills)
  );
  document.getElementById('stat-total-user-skills').textContent = String(
    toSafeNumber(stats.total_user_skills)
  );
}

function extractCollection(payload, resource, resourceConfig) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const config = resourceConfig[resource];
  const paths = [
    ...(config.collectionPaths || []),
    resource,
    'items',
    'results',
    'data',
  ];

  for (const path of paths) {
    const value = getPath(payload, path);
    if (Array.isArray(value)) return value;
  }

  return [];
}

async function callApi(url, options = {}) {
  const { method = 'GET', body = null } = options;

  const headers = {};
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestOptions = {
    method,
    headers,
  };

  if (body !== null && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  let parsedBody = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  } else {
    try {
      const text = await response.text();
      parsedBody = text ? { message: text } : null;
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      forceLogoutToLogin();
    }

    const message =
      parsedBody?.message ||
      parsedBody?.detail ||
      parsedBody?.error ||
      `HTTP ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return parsedBody ?? {};
}