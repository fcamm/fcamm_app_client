import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, tap, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const messageInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const platformId = inject(PLATFORM_ID);
  const suppressToast =
    req.url.includes('/api/list/donator') ||
    req.url.includes('/api/server-health');

  return next(req).pipe(
    tap((event) => {
      if (!isPlatformBrowser(platformId) || suppressToast) {
        return;
      }

      if (event instanceof HttpResponse) {
        const body = event.body as { message?: string } | null;
        if (body?.message) {
          toastService.show(body.message, event.status >= 400 ? 'error' : 'success');
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (isPlatformBrowser(platformId) && error.status !== 401 && !suppressToast) {
        const body = error.error as { message?: string } | null;
        const message = body?.message || 'Une erreur est survenue.';
        toastService.show(message, 'error');
      }
      return throwError(() => error);
    })
  );
};
