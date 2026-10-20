// Small color helpers for the winner screen (theme colors are '#rrggbb' strings)

export function parseHex(hex: string): number[] {
  let h = (hex || '#000000').replace('#', '');
  if (h.length === 3) { h = h.split('').map(c => c + c).join(''); }
  const n = parseInt(h.substring(0, 6), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function toHex(c: number[]): string {
  return '#' + c.map(v => ('0' + Math.round(v).toString(16)).slice(-2)).join('');
}

// t = share of the second color
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a), cb = parseHex(b);
  return toHex(ca.map((v, i) => v * (1 - t) + cb[i] * t));
}

export function rgba(hex: string, alpha: number): string {
  const c = parseHex(hex);
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

// WCAG relative luminance
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function contrastColor(hex: string): string {
  const c = parseHex(hex);
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 > 150 ? '#111111' : '#ffffff';
}

// Same hue, lightened (dark background) or darkened (light background) until it reads well on bg
export function readableOn(color: string, bg: string, minContrast = 4.5): string {
  const toward = luminance(bg) < 0.4 ? '#ffffff' : '#000000';
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(color, toward, t);
    if (contrast(c, bg) >= minContrast) { return c; }
  }
  return toward;
}

// Hue in degrees, or null for greys/black/white (a firework hue would be meaningless)
export function hueOf(hex: string): number {
  const [r, g, b] = parseHex(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.3 || l < 0.12 || l > 0.92) { return null; }
  let h: number;
  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return (h * 60 + 360) % 360;
}
