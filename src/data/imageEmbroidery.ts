export type ImageAnchor={surface:'body'|'leftSleeve'|'rightSleeve';uv:[number,number]};
export type ImageEmbroidery={id:string;name:string;imageData:string;aspect:number;anchor:ImageAnchor|null;scale:number;rotation:number};
export function validImages(value:unknown):value is ImageEmbroidery[]{
 if(!Array.isArray(value))return false;const ids=new Set<string>();
 return value.every(i=>{
  if(!i||typeof i.id!=='string'||!i.id||ids.has(i.id)||typeof i.name!=='string'||typeof i.imageData!=='string'||!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(i.imageData))return false;
  ids.add(i.id);const a=i.anchor;
  return Number.isFinite(i.aspect)&&i.aspect>0&&Number.isFinite(i.scale)&&i.scale>=.03&&i.scale<=2&&Number.isFinite(i.rotation)&&Math.abs(i.rotation)<=180&&
   (a===null||(['body','leftSleeve','rightSleeve'].includes(a?.surface)&&Array.isArray(a?.uv)&&a.uv.length===2&&a.uv.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)));
 });
}
