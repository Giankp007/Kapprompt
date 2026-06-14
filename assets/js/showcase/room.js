/* ============================================================
   LivingRoomScene — warm, modern 3D living room
   SCROLL drives a soft camera dolly through the room while the
   furniture eases into place (the room "builds up"). Furniture
   and camera move in parallax layers. Continuous gentle life
   (plant sway, light breathing). Hover = tiny camera accent.
   Sofa · lounge chair · coffee table · rug · floor lamp ·
   pendant · window light · wall art · shelf · plants.
   ============================================================ */
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BaseScene, isMobile, lerp, damp, smoothstep, clamp } from './base.js';

const WARM = 0xfff2dd;

/* warm abstract art texture for the framed wall pieces */
function artTexture(kind = 0) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d');
  const bg = ['#efe6d6', '#e7d8c2', '#f1ece1'][kind % 3];
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 320);
  if (kind % 3 === 0) {
    g.fillStyle = '#c9772f';
    g.beginPath();
    g.arc(128, 150, 70, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#7a4a2a';
    g.fillRect(40, 240, 176, 14);
  } else if (kind % 3 === 1) {
    const grd = g.createLinearGradient(0, 0, 0, 320);
    grd.addColorStop(0, '#e0a45a');
    grd.addColorStop(0.55, '#c9772f');
    grd.addColorStop(1, '#5a3a24');
    g.fillStyle = grd;
    g.fillRect(36, 36, 184, 248);
  } else {
    g.strokeStyle = '#9c5b34';
    g.lineWidth = 8;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(40, 60 + i * 48);
      g.bezierCurveTo(110, 30 + i * 48, 150, 100 + i * 48, 216, 70 + i * 48);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class LivingRoomScene extends BaseScene {
  build() {
    RectAreaLightUniformsLib.init();

    this.scene.background = new THREE.Color(0x171310);
    this.scene.fog = new THREE.Fog(0x171310, 14, 34);

    this.camera.fov = 46;
    this.camera.position.set(0.5, 2.6, 9);
    this.camera.lookAt(0, 1.2, -3);
    this.camera.updateProjectionMatrix();

    this._hover = false;
    this.hoverAccent = 0;
    this.animated = []; // {obj, base:Vector3, baseScale, delay, layer, sway}

    /* ---------- materials ---------- */
    const M = {
      wall: new THREE.MeshStandardMaterial({ color: 0xe7ddcb, roughness: 0.96, metalness: 0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x6e4a30, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.6 }),
      rug: new THREE.MeshStandardMaterial({ color: 0x9c5b44, roughness: 1 }),
      fabric: new THREE.MeshStandardMaterial({ color: 0xbcad93, roughness: 0.95 }),
      fabric2: new THREE.MeshStandardMaterial({ color: 0xc9bca4, roughness: 0.92 }),
      chair: new THREE.MeshStandardMaterial({ color: 0x9a6a4a, roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.55, metalness: 0.1 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.35, envMapIntensity: 1.4 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.3 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x4f7d54, roughness: 0.8 }),
      pot: new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.7 }),
      shade: new THREE.MeshStandardMaterial({ color: 0xfff0d2, emissive: new THREE.Color(WARM), emissiveIntensity: 1.4, roughness: 0.5 }),
      glass: isMobile
        ? new THREE.MeshPhysicalMaterial({ color: 0xdfe7ea, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.5 })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, ior: 1.45, thickness: 0.5, transparent: true, envMapIntensity: 1.4 }),
    };
    this.M = M;

    const rbox = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);

    /* ---------- shell: floor, walls, ceiling ---------- */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), M.floor);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), M.wall);
    backWall.position.set(0, 4, -6.5);
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), M.wall);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 4, 0);
    this.scene.add(leftWall);

    if (!isMobile) {
      const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), M.wall);
      rightWall.rotation.y = -Math.PI / 2;
      rightWall.position.set(6, 4, 0);
      this.scene.add(rightWall);
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), M.wall);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = 7.4;
      this.scene.add(ceiling);
    }

    /* ---------- rug ---------- */
    const rug = rbox(4.4, 0.04, 3.2, 0.05, M.rug);
    rug.position.set(0, 0.02, -1.6);
    this.scene.add(rug);
    // rug border
    const rugInner = rbox(3.6, 0.05, 2.5, 0.04, M.fabric2);
    rugInner.position.set(0, 0.03, -1.6);
    this.scene.add(rugInner);

    /* ---------- sofa (faces +z) ---------- */
    const sofa = new THREE.Group();
    const sBase = rbox(3.2, 0.35, 1.2, 0.08, M.wood);
    sBase.position.y = 0.2;
    const sSeat = rbox(3.2, 0.45, 1.15, 0.16, M.fabric);
    sSeat.position.set(0, 0.55, 0.02);
    const sBack = rbox(3.2, 1.0, 0.32, 0.16, M.fabric);
    sBack.position.set(0, 1.0, -0.46);
    const armL = rbox(0.34, 0.78, 1.2, 0.14, M.fabric);
    armL.position.set(-1.5, 0.62, 0);
    const armR = armL.clone();
    armR.position.x = 1.5;
    sofa.add(sBase, sSeat, sBack, armL, armR);
    for (const cx of [-0.8, 0.8]) {
      const cush = rbox(1.35, 0.28, 1.0, 0.14, M.fabric2);
      cush.position.set(cx, 0.86, 0.04);
      const bcush = rbox(1.35, 0.7, 0.22, 0.16, M.fabric2);
      bcush.position.set(cx, 1.02, -0.34);
      sofa.add(cush, bcush);
    }
    sofa.position.set(-0.2, 0, -3.4);
    this.scene.add(sofa);
    this._addAnimated(sofa, 0.02, -1);

    /* ---------- lounge chair (desktop) ---------- */
    if (!isMobile) {
      const chair = new THREE.Group();
      const cSeat = rbox(1.1, 0.4, 1.1, 0.16, M.chair);
      cSeat.position.y = 0.55;
      const cBack = rbox(1.1, 0.9, 0.26, 0.16, M.chair);
      cBack.position.set(0, 1.05, -0.42);
      cBack.rotation.x = -0.12;
      const cCush = rbox(0.95, 0.22, 0.95, 0.12, M.fabric2);
      cCush.position.y = 0.82;
      chair.add(cSeat, cBack, cCush);
      for (const [lx, lz] of [[-0.45, 0.45], [0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 12), M.wood);
        leg.position.set(lx, 0.25, lz);
        chair.add(leg);
      }
      chair.position.set(2.7, 0, -1.4);
      chair.rotation.y = -0.7;
      this.scene.add(chair);
      this._addAnimated(chair, 0.12, 0);
    }

    /* ---------- coffee table ---------- */
    const table = new THREE.Group();
    const top = rbox(1.7, 0.1, 0.95, 0.05, isMobile ? M.wood : M.glass);
    top.position.y = 0.5;
    const underTop = rbox(1.5, 0.06, 0.8, 0.04, M.wood);
    underTop.position.y = 0.2;
    table.add(top, underTop);
    for (const [lx, lz] of [[-0.72, 0.38], [0.72, 0.38], [-0.72, -0.38], [0.72, -0.38]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 12), M.wood);
      leg.position.set(lx, 0.25, lz);
      table.add(leg);
    }
    // a little book + bowl on the table
    const book = rbox(0.5, 0.06, 0.36, 0.02, M.dark);
    book.position.set(-0.3, 0.58, 0.1);
    book.rotation.y = 0.3;
    table.add(book);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.brass);
    bowl.rotation.x = Math.PI;
    bowl.position.set(0.35, 0.59, -0.05);
    table.add(bowl);
    table.position.set(0, 0, -1.4);
    this.scene.add(table);
    this._addAnimated(table, 0.18, 0);

    /* ---------- floor lamp ---------- */
    const lamp = new THREE.Group();
    const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 24), M.dark);
    const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 12), M.brass);
    lPole.position.y = 1.0;
    const lShade = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.5, 28, 1, true), M.shade);
    lShade.position.y = 2.05;
    lamp.add(lBase, lPole, lShade);
    this.lampLight = new THREE.PointLight(WARM, 6, 7, 2);
    this.lampLight.position.set(0, 2.0, 0);
    lamp.add(this.lampLight);
    lamp.position.set(3.7, 0, -4.2);
    this.scene.add(lamp);
    this._addAnimated(lamp, 0.26, 1);

    /* ---------- pendant light over the table ---------- */
    if (!isMobile) {
      const pendant = new THREE.Group();
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.2, 8), M.dark);
      cord.position.y = 6.3;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), M.shade);
      dome.position.y = 5.2;
      pendant.add(cord, dome);
      this.pendantLight = new THREE.PointLight(WARM, 5, 6, 2);
      this.pendantLight.position.set(0, 5.0, 0);
      pendant.add(this.pendantLight);
      pendant.position.set(-0.2, 0, -1.4);
      this.scene.add(pendant);
      this._addAnimated(pendant, 0.3, -1);
    }

    /* ---------- window with soft daylight (left wall) ---------- */
    const winFrame = rbox(0.12, 3.0, 2.6, 0.04, M.wood);
    winFrame.position.set(-5.95, 2.4, -1.0);
    this.scene.add(winFrame);
    const winGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.8),
      new THREE.MeshBasicMaterial({ color: 0xfff4e0 })
    );
    winGlow.rotation.y = Math.PI / 2;
    winGlow.position.set(-5.88, 2.4, -1.0);
    this.scene.add(winGlow);
    // mullions
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 0.06), M.wood);
    barV.position.set(-5.86, 2.4, -1.0);
    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.4), M.wood);
    barH.position.set(-5.86, 2.4, -1.0);
    this.scene.add(barV, barH);
    const dayLight = new THREE.RectAreaLight(0xfff1da, isMobile ? 5 : 9, 2.4, 2.8);
    dayLight.position.set(-5.6, 2.4, -1.0);
    dayLight.lookAt(2, 1, -1);
    this.scene.add(dayLight);

    /* ---------- wall art (back wall) ---------- */
    const artDefs = isMobile ? [[-1.6, 2.4, 0]] : [[-1.7, 2.5, 0], [0.6, 2.7, 1], [2.7, 2.3, 2]];
    artDefs.forEach(([x, y, k]) => {
      const frame = rbox(1.1, 1.4, 0.08, 0.02, M.wood);
      frame.position.set(x, y, -6.42);
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(0.92, 1.22),
        new THREE.MeshStandardMaterial({ map: artTexture(k), roughness: 0.9 })
      );
      art.position.set(x, y, -6.37);
      this.scene.add(frame, art);
    });

    /* ---------- shelf (back wall, right) ---------- */
    if (!isMobile) {
      for (let i = 0; i < 2; i++) {
        const shelf = rbox(2.0, 0.08, 0.4, 0.02, M.wood);
        shelf.position.set(3.6, 1.4 + i * 0.9, -6.2);
        this.scene.add(shelf);
        for (let j = 0; j < 4; j++) {
          const obj = j % 2
            ? new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.16), j % 3 ? M.dark : M.brass)
            : new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), M.brass);
          obj.position.set(2.9 + j * 0.42, 1.65 + i * 0.9, -6.2);
          this.scene.add(obj);
        }
      }
    }

    /* ---------- plants ---------- */
    const makePlant = (scale) => {
      const p = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.5, 20), M.pot);
      pot.position.y = 0.25;
      p.add(pot);
      const blades = isMobile ? 5 : 9;
      for (let i = 0; i < blades; i++) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.12, 0), M.leaf);
        const a = (i / blades) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 0.18, 0.6 + Math.random() * 0.9, Math.sin(a) * 0.18);
        leaf.scale.set(0.7, 1.6 + Math.random(), 0.7);
        leaf.rotation.set(Math.random() * 0.4, a, (Math.random() - 0.5) * 0.5);
        p.add(leaf);
      }
      p.scale.setScalar(scale);
      return p;
    };
    const tallPlant = makePlant(1.2);
    tallPlant.position.set(-4.3, 0, -4.6);
    this.scene.add(tallPlant);
    this._addAnimated(tallPlant, 0.34, -1, 0.05);

    if (!isMobile) {
      const frontPlant = makePlant(1.0);
      frontPlant.position.set(-3.6, 0, 2.6); // foreground for depth
      this.scene.add(frontPlant);
      this._addAnimated(frontPlant, 0.08, 1, 0.06);
    }

    /* ---------- ambient lighting (kept low so the window/lamps shape form) ---------- */
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2c20, isMobile ? 0.55 : 0.4));
    this.scene.add(new THREE.AmbientLight(0x4a3a2a, 0.28));

    this.canvas.addEventListener('pointerenter', () => (this._hover = true), { passive: true });
    this.canvas.addEventListener('pointerleave', () => (this._hover = false), { passive: true });

    this._camStart = { p: new THREE.Vector3(0.6, 2.7, 9.2), l: new THREE.Vector3(0, 1.4, -3) };
    this._camEnd = { p: new THREE.Vector3(0.9, 1.25, 4.6), l: new THREE.Vector3(0, 1.0, -3.2) };
    this._lookAt = new THREE.Vector3();
  }

  _addAnimated(obj, delay, layer = 0, sway = 0) {
    this.animated.push({
      obj,
      base: obj.position.clone(),
      baseScale: obj.scale.x,
      delay,
      layer,
      sway,
    });
  }

  update() {
    const t = this.elapsed;
    const dt = this.dt || 0.016;
    const s = this.scroll; // PRIMARY driver

    this.hoverAccent = damp(this.hoverAccent, this._hover ? 1 : 0, 4, dt);
    const hv = this.hoverAccent;

    // --- furniture builds up + parallax layers ---
    for (const a of this.animated) {
      const appear = smoothstep(a.delay, a.delay + 0.2, s); // 0..1 assemble
      const px = a.layer * (s - 0.5) * 0.6 + this.pointer.x * a.layer * 0.15 * hv;
      a.obj.position.x = a.base.x + px;
      a.obj.position.y = a.base.y - (1 - appear) * 0.6; // settles down into place
      const sc = a.baseScale * lerp(0.82, 1, appear);
      a.obj.scale.setScalar(sc);
      if (a.sway) a.obj.rotation.z = Math.sin(t * 0.6 + a.base.x) * a.sway;
    }

    // --- light breathing (continuous life) ---
    if (this.lampLight) this.lampLight.intensity = 6 + Math.sin(t * 0.8) * 0.4;
    if (this.pendantLight) this.pendantLight.intensity = 5 + Math.sin(t * 1.1 + 1) * 0.35;

    // --- soft camera dolly from scroll, micro parallax from mouse + idle ---
    const e = smoothstep(0, 1, s);
    const wob = Math.sin(t * 0.18) * 0.12;
    const px = lerp(this._camStart.p.x, this._camEnd.p.x, e) + wob + this.pointer.x * 0.35 + hv * 0.1;
    const py = lerp(this._camStart.p.y, this._camEnd.p.y, e) + this.pointer.y * 0.25 + Math.sin(t * 0.25) * 0.04;
    const pz = lerp(this._camStart.p.z, this._camEnd.p.z, e);
    this.camera.position.x = damp(this.camera.position.x, px, 2.4, dt);
    this.camera.position.y = damp(this.camera.position.y, py, 2.4, dt);
    this.camera.position.z = damp(this.camera.position.z, pz, 2.4, dt);

    this._lookAt.set(
      lerp(this._camStart.l.x, this._camEnd.l.x, e) + this.pointer.x * 0.3,
      lerp(this._camStart.l.y, this._camEnd.l.y, e),
      lerp(this._camStart.l.z, this._camEnd.l.z, e)
    );
    this.camera.lookAt(this._lookAt);
  }
}

export default LivingRoomScene;
