import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import type {ImageAnchor,ImageEmbroidery} from '../data/imageEmbroidery';
type Fabric={mesh:THREE.Mesh;surface:ImageAnchor['surface']};
export function imageSurfaces(parts:Map<string,THREE.Mesh[]>):Fabric[]{
 const result:Fabric[]=[];
 for(const [id,meshes] of Array.from(parts))for(const mesh of meshes){
  if(id==='body'&&mesh.name==='body'||mesh.name==='raglan-shoulder')result.push({mesh,surface:'body'});
  else if((id==='leftSleeve'||id==='rightSleeve')&&mesh.name==='curved-sleeve')result.push({mesh,surface:id});
 }
 return result;
}
export function anchorFromHit(hit:THREE.Intersection,surfaces:Fabric[]):ImageAnchor|null{
 const fabric=surfaces.find(f=>f.mesh===hit.object);return fabric&&hit.uv?{surface:fabric.surface,uv:[hit.uv.x,hit.uv.y]}:null;
}
// UV barycentrics survive fitting and the regular/raglan shoulder partition.
export function resolveImageAnchor(anchor:ImageAnchor,surfaces:Fabric[]){
 const q=new THREE.Vector2(...anchor.uv);
 for(const f of surfaces){if(f.surface!==anchor.surface)continue;
  const g=f.mesh.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,index=g.index;
  for(let i=0;i<(index?.count??p.count);i+=3){
   const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),a=new THREE.Vector2(uv.getX(ids[0]),uv.getY(ids[0])),b=new THREE.Vector2(uv.getX(ids[1]),uv.getY(ids[1])),c=new THREE.Vector2(uv.getX(ids[2]),uv.getY(ids[2]));
   const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-12)continue;
   const u=((b.y-c.y)*(q.x-c.x)+(c.x-b.x)*(q.y-c.y))/den,v=((c.y-a.y)*(q.x-c.x)+(a.x-c.x)*(q.y-c.y))/den,w=1-u-v;
   if(Math.min(u,v,w)<-1e-5)continue;
   const point=new THREE.Vector3(),normal=new THREE.Vector3();
   [u,v,w].forEach((weight,j)=>{point.addScaledVector(new THREE.Vector3().fromBufferAttribute(p,ids[j]),weight);normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(n,ids[j]),weight);});
   return {point,normal:normal.normalize(),mesh:f.mesh};
  }
 }
 return null;
}
export function imageDecal(item:ImageEmbroidery,surfaces:Fabric[]){
 const anchor=item.anchor&&resolveImageAnchor(item.anchor,surfaces);if(!anchor)return {geometry:new THREE.BufferGeometry(),warning:!!item.anchor};
 const z=anchor.normal,y=new THREE.Vector3(0,1,0).addScaledVector(z,-z.y).normalize();
 if(y.lengthSq()<.01)y.set(0,0,-1).addScaledVector(z,z.z).normalize();
 const x=new THREE.Vector3().crossVectors(y,z).normalize(),basis=new THREE.Matrix4().makeBasis(x,y,z);
 basis.multiply(new THREE.Matrix4().makeRotationZ(item.rotation*Math.PI/180));
 const rotation=new THREE.Euler().setFromRotationMatrix(basis),width=item.scale*Math.sqrt(item.aspect),height=item.scale/Math.sqrt(item.aspect),depth=Math.min(.36,Math.max(.12,Math.max(width,height)*.55));
 const geometry=new DecalGeometry(anchor.mesh,anchor.point,rotation,new THREE.Vector3(width,height,depth));
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,pos:number[]=[],norm:number[]=[],tex:number[]=[];
 let area=0;
 // Keep only the outward-facing local fabric; never stamp through the arm.
 for(let i=0;i<p.count;i+=3){
  const normal=new THREE.Vector3().fromBufferAttribute(n,i);if(normal.dot(z)<.12)continue;
  const a=new THREE.Vector2(uv.getX(i),uv.getY(i)),b=new THREE.Vector2(uv.getX(i+1),uv.getY(i+1)),c=new THREE.Vector2(uv.getX(i+2),uv.getY(i+2));
  area+=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;
  for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(p,i+j),normal=new THREE.Vector3().fromBufferAttribute(n,i+j).normalize();v.addScaledVector(normal,.004);pos.push(...v.toArray());norm.push(...normal.toArray());tex.push(uv.getX(i+j),uv.getY(i+j));}
 }
 geometry.dispose();const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));
 return {geometry:out,warning:area<.94};
}
type Entry={mesh:THREE.Mesh;key:string;source:string;texture:THREE.Texture;disposed:boolean};
export class ImageEmbroideryLayer{
 group=new THREE.Group();private entries=new Map<string,Entry>();
 constructor(private render:()=>void,private error:(message:string)=>void){this.group.name='image-embroidery';}
 update(items:ImageEmbroidery[],surfaces:Fabric[],selected:string|null){
  const ids=new Set(items.map(i=>i.id)),warnings:string[]=[];
  for(const [id,e] of this.entries)if(!ids.has(id)){this.release(e);this.entries.delete(id);}
  for(const item of items){let entry=this.entries.get(item.id);
   if(entry&&entry.source!==item.imageData){this.release(entry);this.entries.delete(item.id);entry=undefined;}
   if(!entry){
    const material=new THREE.MeshStandardMaterial({transparent:true,alphaTest:.05,roughness:.88,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.BufferGeometry(),material);mesh.userData.imageId=item.id;mesh.renderOrder=3;mesh.receiveShadow=true;this.group.add(mesh);
    entry={mesh,key:'',source:item.imageData,texture:new THREE.Texture(),disposed:false};this.entries.set(item.id,entry);
    const current=entry;
    new THREE.TextureLoader().load(item.imageData,texture=>{
     if(current.disposed){texture.dispose();return;}current.texture.dispose();current.texture=texture;texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;
     // Shared fine thread relief leaves uploaded colors and alpha intact.
     material.bumpMap=threadBump();material.bumpScale=.0015;material.needsUpdate=true;this.render();
    },undefined,()=>{if(!current.disposed)this.error('An image could not load. Your saved artwork is retained.');});
   }
   const key=JSON.stringify([item.anchor,item.scale,item.rotation,surfaces.map(f=>f.mesh.uuid)]);
   if(entry.key!==key){const result=imageDecal(item,surfaces);entry.mesh.geometry.dispose();entry.mesh.geometry=result.geometry;entry.mesh.userData.warning=result.warning;entry.key=key;}
   entry.mesh.visible=!!item.anchor;entry.mesh.userData.selected=item.id===selected;
   if(entry.mesh.userData.warning)warnings.push(item.id);
  }
  return warnings;
 }
 hit(ray:THREE.Raycaster){return ray.intersectObjects([...this.entries.values()].filter(e=>e.mesh.visible).map(e=>e.mesh))[0];}
 private release(e:Entry){e.disposed=true;this.group.remove(e.mesh);e.mesh.geometry.dispose();e.texture.dispose();(e.mesh.material as THREE.Material).dispose();}
 dispose(){this.entries.forEach(e=>this.release(e));this.entries.clear();}
}
let bump:THREE.DataTexture|undefined;
function threadBump(){if(bump)return bump;const data=new Uint8Array(64*64);for(let y=0;y<64;y++)for(let x=0;x<64;x++)data[y*64+x]=((x+y)%5<2)?200:95;
 bump=new THREE.DataTexture(data,64,64,THREE.RedFormat);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;bump.repeat.set(6,6);bump.needsUpdate=true;return bump;}
