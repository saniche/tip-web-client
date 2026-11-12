import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from './core/state/auth-store';
import { PrimaryNavigation } from './navigation/primary-navigation';
import { toast, NgxSonnerToaster } from 'ngx-sonner';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PrimaryNavigation, NgxSonnerToaster],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly toast = toast;
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly appName = 'Talent Intelligent Platform';
  protected readonly auth = this.authStore.authSession;
  protected readonly isAuthenticated = this.authStore.isAuthenticated;

  ngOnInit(): void {
    this.authStore.Refresh();
  }
  
  protected logout(): void {
    this.authStore.logout();
    void this.router.navigateByUrl('/dashboard');
  }
}
