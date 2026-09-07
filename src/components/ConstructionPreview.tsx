import type {JacketType} from '../data/config';
export default function ConstructionPreview({type}:{type:JacketType}){
 const coach=type==='coach',raglan=type==='raglan'||coach,high=type.startsWith('high-neck'),zip=type.includes('zipper'),covered=type.includes('placket');
 return <svg viewBox="0 0 100 100" className="construction-preview" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
  <path d="M34 20 20 26 10 75 23 79 32 46 32 86 68 86 68 46 77 79 90 75 80 26 66 20" fill="#e6e9ed"/>
  <path d={raglan?'M40 21 32 46 32 86 68 86 68 46 60 21Z':'M34 20 29 35 32 46 32 86 68 86 68 46 71 35 66 20Z'} fill="currentColor" fillOpacity=".16"/>
  {coach?<path d="M39 17 50 24 61 17 67 29 58 37 50 26 42 37 33 29Z" fill="#fff"/>:<path d={high?'M38 11 62 11 64 24 50 30 36 24Z':'M38 19 50 25 62 19 64 25 50 32 36 25Z'} fill="#fff"/>}
  <path d="M50 31V85M37 60 34 70M63 60 66 70"/>
  {!coach&&<path d="M32 80H68M11 71 24 75M76 75 89 71"/>}
  {zip&&<path d="M48 34V80" strokeDasharray="1.5 1.5" strokeWidth="3"/>}
  {covered&&<path d="M54 30V84"/>}
  {(!zip||covered)&&[39,49,59,69,79].map(y=><circle key={y} cx={covered?54:50} cy={y} r="1.6" fill="#fff" strokeWidth=".8"/>)}
 </svg>;
}
