import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DonatorDetails {
  _id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  email?: string;
}

interface ReceiptItem {
  _id: string;
  receiptNumber?: string;
  amount?: number;
  donationDate?: string;
  pdfID?: string;
}

interface DonatorProfileResponse {
  message?: string;
  donatorDetails?: DonatorDetails;
  receiptList?: ReceiptItem[];
}

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  pdfId?: string;
}

@Component({
  selector: 'app-donator-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './donator-summary.component.html',
  styleUrl: './donator-summary.component.css'
})
export class DonatorSummaryComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  isLoading = false;
  errorMessage = '';
  donator: DonatorDetails | null = null;
  receipts: ReceiptRow[] = [];

  isEditing = false;
  isSaving = false;
  submitAttempted = false;
  updateErrorMessage = '';
  editModel = {
    lastName: '',
    firstName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    email: ''
  };

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const donatorId = this.route.snapshot.paramMap.get('id');
    if (!donatorId) {
      this.errorMessage = 'Donateur introuvable.';
      return;
    }

    await this.loadDonator(donatorId);
  }

  get displayName(): string {
    if (!this.donator) {
      return '-';
    }

    const company = this.donator.companyName?.trim();
    if (company) {
      return company;
    }

    const personalName = `${this.donator.firstName || ''} ${this.donator.lastName || ''}`.trim();
    return personalName || '-';
  }

  get addressLine(): string {
    return this.donator?.address?.trim() || '-';
  }

  get cityLine(): string {
    if (!this.donator) {
      return '-';
    }

    const postal = this.donator.postalCode?.trim() || '';
    const city = this.donator.city?.trim() || '';
    const combined = `${postal} ${city}`.trim();
    return combined || '-';
  }

  get emailLine(): string {
    return this.donator?.email?.trim() || '-';
  }

  get hasCompanyName(): boolean {
    return this.editModel.companyName.trim().length > 0;
  }

  get hasPersonName(): boolean {
    return this.editModel.firstName.trim().length > 0 || this.editModel.lastName.trim().length > 0;
  }

  get hasModeConflict(): boolean {
    return this.hasCompanyName && this.hasPersonName;
  }

  get canSubmit(): boolean {
    if (this.hasModeConflict) {
      return false;
    }
    if (this.hasCompanyName) {
      return true;
    }

    return this.editModel.firstName.trim().length > 0 && this.editModel.lastName.trim().length > 0;
  }

  get isCompanyRequired(): boolean {
    return !this.hasPersonName;
  }

  get isPersonRequired(): boolean {
    return !this.hasCompanyName;
  }

  get isAddressDetailsRequired(): boolean {
    return this.editModel.address.trim().length > 0;
  }

  startEdit(): void {
    if (!this.donator) {
      return;
    }

    this.isEditing = true;
    this.submitAttempted = false;
    this.updateErrorMessage = '';
    this.hydrateEditModel(this.donator);
  }

  cancelEdit(): void {
    if (!this.donator) {
      return;
    }

    this.isEditing = false;
    this.submitAttempted = false;
    this.updateErrorMessage = '';
    this.hydrateEditModel(this.donator);
  }

  async saveEdit(): Promise<void> {
    if (!this.donator) {
      return;
    }

    this.submitAttempted = true;
    if (!this.canSubmit) {
      this.updateErrorMessage = this.getValidationMessage();
      return;
    }

    this.updateErrorMessage = '';
    this.isSaving = true;

    try {
      const payload = this.buildUpdatePayload();
      await firstValueFrom(
        this.http.put(`${this.apiBaseUrl}/api/donator/${this.donator._id}`, payload, {
          withCredentials: true
        })
      );
      this.isEditing = false;
      await this.loadDonator(this.donator._id);
    } catch (error) {
      this.updateErrorMessage = this.getErrorMessage(error);
    } finally {
      this.isSaving = false;
    }
  }

  onPostalCodeInput(value: string): void {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly !== this.editModel.postalCode) {
      this.editModel.postalCode = digitsOnly;
    }
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

  private async loadDonator(donatorId: string): Promise<void> {
    const startedAt = Date.now();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<DonatorProfileResponse>(`${this.apiBaseUrl}/api/donator/dashboard/${donatorId}`)
      );

      this.donator = response?.donatorDetails ?? null;
      const receipts = response?.receiptList ?? [];
      this.receipts = receipts
        .map((receipt) => ({
          id: receipt._id,
          receiptNumber: receipt.receiptNumber || '-',
          date: receipt.donationDate?.slice(0, 10) || '-',
          amount: Number(receipt.amount || 0),
          pdfId: receipt.pdfID
        }))
        .sort((left, right) => right.date.localeCompare(left.date));

      if (this.donator) {
        this.hydrateEditModel(this.donator);
      }

      if (!this.donator) {
        this.errorMessage = 'Donateur introuvable.';
      }
    } catch {
      this.errorMessage = 'Impossible de charger le donateur.';
      this.donator = null;
      this.receipts = [];
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

  private hydrateEditModel(donator: DonatorDetails): void {
    this.editModel = {
      lastName: donator.lastName || '',
      firstName: donator.firstName || '',
      companyName: donator.companyName || '',
      address: donator.address || '',
      city: donator.city || '',
      postalCode: donator.postalCode || '',
      country: donator.country || 'France',
      email: donator.email || ''
    };
  }

  private buildUpdatePayload(): Record<string, string> {
    return {
      firstName: this.editModel.firstName.trim(),
      lastName: this.editModel.lastName.trim(),
      companyName: this.editModel.companyName.trim(),
      address: this.editModel.address.trim(),
      city: this.editModel.city.trim(),
      postalCode: this.editModel.postalCode.trim(),
      country: this.editModel.country.trim(),
      email: this.editModel.email.trim()
    };
  }

  private getValidationMessage(): string {
    if (this.hasModeConflict) {
      return "Choisissez entre un nom d'entreprise ou un nom et prenom.";
    }

    if (!this.hasCompanyName) {
      if (!this.editModel.firstName.trim() || !this.editModel.lastName.trim()) {
        return 'Nom et prenom requis si aucune societe.';
      }
    }

    if (this.editModel.address.trim()) {
      if (!this.editModel.city.trim() || !this.editModel.postalCode.trim() || !this.editModel.country.trim()) {
        return "L'adresse est incomplete (ville, code postal, pays).";
      }
    }

    const postalCode = this.editModel.postalCode.trim();
    if (postalCode && !/^\d+$/.test(postalCode)) {
      return 'Le code postal doit contenir uniquement des chiffres.';
    }

    if (postalCode && postalCode.length < 5) {
      return 'Le code postal doit contenir au moins 5 chiffres.';
    }

    return 'Veuillez verifier les champs requis.';
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const message = (error as { error?: { message?: string } }).error?.message;
      if (message) {
        return message;
      }
    }
    return 'Impossible de mettre a jour le donateur.';
  }
}
