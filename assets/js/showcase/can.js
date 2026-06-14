/* ============================================================
   ProductCanScene — scroll-driven premium product object
   SCROLL is the primary driver: the can eases in, drifts with
   the page flow, slowly tilts/rotates, the lid lifts open and
   the inner glow appears — all from scrollProgress.
   Hover is only a tiny accent (a little extra glow + micro-tilt).
   Real round geometry (LatheGeometry), separate body/lid/core.
   ============================================================ */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { BaseScene, isMobile, clamp, lerp, damp, smoothstep, contactShadowTexture } from './base.js';

const ACCENT = 0xfaae33;
const OFFWHITE = 0xf5f5f0;

/* outer profile of the can with rounded top & bottom edges */
function canProfile(R, H, e, steps = 10) {
  const pts = [];
  const hy = H / 2;
  pts.push(new THREE.Vector2(0, -hy));
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - e + Math.cos(a) * e, -hy + e + Math.sin(a) * e));
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - e + Math.cos(a) * e, hy - e + Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(0, hy));
  return pts;
}

export class ProductCanScene extends BaseScene {
  build() {
    RectAreaLightUniformsLib.init();

    this.scene.background = null;
    this.camera.fov = 34;
    this.camera.position.set(0, 0.7, 5.2);
    this.camera.lookAt(0, 0.2, 0);
    this.camera.updateProjectionMatrix();

    this.open = 0;
    this.hoverAccent = 0;
    this._hover = false;

    const R = 0.62;
    const H = 1.55;
    const seg = isMobile ? 80 : 128;
    this.H = H;

    const group = new THREE.Group();
    this.group = group;
    this.scene.add(group);

    /* --- body: frosted glass / acryl (desktop) or polished metal (mobile) --- */
    const bodyGeo = new THREE.LatheGeometry(canProfile(R, H, 0.1), seg);
    bodyGeo.computeVertexNormals();
    const bodyMat = isMobile
      ? new THREE.MeshPhysicalMaterial({ color: OFFWHITE, metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.4 })
      : new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0.06,
          transmission: 1,
          ior: 1.45,
          thickness: 1.1,
          attenuationColor: new THREE.Color(0xffe8c2),
          attenuationDistance: 2.4,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.5,
          transparent: true,
        });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(this.body);

    /* --- inner glow core --- */
    const coreGeo = new THREE.CylinderGeometry(R * 0.5, R * 0.5, H * 0.74, 64, 1, false);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: 0x1a1407,
      emissive: new THREE.Color(ACCENT),
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.core = new THREE.Mesh(coreGeo, this.coreMat);
    group.add(this.core);

    const haloGeo = new THREE.CylinderGeometry(R * 0.62, R * 0.62, H * 0.78, 48, 1, true);
    this.halo = new THREE.Mesh(
      haloGeo,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(ACCENT), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
    );
    group.add(this.halo);

    this.coreLight = new THREE.PointLight(ACCENT, 0.6, 6, 2);
    this.coreLight.position.set(0, 0.1, 0);
    group.add(this.coreLight);

    /* --- lid (separate mesh, lifts on scroll) --- */
    const lidGeo = new THREE.LatheGeometry(canProfile(R + 0.015, 0.2, 0.07, 8), seg);
    lidGeo.computeVertexNormals();
    this.lid = new THREE.Mesh(
      lidGeo,
      new THREE.MeshPhysicalMaterial({ color: 0xe9e7e0, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.6 })
    );
    this.lidClosedY = H / 2 + 0.02;
    this.lid.position.y = this.lidClosedY;
    group.add(this.lid);

    const ringGeo = new THREE.TorusGeometry(R + 0.005, 0.012, 16, seg);
    this.ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({ color: 0x141414, emissive: new THREE.Color(ACCENT), emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.3 })
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = H / 2 - 0.06;
    group.add(this.ring);

    /* --- soft contact shadow --- */
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture(256), transparent: true, depthWrite: false, opacity: 0.6 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);

    /* --- lighting --- */
    const key = new THREE.RectAreaLight(0xfff2dd, 9, 3, 4);
    key.position.set(2.2, 2.6, 3.2);
    key.lookAt(0, 0, 0);
    this.scene.add(key);

    const rim = new THREE.SpotLight(0xcfe0ff, isMobile ? 28 : 42, 12, 0.5, 0.6, 1.2);
    rim.position.set(-3, 2, -3.5);
    rim.target.position.set(0, 0, 0);
    this.scene.add(rim);
    this.scene.add(rim.target);

    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-1.5, 0.5, 2.5);
    this.scene.add(fill);

    // hover = tiny accent only
    this.canvas.addEventListener('pointerenter', () => (this._hover = true), { passive: true });
    this.canvas.addEventListener('pointerleave', () => (this._hover = false), { passive: true });
  }

  update() {
    const t = this.elapsed;
    const dt = this.dt || 0.016;
    const s = this.scroll; // PRIMARY driver
    const g = this.group;
    const H = this.H;

    // hover accent ramps gently (small)
    this.hoverAccent = damp(this.hoverAccent, this._hover ? 1 : 0, 5, dt);
    const hv = this.hoverAccent;

    // --- entry: eases in from below + side at the start of the section ---
    const entry = smoothstep(0.0, 0.16, s); // 0 -> 1
    const inX = lerp(-1.4, 0, entry);
    const inY = lerp(-2.4, 0, entry);
    const inScale = lerp(0.7, 1, entry);

    // --- scroll path: drifts with the page flow (right then back, sinking) ---
    const driftX = Math.sin(s * Math.PI) * 0.55 + this.pointer.x * 0.12;
    const driftY = lerp(0.35, -0.55, s) + Math.sin(t * 0.6) * 0.05; // idle float on top
    g.position.x = inX + driftX;
    g.position.y = inY + driftY;
    g.position.z = Math.sin(s * Math.PI * 2) * 0.12;

    // --- rotation: scroll turns it, idle adds a slow drift, hover micro-tilt ---
    g.rotation.y = s * Math.PI * 0.9 + t * 0.06 + this.pointer.x * 0.05 * hv;
    g.rotation.z = Math.sin(s * Math.PI) * 0.12 + Math.sin(t * 0.5) * 0.02;
    g.rotation.x = lerp(0.12, -0.06, s) - this.pointer.y * 0.04 * hv;
    g.scale.setScalar(inScale * (1 + hv * 0.02));

    // --- lid opens between scroll ranges (NOT hover) ---
    const openTarget = smoothstep(0.34, 0.66, s);
    this.open = damp(this.open, openTarget, 6, dt);
    const o = this.open;
    this.lid.position.y = lerp(this.lidClosedY, this.lidClosedY + 0.6, o);
    this.lid.position.x = lerp(0, 0.08, o);
    this.lid.rotation.z = lerp(0, 0.18, o);

    // --- core glow appears via scroll (+ tiny hover boost) ---
    const glow = lerp(0.4, 3.2, o) + hv * 0.5 + Math.sin(t * 1.4) * 0.08;
    this.coreMat.emissiveIntensity = glow;
    this.coreLight.intensity = lerp(0.3, 3.4, o) + hv * 0.4;
    this.halo.material.opacity = lerp(0.06, 0.32, o) + hv * 0.04;
    this.ring.material.emissiveIntensity = lerp(0.25, 1.4, o) + hv * 0.3;

    // --- shadow follows the can on the floor below ---
    this.shadow.position.set(g.position.x * 0.7, -H / 2 - 0.32 + Math.min(0, driftY) * 0.1, 0);
    this.shadow.material.opacity = clamp(0.6 - o * 0.12, 0.32, 0.7) * entry;
    const ss = (1 + o * 0.06) * inScale;
    this.shadow.scale.set(ss, ss, ss);

    // --- soft camera dolly driven by scroll, micro parallax from mouse ---
    const camZ = lerp(5.3, 4.1, s);
    const camY = lerp(0.85, 0.05, s) + this.pointer.y * 0.12;
    this.camera.position.x = damp(this.camera.position.x, this.pointer.x * 0.3, 2.5, dt);
    this.camera.position.y = damp(this.camera.position.y, camY, 2.5, dt);
    this.camera.position.z = damp(this.camera.position.z, camZ, 2.5, dt);
    this.camera.lookAt(g.position.x * 0.4, 0.1 + g.position.y * 0.3, 0);
  }
}

export default ProductCanScene;
