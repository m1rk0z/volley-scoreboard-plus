import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ElementRef, ViewChild, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ScoreboardCommand, ScoreboardPrefs, ScoreboardStatus, ScoreboardTeamStatus, TeamBallOwner} from '../../../backend';
import { ScoreboardService } from '../../services/scoreboard.service';

// Not in the TypeScript 3.5 DOM typings
declare const ResizeObserver: any;

const TIMEOUT_SECONDS = 30;
const SETS_TO_WIN = 3;

interface TimeoutTimer {
  team: 'home' | 'away';
  left: number;
}

@Component({
  selector: 'app-scoreboard',
  templateUrl: './scoreboard.component.html',
  styleUrls: ['./scoreboard.component.scss']
})

export class ScoreboardComponent implements OnInit, OnDestroy {
  readonly TeamBallOwner = TeamBallOwner;

  @Output() homePointSwipeUp: EventEmitter<void> = new EventEmitter<void>();
  @Output() homePointSwipeDown: EventEmitter<void> = new EventEmitter<void>();
  @Output() awayPointSwipeUp: EventEmitter<void> = new EventEmitter<void>();
  @Output() awayPointSwipeDown: EventEmitter<void> = new EventEmitter<void>();
  @Output() currentSetTap: EventEmitter<void> = new EventEmitter<void>();
  @Output() homeSetSwipeUp: EventEmitter<void> = new EventEmitter<void>();
  @Output() homeSetSwipeDown: EventEmitter<void> = new EventEmitter<void>();
  @Output() awaySetSwipeUp: EventEmitter<void> = new EventEmitter<void>();
  @Output() awaySetSwipeDown: EventEmitter<void> = new EventEmitter<void>();
  @Output() homeTimeoutTap: EventEmitter<void> = new EventEmitter<void>();
  @Output() homeVideoCheckTap: EventEmitter<void> = new EventEmitter<void>();
  @Output() awayTimeoutTap: EventEmitter<void> = new EventEmitter<void>();
  @Output() awayVideoCheckTap: EventEmitter<void> = new EventEmitter<void>();

  @Output() homeNameSwipeLeft: EventEmitter<void> = new EventEmitter<void>();
  @Output() homeNameSwipeRight: EventEmitter<void> = new EventEmitter<void>();
  @Output() nameTap: EventEmitter<void> = new EventEmitter<void>();

  @Input() showHeader = true;

  destroyed$ = new Subject();

  status: ScoreboardStatus;
  prefs: ScoreboardPrefs;

  loading = true;

  animSpider = false;

  timer: TimeoutTimer = null;
  private timerHandle: any = null;
  // the previous status came from the server (not the service placeholder)
  private trackedStatus = false;

  private resizeObserver: any = null;
  private onWindowResize = () => this.updateUnit();
  private boardEl: HTMLElement = null;

  @ViewChild('board', {static: false}) set board(ref: ElementRef) {
    this.observeBoard(ref ? ref.nativeElement : null);
  }

  constructor(private scoreboardService: ScoreboardService,
              private host: ElementRef,
              private zone: NgZone) { }

  ngOnInit(): void {
    this.scoreboardService.status$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe((status: ScoreboardStatus) => {
      if (this.trackedStatus) {
        this.trackTimeouts(this.status, status);
      }
      this.trackedStatus = this.scoreboardService.statusLoaded;
      this.status = status;
    });

    this.scoreboardService.prefs$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe((prefs: ScoreboardPrefs) => {
      this.prefs = prefs;
      this.loading = (prefs == null);
      if (prefs) {
        this.applyColors(prefs);
      }
    });

    this.scoreboardService.command$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe((cmd: ScoreboardCommand) => {
      this.manageCommand(cmd);
    });

    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.stopTimer();
    this.observeBoard(null);
    window.removeEventListener('resize', this.onWindowResize);
  }

  getLogoUrl(): string {
    return this.scoreboardService.getLogoUrl();
  }

  isHeaderVisible(): boolean {
    return this.showHeader && this.prefs.showHeader;
  }

  getTeamBallOwner(): TeamBallOwner {
    if (this.status == null) { return TeamBallOwner.None; }
    return this.status.ballOwner;
  }

  manageCommand(cmd: ScoreboardCommand) {
    // Spider Easter egg anim
    if (cmd.params && cmd.params.length > 0 && cmd.params[0] === this.scoreboardService.ANIM_SPIDER) {
      this.animSpider  = (cmd.name === ScoreboardCommand.NameEnum.AnimStart);
    }

    // stop any anims
    if (cmd.name === ScoreboardCommand.NameEnum.AnimStop) {
      this.animSpider = false;
    }
  }

  // ---- Modern layouts (broadcast, blocks, arena, split) ----

  get layout(): string {
    return (this.prefs && this.prefs.layout) || 'broadcast';
  }

  setNumber(): number {
    return this.status.home.sets + this.status.away.sets + 1;
  }

  partials(): number[][] {
    const home = this.status.home.setScores || [];
    const away = this.status.away.setScores || [];
    const n = Math.min(home.length, away.length);
    const res: number[][] = [];
    for (let i = 0; i < n; i++) {
      res.push([home[i], away[i]]);
    }
    return res;
  }

