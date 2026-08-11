/**
 * Lightweight WebGL renderer for the landing-page ring box.
 *
 * One scene, one camera, one renderer, render-on-demand. It exposes a single
 * `setProgress(0→1)` entry point so the whole scene stays a pure function of
 * the scroll MotionValue and reverses perfectly when scrolling upward.
 */
import type * as THREE_NS from "three";

import logoAr from "@/assets/branding/logo-ar.png";

export type RingBoxRenderer = {
  setProgress: (value: number) => void;
  dispose: () => void;
};

/** Piecewise-linear keyframe sampling — mirrors motion's `useTransform`. */
function keyframe(t: number, input: number[], output: number[]) {
  if (t <= input[0]!) return output[0]!;
  for (let i = 1; i < input.length; i++) {
    const a = input[i - 1]!;
    const b = input[i]!;
    if (t <= b) {
      const k = b === a ? 0 : (t - a) / (b - a);
      return output[i - 1]! + (output[i]! - output[i - 1]!) * k;
    }
  }
  return output[output.length - 1]!;
}

function roundedRect(THREE: typeof THREE_NS, w: number, h: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function roundedPath(THREE: typeof THREE_NS, w: number, h: number, r: number) {
  const s = roundedRect(THREE, w, h, r);
  return new THREE.Path(s.getPoints(48));
}

/** Extrudes a (optionally hollow) rounded slab lying flat on the XZ plane. */
function slab(
  THREE: typeof THREE_NS,
  opts: {
    w: number;
    d: number;
    r: number;
    height: number;
    bevel: number;
    hole?: [number, number, number];
  },
) {
  const shape = roundedRect(THREE, opts.w, opts.d, opts.r);
  if (opts.hole) shape.holes.push(roundedPath(THREE, opts.hole[0], opts.hole[1], opts.hole[2]));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(opts.height - opts.bevel * 2, 0.001),
    bevelEnabled: true,
    bevelThickness: opts.bevel,
    bevelSize: opts.bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, opts.bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

export async function createRingBoxRenderer(host: HTMLElement): Promise<RingBoxRenderer> {
  const THREE = await import("three");
  const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");

  // Adaptive DPR: full quality only on capable desktops, 1x on mobile/low-power.
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const narrow = window.innerWidth < 768;
  const dprCap = coarse || narrow ? 1 : cores >= 8 ? 1.75 : 1.25;

  const renderer = new THREE.WebGLRenderer({
    antialias: !coarse,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 3.0, 7.2);
  camera.lookAt(0, 1.05, 0);

  // Soft studio environment — gives the gold believable reflections.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd8cec0, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4e2, 2.1);
  key.position.set(1.8, 6.4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.radius = 9;
  key.shadow.bias = -0.0008;
  const cam = key.shadow.camera;
  cam.near = 1;
  cam.far = 16;
  cam.left = -3.5;
  cam.right = 3.5;
  cam.top = 3.5;
  cam.bottom = -3.5;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-3, 2, -2.5);
  scene.add(fill);

  // ── Materials ────────────────────────────────────────────────────────────
  const ivory = new THREE.MeshPhysicalMaterial({
    color: 0xf3ede2,
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.45,
    envMapIntensity: 0.8,
  });
  const ivoryInner = new THREE.MeshPhysicalMaterial({
    color: 0xded1bd,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.5,
  });
  const cushionMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6d7bd,
    roughness: 0.95,
    metalness: 0,
    sheen: 0.8,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0xfff5e6),
    envMapIntensity: 0.4,
  });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xd9c096,
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.25,
  });

  const disposables: { dispose: () => void }[] = [ivory, ivoryInner, cushionMat, goldMat];
  const add = <T extends THREE_NS.BufferGeometry>(g: T) => {
    disposables.push(g);
    return g;
  };

  // ── Base: bottom slab + hollow wall ring (real cavity) ───────────────────
  const W = 2.2;
  const RIM_TOP = 0.92;
  const FLOOR_TOP = 0.16;

  const baseGroup = new THREE.Group();
  const bottom = new THREE.Mesh(
    add(slab(THREE, { w: W, d: W, r: 0.26, height: FLOOR_TOP, bevel: 0.035 })),
    ivory,
  );
  bottom.castShadow = true;
  bottom.receiveShadow = true;
  baseGroup.add(bottom);

  const wall = new THREE.Mesh(
    add(
      slab(THREE, {
        w: W,
        d: W,
        r: 0.26,
        height: RIM_TOP - FLOOR_TOP,
        bevel: 0.03,
        hole: [W - 0.36, W - 0.36, 0.16],
      }),
    ),
    ivory,
  );
  wall.position.y = FLOOR_TOP;
  wall.castShadow = true;
  wall.receiveShadow = true;
  baseGroup.add(wall);

  // Cavity liner — slightly darker inner surface for occlusion depth.
  const liner = new THREE.Mesh(
    add(slab(THREE, { w: W - 0.38, d: W - 0.38, r: 0.15, height: 0.02, bevel: 0.008 })),
    ivoryInner,
  );
  liner.position.y = FLOOR_TOP;
  liner.receiveShadow = true;
  baseGroup.add(liner);

  // Cushion — recessed below the rim, soft rounded volume.
  const CUSHION_H = 0.26;
  const cushion = new THREE.Mesh(
    add(slab(THREE, { w: W - 0.52, d: W - 0.52, r: 0.16, height: CUSHION_H, bevel: 0.09 })),
    cushionMat,
  );
  cushion.position.y = FLOOR_TOP + 0.02;
  cushion.castShadow = true;
  cushion.receiveShadow = true;
  baseGroup.add(cushion);
  const CUSHION_TOP = FLOOR_TOP + 0.02 + CUSHION_H;

  // Slit the ring seats into.
  const slit = new THREE.Mesh(add(new THREE.BoxGeometry(0.5, 0.04, 0.09)), ivoryInner);
  slit.position.set(0, CUSHION_TOP - 0.015, 0.02);
  slit.receiveShadow = true;
  baseGroup.add(slit);
  scene.add(baseGroup);

  // ── Ring: volumetric torus standing in the cushion slit ──────────────────
  const RING_R = 0.36;
  const ringGroup = new THREE.Group();
  const ring = new THREE.Mesh(add(new THREE.TorusGeometry(RING_R, 0.075, 20, 96)), goldMat);
  ring.castShadow = true;
  ring.receiveShadow = true;
  ringGroup.add(ring);
  ringGroup.rotation.x = -1.12;
  ringGroup.rotation.y = -0.28;
  ringGroup.rotation.z = 0.06;
  const RING_REST_Y = CUSHION_TOP + 0.09;
  scene.add(ringGroup);

  // ── Lid: top slab + inner lip on the underside ───────────────────────────
  const lidGroup = new THREE.Group();
  const LID_H = 0.32;
  const lidTop = new THREE.Mesh(
    add(slab(THREE, { w: W, d: W, r: 0.26, height: LID_H, bevel: 0.05 })),
    ivory,
  );
  lidTop.castShadow = true;
  lidTop.receiveShadow = true;
  lidGroup.add(lidTop);

  const lip = new THREE.Mesh(
    add(
      slab(THREE, {
        w: W - 0.42,
        d: W - 0.42,
        r: 0.15,
        height: 0.12,
        bevel: 0.02,
        hole: [W - 0.66, W - 0.66, 0.1],
      }),
    ),
    ivoryInner,
  );
  lip.position.y = -0.12;
  lip.castShadow = true;
  lidGroup.add(lip);

  // Underside panel so the exploded lid never reads as an open shell.
  const underside = new THREE.Mesh(
    add(slab(THREE, { w: W - 0.44, d: W - 0.44, r: 0.15, height: 0.02, bevel: 0.008 })),
    ivoryInner,
  );
  underside.position.y = -0.02;
  lidGroup.add(underside);

  // Brand mark, printed flat on the lid surface.
  const loader = new THREE.TextureLoader();
  const logoTex = loader.load(logoAr, () => {
    invalidate();
  });
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = 4;
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTex,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  disposables.push(logoMat, logoTex);
  const logo = new THREE.Mesh(add(new THREE.PlaneGeometry(1.05, 0.7)), logoMat);
  logo.rotation.x = -Math.PI / 2;
  logo.position.set(0, LID_H + 0.002, 0.02);
  lidGroup.add(logo);
  scene.add(lidGroup);

  // Ground plane catching the soft contact shadow.
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.17 });
  disposables.push(shadowMat);
  const ground = new THREE.Mesh(add(new THREE.PlaneGeometry(14, 14)), shadowMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Progress → transforms (same keyframes as the original choreography) ──
  function apply(t: number) {
    const p = Math.min(Math.max(t, 0), 1);

    const baseY = keyframe(p, [0, 0.4, 1], [0.42, 0, 0]);
    baseGroup.position.y = baseY;

    const ringLift = keyframe(p, [0, 0.55, 1], [0.95, 0, 0]);
    const ringScale = keyframe(p, [0, 0.55, 1], [1.06, 1, 1]);
    ringGroup.position.y = RING_REST_Y + ringLift + baseY;
    ringGroup.scale.setScalar(ringScale);

    const lidY = keyframe(p, [0, 0.72, 1], [1.85, 0.3, 0.08]);
    const lidSeat = keyframe(p, [0.72, 1], [0, 1]);
    lidGroup.position.y = RIM_TOP + lidY - lidSeat * 0.12;
    lidGroup.rotation.z = keyframe(p, [0, 0.5, 1], [-0.1, -0.035, 0]);
    lidGroup.rotation.x = keyframe(p, [0, 0.5, 1], [0.05, 0.015, 0]);
  }

  // ── Render on demand — no permanent animation loop ───────────────────────
  let visible = true;
  let raf = 0;
  let dead = false;

  const draw = () => {
    raf = 0;
    if (dead || !visible) return;
    renderer.render(scene, camera);
  };
  /** Schedules exactly one frame; off-screen scenes never render at all. */
  const invalidate = () => {
    if (dead || !visible || raf) return;
    raf = requestAnimationFrame(draw);
  };

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Frame the product consistently on narrow viewports.
    camera.position.z = w < 420 ? 8.1 : 7.2;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 1.05, 0);
    invalidate();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) invalidate();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { rootMargin: "120px" },
  );
  io.observe(host);

  apply(0);
  invalidate();

  return {
    setProgress(value: number) {
      apply(value);
      invalidate();
    },
    dispose() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      for (const d of disposables) d.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    },
  };
}
