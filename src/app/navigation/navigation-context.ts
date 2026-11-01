import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { RouteNavigation } from './navigation.model';

@Injectable({ providedIn: 'root' })
export class NavigationContext {
  private readonly router = inject(Router);
  private readonly state = signal<RouteNavigation | null>(null);
  readonly current = this.state.asReadonly();

  constructor() {
    if (this.router.navigated) {
      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      this.state.set(this.contextFor(route));
    }
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => {
      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      this.state.set(this.contextFor(route));
    });
  }

  private contextFor(route: ActivatedRouteSnapshot): RouteNavigation | null {
    const navigation: RouteNavigation | undefined = route.data['navigation'];
    if (!navigation) return null;
    if (!navigation.parent) return navigation;
    const path = navigation.parent.path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      const value = route.paramMap.get(key);
      if (value === null) throw new Error(`Missing navigation route parameter: ${key}`);
      return encodeURIComponent(value);
    });
    return { ...navigation, parent: { ...navigation.parent, path } };
  }
}
