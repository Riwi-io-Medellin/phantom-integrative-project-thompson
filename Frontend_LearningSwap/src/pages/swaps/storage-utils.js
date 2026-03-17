export function readClosedSwapRooms(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed
        .map((roomId) => String(roomId || '').trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

export function persistClosedSwapRooms(storageKey, closedRoomIdsSet) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(closedRoomIdsSet)));
  } catch {
    // Ignore storage errors (private mode, quota, etc.).
  }
}
