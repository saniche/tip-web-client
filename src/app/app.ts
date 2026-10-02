import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStore } from './core/state/app-store';
import { AuthStore } from './core/state/auth-store';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly store = inject(AppStore);
  private readonly authStore = inject(AuthStore);

  protected readonly appName = 'Talent Intelligent Platform';
  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly nextAction = this.store.nextAction;

  ngOnInit(): void {
    this.authStore.Refresh();
  }
  
  protected logout(): void {
    this.authStore.logout();
  }
}
