import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { ScoreboardService } from './scoreboard.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuardService implements CanActivate {

  constructor(private scoreboardService: ScoreboardService,
              private router: Router) {
  }

  canActivate(): Observable<boolean> | boolean {
    if (this.scoreboardService.isAuthenticated()) {
      return true;
    }
    return this.scoreboardService.login({ username: 'admin', password: 'admin' }).pipe(
      map(session => !!(session && session.token)),
      catchError(() => {
        this.router.navigate(['login']);
        return of(false);
      })
    );
  }
}
