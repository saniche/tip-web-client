import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProfileCertificate } from '../../../core/models/profile.models';
import { EditorItemComponent } from '../editor-item/editor-item.component';

@Component({
  imports: [EditorItemComponent],
  selector: 'app-certificates-editor',
  templateUrl: './certificates.component.html',
  styleUrl: '../profile-editor/editor-section.scss',
})
export class CertificatesComponent {
  @Input() certificates: ProfileCertificate[] = [];
  @Output() readonly certificatesChange = new EventEmitter<any[]>();

  protected readonly openIndex = signal<number | null>(null);

  protected setOpen(index: number, open: boolean): void {
    this.openIndex.set(open ? index : null);
  }

  protected heading(certificate: ProfileCertificate): string {
    return certificate.Name?.trim() || 'New certificate';
  }

  protected meta(certificate: ProfileCertificate): string {
    return [certificate.Issuer?.trim(), certificate.Year]
      .filter((part) => part !== null && part !== undefined && part !== '')
      .join(', ');
  }

  protected addCertificate(): void {
    this.openIndex.set(this.certificates.length);
    this.certificatesChange.emit([...this.certificates, { Name: null, Issuer: null, Year: null }]);
  }

  protected updateName(index: number, event: Event): void {
    this.updateCertificate(index, { Name: textValue(event) });
  }

  protected updateIssuer(index: number, event: Event): void {
    this.updateCertificate(index, { Issuer: textValue(event) });
  }

  protected updateYear(index: number, event: Event): void {
    this.updateCertificate(index, { Year: numberValue(event) });
  }

  protected removeCertificate(index: number): void {
    this.openIndex.set(null);
    this.certificatesChange.emit(this.certificates.filter((_, itemIndex) => itemIndex !== index));
  }

  private updateCertificate(index: number, changes: Partial<ProfileCertificate>): void {
    this.certificatesChange.emit(
      this.certificates.map((certificate, itemIndex) =>
        itemIndex === index ? { ...certificate, ...changes } : certificate,
      ),
    );
  }
}

function textValue(event: Event): string | null {
  const value = (event.target as HTMLInputElement).value;
  return value === '' ? null : value;
}

function numberValue(event: Event): number | null {
  const input = event.target as HTMLInputElement;
  return input.value === '' || !Number.isFinite(input.valueAsNumber) ? null : input.valueAsNumber;
}
