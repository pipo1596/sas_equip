// Some backend actions return a list wrapped as { data: [...] }, some
// return the bare array as the whole response body, and some return
// { data: "[...]" } — the array double-encoded as a JSON string rather
// than nested JSON. Accept all three, and log the raw value for
// diagnosis if it's none of them, instead of letting a .find()/.map()
// crash the page.
export function parseArrayResponse<T>(raw: unknown, context: string): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw != null && typeof raw === 'object') {
    const inner = (raw as Record<string, unknown>)['data'];
    if (Array.isArray(inner)) return inner as T[];
    if (typeof inner === 'string') {
      try {
        const parsed = JSON.parse(inner);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch {
        // Fall through to the warning below.
      }
    }
  }
  console.warn(`${context}: expected an array in the response, got`, raw);
  return [];
}
