import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
function load(file){const module={exports:{}};const require=createRequire(new URL('../'+file,import.meta.url));const source=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(require,module,module.exports);return module.exports;}
const data=load('src/data/config.ts');const {makeGarment,makeMannequin}=load('src/viewer/garment.ts');
const codes=new Set();
assert.equal(data.families.length,12,'expected all 12 supplied material families');
for(const family of data.families){
  assert(family.reference && fs.existsSync(new URL('../public'+family.reference,import.meta.url)),`${family.id} reference missing`);
  assert(family.materialProperties,`${family.id} physical properties missing`);
  for(const key of ['roughness','metalness','sheen','clearcoat','bumpScale']) assert.equal(typeof family.materialProperties[key],'number',`${family.id}.${key} missing`);
  assert.equal(family.materialProperties.tileRepeat.length,2,`${family.id} repeat missing`);
  for(const s of family.swatches){
    assert(!codes.has(s.code),'duplicate code');codes.add(s.code);
    assert.equal(s.family,family.id,`${s.code} family mismatch`);
    assert(/^#[\da-f]{6}$/i.test(s.baseColor),`${s.code} fallback color invalid`);
    for(const key of ['texture','colorMap','bumpMap']) {
      assert(s[key],`${s.code} ${key} missing`);
      const path=new URL('../public'+s[key],import.meta.url);
      assert(fs.existsSync(path),`${s.code} ${key} file missing`);
      assert(fs.statSync(path).size>100,`${s.code} ${key} is empty`);
    }
    assert.equal(s.sourceCrop.length,4,`${s.code} source crop missing`);
  }
}
assert.equal(codes.size,329,'manufacturer palette should contain 329 codes');
assert.equal(data.families.flatMap(f=>f.swatches).filter(s=>s.discontinued).length,3,'discontinued swatches must stay flagged');
const pl12=data.resolveChoice({material:'corduroy',code:'PL12'});
const trh234=data.resolveChoice({material:'factory',code:'TRH234'});
assert.equal(pl12.kind,'corduroy');assert.equal(trh234.kind,'wool');
assert.notEqual(pl12.colorMap,trh234.colorMap,'PL12 and TRH234 must retain separate source maps');
assert.notEqual(pl12.bumpMap,trh234.bumpMap,'PL12 and TRH234 must retain separate relief maps');
assert(pl12.materialProperties.bumpScale>trh234.materialProperties.bumpScale,'corduroy relief should exceed Himir relief');
for(const {id} of data.regions){const choice=data.resolveChoice(data.initialConfig[id]);assert(choice.baseColor,id+' default missing');}
const {group,parts}=makeGarment();for(const id of ['body','leftSleeve','rightSleeve','collar','leftCuff','rightCuff','waistband','leftPocketTrim','rightPocketTrim','snaps'])assert(parts.has(id),'missing '+id);
for(const mesh of group.children){const g=mesh.geometry;g.computeBoundingBox();const box=g.boundingBox;assert(box.max.z-box.min.z>0,'flat mesh');for(const value of g.attributes.position.array)assert(Number.isFinite(value));for(const value of g.attributes.normal.array)assert(Number.isFinite(value));}
assert.equal(parts.get('snaps').length,7);assert.equal(data.sizes.length,9);assert.deepEqual(data.measurements[2],[65.5,58,47,62]);assert.equal(makeMannequin(false).children.length,7);assert.equal(makeMannequin(true).children.length,7);
assert.deepEqual(JSON.parse(JSON.stringify(data.initialConfig)),data.initialConfig);
console.log(`Verified ${codes.size} source-textured swatches in 12 families, including distinct PL12 corduroy and TRH234 wool materials; ${parts.size} independent meshes/groups, 9 sizes, 2 mannequin forms, and serializable configuration.`);
