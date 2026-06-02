import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  submitAttempted = false;
  warmupSeconds = 0;
  warmupProgress = 0;
  showPassword = false;
  private warmupIntervalId?: number;
  private submitTimeoutId?: number;
  private keepWarmupVisible = false;
  private wakeupPromise?: Promise<void>;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {
    const queryReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (queryReturnUrl) {
      if (!queryReturnUrl.startsWith('/login')) {
        this.storeReturnUrl(queryReturnUrl);
      }
      this.router.navigate(['/login'], { replaceUrl: true });
    }

    if (this.authService.isAuthenticated()) {
      const returnUrl = this.getReturnUrl();
      this.router.navigateByUrl(returnUrl);
    }

    if (this.consumeServerSleepFlag()) {
      this.startWarmupTimer();
      this.waitForServerWakeup().catch(() => {
        this.errorMessage = 'Serveur en veille. Merci de patienter puis reessayer.';
        this.cdr.detectChanges();
      });
    }
  }

  get canSubmit(): boolean {
    return this.model.userName.trim().length > 0 && this.model.password.trim().length > 0;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async submit(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canSubmit || this.isSubmitting) {
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    this.armSlowRequestWarmup();

    try {
      const response = await this.doLogin();
      this.keepWarmupVisible = false;
      this.authService.setToken(response.token);
      const returnUrl = this.getReturnUrl();
      await this.router.navigateByUrl(returnUrl);
      this.submitAttempted = false;
    } catch (error) {
      const serverSleeping = await this.isServerSleeping();
      if (serverSleeping) {
        this.keepWarmupVisible = true;
        try {
          await this.waitForServerWakeup();
          const retryResponse = await this.doLogin();
          this.keepWarmupVisible = false;
          this.authService.setToken(retryResponse.token);
          const returnUrl = this.getReturnUrl();
          await this.router.navigateByUrl(returnUrl);
          return;
        } catch (retryError) {
          this.keepWarmupVisible = false;
          if (retryError instanceof Error && retryError.message === 'SERVER_SLEEP') {
            this.errorMessage = 'Serveur en veille. Merci de patienter puis reessayer.';
          } else if (retryError instanceof HttpErrorResponse) {
            const serverMessage = this.extractServerMessage(retryError);
            this.errorMessage = serverMessage || 'Identifiants invalides ou serveur indisponible.';
          } else {
            this.errorMessage = 'Identifiants invalides ou serveur indisponible.';
          }
        }
      } else if (error instanceof HttpErrorResponse) {
        this.keepWarmupVisible = false;
        const serverMessage = this.extractServerMessage(error);
        this.errorMessage = serverMessage || 'Identifiants invalides ou serveur indisponible.';
      } else if (error instanceof Error && error.message === 'SERVER_SLEEP') {
        this.keepWarmupVisible = false;
        this.errorMessage = 'Serveur en veille. Merci de patienter puis reessayer.';
      } else {
        this.keepWarmupVisible = false;
        this.errorMessage = 'Identifiants invalides ou serveur indisponible.';
      }
    } finally {
      this.isSubmitting = false;
      this.clearSlowRequestWarmup();
      if (this.isWarmingUp && !this.keepWarmupVisible) {
        this.stopWarmupTimer();
      }
      this.cdr.detectChanges();
    }
  }

  private armSlowRequestWarmup(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.submitTimeoutId) {
      clearTimeout(this.submitTimeoutId);
    }

    this.submitTimeoutId = window.setTimeout(() => {
      this.ngZone.run(() => {
        if (this.isSubmitting && !this.isWarmingUp) {
          this.keepWarmupVisible = true;
          this.startWarmupTimer();
          this.cdr.detectChanges();
        }
      });
    }, 3000);
  }

  private clearSlowRequestWarmup(): void {
    if (this.submitTimeoutId) {
      clearTimeout(this.submitTimeoutId);
      this.submitTimeoutId = undefined;
    }
  }

  private async doLogin(): Promise<SessionResponse> {
    return firstValueFrom(
      this.http.post<SessionResponse>(
        `${this.apiBaseUrl}/api/session`,
        {
          userName: this.model.userName,
          password: this.model.password
        },
        { withCredentials: true }
      )
    );
  }

  private async isServerSleeping(): Promise<boolean> {
    return !(await this.pingServer());
  }

  private getReturnUrl(): string {
    const queryReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (queryReturnUrl && !queryReturnUrl.startsWith('/login')) {
      return queryReturnUrl;
    }

    if (typeof window !== 'undefined') {
      const storedReturnUrl = sessionStorage.getItem('fcamm_return_url');
      if (storedReturnUrl) {
        sessionStorage.removeItem('fcamm_return_url');
        return storedReturnUrl;
      }
    }

    return '/menu';
  }

  private storeReturnUrl(returnUrl: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem('fcamm_return_url', returnUrl);
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }

  private consumeServerSleepFlag(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const flag = sessionStorage.getItem('fcamm_server_sleep');
    if (flag) {
      sessionStorage.removeItem('fcamm_server_sleep');
      return true;
    }

    return false;
  }

  private extractServerMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    if (error.error && typeof error.error.message === 'string') {
      return error.error.message;
    }

    return null;
  }

  private async waitForServerWakeup(): Promise<void> {
    if (this.wakeupPromise) {
      return this.wakeupPromise;
    }

    this.wakeupPromise = (async () => {
      const startedAt = Date.now();
      const maxWaitMs = 90_000;
      let hasShownWarmup = false;

      while (Date.now() - startedAt < maxWaitMs) {
        const isAwake = await this.pingServer();
        if (isAwake) {
          if (hasShownWarmup) {
            this.stopWarmupTimer();
          }
          return;
        }

        if (!hasShownWarmup) {
          this.startWarmupTimer();
          hasShownWarmup = true;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (hasShownWarmup) {
        this.stopWarmupTimer();
      }
      throw new Error('SERVER_SLEEP');
    })();

    try {
      await this.wakeupPromise;
    } finally {
      this.wakeupPromise = undefined;
    }
  }

  private async pingServer(): Promise<boolean> {
    const startedAt = Date.now();

    const result = await firstValueFrom(
      this.http
        .get(`${this.apiBaseUrl}/api/server-health`, { withCredentials: true })
        .pipe(
          timeout({ first: 5000 }),
          catchError(() => of(false))
        )
    );

    const elapsed = Date.now() - startedAt;
    if (elapsed > 3000) {
      return false;
    }

    return Boolean(result);
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
      this.ngZone.run(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        this.warmupSeconds = elapsed;

        const progress = Math.min(90, 5 + Math.floor((elapsed / 90) * 85));
        this.warmupProgress = Math.max(this.warmupProgress, progress);
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  private stopWarmupTimer(): void {
    if (this.warmupIntervalId) {
      clearInterval(this.warmupIntervalId);
      this.warmupIntervalId = undefined;
    }

    this.warmupProgress = 100;
    setTimeout(() => {
      this.ngZone.run(() => {
        this.isWarmingUp = false;
        this.warmupProgress = 0;
        this.cdr.detectChanges();
      });
    }, 600);
  }
}
