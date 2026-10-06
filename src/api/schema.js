import { USE_MOCK, API_BASE_URL } from './predict';

export async function getSchema() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/schema`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend schema unavailable, falling back to local schema.json');
    }
  }

  const res = await fetch('/mock/schema.json');
  if (!res.ok) throw new Error('Failed to load schema definition');
  return await res.json();
}
