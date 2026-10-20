import { mix } from './colors';

// Confetti and stars in the winner's colors, drawn on a canvas that fills the container.
// burst(): two cannons from the bottom corners plus a shower from the top; shower(): only the shower.
// The animation loop stops by itself when no piece is left on screen.

const SHAPE_RECT = 0;
const SHAPE_CIRCLE = 1;
const SHAPE_STAR = 2;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  flip: number;
  vflip: number;
  sway: number;
  vsway: number;
  front: string;
  back: string;
  shape: number;
}

interface Spawner {
  at: number;        // seconds from now (counted down)
  cannon?: 'left' | 'right';
  count?: number;
  duration?: number; // shower length in seconds
  rate?: number;     // shower pieces per second
  acc?: number;
}

const GRAVITY = 1.0; // in canvas heights per second²

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// unit five-pointed star, outer radius 1
function starPath(): Path2D {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    if (i === 0) {
      p.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    } else {
      p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  p.closePath();
  return p;
}

export default class Confetti {

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cw = 0;
  private ch = 0;
  private pieces: Piece[] = [];
  private spawners: Spawner[] = [];
  private raf: number = null;
  private last = 0;
  private colors: string[][];
  private star = starPath();

  constructor(private container: HTMLElement, colors: string[], private scale = 1) {
    // each color with a darker shade for the back side of the piece
    this.colors = (colors.length ? colors : ['#ffffff']).map(c => [c, mix(c, '#000000', 0.35)]);
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
    this.resize();
  }

  resize(): void {
    this.cw = this.container.clientWidth;
    this.ch = this.container.clientHeight;
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
  }

  burst(): void {
    this.spawners.push(
      { at: 0, cannon: 'left', count: 70 },
      { at: 0.15, cannon: 'right', count: 70 },
      { at: 0.7, cannon: 'left', count: 45 },
      { at: 0.85, cannon: 'right', count: 45 },
      { at: 0.4, duration: 8, rate: 28, acc: 0 },
    );
    this.run();
  }

  shower(seconds = 6): void {
    this.spawners.push({ at: 0, duration: seconds, rate: 30, acc: 0 });
    this.run();
  }

  destroy(): void {
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.pieces = [];
    this.spawners = [];
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }

  private run(): void {
    if (!this.raf) {
      this.last = 0;
      this.raf = window.requestAnimationFrame(t => this.update(t));
    }
  }

  private newPiece(x: number, y: number, vx: number, vy: number): Piece {
    const size = this.ch * random(0.016, 0.028) * this.scale;
    const roll = Math.random();
    const shape = roll < 0.7 ? SHAPE_RECT : roll < 0.85 ? SHAPE_CIRCLE : SHAPE_STAR;
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    return {
      x, y, vx, vy,
      drag: random(3.5, 5.5),
      w: shape === SHAPE_RECT ? size : size * 0.5,
      h: shape === SHAPE_RECT ? size * random(0.4, 0.65) : size * 0.5,
      rot: random(0, Math.PI * 2),
      vrot: random(-6, 6),
      flip: random(0, Math.PI * 2),
      vflip: random(5, 12),
      sway: random(0, Math.PI * 2),
      vsway: random(2, 4),
      front: color[0],
      back: color[1],
      shape,
    };
  }

  private fireCannon(side: 'left' | 'right', count: number): void {
    const h = this.ch;
    for (let i = 0; i < count; i++) {
      const angle = random(48, 78) * Math.PI / 180;
      const speed = h * random(2.4, 4.4);
      const dir = side === 'left' ? 1 : -1;
      const x = side === 'left' ? random(0, h * 0.04) : this.cw - random(0, h * 0.04);
      this.pieces.push(this.newPiece(x, h + h * 0.02, dir * Math.cos(angle) * speed, -Math.sin(angle) * speed));
    }
  }

  private dropFromTop(): void {
    const h = this.ch;
    this.pieces.push(this.newPiece(random(0, this.cw), -h * 0.04, random(-0.05, 0.05) * h, random(0.08, 0.22) * h));
  }

  private update(t: number): void {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    const h = this.ch;

    // spawners
    for (const s of this.spawners) {
      s.at -= dt;
      if (s.at > 0) { continue; }
      if (s.cannon) {
        this.fireCannon(s.cannon, s.count);
        s.duration = 0;
      } else {
        s.acc += s.rate * dt;
        while (s.acc >= 1) {
          this.dropFromTop();
          s.acc--;
        }
        s.duration -= dt;
      }
    }
    this.spawners = this.spawners.filter(s => s.at > 0 || s.duration > 0);

    // physics
    const sway = 0.09 * h;
    for (const p of this.pieces) {
      p.vy += GRAVITY * h * dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.sway += p.vsway * dt;
      p.x += (p.vx + Math.sin(p.sway) * sway) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.flip += p.vflip * dt;
    }
    this.pieces = this.pieces.filter(p => p.y < h * 1.08 && p.x > -this.cw * 0.2 && p.x < this.cw * 1.2);

    // draw
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);
    for (const p of this.pieces) {
      const c = Math.cos(p.rot), s = Math.sin(p.rot), f = Math.cos(p.flip);
      ctx.fillStyle = f >= 0 ? p.front : p.back;
      if (p.shape === SHAPE_RECT) {
        ctx.setTransform(c, s, -s * f, c * f, p.x, p.y);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        const r = p.w;
        ctx.setTransform(c * r, s * r, -s * f * r, c * f * r, p.x, p.y);
        if (p.shape === SHAPE_STAR) {
          ctx.fill(this.star);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.pieces.length > 0 || this.spawners.length > 0) {
      this.raf = window.requestAnimationFrame(tt => this.update(tt));
    } else {
      ctx.clearRect(0, 0, this.cw, this.ch);
      this.raf = null;
    }
  }
}
