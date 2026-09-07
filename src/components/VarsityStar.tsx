import type {SVGProps} from 'react';
export const starPoints='32,7 38.47,23.1 55.78,24.27 42.46,35.4 46.69,52.23 32,43 17.31,52.23 21.54,35.4 8.22,24.27 25.53,23.1';
export default function VarsityStar(props:SVGProps<SVGSVGElement>){
 return <svg viewBox="0 0 64 64" aria-hidden="true" {...props}><rect width="64" height="64" rx="12" fill="#113863"/><polygon points={starPoints} fill="#cf4437" stroke="#ffffff" strokeWidth="3.5" strokeLinejoin="miter"/></svg>;
}
