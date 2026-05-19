import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface SessionResponse {
  message: string;
  session: {
    userID: string;
    role: string;
    _id: string;
    expireOn: string;
    __v: number;
  };
  token: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  model = {
    userName: '',
    password: ''
  };

  errorMessage = '';
  isSubmitting = false;
  isWarmingUp = false;
  warmupSeconds = 0;
  warmupProgress = 0;
  private warmupIntervalId?: number;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute
  ) {
    if (this.authService.isAuthenticated()) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/menu';
      this.router.navigateByUrl(returnUrl);
    }
  }

  get canSubmit(): boolean {
    return this.model.userName.trim().length > 0 && this.model.password.trim().length > 0;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit || this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    try {
      await this.waitForServerWakeup();
      const response = await firstValueFrom(
        this.http.post<SessionResponse>(
          `${this.apiBaseUrl}/api/session`,
          {
            userName: this.model.userName,
            password: this.model.password
          },
          { withCredentials: true }
        )
      );
      this.authService.setToken(response.token);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/menu';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      if (error instanceof Error && error.message === 'SERVER_SLEEP') {
        this.errorMessage = 'Serveur en veille. Merci de patienter puis reessayer.';
      } else {
        this.errorMessage = 'Identifiants invalides ou serveur indisponible.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  private async waitForServerWakeup(): Promise<void> {
    if (this.isWarmingUp) {
      return;
    }

    this.startWarmupTimer();
    const startedAt = Date.now();
    const maxWaitMs = 90_000;

    while (Date.now() - startedAt < maxWaitMs) {
      const isAwake = await this.pingServer();
      if (isAwake) {
        this.stopWarmupTimer();
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    this.stopWarmupTimer();
    throw new Error('SERVER_SLEEP');
  }

  private async pingServer(): Promise<boolean> {
    return firstValueFrom(
      this.http
        .get(`${this.apiBaseUrl}/api/server-health`, { withCredentials: true })
        .pipe(
          timeout({ first: 5000 }),
          catchError((error) => {
            return of(false);
          })
        )
    ).then((result) => Boolean(result));
  }

  private startWarmupTimer(): void {
    this.isWarmingUp = true;
    this.warmupSeconds = 0;
    this.warmupProgress = 5;

    if (typeof window === 'undefined') {
      return;
    }

    const startedAt = Date.now();
    this.warmupIntervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      this.warmupSeconds = elapsed;

      const progress = Math.min(90, 5 + Math.floor((elapsed / 90) * 85));
      this.warmupProgress = Math.max(this.warmupProgress, progress);
    }, 1000);
  }

  private stopWarmupTimer(): void {
    if (this.warmupIntervalId) {
      clearInterval(this.warmupIntervalId);
      this.warmupIntervalId = undefined;
    }

    this.warmupProgress = 100;
    setTimeout(() => {
      this.isWarmingUp = false;
      this.warmupProgress = 0;
    }, 600);
  }
}
