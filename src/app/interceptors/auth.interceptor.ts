import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const token = authService.getToken();

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: token } : {}
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearToken();
        if (isPlatformBrowser(platformId)) {
          const returnUrl = router.url || '/';
          router.navigate(['/login'], { queryParams: { returnUrl } });
        }
      }
      return throwError(() => error);
    })
  );
};
