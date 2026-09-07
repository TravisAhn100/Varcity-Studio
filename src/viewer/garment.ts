import * as THREE from 'three';
import type {Construction} from '../data/config';
// Closed elliptical cross sections give every garment part volume.
export function loft(rings:number[][], segments=80){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 rings.forEach(([y,rx,rz,cx=0,cz=0],r)=>{for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;const wrinkle=1+0.009*Math.sin(a*13+r*1.6);positions.push(cx+rx*Math.cos(a)*wrinkle,y,cz+rz*Math.sin(a)*wrinkle);uv.push(j/segments,r/(rings.length-1));}});
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function makeGarment(construction:Construction={shoulder:'regular',closure:'snaps',collar:'varsity'}){
 const raglan=construction.shoulder==='raglan',high=construction.collar==='high-neck',zip=construction.closure!=='snaps',covered=construction.closure==='placket';
 const group=new THREE.Group(), parts=new Map<string,THREE.Mesh[]>();
 function add(id:string,g:THREE.BufferGeometry,pos=[0,0,0]){const mesh=new THREE.Mesh(g);mesh.position.set(...pos as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.region=id;group.add(mesh);parts.set(id,[...(parts.get(id)||[]),mesh]);return mesh;}
 const bodyGeometry=loft([[-1,.69,.31],[-.94,.75,.34],[-.78,.79,.35],[-.55,.81,.37],[-.25,.84,.39],[.05,.87,.40],[.35,.88,.4],[.63,.9,.36],[.82,.82,.32],[.99,.53,.27],[1.05,.31,.23]]);
 if(raglan){
  // Cut the shoulder surface along a diagonal from neck to underarm.
  // Clip triangles at the boundary so the material seam is continuous.
  const g=bodyGeometry.toNonIndexed(),pos=g.getAttribute('position'),uv=g.getAttribute('uv');
  type Vertex={p:THREE.Vector3;u:THREE.Vector2};
  const distance=(v:Vertex)=>Math.abs(v.p.x)-(.31+(1.05-v.p.y)*.83);
  for(const shoulder of [false,true]){
   const positions:number[]=[],tex:number[]=[];
   for(let i=0;i<pos.count;i+=3){
    const polygon:Vertex[]=Array.from({length:3},(_,j)=>({p:new THREE.Vector3(pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)),u:new THREE.Vector2(uv.getX(i+j),uv.getY(i+j))}));
    const clipped:Vertex[]=[];
    polygon.forEach((a,j)=>{const b=polygon[(j+1)%3],da=distance(a),db=distance(b),inside=shoulder?da>=0:da<=0,next=shoulder?db>=0:db<=0;if(inside)clipped.push(a);if(inside!==next){const t=da/(da-db);clipped.push({p:a.p.clone().lerp(b.p,t),u:a.u.clone().lerp(b.u,t)});}});
    for(let j=1;j<clipped.length-1;j++)for(const v of [clipped[0],clipped[j],clipped[j+1]]){positions.push(...v.p.toArray());tex.push(...v.u.toArray());}
   }
   const cut=new THREE.BufferGeometry();cut.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));cut.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));cut.computeVertexNormals();const m=add(shoulder?'leftSleeve':'body',cut);if(shoulder)m.userData.region='sleeves';
  }
  g.dispose();bodyGeometry.dispose();
 }else add('body',bodyGeometry);
 for(const side of [-1,1]){
 const suffix=side===1?'left':'right';
 const sleeve=add(suffix+'Sleeve',loft([[-1.02,.155,.18,side*1.19],[-.93,.18,.21,side*1.22],[-.8,.205,.23,side*1.24],[-.55,.22,.235,side*1.23],[-.3,.24,.25,side*1.18],[-.08,.25,.26,side*1.12],[.2,.255,.27,side*1.04],[.45,.26,.28,side*.95],[.65,.245,.26,side*.88],[.76,.17,.20,side*.84],[.8,.03,.04,side*.8]]));
 sleeve.userData.region='sleeves';
 const cuff=add(suffix+'Cuff',loft([[-1.18,.158,.18,side*1.19],[-1.16,.164,.184,side*1.19],[-.98,.165,.185,side*1.19],[-.96,.158,.18,side*1.19]]));cuff.userData.region='cuffs';
 const pocket=add(suffix+'PocketTrim',new THREE.CapsuleGeometry(.027,.35,6,12),[side*.56,-.48,.35]);pocket.rotation.z=-side*.40;pocket.userData.region='pocketTrim';
 }
 add('waistband',loft([[-1.18,.70,.32],[-1.16,.73,.335],[-.99,.73,.335],[-.96,.70,.32]]));
 const collar=add('collar',loft(high?[[.98,.32,.235],[1.06,.35,.25],[1.38,.32,.24],[1.40,.30,.23],[1.38,.275,.21],[1.02,.28,.21]]:[[.98,.32,.235],[1.04,.345,.25],[1.18,.33,.24],[1.20,.31,.23],[1.18,.285,.21],[1.02,.28,.21]]));
 const p=collar.geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);p.setY(i,p.getY(i)-Math.max(0,z)*.7);}collar.geometry.computeVertexNormals();
 const top=high?1.23:.83,bottom=-1.12;
 const frontZ=(y:number)=>y>.8?.26:y>.55?.34:y<-.85?.34:.415;
 if(!zip||covered){
  // A contoured outer flap follows the body's depth; zipper remains at its edge.
  const ys=[bottom,-.85,.55,.8,top].filter((y,i,a)=>i===0||y>a[i-1]);
  const width=covered?.115:.074,cx=covered?.035:0;
  for(let i=1;i<ys.length;i++){const a=ys[i-1],b=ys[i],z1=frontZ(a),z2=frontZ(b),m=add('body',new THREE.BoxGeometry(width,Math.hypot(b-a,z2-z1),.025),[cx,(a+b)/2,(z1+z2)/2]);m.rotation.x=Math.atan2(z2-z1,b-a);m.name='front-placket';}
  for(let i=0;i<7;i++){const y=top-.06-i*(top-bottom-.12)/6;const snap=add('snaps',new THREE.CylinderGeometry(.034,.034,.021,24),[covered?.049:.005,y,frontZ(y)+.025]);snap.rotation.x=Math.PI/2;snap.name='snap';}
 }
 if(zip){
  const x=covered?-.04:0;
  for(let y=bottom+.03;y<top;y+=.032){const tooth=add('snaps',new THREE.BoxGeometry(.019,.014,.015),[x+(Math.round((y-bottom)/.032)%2?-.009:.009),y,frontZ(y)+.018]);tooth.name='zipper-tooth';}
  const slider=add('snaps',new THREE.BoxGeometry(.046,.064,.023),[x,top-.05,frontZ(top-.05)+.03]);slider.name='zipper-pull';
 }
 group.userData.construction={...construction};
 return {group,parts};
}
export function makeMannequin(female:boolean){
 const group=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:female?'#c3bbb3':'#b2b6b7',roughness:.92});
 const add=(g:THREE.BufferGeometry,p:number[],s=[1,1,1])=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(...p as [number,number,number]);mesh.scale.set(...s as [number,number,number]);mesh.castShadow=true;group.add(mesh);};
 add(new THREE.CylinderGeometry(.15,.18,.36,24),[0,1.23,0]);add(new THREE.SphereGeometry(1,40,32),[0,1.65,0],[female?.245:.27,.35,.24]);
 add(new THREE.SphereGeometry(1,32,24),[0,-1.33,0],[female?.58:.56,.42,.27]);
 for(const side of [-1,1]){add(new THREE.CapsuleGeometry(.205,1.3,10,24),[side*.30,-2.10,0],[1,1,.95]);add(new THREE.SphereGeometry(1,24,16),[side*1.19,-1.35,0],[.12,.24,.13]);}
 return group;
}
