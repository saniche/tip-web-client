import { Component, inject, OnInit, signal, TemplateRef } from '@angular/core';
import { finalize } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TipApi } from '../../../core/api/tip-api';
import { ProfileVersion } from '../../../core/models/tailored-cv';

@Component({
  imports: [],
  selector: 'app-profile-list',
  styleUrl: './profile-list.scss',
  templateUrl: './profile-list.html',
})
export class ProfileList implements OnInit {
  private readonly api = inject(TipApi);
  private readonly modal = inject(NgbModal);

  protected readonly profiles = signal<ProfileVersion[]>([]);
  protected readonly pendingDeleteProfile = signal<ProfileVersion | null>(null);
  protected readonly deletingProfile = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listProfiles().subscribe((profiles) => {
      this.profiles.set(profiles);
    });
  }

  protected requestDelete(
    profile: ProfileVersion,
    confirmation: TemplateRef<unknown>,
  ): void {
    if (this.deletingProfile()) {
      return;
    }

    this.pendingDeleteProfile.set(profile);
    this.deleteError.set(null);
    const modalRef = this.modal.open(confirmation, {
      ariaLabelledBy: 'delete-profile-title',
      backdrop: 'static',
      centered: true,
      keyboard: false,
    });

    void modalRef.result.then(
      (confirmed: boolean) => {
        this.pendingDeleteProfile.set(null);
        if (confirmed) {
          this.removeProfile(profile.id);
        }
      },
      (reason: unknown) => {
        this.pendingDeleteProfile.set(null);
        console.error('Profile deletion confirmation was dismissed unexpectedly.', reason);
      },
    );
  }

  private removeProfile(id: string): void {
    this.deletingProfile.set(true);
    this.api
      .deleteProfile(id)
      .pipe(finalize(() => this.deletingProfile.set(false)))
      .subscribe({
        next: () =>
          this.profiles.update((profiles) => profiles.filter((profile) => profile.id !== id)),
        error: (error: unknown) => {
          console.error('Unable to delete profile.', error);
          this.deleteError.set('Unable to delete this profile. Please try again.');
        },
      });
  }
}
