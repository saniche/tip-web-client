import { describe, expect, it } from 'vitest';
import { routes } from '../app.routes';

describe('page titles and parent links', () => {
  it('gives destinations titles and existing detail routes meaningful parents', () => {
    const parents: Record<string, string> = {
      'normalized-jobs/:id': '/normalized-jobs',
      'matching-reports/:id': '/matching-reports',
      'applications/new': '/applications',
      'applications/:id': '/applications',
      'tailored-cvs/:id': '/tailored-cvs',
      'tailored-cvs/:id/documents/:documentId': '/tailored-cvs/:id',
    };
    for (const [path, parent] of Object.entries(parents)) {
      const route = routes.find((entry) => entry.path === path);
      expect(route?.title, path).toBeTruthy();
      expect(route?.data?.['navigation']?.parent?.path, path).toBe(parent);
    }
  });
});
