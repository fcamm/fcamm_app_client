import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CreateUserResponse {
  message?: string;
}

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.css'
})
export class UserCreateComponent {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  model = {
    userName: '',
    password: '',
    role: ''
  };

  roleOptions = [
    { label: 'Utilisateur', value: 'user' },
    { label: 'Tester', value: 'tester' },
    { label: 'Manager', value: 'manager' }
  ];

  isSubmitting = false;
  submitAttempted = false;
  errorMessage = '';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  get canSubmit(): boolean {
    if (this.isSubmitting) {
      return false;
    }

    return Boolean(this.model.userName.trim() && this.model.password.trim() && this.model.role);
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.submitAttempted = true;
    if (!this.canSubmit) {
      this.errorMessage = 'Tous les champs sont obligatoires.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.http.post<CreateUserResponse>(
          `${this.apiBaseUrl}/api/user`,
          {
            userName: this.model.userName.trim(),
            password: this.model.password,
            role: this.model.role
          },
          { withCredentials: true }
        )
      );
      this.resetForm();
      this.submitAttempted = false;
      await this.router.navigate(['/admin']);
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private resetForm(): void {
    this.model = {
      userName: '',
      password: '',
      role: ''
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const message = (error as { error?: { message?: string } }).error?.message;
      if (message) {
        return message;
      }
    }
    return 'Impossible de creer l\'utilisateur.';
  }
}
