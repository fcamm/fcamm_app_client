import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface UserRow {
  id: string;
  userName: string;
  role: string;
}

interface UserListResponse {
  users?: Array<{
    _id: string;
    userName: string;
    role: string;
  }>;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private allUsers: UserRow[] = [];

  searchText = '';
  isLoading = false;
  errorMessage = '';
  users: UserRow[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadUsers();
  }

  get userCount(): number {
    return this.users.length;
  }

  onSearchChange(): void {
    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      this.users = [...this.allUsers];
      return;
    }

    this.users = this.allUsers.filter((user) => {
      const haystack = `${user.userName} ${user.role}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  async loadUsers(): Promise<void> {
    const startedAt = Date.now();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<UserListResponse>(`${this.apiBaseUrl}/api/list/user`, {
          withCredentials: true
        })
      );

      const users = response?.users ?? [];
      this.allUsers = users.map((user) => ({
        id: user._id,
        userName: user.userName,
        role: user.role
      }));
      this.onSearchChange();
    } catch {
      this.errorMessage = 'Impossible de charger les utilisateurs.';
      this.allUsers = [];
      this.users = [];
    } finally {
      const elapsed = Date.now() - startedAt;
      const minDisplayMs = 400;
      if (elapsed < minDisplayMs) {
        await new Promise((resolve) => setTimeout(resolve, minDisplayMs - elapsed));
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
