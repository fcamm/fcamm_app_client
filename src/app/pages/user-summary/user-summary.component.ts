import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UserDetails {
  _id: string;
  userName: string;
  role: string;
}

interface UserDashboardResponse {
  message?: string;
  user?: UserDetails;
  receiptCount?: number;
  donatorCount?: number;
}

@Component({
  selector: 'app-user-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-summary.component.html',
  styleUrl: './user-summary.component.css'
})
export class UserSummaryComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  isLoading = false;
  errorMessage = '';
  user: UserDetails | null = null;
  receiptCount = 0;
  donatorCount = 0;

  isEditing = false;
  isSaving = false;
  submitAttempted = false;
  updateErrorMessage = '';
  showPassword = false;

  editModel = {
    userName: '',
    password: '',
    role: ''
  };

  roleOptions = [
    { label: 'Utilisateur', value: 'user' },
    { label: 'Tester', value: 'tester' },
    { label: 'Manager', value: 'manager' }
  ];

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.errorMessage = 'Utilisateur introuvable.';
      return;
    }

    await this.loadUser(userId);
  }

  get canSubmit(): boolean {
    if (this.isSaving) {
      return false;
    }

    return Boolean(this.editModel.userName.trim() && this.editModel.role);
  }

  startEdit(): void {
    if (!this.user) {
      return;
    }

    this.isEditing = true;
    this.showPassword = false;
    this.submitAttempted = false;
    this.updateErrorMessage = '';
    this.editModel = {
      userName: this.user.userName,
      password: '',
      role: this.user.role
    };
  }

  cancelEdit(): void {
    if (!this.user) {
      return;
    }

    this.isEditing = false;
    this.showPassword = false;
    this.submitAttempted = false;
    this.updateErrorMessage = '';
    this.editModel = {
      userName: this.user.userName,
      password: '',
      role: this.user.role
    };
  }

  async saveEdit(): Promise<void> {
    if (!this.user) {
      return;
    }

    this.submitAttempted = true;
    if (!this.canSubmit) {
      this.updateErrorMessage = "Le nom d'utilisateur et le role sont obligatoires.";
      return;
    }

    this.isSaving = true;
    this.updateErrorMessage = '';

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiBaseUrl}/api/user/${this.user._id}`,
          this.buildUpdatePayload(),
          { withCredentials: true }
        )
      );
      this.isEditing = false;
      await this.loadUser(this.user._id);
    } catch (error) {
      this.updateErrorMessage = this.getErrorMessage(error);
    } finally {
      this.isSaving = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private async loadUser(userId: string): Promise<void> {
    const startedAt = Date.now();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<UserDashboardResponse>(`${this.apiBaseUrl}/api/user/dashboard/${userId}`, {
          withCredentials: true
        })
      );

      this.user = response?.user ?? null;
      this.receiptCount = Number(response?.receiptCount || 0);
      this.donatorCount = Number(response?.donatorCount || 0);

      if (!this.user) {
        this.errorMessage = 'Utilisateur introuvable.';
      }
    } catch {
      this.errorMessage = 'Impossible de charger l\'utilisateur.';
      this.user = null;
      this.receiptCount = 0;
      this.donatorCount = 0;
    } finally {
      const elapsed = Date.now() - startedAt;
      const minDisplayMs = 300;
      if (elapsed < minDisplayMs) {
        await new Promise((resolve) => setTimeout(resolve, minDisplayMs - elapsed));
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const message = (error as { error?: { message?: string } }).error?.message;
      if (message) {
        return message;
      }
    }
    return 'Impossible de mettre a jour l\'utilisateur.';
  }

  private buildUpdatePayload(): { userName: string; role: string; password?: string } {
    const payload: { userName: string; role: string; password?: string } = {
      userName: this.editModel.userName.trim(),
      role: this.editModel.role
    };

    const password = this.editModel.password.trim();
    if (password) {
      payload.password = password;
    }

    return payload;
  }
}
