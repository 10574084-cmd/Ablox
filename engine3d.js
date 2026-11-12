/* Ablox 3D engine — Three.js scene, third-person orbit camera and original game worlds. */
(function(){
'use strict';
const T=window.THREE;
const $=id=>document.getElementById(id);
if(!T){window.Ablox3DEngine=class{constructor(){throw new Error('No se pudo cargar Three.js. Comprueba tu conexión e inténtalo de nuevo.')}};return;}
class Ablox3DEngine{
  constructor(canvas,game){
    this.T=T;this.canvas=canvas;this.game=game;this.keys={};this.running=false;this.paused=false;this.messageShown=false;
    this.raf=0;this.last=0;this.elapsed=0;this.score=0;this.coinsCollected=0;this.flash=0;this.distance=10.5;
    this.yaw=0;this.pitch=.30;this.dragging=false;this.pointerPositions=new Map();this.pinchDistance=0;
    this.player={x:0,y:0,z:0,vy:0,ground:true};this.platforms=[];this.coins=[];this.obstacles=[];this.stealables=[];this.eggItems=[];this.woodPickups=[];this.carriedVisuals=[];this.carriedCount=0;this.deliveredCount=0;this.woodCount=0;this.boatPhase='gather';this.boatHealth=3;this.boatHitCooldown=0;this.boatGroup=null;
    this.best=this.readBest();
    this.scene=new T.Scene();
    this.scene.background=new T.Color(game.type==='race'?0x211b46:game.type==='coin'?0x7ec9cf:0x92b5e9);
    this.scene.fog=new T.Fog(game.type==='race'?0x40345f:game.type==='coin'?0x9ccfc3:0xb6c9e9,game.type==='race'?75:game.type==='coin'?65:72,game.type==='race'?260:game.type==='coin'?110:190);
    this.camera=new T.PerspectiveCamera(62,1,.1,800);
    this.renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.renderer.toneMapping=T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.9;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    if('outputEncoding' in this.renderer)this.renderer.outputEncoding=T.sRGBEncoding;
    this.renderer.setClearColor(this.scene.background);
    this.addLights();this.buildWorld();this.createAvatar();this.updateAvatar(0,false);this.fit();
    this.keyDown=e=>this.onKey(e,true);this.keyUp=e=>this.onKey(e,false);
    this.resize=()=>this.fit();
    this.pointerDown=e=>this.onPointerDown(e);this.pointerMove=e=>this.onPointerMove(e);
    this.pointerUp=e=>this.onPointerUp(e);this.wheel=e=>this.onWheel(e);
    window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);
    window.addEventListener('resize',this.resize);
    canvas.addEventListener('pointerdown',this.pointerDown);window.addEventListener('pointermove',this.pointerMove);
    window.addEventListener('pointerup',this.pointerUp);window.addEventListener('pointercancel',this.pointerUp);
    canvas.addEventListener('wheel',this.wheel,{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.touchButtons=Array.from(document.querySelectorAll('[data-key]'));this.joystick={x:0,y:0};this.joystickElement=document.getElementById('moveJoystick');this.joystickNub=document.getElementById('joystickNub');
    this.joystickDown=e=>{e.preventDefault();e.stopPropagation();this.joyPointer=e.pointerId;try{this.joystickElement.setPointerCapture(e.pointerId)}catch(err){}this.updateJoystick(e)};
    this.joystickMove=e=>{if(e.pointerId===this.joyPointer){e.preventDefault();e.stopPropagation();this.updateJoystick(e)}};
    this.joystickUp=e=>{if(e.pointerId===this.joyPointer){e.preventDefault();e.stopPropagation();this.joyPointer=null;this.joystick.x=0;this.joystick.y=0;if(this.joystickNub)this.joystickNub.style.transform='translate(-50%,-50%)'}};
    if(this.joystickElement){this.joystickElement.addEventListener('pointerdown',this.joystickDown);this.joystickElement.addEventListener('pointermove',this.joystickMove);this.joystickElement.addEventListener('pointerup',this.joystickUp);this.joystickElement.addEventListener('pointercancel',this.joystickUp)}
    this.touchStart=e=>{e.preventDefault();this.keys[e.currentTarget.dataset.key]=true;};
    this.touchEnd=e=>{e.preventDefault();this.keys[e.currentTarget.dataset.key]=false;};
    this.touchButtons.forEach(b=>{b.addEventListener('pointerdown',this.touchStart);b.addEventListener('pointerup',this.touchEnd);b.addEventListener('pointercancel',this.touchEnd);b.addEventListener('pointerleave',this.touchEnd);});
    $('bestValue').textContent=this.best;this.updateHud();this.updateCamera(1);
  }
  readBest(){try{return Number(localStorage.getItem('ablox-best-'+this.game.id)||0);}catch(e){return 0;}}
  saveBest(){if(this.score>this.best){this.best=this.score;try{localStorage.setItem('ablox-best-'+this.game.id,String(this.best));}catch(e){}$('bestValue').textContent=this.best;}}
  addLights(){
    const T=this.T;
    if(this.game.type==='race'){
      this.scene.add(new T.HemisphereLight(0x829cff,0x17152e,.24));
      this.scene.add(new T.AmbientLight(0x252852,.20));
      const moon=new T.DirectionalLight(0x9eabff,.38);moon.position.set(-22,34,-18);this.scene.add(moon);
      const cyan=new T.PointLight(0x36e7ff,.72,42,2);cyan.position.set(-7,9,8);this.scene.add(cyan);
      const violet=new T.PointLight(0xb26aff,.62,38,2);violet.position.set(7,8,44);this.scene.add(violet);
      return;
    }
    this.scene.add(new T.HemisphereLight(0xeaf4ff,0x53616c,.72));
    const sun=new T.DirectionalLight(0xfff4df,1.05);sun.position.set(-18,28,-12);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.near=.5;sun.shadow.camera.far=180;
    this.scene.add(sun);
    const fill=new T.DirectionalLight(0x9ebcff,.28);fill.position.set(15,12,25);this.scene.add(fill);
  }
  addNightLamp(x,z,color){
    const T=this.T;
    this.addBox(x,2.9,z,.22,5.8,.22,0x343853,{castShadow:false});
    this.addBox(x,5.75,z,.8,.18,.8,color,{castShadow:false,material:{emissive:color,emissiveIntensity:.85,metalness:.25,roughness:.3}});
    const glow=new T.Mesh(new T.SphereGeometry(.34,12,8),new T.MeshBasicMaterial({color:color}));
    glow.position.set(x,5.45,z);this.scene.add(glow);
    const light=new T.PointLight(color,2.0,23,2);light.position.set(x,5.3,z);this.scene.add(light);
    const halo=new T.Mesh(new T.SphereGeometry(.55,10,8),new T.MeshBasicMaterial({color:color,transparent:true,opacity:.08,depthWrite:false}));
    halo.position.copy(light.position);this.scene.add(halo);
  }
  material(color,roughness=.82,metalness=.02,extra={}){
    return new this.T.MeshStandardMaterial(Object.assign({color:color,roughness:roughness,metalness:metalness},extra));
  }
  addBox(x,y,z,w,h,d,color,opts={}){
    const mesh=new this.T.Mesh(new this.T.BoxGeometry(w,h,d),this.material(color,opts.roughness===undefined?.82:opts.roughness,opts.metalness||0,opts.material||{}));
    mesh.position.set(x,y,z);mesh.castShadow=opts.castShadow!==false;mesh.receiveShadow=opts.receiveShadow!==false;
    this.scene.add(mesh);return mesh;
  }
  addPlane(w,d,y,color){
    const mesh=new this.T.Mesh(new this.T.PlaneGeometry(w,d),this.material(color,1,0));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;
  }
  addCoin(x,y,z){
    const T=this.T,group=new T.Group();group.position.set(x,y,z);
    const body=new T.Mesh(new T.CylinderGeometry(.34,.34,.13,24),this.material(0xffc94f,.3,.55,{emissive:0x7a4200,emissiveIntensity:.18}));
    body.rotation.x=Math.PI/2;body.castShadow=true;group.add(body);
    const ring=new T.Mesh(new T.TorusGeometry(.29,.045,8,24),this.material(0xffec9b,.24,.65));group.add(ring);
    const dot=new T.Mesh(new T.SphereGeometry(.075,12,8),this.material(0xfff1b6,.3,.2));dot.position.z=.085;group.add(dot);
    this.scene.add(group);this.coins.push({x:x,y:y,z:z,got:false,mesh:group,phase:Math.random()*6});
  }
  addCloud(x,y,z,s=1){
    const group=new this.T.Group();group.position.set(x,y,z);
    const mat=this.material(0xffffff,1,0,{transparent:true,opacity:.78});
    [[0,0,0,2.2,0.65,1.2],[1.35,.2,0,1.7,.8,1.1],[-1.2,.12,.12,1.6,.65,1.1],[.25,.48,0,1.5,.65,1.1]].forEach(a=>{
      const m=new this.T.Mesh(new this.T.SphereGeometry(1,12,8),mat);m.position.set(a[0],a[1],a[2]);m.scale.set(a[3],a[4],a[5]);group.add(m);
    });
    group.scale.setScalar(s);this.scene.add(group);
  }
  buildPlatform(p,index){
    const base=this.addBox(p.x,p.h-.34,p.z,p.w,.68,p.d,p.color);
    const top=this.addBox(p.x,p.h-.015,p.z,p.w-.10,.06,p.d-.10,index%2?0xd9e9e7:0xe8f0f1,{castShadow:false});
    const trim=this.addBox(p.x,p.h-.40,p.z,p.w+.10,.12,p.d+.10,index%2?0x3f7e83:0x526d9b,{castShadow:false});
    this.platforms.push(p);
    return base;
  }
  buildWorld(){
    const T=this.T,g=this.game;
    if(g.type==='obby'){
      this.addPlane(600,600,-13,0x89b4d9);
      const platforms=[[0,0,8,8,0],[0,8,4.2,4.2,0],[4,14,3.7,3.7,1],[-2,20,4,4,1],[-5,27,4,4,0],[0,34,4,4,1],[5,41,4,4,1],[0,49,8,8,0]];
      platforms.forEach((v,i)=>this.buildPlatform({x:v[0],z:v[1],w:v[2],d:v[3],h:v[4],color:[0x5d9e90,0xe5a66a,0x7f83c9,0x68b9b0][i%4]},i));
      for(let i=0;i<10;i++){const p=this.platforms[Math.min(7,Math.floor(i*.8))];this.addCoin(p.x+(i%2?.8:-.8),p.h+1.15,p.z+(i%3-1)*1.35);}
      for(let i=0;i<20;i++)this.addCloud((i%5-2)*24, -2+(i%3)*2, 8+i*5,.9+(i%3)*.2);
      this.addBox(0,1.3,49,.35,2.6,.35,0xe9eef7);
      this.addBox(.85,2.25,49,1.6,.7,.12,0xffd16d);
      const flag=new T.Mesh(new T.BoxGeometry(.52,.38,.04),this.material(0x8b73ff));flag.position.set(.85,2.45,49.1);this.scene.add(flag);
      this.goal={x:0,z:49};
    }else if(g.type==='coin'){
      this.scene.background=new T.Color(0x79c5d0);this.scene.fog=new T.Fog(0x9ccfc3,55,115);
      this.addPlane(70,70,-.08,0x78a978);
      this.addBox(0,-.20,16,46,.35,48,0x827a66,{castShadow:false});
      this.addBox(0,-.005,16,12,.05,48,0x3c4651,{castShadow:false});
      for(let z=-5;z<42;z+=7){this.addBox(0,.03,z, .18,.035,3.1,0xf1d98c,{castShadow:false});}
      const buildings=[
        [-15,8,7,7,0x5d91ae],[-14,24,8,9,0xd08c69],[-7,34,6,7,0x6d8eaa],
        [14,7,8,8,0xb87978],[15,23,7,11,0x7b83b7],[8,36,8,7,0xd5b66b],
        [-15,-8,8,7,0x9a8bb9],[14,-8,7,6,0x5b9a91],[0,41,7,7,0x9d7cae]
      ];
      buildings.forEach((b,i)=>{
        const h=b[3],x=b[0],z=b[1],w=b[2],color=b[4];this.addBox(x,h/2,z,w,h,w*.85,color);
        this.addBox(x,h+.18,z,w+.3,.35,w*.9,0x39485b,{castShadow:false});
        for(let row=0;row<Math.floor(h/2);row++)for(let col=0;col<Math.max(1,Math.floor(w/2));col++){
          this.addBox(x-w/2+.8+col*1.8,1.25+row*1.8,z+w*.43,.68,.72,.055,0x9fe2e8,{castShadow:false,material:{emissive:0x24495a,emissiveIntensity:.2}});
        }
      });
      for(let i=0;i<10;i++){
        const x=(i%2?1:-1)*(10+(i%4)*2),z=3+Math.floor(i/2)*7;
        this.addBox(x,.65,z,.28,1.3,.28,0x75533d);
        const crown=new T.Mesh(new T.SphereGeometry(1.15,10,8),this.material(i%2?0x4a9b70:0x5da578));crown.position.set(x,1.8,z);crown.castShadow=true;this.scene.add(crown);
      }
      for(let i=0;i<19;i++)this.addCoin(((i*13)%34)-17,1.05,2+((i*7)%36));
      this.player={x:0,y:0,z:-2,vy:0,ground:true};
    }else if(g.type==='race'){
      this.scene.background=new T.Color(0x211b46);this.scene.fog=new T.Fog(0x46345f,90,310);
      this.addPlane(100,720,-.18,0x34304d);
      this.addBox(0,-.20,300,12,.4,650,0x252b42,{castShadow:false});
      this.addBox(-6.25,-.08,300,.5,.25,650,0x6a53a7,{castShadow:false});
      this.addBox(6.25,-.08,300,.5,.25,650,0x6a53a7,{castShadow:false,material:{emissive:0x542ad1,emissiveIntensity:.58}});
      this.addBox(-5.9,-.01,300,.12,.08,650,0x39e8ff,{castShadow:false,material:{emissive:0x21dfff,emissiveIntensity:.85}});
      this.addBox(5.9,-.01,300,.12,.08,650,0xed63ff,{castShadow:false,material:{emissive:0xd62dff,emissiveIntensity:.78}});
      for(let z=0;z<650;z+=8){
        this.addBox(-2,-.0,z,.09,.035,3.4,0x9e9bb7,{castShadow:false});
        this.addBox(2,-.0,z,.09,.035,3.4,0x9e9bb7,{castShadow:false});
        if(z%32===0){this.addBox(-8,.65,z,1.2,1.3,1.2,0x7355b3);this.addBox(8,.65,z+12,1.2,1.3,1.2,0x3e9ba8);}
      }
      for(let i=0;i<8;i++){
        const z=18+i*76;
        const side=i%2===0?-1:1;
        this.addNightLamp(side*7.5,z,i%2===0?0x38eaff:0xee63ff);
      }
      const starVertices=[];
      for(let i=0;i<150;i++){
        const a=Math.random()*Math.PI*2,rad=50+Math.random()*95,y=25+Math.random()*75;
        starVertices.push(Math.cos(a)*rad,y,Math.sin(a)*rad+120);
      }
      const starsGeo=new T.BufferGeometry();
      starsGeo.setAttribute('position',new T.Float32BufferAttribute(starVertices,3));
      this.scene.add(new T.Points(starsGeo,new T.PointsMaterial({color:0xe1e7ff,size:.55,transparent:true,opacity:.78,sizeAttenuation:true})));
      for(let i=0;i<110;i++){
        const lane=[-3.4,0,3.4][i%3],z=9+i*5.2;
        if(i%4!==2){const h=1.7+(i%2)*.5;const mesh=this.addBox(lane,h/2,z,1.9,h,1.6,i%2?0xdf61a7:0x63d6de);this.obstacles.push({x:lane,z,w:1.9,h:h,d:1.6,mesh});}
        if(i%3===0)this.addCoin([-3.4,0,3.4][(i+1)%3],1.2,z+1.5);
      }
      this.player={x:0,y:0,z:0,vy:0,ground:true};
    }else if(g.type==='brainrot'){
      this.scene.background=new T.Color(0x9dc9db);this.scene.fog=new T.Fog(0xb7d7df,65,150);
      this.addPlane(90,120,-.16,0x65a86d);
      this.addBox(0,-.05,-20,14,.45,12,0x3f8266);
      this.addBox(0,.22,-20,9,.08,8,0x83c7a0,{castShadow:false});
      for(let side of [-1,1]){this.addBox(side*15,.1,10,11,.35,12,side<0?0x9671ad:0xc47d90);this.addBox(side*15,1.05,4,.5,2.2,.5,0x684f69);this.addBox(side*15,1.05,16,.5,2.2,.5,0x684f69);}
      [[-17,8],[-12,22],[-7,34],[-2,44],[5,17],[11,9],[17,29],[15,47],[3,55],[-10,52],[-19,38],[20,53]].forEach((p,i)=>this.createBrainrot(p[0],p[1],i));
      for(let i=0;i<14;i++){const x=(i%2?1:-1)*(8+(i%4)*5),z=-8+i*4.2;this.addBox(x,.55,z,.45,1.1,.45,0x795c43);const tree=new T.Mesh(new T.SphereGeometry(1.25,10,8),this.material(i%2?0x478a59:0x579b65));tree.position.set(x,1.55,z);tree.castShadow=true;this.scene.add(tree);}
      this.player={x:0,y:0,z:-20,vy:0,ground:true};
    }else if(g.type==='egg'){
      this.scene.background=new T.Color(0x9dc9d9);this.scene.fog=new T.Fog(0xc3ded8,55,135);
      this.addPlane(100,115,-.18,0x6c9b67);
      this.addBox(0,-.02,-20,13,.42,11,0x826548);this.addBox(0,.23,-20,8,.12,7,0x9e805c,{castShadow:false});
      [[-17,-2],[-12,9],[-7,20],[0,31],[7,41],[13,51],[18,60],[14,34],[8,12],[1,55],[-9,43],[-16,28],[18,1],[-3,48]].forEach((p,i)=>this.createEgg(p[0],p[1],i));
      for(let i=0;i<18;i++){const x=(i%6-2.5)*6.8,z=3+Math.floor(i/6)*17;this.addBox(x,.75,z,.55,1.5,.55,0x77503b);const crown=new T.Mesh(new T.SphereGeometry(1.45,10,8),this.material(i%2?0x3e8052:0x5b9860));crown.position.set(x,2,z);crown.castShadow=true;this.scene.add(crown);}
      for(let i=0;i<6;i++)this.addBox((i-2.5)*4,.35,15+(i%2)*8,2.2,.7,.55,0x927a5c);
      this.player={x:0,y:0,z:-20,vy:0,ground:true};
    }else if(g.type==='boat'){
      this.scene.background=new T.Color(0x78bdd2);this.scene.fog=new T.Fog(0x91ced9,75,260);
      this.addPlane(160,520,-1.05,0x2e91ac);
      const waterMat=this.material(0x4baabd,.28,.22,{transparent:true,opacity:.86});const water=new T.Mesh(new T.PlaneGeometry(160,520),waterMat);water.rotation.x=-Math.PI/2;water.position.set(0,-.95,180);water.receiveShadow=true;this.scene.add(water);
      this.addBox(0,-.35,-11,38,.8,35,0xc9ad78);this.addBox(0,-.02,-11,28,.1,27,0xd8c18b,{castShadow:false});this.addBox(0,.02,-22,14,.3,5,0x76563a);
      [[-14,-22],[-9,-16],[-4,-8],[3,-19],[10,-12],[15,-5],[-13,-2],[12,-24],[-7,-25],[6,-1],[-1,-13],[14,-19],[18,-9],[-17,-14]].forEach((p,i)=>this.createWoodPickup(p[0],p[1],i));
      for(let i=0;i<18;i++)this.addCoin([-4,0,4][i%3],.95,14+i*12);
      for(let i=0;i<22;i++){const lane=[-5.1,5.1,0,5.3,-4.8,0][i%6],z=25+i*9.8,radius=1.05+(i%3)*.18;const rock=new T.Mesh(new T.DodecahedronGeometry(radius,1),this.material(i%2?0x777d83:0x8b8983,.95));rock.position.set(lane,.25,z);rock.rotation.set(i*.3,i*.7,i*.18);rock.castShadow=true;rock.receiveShadow=true;this.scene.add(rock);this.obstacles.push({x:lane,z,w:radius*1.8,h:radius*1.8,d:radius*1.8,mesh:rock});}
      for(let x of [-8,8])for(let z=10;z<220;z+=35)this.addBox(x,.25,z,1.4,.5,1.4,0x6f9872);
      this.addBox(0,.15,220,10,.4,4,0x8c6540);this.addBox(0,1.05,220,3.6,1.5,2.3,0xc68e36);this.addBox(0,1.85,220,3.3,.28,2.1,0xf0c963);
      this.player={x:0,y:0,z:-20,vy:0,ground:true};this.boatPhase='gather';this.woodCount=0;this.boatHealth=3;
    }
  }
  createBrainrot(x,z,index){
    const T=this.T,palette=[0xff8c69,0x8c7dff,0x63c9a5,0xf2c35d,0xf07db2,0x77b8e8],group=new T.Group();group.position.set(x,.62,z);
    const body=new T.Mesh(new T.IcosahedronGeometry(.66,1),this.material(palette[index%palette.length],.72,.03));body.scale.set(1.05,.86,.9);body.castShadow=true;group.add(body);
    const belly=new T.Mesh(new T.SphereGeometry(.36,12,10),this.material(0xffe4bd));belly.position.set(0,-.12,.42);belly.scale.set(1,.82,.35);group.add(belly);
    for(let side of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.095,10,8),this.material(0xffffff));eye.position.set(side*.22,.18,.54);group.add(eye);const pupil=new T.Mesh(new T.SphereGeometry(.045,8,6),this.material(0x202235));pupil.position.set(side*.22,.17,.625);group.add(pupil);const horn=new T.Mesh(new T.ConeGeometry(.16,.38,6),this.material(index%2?0x4f476a:0x7d563c));horn.position.set(side*.4,.68,0);horn.rotation.z=side*-.32;group.add(horn);}
    for(let side of [-1,1]){const foot=new T.Mesh(new T.BoxGeometry(.22,.27,.34),this.material(0x4c3d4d));foot.position.set(side*.27,-.57,.08);group.add(foot);}
    this.scene.add(group);this.stealables.push({x,z,mesh:group,got:false,index});
  }
  createEgg(x,z,index){
    const T=this.T,group=new T.Group();group.position.set(x,.72,z);const colors=[0xffd56b,0x8cbbff,0xe6a5ce,0x9fd8a8,0xc4a4ef,0xf4a27d];
    const shell=new T.Mesh(new T.SphereGeometry(.48,18,14),this.material(colors[index%colors.length],.43,.06));shell.scale.set(.78,1.18,.78);shell.castShadow=true;group.add(shell);
    const stripe=new T.Mesh(new T.TorusGeometry(.34,.055,8,22),this.material(0xfff0c2,.36,.12));stripe.rotation.x=Math.PI/2;stripe.position.y=-.04;group.add(stripe);
    for(let k=0;k<3;k++){const spot=new T.Mesh(new T.SphereGeometry(.055,8,6),this.material(0xffffff,.42,.04));spot.position.set((k-1)*.16,.12,.32);group.add(spot);}
    this.scene.add(group);this.eggItems.push({x,z,mesh:group,got:false,index});
  }
  createWoodPickup(x,z,index){
    const T=this.T,group=new T.Group();group.position.set(x,.25,z);group.rotation.y=(index%3)*.37;
    for(let k=0;k<3;k++){const plank=new T.Mesh(new T.BoxGeometry(1.25,.16,.28),this.material(k===1?0xb57c43:0x946038,.94));plank.position.set((k-1)*.08,k*.13,(k-1)*.12);plank.rotation.y=(k-1)*.12;plank.castShadow=true;group.add(plank);}
    this.scene.add(group);this.woodPickups.push({x,z,mesh:group,got:false});
  }
  addCarryVisual(kind,index){
    const T=this.T,palette=[0xff8c69,0x8c7dff,0x63c9a5,0xf2c35d,0xf07db2,0x77b8e8];let mesh;
    if(kind==='egg'){mesh=new T.Mesh(new T.SphereGeometry(.20,10,8),this.material([0xffd56b,0x8cbbff,0xe6a5ce,0x9fd8a8][index%4]));mesh.scale.y=1.25;}
    else mesh=new T.Mesh(new T.IcosahedronGeometry(.22,1),this.material(palette[index%palette.length]));
    const col=index%3,row=Math.floor(index/3);mesh.position.set((col-1)*.38,3+row*.35,.12);mesh.castShadow=true;this.avatar.add(mesh);this.carriedVisuals.push(mesh);
  }
  clearCarriedVisuals(){this.carriedVisuals.forEach(m=>{this.avatar.remove(m);if(m.geometry)m.geometry.dispose();if(m.material)m.material.dispose();});this.carriedVisuals=[];}
  buildBoat(){
    const T=this.T;if(this.boatGroup)this.scene.remove(this.boatGroup);
    const group=new T.Group(),wood=this.material(0x98633d,.9),lightWood=this.material(0xc28b50,.88),dark=this.material(0x62442f,.92);
    const part=(geometry,mat,x,y,z,rx=0,ry=0,rz=0)=>{const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
    part(new T.BoxGeometry(3.8,.58,6.4),dark,0,-.35,0);part(new T.ConeGeometry(1.9,2.2,4),wood,0,-.28,3.55,Math.PI/2,Math.PI/4,0);
    for(let i=0;i<8;i++)part(new T.BoxGeometry(.47,.18,6.1),i%2?wood:lightWood,-1.65+i*.47,.04,0);
    part(new T.BoxGeometry(.18,.48,6.1),dark,-2,.12,0);part(new T.BoxGeometry(.18,.48,6.1),dark,2,.12,0);
    part(new T.BoxGeometry(4.1,.16,.24),lightWood,0,.34,-2.8);part(new T.BoxGeometry(4.1,.16,.24),lightWood,0,.34,2.8);
    part(new T.CylinderGeometry(.12,.15,4.8,8),dark,0,2.7,-.25);
    part(new T.PlaneGeometry(2.8,3.2),new T.MeshStandardMaterial({color:0xf2e5bd,side:T.DoubleSide,roughness:.9}),0,2.85,-.18);
    part(new T.BoxGeometry(.8,.42,.06),this.material(0x7956ba),.45,4.85,-.22,0,0,-.15);
    this.boatGroup=group;group.position.set(this.player.x,-.08,this.player.z);this.scene.add(group);
  }
  handleAction(){
    if(this.game.type!=='boat')return;
    const button=$('boatActionButton'),status=$('boatActionText');
    if(this.boatPhase==='gather'&&this.woodCount>=10){
      this.buildBoat();this.boatPhase='built';button.disabled=false;button.textContent='Lanzar barco';
      status.textContent='¡Barco terminado! Pulsa para navegar hasta el cofre.';$('stageTip').textContent='Barco listo: lánzate al río';
    }else if(this.boatPhase==='built'){
      this.boatPhase='sail';this.player.x=0;this.player.y=0;this.player.z=-4;this.player.vy=0;this.boatGroup.position.set(0,-.08,-4);button.hidden=true;
      status.textContent='¡A navegar!';$('stageTip').textContent='Esquiva las rocas y consigue 8 tesoros';
    }
    this.updateHud();
  }
  createAvatar(){
    const T=this.T;this.avatar=new T.Group();this.avatar.name='AbloxPlayer';
    const part=(parent,w,h,d,color,x,y,z)=>{
      const m=new T.Mesh(new T.BoxGeometry(w,h,d),this.material(color,.72,.02));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
    };
    part(this.avatar,.82,1.05,.53,0x466ed0,0,1.18,0);
    part(this.avatar,.68,.68,.65,0xf1bf8e,0,2.08,0);
    part(this.avatar,.72,.18,.69,0x3a3441,0,2.48,0);
    part(this.avatar,.10,.10,.045,0x202638,-.15,2.13,.337);
    part(this.avatar,.10,.10,.045,0x202638,.15,2.13,.337);
    part(this.avatar,.19,.055,.04,0x9b4f52,0,1.92,.34);
    const baconMat=this.material(0x874a32,.78,.02),baconLight=this.material(0xa75d3b,.74,.02);
    const cap=new T.Mesh(new T.SphereGeometry(.39,12,9),baconMat);cap.scale.set(1.02,.42,.96);cap.position.set(0,2.52,0);cap.castShadow=true;this.avatar.add(cap);
    const locks=[
      [[-.28,2.55,.18],[-.38,2.68,.20],[-.27,2.72,.25],[-.32,2.35,.34],[-.25,2.12,.36]],
      [[-.10,2.60,.23],[-.02,2.76,.26],[.08,2.70,.29],[.03,2.38,.37],[.13,2.17,.36]],
      [[.14,2.59,.18],[.28,2.73,.12],[.37,2.64,.15],[.30,2.35,.34],[.36,2.14,.32]],
      [[-.34,2.48,-.05],[-.52,2.53,-.16],[-.54,2.38,-.27],[-.47,2.12,-.25]],
      [[.34,2.48,-.04],[.50,2.55,-.13],[.53,2.38,-.23],[.48,2.13,-.21]],
      [[-.22,2.61,-.19],[-.22,2.72,-.28],[-.10,2.68,-.35],[-.02,2.54,-.38]],
      [[.18,2.61,-.18],[.28,2.72,-.24],[.33,2.62,-.32],[.17,2.51,-.38]]
    ];
    locks.forEach((points,i)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[1],p[2])));const strand=new T.Mesh(new T.TubeGeometry(curve,16,.075,6,false),i%3===0?baconLight:baconMat);strand.castShadow=true;this.avatar.add(strand);});
    this.leftArm=new T.Group();this.leftArm.position.set(-.52,1.62,0);this.avatar.add(this.leftArm);part(this.leftArm,.25,.78,.28,0xf1bf8e,0,-.38,0);
    this.rightArm=new T.Group();this.rightArm.position.set(.52,1.62,0);this.avatar.add(this.rightArm);part(this.rightArm,.25,.78,.28,0xf1bf8e,0,-.38,0);
    this.leftLeg=new T.Group();this.leftLeg.position.set(-.22,.72,0);this.avatar.add(this.leftLeg);part(this.leftLeg,.30,.76,.34,0x283b78,0,-.36,0);
    this.rightLeg=new T.Group();this.rightLeg.position.set(.22,.72,0);this.avatar.add(this.rightLeg);part(this.rightLeg,.30,.76,.34,0x283b78,0,-.36,0);
    this.scene.add(this.avatar);
    const shadow=new T.Mesh(new T.CircleGeometry(.68,24),new T.MeshBasicMaterial({color:0x152238,transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;this.scene.add(shadow);this.playerShadow=shadow;
  }
  fit(){
    const r=this.canvas.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(1,r.height);
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  updateJoystick(e){
    if(!this.joystickElement)return;
    const r=this.joystickElement.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.34,len=Math.hypot(dx,dy);
    if(len>max){dx=dx/len*max;dy=dy/len*max;}
    this.joystick.x=dx/max;this.joystick.y=-dy/max;
    if(this.joystickNub)this.joystickNub.style.transform='translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px))';
  }
  onKey(e,down){
    if(document.getElementById('gameView').hidden)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
    const key=e.key===' '?'Space':e.key.length===1?e.key.toLowerCase():e.key;
    if(key==='Escape'&&down){this.togglePause();return;}this.keys[key]=down;
  }
  onPointerDown(e){
    if(e.button!==undefined&&e.button!==0)return;
    this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointerPositions.size===1){this.dragging=true;this.lastPointer={x:e.clientX,y:e.clientY};this.canvas.style.cursor='grabbing';}
    if(this.pointerPositions.size===2){const a=Array.from(this.pointerPositions.values());this.pinchDistance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
    try{this.canvas.setPointerCapture(e.pointerId);}catch(err){}
  }
  onPointerMove(e){
    if(!this.pointerPositions.has(e.pointerId))return;
    const prev=this.pointerPositions.get(e.pointerId);this.pointerPositions.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointerPositions.size>=2){
      const a=Array.from(this.pointerPositions.values());const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
      if(this.pinchDistance>0)this.distance=Math.max(5,Math.min(19,this.distance+(this.pinchDistance-d)*.035));
      this.pinchDistance=d;return;
    }
    if(this.dragging){const dx=e.clientX-prev.x,dy=e.clientY-prev.y;this.yaw-=dx*.006;this.pitch=Math.max(.10,Math.min(1.12,this.pitch+dy*.0045));}
  }
  onPointerUp(e){this.pointerPositions.delete(e.pointerId);if(this.pointerPositions.size===0){this.dragging=false;this.canvas.style.cursor='grab';this.pinchDistance=0;}else if(this.pointerPositions.size===1){const a=Array.from(this.pointerPositions.values())[0];this.lastPointer=a;this.dragging=true;}}
  onWheel(e){e.preventDefault();this.distance=Math.max(5,Math.min(19,this.distance+e.deltaY*.012));}
  resetCamera(){this.yaw=0;this.pitch=.30;this.distance=10.5;}
  togglePause(){
    if(this.messageShown)return;this.paused=!this.paused;$('pauseOverlay').hidden=!this.paused;
    if(!this.paused){this.last=performance.now();if(!this.running)this.start();}
  }
  resetState(){
    this.elapsed=0;this.score=0;this.coinsCollected=0;this.messageShown=false;this.paused=false;this.flash=0;
    this.carriedCount=0;this.deliveredCount=0;this.woodCount=0;this.boatPhase='gather';this.boatHealth=3;this.boatHitCooldown=0;this.joystick.x=0;this.joystick.y=0;
    this.clearCarriedVisuals();
    const starts={coin:[0,-2],brainrot:[0,-20],egg:[0,-20],boat:[0,-20],obby:[0,0],race:[0,0]};
    const pos=starts[this.game.type]||[0,0];this.player={x:pos[0],y:0,z:pos[1],vy:0,ground:true};
    this.coins.forEach(c=>{c.got=false;c.mesh.visible=true;});this.stealables.forEach(c=>{c.got=false;c.mesh.visible=true;});
    this.eggItems.forEach(c=>{c.got=false;c.mesh.visible=true;});this.woodPickups.forEach(c=>{c.got=false;c.mesh.visible=true;});
    if(this.boatGroup){this.scene.remove(this.boatGroup);this.boatGroup=null;}
    if(this.game.type==='boat'){$('boatActionButton').hidden=false;$('boatActionButton').disabled=true;$('boatActionButton').textContent='Construir barco';$('boatActionText').textContent='Recoge 10 tablones por la playa.';}
    this.resetCamera();$('gameMessage').hidden=true;$('pauseOverlay').hidden=true;this.updateHud();this.updateAvatar(0,false);this.updateCamera(1);
  }
  restart(){cancelAnimationFrame(this.raf);this.running=false;this.keys={};this.resetState();this.start();}
  start(){if(this.running)return;this.running=true;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.loop(t));}
  destroy(){
    this.running=false;cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('resize',this.resize);
    this.canvas.removeEventListener('pointerdown',this.pointerDown);window.removeEventListener('pointermove',this.pointerMove);window.removeEventListener('pointerup',this.pointerUp);window.removeEventListener('pointercancel',this.pointerUp);this.canvas.removeEventListener('wheel',this.wheel);
    this.touchButtons.forEach(b=>{b.removeEventListener('pointerdown',this.touchStart);b.removeEventListener('pointerup',this.touchEnd);b.removeEventListener('pointercancel',this.touchEnd);b.removeEventListener('pointerleave',this.touchEnd);});
    if(this.joystickElement){this.joystickElement.removeEventListener('pointerdown',this.joystickDown);this.joystickElement.removeEventListener('pointermove',this.joystickMove);this.joystickElement.removeEventListener('pointerup',this.joystickUp);this.joystickElement.removeEventListener('pointercancel',this.joystickUp);}
    this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
    this.renderer.dispose();
  }
  loop(t){
    if(!this.running)return;const dt=Math.min((t-this.last)/1000,.04);this.last=t;
    if(!this.paused&&!this.messageShown)this.update(dt);
    this.updateCamera(Math.min(1,dt*9));this.animateWorld(dt);
    this.renderer.render(this.scene,this.camera);
    if(this.running)this.raf=requestAnimationFrame(tt=>this.loop(tt));
  }
  update(dt){
    this.elapsed+=dt;const p=this.player,oldY=p.y;
    const left=this.keys.a||this.keys.ArrowLeft,right=this.keys.d||this.keys.ArrowRight,forward=this.keys.w||this.keys.ArrowUp,back=this.keys.s||this.keys.ArrowDown,jump=this.keys.Space;
    const inputX=Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+this.joystick.x));
    const inputZ=Math.max(-1,Math.min(1,(forward?1:0)-(back?1:0)+this.joystick.y));
    const length=Math.hypot(inputX,inputZ)||1;let moveX=0,moveZ=0;
    if(this.game.type==='race'){p.z+=dt*13;moveX=inputX; p.x+=(-moveX*Math.cos(this.yaw))*9*dt;p.x=Math.max(-3.7,Math.min(3.7,p.x));}
    else if(this.game.type==='boat'&&this.boatPhase==='sail'){p.z+=dt*8.6;moveX=-inputX;p.x+=moveX*7.5*dt;p.x=Math.max(-6.5,Math.min(6.5,p.x));p.y=0;p.vy=0;p.ground=true;}
    else if(this.game.type==='boat'&&this.boatPhase==='built'){p.y=0;p.vy=0;p.ground=true;}
    else{
      const c=Math.cos(this.yaw),sn=Math.sin(this.yaw);moveX=-(inputX/length)*c-(inputZ/length)*sn;moveZ=-(inputX/length)*sn+(inputZ/length)*c;
      const speed=8;p.x+=moveX*speed*dt;p.z+=moveZ*speed*dt;
      if(this.game.type==='coin'){p.x=Math.max(-20,Math.min(20,p.x));p.z=Math.max(-5,Math.min(45,p.z));}
      if(this.game.type==='brainrot'||this.game.type==='egg'){p.x=Math.max(-23,Math.min(23,p.x));p.z=Math.max(-24,Math.min(62,p.z));}
      if(this.game.type==='boat'&&this.boatPhase==='gather'){p.x=Math.max(-18,Math.min(18,p.x));p.z=Math.max(-28,Math.min(-1,p.z));}
    }
    this.lastMoveX=moveX;this.lastMoveZ=moveZ;
    if(jump&&p.ground){p.vy=10.5;p.ground=false;}
    if(this.game.type!=='race'&&!(this.game.type==='boat'&&(this.boatPhase==='built'||this.boatPhase==='sail'))){
      p.vy-=25*dt;p.y+=p.vy*dt;
      if(this.game.type==='obby'&&p.vy<=0){
        for(const a of this.platforms){if(p.x>a.x-a.w/2+.15&&p.x<a.x+a.w/2-.15&&p.z>a.z-a.d/2+.15&&p.z<a.z+a.d/2-.15&&oldY>=a.h-.09&&p.y<=a.h){p.y=a.h;p.vy=0;p.ground=true;break;}}
        if(p.y< -9){p.x=0;p.y=0;p.z=0;p.vy=0;p.ground=true;this.flash=.45;}
      }else if(['coin','brainrot','egg','boat'].includes(this.game.type)&&p.y<0){p.y=0;p.vy=0;p.ground=true;}
    }
    if(this.game.type==='race'){
      for(const o of this.obstacles)if(Math.abs(p.x-o.x)<1.3&&Math.abs(p.z-o.z)<1.35&&p.y<o.h){this.end(false,'¡Te chocaste!','Prueba otra vez y cambia de carril para esquivar los bloques.');return;}
      if(this.elapsed>=65){this.end(true,'¡Carrera completada!','Terminaste el circuito nocturno completo. ¡Nuevo récord!');return;}
    }
    if(this.game.type==='boat'&&this.boatPhase==='sail'){
      this.boatHitCooldown=Math.max(0,this.boatHitCooldown-dt);
      for(const o of this.obstacles)if(this.boatHitCooldown<=0&&Math.abs(p.x-o.x)<1.65&&Math.abs(p.z-o.z)<1.65){
        this.boatHealth--;this.boatHitCooldown=1.15;p.z=Math.max(-4,p.z-1.4);this.flash=.35;
        if(this.boatHealth<=0){this.end(false,'¡El barco se rompió!','Las rocas dañaron el casco. Reúne madera, reconstruye tu barco y vuelve a intentarlo.');return;}break;
      }
      if(this.boatGroup){this.boatGroup.position.set(p.x,-.08,p.z);this.boatGroup.rotation.z=-inputX*.08;this.boatGroup.rotation.x=Math.sin(this.elapsed*2)*.018;}
    }
    if(this.game.type==='boat'&&this.boatPhase==='gather'){
      for(const item of this.woodPickups)if(!item.got&&Math.hypot(p.x-item.x,p.z-item.z)<1.45){item.got=true;item.mesh.visible=false;this.woodCount++;this.score+=5;}
      if(this.woodCount>=10){$('boatActionButton').disabled=false;$('boatActionText').textContent='Ya tienes 10 tablones. ¡Construye tu barco!';$('stageTip').textContent='¡Madera completa! Construye tu barco';}
      else{$('boatActionButton').disabled=true;$('boatActionText').textContent='Recoge tablones: '+this.woodCount+' / 10';$('stageTip').textContent='Explora la playa y recoge 10 tablones';}
    }
    if(this.game.type==='brainrot'){
      for(const item of this.stealables)if(!item.got&&this.carriedCount<6&&Math.hypot(p.x-item.x,p.z-item.z)<1.65){item.got=true;item.mesh.visible=false;this.carriedCount++;this.score+=25;this.addCarryVisual('brainrot',this.carriedCount-1);}
      if(this.carriedCount>=6)$('stageTip').textContent='¡Tienes 6 criaturas! Vuelve a tu base azul';
      if(this.carriedCount>0&&Math.hypot(p.x,p.z+20)<6.5){this.deliveredCount+=this.carriedCount;this.clearCarriedVisuals();this.carriedCount=0;if(this.deliveredCount>=6){this.end(true,'¡Base llena!','Robaste y entregaste seis criaturas originales. ¡Tu colección está completa!');return;}}
    }
    if(this.game.type==='egg'){
      for(const item of this.eggItems)if(!item.got&&this.carriedCount<8&&Math.hypot(p.x-item.x,p.z-item.z)<1.55){item.got=true;item.mesh.visible=false;this.carriedCount++;this.score+=20;this.addCarryVisual('egg',this.carriedCount-1);}
      if(this.carriedCount>=8)$('stageTip').textContent='¡Tienes 8 huevos! Regresa al incubador';
      if(this.carriedCount>0&&Math.hypot(p.x,p.z+20)<6.5){this.deliveredCount+=this.carriedCount;this.clearCarriedVisuals();this.carriedCount=0;if(this.deliveredCount>=8){this.end(true,'¡Incubadora completa!','Recuperaste ocho huevos y los llevaste a la incubadora.');return;}}
    }
    if(['coin','race','boat'].includes(this.game.type))for(const coin of this.coins)if(!coin.got&&Math.hypot(p.x-coin.x,p.z-coin.z)<1.25&&Math.abs(p.y+1-coin.y)<2.2){coin.got=true;coin.mesh.visible=false;this.coinsCollected++;this.score+=10;}
    if(this.game.type==='obby'&&p.z>107&&p.x>-4&&p.x<4&&p.y>=-.1){this.end(true,'¡Obby completado!','Llegaste a la isla final tras superar todas las plataformas y recoger monedas.');return;}
    if(this.game.type==='coin'&&this.coinsCollected>=25){this.end(true,'¡Ciudad explorada!','Encontraste 25 monedas en toda la ciudad. ¡Exploración completada!');return;}
    if(this.game.type==='coin'&&this.elapsed>180){this.end(this.coinsCollected>=18,this.coinsCollected>=18?'¡Buen recorrido!':'¡Se acabó el tiempo!','Recogiste '+this.coinsCollected+' de 25 monedas.');return;}
    if(this.game.type==='boat'&&this.boatPhase==='sail'){
      if(p.z>=205&&this.coinsCollected>=8){this.end(true,'¡Tesoro encontrado!','Reuniste tablones, construiste tu barco y llegaste al cofre con '+this.coinsCollected+' tesoros.');return;}
      if(p.z>=245){this.end(false,'¡Llegaste al final del río!','Necesitabas al menos ocho tesoros. Intenta otra ruta y recoge más cofres.');return;}
    }
    this.score=Math.max(this.score,Math.floor(this.elapsed*(this.game.type==='race'?10:2))+this.coinsCollected*10+this.deliveredCount*30);
    this.saveBest();this.updateHud();this.updateAvatar(dt,this.game.type==='race'||(this.game.type==='boat'&&this.boatPhase==='sail')||Math.hypot(moveX,moveZ)>.05);
  }
  updateHud(){
    if(this.game.type==='race'){$('hudLabel').textContent='TIEMPO';$('hudValue').textContent=Math.floor(this.elapsed)+' / 65 s';}
    else if(this.game.type==='obby'){$('hudLabel').textContent='MONEDAS';$('hudValue').textContent=this.coinsCollected+' / 24';}
    else if(this.game.type==='coin'){$('hudLabel').textContent='MONEDAS';$('hudValue').textContent=this.coinsCollected+' / 25';}
    else if(this.game.type==='brainrot'){$('hudLabel').textContent='CRIATURAS';$('hudValue').textContent=this.deliveredCount+' entregadas · '+this.carriedCount+' contigo';}
    else if(this.game.type==='egg'){$('hudLabel').textContent='HUEVOS';$('hudValue').textContent=this.deliveredCount+' incubados · '+this.carriedCount+' contigo';}
    else if(this.game.type==='boat'){if(this.boatPhase==='sail'){$('hudLabel').textContent='TESOROS · CASCO '+this.boatHealth+'/3';$('hudValue').textContent=this.coinsCollected+' / 8';}else{$('hudLabel').textContent='MADERA';$('hudValue').textContent=this.woodCount+' / 10 tablones';}}
    $('bestValue').textContent=this.best;
  }
  updateAvatar(dt,moving){
    const p=this.player;this.avatar.position.set(p.x,p.y,p.z);
    if(Math.hypot(this.lastMoveX||0,this.lastMoveZ||0)>.05)this.avatar.rotation.y=Math.atan2(this.lastMoveX,this.lastMoveZ);
    else if(this.game.type==='race')this.avatar.rotation.y=0;
    this.animPhase=(this.animPhase||0)+(moving?dt*12:dt*2);
    const swing=moving?Math.sin(this.animPhase)*.48:Math.sin(this.animPhase)*.025;
    this.leftLeg.rotation.x=swing;this.rightLeg.rotation.x=-swing;this.leftArm.rotation.x=-swing*.8;this.rightArm.rotation.x=swing*.8;
    this.playerShadow.position.set(p.x,.018,p.z);this.playerShadow.scale.setScalar(Math.max(.55,1-p.y*.06));
  }
  updateCamera(alpha){
    const p=this.player,target=new this.T.Vector3(p.x,p.y+1.25,p.z);
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
    const desired=new this.T.Vector3(target.x+Math.sin(this.yaw)*this.distance*cp,target.y+this.distance*sp,target.z-Math.cos(this.yaw)*this.distance*cp);
    this.camera.position.lerp(desired,alpha);this.camera.lookAt(target);
  }
  animateWorld(dt){
    this.coins.forEach(c=>{if(!c.got){c.mesh.rotation.y+=dt*2.2;c.mesh.position.y=c.y+Math.sin(this.elapsed*3+c.phase)*.12;}});
    this.stealables.forEach((c,i)=>{if(!c.got)c.mesh.position.y=.62+Math.sin(this.elapsed*2+i)*.10;});
    this.eggItems.forEach((c,i)=>{if(!c.got)c.mesh.rotation.z=Math.sin(this.elapsed*1.4+i)*.05;});
    this.woodPickups.forEach(c=>{if(!c.got)c.mesh.rotation.y+=dt*.45;});
    if(this.boatGroup&&this.boatPhase==='sail')this.boatGroup.position.y=-.08+Math.sin(this.elapsed*2)*.08;
    if(this.flash>0)this.flash=Math.max(0,this.flash-dt);
  }
  end(win,title,desc){
    this.messageShown=true;this.saveBest();$('messageIcon').textContent=win?'🏆':'💫';
    $('messageTitle').textContent=title;$('messageText').textContent=desc;$('gameMessage').hidden=false;
  }
}
window.Ablox3DEngine=Ablox3DEngine;
})();