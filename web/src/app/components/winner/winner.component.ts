import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, ElementRef, ViewChild, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import Fireworks from '../../../fireworks/fireworks';
import Confetti from './confetti';
import { contrast, contrastColor, hueOf, luminance, mix, readableOn, rgba } from './colors';
import { ScoreboardPrefs, ScoreboardStatus } from 'src/backend';
import { ScoreboardService } from 'src/app/services/scoreboard.service';

// Not in the TypeScript 3.5 DOM typings
declare const ResizeObserver: any;

// Celebration: confetti cannons at once, fireworks shortly after and then always on,
// a new confetti shower every CONFETTI_EVERY ms while the winner screen stays up
const FIREWORKS_DELAY = 1500;
const CONFETTI_EVERY = 30000;
const CONFETTI_SHOWER = 7;

interface SetPartial {
  label: string;
  w: number;      // points of the winner (home on a draw)
  l: number;
  color: string;  // color of the team that won the set
}

@Component({
  selector: 'app-winner',
  templateUrl: './winner.component.html',
  styleUrls: ['./winner.component.scss']
})
export class WinnerComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {

  @ViewChild('fx', {static: true}) fxRef: ElementRef;
  @ViewChild('cf', {static: true}) cfRef: ElementRef;

  destroyed$ = new Subject();

  status: ScoreboardStatus;
  prefs: ScoreboardPrefs;

  draw = false;
  winnerTeam = '';
  loserTeam = '';
  winnerSets = 0;
  loserSets = 0;
  partials: SetPartial[] = [];

  private winnerColor = '#ffffff';
  private loserColor = '#ffffff';
  private winnerFg = '#000000';

  private fireworks: Fireworks = null;
  private confetti: Confetti = null;
  private fireworksDue = false;
  private timers: any[] = [];
  private celebrating: string = null;

  private viewReady = false;
  private fitPending = false;
  private resizeObserver: any = null;
  private resizeTimer: any = null;
  private lastSize = '';
  private onWindowResize = () => this.onResized();

  constructor(private scoreboardService: ScoreboardService,
              private host: ElementRef,
              private zone: NgZone) { }

