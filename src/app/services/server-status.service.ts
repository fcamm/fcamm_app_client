import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly offlineSignal = signal(false);
  readonly isOffline = this.offlineSignal.asReadonly();
  private readonly timeoutSignal = signal(false);
  readonly timeoutReached = this.timeoutSignal.asReadonly();
  private pollingId?: number;
  private offlineTimeoutId?: number;
  private readonly offlineTimeoutMs = 90_000;

  setOffline(isOffline: boolean): void {
    this.offlineSignal.set(isOffline);
    if (isOffline) {
      this.startOfflineTimeout();
      return;
    }

    this.clearOfflineTimeout();
    this.timeoutSignal.set(false);
  }

  consumeTimeoutFlag(): boolean {
    if (!this.timeoutSignal()) {
      return false;
    }

    this.timeoutSignal.set(false);
    return true;
  }

  getOfflineValue(): boolean {
    return this.offlineSignal();
  }

  startHealthPolling(requestUrl: string): void {
    if (typeof window === 'undefined' || this.pollingId) {
      return;
    }

    this.pollingId = window.setInterval(() => {
      const healthUrl = this.buildHealthUrl(requestUrl);
      fetch(healthUrl, { credentials: 'include', cache: 'no-store' })
        .then((response) => {
          if (response.ok || response.status === 304) {
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

  private startOfflineTimeout(): void {
    if (typeof window === 'undefined' || this.offlineTimeoutId) {
      return;
    }

    this.offlineTimeoutId = window.setTimeout(() => {
      this.offlineTimeoutId = undefined;
      if (this.offlineSignal()) {
        this.offlineSignal.set(false);
        this.timeoutSignal.set(true);
      }
    }, this.offlineTimeoutMs);
  }

  private clearOfflineTimeout(): void {
    if (!this.offlineTimeoutId) {
      return;
    }

    clearTimeout(this.offlineTimeoutId);
    this.offlineTimeoutId = undefined;
  }

  private buildHealthUrl(requestUrl: string): string {
    const healthUrl = new URL('/api/server-health', requestUrl);
    healthUrl.searchParams.set('t', Date.now().toString());
    return healthUrl.toString();
  }
}
