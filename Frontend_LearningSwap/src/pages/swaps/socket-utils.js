export function buildChatSocketUrl(roomId) {
  const token = localStorage.getItem('token') || '';
  const authQuery = `?token=${encodeURIComponent(token)}`;

  const wsBase = import.meta.env.VITE_WS_URL;
  if (wsBase) {
    return `${wsBase.replace(/\/$/, '')}/ws/chat/${roomId}${authQuery}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}/ws/chat/${roomId}${authQuery}`;
    } catch {
      // Fall through to default websocket URL.
    }
  }

  return `wss://learning-swap-backend.onrender.com/ws/chat/${roomId}${authQuery}`;
}

export function buildSignalSocketUrl(roomId) {
  const token = localStorage.getItem('token') || '';
  const authQuery = `?token=${encodeURIComponent(token)}`;

  const configuredSignalBase =
    import.meta.env.VITE_WS_SIGNAL_URL || import.meta.env.VITE_WS_URL;

  if (configuredSignalBase) {
    const trimmedBase = String(configuredSignalBase).replace(/\/$/, '');

    if (trimmedBase.includes('{roomId}') || trimmedBase.includes('{token}')) {
      return trimmedBase
        .replace('{roomId}', encodeURIComponent(String(roomId)))
        .replace('{token}', encodeURIComponent(token));
    }

    if (trimmedBase.includes('/ws/chat/')) {
      return `${trimmedBase.replace('/ws/chat/', '/ws/signal/')}${authQuery}`;
    }

    if (trimmedBase.endsWith('/ws/chat')) {
      return `${trimmedBase.replace('/ws/chat', '/ws/signal')}/${roomId}${authQuery}`;
    }

    if (trimmedBase.includes('/ws/signal')) {
      return `${trimmedBase}/${roomId}${authQuery}`;
    }

    return `${trimmedBase}/ws/signal/${roomId}${authQuery}`;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}/ws/signal/${roomId}${authQuery}`;
    } catch {
      // Fall through to default websocket URL.
    }
  }

  return `wss://learning-swap-backend.onrender.com/ws/signal/${roomId}${authQuery}`;
}
