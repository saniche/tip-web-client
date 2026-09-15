import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStore } from './core/state/app-store';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly store = inject(AppStore);

  protected readonly appName = 'Talent Intelligent Platform';
  protected readonly auth = this.store.auth;
  protected readonly isAuthenticated = this.store.isAuthenticated;
  protected readonly nextAction = this.store.nextAction;

  protected logout(): void {
    this.store.logout();
  }
}
