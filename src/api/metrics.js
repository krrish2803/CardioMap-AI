import { USE_MOCK, API_BASE_URL } from './predict';

export async function getMetrics() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/metrics`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend metrics unavailable, falling back to local metrics.json');
    }
  }

  const res = await fetch('/mock/metrics.json');
  if (!res.ok) throw new Error('Failed to load validation metrics');
  return await res.json();
}

export async function getSamplePatients() {
  if (!USE_MOCK) {
    try {
      const res = await fetch(`${API_BASE_URL}/samples`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend samples unavailable, falling back to local samples.json');
    }
  }

  const res = await fetch('/mock/samples.json');
  if (!res.ok) throw new Error('Failed to load sample patients');
  return await res.json();
}
