import * as THREE from 'three';

export function fabricResponse(kind:string,special=false){
 switch(kind){
  case 'wool':return {roughness:special?.98:.96,sheen:special?.48:.38,sheenRoughness:.95,clearcoat:0,clearcoatRoughness:.8,specularIntensity:.3,bumpScale:special?.008:.006};
  case 'cashmere':return {roughness:.98,sheen:.6,sheenRoughness:1,clearcoat:0,clearcoatRoughness:1,specularIntensity:.25,bumpScale:.007};
  case 'leather':return {roughness:.54,sheen:0,sheenRoughness:1,clearcoat:.07,clearcoatRoughness:.48,specularIntensity:.65,bumpScale:.006};
  case 'premium':return {roughness:.39,sheen:0,sheenRoughness:1,clearcoat:.19,clearcoatRoughness:.38,specularIntensity:.8,bumpScale:.01};
  case 'corduroy':return {roughness:.97,sheen:.42,sheenRoughness:.94,clearcoat:0,clearcoatRoughness:1,specularIntensity:.28,bumpScale:.023};
  case 'denim':case 'pattern':return {roughness:.94,sheen:.18,sheenRoughness:1,clearcoat:0,clearcoatRoughness:1,specularIntensity:.35,bumpScale:.009};
  case 'nylon':return {roughness:.63,sheen:.28,sheenRoughness:.7,clearcoat:.035,clearcoatRoughness:.55,specularIntensity:.55,bumpScale:.004};
  case 'rib-knit':return {roughness:.98,sheen:.3,sheenRoughness:1,clearcoat:0,clearcoatRoughness:1,specularIntensity:.25,bumpScale:.012};
  default:return {};
 }
}
/** Small color-free roughness fields. Source color and relief maps remain untouched. */
export function microRoughness(kind:string){
 const size=64,data=new Uint8Array(size*size*4);
 let seed=317;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fiber=noise(),grain=Math.sin(x*.73+Math.sin(y*.91))*Math.sin(y*.63+Math.cos(x*.51));
  const value=kind==='leather'||kind==='premium'?234+grain*13+fiber*8:kind==='corduroy'?245+Math.cos(x*Math.PI/4)*5:244+fiber*11;
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(value);data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(20,14);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
