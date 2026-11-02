export function hasProfileData(data: Record<string, unknown> | null): boolean {
  return !!data && Object.entries(data).some(([key, value]) => key !== '__evidence__' && hasValue(value));
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasValue);
  return false;
}
