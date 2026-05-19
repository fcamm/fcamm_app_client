import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ServerStatusService } from '../services/server-status.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const serverStatus = inject(ServerStatusService);
  const token = authService.getToken();

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: token } : {}
  });

  return next(authReq).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        serverStatus.setOffline(false);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const isLoginCall = req.url.includes('/api/session') && req.method === 'POST';
      const isNetworkError = error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;

      if (isNetworkError && !isLoginCall) {
        serverStatus.setOffline(true);
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
    })
  );
};
