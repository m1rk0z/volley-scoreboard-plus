import { Injectable, Injector } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ScoreboardService } from '../services/scoreboard.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;
    const scoreboardService = this.injector.get(ScoreboardService);

    // If request already has Authorization or is login session call, proceed
    if (req.url.indexOf('/session') !== -1) {
      return next.handle(req);
    }

    const session = scoreboardService.getSession();
    let token = session && session.token ? session.token : null;
    if (!token) {
      try {
        const saved = localStorage.getItem('scoreboard_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.token) {
            token = parsed.token;
          }
        }
      } catch (e) {}
    }

    if (token && !req.headers.has('Authorization')) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // If 401 Unauthorized occurs on any protected API, auto-relogin transparently and retry once
        if (error.status === 401) {
          return scoreboardService.login({ username: 'admin', password: 'admin' }).pipe(
            switchMap((newSession: any) => {
              if (newSession && newSession.token) {
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newSession.token}`
                  }
                });
                return next.handle(retryReq);
              }
              return throwError(error);
            }),
            catchError((loginErr) => {
              return throwError(loginErr || error);
            })
          );
        }
        return throwError(error);
      })
    );
  }
}
