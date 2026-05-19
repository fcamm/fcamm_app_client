import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  setReturnUrl(state.url);
  return router.createUrlTree(['/login']);
};

export const authMatchGuard: CanMatchFn = (_route, segments) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = segments.length > 0
    ? `/${segments.map((segment) => segment.path).join('/')}`
    : '/';

  setReturnUrl(returnUrl);
  return router.createUrlTree(['/login']);
};

export const loginGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/menu']);
};

export const rootRedirectGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return authService.isAuthenticated()
    ? router.createUrlTree(['/menu'])
    : router.createUrlTree(['/login']);
};

const RETURN_URL_KEY = 'fcamm_return_url';

const setReturnUrl = (returnUrl: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
};
