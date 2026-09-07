import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
function load(file){const module={exports:{}};const require=createRequire(new URL('../'+file,import.meta.url));const source=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(require,module,module.exports);return module.exports;}
const data=load('src/data/config.ts');const {makeGarment,makeMannequin}=load('src/viewer/garment.ts');
const codes=new Set();for(const family of data.families)for(const s of family.swatches){assert(!codes.has(s.code),'duplicate code');codes.add(s.code);assert(/^#[\da-f]{6}$/i.test(s.baseColor));assert(fs.existsSync(new URL('../public'+s.texture,import.meta.url)));}
for(const {id} of data.regions){const choice=data.resolveChoice(data.initialConfig[id]);assert(choice.baseColor,id+' default missing');}
const {group,parts}=makeGarment();for(const id of ['body','leftSleeve','rightSleeve','collar','leftCuff','rightCuff','waistband','leftPocketTrim','rightPocketTrim','snaps'])assert(parts.has(id),'missing '+id);
for(const mesh of group.children){const g=mesh.geometry;g.computeBoundingBox();const box=g.boundingBox;assert(box.max.z-box.min.z>0,'flat mesh');for(const value of g.attributes.position.array)assert(Number.isFinite(value));for(const value of g.attributes.normal.array)assert(Number.isFinite(value));}
assert.equal(parts.get('snaps').length,7);assert.equal(data.sizes.length,9);assert.deepEqual(data.measurements[2],[65.5,58,47,62]);assert.equal(makeMannequin(false).children.length,7);assert.equal(makeMannequin(true).children.length,7);
assert.deepEqual(JSON.parse(JSON.stringify(data.initialConfig)),data.initialConfig);
console.log(`Verified ${codes.size} official swatches, ${parts.size} independent meshes/groups, 9 sizes, 2 mannequin forms, and serializable configuration.`);
