export function formatNotificationTime(dateValue) {
  try {
    return new Date(dateValue).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Ahora';
  }
}

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
