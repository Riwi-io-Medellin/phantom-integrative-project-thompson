const API_URL = import.meta.env.VITE_API_URL;
let handlingUnauthorized = false;

function extractServerMessage(data, fallbackMessage) {
  if (!data) return fallbackMessage;

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data?.error === 'string' && data.error.trim()) {
    return data.error;
  }

  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const details = data.detail
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object' && typeof item.msg === 'string') {
          return item.msg.trim();
        }
        return '';
      })
      .filter(Boolean);

    if (details.length > 0) {
      return details.join('. ');
    }
  }

  return fallbackMessage;
}

function persistAccessToken(data) {
  const token =
    data?.access_token ||
    data?.token ||
    data?.accessToken ||
    data?.data?.access_token ||
    data?.data?.token ||
    data?.data?.accessToken;

  if (token && typeof token === 'string') {
    localStorage.setItem('token', token);
  }

  const role =
    data?.role ||
    data?.user?.role ||
    data?.data?.role ||
    data?.data?.user?.role;
  if (role && typeof role === 'string') {
    localStorage.setItem('role', role.trim().toLowerCase());
  }

  const userId =
    data?.user_id ||
    data?.user?.id ||
    data?.user?.user_id ||
    data?.data?.user_id ||
    data?.data?.user?.id ||
    data?.data?.user?.user_id ||
    data?.id;

  if (userId !== undefined && userId !== null && userId !== '') {
    const normalizedUserId = String(userId);
    localStorage.setItem('currentUser', normalizedUserId);
    localStorage.setItem('user_id', normalizedUserId);
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined' || handlingUnauthorized) {
    return;
  }

  handlingUnauthorized = true;

  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('user_id');
  localStorage.removeItem('role');
  localStorage.removeItem('pendingOnboarding');

  window.history.replaceState(null, '', '#home');

  import('../pages/login.js')
    .then(({ LoginPage }) => {
      LoginPage('login');
    })
    .catch(() => {
      window.location.href = '/';
    })
    .finally(() => {
      handlingUnauthorized = false;
    });
}

/** -----------------------------------------------
 * Internal: parse response and throw on error
 * -----------------------------------------------*/
async function handleResponse(response, options = {}) {
  const { skipAuthRedirect = false } = options;
  let data = null;

  const contentType = response.headers.get('content-type') || '';
  const hasBody = response.status !== 204;

  if (hasBody && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else if (hasBody) {
    try {
      const text = await response.text();
      data = text ? { message: text } : null;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect) {
      redirectToLogin();
    }

    if (response.status === 403 && typeof window !== 'undefined') {
      window.alert('No tienes permiso para hacer esto');
    }

    throw new Error(extractServerMessage(data, `HTTP ${response.status}`));
  }

  return data ?? {};
}

/** -----------------------------------------------
 * Internal: build headers with optional auth token
 * -----------------------------------------------*/
function buildHeaders({
  withAuth = false,
  includeJsonContentType = true,
} = {}) {
  const headers = {};

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// ================================================
// AUTH
// ================================================

/** Login - returns { token, user } */
export async function loginUser(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse(response, { skipAuthRedirect: true });
  persistAccessToken(data);
  return data;
}

/** Register - returns { token, user } (or just success) */
export async function registerUser(
  first_name,
  last_name,
  email,
  password,
  phone
) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ first_name, last_name, email, password, phone }),
  });

  const data = await handleResponse(response, { skipAuthRedirect: true });
  persistAccessToken(data);
  return data;
}

/** Save onboarding skills after registration */
export async function saveOnboardingSkills(learn_skills = [], teach_skills = []) {
  const response = await fetch(`${API_URL}/onboarding/skills`, {
    method: 'POST',
    headers: buildHeaders({ withAuth: true }),
    body: JSON.stringify({
      learn_skills,
      teach_skills,
    }),
  });

  return handleResponse(response);
}

