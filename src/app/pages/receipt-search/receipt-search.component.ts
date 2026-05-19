import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ReceiptRow {
  id: string;
  date: string;
  donator: string;
  amount: number;
  receiptNumber?: string;
  pdfId?: string;
}

interface ReceiptApiResponse {
  receipts?: Array<{
    _id: string;
    receiptNumber?: string;
    donatorID: string;
    amount: number;
    donationDate: string;
    pdfID?: string;
  }>;
}

interface DonatorApiResponse {
  donator?: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  }>;
}

@Component({
  selector: 'app-receipt-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receipt-search.component.html',
  styleUrl: './receipt-search.component.css'
})
export class ReceiptSearchComponent {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;
  private donatorMap = new Map<string, string>();

  searchText = '';
  sortOrder = 'desc';
  donatorFilter = '';
  yearFilter = '';
  monthFilter = '';
  showFilters = false;

  isLoading = false;
  errorMessage = '';

  donatorOptions: string[] = [];

  yearOptions: string[] = [];
  monthOptions = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Fevrier' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Aout' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Decembre' }
  ];

  receipts: ReceiptRow[] = [];

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadDonators();
    await this.loadReceipts();
  }

  get filteredReceipts(): ReceiptRow[] {
    return this.receipts;
  }

  get receiptCount(): number {
    return this.receipts.length;
  }

  onSearchChange(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
    this.searchDebounceId = setTimeout(() => {
      this.loadReceipts();
    }, 300);
  }

  onFiltersChange(): void {
    this.loadReceipts();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  async downloadReceipt(id: string): Promise<void> {
    const receipt = this.receipts.find((row) => row.id === id);
    if (!receipt?.pdfId) {
      alert('PDF indisponible pour ce recu.');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiBaseUrl}/api/pdf/${receipt.pdfId}`, {
          responseType: 'arraybuffer',
          observe: 'response'
        })
      );

      const contentType = response.headers.get('content-type') || '';
      let blob: Blob | null = null;

      if (contentType.includes('application/pdf')) {
        blob = new Blob([response.body || new ArrayBuffer(0)], { type: 'application/pdf' });
      } else {
        blob = this.parsePdfFromJson(response.body);
      }

      if (!blob) {
        alert('PDF invalide.');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receipt.receiptNumber || `recu-${receipt.id}`}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du telechargement du PDF.');
    }
  }

  private async loadDonators(): Promise<void> {
    try {
      const donatorsResponse = await firstValueFrom(
        this.http.get<{ donator?: DonatorApiResponse['donator'] }>(
          `${this.apiBaseUrl}/api/list/donator`
        )
      );

      const donators = donatorsResponse?.donator ?? [];
      const options: string[] = [];
      const map = new Map<string, string>();
      for (const donator of donators) {
        const label =
          donator.companyName || `${donator.firstName || ''} ${donator.lastName || ''}`.trim();
        if (label && label.trim().length > 0) {
          options.push(label);
          map.set(donator._id, label);
        }
      }
      this.donatorOptions = options.sort();
      this.donatorMap = map;
    } catch {
      this.donatorOptions = [];
      this.donatorMap = new Map();
    }
  }

  private async loadReceipts(): Promise<void> {
    const startedAt = Date.now();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const params = new URLSearchParams();
      if (this.searchText.trim()) {
        params.set('search', this.searchText.trim());
      }
      if (this.sortOrder) {
        params.set('order', this.sortOrder);
      }
      if (this.donatorFilter) {
        params.set('donator', this.donatorFilter);
      }
      if (this.yearFilter) {
        params.set('year', this.yearFilter);
      }
      if (this.monthFilter) {
        params.set('month', this.monthFilter);
      }

      const query = params.toString();
      const receiptsResponse = await firstValueFrom(
        this.http.get<{ receipts?: ReceiptApiResponse['receipts'] }>(
          `${this.apiBaseUrl}/api/list/receipt${query ? `?${query}` : ''}`
        )
      );

      const receipts = receiptsResponse?.receipts ?? [];
      this.receipts = receipts.map((receipt) => ({
        id: receipt._id,
        date: receipt.donationDate?.slice(0, 10) || '',
        donator: this.donatorMap.get(receipt.donatorID) || 'Inconnu',
        amount: Number(receipt.amount || 0),
        receiptNumber: receipt.receiptNumber,
        pdfId: receipt.pdfID
      }));

      if (this.yearOptions.length === 0) {
        this.yearOptions = Array.from(
          new Set(this.receipts.map((row) => row.date.slice(0, 4)).filter(Boolean))
        ).sort((a, b) => b.localeCompare(a));
      }
    } catch (error) {
      this.errorMessage = "Impossible de charger les recus.";
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

  private parsePdfFromJson(buffer: ArrayBuffer | null): Blob | null {
    if (!buffer) {
      return null;
    }

    try {
      const text = new TextDecoder('utf-8').decode(buffer);
      const payload = JSON.parse(text) as { pdf?: { pdfFile?: string } };
      const base64 = payload?.pdf?.pdfFile;
      if (!base64) {
        return null;
      }
      return this.decodeBase64ToBlob(base64);
    } catch {
      return null;
    }
  }

  private decodeBase64ToBlob(base64: string): Blob | null {
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    if (!raw) {
      return null;
    }

    try {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'application/pdf' });
    } catch {
      return null;
    }
  }

}
