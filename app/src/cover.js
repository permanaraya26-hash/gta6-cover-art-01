// Solmar Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster on any canvas: photos cropped per panel,
// a colour grade, procedural decorations (sun, palms, skyline, halftone, speed
// lines, vignette) and a big outlined caption. No image assets, no fonts to
// download: everything is drawn in code with the system font stack.

export const LAYOUTS = {
  classic: { panels: 3, label: 'Classic Cover' },
  triptych: { panels: 3, label: 'Triptych' },
  poster: { panels: 3, label: 'Poster' },
  solo: { panels: 1, label: 'Solo' },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#ff9a5c', '#ff5e8a', '#7b2d8b'],
    wash: 'rgba(255, 94, 138, 0.22)',
    sun: '#ffd166',
    accent: '#ff5e8a',
    deep: '#2b0f3d',
  },
  neon: {
    label: 'Neon Nights',
    sky: ['#22d3ee', '#a855f7', '#ec4899'],
    wash: 'rgba(34, 211, 238, 0.18)',
    sun: '#f0abfc',
    accent: '#22d3ee',
    deep: '#0b1030',
  },
  golden: {
    label: 'Golden Hour',
    sky: ['#fbbf24', '#f97316', '#7c2d12'],
    wash: 'rgba(251, 191, 36, 0.20)',
    sun: '#fef3c7',
    accent: '#f59e0b',
    deep: '#3a1c07',
  },
  noir: {
    label: 'Mono Noir',
    sky: ['#e5e5e5', '#737373', '#111111'],
    wash: 'rgba(255, 255, 255, 0.08)',
    sun: '#ffffff',
    accent: '#d4d4d4',
    deep: '#0a0a0a',
  },
};

const FONT_STACK = `'Arial Black', Impact, 'Helvetica Neue', sans-serif`;

// Panel rectangles for a layout inside the canvas, with an outer margin and
// gutters. Returns an array of {x, y, w, h} in canvas pixels.
export function layoutPanels(layout, W, H) {
  const m = Math.round(Math.min(W, H) * 0.028);
  const g = Math.round(Math.min(W, H) * 0.016);
  const inner = { x: m, y: m, w: W - m * 2, h: H - m * 2 };
  if (layout === 'triptych') {
    const pw = (inner.w - g * 2) / 3;
    return [0, 1, 2].map((i) => ({
      x: inner.x + i * (pw + g), y: inner.y, w: pw, h: inner.h,
    }));
  }
  if (layout === 'poster') {
    const heroH = inner.h * 0.66;
    const stripH = inner.h - heroH - g;
    const pw = (inner.w - g) / 2;
    return [
      { x: inner.x, y: inner.y, w: inner.w, h: heroH },
      { x: inner.x, y: inner.y + heroH + g, w: pw, h: stripH },
      { x: inner.x + pw + g, y: inner.y + heroH + g, w: pw, h: stripH },
    ];
  }
  if (layout === 'solo') {
    return [{ x: inner.x, y: inner.y, w: inner.w, h: inner.h }];
  }
  // classic: big hero left, two stacked panels right.
  const heroW = inner.w * 0.62;
  const sideW = inner.w - heroW - g;
  const sideH = (inner.h - g) / 2;
  return [
    { x: inner.x, y: inner.y, w: heroW, h: inner.h },
    { x: inner.x + heroW + g, y: inner.y, w: sideW, h: sideH },
    { x: inner.x + heroW + g, y: inner.y + sideH + g, w: sideW, h: sideH },
  ];
}

