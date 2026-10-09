import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const withToken = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  if (!token || !req.url.startsWith(environment.apiUrl) || auth.isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Sessiyani tiklab bo'lmadi (refresh token muddati o'tgan / bekor qilingan) — qayta login.
  const endSession = (error: unknown) => {
    if (auth.isSessionError(error) && auth.isAuthenticated()) {
      auth.clear();
      router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    }
    return throwError(() => error);
  };

  // Access token tugash arafasida bo'lsa — so'rovdan oldin yangilanadi.
  const token$ = auth.accessExpiresSoon() ? from(auth.refreshAccessToken(token)) : of(token);

  return token$.pipe(
    catchError(endSession),
    switchMap((current) =>
      next(withToken(req, current)).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          // Access token yaroqsiz — bir marta yangilab, so'rov qayta yuboriladi.
          return from(auth.refreshAccessToken(current)).pipe(
            catchError(endSession),
            switchMap((fresh) => next(withToken(req, fresh))),
          );
        }),
      ),
    ),
  );
};
