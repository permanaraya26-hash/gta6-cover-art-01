// Solmar Cover Studio — page wiring.
// Holds the editor state, binds every control, loads photos from disk or the
// bundled samples, drags to pan a panel, and exports the cover as a PNG in
// the three post sizes. A `?shot=` query stages a fixed scene instead.
import { drawCover, layoutPanels, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const taglineInput = document.getElementById('tagline');

// Three photo slots: the user can fill each from disk or from a sample.
const state = {
  layout: 'classic',
  grade: 'sunset',
  title: 'SOLMAR NIGHTS',
  subtitle: 'One city. One night. No rules.',
  tagline: 'Solmar Bay • Summer 2026',
  titleSize: 1,
  titlePos: 0.78,
  photos: [null, null, null],
  photoNames: ['— empty —', '— empty —', '— empty —'],
  panels: [
    { photoIndex: 0, zoom: 1, panX: 0, panY: 0, flip: false },
    { photoIndex: 1, zoom: 1, panX: 0, panY: 0, flip: false },
    { photoIndex: 2, zoom: 1, panX: 0, panY: 0, flip: false },
  ],
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

export function loadSample(name) {
  return loadImage(`samples/${name}.jpg`);
}

function redraw() {
  drawCover(canvas, state);
  syncPanelCards();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- Layout + grade pickers -----------------------------------------------

function buildPicker(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (key === current ? ' active' : '');
    b.textContent = def.label;
    b.dataset.key = key;
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.pick').forEach((el) => el.classList.toggle('active', el.dataset.key === key));
      redraw();
    });
    box.appendChild(b);
  });
}

buildPicker('layouts', LAYOUTS, state.layout, (key) => { state.layout = key; });
buildPicker('grades', GRADES, state.grade, (key) => { state.grade = key; });

// --- Caption + title controls --------------------------------------------

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });

const sizeSlider = document.getElementById('titleSize');
const posSlider = document.getElementById('titlePos');
sizeSlider.addEventListener('input', () => { state.titleSize = Number(sizeSlider.value); redraw(); });
posSlider.addEventListener('input', () => { state.titlePos = Number(posSlider.value); redraw(); });

// --- Photo slots -----------------------------------------------------------

const slotInputs = [0, 1, 2].map((i) => document.getElementById(`slot${i}`));

async function setSlot(i, img, name) {
  state.photos[i] = img;
  state.photoNames[i] = name;
  redraw();
}

slotInputs.forEach((input, i) => {
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      await setSlot(i, img, file.name);
      setStatus(`Photo ${i + 1}: ${file.name}`);
    } catch {
      setStatus('That file did not load as a photo.');
    }
  });
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const name = btn.dataset.sample;
    const slot = Number(btn.dataset.slot ?? 0);
    try {
      const img = await loadSample(name);
      await setSlot(slot, img, `sample: ${name}`);
      setStatus(`Sample photo “${name}” loaded into slot ${slot + 1}.`);
    } catch {
      setStatus('Sample photo did not load.');
    }
  });
});

// Drag-and-drop anywhere on the preview: drops into the first empty slot.
const dropZone = document.getElementById('stage');
['dragover', 'dragenter'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.add('dropping');
}));
['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropZone.classList.remove('dropping');
}));
dropZone.addEventListener('drop', async (e) => {
  const file = [...(e.dataTransfer.files || [])].find((f) => f.type.startsWith('image/'));
  if (!file) return;
  const free = state.photos.findIndex((p) => !p);
  const slot = free === -1 ? 0 : free;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    await setSlot(slot, img, file.name);
    setStatus(`Dropped ${file.name} into photo slot ${slot + 1}.`);
  } catch {
    setStatus('That file did not load as a photo.');
  }
});

// --- Per-panel cards -------------------------------------------------------

const panelCards = document.getElementById('panels');

function syncPanelCards() {
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  [...panelCards.children].forEach((card, i) => {
    card.style.display = i < panels.length ? '' : 'none';
    const ps = state.panels[i];
    card.querySelector('.panel-photo').textContent = state.photoNames[ps.photoIndex] || '— empty —';
    // Keep the sliders honest after a drag-pan or a shot scene changed the state.
    const setVal = (field, value) => {
      const el = card.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = value;
      else el.value = String(value);
    };
    setVal('photoIndex', ps.photoIndex);
    setVal('zoom', ps.zoom);
    setVal('panX', ps.panX);
    setVal('panY', ps.panY);
    setVal('flip', ps.flip);
  });
}

function buildPanelCards() {
  panelCards.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const card = document.createElement('div');
    card.className = 'panel-card';
    card.innerHTML = `
      <h3>Panel ${i + 1} <span class="panel-photo"></span></h3>
      <label>Photo
        <select data-field="photoIndex">
          <option value="0">Slot 1</option>
          <option value="1">Slot 2</option>
          <option value="2">Slot 3</option>
        </select>
      </label>
      <label>Zoom <input type="range" data-field="zoom" min="1" max="3" step="0.05" value="1"></label>
      <label>Pan X <input type="range" data-field="panX" min="-0.5" max="0.5" step="0.01" value="0"></label>
      <label>Pan Y <input type="range" data-field="panY" min="-0.5" max="0.5" step="0.01" value="0"></label>
      <label class="check"><input type="checkbox" data-field="flip"> Flip horizontal</label>`;
    card.querySelectorAll('[data-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const f = el.dataset.field;
        const ps = state.panels[i];
        ps[f] = el.type === 'checkbox' ? el.checked : Number(el.value);
        redraw();
      });
    });
    panelCards.appendChild(card);
  }
}
buildPanelCards();

// Drag on the preview to pan the panel under the pointer.
let drag = null;
function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = (clientX - r.left) * (canvas.width / r.width);
  const y = (clientY - r.top) * (canvas.height / r.height);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  return panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  drag = { i, x: e.clientX, y: e.clientY, panX: state.panels[i].panX, panY: state.panels[i].panY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const ps = state.panels[drag.i];
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  ps.panX = drag.panX + ((e.clientX - drag.x) / r.width) * (canvas.width / panels[drag.i].w);
  ps.panY = drag.panY + ((e.clientY - drag.y) / r.height) * (canvas.height / panels[drag.i].h);
  ps.panX = Math.max(-0.5, Math.min(0.5, ps.panX));
  ps.panY = Math.max(-0.5, Math.min(0.5, ps.panY));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- Export ----------------------------------------------------------------

export function renderExport(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return off;
}

export function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

const SIZES = [
  { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
];

SIZES.forEach(({ w, h, label }) => {
  const btn = document.getElementById(`export-${w}x${h}`);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const off = renderExport(w, h);
    await downloadCanvas(off, `solmar-cover-${w}x${h}.png`);
    setStatus(`Exported solmar-cover-${w}x${h}.png — ${label}.`);
  });
});

// --- Boot ------------------------------------------------------------------

async function boot() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { state, loadSample, redraw, setStatus });
    return;
  }
  // Default scene: the pier sample fills every panel until the user adds photos.
  try {
    const img = await loadSample('pier');
    state.photos = [img, img, img];
    state.photoNames = ['sample: pier', 'sample: pier', 'sample: pier'];
  } catch {
    setStatus('Sample photo did not load — add your own photo to begin.');
  }
  redraw();
}

boot();
