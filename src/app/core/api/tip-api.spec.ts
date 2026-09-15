import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TipApi } from './tip-api';

describe('TipApi', () => {
  let service: TipApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(TipApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
