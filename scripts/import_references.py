from pathlib import Path
from PIL import Image, ImageStat
import unicodedata as u,json,shutil
root=Path('/Users/jaehyunahn/Downloads/baseball (1)')
out=Path(__file__).resolve().parents[1]
files={u.normalize('NFC',p.name):p for p in root.rglob('*.jpg')}
# Sample only the unobstructed center of each documented swatch.
sets=[('himir','Himir','wool','2 하이미어.jpg','HM',1,42,25,238,144,285,[1,8,13,25,28,36,41,42]),('factory','Factory Himir 2','wool','1_1 팩토리 하이미어2.jpg','TRH',201,47,27,226,144,285,[203,210,219,222,231,234,244]),('special-himir','Special Himir 2','wool','3 스페셜 하이미어2.jpg','SHM',201,53,26,230,144,285,[204,209,213,222,223,228,235,248]),('leather','Basic leather','leather','4 기본 레자원단.jpg','LD',1,34,25,215,144,285,[1,5,7,10,15,16,18,22]),('premium','Special leather','premium','5_1 스페셜 레자원단2.jpg','SLD',31,7,25,178,144,285,[31,32,33,34,36]),('corduroy','Corduroy','corduroy','10 코듀로이(골덴) 원단.jpg','PL',1,18,26,194,144,285,[2,4,5,10,12,17,18])]
data=[]
for id,label,kind,file,prefix,start,count,x,y,w,h,chosen in sets:
 im=Image.open(files[file]).convert('RGB'); swatches=[]
 shutil.copy2(files[file],out/'public/references'/f'{id}.jpg')
 for n in chosen:
  i=n-start;col=i%8;row=i//8
  code=prefix+(str(n).zfill(2));box=(x+col*w+35,y+row*h+40,x+col*w+105,y+row*h+150)
  tile=im.crop(box);rgb=tuple(round(v) for v in ImageStat.Stat(tile).mean)
  tile.save(out/'public/textures'/f'{code}.jpg',quality=92)
  swatches.append({'code':code,'baseColor':'#%02x%02x%02x'%rgb,'texture':f'/textures/{code}.jpg'})
 data.append({'id':id,'label':label,'kind':kind,'swatches':swatches,'reference':f'/references/{id}.jpg'})
(out/'src/data/materials.json').write_text(json.dumps(data,indent=2))
for key,p in files.items():
 if key=='사이즈 안내.jpg':shutil.copy2(p,out/'public/references/size.jpg')
 if key=='1.기본형.jpg':shutil.copy2(p,out/'public/references/regular.jpg')
print('Imported',sum(len(d['swatches']) for d in data),'manufacturer swatches and references')
