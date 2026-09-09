import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import source from './mannequin-source.json';

/** The supplied 3DS topology, posed to the same curves and fit as the jacket. */
export function sourceMannequin(
 female:boolean,
 fit:(p:THREE.Vector3,id:string)=>THREE.Vector3,
 sleeveCurve:(side:number)=>THREE.CatmullRomCurve3,
){
 const group=new THREE.Group();
 const material=new THREE.MeshStandardMaterial({color:'#c4c5c2',roughness:.82,metalness:0});
 const hairMaterial=new THREE.MeshStandardMaterial({color:'#646660',roughness:.9,metalness:0,flatShading:true});
 function original(id:number){
  const part=source.parts.find(p=>p.id===`${id}:1`)!;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setIndex(part.indices);g.computeBoundingBox();return g;
 }
 function deform(g:THREE.BufferGeometry,fn:(p:THREE.Vector3,box:THREE.Box3)=>THREE.Vector3){
  const box=g.boundingBox!.clone(),p=g.getAttribute('position');
  for(let i=0;i<p.count;i++){const v=fn(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),box);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 }
 function add(name:string,g:THREE.BufferGeometry,hair=false){
  const mesh=new THREE.Mesh(g,hair?hairMaterial:material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.source='man.3DS';group.add(mesh);return mesh;
 }
 // Retain each source part's facets and topology, adapting its bounding envelope.
 function part(id:number,name:string,center:number[],size:number[],region='body'){
  return add(name,deform(original(id),(p,b)=>{
   const s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
   p.sub(c).divide(s).multiply(new THREE.Vector3(...size)).add(new THREE.Vector3(...center));
   // Round the source torso's box corners inside the slim garment envelope.
   if(name==='torso'){
    p.z*=1-.22*Math.pow(Math.abs(p.x)/(.5*size[0]),4);
    if(p.y>.45)p.x*=1-.04*THREE.MathUtils.clamp((p.y-.45)/.45,0,1);
   }
   return region==='body'?fit(p,region):p;
  }));
 }
 part(9,'torso',[0,-.06,0],[1.12,1.95,.42]);
 part(3,'pelvis',[0,-1.28,0],[female?.86:.82,.44,.39]);
 // Female height is modestly shorter below the hip, keeping shoes on the stage.
 const floor=-3.035,legTop=female?-1.40:-1.30,footHeight=.22;
 for(const side of [-1,1]){
  const name=side===1?'left':'right',curve=sleeveCurve(side),upper=side===1?11:10,lower=side===1?13:12;
  const sections=[[upper,.11,.53,.12],[lower,.53,1,.10]];
  const armParts=sections.map(([id,start,end,radius])=>deform(original(id),(p,b)=>{
   const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());
   const t=THREE.MathUtils.lerp(start,end,1-(p.y-b.min.y)/s.y),center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   const x=new THREE.Vector3(0,0,1).cross(tangent).normalize(),z=new THREE.Vector3().crossVectors(tangent,x).normalize();
   return fit(center.addScaledVector(x,(p.x-c.x)/s.x*radius*2).addScaledVector(z,(p.z-c.z)/s.z*radius*2),name+'Sleeve');
  }));
  add(name+'Arm',mergeGeometries(armParts)!);armParts.forEach(g=>g.dispose());
  const end=curve.getPoint(1),tangent=curve.getTangent(1).normalize();
  const hand=fit(end.clone().addScaledVector(tangent,.32),name+'Sleeve');
  part(lower,name+'Hand',hand.toArray(),[female?.155:.175,.29,.135],'placed');
  const thumb=new THREE.SphereGeometry(1,8,6);thumb.scale(.033,.066,.036);thumb.translate(hand.x-side*.079,hand.y+.06,hand.z+.01);add(name+'Thumb',thumb);
  const legBottom=floor+footHeight;
  part(side===1?1:2,name+'Leg',[side*(female?.235:.255),(legTop+legBottom)/2,0],[female?.33:.36,legTop-legBottom,.36],'placed');
  part(side===1?8:7,name+'Foot',[side*(female?.235:.255),floor+footHeight/2,.09],[female?.245:.27,footHeight,.47],'placed');
 }
 const headScale=female?.94:1,headOffset=female?-.025:0;
 // Head and short hair share a transform so the source facial silhouette survives.
 const headTransform=(p:THREE.Vector3)=>new THREE.Vector3(p.x*2.65*headScale,1.28+(p.y-1.63)*2.65*headScale+headOffset,p.z*2.05-.09);
 add('head',deform(original(5),p=>headTransform(p)));
 add('hair',deform(original(4),p=>headTransform(p)),true);
 part(6,'neck',[0,1.11+headOffset,0],[.265,.45,.25],'placed');
 if(female){
  // Open-front, low-poly longer hair follows the back of the head and neck.
  const positions:number[]=[],indices:number[]=[],segments=10;
  for(let row=0;row<3;row++)for(let i=0;i<=segments;i++){
   const a=.18+Math.PI*i/segments,r=[.205,.255,.30][row];
   positions.push(Math.cos(a)*r,[1.67,1.36,1.06][row]+.025*Math.cos(a*2),-.08-Math.sin(a)*[.23,.25,.28][row]);
  }
  for(let j=0;j<2;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const hair=new THREE.BufferGeometry();hair.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hair.setIndex(indices);hair.computeVertexNormals();
  hairMaterial.side=THREE.DoubleSide;add('long-hair',hair,true);
 }
 group.userData.fitMode=female?'female':'male';group.userData.source='man.3DS';
 return group;
}
