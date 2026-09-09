import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Construction} from '../data/config';
import {sourceMannequin} from './mannequin';

export type FitMode='none'|'male'|'female';
export type FitParameters={shoulderWidth:number;chestWidth:number;waistWidth:number;torsoLength:number;sleeveLength:number;sleeveVolume:number};
export const fitPresets:Record<FitMode,FitParameters>={
 none:{shoulderWidth:1,chestWidth:1,waistWidth:1,torsoLength:1,sleeveLength:1,sleeveVolume:1},
 male:{shoulderWidth:1.065,chestWidth:1.045,waistWidth:1.035,torsoLength:1.025,sleeveLength:1.035,sleeveVolume:1.04},
 female:{shoulderWidth:.935,chestWidth:.945,waistWidth:.92,torsoLength:.955,sleeveLength:.965,sleeveVolume:.94}
};
const tau=Math.PI*2,clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const bell=(x:number,center:number,width:number)=>Math.exp(-(((x-center)/width)**2));
const signedPower=(x:number,p:number)=>Math.sign(x)*Math.abs(x)**p;

/** A smooth grid with stable UVs and welded seam normals. */
function surface(sample:(u:number,v:number)=>THREE.Vector3,around=64,rows=40,closed=true){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=around;i++){positions.push(...sample(i/around,j/rows).toArray());uv.push(i/around,j/rows);}
 for(let j=0;j<rows;j++)for(let i=0;i<around;i++){const a=j*(around+1)+i,b=a+around+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 if(closed){const n=g.getAttribute('normal');for(let j=0;j<=rows;j++){const a=j*(around+1),b=a+around,v=new THREE.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}}
 return g;
}
function profile(knots:number[][],t:number){
 let k=0;while(k<knots.length-2&&t>knots[k+1][0])k++;
 const a=knots[k],b=knots[k+1],v=clamp((t-a[0])/(b[0]-a[0]),0,1),smooth=v*v*(3-2*v);
 return a.slice(1).map((x,i)=>lerp(x,b[i+1],smooth));
}
export function loft(rings:number[][],segments=48){
 return surface((u,v)=>{const row=v*(rings.length-1),i=Math.min(Math.floor(row),rings.length-2),f=row-i,a=rings[i],b=rings[i+1],r=Array.from({length:5},(_,j)=>lerp(a[j]??0,b[j]??0,f));return new THREE.Vector3(r[3]+r[1]*Math.cos(u*tau),r[0],r[4]+r[2]*Math.sin(u*tau));},segments,Math.max(12,rings.length*3));
}
const bodyKnots=[[0,.625,.27],[.07,.65,.285],[.20,.68,.295],[.42,.685,.30],[.65,.68,.30],[.80,.665,.285],[.89,.595,.255],[.96,.43,.225],[1,.30,.215]];
export function bodyPoint(u:number,v:number,folds=true){
 const a=u*tau,[rx,rz]=profile(bodyKnots,v),s=Math.sin(a),c=Math.cos(a);
 // A softly boxy hem gives the lower torso clearance without inflating its width.
 let x=rx*signedPower(c,.88),y=lerp(-1,1.075,v),z=rz*signedPower(s,lerp(.42,.72,clamp(v/.25,0,1)));
 // Long hanging folds taper into the hem; diagonals compress only near the armholes.
 if(folds){
  const waist=.014*bell(v,.10,.075)*Math.sin(12*a+v*23);
  const underarm=.012*bell(v,.65,.12)*Math.abs(c)**4*Math.sin(v*54+Math.abs(c)*14);
  const drape=.009*Math.sin(a*7+v*4)*Math.sin(Math.PI*v);
  const opening=.012*bell(Math.abs(c),.13,.10)*bell(v,.36,.23)*Math.sin(v*24+a);
  const shoulder=.005*bell(v,.85,.075)*Math.abs(c)**3*Math.sin(a*9+v*26);
  const f=waist+underarm+drape+opening+shoulder;
  x+=c*f;z+=s*f;
  y-=.055*bell(v,.87,.12)*Math.abs(c)**2;
  y+=.008*Math.sin(3*a+.5)*Math.sin(Math.PI*v);
 }
 // Dip the front neckline to the base of the neck, retaining a higher back neck.
 y-=.32*Math.pow(v,8)*Math.max(0,s);
 // Keep the center opening calm so hardware follows the front accurately.
 return new THREE.Vector3(x,y,z);
}
const sleeveCurves=new Map<number,THREE.CatmullRomCurve3>();
export function sleeveCurve(side:number){
 const cached=sleeveCurves.get(side);if(cached)return cached;
 const curve=new THREE.CatmullRomCurve3([
  new THREE.Vector3(side*.52,.82,0),
  new THREE.Vector3(side*.73,.51,-.015),
  new THREE.Vector3(side*.86,.02,-.06),
  new THREE.Vector3(side*.89,-.48,.06),
  new THREE.Vector3(side*.88,-1.005,.165)
 ],false,'catmullrom',.35);sleeveCurves.set(side,curve);return curve;
}
function sleeveFrame(curve:THREE.CatmullRomCurve3,t:number){
 const tangent=curve.getTangent(clamp(t,0,1)).normalize(),x=new THREE.Vector3(0,0,1).cross(tangent).normalize(),z=new THREE.Vector3().crossVectors(tangent,x).normalize();
 return {tangent,x,z};
}
export function sleevePoint(side:number,u:number,v:number,folds=true){
 const curve=sleeveCurve(side),t=1-v,center=curve.getPoint(t),{x,z}=sleeveFrame(curve,t),a=u*tau;
 const [radius]=profile([[0,.05],[.12,.19],[.32,.19],[.55,.185],[.75,.171],[.87,.166],[.96,.152],[1,.148]],t);
 const phase=side===1?.45:-.2;
 const cuff=.011*bell(t,.90,.070)*Math.sin(t*94+Math.cos(a)*2.5+phase);
 const elbow=.011*bell(t,.58,.12)*Math.sin(t*60+a*1.4+phase)*(.45+.55*Math.max(0,-Math.sin(a)));
 const armpit=.007*bell(t,.22,.10)*Math.sin(t*65+a*2);
 const r=radius+(folds?cuff+elbow+armpit:0);
 return center.addScaledVector(x,r*Math.cos(a)).addScaledVector(z,r*1.08*Math.sin(a));
}
function fitPoint(p:THREE.Vector3,id:string,fit:FitParameters){
 if(/Sleeve|Cuff/.test(id)){
  const t=clamp((.80-p.y)/1.805,0,1),side=Math.sign(p.x)||1,center=sleeveCurve(side).getPoint(t);
  p.x=center.x*lerp(fit.shoulderWidth,fit.chestWidth,t)+(p.x-center.x)*fit.sleeveVolume;
  p.z=center.z+(p.z-center.z)*fit.sleeveVolume;
  p.y=.80+(.80*(fit.torsoLength-1))+(p.y-.80)*fit.sleeveLength;
 }else{
  const width=p.y>.45?lerp(fit.chestWidth,fit.shoulderWidth,clamp((p.y-.45)/.45,0,1)):lerp(fit.waistWidth,fit.chestWidth,clamp((p.y+1)/1.45,0,1));
  p.x*=id==='collar'?lerp(1,fit.shoulderWidth,.3):width;p.z*=lerp(1,fit.chestWidth,.6);p.y=1.075+(p.y-1.075)*fit.torsoLength;
 }
 return p;
}
// Partition at the seam while interpolating original normals: no faceted raglan patch.
function cutShoulders(g:THREE.BufferGeometry){
 const source=g.toNonIndexed(),p=source.getAttribute('position'),uv=source.getAttribute('uv'),n=source.getAttribute('normal');
 type Vertex={p:THREE.Vector3;n:THREE.Vector3;uv:THREE.Vector2};
 const outputs:THREE.BufferGeometry[]=[];
 for(const side of [0,1,-1]){
  const pos:number[]=[],norm:number[]=[],tex:number[]=[];
  const distance=(v:Vertex)=>side===0?.31+(1.075-v.p.y)*.79-Math.abs(v.p.x):side*v.p.x-(.31+(1.075-v.p.y)*.79);
  for(let i=0;i<p.count;i+=3){
   const poly:Vertex[]=Array.from({length:3},(_,j)=>({p:new THREE.Vector3(p.getX(i+j),p.getY(i+j),p.getZ(i+j)),n:new THREE.Vector3(n.getX(i+j),n.getY(i+j),n.getZ(i+j)),uv:new THREE.Vector2(uv.getX(i+j),uv.getY(i+j))}));
   const clip:Vertex[]=[];
   poly.forEach((a,j)=>{const b=poly[(j+1)%3],da=distance(a),db=distance(b);if(da>=0)clip.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);clip.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});}});
   for(let j=1;j<clip.length-1;j++)for(const v of [clip[0],clip[j],clip[j+1]]){pos.push(...v.p.toArray());norm.push(...v.n.toArray());tex.push(...v.uv.toArray());}
  }
  const part=new THREE.BufferGeometry();part.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));part.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));part.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));outputs.push(part);
 }
 source.dispose();return outputs;
}
export function makeGarment(construction:Construction={shoulder:'regular',closure:'snaps',collar:'varsity'},mode:FitMode='none',overrides:Partial<FitParameters>={}){
 const fit={...fitPresets[mode],...overrides},raglan=construction.shoulder==='raglan',high=construction.collar==='high-neck',zip=construction.closure!=='snaps',covered=construction.closure==='placket';
 const group=new THREE.Group(),parts=new Map<string,THREE.Mesh[]>();
 function add(id:string,g:THREE.BufferGeometry,name=id){
  if(id==='waistband'||id.includes('Cuff')){const index=g.getIndex();if(index)for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}const n=g.getAttribute('normal');for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),-n.getY(i),-n.getZ(i));}
  const mesh=new THREE.Mesh(g);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.region=/Sleeve/.test(id)?'sleeves':/Cuff/.test(id)?'cuffs':/PocketTrim/.test(id)?'pocketTrim':id;group.add(mesh);parts.set(id,[...(parts.get(id)||[]),mesh]);return mesh;
 }
 const body=surface(bodyPoint,80,52);
 if(raglan){const [torso,left,right]=cutShoulders(body);add('body',torso);add('leftSleeve',left,'raglan-shoulder');add('rightSleeve',right,'raglan-shoulder');body.dispose();}else add('body',body);
 for(const side of [-1,1]){
  const suffix=side===1?'left':'right',curve=sleeveCurve(side);
  add(suffix+'Sleeve',surface((u,v)=>sleevePoint(side,u,v),48,48),'curved-sleeve');
  const end=curve.getPoint(1),frame=sleeveFrame(curve,1);
  // Rounded outer/inner cuff cross section with actual 0.025-unit thickness.
  const cuff=surface((u,v)=>{
   const [along,r]=profile([[0,0,.15],[.12,.015,.16],[.40,.165,.16],[.50,.18,.148],[.62,.165,.135],[.90,.015,.135],[1,0,.15]],v);
   return end.clone().addScaledVector(frame.tangent,along).addScaledVector(frame.x,r*Math.cos(u*tau)).addScaledVector(frame.z,r*1.08*Math.sin(u*tau));
  },64,24);
  // Sample one existing contrast stripe: selected base / cream / selected base.
  // Use physical cuff length on both faces; no texture or material is changed.
  const cuffUV=cuff.getAttribute('uv');
  for(let i=0;i<cuffUV.count;i++){
   const v=cuffUV.getY(i),[along]=profile([[0,0],[.12,.015],[.40,.165],[.50,.18],[.62,.165],[.90,.015],[1,0]],v);
   cuffUV.setY(i,1-(40+48*along/.18)/128);
  }
  add(suffix+'Cuff',cuff);
  // A narrow welt embedded along a relaxed diagonal pocket opening.
  const points=Array.from({length:16},(_,i)=>{const t=i/15,x=side*lerp(.44,.565,t),y=lerp(-.32,-.67,t);return new THREE.Vector3(x,y,frontDepth(x,y)+.012);});
  add(suffix+'PocketTrim',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.025,8,false));
 }
 const waistband=surface((u,v)=>{
  const [y,rx,rz]=profile([[0,-.985,.627,.275],[.13,-1.01,.639,.29],[.4,-1.16,.634,.285],[.5,-1.185,.619,.27],[.64,-1.16,.604,.257],[.87,-1.01,.609,.26],[1,-.985,.627,.275]],v);
  return new THREE.Vector3(rx*Math.cos(u*tau),y+.006*Math.sin(u*tau*3),rz*signedPower(Math.sin(u*tau),.8));
 },96,24);
 const waistbandUV=waistband.getAttribute('uv');
 for(let i=0;i<waistbandUV.count;i++){
  const v=waistbandUV.getY(i),[y]=profile([[0,-.985],[.13,-1.01],[.4,-1.16],[.5,-1.185],[.64,-1.16],[.87,-1.01],[1,-.985]],v);
  waistbandUV.setY(i,1-(40+48*(-.985-y)/.20)/128);
 }
 add('waistband',waistband);
 add('collar',surface((u,v)=>{
  const gap=high?.16:.43,a=Math.PI/2+gap+u*(tau-2*gap),base=1.01-.27*Math.max(0,Math.sin(a)),height=high?.38:.115;
  const [y,r]=profile([[0,0,1],[.13,.018,1.075],[.4,height-.018,1.04],[.5,height,.99],[.62,height-.016,.92],[.9,.015,.93],[1,0,1]],v);
  return new THREE.Vector3(.305*r*Math.cos(a),base+y,.218*r*Math.sin(a));
 },72,16,false));
 const bottom=-1.145,top=high?1.08:.735;
 if(!zip||covered){
  const width=covered?.105:.068,cx=covered?.035:0;
  const flap=surface((u,v)=>{const y=lerp(bottom,top,v),x=cx+(u-.5)*width;return new THREE.Vector3(x,y,frontDepth(x,y)+.015+Math.sin(u*Math.PI)*.006);},6,64,false);
  add('body',flap,'front-placket');
  for(let i=0;i<7;i++){const y=top-.035-i*(top-bottom-.09)/6,x=covered?.052:.005,g=new THREE.CylinderGeometry(.028,.029,.014,16);g.rotateX(Math.PI/2);g.translate(x,y,frontDepth(x,y)+.032);add('snaps',g,'snap');}
 }
 // Dark narrow opening sits between the panels; it is owned by the garment, not a swatch.
 const opening=surface((u,v)=>{const y=lerp(bottom,top,v),x=(u-.5)*.019-(covered?.035:0);return new THREE.Vector3(x,y,frontDepth(x,y)+.014);},2,48,false);
 const inner=new THREE.Mesh(opening,new THREE.MeshStandardMaterial({color:'#15171a',roughness:1,side:THREE.DoubleSide}));inner.name='front-opening';inner.userData.ownedMaterial=true;group.add(inner);
 if(zip){
  const geometries:THREE.BufferGeometry[]=[],x=covered?-.038:0;
  for(let y=bottom+.025;y<top-.055;y+=.026){const g=new THREE.BoxGeometry(.014,.011,.010);g.translate(x+(geometries.length%2?-.008:.008),y,frontDepth(x,y)+.025);geometries.push(g);}
  const teeth=add('snaps',mergeGeometries(geometries)!,'zipper-tooth');teeth.userData.toothCount=geometries.length;geometries.forEach(g=>g.dispose());
  const pull=new THREE.TorusGeometry(.021,.005,6,12);pull.scale(.7,1.45,1);pull.translate(x,top-.065,frontDepth(x,top-.065)+.048);add('snaps',pull,'zipper-pull');
 }
 group.traverse(obj=>{if(!(obj instanceof THREE.Mesh))return;const p=obj.geometry.getAttribute('position'),n=obj.geometry.getAttribute('normal'),id=[...parts].find(([,ms])=>ms.includes(obj))?.[0]??'body',fitId=obj.name==='raglan-shoulder'?'body':id;for(let i=0;i<p.count;i++){const v=fitPoint(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),fitId,fit);p.setXYZ(i,v.x,v.y,v.z);const sleeve=/Sleeve|Cuff/.test(fitId),normal=new THREE.Vector3(n.getX(i)/(sleeve?fit.sleeveVolume:fit.chestWidth),n.getY(i)/(sleeve?fit.sleeveLength:fit.torsoLength),n.getZ(i)/(sleeve?fit.sleeveVolume:lerp(1,fit.chestWidth,.6))).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);}obj.geometry.computeBoundingSphere();});
 group.userData.construction={...construction};group.userData.fit={...fit};group.userData.fitMode=mode;
 return {group,parts};
}
function frontDepth(x:number,y:number){
 if(y>1.075)return .22;
 if(y< -1)return .287;
 let v=clamp((y+1)/2.075,0,1),p=new THREE.Vector3();
 for(let i=0;i<7;i++){const [rx]=profile(bodyKnots,v),c=signedPower(clamp(x/rx,-.999,.999),1/.88);p=bodyPoint(Math.acos(c)/tau,v);v=clamp(v+(y-p.y)/2.075,0,1);}
 return p.z;
}
export function makeMannequin(female:boolean){
 const fit=fitPresets[female?'female':'male'];
 return sourceMannequin(female,(p,id)=>fitPoint(p,id,fit),sleeveCurve);
}
