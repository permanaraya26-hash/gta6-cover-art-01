// Fixed scenes for screenshots, driven by the page's query string.
//   ?shot=cover&layout=classic&photo=pier&caption=SOLMAR%20NIGHTS&grade=sunset
//     shows the finished cover alone, full-bleed at the viewport's size.
//   ?shot=editor&layout=classic&photo=boulevard&caption=BOULEVARD%20QUEEN
//     shows the full editor with a photo loaded.
// window.__shotReady is set once the scene is painted.
import { GRADES } from './cover.js';

export async function runShot(shot, query, hooks) {
  const { state, loadSample, redraw, setStatus } = hooks;
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const caption = query.get('caption');
  if (caption !== null) {
    state.title = caption;
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = caption;
  }
  const subtitle = query.get('subtitle');
  if (subtitle !== null) {
    state.subtitle = subtitle;
    const el = document.getElementById('subtitle');
    if (el) el.value = subtitle;
  }

  const photoName = query.get('photo') ?? 'pier';
  try {
    const img = await loadSample(photoName);
    state.photos = [img, img, img];
    state.photoNames = [`sample: ${photoName}`, `sample: ${photoName}`, `sample: ${photoName}`];
  } catch {
    setStatus?.('Sample photo did not load for the shot.');
  }

  // Vary the crop per panel so a multi-panel shot shows the framing off.
  if (state.layout === 'triptych') {
    state.panels[0].panX = -0.16;
    state.panels[1].panX = 0.14;
    state.panels[2].zoom = 1.5;
    state.panels[2].panY = -0.08;
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.getElementById('cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