  // Side change at 8 in the tie-break, then match point / set point
  badge(): { text: string, pulse: boolean } {
    const h = this.status.home, a = this.status.away;
    const tieBreak = this.setNumber() === 2 * SETS_TO_WIN - 1;
    if (tieBreak && Math.max(h.points, a.points) === 8 && Math.min(h.points, a.points) < 8) {
      return { text: 'CAMBIO CAMPO', pulse: true };
    }
    const target = tieBreak ? 15 : 25;
    const lead = (t: ScoreboardTeamStatus, o: ScoreboardTeamStatus) => t.points >= target - 1 && t.points > o.points;
    const team = lead(h, a) ? h : lead(a, h) ? a : null;
    if (!team) { return null; }
    const name = (team === h ? this.prefs.homeName : this.prefs.awayName).toUpperCase();
    const kind = team.sets === SETS_TO_WIN - 1 ? 'MATCH POINT' : 'SET POINT';
    return { text: `${kind} · ${name}`, pulse: false };
  }

  timerText(): string {
    const s = this.timer ? this.timer.left : 0;
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  timerTeamName(): string {
    if (!this.timer) { return ''; }
    return (this.timer.team === 'home' ? this.prefs.homeName : this.prefs.awayName).toUpperCase();
  }

  timerPercent(): number {
    return this.timer ? this.timer.left / TIMEOUT_SECONDS * 100 : 0;
  }

  // A timeout called by a team starts a 30" countdown on every display
  private trackTimeouts(prev: ScoreboardStatus, cur: ScoreboardStatus): void {
    if (!prev || !cur) { return; }
    const swapped = prev.home.points === cur.away.points && prev.away.points === cur.home.points &&
                    prev.home.sets === cur.away.sets && prev.away.sets === cur.home.sets &&
                    prev.home.timeouts === cur.away.timeouts && prev.away.timeouts === cur.home.timeouts &&
                    (prev.home.points !== cur.home.points || prev.home.timeouts !== cur.home.timeouts ||
                     prev.home.sets !== cur.home.sets);
    if (swapped) {
      if (this.timer) { this.timer.team = this.timer.team === 'home' ? 'away' : 'home'; }
      return;
    }
    if (cur.home.timeouts > prev.home.timeouts) {
      this.startTimer('home');
    } else if (cur.away.timeouts > prev.away.timeouts) {
      this.startTimer('away');
    } else if (this.timer && cur[this.timer.team].timeouts < prev[this.timer.team].timeouts) {
      this.stopTimer();
    }
  }

  private startTimer(team: 'home' | 'away'): void {
    this.stopTimer();
    this.timer = { team, left: TIMEOUT_SECONDS };
    this.timerHandle = setInterval(() => {
      this.timer.left--;
      if (this.timer.left <= 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.timer = null;
  }

  // Sizes are expressed in --u = 1% of the height of a 16:9 box that fits the board
  private observeBoard(el: HTMLElement): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.boardEl = el;
    if (!el) { return; }
    if (typeof ResizeObserver !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        this.resizeObserver = new ResizeObserver(() => this.updateUnit());
        this.resizeObserver.observe(el);
      });
    }
    this.updateUnit();
  }

  private updateUnit(): void {
    if (!this.boardEl) { return; }
    const w = this.boardEl.clientWidth, h = this.boardEl.clientHeight;
    if (!w || !h) { return; }
    const unit = Math.min(h, w * 9 / 16) / 100;
    this.boardEl.style.setProperty('--u', unit + 'px');
  }

  private applyColors(p: ScoreboardPrefs): void {
    const accent = p.timeoutBg || '#facc15';
    const vars = {
      '--bg': p.bg, '--fg': p.fg,
      '--pb': p.pointBg, '--pf': p.pointFg,
      '--sb': p.setBg, '--sf': p.setFg,
      '--hb': p.homeBg, '--hf': p.homeFg,
      '--ab': p.awayBg, '--af': p.awayFg,
      '--ac': accent, '--acf': contrastColor(accent),
      '--hb-dark': mix(p.homeBg, '#000000', 0.32), '--ab-dark': mix(p.awayBg, '#000000', 0.32),
      '--hb-tint': mix(p.homeBg, p.bg, 0.45), '--ab-tint': mix(p.awayBg, p.bg, 0.45),
      '--hb-glow': rgba(p.homeBg, 0.55), '--ab-glow': rgba(p.awayBg, 0.55),
      '--line': rgba(p.fg, 0.18),
    };
    const style = (this.host.nativeElement as HTMLElement).style;
    Object.keys(vars).forEach(k => style.setProperty(k, vars[k]));
  }
}

function parseHex(hex: string): number[] {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) { h = h.split('').map(c => c + c).join(''); }
  const n = parseInt(h.substring(0, 6), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}

// t = share of the second color
function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a), cb = parseHex(b);
  return '#' + ca.map((v, i) => ('0' + Math.round(v * (1 - t) + cb[i] * t).toString(16)).slice(-2)).join('');
}

function rgba(hex: string, alpha: number): string {
  const c = parseHex(hex);
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function contrastColor(hex: string): string {
  const c = parseHex(hex);
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150 ? '#111111' : '#ffffff';
}
