import * as THREE from 'three';
// Closed elliptical cross sections give every garment part volume.
export function loft(rings:number[][], segments=80){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 rings.forEach(([y,rx,rz,cx=0,cz=0],r)=>{for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;const wrinkle=1+0.009*Math.sin(a*13+r*1.6);positions.push(cx+rx*Math.cos(a)*wrinkle,y,cz+rz*Math.sin(a)*wrinkle);uv.push(j/segments,r/(rings.length-1));}});
 for(let r=0;r<rings.length-1;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function makeGarment(){
 const group=new THREE.Group(), parts=new Map<string,THREE.Mesh[]>();
 function add(id:string,g:THREE.BufferGeometry,pos=[0,0,0]){const mesh=new THREE.Mesh(g);mesh.position.set(...pos as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.region=id;group.add(mesh);parts.set(id,[...(parts.get(id)||[]),mesh]);return mesh;}
 add('body',loft([[-1,.69,.31],[-.94,.75,.34],[-.78,.79,.35],[-.55,.81,.37],[-.25,.84,.39],[.05,.87,.40],[.35,.88,.4],[.63,.9,.36],[.82,.82,.32],[.99,.53,.27],[1.05,.31,.23]]));
 for(const side of [-1,1]){
 const suffix=side===1?'left':'right';
 const sleeve=add(suffix+'Sleeve',loft([[-1.02,.155,.18,side*1.19],[-.93,.18,.21,side*1.22],[-.8,.205,.23,side*1.24],[-.55,.22,.235,side*1.23],[-.3,.24,.25,side*1.18],[-.08,.25,.26,side*1.12],[.2,.255,.27,side*1.04],[.45,.26,.28,side*.95],[.65,.245,.26,side*.88],[.76,.17,.20,side*.84],[.8,.03,.04,side*.8]]));
 sleeve.userData.region='sleeves';
 const cuff=add(suffix+'Cuff',loft([[-1.18,.158,.18,side*1.19],[-1.16,.164,.184,side*1.19],[-.98,.165,.185,side*1.19],[-.96,.158,.18,side*1.19]]));cuff.userData.region='cuffs';
 const pocket=add(suffix+'PocketTrim',new THREE.CapsuleGeometry(.027,.35,6,12),[side*.56,-.48,.35]);pocket.rotation.z=-side*.40;pocket.userData.region='pocketTrim';
 }
 add('waistband',loft([[-1.18,.70,.32],[-1.16,.73,.335],[-.99,.73,.335],[-.96,.70,.32]]));
 const collar=add('collar',loft([[.98,.32,.235],[1.04,.345,.25],[1.18,.33,.24],[1.20,.31,.23],[1.18,.285,.21],[1.02,.28,.21]]));
 const p=collar.geometry.attributes.position;for(let i=0;i<p.count;i++){const z=p.getZ(i);p.setY(i,p.getY(i)-Math.max(0,z)*.7);}collar.geometry.computeVertexNormals();
 const placket=add('body',new THREE.BoxGeometry(.074,1.94,.04),[0,-.015,.38]);
 for(let i=0;i<7;i++){const y=.77-i*.285;const z=y<-.85?.34:y>.55?.32:.415;const snap=add('snaps',new THREE.CylinderGeometry(.034,.034,.021,24),[.005,y,z]);snap.rotation.x=Math.PI/2;}
 // Subtle stitching follows front placket rather than floating over the garment.
 const seamMat=new THREE.MeshStandardMaterial({color:'#777777',roughness:1});
 const seam=new THREE.Mesh(new THREE.BoxGeometry(.004,1.6,.003),seamMat);seam.position.set(-.047,-.02,.407);group.add(seam);
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
