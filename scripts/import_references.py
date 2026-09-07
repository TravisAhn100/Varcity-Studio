"""Crop manufacturer pixels; derive repeatable color and relief maps, not flat paint."""
from pathlib import Path
from PIL import Image, ImageStat, ImageOps, ImageFilter
import unicodedata as u, json, shutil, argparse
root=Path(argparse.ArgumentParser().parse_known_args()[1][0]) if argparse.ArgumentParser().parse_known_args()[1] else Path('/Users/jaehyunahn/Downloads/baseball (1)')
out=Path(__file__).resolve().parents[1]
files={u.normalize('NFC',p.name):p for p in root.rglob('*.jpg')}
# id, label, physical family, source, code prefix, numbers, grid origin, cell size
sets=[
('himir','Himir','wool','2 하이미어.jpg','HM',range(1,43),25,238,144,285),
('factory','Factory Himir 2','wool','1_1 팩토리 하이미어2.jpg','TRH',range(201,248),27,226,144,285),
('special-himir','Special Himir 2','wool','3 스페셜 하이미어2.jpg','SHM',range(201,254),26,230,144,285),
('leather','Basic leather','leather','4 기본 레자원단.jpg','LD',range(1,35),25,215,144,285),
('premium','Special leather 2','premium','5_1 스페셜 레자원단2.jpg','SLD',range(31,38),25,178,144,285),
('premium-1','Special leather 1','premium','5 스페셜 레자원단.jpg','SLD',[2,11],26,206,142,285),
('corduroy','Corduroy','corduroy','10 코듀로이(골덴) 원단.jpg','PL',range(1,19),26,194,144,285),
('denim','Denim','denim','6 데님원단.jpg','DN',range(1,7),27,221,144,285),
('bomber','Flight / bomber','nylon','7 항공점퍼 원단.jpg','MA',range(1,26),27,233,144,285),
('cashmere','Cashmere-like','cashmere','9 캐시미어 원단.jpg','CM',range(1,23),27,255,144,285),
('pattern','Woven pattern','pattern','8 패턴 원단.jpg','PT',range(1,53),27,223,144,285)]
properties={
 'wool':dict(roughness=.94,metalness=0,sheen=.45,clearcoat=0,bumpScale=.009,tileRepeat=[10,5]),
 'leather':dict(roughness=.48,metalness=0,sheen=.08,clearcoat=.06,bumpScale=.013,tileRepeat=[9,4.5]),
 'premium':dict(roughness=.32,metalness=0,sheen=.1,clearcoat=.22,bumpScale=.019,tileRepeat=[9,4.5]),
 'corduroy':dict(roughness=.96,metalness=0,sheen=.35,clearcoat=0,bumpScale=.026,tileRepeat=[8,4]),
 'denim':dict(roughness=.91,metalness=0,sheen=.18,clearcoat=0,bumpScale=.012,tileRepeat=[10,5]),
 'nylon':dict(roughness=.58,metalness=0,sheen=.25,clearcoat=.08,bumpScale=.006,tileRepeat=[12,6]),
 'cashmere':dict(roughness=.97,metalness=0,sheen=.65,clearcoat=0,bumpScale=.011,tileRepeat=[9,4.5]),
 'pattern':dict(roughness=.92,metalness=0,sheen=.2,clearcoat=0,bumpScale=.014,tileRepeat=[8,4])}
def mirror(tile):
 w,h=tile.size;result=Image.new(tile.mode,(w*2,h*2));result.paste(tile,(0,0));result.paste(ImageOps.mirror(tile),(w,0));result.paste(ImageOps.flip(tile),(0,h));result.paste(ImageOps.flip(ImageOps.mirror(tile)),(w,h));return result
for folder in ['public/textures','public/references']:(out/folder).mkdir(parents=True,exist_ok=True)
data=[]
for id,label,kind,file,prefix,numbers,x,y,w,h in sets:
 im=Image.open(files[file]).convert('RGB');swatches=[];shutil.copy2(files[file],out/'public/references'/f'{id}.jpg')
 for i,n in enumerate(numbers):
  code=prefix+str(n).zfill(2);col=i%8;row=i//8
  # Top 112 px avoid code, color-name and discontinued overlays (including CM01).
  box=(x+col*w+16,y+row*h+8,x+col*w+128,y+row*h+120)
  crop=im.crop(box);rgb=tuple(round(v) for v in ImageStat.Stat(crop).mean)
  crop.save(out/'public/textures'/f'{code}.jpg',quality=95)
  mirror(crop).save(out/'public/textures'/f'{code}-color.jpg',quality=95)
  relief=ImageOps.autocontrast(crop.convert('L'),cutoff=1).filter(ImageFilter.GaussianBlur(.45))
  mirror(relief).save(out/'public/textures'/f'{code}-bump.png')
  swatches.append(dict(code=code,family=id,baseColor='#%02x%02x%02x'%rgb,texture=f'/textures/{code}.jpg',colorMap=f'/textures/{code}-color.jpg',bumpMap=f'/textures/{code}-bump.png',discontinued=code in ['HM09','HM23','CM01'],sourceCrop=list(box)))
 data.append(dict(id=id,label=label,kind=kind,materialProperties=properties[kind],swatches=swatches,reference=f'/references/{id}.jpg'))
(out/'src/data/materials.json').write_text(json.dumps(data,indent=2)+'\n')
print('Imported',sum(len(d['swatches']) for d in data),'codes across',len(data),'families; 3 discontinued swatches flagged.')
