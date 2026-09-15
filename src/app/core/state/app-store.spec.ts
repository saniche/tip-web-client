import { TestBed } from '@angular/core/testing';
import { JOB_STAGES } from '../models/workflow';
import { AppStore } from './app-store';

describe('AppStore', () => {
  let service: AppStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate with signal state', () => {
    service.login('talent.ops@tip.dev', 'changeme');

    expect(service.isAuthenticated()).toBe(true);
    expect(service.auth().email).toBe('talent.ops@tip.dev');
    expect(service.auth().accessToken).toBe('demo-session-token');
  });

  it('should advance jobs through the workflow without exceeding the final stage', () => {
    const jobId = service.jobs()[0].id;

    service.advanceJob(jobId);
    service.advanceJob(jobId);
    service.advanceJob(jobId);
    service.advanceJob(jobId);

    expect(service.jobs().find((job) => job.id === jobId)?.stage).toBe(JOB_STAGES[JOB_STAGES.length - 1]);
  });
});
