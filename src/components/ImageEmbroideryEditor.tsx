import {useState} from 'react';
import type {ImageEmbroidery} from '../data/imageEmbroidery';
export default function ImageEmbroideryEditor({images,selected,onSelect,onChange,warnings}:{images:ImageEmbroidery[];selected:string|null;onSelect:(id:string|null)=>void;onChange:(images:ImageEmbroidery[])=>void;warnings:string[]}){
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),item=images.find(i=>i.id===selected);
 const patch=(p:Partial<ImageEmbroidery>)=>{if(item)onChange(images.map(i=>i.id===item.id?{...i,...p}:i));};
 async function upload(file:File){setBusy(true);setError('');try{
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG, or WebP image.');
  const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas'),ratio=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const image:ImageEmbroidery={id:crypto.randomUUID(),name:file.name,imageData:canvas.toDataURL('image/webp',.9),aspect:canvas.width/canvas.height,anchor:null,rotation:0,scale:.35};
  onChange([...images,image]);onSelect(image.id);
 }catch(e){setError(e instanceof Error?e.message:'This image could not be opened.');}finally{setBusy(false);}}
 return <section className="embroidery-editor"><button className="embroidery-heading" aria-expanded={open} onClick={()=>{setOpen(!open);if(open)onSelect(null);}}><span>IMAGE / EMBROIDERY</span><span>{open?'−':'+'}</span></button>
 {open&&<div className="embroidery-controls">
  <label>Upload artwork<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>
  {busy&&<p role="status">Preparing image…</p>}{error&&<p className="embroidery-warning" role="alert">{error}</p>}
  <div className="image-artwork-list">{images.map((image,i)=><button key={image.id} aria-pressed={selected===image.id} onClick={()=>onSelect(image.id)} draggable onDragStart={e=>{onSelect(image.id);e.dataTransfer.setData('application/x-varsity-image',image.id);e.dataTransfer.effectAllowed='move';}}><img src={image.imageData} alt={`Artwork ${i+1}: ${image.name}`} draggable={false}/><span>Image {i+1}</span></button>)}</div>
  {item&&<>
   <p className="small-note">{item.anchor?'Drag the artwork on the jacket to move it across fabric surfaces.':'Drag the thumbnail onto the jacket, or click the fabric to place it.'} Use the view buttons, or drag empty space, to reach the back and outer arm.</p>
   <label>Size<input type="range" min=".03" max="2" step=".01" value={item.scale} onChange={e=>patch({scale:Number(e.target.value)})}/></label>
   <label>Rotation · {item.rotation}°<input type="range" min="-180" max="180" step="1" value={item.rotation} onChange={e=>patch({rotation:Number(e.target.value)})}/></label>
   {warnings.includes(item.id)&&<p className="embroidery-warning" role="status">Part of this embroidery extends beyond the garment surface.</p>}
   <div className="embroidery-actions"><button onClick={()=>onSelect(null)}>Done editing</button><button onClick={()=>{onChange(images.filter(i=>i.id!==item.id));onSelect(null);}}>Delete image</button></div>
  </>}
  <p className="small-note">PNG, JPG or WebP. Transparent backgrounds are preserved. Artwork is stored with your designs in this browser.</p>
 </div>}</section>;
}
