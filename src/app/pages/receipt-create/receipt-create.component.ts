import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface DonatorOption {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
}

interface DonatorListResponse {
  donators?: DonatorOption[];
}

interface CreateDonatorResponse {
  donator?: {
    _id?: string;
  };
}

interface ReceiptCreateResponse {
  receipt?: {
    _id?: string;
    receiptNumber?: string;
    pdfID?: string;
  };
}

interface ReceiptActionState {
  pdfId: string;
  receiptNumber?: string;
}

@Component({
  selector: 'app-receipt-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receipt-create.component.html',
  styleUrl: './receipt-create.component.css'
})
export class ReceiptCreateComponent implements OnInit {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  useExistingDonator = true;
  filterText = '';
  selectedDonatorId = '';
  isLoadingDonators = false;
  isSubmitting = false;
  submitAttempted = false;
  errorMessage = '';
  actionErrorMessage = '';
  actionEmail = '';
  isSendingEmail = false;
  postCreateAction: ReceiptActionState | null = null;
  showDonatorDropdown = false;

  donators: DonatorOption[] = [];

  donatorModel = {
    lastName: '',
    firstName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    email: ''
  };

  receiptModel = {
    amountInput: '',
    donationDate: '',
    paymentMethod: '',
    subject: 'Centre Islamique de Montreuil'
  };

  paymentMethods = [
    { label: 'Chèque', value: 'CHEQUE' },
    { label: 'Espèce', value: 'ESPECE' },
    { label: 'Carte bancaire', value: 'CARTE' },
    { label: 'Virement bancaire', value: 'VIREMENT' }
  ];

  get filteredDonators(): DonatorOption[] {
    const query = this.filterText.trim().toLowerCase();
    if (!query) {
      return this.donators;
    }

    return this.donators.filter((donator) => {
      const label = this.getDonatorLabel(donator).toLowerCase();
      return label.includes(query);
    });
  }

