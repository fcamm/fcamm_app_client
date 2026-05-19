import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly offlineSignal = signal(false);
  readonly isOffline = this.offlineSignal.asReadonly();

  setOffline(isOffline: boolean): void {
    this.offlineSignal.set(isOffline);
  }

  getOfflineValue(): boolean {
    return this.offlineSignal();
  }
}
