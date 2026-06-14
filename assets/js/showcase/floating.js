/* ============================================================
   FloatingObjectsScene — curated 3D museum (TWOMUCH style)
   Many small objects across depths: cards, glass panels,
   spheres, rings, cubes, labels, icon fragments.
   Calm idle motion; hover lifts + subtly aims at the cursor.
   ============================================================ */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BaseScene, isMobile, lerp, damp, labelTexture } from './base.js';

const ACCENT = 0xfaae33;
const LIME = 0xe2ff70;
const OFFWHITE = 0xf5f5f0;

export class FloatingObjectsScene extends BaseScene {
  build() {
    this.scene.background = null;
    this.camera.fov = 40;
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2(99, 99); // off-screen until pointer moves
    this.hovered = null;

    const glassMat = () =>
      isMobile
        ? new THREE.MeshPhysicalMaterial({ color: 0xcdd6e6, metalness: 0.3, roughness: 0.15, clearcoat: 1, envMapIntensity: 1.4, transparent: true, opacity: 0.85 })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.06, transmission: 1, ior: 1.45, thickness: 0.6, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.5, transparent: true });

    const metalMat = (c = OFFWHITE) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.5 });
    const accentMat = (c = ACCENT) => new THREE.MeshStandardMaterial({ color: 0x141008, emissive: new THREE.Color(c), emissiveIntensity: 1.3, metalness: 0.4, roughness: 0.35 });
    const cardMat = () => new THREE.MeshPhysicalMaterial({ color: 0x202022, metalness: 0.2, roughness: 0.35, clearcoat: 0.6, envMapIntensity: 1.0 });

    /* curated layout: [type, x, y, z, scale, rotZ] */
    const defs = [
      ['card', -2.6, 1.4, 0.5, 1.0, -0.18],
      ['glass', 2.4, 1.1, -0.4, 1.0, 0.2],
      ['sphere', -1.1, -1.3, 1.4, 0.55, 0],
      ['ring', 1.7, -1.5, 0.8, 0.7, 0.4],
      ['cube', -3.1, -0.6, -1.0, 0.6, 0.3],
      ['label', 0.2, 2.0, 0.2, 1.0, 0.05],
      ['icon', 3.1, -0.2, 0.6, 0.7, -0.2],
      ['glass', -2.0, 0.2, 1.6, 0.7, -0.3],
      ['sphere', 2.9, 1.9, -1.4, 0.4, 0],
      ['card', 1.0, -0.4, 1.8, 0.7, 0.12],
      ['ring', -2.9, 1.9, -0.8, 0.45, 0.9],
      ['cube', 0.6, 1.0, -1.6, 0.45, 0.5],
      ['icon', -0.9, 0.6, 1.1, 0.5, 0.15],
      ['label', -1.6, -1.9, 0.3, 0.8, -0.06],
      ['sphere', 0.0, -1.0, 0.2, 0.7, 0],
      ['ring', 3.3, 0.9, 1.2, 0.4, 0.2],
    ];

    const count = isMobile ? 8 : defs.length;
    this.items = [];

    for (let i = 0; i < count; i++) {
      const [type, x, y, z, s, rz] = defs[i];
      let mesh;
      switch (type) {
        case 'card': {
          mesh = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.55, 0.08, 5, 0.06), cardMat());
          // accent hairline
          const edge = new THREE.Mesh(
            new THREE.TorusGeometry(0.02, 0.02, 6, 4),
            accentMat(i % 3 === 0 ? LIME : ACCENT)
          );
          edge.scale.set(1, 1, 1);
          edge.position.set(0.45, 0.62, 0.05);
          mesh.add(edge);
          break;
        }
        case 'glass':
          mesh = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.45, 0.12, 5, 0.08), glassMat());
          break;
        case 'sphere':
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.6, isMobile ? 32 : 64, isMobile ? 32 : 64), i % 2 ? glassMat() : metalMat());
          break;
        case 'ring':
          mesh = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 24, isMobile ? 48 : 96), i % 2 ? metalMat() : accentMat(ACCENT));
          break;
        case 'cube':
          mesh = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.95, 6, 0.12), metalMat(0xdedcd4));
          break;
        case 'icon': {
          const shape = new THREE.Shape();
          shape.moveTo(0, 0.5);
          shape.lineTo(0.45, -0.4);
          shape.lineTo(-0.45, -0.4);
          shape.closePath();
          mesh = new THREE.Mesh(
            new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }),
            accentMat(i % 2 ? LIME : ACCENT)
          );
          break;
        }
        case 'label':
        default: {
          const tex = labelTexture(['AI', 'Render', 'Vector', 'Shader'][i % 4], { sub: ['model', 'gpu', 'space', 'glsl'][i % 4] });
          mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.3, 0.65),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })
          );
          break;
        }
      }
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(s);
      mesh.rotation.z = rz;
      const speed = 0.5 + (i % 5) * 0.28; // varied speeds
      mesh.userData = {
        p: new THREE.Vector3(x, y, z), // continuously wandering position
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.16 * speed,
          (Math.random() - 0.5) * 0.12 * speed,
          (Math.random() - 0.5) * 0.14 * speed
        ),
        baseRot: new THREE.Euler(mesh.rotation.x, mesh.rotation.y, rz),
        spinX: (Math.random() - 0.5) * 0.3,
        spinY: (i % 2 ? 1 : -1) * (0.12 + (i % 4) * 0.05),
        lift: 0,
        baseScale: s,
      };
      this.scene.add(mesh);
      this.items.push(mesh);
    }

    // subtle accent rim light + fill
    const key = new THREE.DirectionalLight(0xfff3e0, 1.2);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.8);
    rim.position.set(-4, -2, -3);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0x202028, 0.6));

    this.canvas.addEventListener('pointermove', (e) => this._track(e), { passive: true });
    this.canvas.addEventListener('pointerleave', () => (this._ndc.set(99, 99)), { passive: true });
  }

  _track(e) {
    const r = this.canvas.getBoundingClientRect();
    this._ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this._ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  update() {
    const dt = this.dt || 0.016;
    const s = this.scroll; // PRIMARY driver

    // hover pick (tiny accent only)
    this._ray.setFromCamera(this._ndc, this.camera);
    const hits = this._ray.intersectObjects(this.items, false);
    this.hovered = hits.length ? hits[0].object : null;

    // scroll spreads the field out (or pulls it in) + a vertical flow drift
    const spread = lerp(0.72, 1.4, s);
    const flowY = (s - 0.5) * -2.2;
    const B = { x: 4.6, y: 3.0, z: 2.6 }; // wander bounds

    this.items.forEach((m) => {
      const u = m.userData;
      const isHover = m === this.hovered;
      u.lift = damp(u.lift, isHover ? 1 : 0, 6, dt);

      // continuous wandering — objects keep drifting, cross & overlap
      u.p.addScaledVector(u.vel, dt);
      // wrap around so they travel through and reappear on the far side
      if (u.p.x > B.x) u.p.x = -B.x;
      else if (u.p.x < -B.x) u.p.x = B.x;
      if (u.p.y > B.y) u.p.y = -B.y;
      else if (u.p.y < -B.y) u.p.y = B.y;
      if (u.p.z > B.z) u.p.z = -B.z;
      else if (u.p.z < -B.z) u.p.z = B.z;

      // render position = wander * scroll-spread + flow + hover lift
      m.position.set(u.p.x * spread, u.p.y * spread + flowY, u.p.z + u.lift * 0.6);

      // continuous slow rotation, varied per object
      u.baseRot.x += dt * u.spinX;
      u.baseRot.y += dt * u.spinY;
      m.rotation.x = u.baseRot.x;
      m.rotation.z = u.baseRot.z;
      if (isHover) {
        // subtle aim toward cursor, small
        m.rotation.y = damp(m.rotation.y, u.baseRot.y + this.pointer.x * 0.25, 6, dt);
        m.scale.setScalar(lerp(u.baseScale, u.baseScale * 1.12, u.lift));
      } else {
        m.rotation.y = u.baseRot.y;
        m.scale.setScalar(u.baseScale);
      }
    });

    // gentle whole-field parallax from mouse + slow scroll-driven orbit
    this.camera.position.x = damp(this.camera.position.x, this.pointer.x * 0.7 + Math.sin(s * Math.PI) * 0.5, 2.5, dt);
    this.camera.position.y = damp(this.camera.position.y, this.pointer.y * 0.5, 2.5, dt);
    this.camera.position.z = damp(this.camera.position.z, lerp(8.4, 7.2, s), 2.5, dt);
    this.camera.lookAt(0, 0, 0);
  }
}

export default FloatingObjectsScene;
