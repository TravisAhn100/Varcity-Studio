import {useEffect,useState} from 'react';
import {clampPlacement,type EmbroideryText} from '../data/embroidery';

export default function EmbroideryEditor({texts,selected,onSelect,onChange,onSide,warnings}:{texts:EmbroideryText[];selected:string|null;onSelect:(id:string|null)=>void;onChange:(texts:EmbroideryText[])=>void;onSide:(side:'front'|'back')=>void;warnings:string[]}){
 const [open,setOpen]=useState(false),t=texts.find(t=>t.id===selected);
 useEffect(()=>{if(selected)setOpen(true);},[selected]);
 function patch(update:Partial<EmbroideryText>){if(t)onChange(texts.map(item=>item.id===t.id?{...item,...update}:item));}
 function choose(t:EmbroideryText){onSelect(t.id);onSide(t.side);}
 function add(){const text:EmbroideryText={id:crypto.randomUUID(),text:'V',side:'front',position:{x:.30,y:.22},rotation:0,scale:.24,font:'varsity',fillColor:'#ffffff',outlineColor:'#113863',embroideryDepth:.004};onChange([...texts,text]);choose(text);}
 return <section className="embroidery-editor">
  <button className="embroidery-heading" aria-expanded={open} onClick={()=>{setOpen(!open);if(open)onSelect(null);}}><span>TEXT / EMBROIDERY</span><span>{open?'−':'+'}</span></button>
  {open&&<div className="embroidery-controls">
   <p className="small-note">Add stitched lettering to the front or back body panel.</p>
   <div className="embroidery-list">{texts.map((item,i)=><button key={item.id} aria-pressed={selected===item.id} onClick={()=>choose(item)}>Text {i+1} · {item.side}{warnings.includes(item.id)?' ⚠':''}</button>)}</div>
   {t&&<>
    <label>Content<textarea value={t.text} rows={3} onChange={e=>patch({text:e.target.value})}/></label>
    <div className="embroidery-options" aria-label="Embroidery font">{(['varsity','cursive'] as const).map(font=><button key={font} aria-pressed={t.font===font} onClick={()=>patch({font})}>{font==='varsity'?'Varsity':'Cursive'}</button>)}</div>
    <p className="small-note">{t.font==='varsity'?'Graduate':'Cedarville Cursive'}</p>
    <div className="embroidery-colors"><ThreadColor label={t.font==='varsity'?'Letter color':'Text color'} value={t.fillColor} onChange={fillColor=>patch({fillColor})}/>{t.font==='varsity'&&<ThreadColor label="Outline color" value={t.outlineColor} onChange={outlineColor=>patch({outlineColor})}/>}</div>
    <label>Size<input type="range" min="0.01" max="0.8" step="0.005" value={t.scale} onChange={e=>patch({scale:Number(e.target.value)})}/><input aria-label="Exact embroidery size" type="number" min="0.001" max="1" step="0.001" value={t.scale} onChange={e=>{const n=Number(e.target.value);if(n>0&&n<=1)patch({scale:n});}}/></label>
    <label>Rotation · {t.rotation}°<input type="range" min="-30" max="30" step="1" value={t.rotation} onChange={e=>patch({rotation:Number(e.target.value)})}/></label>
    <label>Stitch relief<input type="range" min=".001" max=".008" step=".001" value={t.embroideryDepth} onChange={e=>patch({embroideryDepth:Number(e.target.value)})}/></label>
    <div className="embroidery-options" aria-label="Embroidery side">{(['front','back'] as const).map(side=><button key={side} aria-pressed={t.side===side} onClick={()=>{patch({side,position:clampPlacement(t.position.x,t.position.y,side)});onSide(side);}}>{side==='front'?'Front':'Back'}</button>)}</div>
    <label>Horizontal position<input type="range" min="-.53" max=".53" step=".005" value={t.position.x} onChange={e=>patch({position:clampPlacement(Number(e.target.value),t.position.y,t.side)})}/></label>
    <label>Vertical position<input type="range" min="-.72" max=".44" step=".005" value={t.position.y} onChange={e=>patch({position:clampPlacement(t.position.x,Number(e.target.value),t.side)})}/></label>
    <p className="small-note">Embroidery area: inside the dashed guide. Drag the lettering on the jacket to move it. Front lettering stays clear of the fastening.</p>
    {warnings.includes(t.id)&&<p className="embroidery-warning" role="status">⚠ Text extends outside the embroidery area. Reduce its size or adjust its position. Your full text is retained.</p>}
    <div className="embroidery-actions"><button onClick={()=>onSelect(null)}>Done editing</button><button onClick={()=>{onChange(texts.filter(item=>item.id!==t.id));onSelect(null);}}>Delete text</button></div>
   </>}
   <button className="embroidery-add" onClick={add}>+ {texts.length?'Add another text':'Add text'}</button>
  </div>}
 </section>;
}
function ThreadColor({label,value,onChange}:{label:string;value:string;onChange:(color:string)=>void}){
 const [draft,setDraft]=useState<string|null>(null);
 return <label>{label}<div><input aria-label={label} type="color" value={value} onChange={e=>{setDraft(null);onChange(e.target.value);}}/><input aria-label={`${label} hex`} value={draft??value} onChange={e=>{setDraft(e.target.value);if(/^#[\da-f]{6}$/i.test(e.target.value))onChange(e.target.value);}} onBlur={()=>setDraft(null)}/></div></label>;
}
