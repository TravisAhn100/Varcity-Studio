import * as THREE from 'three';
import type { Region, resolveChoice } from '../data/config';

type Resolved = ReturnType<typeof resolveChoice>;
type Entry = { material: THREE.MeshPhysicalMaterial; textures: THREE.Texture[]; disposed: boolean };

/** One material per code/region. Requests cannot overwrite a newer selection. */
export class MaterialLibrary {
  private cache = new Map<string, Entry>();
  private loader = new THREE.TextureLoader();
  constructor(private render: () => void, private onError: (code: string) => void, private anisotropy = 4) {}

  get(choice: Resolved, region: Region) {
    const key = `${choice.code}:${region}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached.material;
    }
    const p = choice.materialProperties;
    const material = new THREE.MeshPhysicalMaterial({
      color: choice.baseColor, roughness: p.roughness, metalness: p.metalness,
      sheen: p.sheen, sheenRoughness: .9, clearcoat: p.clearcoat,
      bumpScale: p.bumpScale, side: THREE.DoubleSide,
    });
    material.name = key;
    material.userData = { manufacturerCode: choice.manufacturerCode, colorMap: choice.colorMap, bumpMap: choice.bumpMap };
    const entry: Entry = { material, textures: [], disposed: false };
    this.cache.set(key, entry);
    if (choice.colorMap) {
      // Source pixels provide albedo. White tint prevents multiplying dark fabric twice.
      // Both channels share UV scale, so color ribs and bump ridges stay aligned.
      const factor = region === 'sleeves' ? [.34, .87] : region === 'pocketTrim' ? [.04, .17] : [1, 1];
      const repeat = [p.tileRepeat[0] * factor[0], p.tileRepeat[1] * factor[1]];
      const load = (url: string, channel: 'map' | 'bumpMap') => {
        const texture = this.loader.load(url, loaded => {
          if (entry.disposed) { loaded.dispose(); return; }
          material[channel] = loaded;
          if (channel === 'map') material.color.set('#ffffff');
          material.needsUpdate = true;
          this.render();
        }, undefined, () => { if (!entry.disposed) this.onError(choice.code); });
        texture.colorSpace = channel === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        texture.anisotropy = this.anisotropy;
        entry.textures.push(texture);
      };
      load(choice.colorMap, 'map');
      load(choice.bumpMap, 'bumpMap');
    } else if (choice.kind === 'rib-knit') {
      const color = document.createElement('canvas'); color.width = 64; color.height = 128;
      const ctx = color.getContext('2d')!;
      ctx.fillStyle = choice.baseColor; ctx.fillRect(0, 0, 64, 128);
      ctx.fillStyle = '#eeeadd'; ctx.fillRect(0, 26, 64, 12); ctx.fillRect(0, 58, 64, 12);
      const map = new THREE.CanvasTexture(color); map.colorSpace = THREE.SRGBColorSpace;
      const ribs = document.createElement('canvas'); ribs.width = 128; ribs.height = 32;
      const r = ribs.getContext('2d')!;
      for (let x = 0; x < 128; x++) { const v = Math.round(128 + 80 * Math.cos(x * Math.PI / 4)); r.fillStyle = `rgb(${v},${v},${v})`; r.fillRect(x, 0, 1, 32); }
      const bump = new THREE.CanvasTexture(ribs); bump.wrapS = THREE.RepeatWrapping; bump.repeat.x = 5;
      material.color.set('#ffffff'); material.map = map; material.bumpMap = bump;
      entry.textures.push(map, bump);
    }
    return material;
  }

  /** Bound GPU memory while retaining current meshes and recently used fabrics. */
  prune(active: Set<THREE.Material>) {
    for (const [key, entry] of this.cache) {
      if (this.cache.size <= 24) break;
      if (!active.has(entry.material)) { this.release(entry); this.cache.delete(key); }
    }
  }
  private release(entry: Entry) { entry.disposed = true; entry.material.dispose(); entry.textures.forEach(t => t.dispose()); }
  dispose() { this.cache.forEach(entry => this.release(entry)); this.cache.clear(); }
}
