import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-donator-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './donator-create.component.html',
  styleUrl: './donator-create.component.css'
})
export class DonatorCreateComponent {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  model = {
    lastName: '',
    firstName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    email: ''
  };

  isSubmitting = false;
  submitAttempted = false;
  errorMessage = '';

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  get hasCompanyName(): boolean {
    return this.model.companyName.trim().length > 0;
  }

  get hasPersonName(): boolean {
    return this.model.firstName.trim().length > 0 || this.model.lastName.trim().length > 0;
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

    return this.model.firstName.trim().length > 0 && this.model.lastName.trim().length > 0;
  }

  get isCompanyRequired(): boolean {
    return !this.hasPersonName;
  }

  get isPersonRequired(): boolean {
    return !this.hasCompanyName;
  }

  get isAddressDetailsRequired(): boolean {
    return this.model.address.trim().length > 0;
  }

  async submit(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canSubmit) {
      this.errorMessage = this.getValidationMessage();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    try {
      const payload = this.buildPayload();
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/donator`, payload, { withCredentials: true })
      );
      this.resetForm();
      this.submitAttempted = false;
      await this.router.navigate(['/menu']);
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  onPostalCodeInput(value: string): void {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly !== this.model.postalCode) {
      this.model.postalCode = digitsOnly;
    }
  }

  private buildPayload(): Record<string, string> {
    const payload: Record<string, string> = {};
    const assignIfValue = (key: string, value: string) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        payload[key] = trimmed;
      }
    };

    assignIfValue('firstName', this.model.firstName);
    assignIfValue('lastName', this.model.lastName);
    assignIfValue('companyName', this.model.companyName);
    assignIfValue('address', this.model.address);
    assignIfValue('city', this.model.city);
    assignIfValue('postalCode', this.model.postalCode);
    assignIfValue('country', this.model.country);
    assignIfValue('email', this.model.email);

    return payload;
  }

  private resetForm(): void {
    this.model = {
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

  private getValidationMessage(): string {
    if (this.hasModeConflict) {
      return "Choisissez entre un nom d'entreprise ou un nom et prenom.";
    }

    if (!this.hasCompanyName) {
      if (!this.model.firstName.trim() || !this.model.lastName.trim()) {
        return 'Nom et prenom requis si aucune societe.';
      }
    }

    if (this.model.address.trim()) {
      if (!this.model.city.trim() || !this.model.postalCode.trim() || !this.model.country.trim()) {
        return "L'adresse est incomplete (ville, code postal, pays).";
      }
    }

    const postalCode = this.model.postalCode.trim();
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
    return 'Impossible de creer le donateur.';
  }
}
