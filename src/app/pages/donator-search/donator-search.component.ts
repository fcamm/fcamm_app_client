import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DonatorRow {
  id: string;
  name: string;
  totalReceiptsCount: number;
  totalDonationAmount: number;
}

interface DonatorApiResponse {
  message?: string;
  donators?: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    city?: string;
    totalReceiptsCount?: number;
    totalDonationAmount?: number;
    createdAt?: string;
    addDate?: string;
    dateAdded?: string;
    addedAt?: string;
  }>;
}

@Component({
  selector: 'app-donator-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './donator-search.component.html',
  styleUrl: './donator-search.component.css'
})
export class DonatorSearchComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private allDonators: DonatorRow[] = [];

  searchText = '';
  isLoading = false;
  errorMessage = '';
  donators: DonatorRow[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadDonators();
  }

  get donatorCount(): number {
    return this.donators.length;
  }

  onSearchChange(): void {
    const query = this.searchText.trim().toLowerCase();

    if (!query) {
      this.donators = [...this.allDonators];
      return;
    }

    this.donators = this.allDonators.filter((donator) =>
      donator.name.toLowerCase().includes(query)
    );
  }

  async loadDonators(): Promise<void> {
    const startedAt = Date.now();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<DonatorApiResponse>(`${this.apiBaseUrl}/api/list/donator`)
      );

      const donators = response?.donators ?? [];
      this.allDonators = donators.map((donator) => ({
        id: donator._id,
        name: this.formatName(donator.firstName, donator.lastName, donator.companyName),
        totalReceiptsCount: Number(donator.totalReceiptsCount || 0),
        totalDonationAmount: Number(donator.totalDonationAmount || 0)
      }));
      this.onSearchChange();
    } catch {
      this.errorMessage = 'Impossible de charger les donateurs.';
      this.allDonators = [];
      this.donators = [];
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

  private formatName(firstName?: string, lastName?: string, companyName?: string): string {
    const company = companyName?.trim();
    if (company) {
      return company;
    }

    const personalName = `${firstName || ''} ${lastName || ''}`.trim();
    return personalName || '-';
  }
}