// ================================================
// PROFILE
// ================================================

/** Get profile data by user id from database */
export async function getUserById(userId) {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'GET',
    headers: buildHeaders({ withAuth: true }),
  });

  return handleResponse(response);
}

/** Get profile data from authenticated user */
export async function getMyProfile() {
  const response = await fetch(`${API_URL}/me`, {
    method: 'GET',
    headers: buildHeaders({ withAuth: true }),
  });

  return handleResponse(response);
}

/** Update profile by user id with FormData (supports local avatar file upload) */
export async function updateUserByIdFormData(
  userId,
  profileData = {},
  avatarFile = null
) {
  const formData = new FormData();

  const first_name = profileData.first_name;
  const last_name = profileData.last_name;
  const phone = profileData.phone;
  const bio = profileData.bio;

  if (first_name) formData.append('first_name', first_name);
  if (last_name) formData.append('last_name', last_name);
  if (phone) formData.append('phone', phone);
  if (bio) formData.append('bio', bio);

  if (avatarFile) {
    formData.append('foto', avatarFile, avatarFile.name);
  }

  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: buildHeaders({ withAuth: true, includeJsonContentType: false }),
    body: formData,
  });

  return handleResponse(response);
}

// ================================================
// MATCHES / CHAT
// ================================================

/** Get discovery feed for current authenticated user */
export async function getFeed() {
  const response = await fetch(`${API_URL}/feed`, {
    method: 'GET',
    headers: buildHeaders({ withAuth: true }),
  });

  return handleResponse(response);
}

/** Record swipe decision to potentially create a match */
export async function sendSwipe(userToId, action) {
  if (!userToId) {
    throw new Error('No se pudo registrar el swipe por datos incompletos');
  }

  if (action !== 'like' && action !== 'pass') {
    throw new Error('La accion del swipe debe ser like o pass');
  }

  const parsedUserToId = Number.parseInt(userToId, 10);
  if (Number.isNaN(parsedUserToId)) {
    throw new Error('No se pudo identificar el perfil destino del swipe');
  }

  const response = await fetch(`${API_URL}/swipe`, {
    method: 'POST',
    headers: buildHeaders({ withAuth: true }),
    body: JSON.stringify({
      user_to_id: parsedUserToId,
      action,
    }),
  });

  return handleResponse(response);
}

/** Get matches list for current authenticated user */
export async function getMatches() {
  const response = await fetch(`${API_URL}/matches`, {
    method: 'GET',
    headers: buildHeaders({ withAuth: true }),
  });

  return handleResponse(response);
}

/** Finish an active match and award points to both users */
export async function finishMatch(matchId) {
  const normalizedMatchId = String(matchId || '').trim();
  if (!normalizedMatchId) {
    throw new Error('No se pudo identificar el match a finalizar.');
  }

  const response = await fetch(
    `${API_URL}/matches/${encodeURIComponent(normalizedMatchId)}/finish`,
    {
      method: 'POST',
      headers: buildHeaders({ withAuth: true }),
    }
  );

  return handleResponse(response);
}

/** Get chat history by room id */
export async function getMessages(roomId) {
  if (!roomId) {
    throw new Error('No se encontro la sala del chat');
  }

  const response = await fetch(`${API_URL}/messages/${roomId}`, {
    method: 'GET',
    headers: buildHeaders({ withAuth: true }),
  });

  return handleResponse(response);
}

/** Upload chat media file (image/audio) and return storage URL + type */
export async function uploadChatMedia(file) {
  if (!file) {
    throw new Error('Selecciona un archivo para subir al chat.');
  }

  const formData = new FormData();
  formData.append('file', file, file.name || 'chat-media');

  const response = await fetch(`${API_URL}/chat/upload`, {
    method: 'POST',
    headers: buildHeaders({ withAuth: true, includeJsonContentType: false }),
    body: formData,
  });

  return handleResponse(response);
}
