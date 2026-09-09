import {families,regions,trimColors,snapColors,sizes,type Config,type Choice} from './config';
import {validEmbroidery} from './embroidery';

export const STORAGE_KEY='varsity.designs.v1';
export type SavedDesign={id:number;config:Config;savedAt:string};
export type DesignSlots=[SavedDesign|null,SavedDesign|null,SavedDesign|null];
export const emptySlots=():DesignSlots=>[null,null,null];
export const cloneConfig=(config:Config):Config=>JSON.parse(JSON.stringify(config));
// Fit mode is presentation, so switching mannequins does not dirty a saved design.
export const designSignature=(config:Config)=>JSON.stringify({...config,mannequin:'none'});
const oneOf=(value:unknown,values:readonly string[])=>typeof value==='string'&&values.includes(value);
function validChoice(value:unknown,kind:'fabric'|'rib'|'metal'):value is Choice{
 if(!value||typeof value!=='object')return false;
 const c=value as Choice;
 if(kind==='rib')return c.material==='rib-knit'&&trimColors.some(s=>s.code===c.code);
 if(kind==='metal')return c.material==='metal'&&snapColors.some(s=>s.code===c.code);
 return families.some(f=>f.id===c.material&&f.swatches.some(s=>s.code===c.code&&!s.discontinued));
}
export function parseConfig(value:unknown):Config|null{
 if(!value||typeof value!=='object')return null;
 const c=value as Config,k=c.construction;
 if(!k||!oneOf(k.shoulder,['regular','raglan'])||!oneOf(k.closure,['snaps','zipper','placket'])||!oneOf(k.collar,['varsity','high-neck']))return null;
 if(c.fit!=='regular'||!oneOf(c.size,sizes)||!oneOf(c.mannequin,['none','male','female']))return null;
 for(const {id} of regions)if(!validChoice(c[id],id==='snaps'?'metal':['collar','cuffs','waistband'].includes(id)?'rib':'fabric'))return null;
 if(c.fabricCollar!==undefined&&!validChoice(c.fabricCollar,'fabric'))return null;
 if(c.embroidery!==undefined&&!validEmbroidery(c.embroidery))return null;
 const result:Config={construction:{shoulder:k.shoulder,closure:k.closure,collar:k.collar},fit:'regular',size:c.size,mannequin:c.mannequin,...Object.fromEntries(regions.map(({id})=>[id,{material:c[id].material,code:c[id].code}]))} as Config;
 if(c.fabricCollar)result.fabricCollar={...c.fabricCollar};
 if(c.embroidery)result.embroidery=JSON.parse(JSON.stringify(c.embroidery));
 return result;
}
export function decodeDesigns(raw:string|null):{slots:DesignSlots;warning:string}{
 const slots=emptySlots();
 if(!raw)return {slots,warning:''};
 try{
  const value=JSON.parse(raw);
  if(value.version!==1||!Array.isArray(value.slots)||value.slots.length!==3)throw Error('Unsupported saved data');
  let skipped=false;
  value.slots.forEach((entry:unknown,index:number)=>{
   if(entry===null)return;
   const saved=entry as SavedDesign,config=parseConfig(saved?.config);
   if(!config||saved.id!==index+1||typeof saved.savedAt!=='string'||!Number.isFinite(Date.parse(saved.savedAt))){skipped=true;return;}
   slots[index]={id:index+1,config,savedAt:saved.savedAt};
  });
  return {slots,warning:skipped?'Some saved data could not be loaded. Your other designs are available.':''};
 }catch{return {slots,warning:'Saved designs could not be read. The original browser data has not been changed.'};}
}
export function saveSlot(slots:DesignSlots,id:number,config:Config,savedAt=new Date().toISOString()):DesignSlots{
 if(!Number.isInteger(id)||id<1||id>3)throw Error('Choose Design 1, 2 or 3.');
 const valid=parseConfig(config);if(!valid)throw Error('This design contains an unavailable option.');
 const next=[...slots] as DesignSlots;next[id-1]={id,config:valid,savedAt};return next;
}
export function deleteSlot(slots:DesignSlots,id:number):DesignSlots{
 if(!Number.isInteger(id)||id<1||id>3)throw Error('Invalid slot');
 const next=[...slots] as DesignSlots;next[id-1]=null;return next;
}
export const encodeDesigns=(slots:DesignSlots)=>JSON.stringify({version:1,slots});
export function toggleComparison(ids:number[],id:number):number[]{
 if(ids.includes(id))return ids.filter(x=>x!==id);
 return ids.length<2?[...ids,id]:ids;
}
