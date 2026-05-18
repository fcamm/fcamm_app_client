import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-donator-create',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './donator-create.component.html',
  styleUrl: './donator-create.component.css'
})
export class DonatorCreateComponent {
  model = {
    lastName: '',
    firstName: '',
    companyName: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  };

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

    return this.hasCompanyName || this.hasPersonName;
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }

    // TODO: brancher l'API de creation du donateur.
    alert('Donateur pret a etre enregistre.');
  }
}
