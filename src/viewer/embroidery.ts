import * as THREE from 'three';
import {embroideryArea,outsideArea,type EmbroideryText} from '../data/embroidery';
import type {FitParameters} from './garment';

let fonts:Promise<unknown>|undefined;
export function loadEmbroideryFonts(){
 return fonts??=Promise.all([
  new FontFace('Embroidery Graduate','url(/fonts/graduate.ttf)').load(),
  new FontFace('Embroidery Cursive','url(/fonts/cedarville-cursive.ttf)').load()
 ]).then(loaded=>loaded.forEach(font=>document.fonts.add(font))).catch(error=>{fonts=undefined;throw error;});
}
type ThreadTexture={key:string;aspect:number;map:THREE.CanvasTexture;bump:THREE.CanvasTexture};
function threadTexture(t:EmbroideryText,key:string):ThreadTexture{
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
 const font=`96px "${t.font==='varsity'?'Embroidery Graduate':'Embroidery Cursive'}"`;
 ctx.font=font;
 const lines=t.text.split('\n'),widths=lines.map(line=>{const m=ctx.measureText(line);return Math.max(m.width,m.actualBoundingBoxLeft+m.actualBoundingBoxRight);});
 const width=widths.reduce((max,width)=>Math.max(max,width),1)+64,height=lines.length*132+64,ratio=Math.min(2,2048/Math.max(width,height));
 canvas.width=Math.max(1,Math.ceil(width*ratio));canvas.height=Math.max(1,Math.ceil(height*ratio));
 ctx.scale(ratio,ratio);ctx.font=font;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';ctx.lineWidth=7;
 lines.forEach((line,i)=>{const y=32+100+i*132;if(t.font==='varsity'){ctx.strokeStyle=t.outlineColor;ctx.strokeText(line,width/2,y);}ctx.fillStyle=t.fillColor;ctx.fillText(line,width/2,y);});
 // Fine diagonal stitches remain inside the glyph alpha, including its outline.
 ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-atop';ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=.7;
 for(let x=-canvas.height;x<canvas.width;x+=4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+canvas.height,canvas.height);ctx.stroke();}
 const relief=document.createElement('canvas');relief.width=canvas.width;relief.height=canvas.height;
 const b=relief.getContext('2d')!;b.drawImage(canvas,0,0);b.globalCompositeOperation='source-in';b.fillStyle='#999';b.fillRect(0,0,relief.width,relief.height);
 b.globalCompositeOperation='source-atop';b.strokeStyle='#ddd';b.lineWidth=1;
 for(let x=-relief.height;x<relief.width;x+=4){b.beginPath();b.moveTo(x,0);b.lineTo(x+relief.height,relief.height);b.stroke();}
 const map=new THREE.CanvasTexture(canvas),bump=new THREE.CanvasTexture(relief);map.colorSpace=THREE.SRGBColorSpace;
 return {key,aspect:width/height,map,bump};
}

