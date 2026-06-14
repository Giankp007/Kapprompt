/* ============================================================
   ShowcaseSection — orchestrator (vanilla, no build)
   Lazy-loads each WebGL scene on first near-view (dynamic
   import), gates the render loop with IntersectionObserver,
   pauses off-screen / on hidden tab, degrades without WebGL,
   and wires the DOM tilt cards immediately.
   ============================================================ */
import { hasWebGL, reduceMotion } from './base.js';
import { initCards } from './card.js';

const webgl = hasWebGL();

/* map: canvas id -> dynamic loader of its scene class */
const SCENES = {
  'can-canvas': () => import('./can.js').then((m) => m.ProductCanScene),
  'room-canvas': () => import('./room.js').then((m) => m.LivingRoomScene),
  'float-canvas': () => import('./floating.js').then((m) => m.FloatingObjectsScene),
};

const instances = new Map(); // canvas -> scene instance
const loading = new Set();

function markFallback(canvas) {
  const mount = canvas.parentElement;
  if (mount) mount.classList.add('no-webgl');
  canvas.style.display = 'none';
}

function ensureScene(canvas, loader, onReady) {
  if (instances.has(canvas) || loading.has(canvas)) {
    onReady?.(instances.get(canvas));
    return;
  }
  loading.add(canvas);
  loader()
    .then((SceneClass) => {
      const scene = new SceneClass(canvas);
      scene.init();
      instances.set(canvas, scene);
      loading.delete(canvas);
      onReady?.(scene);
    })
    .catch((err) => {
      loading.delete(canvas);
      console.warn('[showcase] scene failed to load', canvas.id, err);
      markFallback(canvas);
    });
}

function setup() {
  // tilt cards work without WebGL
  initCards(document);

  if (!webgl) {
    Object.keys(SCENES).forEach((id) => {
      const c = document.getElementById(id);
      if (c) markFallback(c);
    });
    return;
  }

  // run loop only while the canvas is on screen
  const runObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const scene = instances.get(e.target);
        if (!scene) return;
        if (e.isIntersecting) scene.start();
        else scene.stop();
      });
    },
    { threshold: 0.05 }
  );

  // create the scene a bit before it enters the viewport
  const initObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const canvas = e.target;
        const loader = SCENES[canvas.id];
        if (!loader) return;
        obs.unobserve(canvas);
        ensureScene(canvas, loader, (scene) => {
          if (!scene) return;
          runObserver.observe(canvas);
          // start now if it's already visible
          const r = canvas.getBoundingClientRect();
          if (r.top < innerHeight && r.bottom > 0) scene.start();
        });
      });
    },
    { rootMargin: '40% 0px 40% 0px' }
  );

  Object.keys(SCENES).forEach((id) => {
    const c = document.getElementById(id);
    if (c) initObserver.observe(c);
  });

  // pause everything when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      instances.forEach((s) => s.stop());
    } else if (!reduceMotion) {
      instances.forEach((s) => {
        const r = s.canvas.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) s.start();
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
