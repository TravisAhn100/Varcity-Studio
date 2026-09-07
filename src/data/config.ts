import catalogue from './materials.json';
export const families = catalogue;
export type Region = 'body'|'sleeves'|'collar'|'cuffs'|'waistband'|'pocketTrim'|'snaps';
export const regions: {id:Region;label:string}[] = [{id:'body',label:'Body'},{id:'sleeves',label:'Sleeves'},{id:'collar',label:'Collar'},{id:'cuffs',label:'Cuffs'},{id:'waistband',label:'Waistband'},{id:'pocketTrim',label:'Pocket trim'},{id:'snaps',label:'Snaps'}];
export type Choice = {material:string;code:string};
export type Config = {jacketType:'regular';fit:'regular';size:string;mannequin:'none'|'male'|'female'} & Record<Region,Choice>;
export const trimColors = [{code:'trim-navy',label:'Navy',baseColor:'#182c42'},{code:'trim-black',label:'Black',baseColor:'#191b1c'},{code:'trim-cream',label:'Cream',baseColor:'#eee9dd'},{code:'trim-burgundy',label:'Burgundy',baseColor:'#60232d'},{code:'trim-green',label:'Forest',baseColor:'#244638'}];
export const snapColors=[{code:'snap-silver',label:'Silver',baseColor:'#c4c8cc'},{code:'snap-black',label:'Black',baseColor:'#242424'},{code:'snap-brass',label:'Brass',baseColor:'#ac8850'}];
export const initialConfig:Config={jacketType:'regular',fit:'regular',size:'M',mannequin:'none',body:{material:'factory',code:'TRH231'},sleeves:{material:'premium',code:'SLD34'},collar:{material:'rib-knit',code:'trim-navy'},cuffs:{material:'rib-knit',code:'trim-navy'},waistband:{material:'rib-knit',code:'trim-navy'},pocketTrim:{material:'premium',code:'SLD34'},snaps:{material:'metal',code:'snap-silver'}};
export function resolveChoice(choice:Choice){
 const family=families.find(f=>f.id===choice.material);const s=family?.swatches.find(s=>s.code===choice.code);
 if(s&&family)return {...s,materialProperties:family.materialProperties,kind:family.kind,label:family.label,manufacturerCode:s.code};
 const trim=[...trimColors,...snapColors].find(s=>s.code===choice.code)!;
 return {...trim,texture:'',colorMap:'',bumpMap:'',materialProperties:{roughness:choice.material==='metal'?.23:.94,metalness:choice.material==='metal'?.85:0,sheen:.15,clearcoat:0,bumpScale:.008,tileRepeat:[1,1]},kind:choice.material,label:trim?.label??'Navy',manufacturerCode:null};
}
export const sizes=['XS','S','M','L','XL','2XL','3XL','4XL','5XL'];
export const measurements=[[62.5,54,43,60],[64.5,56,45,61],[65.5,58,47,62],[67.5,61,48,63],[69.5,64,50,64],[71.5,66,52,65],[73.5,68,54,66],[75.5,70,56,66.5],[77,72,57.5,68]];
export const jacketTypes=['Regular Varsity','Raglan','Zipper + placket','Zipper only','High neck','High neck + placket','Coach jacket'];