// Draws one photo into a panel rect, cover-fit, with zoom / pan / flip.
function drawPhotoInPanel(ctx, img, rect, panel) {
  if (!img) return;
  const zoom = panel.zoom ?? 1;
  const panX = panel.panX ?? 0;
  const panY = panel.panY ?? 0;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * base;
  const ph = img.naturalHeight * base;
  const dx = rect.x + (rect.w - pw) / 2 + panX * rect.w;
  const dy = rect.y + (rect.h - ph) / 2 + panY * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.flip) {
    ctx.translate(rect.x + rect.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(rect.x + rect.w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

// A procedural palm silhouette, drawn in code: the crown sits at (x, crownY),
// its fronds droop down and out, and the trunk curves down to baseY.
function drawPalm(ctx, x, crownY, baseY, s, color) {
  ctx.save();
  ctx.translate(x, crownY);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve from the crown down to the base.
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, (baseY - crownY) * 0.5 / s, 4, (baseY - crownY) / s);
  ctx.stroke();
  // Fronds: a downward fan, each one arcing out and drooping.
  for (let i = 0; i < 7; i++) {
    const a = ((22 + i * 21) * Math.PI) / 180;
    const len = 62 - Math.abs(i - 3) * 7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      Math.cos(a) * len * 0.6, Math.sin(a) * len * 0.6 + 8,
      Math.cos(a) * len, Math.sin(a) * len + 26,
    );
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-4, 4, 6, 0, Math.PI * 2);
  ctx.arc(8, 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A procedural skyline: blocky towers with lit windows, along a baseline.
function drawSkyline(ctx, x, y, w, h, color, seed) {
  ctx.save();
  ctx.fillStyle = color;
  let bx = x;
  let n = 0;
  while (bx < x + w) {
    const bw = w * (0.06 + ((seed * 37 + n * 53) % 10) / 100);
    const bh = h * (0.35 + ((seed * 13 + n * 29) % 10) / 14);
    ctx.fillRect(bx, y - bh, bw, bh);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    const cols = Math.max(1, Math.floor(bw / 14));
    const rows = Math.max(1, Math.floor(bh / 18));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (((c * 7 + r * 3 + n * 5 + seed) % 3) === 0) {
          ctx.fillRect(bx + 4 + c * 14, y - bh + 6 + r * 18, 5, 7);
        }
      }
    }
    ctx.fillStyle = color;
    bx += bw + w * 0.012;
    n++;
  }
  ctx.restore();
}

// Halftone dot field fading across a band.
function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(9, Math.min(w, h) / 34);
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const t = (xx - x) / w;
      const r = step * 0.32 * (0.4 + 0.6 * t);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Diagonal speed lines sweeping across a strip.
function drawSpeedLines(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, h * 0.05);
  for (let i = -2; i < 8; i++) {
    const sx = x + (i * w) / 6;
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + w * 0.22, y);
    ctx.stroke();
  }
  ctx.restore();
}

