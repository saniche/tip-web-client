import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { TipApi } from '../api/tip-api';
import { ProfileSession, UserProfile } from '../models/profile.models';
import { PROFILE_POLLING_TIMEOUT_MS, ProfileStore } from './profile-store';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let api: {
    createProfileSession: ReturnType<typeof vi.fn>;
    uploadProfileFile: ReturnType<typeof vi.fn>;
    getProfileSession: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      createProfileSession: vi.fn(() => of(makeSession([]))),
      uploadProfileFile: vi.fn(() => of({})),
      getProfileSession: vi.fn(),
      getProfile: vi.fn(() => of(makeProfile())),
    };
    TestBed.configureTestingModule({
      providers: [ProfileStore, { provide: TipApi, useValue: api }],
    });
    store = TestBed.inject(ProfileStore);
  });

  afterEach(() => {
    store.stopPolling();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('continues until every file is terminal regardless of session status', async () => {
    api.getProfileSession
      .mockReturnValueOnce(of(makeSession([], 'completed')))
      .mockReturnValueOnce(
        of(makeSession([{ id: '1', status: 'completed' }, { id: '2', status: 'processing' }], 'completed')),
      )
      .mockReturnValueOnce(
        of(
          makeSession(
            [
              { id: '1', status: 'COMPLETED' },
              { id: '2', status: 'failed' },
              { id: '3', status: 'cancel' },
            ],
            'processing',
          ),
        ),
      );

    store.uploadFiles([new File(['resume'], 'resume.md')]);

    expect(api.getProfile).not.toHaveBeenCalled();
    expect(store.session()?.files[1].status).toBe('processing');

    await vi.advanceTimersByTimeAsync(2000);

    expect(store.session()?.files.map((file) => file.status)).toEqual(['COMPLETED', 'failed', 'cancel']);
    expect(api.getProfile).toHaveBeenCalledOnce();
    expect(store.processingNotice()).toBeNull();
  });

  it('continues polling when the file list is empty', async () => {
    api.getProfileSession
      .mockReturnValueOnce(of(makeSession([], 'completed')))
      .mockReturnValueOnce(of(makeSession([], 'completed')))
      .mockReturnValueOnce(of(makeSession([{ id: '1', status: 'completed' }], 'processing')));

    store.uploadFiles([new File(['resume'], 'resume.md')]);

    expect(api.getProfile).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(api.getProfile).toHaveBeenCalledOnce();
  });

  it('stops after 15 minutes and informs the user that processing may continue', async () => {
    api.getProfileSession.mockReturnValue(of(makeSession([{ id: '1', status: 'processing' }], 'completed')));

    store.uploadFiles([new File(['resume'], 'resume.md')]);
    await vi.advanceTimersByTimeAsync(PROFILE_POLLING_TIMEOUT_MS);

    expect(store.processingNotice()).toContain('Processing may still be ongoing');
    expect(store.session()?.files[0].status).toBe('processing');
    expect(api.getProfile).not.toHaveBeenCalled();

    const callsAtTimeout = api.getProfileSession.mock.calls.length;
    await vi.advanceTimersByTimeAsync(4000);
    expect(api.getProfileSession).toHaveBeenCalledTimes(callsAtTimeout);
  });
});

function makeSession(
  files: { id: string; status: string }[],
  status = 'processing',
): ProfileSession {
  return {
    id: 'session-1',
    status,
    files: files.map((file) => ({ ...file, error: null })),
  };
}

function makeProfile(): UserProfile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    data: {},
    output_language: 'English',
  };
}
