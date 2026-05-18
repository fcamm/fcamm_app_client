import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly isBrowser: boolean;
  private readonly toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  readonly toasts$ = this.toastsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  show(message: string, type: ToastType = 'info', durationMs = 2500): void {
    if (!this.isBrowser || !message.trim()) {
      return;
    }

    const toast: ToastMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message: message.trim(),
      type
    };

    const next = [...this.toastsSubject.value, toast];
    this.toastsSubject.next(next);

    setTimeout(() => {
      this.remove(toast.id);
    }, durationMs);
  }

  remove(id: string): void {
    const next = this.toastsSubject.value.filter((toast) => toast.id !== id);
    this.toastsSubject.next(next);
  }
}
