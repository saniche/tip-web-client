import { describe, expect, it } from 'vitest';
import { navigationAreas, NavigationArea } from './navigation.model';

describe('navigation extensibility', () => {
  it('can add supported destinations without changing other areas', () => {
    const future: NavigationArea[] = navigationAreas.map((area) => {
      if (area.id === 'settings') {
        return { ...area, availability: 'available', destinations: [{ label: 'Preferences', path: '/preferences' }] };
      }
      if (area.id === 'tailoring') {
        return { ...area, availability: 'available', destinations: [...area.destinations, { label: 'Outputs', path: '/outputs' }] };
      }
      return area;
    });
    for (const original of navigationAreas.filter((area) => area.id !== 'settings' && area.id !== 'tailoring')) {
      expect(future.find((area) => area.id === original.id)).toEqual(original);
    }
    expect(future.find((area) => area.id === 'settings')?.destinations[0].path).toBe('/preferences');
  });
});
