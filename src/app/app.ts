import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { ServerStatusService } from './services/server-status.service';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fcamm_editor_front');
  protected readonly serverStatus: ServerStatusService;

  constructor(
    serverStatus: ServerStatusService,
    private readonly router: Router,
    private readonly toastService: ToastService
  ) {
    this.serverStatus = serverStatus;

    effect(() => {
      if (this.serverStatus.timeoutReached()) {
        if (this.serverStatus.consumeTimeoutFlag()) {
          this.toastService.show('Serveur indisponible, veuillez reessayer plus tard.', 'error', 5000);
        }
      }
    });
  }

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }
}
