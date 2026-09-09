import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
function load(file){
 const filename=path.resolve(fileURLToPath(new URL('..',import.meta.url)),file),module={exports:{}},native=createRequire(filename);
 const require=(name)=>{
  if(name.startsWith('.')||name.startsWith('@/')){
   const target=name.startsWith('@/')?path.resolve(path.dirname(fileURLToPath(new URL('../package.json',import.meta.url))),name.slice(2)):path.resolve(path.dirname(filename),name);
   for(const ext of ['.ts','.tsx'])if(fs.existsSync(target+ext))return load(target+ext);
  }
  return native(name);
 };
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',source)(require,module,module.exports);return module.exports;
}
const data=load('src/data/config.ts');const {makeGarment,makeMannequin}=load('src/viewer/garment.ts');
const codes=new Set();
assert.equal(data.families.length,11,'11 families remain after removing coach');
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
assert.equal(codes.size,308,'manufacturer palette should contain 308 non-coach codes');
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
assert.equal(parts.get('snaps').length,7);assert.equal(data.sizes.length,9);assert.deepEqual(data.measurements[2],[65.5,58,47,62]);for(const female of [false,true]){const mannequin=makeMannequin(female);for(const name of ['torso','neck','head','pelvis','leftArm','rightArm','leftHand','rightHand','leftLeg','rightLeg','leftFoot','rightFoot'])assert(mannequin.getObjectByName(name),'missing mannequin '+name);}
assert.deepEqual(JSON.parse(JSON.stringify(data.initialConfig)),data.initialConfig);
const configured={...data.initialConfig,body:{material:'special-himir',code:'SHM222'},sleeves:{material:'leather',code:'LD07'}};
const signatures=new Set();
for(const shoulder of ['regular','raglan'])for(const closure of ['snaps','zipper','placket'])for(const collar of ['varsity','high-neck']){
 const construction={shoulder,closure,collar},id=data.constructionKey(construction);
 const garment=makeGarment(construction),meshes=garment.group.children;
 for(const mesh of meshes)for(const key of ['position','normal'])for(const n of mesh.geometry.attributes[key].array)assert(Number.isFinite(n),id+' invalid '+key);
 const snaps=meshes.filter(m=>m.name==='snap'),teeth=meshes.filter(m=>m.name==='zipper-tooth'),flaps=meshes.filter(m=>m.name==='front-placket');
 assert.equal(snaps.length,closure==='zipper'?0:7,id+' snap count');
 assert.equal(teeth.length>0,closure!=='snaps',id+' zipper presence');
 assert.equal(flaps.length>0,closure!=='zipper',id+' outer placket');
 const collarTop=Math.max(...garment.parts.get('collar').flatMap(m=>Array.from(m.geometry.attributes.position.array).filter((_,i)=>i%3===1)));
 assert.equal(collarTop>1.3,collar==='high-neck',id+' raised collar');
 if(shoulder==='raglan'){
  const shoulders=garment.parts.get('leftSleeve')[0].geometry.attributes.position;
  assert(Array.from({length:shoulders.count},(_,i)=>Math.abs(shoulders.getX(i))<.4&&shoulders.getY(i)>.95).some(Boolean),'raglan sleeve reaches neck');
 }
 const switched=data.changeConstruction(configured,construction);
 assert.equal(data.regionChoice(switched,'body').code,'SHM222');
 assert.equal(data.regionChoice(switched,'sleeves').code,'LD07');
 assert.equal(switched.waistband.code,configured.waistband.code);
 signatures.add(JSON.stringify(meshes.map(m=>[m.name,m.geometry.attributes.position.count,Array.from(m.geometry.attributes.position.array)])));
}
assert.equal(signatures.size,12,'all twelve combinations must change geometry');
const collarConfig={...configured,construction:{shoulder:'regular',closure:'placket',collar:'high-neck'},fabricCollar:{material:'corduroy',code:'PL12'}};
assert.equal(data.regionChoice(collarConfig,'collar').code,'PL12');
assert.equal(data.regionChoice({...collarConfig,construction:{shoulder:'regular',closure:'snaps',collar:'varsity'}},'collar').code,'trim-navy');
const logo=fs.readFileSync(new URL('../src/components/VarsityStar.tsx',import.meta.url),'utf8');
const favicon=fs.readFileSync(new URL('../public/favicon.svg',import.meta.url),'utf8');
assert(favicon.includes(logo.match(/starPoints='([^']+)'/)[1]),'favicon and component star geometry must match');
for(const color of ['#113863','#ffffff','#cf4437'])assert(logo.includes(color)&&favicon.includes(color));
console.log('Verified twelve combined constructions, preserved selections, closure hardware, collar geometry and shared star identity.');
console.log(`Verified ${codes.size} source-textured swatches in 11 families, including distinct PL12 corduroy and TRH234 wool materials; ${parts.size} independent meshes/groups, 9 sizes, 2 mannequin forms, and serializable configuration.`);

const designs=load('src/data/designs.ts');
let slots=designs.emptySlots();
const now='2026-09-07T12:00:00.000Z';
const first=designs.cloneConfig(data.changeConstruction(configured,{shoulder:'raglan',collar:'high-neck',closure:'placket'}));
first.fabricCollar={material:'corduroy',code:'PL12'};first.size='XL';first.mannequin='female';
slots=designs.saveSlot(slots,1,first,now);
first.body.code='SHM223';
assert.equal(slots[0].config.body.code,'SHM222','saved data must not alias draft data');
slots=designs.saveSlot(slots,2,{...data.initialConfig,body:{material:'factory',code:'TRH234'}},now);
slots=designs.saveSlot(slots,3,data.initialConfig,now);
assert.equal(slots.length,3);
assert.throws(()=>designs.saveSlot(slots,4,data.initialConfig));
assert.throws(()=>designs.saveSlot(slots,0,data.initialConfig));
const raw=designs.encodeDesigns(slots);
assert.deepEqual(designs.decodeDesigns(raw).slots,slots,'refresh/reopen must recover entire configuration');
assert.equal(designs.decodeDesigns(raw).slots[0].config.fabricCollar.code,'PL12');
const edited=designs.cloneConfig(slots[1].config);edited.size='S';
const updated=designs.saveSlot(slots,2,edited,now);
assert.equal(updated.length,3);assert.equal(updated[1].config.size,'S');assert.deepEqual(updated[0],slots[0]);assert.deepEqual(updated[2],slots[2]);
const deleted=designs.deleteSlot(updated,2);assert.equal(deleted[1],null);assert.equal(deleted[2].id,3);
assert.deepEqual(designs.decodeDesigns(designs.encodeDesigns(deleted)).slots,deleted);
assert.equal(designs.decodeDesigns('{bad').slots.filter(Boolean).length,0);
assert(designs.decodeDesigns('{bad').warning);
assert.equal(designs.parseConfig({...data.initialConfig,body:{material:'coach',code:'CO01'}}),null);
assert.equal(designs.parseConfig({...data.initialConfig,construction:{shoulder:'coach',closure:'snaps',collar:'varsity'}}),null);
assert.equal(designs.parseConfig({...data.initialConfig,body:{material:'factory',code:'DOES_NOT_EXIST'}}),null);
assert.equal(designs.parseConfig({...data.initialConfig,body:{material:'himir',code:'HM09'}}),null);
const corrupt=JSON.parse(raw);corrupt.slots[1].config.size='BAD';const recovered=designs.decodeDesigns(JSON.stringify(corrupt));assert(recovered.warning);assert(recovered.slots[0]&&recovered.slots[2]);assert.equal(recovered.slots[1],null);
let pair=designs.toggleComparison([],1);pair=designs.toggleComparison(pair,2);assert.deepEqual(pair,[1,2]);assert.deepEqual(designs.toggleComparison(pair,3),[1,2]);assert.deepEqual(designs.toggleComparison(pair,1),[2]);
const {createCameraSync}=load('src/viewer/cameraSync.ts');
const sync=createCameraSync(),a={},b={};let aCalls=0,bCalls=0;
sync.subscribe(a,()=>aCalls++);const unsub=sync.subscribe(b,pose=>{bCalls++;assert.deepEqual(pose.position,[0,.3,7.1]);});
sync.publish(a,{position:[0,.3,7.1],target:[0,0,0]});assert.equal(aCalls,0);assert.equal(bCalls,1);unsub();sync.publish(a,{position:[0,.3,7.1],target:[0,0,0]});assert.equal(bCalls,1);
assert(!data.families.some(f=>f.id==='coach'));assert(![...codes].some(c=>c.startsWith('CO')));
console.log('Verified three-slot persistence, full configuration round trips, fixed-slot updates/deletes, malformed data recovery, two-design limit, and camera synchronization.');
const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const App=load('app/page.tsx').default;
const landing=renderToStaticMarkup(React.createElement(App));
assert(landing.includes('MY DESIGNS')&&landing.includes('COMPARE')&&landing.includes('CONSTRUCTION'));
assert(!landing.includes('Choose your style')&&!landing.includes('Change style'));
const Editor=load('src/components/MaterialEditor.tsx').default;
for(const closure of ['snaps','zipper','placket'])for(const collar of ['varsity','high-neck'])for(const {id} of data.regions){
 const config=data.changeConstruction(configured,{closure,collar});
 const html=renderToStaticMarkup(React.createElement(Editor,{config,region:id,onChoose:()=>{}}));
 assert(html.includes('Selected'),id+' editor must render with '+closure+'/'+collar);
 assert(!html.includes('Coach fabric'),'coach must not appear in material selector');
}
console.log('Verified server rendering of navigation and all region controls across closure/collar combinations.');

const THREE=await import('three');
const garmentModule=load('src/viewer/garment.ts'),{bodyPoint,sleevePoint,sleeveCurve,fitPresets}=garmentModule;
let maxTriangles=0,maxMeshes=0;
const fitBounds={};
for(const mode of ['none','male','female']){
 const fitGarment=makeGarment(data.initialConfig.construction,mode);
 fitBounds[mode]=new THREE.Box3().setFromObject(fitGarment.group);
 for(const shoulder of ['regular','raglan'])for(const closure of ['snaps','zipper','placket'])for(const collar of ['varsity','high-neck']){
  const design=makeGarment({shoulder,closure,collar},mode);
  let triangles=0;
  for(const mesh of design.group.children){
   triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
   for(const key of ['position','normal','uv'])for(const n of mesh.geometry.attributes[key].array)assert(Number.isFinite(n),mode+' '+key+' must remain finite');
  }
  maxTriangles=Math.max(maxTriangles,triangles);maxMeshes=Math.max(maxMeshes,design.group.children.length);
  assert(triangles<36000,'jacket triangle budget');
  assert(design.group.children.length<=22,'comparison draw-call budget');
  if(closure!=='snaps'){const teeth=design.group.getObjectByName('zipper-tooth');assert(teeth.userData.toothCount>50);assert.equal(design.parts.get('snaps').filter(m=>m.name==='zipper-tooth').length,1,'zipper teeth merged into one draw call');}
  assert.deepEqual(design.group.userData.construction,{shoulder,closure,collar});
  assert.equal(design.group.userData.fitMode,mode);
  if(shoulder==='raglan'){
   const key=(p,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');
   const torso=design.parts.get('body')[0].geometry.attributes.position,shoulderMesh=design.parts.get('leftSleeve')[0].geometry.attributes.position;
   const boundary=new Set(Array.from({length:torso.count},(_,i)=>key(torso,i)));
   assert(Array.from({length:shoulderMesh.count},(_,i)=>boundary.has(key(shoulderMesh,i))).filter(Boolean).length>20,'raglan/body seam stays joined in '+mode);
  }
  design.group.children.forEach(m=>{m.geometry.dispose();m.material.dispose();});
 }
}
assert(fitBounds.male.max.x>fitBounds.none.max.x&&fitBounds.none.max.x>fitBounds.female.max.x,'fit shoulder/sleeve width');
assert.notEqual(fitPresets.female.shoulderWidth,fitPresets.female.torsoLength,'female fit must not be uniform scaling');
assert.notEqual(fitPresets.male.sleeveVolume,fitPresets.male.torsoLength,'male fit must not be uniform scaling');
const curve=sleeveCurve(1),mid=curve.getPoint(.5),chord=curve.getPoint(0).lerp(curve.getPoint(1),.5);
assert(mid.distanceTo(chord)>.10,'sleeve must bend away from a straight tube');
assert(curve.getPoint(.5).z<curve.getPoint(1).z-.1,'forearm bends forward');
let waistFold=0,cuffFold=0,elbowFold=0,armpitFold=0;
for(let i=0;i<64;i++){const u=i/64;waistFold=Math.max(waistFold,bodyPoint(u,.11).distanceTo(bodyPoint(u,.11,false)));cuffFold=Math.max(cuffFold,sleevePoint(1,u,.10).distanceTo(sleevePoint(1,u,.10,false)));elbowFold=Math.max(elbowFold,sleevePoint(1,u,.42).distanceTo(sleevePoint(1,u,.42,false)));armpitFold=Math.max(armpitFold,bodyPoint(u,.65).distanceTo(bodyPoint(u,.65,false)));}
for(const [zone,d] of Object.entries({waistFold,cuffFold,elbowFold,armpitFold})){assert(d>.008,zone+' should be modeled');assert(d<.07,zone+' should remain subtle');}
const response=load('src/viewer/fabricResponse.ts');
assert(response.fabricResponse('wool').roughness>response.fabricResponse('leather').roughness);
assert(response.fabricResponse('premium').clearcoat>response.fabricResponse('leather').clearcoat);
assert(response.fabricResponse('corduroy').bumpScale>response.fabricResponse('wool').bumpScale);
assert.equal(response.fabricResponse('wool').clearcoat,0);
const roughness=response.microRoughness('wool');assert.equal(roughness.image.width,64);assert.equal(roughness.image.height,64);assert.equal(roughness.colorSpace,THREE.NoColorSpace);roughness.dispose();
console.log(`Verified 36 construction/fit combinations; max ${maxTriangles} triangles and ${maxMeshes} meshes per jacket; curved sleeves, bounded folds, complete mannequins and distinct fabric responses.`);
assert.equal(designs.designSignature({...data.initialConfig,mannequin:'male'}),designs.designSignature({...data.initialConfig,mannequin:'female'}),'fit mode alone is not an unsaved design change');

const embroideryData=load('src/data/embroidery.ts');
const {BodyProjector,projectedTextGeometry}=load('src/viewer/embroidery.ts');
const inscription={id:'front-test',text:'STUCO',side:'front',position:{x:.30,y:.20},rotation:8,scale:.10,font:'varsity',fillColor:'#ffffff',outlineColor:'#113863',embroideryDepth:.004};
const backText={...inscription,id:'back-test',side:'back',text:'Student Council',position:{x:0,y:.20},font:'cursive',scale:.24};
const textConfig={...data.initialConfig,embroidery:[inscription,backText]};
const savedText=designs.saveSlot(designs.emptySlots(),1,textConfig,now);
assert.deepEqual(designs.decodeDesigns(designs.encodeDesigns(savedText)).slots[0].config,textConfig,'all embroidery properties survive save/reload');
const longText={...inscription,text:'Student Council '.repeat(10000)};
assert(embroideryData.validEmbroidery(Array.from({length:100},(_,i)=>({...longText,id:String(i)}))),'no character or element cap');
assert.equal(designs.parseConfig({...textConfig,embroidery:[{...inscription,scale:NaN}]}),null);
assert.equal(designs.parseConfig({...textConfig,embroidery:[inscription,inscription]}),null,'reject duplicate IDs');
assert.equal(designs.parseConfig({...textConfig,embroidery:[{...inscription,font:'unknown'}]}),null);
assert(designs.parseConfig(data.initialConfig),'pre-embroidery saves remain valid');
assert.notEqual(designs.designSignature(textConfig),designs.designSignature({...textConfig,embroidery:[backText]}));
assert.equal(embroideryData.outsideArea(inscription,3),false);
assert.equal(embroideryData.outsideArea({...inscription,position:{x:0,y:.2}},3),true,'front fastening is excluded');
assert.equal(embroideryData.outsideArea({...backText,scale:1},8),true,'long text warns without truncation');
assert.deepEqual(embroideryData.clampPlacement(5,-5,'front'),{x:.53,y:-.72});
for(const mode of ['none','male','female'])for(const shoulder of ['regular','raglan'])for(const closure of ['snaps','zipper','placket'])for(const collar of ['varsity','high-neck']){
 const garment=makeGarment({shoulder,closure,collar},mode),body=garment.parts.get('body')[0],projector=new BodyProjector(body,garment.group.userData.fit);
 for(const text of [inscription,backText]){
  const {geometry,warning}=projectedTextGeometry(projector,text,3);
  assert.equal(warning,false,`${mode}/${shoulder}/${closure}/${collar}/${text.side} placement`);
  assert(geometry.index.count>0,'visible embroidered surface');
  assert(geometry.attributes.position.count<1000,'bounded lettering mesh');
  const p=geometry.attributes.position,sign=text.side==='front'?1:-1;
  let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<p.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(p,i);assert(Number.isFinite(v.length()));assert(v.z*sign>0,'correct side of body');
   minZ=Math.min(minZ,v.z);maxZ=Math.max(maxZ,v.z);
  }
  assert(maxZ-minZ>.001,'text carrier follows cloth curvature');
  // Check triangle interiors too, rather than just projected vertices.
  for(let i=0;i<geometry.index.count;i+=27){
   const v=new THREE.Vector3();for(let j=0;j<3;j++)v.add(new THREE.Vector3().fromBufferAttribute(p,geometry.index.getX(i+j)));v.divideScalar(3);
   const logical=projector.logical(v),surface=projector.sample(logical.x,logical.y,text.side,0);
   assert(surface&&sign*(v.z-surface.z)>-.0005,'no carrier clipping between samples');
   assert(sign*(v.z-surface.z)<.012,'no floating carrier');
  }
  geometry.dispose();
 }
 projector.dispose();garment.group.children.forEach(m=>{m.geometry.dispose();m.material.dispose();});
}
for(const font of ['graduate.ttf','cedarville-cursive.ttf'])assert(fs.statSync(new URL('../public/fonts/'+font,import.meta.url)).size>10000);
console.log('Verified embroidery save compatibility, unlimited text data, boundary warnings and curved front/back attachment across all 36 fit/construction combinations.');
