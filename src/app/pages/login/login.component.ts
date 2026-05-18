import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
      this.errorMessage = "Identifiants invalides ou serveur indisponible.";
    } finally {
      this.isSubmitting = false;
    }
  }
}
