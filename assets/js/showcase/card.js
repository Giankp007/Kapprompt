/* ============================================================
   PerspectiveHighlightCard — DOM-based premium tilt card
   3D tilt from pointer, light reflex follows the cursor,
   hairline border, glow only on the active edge, calm content.
   Pure CSS/JS (crisper & cheaper than WebGL for flat UI).
   ============================================================ */
import { reduceMotion, clamp } from './base.js';

export class PerspectiveHighlightCard {
  constructor(el) {
    this.el = el;
    this.rect = null;
    this.raf = null;
    this.tx = 0;
    this.ty = 0;
    this.cx = 0;
    this.cy = 0;

    this._move = this._move.bind(this);
    this._enter = this._enter.bind(this);
    this._leave = this._leave.bind(this);
    this._tick = this._tick.bind(this);

    if (reduceMotion) return; // static, fully readable
    el.addEventListener('pointerenter', this._enter);
    el.addEventListener('pointermove', this._move, { passive: true });
    el.addEventListener('pointerleave', this._leave);
  }

  _enter() {
    this.rect = this.el.getBoundingClientRect();
    this.el.classList.add('is-live');
  }

  _move(e) {
    if (!this.rect) this.rect = this.el.getBoundingClientRect();
    const r = this.rect;
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    this.tx = px;
    this.ty = py;
    if (!this.raf) this.raf = requestAnimationFrame(this._tick);
  }

  _tick() {
    this.raf = null;
    // ease toward target for buttery motion
    this.cx += (this.tx - this.cx) * 0.18;
    this.cy += (this.ty - this.cy) * 0.18;
    const rx = (0.5 - this.cy) * 9; // rotateX
    const ry = (this.cx - 0.5) * 11; // rotateY
    const s = this.el.style;
    s.setProperty('--rx', rx.toFixed(2) + 'deg');
    s.setProperty('--ry', ry.toFixed(2) + 'deg');
    s.setProperty('--mx', (this.cx * 100).toFixed(1) + '%');
    s.setProperty('--my', (this.cy * 100).toFixed(1) + '%');
    // glow only on the edge the cursor is closest to
    const edge =
      this.cx < 0.18 ? 'l' : this.cx > 0.82 ? 'r' : this.cy < 0.18 ? 't' : this.cy > 0.82 ? 'b' : '';
    s.setProperty('--gl', edge === 'l' ? '1' : '0');
    s.setProperty('--gr', edge === 'r' ? '1' : '0');
    s.setProperty('--gt', edge === 't' ? '1' : '0');
    s.setProperty('--gb', edge === 'b' ? '1' : '0');

    if (Math.abs(this.tx - this.cx) > 0.001 || Math.abs(this.ty - this.cy) > 0.001) {
      this.raf = requestAnimationFrame(this._tick);
    }
  }

  _leave() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.rect = null;
    this.cx = this.cy = 0.5;
    this.el.classList.remove('is-live');
    const s = this.el.style;
    s.setProperty('--rx', '0deg');
    s.setProperty('--ry', '0deg');
    s.setProperty('--gl', '0');
    s.setProperty('--gr', '0');
    s.setProperty('--gt', '0');
    s.setProperty('--gb', '0');
  }
}

export function initCards(root = document) {
  return Array.from(root.querySelectorAll('.phc')).map((el) => new PerspectiveHighlightCard(el));
}

export default PerspectiveHighlightCard;
