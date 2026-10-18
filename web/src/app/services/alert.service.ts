import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AlertService {

  constructor() {
  }

  showError(error: any) {
    if (error) {
      if (typeof error === 'string') {
        Swal.fire('Errore', error, 'error');
        return;
      }
      if (error instanceof HttpErrorResponse) {
        if (error.error instanceof ErrorEvent) {
          Swal.fire('Errore', error.error.message, 'error');
          return;
        }
        if (error.error && error.error.error && error.error.error.message) {
          Swal.fire('Errore', error.error.error.message, 'error');
          return;
        }
        // server-side error
        Swal.fire('Errore', `${error.statusText} (${error.status})`, 'error');
        return;
      }
    }

    Swal.fire('Errore', 'Si è verificato un errore imprevisto. Riprova più tardi.', 'error');
  }

}
