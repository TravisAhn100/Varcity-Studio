type Pose={position:[number,number,number];target:[number,number,number]};
export function createCameraSync(){
 const listeners=new Map<object,(pose:Pose)=>void>();
 return {
  subscribe(owner:object,listener:(pose:Pose)=>void){listeners.set(owner,listener);return ()=>{listeners.delete(owner);};},
  publish(owner:object,pose:Pose){listeners.forEach((listener,key)=>{if(key!==owner)listener(pose);});}
 };
}
export type CameraSync=ReturnType<typeof createCameraSync>;
