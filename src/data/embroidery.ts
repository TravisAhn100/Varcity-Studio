export type EmbroideryText={
 id:string;text:string;side:'front'|'back';position:{x:number;y:number};
 rotation:number;scale:number;font:'varsity'|'cursive';fillColor:string;outlineColor:string;embroideryDepth:number;
};
export const embroideryArea={left:-.53,right:.53,bottom:-.72,top:.44,fastening:.10};
export function clampPlacement(x:number,y:number,side:EmbroideryText['side']){
 const a=embroideryArea;
 x=Math.max(a.left,Math.min(a.right,x));y=Math.max(a.bottom,Math.min(a.top,y));
 if(side==='front'&&Math.abs(x)<a.fastening)x=x<0?-a.fastening:a.fastening;
 return {x,y};
}
export function textCorners(t:EmbroideryText,aspect:number){
 const angle=t.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),w=t.scale*aspect/2,h=t.scale/2;
 return [[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>({x:t.position.x+x*c-y*s,y:t.position.y+x*s+y*c}));
}
export function outsideArea(t:EmbroideryText,aspect:number){
 const a=embroideryArea,p=textCorners(t,aspect),xs=p.map(p=>p.x);
 return p.some(p=>p.x<a.left||p.x>a.right||p.y<a.bottom||p.y>a.top)||
  (t.side==='front'&&Math.min(...xs)<a.fastening&&Math.max(...xs)>-a.fastening);
}
export function validEmbroidery(value:unknown):value is EmbroideryText[]{
 if(!Array.isArray(value))return false;
 const ids=new Set<string>(),hex=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
 return value.every(t=>{
  if(!t||typeof t!=='object'||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.text!=='string')return false;
  ids.add(t.id);
  return ['front','back'].includes(t.side)&&['varsity','cursive'].includes(t.font)&&hex(t.fillColor)&&hex(t.outlineColor)&&
   Number.isFinite(t.position?.x)&&Number.isFinite(t.position?.y)&&Math.abs(t.position.x)<=.53&&t.position.y>=-.72&&t.position.y<=.44&&
   Number.isFinite(t.rotation)&&Math.abs(t.rotation)<=30&&Number.isFinite(t.scale)&&t.scale>0&&t.scale<=1&&
   Number.isFinite(t.embroideryDepth)&&t.embroideryDepth>=.001&&t.embroideryDepth<=.008;
 });
}
