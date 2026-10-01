import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { JOB_STAGES } from '../models/workflow';
import { AppStore } from './app-store';

describe('AppStore', () => {
  let service: AppStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AppStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with an unauthenticated workflow state', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.nextAction()).toContain('Authenticate with the API');
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
