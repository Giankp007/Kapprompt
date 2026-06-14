/* ============================================================
   SHOWCASE — shared base (vanilla Three.js, no build)
   BaseScene: renderer, studio environment, resize, IO gating,
   reduced-motion, pointer + scroll state, lifecycle/dispose.
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile =
  matchMedia('(max-width: 820px)').matches || matchMedia('(pointer: coarse)').matches;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
/* frame-rate independent damping (lambda = responsiveness) */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/* one-time WebGL capability probe */
let _webgl;
export function hasWebGL() {
  if (_webgl !== undefined) return _webgl;
  try {
    const c = document.createElement('canvas');
    _webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    _webgl = false;
  }
  return _webgl;
}

/* soft round contact-shadow texture (no shadow maps needed) */
export function contactShadowTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.28)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* crisp label texture for floating UI fragments */
export function labelTexture(text, { w = 512, h = 256, color = '#f5f5f0', sub = '', accent = '#faae33' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(h * 0.34)}px Inter, system-ui, sans-serif`;
  g.fillText(text, h * 0.16, sub ? h * 0.40 : h * 0.5);
  if (sub) {
    g.fillStyle = accent;
    g.font = `600 ${Math.round(h * 0.13)}px Inter, system-ui, sans-serif`;
    g.fillText(sub.toUpperCase(), h * 0.17, h * 0.72);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class BaseScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.section = canvas.closest('section') || canvas.parentElement;
    this.mount = canvas.parentElement;

    this.pointer = new THREE.Vector2(0, 0); // smoothed, -1..1 (hover accent only)
    this.pointerTarget = new THREE.Vector2(0, 0); // raw
    this.view = 0; // 0..1 section center through viewport (entry/exit)
    this.scroll = 0; // 0..1 PRIMARY driver across the pinned section range
    this.elapsed = 0;
    this.dt = 0;
    this._steps = null; // narrative .sc-step elements, lazily collected

    this.inited = false;
    this.running = false;
    this._raf = null;
    this._clock = new THREE.Clock(false);
    this._disposables = [];

    this._onPointer = this._onPointer.bind(this);
    this._loop = this._loop.bind(this);
  }

  init() {
    if (this.inited) return;
    this.inited = true;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    /* studio reflections without an external HDR file */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = env.texture;
    this._disposables.push(env);
    pmrem.dispose();

    this.build();
    this.resize(); // sizes renderer/camera and paints the first frame (needs build())

    window.addEventListener('pointermove', this._onPointer, { passive: true });
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.mount);

    this.renderFrame(); // first paint immediately
  }

  /* subclasses implement these */
  build() {}
  update() {}

  _onPointer(e) {
    this.pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointerTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  resize() {
    if (!this.renderer) return;
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderFrame();
  }

  _updateProgress() {
    const r = this.section.getBoundingClientRect();
    const vh = window.innerHeight;
    const range = r.height - vh;
    // primary scroll progress across the pinned (taller-than-viewport) section
    this.scroll = range > 10 ? clamp(-r.top / range, 0, 1) : clamp(1 - (r.top + r.height / 2) / vh, 0, 1);
    const center = r.top + r.height / 2;
    this.view = clamp(1 - center / vh, 0, 1);
  }

  /* crossfade narrative copy layers based on scroll; each .sc-step
     carries data-start / data-end (0..1) within this section */
  _renderSteps() {
    if (this._steps === null) {
      this._steps = Array.from(this.section.querySelectorAll('.sc-step')).map((el) => ({
        el,
        a: parseFloat(el.dataset.start || '0'),
        b: parseFloat(el.dataset.end || '1'),
      }));
    }
    if (!this._steps.length) return;
    const s = this.scroll;
    for (const st of this._steps) {
      const fade = Math.min(0.1, (st.b - st.a) * 0.4) || 0.08;
      const inA = smoothstep(st.a, st.a + fade, s);
      const outA = 1 - smoothstep(st.b - fade, st.b, s);
      const o = Math.max(0, Math.min(inA, outA));
      st.el.style.opacity = o.toFixed(3);
      st.el.style.transform = `translate3d(0, ${((1 - o) * 26).toFixed(1)}px, 0)`;
      st.el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    }
  }

  renderFrame() {
    this._updateProgress();
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, 0.016);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, 0.016);
    this.update();
    this._renderSteps();
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (!this.inited) this.init();
    if (reduceMotion) {
      // no idle animation, but scroll still positions the scene
      this.renderFrame();
      if (!this._reducedScroll) {
        let ticking = false;
        this._reducedScroll = () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            ticking = false;
            this.renderFrame();
          });
        };
        window.addEventListener('scroll', this._reducedScroll, { passive: true });
      }
      return;
    }
    if (this.running) return;
    this.running = true;
    this._clock.start();
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    this._clock.stop();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _loop() {
    if (!this.running) return;
    this.dt = Math.min(this._clock.getDelta(), 0.05);
    this.elapsed += this.dt;
    this._updateProgress();
    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 6, this.dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 6, this.dt);
    this.update();
    this._renderSteps();
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(this._loop);
  }

  dispose() {
    this.stop();
    window.removeEventListener('pointermove', this._onPointer);
    if (this._reducedScroll) window.removeEventListener('scroll', this._reducedScroll);
    if (this._ro) this._ro.disconnect();
    this.scene?.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          for (const k in m) {
            const v = m[k];
            if (v && v.isTexture) v.dispose();
          }
          m.dispose();
        });
      }
    });
    this._disposables.forEach((d) => d.dispose && d.dispose());
    this.renderer?.dispose();
  }
}
