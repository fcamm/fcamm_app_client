import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface DonatorOption {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

@Component({
  selector: 'app-receipt-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './receipt-create.component.html',
  styleUrl: './receipt-create.component.css'
})
export class ReceiptCreateComponent {
  useExistingDonator = true;
  filterText = '';
  selectedDonatorId = '';

  donators: DonatorOption[] = [
    {
      id: '1',
      firstName: 'Karim',
      lastName: 'Benali',
      companyName: '',
      address: '12 Rue des Orangers',
      city: 'Montreuil',
      postalCode: '93100',
      country: 'France'
    },
    {
      id: '2',
      firstName: '',
      lastName: '',
      companyName: 'SAS Atlas',
      address: '5 Avenue de Paris',
      city: 'Montreuil',
      postalCode: '93100',
      country: 'France'
    }
  ];

  donatorModel = {
    lastName: '',
    firstName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  };

  receiptModel = {
    amountInput: '',
    donationDate: '',
    paymentMethod: 'espece'
  };

  paymentMethods = [
    { value: 'espece', label: 'Espece' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'virement', label: 'Virement' },
    { value: 'carte', label: 'Carte' }
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

  get amountWords(): string {
    const amount = Number(this.receiptModel.amountInput.replace(',', '.'));
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

    this.donatorModel = {
      lastName: selected.lastName,
      firstName: selected.firstName,
      companyName: selected.companyName,
      address: selected.address,
      city: selected.city,
      postalCode: selected.postalCode,
      country: selected.country
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

  clearDonatorForm(): void {
    this.selectedDonatorId = '';
    this.donatorModel = {
      lastName: '',
      firstName: '',
      companyName: '',
      address: '',
      city: '',
      postalCode: '',
      country: ''
    };
  }

  onExistingToggle(): void {
    if (!this.useExistingDonator) {
      this.clearDonatorForm();
      return;
    }

    this.onDonatorSelect();
  }

  submit(): void {
    // TODO: brancher la creation de recu + donateur.
    alert('Recu pret a etre enregistre.');
  }

  private getDonatorLabel(donator: DonatorOption): string {
    if (donator.companyName) {
      return donator.companyName;
    }

    return `${donator.firstName} ${donator.lastName}`.trim();
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
