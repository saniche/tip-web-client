import { describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
import { navigationAreas } from './navigation.model';

describe('route navigation metadata', () => {
  it('assigns every feature route to one known area and a title', () => {
    const exceptions = ['', '**', 'auth', 'auth/register'];
    const ids = navigationAreas.map((area) => area.id);
    for (const route of routes) {
      if (exceptions.includes(route.path ?? '')) {
        expect(route.data?.['navigation']).toBeUndefined();
      } else {
        expect(ids, route.path).toContain(route.data?.['navigation']?.areaId);
        expect(route.data?.['navigation']?.pageLabel, route.path).toBeTruthy();
        expect(route.title, route.path).toBeTruthy();
      }
    }
  });

  it('retains the source of legacy tailoring launches', () => {
    expect(routes.find((route) => route.path === 'tailored-cvs/new/job/:id')?.data?.['source']).toBe('job');
    expect(routes.find((route) => route.path === 'tailored-cvs/new/report/:id')?.data?.['source']).toBe('report');
  });

  it('supplies parent context for detail, creation and preview routes', () => {
    for (const path of ['normalized-jobs/:id', 'matching-reports/:id', 'applications/new',
      'applications/:id', 'tailored-cvs/:id', 'tailored-cvs/:id/documents/:documentId']) {
      expect(routes.find((route) => route.path === path)?.data?.['navigation']?.parent, path).toBeTruthy();
    }
  });
});
