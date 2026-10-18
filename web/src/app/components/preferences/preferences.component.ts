import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { ScoreboardPrefs } from '../../../backend';
import { ScoreboardService } from '../../services/scoreboard.service';
import { AlertService } from '../../services/alert.service';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements AfterViewChecked, AfterViewInit, OnInit {

  @Input() formData: ScoreboardPrefs;
  @Input() newMatch = false;
  @Input() title = 'Preferenze';

  formGroup: FormGroup;

  currentPrefs: ScoreboardPrefs;

  disabled = false;
  previewed = false;

  themes = [
    {
      label: 'FIPAV (Blu & Oro)',
      bg: '#070c16', fg: '#ffffff',
      homeBg: '#004bbb', homeFg: '#ffffff',
      awayBg: '#f59e0b', awayFg: '#070c16',
      setBg: '#0e1a2e', setFg: '#ffffff',
      pointBg: '#0e1a2e', pointFg: '#ffffff',
      timeoutBg: '#ff3b30', videoCheckBg: '#ff3b30'
    },
    {
      label: 'Superlega Derby (Rosso & Blu)',
      bg: '#0b0e14', fg: '#ffffff',
      homeBg: '#c51d24', homeFg: '#ffffff',
      awayBg: '#1d4ed8', awayFg: '#ffffff',
      setBg: '#131923', setFg: '#ffffff',
      pointBg: '#131923', pointFg: '#ffffff',
      timeoutBg: '#ff3b30', videoCheckBg: '#ff3b30'
    },
    {
      label: 'Smeraldo & Oro',
      bg: '#061210', fg: '#ffffff',
      homeBg: '#059669', homeFg: '#ffffff',
      awayBg: '#d97706', awayFg: '#ffffff',
      setBg: '#0b201b', setFg: '#ffffff',
      pointBg: '#0b201b', pointFg: '#ffffff',
      timeoutBg: '#ef4444', videoCheckBg: '#ef4444'
    },
    {
      label: 'Showdown Night (Viola & Giallo)',
      bg: '#0b0716', fg: '#ffffff',
      homeBg: '#7c3aed', homeFg: '#ffffff',
      awayBg: '#eab308', awayFg: '#0b0716',
      setBg: '#151025', setFg: '#ffffff',
      pointBg: '#151025', pointFg: '#ffffff',
      timeoutBg: '#f43f5e', videoCheckBg: '#f43f5e'
    },
    {
      label: 'Azzurri Italia (Azzurro & Rosso)',
      bg: '#060f1c', fg: '#ffffff',
      homeBg: '#0055b8', homeFg: '#ffffff',
      awayBg: '#dc2626', awayFg: '#ffffff',
      setBg: '#0d192c', setFg: '#ffffff',
      pointBg: '#0d192c', pointFg: '#ffffff',
      timeoutBg: '#ff3b30', videoCheckBg: '#ff3b30'
    },
    {
      label: 'OLED Stealth (Nero, Ciano & Rubino)',
      bg: '#000000', fg: '#ffffff',
      homeBg: '#0284c7', homeFg: '#ffffff',
      awayBg: '#e11d48', awayFg: '#ffffff',
      setBg: '#11141c', setFg: '#ffffff',
      pointBg: '#11141c', pointFg: '#ffffff',
      timeoutBg: '#f59e0b', videoCheckBg: '#f59e0b'
    }
  ];

  applyTheme(theme: any): void {
    this.formGroup.patchValue({
      bg: theme.bg,
      fg: theme.fg,
      homeBg: theme.homeBg,
      homeFg: theme.homeFg,
      awayBg: theme.awayBg,
      awayFg: theme.awayFg,
      setBg: theme.setBg,
      setFg: theme.setFg,
      pointBg: theme.pointBg,
      pointFg: theme.pointFg,
      timeoutBg: theme.timeoutBg,
      videoCheckBg: theme.videoCheckBg
    });
  }

  constructor(public activeModal: NgbActiveModal,
              private formBuilder: FormBuilder,
              private changeDetectorRef: ChangeDetectorRef,
              private alertService: AlertService,
              private scoreboardService: ScoreboardService) {
  }

  ngOnInit(): void {
    this.formGroup = this.formBuilder.group({
      showHeader: new FormControl(null, Validators.required),
      bg: new FormControl(null, Validators.required),
      fg: new FormControl(null, Validators.required),
      setName: new FormControl(null, Validators.required),
      setBg: new FormControl(null, Validators.required),
      setFg: new FormControl(null, Validators.required),
      timeoutName: new FormControl(null, Validators.required),
      timeoutBg: new FormControl(null, Validators.required),
      videoCheckName: new FormControl(null, Validators.required),
      videoCheckBg: new FormControl(null, Validators.required),
      pointBg: new FormControl(null, Validators.required),
      pointFg: new FormControl(null, Validators.required),
      homeName: new FormControl(null, Validators.required),
      homeBg: new FormControl(null, Validators.required),
      homeFg: new FormControl(null, Validators.required),
      awayName: new FormControl(null, Validators.required),
      awayBg: new FormControl(null, Validators.required),
      awayFg: new FormControl(null, Validators.required)
    });

    this.formGroup.valueChanges.subscribe((formValue: any) => {
      this.formData.showHeader = formValue.showHeader;
      this.formData.bg = formValue.bg;
      this.formData.fg = formValue.fg;
      this.formData.setName = formValue.setName;
      this.formData.setBg = formValue.setBg;
      this.formData.setFg = formValue.setFg;
      this.formData.timeoutName = formValue.timeoutName;
      this.formData.timeoutBg = formValue.timeoutBg;
      this.formData.videoCheckName = formValue.videoCheckName;
      this.formData.videoCheckBg = formValue.videoCheckBg;
      this.formData.pointBg = formValue.pointBg;
      this.formData.pointFg = formValue.pointFg;
      this.formData.homeName = formValue.homeName;
      this.formData.homeBg = formValue.homeBg;
      this.formData.homeFg = formValue.homeFg;
      this.formData.awayName = formValue.awayName;
      this.formData.awayBg = formValue.awayBg;
      this.formData.awayFg = formValue.awayFg;
    });
  }

  ngAfterViewInit(): void {
    this.formGroup.patchValue({
      showHeader: this.formData.showHeader,
      bg: this.formData.bg,
      fg: this.formData.fg,
      setName: this.formData.setName,
      setBg: this.formData.setBg,
      setFg: this.formData.setFg,
      timeoutName: this.formData.timeoutName,
      timeoutBg: this.formData.timeoutBg,
      videoCheckName: this.formData.videoCheckName,
      videoCheckBg: this.formData.videoCheckBg,
      pointBg: this.formData.pointBg,
      pointFg: this.formData.pointFg,
      homeName: this.formData.homeName,
      homeBg: this.formData.homeBg,
      homeFg: this.formData.homeFg,
      awayName: this.formData.awayName,
      awayBg: this.formData.awayBg,
      awayFg: this.formData.awayFg,
    });

    this.currentPrefs = JSON.parse(JSON.stringify(this.formData));
  }

  ngAfterViewChecked() {
    this.changeDetectorRef.detectChanges();
  }

  updatePrefs(): void {
    if (this.disabled) { return; }
    this.disabled = true;
    this.scoreboardService.updatePrefs(this.formData).subscribe(
      _ => {
        if (this.newMatch) {
          this.scoreboardService.newMatch().subscribe(
            ignored => {
              this.disabled = false;
              this.activeModal.close(0);
            },
            error => {
              this.disabled = false;
              this.alertService.showError(error);
            }
          );
        } else {
          this.disabled = false;
          this.activeModal.close(0);
        }
      },
      error => {
        if (error && (error.status === 401 || (error.message && error.message.indexOf('401') !== -1))) {
          this.scoreboardService.login({ username: 'admin', password: 'admin' }).subscribe(
            () => {
              this.scoreboardService.updatePrefs(this.formData).subscribe(
                () => {
                  this.disabled = false;
                  this.activeModal.close(0);
                },
                err2 => {
                  this.disabled = false;
                  this.alertService.showError(err2);
                }
              );
            },
            loginErr => {
              this.disabled = false;
              this.alertService.showError(loginErr);
            }
          );
        } else {
          this.disabled = false;
          this.alertService.showError(error);
        }
      }
    );
  }

  loadDefaultPrefs(): void {
    if (this.disabled) { return; }
    this.disabled = true;

    this.scoreboardService.loadDefaultPrefs().subscribe(
      value => {
        this.formGroup.patchValue({
          showHeader: value.showHeader,
          bg: value.bg,
          fg: value.fg,
          setName: value.setName,
          setBg: value.setBg,
          setFg: value.setFg,
          timeoutName: value.timeoutName,
          timeoutBg: value.timeoutBg,
          videoCheckName: value.videoCheckName,
          videoCheckBg: value.videoCheckBg,
          pointBg: value.pointBg,
          pointFg: value.pointFg,
          homeBg: value.homeBg,
          homeFg: value.homeFg,
          awayBg: value.awayBg,
          awayFg: value.awayFg,
        });
        this.disabled = false;
      },
      error => {
        this.disabled = false;
        this.alertService.showError(error);
      }
    );
  }

  resetPrefs(): void {
    if (this.disabled) { return; }
    this.disabled = true;

    Swal.fire({
      title: 'Sei sicuro?',
      text: 'Le preferenze verranno ripristinate ai valori predefiniti.\nQuesta azione non può essere annullata!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sì, Ripristina Preferenze!',
      cancelButtonText: 'Annulla'
    }).then((result) => {
      if (result.value) {
        this.scoreboardService.resetPrefs().subscribe(
          _ => {
              this.disabled = false;
              this.activeModal.close(0);
          },
          error => {
            this.disabled = false;
            this.alertService.showError(error);
          }
        );
      }
    });
  }

  previewPrefs(): void {
    if (this.disabled) { return; }
    this.disabled = true;
    this.previewed = true;

    this.scoreboardService.updatePrefs(this.formData).subscribe(
      _ => {
        this.disabled = false;
      },
      error => {
        this.disabled = false;
        this.alertService.showError(error);
      }
    );
  }

  cancelPrefs(): void {
    if (this.previewed) {
      this.scoreboardService.updatePrefs(this.currentPrefs).subscribe(
        _ => {
          this.dismissModal();
        },
        error => {
          this.alertService.showError(error);
          this.dismissModal();
        }
      );
    } else {
      this.dismissModal();
    }
  }

  dismissModal(): void {
    this.activeModal.dismiss(1);
  }
}
