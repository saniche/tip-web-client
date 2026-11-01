import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppStore } from './core/state/app-store';
import { AuthStore } from './core/state/auth-store';
import { PrimaryNavigation } from './navigation/primary-navigation';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PrimaryNavigation],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly store = inject(AppStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly appName = 'Talent Intelligent Platform';
  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;
  protected readonly nextAction = this.store.nextAction;

  ngOnInit(): void {
    this.authStore.Refresh();
  }
  
  protected logout(): void {
    this.authStore.logout();
    void this.router.navigateByUrl('/dashboard');
  }
}
