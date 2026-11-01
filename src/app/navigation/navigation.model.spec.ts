import { describe, expect, it } from 'vitest';
import { navigationAreas } from './navigation.model';

describe('navigation model', () => {
  it('defines the seven areas in business order with unique destinations', () => {
    expect(navigationAreas.map((area) => area.id)).toEqual([
      'dashboard', 'profile', 'jobs', 'matching', 'applications', 'tailoring', 'settings',
    ]);
    const destinations = navigationAreas.flatMap((area) => area.destinations.map((item) => item.path));
    expect(new Set(destinations).size).toBe(destinations.length);
    for (const area of navigationAreas.filter((item) => item.availability === 'available')) {
      expect(area.destinations.length).toBeGreaterThan(0);
    }
    expect(navigationAreas.find((area) => area.id === 'settings')?.availability).toBe('hidden');
  });
});