/** Ray-project onto the current fitted body, never onto sleeves or hardware. */
export class BodyProjector{
 private proxy:THREE.Mesh;private material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 constructor(body:THREE.Mesh,private fit:FitParameters){this.proxy=new THREE.Mesh(body.geometry,this.material);this.proxy.updateMatrixWorld();}
 private width(y:number){const f=this.fit;return y>.45?THREE.MathUtils.lerp(f.chestWidth,f.shoulderWidth,THREE.MathUtils.clamp((y-.45)/.45,0,1)):THREE.MathUtils.lerp(f.waistWidth,f.chestWidth,THREE.MathUtils.clamp((y+1)/1.45,0,1));}
 logical(p:THREE.Vector3){const y=1.075+(p.y-1.075)/this.fit.torsoLength;return {x:p.x/this.width(y),y};}
 sample(x:number,y:number,side:EmbroideryText['side'],offset=.004){
  const sign=side==='front'?1:-1,worldY=1.075+(y-1.075)*this.fit.torsoLength;
  const ray=new THREE.Raycaster(new THREE.Vector3(x*this.width(y),worldY,sign*2),new THREE.Vector3(0,0,-sign));
  const hit=ray.intersectObject(this.proxy)[0];if(!hit)return null;
  const n=(hit.normal??hit.face!.normal).clone();if(n.z*sign<0)n.negate();
  return hit.point.addScaledVector(n.normalize(),offset);
 }
 dispose(){this.material.dispose();}
}
function allowed(x:number,y:number,side:EmbroideryText['side']){
 const a=embroideryArea;return x>=a.left&&x<=a.right&&y>=a.bottom&&y<=a.top&&(side==='back'||Math.abs(x)>=a.fastening);
}
export function projectedTextGeometry(projector:BodyProjector,t:EmbroideryText,aspect:number){
 const columns=Math.min(96,Math.max(12,Math.ceil(t.scale*aspect/.018))),rows=Math.min(64,Math.max(12,Math.ceil(t.scale/.018))),positions:number[]=[],uv:number[]=[],indices:number[]=[],valid:boolean[]=[];
 const a=t.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 let misses=false;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const dx=(i/columns-.5)*t.scale*aspect,dy=(j/rows-.5)*t.scale,x=t.position.x+dx*c-dy*s,y=t.position.y+dx*s+dy*c;
  // On the back, viewer-right is world-left so the writing reads normally.
  const p=allowed(x,y,t.side)?projector.sample(t.side==='back'?-x:x,y,t.side,t.embroideryDepth):null;
  if(!p&&allowed(x,y,t.side))misses=true;
  positions.push(...(p??new THREE.Vector3()).toArray());uv.push(i/columns,j/rows);valid.push(!!p);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+columns+1;
  for(const tri of [[a,a+1,b],[a+1,b+1,b]])if(tri.every(k=>valid[k])){
   // Never bridge the fastening with a triangle, even for very long text.
   const xs=tri.map(k=>positions[k*3]);if(t.side==='front'&&Math.min(...xs)<0&&Math.max(...xs)>0)continue;
   indices.push(...tri);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 return {geometry:g,warning:outsideArea(t,aspect)||misses};
}

export class EmbroideryLayer{
 group=new THREE.Group();private textures=new Map<string,ThreadTexture>();private guide=new THREE.Group();
 private meshes=new Map<string,{mesh:THREE.Mesh;key:string}>();private guideKey='';
 constructor(){this.group.name='embroidery';this.group.add(this.guide);}
 update(texts:EmbroideryText[],body:THREE.Mesh,fit:FitParameters,selected:string|null){
  const projector=new BodyProjector(body,fit),warnings:string[]=[],ids=new Set(texts.map(t=>t.id));
  for(const [id,entry] of this.meshes)if(!ids.has(id)){this.group.remove(entry.mesh);entry.mesh.geometry.dispose();(entry.mesh.material as THREE.Material).dispose();this.meshes.delete(id);}
  for(const [id,texture] of this.textures)if(!ids.has(id)){texture.map.dispose();texture.bump.dispose();this.textures.delete(id);}
  for(const t of texts){
   const textureKey=JSON.stringify([t.text,t.font,t.fillColor,t.outlineColor]);let texture=this.textures.get(t.id);
   if(!texture||texture.key!==textureKey){texture?.map.dispose();texture?.bump.dispose();texture=threadTexture(t,textureKey);this.textures.set(t.id,texture);}
   const geometryKey=JSON.stringify([t.position,t.side,t.rotation,t.scale,t.embroideryDepth,texture.aspect,fit,body.uuid]);let entry=this.meshes.get(t.id);
   if(!entry||entry.key!==geometryKey){
    const {geometry,warning}=projectedTextGeometry(projector,t,texture.aspect);
    const material=new THREE.MeshStandardMaterial({map:texture.map,bumpMap:texture.bump,bumpScale:.002,roughness:.83,metalness:0,transparent:true,alphaTest:.06,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    if(entry){this.group.remove(entry.mesh);entry.mesh.geometry.dispose();(entry.mesh.material as THREE.Material).dispose();}
    const mesh=new THREE.Mesh(geometry,material);mesh.name='embroidered-text';mesh.userData.embroideryId=t.id;mesh.userData.warning=warning;mesh.receiveShadow=true;mesh.renderOrder=2;
    entry={mesh,key:geometryKey};this.meshes.set(t.id,entry);this.group.add(mesh);
   }
   const material=entry.mesh.material as THREE.MeshStandardMaterial;
   material.map=texture.map;material.bumpMap=texture.bump;
   if(t.text.trim()&&entry.mesh.userData.warning)warnings.push(t.id);
  }
  const chosen=texts.find(t=>t.id===selected),guideKey=JSON.stringify([chosen?.side,fit,body.uuid]);
  if(guideKey!==this.guideKey){
   this.clearGuide();this.guideKey=guideKey;
   if(chosen){const a=embroideryArea,ranges=chosen.side==='front'?[[a.left,-a.fastening],[a.fastening,a.right]]:[[a.left,a.right]];
    for(const [l,r] of ranges){const points:THREE.Vector3[]=[];
     for(const [x1,y1,x2,y2] of [[l,a.bottom,r,a.bottom],[r,a.bottom,r,a.top],[r,a.top,l,a.top],[l,a.top,l,a.bottom]])for(let i=0;i<=24;i++){
      const p=projector.sample(THREE.MathUtils.lerp(x1,x2,i/24),THREE.MathUtils.lerp(y1,y2,i/24),chosen.side,.008);if(p)points.push(p);
     }
     const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xeae150,dashSize:.035,gapSize:.025,transparent:true,opacity:.65,depthWrite:false}));line.computeLineDistances();this.guide.add(line);
    }
   }
  }
  projector.dispose();return warnings;
 }
 private clearGuide(){this.guide.children.forEach(obj=>{const line=obj as THREE.Line;line.geometry.dispose();(line.material as THREE.Material).dispose();});this.guide.clear();}
 hit(ray:THREE.Raycaster){return ray.intersectObjects([...this.meshes.values()].map(e=>e.mesh))[0];}
 dispose(){this.clearGuide();for(const e of this.meshes.values()){e.mesh.geometry.dispose();(e.mesh.material as THREE.Material).dispose();}for(const t of this.textures.values()){t.map.dispose();t.bump.dispose();}this.group.clear();}
}
