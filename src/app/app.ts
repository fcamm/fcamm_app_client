import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { ServerStatusService } from './services/server-status.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('fcamm_editor_front');
  protected readonly serverStatus: ServerStatusService;

  constructor(serverStatus: ServerStatusService, private readonly router: Router) {
    this.serverStatus = serverStatus;
  }

  get isLoginRoute(): boolean {
    return this.router.url.startsWith('/login');
  }
}
