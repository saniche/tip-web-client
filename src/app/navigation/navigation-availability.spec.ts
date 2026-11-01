import { describe, expect, it } from 'vitest';
import { navigationAreas } from './navigation.model';

describe('navigation availability', () => {
  it('keeps unsupported Settings hidden and existing Tailoring destinations available', () => {
    expect(navigationAreas.find((area) => area.id === 'settings')?.availability).toBe('hidden');
    const tailoring = navigationAreas.find((area) => area.id === 'tailoring');
    expect(tailoring?.availability).toBe('available');
    expect(tailoring?.destinations.map((destination) => destination.path)).toEqual([
      '/tailoring-session', '/tailored-cvs',
    ]);
    expect(navigationAreas.filter((area) => area.availability === 'available').every((area) => area.destinations.length > 0)).toBe(true);
  });
});
