import {useId} from 'react';
import {type Config,resolveChoice,regionChoice} from '../data/config';

// A small construction diagram, using the saved source swatches for identification.
export default function DesignThumbnail({config}:{config:Config}){
 const id=useId().replaceAll(':',''),c=config.construction;
 const fills=Object.fromEntries(['body','sleeves','collar','cuffs','waistband','pocketTrim','snaps'].map(region=>[region,resolveChoice(regionChoice(config,region as keyof Pick<Config,'body'|'sleeves'|'collar'|'cuffs'|'waistband'|'pocketTrim'|'snaps'>))]));
 const fill=(region:string)=>fills[region].texture?`url(#${id}-${region})`:fills[region].baseColor;
 return <svg viewBox="0 0 160 145" className="design-thumbnail" role="img" aria-label={`Saved jacket diagram: ${config.body.code} body, ${config.sleeves.code} sleeves`}>
  <defs>{Object.entries(fills).filter(([,s])=>s.texture).map(([region,s])=><pattern key={region} id={`${id}-${region}`} width="22" height="28" patternUnits="userSpaceOnUse"><image href={s.texture} width="22" height="28" preserveAspectRatio="xMidYMid slice"/></pattern>)}</defs>
  <g stroke="#113863" strokeOpacity=".35" strokeWidth="1.2" strokeLinejoin="round">
   <path d="M57 24 37 31 16 110 34 117 49 70 48 126 112 126 111 70 126 117 144 110 123 31 103 24Z" fill={fill('sleeves')}/>
   <path d={c.shoulder==='raglan'?'M68 24 49 70 48 126 112 126 111 70 92 24Z':'M57 24 47 48 49 70 48 126 112 126 111 70 113 48 103 24Z'} fill={fill('body')}/>
   <path d="M48 116H112V128H48ZM17 106 35 112 32 121 14 115ZM125 112 143 106 146 115 128 121Z" fill={fill('cuffs')}/>
   <path d="M48 116H112V128H48Z" fill={fill('waistband')}/>
   <path d={c.collar==='high-neck'?'M64 11H96L98 27 80 37 62 27Z':'M64 24 80 31 96 24 98 30 80 40 62 30Z'} fill={fill('collar')}/>
   <path d="M80 38V127" stroke={fills.snaps.baseColor} strokeWidth={c.closure==='snaps'?1:2} strokeDasharray={c.closure==='snaps'?undefined:'2 1'}/>
   {c.closure==='placket'&&<path d="M82 38H88V127H82Z" fill={fill('body')}/>}
   {c.closure!=='zipper'&&[46,61,76,91,106,121].map(y=><circle key={y} cx={c.closure==='placket'?85:80} cy={y} r="2" fill={fill('snaps')}/>)}
   <path d="M59 84 54 98M101 84 106 98" stroke={fills.pocketTrim.baseColor} strokeWidth="3"/>
  </g>
 </svg>;
}