// The setting sun: a glowing disc with horizontal slats cut through it.
function drawSun(ctx, cx, cy, r, color) {
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(255, 120, 90, 0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slats: solid deep bands across the lower half of the disc.
  ctx.fillStyle = 'rgba(20, 8, 28, 0.85)';
  for (let i = 0; i < 4; i++) {
    const sy = cy + r * (0.1 + i * 0.22);
    ctx.fillRect(cx - r, sy, r * 2, r * 0.05);
  }
  ctx.restore();
}

// Fits the title to one line inside maxWidth, returning the font size.
function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${FONT_STACK}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${size}px ${FONT_STACK}`;
  }
  return size;
}

// Draws the caption block: badge, big outlined title, subtitle, tagline.
function drawCaptionBlock(ctx, state, W, H, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const tag = (state.tagline || '').trim();
  const pos = state.titlePos ?? 0.78; // 0 = top of canvas, 1 = bottom
  const scale = state.titleSize ?? 1;
  const bandH = H * 0.30;
  const bandY = Math.min(Math.max(pos, 0.08), 0.92) * H - bandH / 2;
  const pad = W * 0.045;

  // Badge: invented place name, top-left corner of the canvas.
  const badgeText = 'SOLMAR BAY';
  ctx.save();
  ctx.font = `bold ${Math.round(H * 0.024)}px ${FONT_STACK}`;
  const bw = ctx.measureText(badgeText).width + H * 0.036;
  const bh = H * 0.042;
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.roundRect(W * 0.028, H * 0.028, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, W * 0.028 + H * 0.018, H * 0.028 + bh / 2 + 1);
  ctx.restore();

  // Dark band behind the lettering so it reads over any photo.
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, 'rgba(10, 6, 18, 0)');
  band.addColorStop(0.35, 'rgba(10, 6, 18, 0.72)');
  band.addColorStop(1, 'rgba(10, 6, 18, 0.88)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, W, bandH);

  if (!title) return;
  const maxW = W - pad * 2;
  const start = Math.round(H * 0.115 * scale);
  const size = fitTitleSize(ctx, title, maxW, start);
  const titleY = bandY + bandH * 0.52;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px ${FONT_STACK}`;
  // Thick dark outline, then a hot outline, then the white face.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(8, 4, 16, 0.95)';
  ctx.lineWidth = size * 0.16;
  ctx.strokeText(title, pad, titleY);
  ctx.strokeStyle = grade.accent;
  ctx.lineWidth = size * 0.05;
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, pad, titleY);
  ctx.restore();

  // Subtitle in italic bold, tagline letterspaced beneath.
  let y = titleY + size * 0.62;
  if (sub) {
    ctx.save();
    ctx.font = `italic bold ${Math.round(size * 0.30)}px ${FONT_STACK}`;
    ctx.fillStyle = grade.sun;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub, pad, y);
    ctx.restore();
    y += size * 0.34;
  }
  if (tag) {
    ctx.save();
    ctx.font = `bold ${Math.round(size * 0.17)}px ${FONT_STACK}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag.toUpperCase().split('').join(' '), pad, y);
    ctx.restore();
  }
}

// Applies the grade wash over the whole canvas.
function applyGrade(ctx, grade, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.55, grade.wash);
  g.addColorStop(1, grade.wash);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.5, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

// Main entry: draws the whole cover for `state` onto `canvas` at its own size.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = LAYOUTS[state.layout] ? state.layout : 'classic';

  // Deep backdrop + sky gradient behind the panels.
  const sky = ctx.createLinearGradient(0, 0, W, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.deep);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const panels = layoutPanels(layout, W, H);
  const photos = state.photos || [];
  const panelStates = state.panels || [];

  panels.forEach((rect, i) => {
    const ps = panelStates[i] || { photoIndex: 0, zoom: 1, panX: 0, panY: 0, flip: false };
    const img = photos[ps.photoIndex] || photos[0] || null;
    // Photo (grayscale filter for the noir grade).
    if (grade === GRADES.noir) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
    drawPhotoInPanel(ctx, img, rect, ps);
    ctx.filter = 'none';
    // Per-panel grade tint.
    const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    tint.addColorStop(0, 'rgba(255,255,255,0)');
    tint.addColorStop(1, grade.wash);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    // White poster frame around each panel.
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.006);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Decorations, anchored to the hero (first) panel and clipped to it, so no
  // frond or glow spills across a panel gutter into the next panel.
  const hero = panels[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(hero.x, hero.y, hero.w, hero.h);
  ctx.clip();
  const sunR = Math.min(Math.min(hero.w, hero.h) * 0.14, hero.w * 0.22);
  drawSun(ctx, hero.x + hero.w * 0.82, hero.y + hero.h * 0.20, sunR, grade.sun);
  drawSkyline(ctx, hero.x + hero.w * 0.04, hero.y + hero.h * 0.97, hero.w * 0.92, hero.h * 0.20, 'rgba(12, 6, 20, 0.85)', 3);
  const palmScale = H / 560;
  const palmCrownY = hero.y + hero.h * 0.85;
  const palmBaseY = hero.y + hero.h * 0.99;
  drawPalm(ctx, hero.x + hero.w * 0.05, palmCrownY, palmBaseY, palmScale, 'rgba(10, 5, 16, 0.9)');
  drawPalm(ctx, hero.x + hero.w * 0.95, palmCrownY, palmBaseY, palmScale, 'rgba(10, 5, 16, 0.9)');
  drawHalftone(ctx, hero.x + hero.w * 0.55, hero.y + hero.h * 0.06, hero.w * 0.4, hero.h * 0.10, 'rgba(255,255,255,0.35)');
  drawSpeedLines(ctx, hero.x, hero.y + hero.h * 0.44, hero.w * 0.30, hero.h * 0.07, 'rgba(255,255,255,0.28)');
  ctx.restore();

  applyGrade(ctx, grade, W, H);

  // Vignette to pull the eye to the middle.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  drawCaptionBlock(ctx, state, W, H, grade);
}
