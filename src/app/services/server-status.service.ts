import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly offlineSignal = signal(false);
  readonly isOffline = this.offlineSignal.asReadonly();
  private pollingId?: number;

  setOffline(isOffline: boolean): void {
    this.offlineSignal.set(isOffline);
  }

  getOfflineValue(): boolean {
    return this.offlineSignal();
  }

  startHealthPolling(requestUrl: string): void {
    if (typeof window === 'undefined' || this.pollingId) {
      return;
    }

    const healthUrl = new URL('/api/server-health', requestUrl).toString();
    this.pollingId = window.setInterval(() => {
      fetch(healthUrl, { credentials: 'include' })
        .then((response) => {
          if (response.ok) {
            this.setOffline(false);
            this.stopHealthPolling();
          }
        })
        .catch(() => {
          // Keep polling until the server is back.
        });
    }, 3000);
  }

  stopHealthPolling(): void {
    if (!this.pollingId) {
      return;
    }

    clearInterval(this.pollingId);
    this.pollingId = undefined;
  }
}
