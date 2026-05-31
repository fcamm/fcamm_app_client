
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly tokenKey = 'fcamm_token';
    private readonly isBrowser: boolean;
    private readonly apiBaseUrl = environment.apiBaseUrl;
    private hasValidated = false;

    constructor(
        @Inject(PLATFORM_ID) platformId: object,
        private readonly http: HttpClient
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    /**
     * Retourne le rôle de l'utilisateur connecté (si stocké dans le token, ou null sinon)
     */
    getUserRole(): string | null {
        const token = this.getToken();
        if (!token) return null;
        try {
            // Si le token est un JWT, il faut décoder la partie payload
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.role || null;
        } catch {
            // Sinon, on tente de lire un objet JSON simple
            try {
                const obj = JSON.parse(token);
                return obj.role || null;
            } catch {
                return null;
            }
        }
    }

    getToken(): string | null {
        if (!this.isBrowser) {
            return null;
        }

        return localStorage.getItem(this.tokenKey);
    }

    setToken(token: string): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.setItem(this.tokenKey, token);
        this.hasValidated = false;
    }

    clearToken(): void {
        if (!this.isBrowser) {
            return;
        }

        localStorage.removeItem(this.tokenKey);
        this.hasValidated = false;
    }

    isAuthenticated(): boolean {
        return Boolean(this.getToken());
    }

    async validateSession(): Promise<boolean> {
        if (this.hasValidated && this.isAuthenticated()) {
            return true;
        }

        try {
            await firstValueFrom(
                this.http.get(`${this.apiBaseUrl}/api/session`, {
                    withCredentials: true,
                    headers: this.getAuthHeaders()
                })
            );
            this.hasValidated = true;
            return true;
        } catch {
            this.clearToken();
            return false;
        }
    }

    async logout(): Promise<void> {
        try {
            await firstValueFrom(
                this.http.delete(`${this.apiBaseUrl}/api/session`, {
                    withCredentials: true,
                    headers: this.getAuthHeaders()
                })
            );
        } finally {
            this.clearToken();
        }
    }

    private getAuthHeaders(): Record<string, string> | undefined {
        const token = this.getToken();
        if (!token) {
            return undefined;
        }

        return { Authorization: token };
    }
}
