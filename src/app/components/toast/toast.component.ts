import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastMessage, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  readonly toasts$: Observable<ToastMessage[]>;

  constructor(private readonly toastService: ToastService) {
    this.toasts$ = this.toastService.toasts$;
  }

  removeToast(id: string): void {
    this.toastService.remove(id);
  }
}
