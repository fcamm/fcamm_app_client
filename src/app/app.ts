import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { ServerStatusService } from './services/server-status.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fcamm_editor_front');
  protected readonly serverStatus: ServerStatusService;
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private healthIntervalId?: number;
  private readonly isBrowser: boolean;

  constructor(
    serverStatus: ServerStatusService,
    private readonly http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object,
    private readonly router: Router
  ) {
    this.serverStatus = serverStatus;
    this.isBrowser = isPlatformBrowser(platformId);
    this.startHealthPolling();
  }

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }

  private startHealthPolling(): void {
    if (!this.isBrowser || this.healthIntervalId) {
      return;
    }

    this.healthIntervalId = window.setInterval(() => {
      if (!this.serverStatus.getOfflineValue()) {
        return;
      }

      this.http.get(`${this.apiBaseUrl}/api/server-health`, { withCredentials: true }).subscribe({
        next: () => {
          this.serverStatus.setOffline(false);
          if (!this.isLoginRoute) {
            window.location.reload();
          }
        },
        error: () => {
          // Keep waiting until server is back.
        }
      });
    }, 4000);
  }
}
