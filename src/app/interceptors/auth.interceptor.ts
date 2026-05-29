import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, finalize, from, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ServerStatusService } from '../services/server-status.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const serverStatus = inject(ServerStatusService);
  const token = authService.getToken();

  const hasRetried = req.headers.has('x-fcamm-retry');
  const isLoginCall = req.url.includes('/api/session') && req.method === 'POST';
  const isHealthCheck = req.url.includes('/api/server-health');
  const isRetryable = req.method === 'GET' || req.method === 'HEAD';
  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: token } : {}
  });

  let slowRequestTimer: number | undefined;
  let requestCompleted = false;

  if (isPlatformBrowser(platformId)) {
    slowRequestTimer = window.setTimeout(() => {
      if (!requestCompleted) {
        if (isLoginCall || isHealthCheck) {
          return;
        }
        try {
          const healthUrl = buildHealthUrl(req.url);
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 3000);

          fetch(healthUrl, { credentials: 'include', cache: 'no-store', signal: controller.signal })
            .then((response) => {
              if (!response.ok && response.status !== 304) {
                serverStatus.setOffline(true);
                serverStatus.startHealthPolling(req.url);
              }
            })
            .catch(() => {
              serverStatus.setOffline(true);
              serverStatus.startHealthPolling(req.url);
            })
            .finally(() => {
              clearTimeout(timeoutId);
            });
        } catch {
          serverStatus.setOffline(true);
          serverStatus.startHealthPolling(req.url);
        }
      }
    }, 3000);
  }

  return next(authReq).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        serverStatus.setOffline(false);
        serverStatus.stopHealthPolling();
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const isNetworkError = error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;

      if (isNetworkError && !isLoginCall && !isHealthCheck) {
        serverStatus.setOffline(true);
        serverStatus.startHealthPolling(req.url);

        if (!isPlatformBrowser(platformId)) {
          return throwError(() => error);
        }

        if (!hasRetried && isRetryable) {
          const retriedReq = authReq.clone({
            setHeaders: { 'x-fcamm-retry': '1' }
          });

          return from(waitForServerOnline(req.url)).pipe(
            switchMap(() => next(retriedReq))
          );
        }

        return throwError(() => error);
      }

      if (error.status === 401 && !isLoginCall) {
        authService.clearToken();
        if (isPlatformBrowser(platformId)) {
          const currentUrl = router.url || '/';
          const isOnLogin = currentUrl.startsWith('/login');

          if (!isLoginCall && !isOnLogin) {
            router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
          } else {
            router.navigate(['/login'], { replaceUrl: true });
          }
        }
      }
      return throwError(() => error);
    }),
    finalize(() => {
      requestCompleted = true;
      if (slowRequestTimer) {
        clearTimeout(slowRequestTimer);
      }
    })
  );
};

const waitForServerOnline = async (requestUrl: string): Promise<void> => {
  const maxWaitMs = 90_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const healthUrl = buildHealthUrl(requestUrl);
      const response = await fetch(healthUrl, { credentials: 'include', cache: 'no-store' });
      if (response.ok || response.status === 304) {
        return;
      }
    } catch {
      // Keep waiting until server is reachable.
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error('SERVER_SLEEP');
};

const buildHealthUrl = (requestUrl: string): string => {
  const healthUrl = new URL('/api/server-health', requestUrl);
  healthUrl.searchParams.set('t', Date.now().toString());
  return healthUrl.toString();
};