  get canSubmit(): boolean {
    if (this.isSubmitting || this.isLoadingDonators) {
      return false;
    }

    if (this.postCreateAction) {
      return false;
    }

    return this.getValidationMessage().length === 0;
  }

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.applyDefaultSubjectForRole();
    await this.loadDonators();
  }

  get amountWords(): string {
    const amount = this.parseAmount(this.receiptModel.amountInput);
    if (!Number.isFinite(amount)) {
      return '';
    }

    return this.formatAmountToWords(amount);
  }

  onDonatorSelect(): void {
    if (!this.useExistingDonator) {
      return;
    }
    const selected = this.donators.find((donator) => donator.id === this.selectedDonatorId);
    if (!selected) {
      this.clearDonatorForm();
      return;
    }

    this.filterText = this.getDonatorLabel(selected);

    this.donatorModel = {
      lastName: selected.lastName,
      firstName: selected.firstName,
      companyName: selected.companyName,
      address: selected.address,
      city: selected.city,
      postalCode: selected.postalCode,
      country: selected.country,
      email: selected.email || ''
    };
  }

  onDonatorLabelChange(): void {
    const label = this.filterText.trim();
    if (!label) {
      this.clearDonatorForm();
      return;
    }

    const selected = this.donators.find((donator) => this.getDonatorLabel(donator) === label);
    if (!selected) {
      this.selectedDonatorId = '';
      return;
    }

    this.selectedDonatorId = selected.id;
    this.onDonatorSelect();
  }

  onDonatorInput(): void {
    this.showDonatorDropdown = true;
    this.onDonatorLabelChange();
  }

  openDonatorDropdown(): void {
    this.showDonatorDropdown = true;
  }

  closeDonatorDropdown(): void {
    window.setTimeout(() => {
      this.showDonatorDropdown = false;
    }, 150);
  }

  selectDonatorOption(donator: DonatorOption): void {
    this.selectedDonatorId = donator.id;
    this.filterText = this.getDonatorLabel(donator);
    this.onDonatorSelect();
    this.showDonatorDropdown = false;
  }

  clearDonatorForm(): void {
    this.selectedDonatorId = '';
    this.donatorModel = {
      lastName: '',
      firstName: '',
      companyName: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'France',
      email: ''
    };
  }

  onExistingToggle(): void {
    if (!this.useExistingDonator) {
      this.clearDonatorForm();
      return;
    }

    this.onDonatorSelect();
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.submitAttempted = true;
    this.errorMessage = this.getValidationMessage();
    if (this.errorMessage) {
      return;
    }

    this.isSubmitting = true;

    try {
      const donatorId = this.useExistingDonator
        ? this.selectedDonatorId
        : await this.createDonator();

      if (!donatorId) {
        this.errorMessage = 'Impossible de determiner le donateur.';
        return;
      }

      const receiptResponse = await firstValueFrom(
        this.http.post<ReceiptCreateResponse>(
          `${this.apiBaseUrl}/api/receipt`,
          {
            donatorID: donatorId,
            amount: this.parseAmount(this.receiptModel.amountInput),
            donationDate: this.receiptModel.donationDate,
            paymentMethod: this.receiptModel.paymentMethod,
            subject: this.receiptModel.subject
          },
          { withCredentials: true }
        )
      );

      const pdfId = receiptResponse?.receipt?.pdfID;
      const receiptNumber = receiptResponse?.receipt?.receiptNumber;

      if (pdfId) {
        this.actionEmail = this.resolveActionEmail(donatorId);
        this.postCreateAction = { pdfId, receiptNumber };
      }

      await this.loadDonators();
      this.submitAttempted = false;
      this.actionErrorMessage = '';
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  async downloadCreatedReceipt(): Promise<void> {
    if (!this.postCreateAction) {
      return;
    }

    await this.downloadReceiptPdf(this.postCreateAction.pdfId, this.postCreateAction.receiptNumber);
    this.finalizePostCreateAction();
  }

  async sendCreatedReceipt(): Promise<void> {
    if (!this.postCreateAction || this.isSendingEmail) {
      return;
    }

    const email = this.actionEmail.trim();
    if (!email) {
      this.actionErrorMessage = 'Email obligatoire pour envoyer le recu.';
      return;
    }

    this.isSendingEmail = true;
    this.actionErrorMessage = '';

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiBaseUrl}/api/receipt/send`,
          { email, pdfID: this.postCreateAction.pdfId },
          { withCredentials: true }
        )
      );
      this.finalizePostCreateAction();
    } catch (error) {
      this.actionErrorMessage = this.getErrorMessage(error);
    } finally {
      this.isSendingEmail = false;
    }
  }

  skipPostCreateAction(): void {
    if (!this.postCreateAction) {
      return;
    }

    this.finalizePostCreateAction();
  }

  onPostalCodeInput(value: string): void {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly !== this.donatorModel.postalCode) {
      this.donatorModel.postalCode = digitsOnly;
    }
  }

  private getDonatorLabel(donator: DonatorOption): string {
    if (donator.companyName) {
      return donator.companyName;
    }

    return `${donator.firstName} ${donator.lastName}`.trim();
  }

  private async downloadReceiptPdf(pdfId: string, receiptNumber?: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${this.apiBaseUrl}/api/pdf/${pdfId}`, {
          responseType: 'arraybuffer',
          observe: 'response',
          withCredentials: true
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
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = receiptNumber ? `${receiptNumber}.pdf` : `recu-${pdfId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore download failures; receipt is still created.
    }
  }

  private async loadDonators(): Promise<void> {
    this.isLoadingDonators = true;
    try {
      const response = await firstValueFrom(
        this.http.get<DonatorListResponse>(`${this.apiBaseUrl}/api/list/donator`, {
          withCredentials: true
        })
      );

      const donators = response?.donators ?? [];
      this.donators = donators.map((donator) => ({
        ...donator,
        id: (donator as { _id?: string })._id || donator.id
      }));
    } catch {
      this.donators = [];
    } finally {
      this.isLoadingDonators = false;
    }
  }

  private async createDonator(): Promise<string> {
    const payload = this.buildDonatorPayload();
    const response = await firstValueFrom(
      this.http.post<CreateDonatorResponse>(`${this.apiBaseUrl}/api/donator`, payload, {
        withCredentials: true
      })
    );

    return response?.donator?._id || '';
  }

  private buildDonatorPayload(): Record<string, string> {
    const payload: Record<string, string> = {};
    const assignIfValue = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        payload[key] = trimmed;
      }
    };

    assignIfValue('firstName', this.donatorModel.firstName);
    assignIfValue('lastName', this.donatorModel.lastName);
    assignIfValue('companyName', this.donatorModel.companyName);
    assignIfValue('address', this.donatorModel.address);
    assignIfValue('city', this.donatorModel.city);
    assignIfValue('postalCode', this.donatorModel.postalCode);
    assignIfValue('country', this.donatorModel.country);
    assignIfValue('email', this.donatorModel.email);

    return payload;
  }

  private parseAmount(input: string | number): number {
    const raw = typeof input === 'number' ? String(input) : input;
    const normalized = raw.replace(',', '.').trim();
    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  private applyDefaultSubjectForRole(): void {
    const role = this.authService.getUserRole();
    if (role && role.toLowerCase() === 'tester') {
      this.receiptModel.subject = 'exemple de motif de don';
    }
  }

  private resolveActionEmail(donatorId: string): string {
    if (!this.useExistingDonator) {
      return this.donatorModel.email.trim();
    }

    const selected = this.donators.find((donator) => donator.id === donatorId);
    return selected?.email?.trim() || '';
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

  private resetReceiptForm(): void {
    this.receiptModel = {
      amountInput: '',
      donationDate: '',
      paymentMethod: '',
      subject: ''
    };
  }

  private finalizePostCreateAction(): void {
    this.postCreateAction = null;
    this.actionEmail = '';
    this.actionErrorMessage = '';
    this.resetReceiptForm();
    if (this.useExistingDonator) {
      this.filterText = '';
      this.selectedDonatorId = '';
    } else {
      this.clearDonatorForm();
    }

    this.router.navigate(['/menu']);
  }

  private getValidationMessage(): string {
    if (this.useExistingDonator) {
      if (!this.selectedDonatorId) {
        return 'Veuillez selectionner un donateur.';
      }
    } else {
      const hasCompany = this.donatorModel.companyName.trim().length > 0;
      const hasPerson =
        this.donatorModel.firstName.trim().length > 0 || this.donatorModel.lastName.trim().length > 0;

      if (hasCompany && hasPerson) {
        return "Choisissez entre un nom d'entreprise ou un nom et prenom.";
      }

      if (!hasCompany) {
        if (!this.donatorModel.firstName.trim() || !this.donatorModel.lastName.trim()) {
          return 'Nom et prenom requis si aucune societe.';
        }
      }

      if (this.donatorModel.address.trim()) {
        if (
          !this.donatorModel.city.trim() ||
          !this.donatorModel.postalCode.trim() ||
          !this.donatorModel.country.trim()
        ) {
          return "L'adresse est incomplete (ville, code postal, pays).";
        }
      }

      const postalCode = this.donatorModel.postalCode.trim();
      if (postalCode && !/^\d+$/.test(postalCode)) {
        return 'Le code postal doit contenir uniquement des chiffres.';
      }

      if (postalCode && postalCode.length < 5) {
        return 'Le code postal doit contenir au moins 5 chiffres.';
      }
    }

    const amount = this.parseAmount(this.receiptModel.amountInput);
    if (!amount || amount <= 0) {
      return 'Veuillez saisir un montant valide.';
    }

    if (!this.receiptModel.donationDate) {
      return 'Veuillez choisir la date du don.';
    }

    if (!this.receiptModel.paymentMethod) {
      return 'Veuillez choisir le mode de paiement.';
    }

    return '';
  }

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const message = (error as { error?: { message?: string } }).error?.message;
      if (message) {
        return message;
      }
    }
    return 'Impossible de creer le recu.';
  }

  private formatAmountToWords(amount: number): string {
    const euros = Math.floor(amount);
    const cents = Math.round((amount - euros) * 100);
    const eurosWords = this.numberToWordsFr(euros);
    const centsWords = this.numberToWordsFr(cents);

    if (cents > 0) {
      return `${eurosWords} euros et ${centsWords} centimes`;
    }

    return `${eurosWords} euros`;
  }

  private numberToWordsFr(value: number): string {
    if (value === 0) {
      return 'zero';
    }

    const units = [
      '',
      'un',
      'deux',
      'trois',
      'quatre',
      'cinq',
      'six',
      'sept',
      'huit',
      'neuf'
    ];
    const teens = [
      'dix',
      'onze',
      'douze',
      'treize',
      'quatorze',
      'quinze',
      'seize',
      'dix-sept',
      'dix-huit',
      'dix-neuf'
    ];
    const tens = [
      '',
      'dix',
      'vingt',
      'trente',
      'quarante',
      'cinquante',
      'soixante',
      'soixante-dix',
      'quatre-vingt',
      'quatre-vingt-dix'
    ];

    if (value < 10) {
      return units[value];
    }

    if (value < 20) {
      return teens[value - 10];
    }

    if (value < 100) {
      const ten = Math.floor(value / 10);
      const unit = value % 10;
      if (ten === 7 || ten === 9) {
        const base = ten === 7 ? 'soixante' : 'quatre-vingt';
        return unit === 1
          ? `${base} et ${teens[unit]}`
          : `${base}-${teens[unit]}`;
      }

      if (unit === 0) {
        return tens[ten];
      }

      if (unit === 1 && ten !== 8) {
        return `${tens[ten]} et un`;
      }

      return `${tens[ten]}-${units[unit]}`;
    }

    if (value < 1000) {
      const hundred = Math.floor(value / 100);
      const rest = value % 100;
      const hundredLabel = hundred === 1 ? 'cent' : `${units[hundred]} cent`;
      if (rest === 0) {
        return hundredLabel;
      }

      return `${hundredLabel} ${this.numberToWordsFr(rest)}`;
    }

    if (value < 1000000) {
      const thousand = Math.floor(value / 1000);
      const rest = value % 1000;
      const thousandLabel = thousand === 1 ? 'mille' : `${this.numberToWordsFr(thousand)} mille`;
      if (rest === 0) {
        return thousandLabel;
      }

      return `${thousandLabel} ${this.numberToWordsFr(rest)}`;
    }

    const million = Math.floor(value / 1000000);
    const rest = value % 1000000;
    const millionLabel = million === 1 ? 'un million' : `${this.numberToWordsFr(million)} millions`;
    if (rest === 0) {
      return millionLabel;
    }

    return `${millionLabel} ${this.numberToWordsFr(rest)}`;
  }
}