  ngOnInit() {
    this.scoreboardService.status$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe((status: ScoreboardStatus) => {
      this.status = status;
      this.onStatusUpdate();
    });

    this.scoreboardService.prefs$.pipe(
      takeUntil(this.destroyed$)
    ).subscribe((prefs: ScoreboardPrefs) => {
      this.prefs = prefs;
      this.onStatusUpdate();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    const el = this.host.nativeElement as HTMLElement;
    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.onResized());
        this.resizeObserver.observe(el);
      } else {
        window.addEventListener('resize', this.onWindowResize);
      }
    });
    this.updateUnit();
    // names are measured again once the Barlow Condensed font is loaded
    const fonts = (document as any).fonts;
    if (fonts && fonts.ready) {
      fonts.ready.then(() => this.fitNames());
    }
    this.syncCelebration();
  }

  ngAfterViewChecked(): void {
    if (this.fitPending) {
      this.fitPending = false;
      this.fitNames();
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.stopCelebration();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    clearTimeout(this.resizeTimer);
  }

  onStatusUpdate() {
    if (!this.status || !this.prefs) {
      return;
    }
    if (!this.status.showWinner) {
      this.stopCelebration();
      return;
    }
    const p = this.prefs;
    const home = { name: p.homeName || 'CASA', st: this.status.home, color: p.homeBg, fg: p.homeFg };
    const away = { name: p.awayName || 'OSPITI', st: this.status.away, color: p.awayBg, fg: p.awayFg };
    // the winner may be on either side (sides are swapped during the match); on a draw home goes first
    const [w, l] = away.st.sets > home.st.sets ? [away, home] : [home, away];

    this.draw = home.st.sets === away.st.sets;
    this.winnerTeam = w.name;
    this.loserTeam = l.name;
    this.winnerSets = w.st.sets;
    this.loserSets = l.st.sets;
    this.winnerColor = w.color || '#ffffff';
    this.loserColor = l.color || '#ffffff';
    this.winnerFg = w.fg || contrastColor(this.winnerColor);

    const ws = w.st.setScores || [];
    const ls = l.st.setScores || [];
    this.partials = [];
    for (let i = 0; i < Math.min(ws.length, ls.length); i++) {
      this.partials.push({
        label: `${i + 1}° SET`,
        w: ws[i],
        l: ls[i],
        color: ws[i] >= ls[i] ? this.winnerColor : this.loserColor,
      });
    }

    this.applyColors();
    this.fitPending = true;
    this.syncCelebration();
  }

  // ---- celebration: confetti + fireworks ----

  private syncCelebration(): void {
    if (!this.viewReady || !this.status || !this.prefs || !this.status.showWinner) {
      return;
    }
    const key = [this.draw, this.winnerTeam, this.winnerColor, this.loserColor, this.prefs.bg].join('|');
    if (key !== this.celebrating) {
      this.startCelebration(key);
    }
  }

  private startCelebration(key: string): void {
    this.stopCelebration();
    this.celebrating = key;
    // canvas animations run outside Angular, so the frames don't trigger change detection
    this.zone.runOutsideAngular(() => {
      if (!this.draw) {
        this.confetti = new Confetti(this.cfRef.nativeElement, this.confettiColors(), this.effectScale());
        this.confetti.burst();
        this.timers.push(setInterval(() => {
          if (this.confetti) { this.confetti.shower(CONFETTI_SHOWER); }
        }, CONFETTI_EVERY));
      }
      this.timers.push(setTimeout(() => {
        this.fireworksDue = true;
        this.startFireworks();
      }, this.draw ? 300 : FIREWORKS_DELAY));
    });
  }

  private stopCelebration(): void {
    this.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    this.timers = [];
    this.stopFireworks();
    if (this.confetti) {
      this.confetti.destroy();
      this.confetti = null;
    }
    this.fireworksDue = false;
    this.celebrating = null;
  }

  private startFireworks(): void {
    if (this.fireworks || !this.fireworksDue) {
      return;
    }
    const container = this.fxRef.nativeElement as HTMLElement;
    if (!container.clientWidth || !container.clientHeight) {
      return; // not laid out yet: started again on resize
    }
    const hues = (this.draw ? [this.winnerColor, this.loserColor] : [this.winnerColor])
      .map(c => hueOf(c))
      .filter(h => h !== null);
    this.zone.runOutsideAngular(() => {
      this.fireworks = new Fireworks(container, {
        maxRockets: 10,             // max # of rockets to spawn
        rocketSpawnInterval: 150,   // millisends to check if new rockets should spawn
        numParticles: 100,          // number of particles to spawn when rocket explodes (+0-10)
        explosionMinHeight: 0.4,    // percentage. min height at which rockets can explode
        explosionMaxHeight: 0.85,   // percentage. max height before a particle is exploded
        explosionChance: 0.01,      // chance in each tick the rocket will explode
        scale: this.effectScale(),  // bigger bursts on a big screen
        hues,                       // half of the rockets in the winner's color
        hueChance: 0.5,
        // darker sparks on a light theme, otherwise they vanish on the background
        brightness: luminance(this.prefs.bg || '#000000') > 0.4 ? [28, 38] : [50, 60],
      });
      this.fireworks.start();
    });
  }

  private stopFireworks(): void {
    if (this.fireworks) {
      this.fireworks.destroy();
      this.fireworks = null;
    }
  }

  // 1 = original fireworks size; ~1.2 on a full HD TV, smaller in the admin preview
  private effectScale(): number {
    const h = (this.host.nativeElement as HTMLElement).clientHeight || 900;
    return Math.max(0.45, Math.min(2, h / 900));
  }

  private confettiColors(): string[] {
    const c = this.winnerColor;
    const bg = this.prefs.bg || '#000000';
    const colors = [c, c, c, mix(c, '#ffffff', 0.35), mix(c, '#000000', 0.2), this.winnerFg, this.winnerFg,
                    this.prefs.timeoutBg || '#facc15'];
    const visible = colors.filter(x => contrast(x, bg) >= 1.6);
    return visible.length ? visible : [readableOn(c, bg, 3)];
  }

  // ---- sizes and colors ----

  private onResized(): void {
    const el = this.host.nativeElement as HTMLElement;
    const size = el.clientWidth + 'x' + el.clientHeight;
    if (size === this.lastSize) { return; }
    this.lastSize = size;
    this.updateUnit();
    this.fitNames();
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      if (this.confetti) { this.confetti.resize(); }
      if (this.fireworksDue) {
        this.stopFireworks();
        this.startFireworks();
      }
    }, 300);
  }

  // --u = 1% of the height of the 16:9 box that fits the screen (same unit as the scoreboard layouts)
  private updateUnit(): void {
    const el = this.host.nativeElement as HTMLElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) { return; }
    el.style.setProperty('--u', Math.min(h, w * 9 / 16) / 100 + 'px');
  }

  // Team names as big as possible on one line: shrink the long ones to the available width
  private fitNames(): void {
    const el = this.host.nativeElement as HTMLElement;
    const names = el.querySelectorAll('.nm .fit');
    for (let i = 0; i < names.length; i++) {
      const name = names[i] as HTMLElement;
      name.style.fontSize = '';
      const avail = name.parentElement.clientWidth;
      const width = name.offsetWidth;
      if (avail > 0 && width > avail) {
        const px = parseFloat(getComputedStyle(name).fontSize);
        name.style.fontSize = Math.floor(px * avail / width) + 'px';
      }
    }
  }

  private applyColors(): void {
    const p = this.prefs;
    const bg = p.bg || '#000000', fg = p.fg || '#ffffff';
    const accent = p.timeoutBg || '#facc15';
    const vars = {
      '--bg': bg, '--fg': fg,
      '--sb': p.setBg, '--sf': p.setFg,
      '--ac': accent, '--acf': contrastColor(accent),
      '--wc': readableOn(this.winnerColor, bg), '--wcp': this.winnerColor, '--wc-glow': rgba(this.winnerColor, 0.42),
      '--lc': readableOn(this.loserColor, bg), '--lcp': this.loserColor, '--lc-glow': rgba(this.loserColor, 0.42),
    };
    const style = (this.host.nativeElement as HTMLElement).style;
    Object.keys(vars).forEach(k => style.setProperty(k, vars[k]));
  }
}
