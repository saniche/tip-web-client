export const USER_STORAGE_IDLE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const USER_STORAGE_PREFIX = 'tip.user.v1.';

function storageKey(owner: string, name: string): string {
  const normalizedOwner = owner.trim().toLowerCase();
  if (!normalizedOwner || !name.trim()) {
    throw new TypeError('An authenticated owner and storage name are required.');
  }
  const ownerKey = encodeURIComponent(normalizedOwner).replace(/\./g, '%2E');
  return `${USER_STORAGE_PREFIX}${ownerKey}.${encodeURIComponent(name)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readUserStorage<T>(
  owner: string,
  name: string,
  validate: (value: unknown) => value is T,
): T | null {
  const key = storageKey(owner, name);
  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  const envelope: unknown = JSON.parse(raw);
  if (
    !isRecord(envelope) ||
    envelope['version'] !== 1 ||
    typeof envelope['expiresAt'] !== 'number' ||
    !Number.isFinite(envelope['expiresAt'])
  ) {
    throw new TypeError('The saved user data has an invalid envelope.');
  }
  if (Date.now() >= envelope['expiresAt']) {
    localStorage.removeItem(key);
    return null;
  }
  const data = envelope['data'];
  if (!validate(data)) {
    throw new TypeError('The saved user data has an invalid shape.');
  }
  writeUserStorage(owner, name, data);
  return data;
}

export function writeUserStorage<T>(owner: string, name: string, data: T): void {
  localStorage.setItem(storageKey(owner, name), JSON.stringify({
    version: 1,
    expiresAt: Date.now() + USER_STORAGE_IDLE_LIFETIME_MS,
    data,
  }));
}

export function removeUserStorage(owner: string, name: string): void {
  localStorage.removeItem(storageKey(owner, name));
}
