import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { NavigationContext } from './navigation-context';
import { AreaId, navigationAreas } from './navigation.model';

@Component({
  selector: 'app-primary-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './primary-navigation.html',
  styleUrl: './primary-navigation.scss',
})
export class PrimaryNavigation {
  private readonly router = inject(Router);
  protected readonly context = inject(NavigationContext);
  protected readonly areas = navigationAreas.filter((area) => area.availability !== 'hidden');
  protected readonly menuOpen = signal(false);
  protected readonly openArea = signal<AreaId | null>(null);
  protected readonly exactPath = {
    paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored',
  } as const;
  @ViewChild('menuTrigger') private menuTrigger?: ElementRef<HTMLButtonElement>;

  constructor() {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.menuOpen.set(false);
      this.openArea.set(null);
    });
  }

  protected toggleArea(id: AreaId): void {
    this.openArea.update((open) => open === id ? null : id);
  }

  protected closeArea(event: Event, trigger: HTMLButtonElement): void {
    if (this.openArea() === null) return;
    event.preventDefault();
    event.stopPropagation();
    this.openArea.set(null);
    trigger.focus();
  }

  protected closeMenu(event: Event): void {
    if (!this.menuOpen()) return;
    event.preventDefault();
    this.menuOpen.set(false);
    this.openArea.set(null);
    this.menuTrigger?.nativeElement.focus();
  }
}
