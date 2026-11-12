/* Ablox 3D engine — Three.js scene, third-person orbit camera and original game worlds. */
(function(){
'use strict';
const T=window.THREE;
if(!T){window.Ablox3DEngine=class{constructor(){throw new Error('No se pudo cargar Three.js. Comprueba tu conexión e inténtalo de nuevo.')}};return;}
class Ablox3DEngine{
  constructor(canvas,game){
    this.T=T;this.canvas=canvas;this.game=game;this.keys={};this.running=false;this.paused=false;this.messageShown=false;
    this.raf=0;this.last=0;this.elapsed=0;this.score=0;this.coinsCollected=0;this.flash=0;this.distance=10.5;
    this.yaw=0;this.pitch=.30;this.dragging=false;this.pointerPositions=new Map();this.pinchDistance=0;
    this.player={x:0,y:0,z:0,vy:0,ground:true};this.platforms=[];this.coins=[];this.obstacles=[];
    this.best=this.readBest();
    this.scene=new T.Scene();
    this.scene.background=new T.Color(game.type==='race'?0x211b46:game.type==='coin'?0x7ec9cf:0x92b5e9);
    this.scene.fog=new T.Fog(game.type==='race'?0x40345f:game.type==='coin'?0x9ccfc3:0xb6c9e9,game.type==='race'?75:game.type==='coin'?65:72,game.type==='race'?260:game.type==='coin'?110:190);
    this.camera=new T.PerspectiveCamera(62,1,.1,800);
    this.renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    if('outputEncoding' in this.renderer)this.renderer.outputEncoding=T.sRGBEncoding;
    this.renderer.setClearColor(this.scene.background);
    this.addLights();this.buildWorld();this.createAvatar();this.fit();
    this.keyDown=e=>this.onKey(e,true);this.keyUp=e=>this.onKey(e,false);
    this.resize=()=>this.fit();
    this.pointerDown=e=>this.onPointerDown(e);this.pointerMove=e=>this.onPointerMove(e);
    this.pointerUp=e=>this.onPointerUp(e);this.wheel=e=>this.onWheel(e);
    window.addEventListener('keydown',this.keyDown);window.addEventListener('keyup',this.keyUp);
    window.addEventListener('resize',this.resize);
    canvas.addEventListener('pointerdown',this.pointerDown);window.addEventListener('pointermove',this.pointerMove);
    window.addEventListener('pointerup',this.pointerUp);window.addEventListener('pointercancel',this.pointerUp);
    canvas.addEventListener('wheel',this.wheel,{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.touchButtons=Array.from(document.querySelectorAll('[data-key]'));
    this.touchStart=e=>{e.preventDefault();this.keys[e.currentTarget.dataset.key]=true;};
    this.touchEnd=e=>{e.preventDefault();this.keys[e.currentTarget.dataset.key]=false;};
    this.touchButtons.forEach(b=>{b.addEventListener('pointerdown',this.touchStart);b.addEventListener('pointerup',this.touchEnd);b.addEventListener('pointercancel',this.touchEnd);b.addEventListener('pointerleave',this.touchEnd);});
    $('bestValue').textContent=this.best;this.updateHud();this.updateCamera(1);
  }
  readBest(){try{return Number(localStorage.getItem('ablox-best-'+this.game.id)||0);}catch(e){return 0;}}
  saveBest(){if(this.score>this.best){this.best=this.score;try{localStorage.setItem('ablox-best-'+this.game.id,String(this.best));}catch(e){}$('bestValue').textContent=this.best;}}
  addLights(){
    const T=this.T;
    this.scene.add(new T.HemisphereLight(0xeaf4ff,0x53616c,1.45));
    const sun=new T.DirectionalLight(0xfff4df,2.0);sun.position.set(-18,28,-12);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-45;sun.shadow.camera.right=45;sun.shadow.camera.top=45;sun.shadow.camera.bottom=-45;sun.shadow.camera.near=.5;sun.shadow.camera.far=180;
    this.scene.add(sun);
    const fill=new T.DirectionalLight(0x9ebcff,.65);fill.position.set(15,12,25);this.scene.add(fill);
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
      this.addBox(6.25,-.08,300,.5,.25,650,0x6a53a7,{castShadow:false});
      for(let z=0;z<650;z+=8){
        this.addBox(-2,-.0,z,.09,.035,3.4,0x9e9bb7,{castShadow:false});
        this.addBox(2,-.0,z,.09,.035,3.4,0x9e9bb7,{castShadow:false});
        if(z%32===0){this.addBox(-8,.65,z,1.2,1.3,1.2,0x7355b3);this.addBox(8,.65,z+12,1.2,1.3,1.2,0x3e9ba8);}
      }
      for(let i=0;i<110;i++){
        const lane=[-3.4,0,3.4][i%3],z=9+i*5.2;
        if(i%4!==2){const h=1.7+(i%2)*.5;const mesh=this.addBox(lane,h/2,z,1.9,h,1.6,i%2?0xdf61a7:0x63d6de);this.obstacles.push({x:lane,z,w:1.9,h:h,d:1.6,mesh});}
        if(i%3===0)this.addCoin([-3.4,0,3.4][(i+1)%3],1.2,z+1.5);
      }
      this.player={x:0,y:0,z:0,vy:0,ground:true};
    }
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
    this.player=this.game.type==='coin'?{x:0,y:0,z:-2,vy:0,ground:true}:{x:0,y:0,z:0,vy:0,ground:true};
    this.coins.forEach(c=>{c.got=false;c.mesh.visible=true;});this.resetCamera();
    $('gameMessage').hidden=true;$('pauseOverlay').hidden=true;this.updateHud();this.updateAvatar(0,false);this.updateCamera(1);
  }
  restart(){cancelAnimationFrame(this.raf);this.running=false;this.keys={};this.resetState();this.start();}
  start(){if(this.running)return;this.running=true;this.last=performance.now();this.raf=requestAnimationFrame(t=>this.loop(t));}
  destroy(){
    this.running=false;cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown',this.keyDown);window.removeEventListener('keyup',this.keyUp);window.removeEventListener('resize',this.resize);
    this.canvas.removeEventListener('pointerdown',this.pointerDown);window.removeEventListener('pointermove',this.pointerMove);window.removeEventListener('pointerup',this.pointerUp);window.removeEventListener('pointercancel',this.pointerUp);this.canvas.removeEventListener('wheel',this.wheel);
    this.touchButtons.forEach(b=>{b.removeEventListener('pointerdown',this.touchStart);b.removeEventListener('pointerup',this.touchEnd);b.removeEventListener('pointercancel',this.touchEnd);b.removeEventListener('pointerleave',this.touchEnd);});
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
    const left=this.keys.a||this.keys.ArrowLeft,right=this.keys.d||this.keys.ArrowRight;
    const forward=this.keys.w||this.keys.ArrowUp,back=this.keys.s||this.keys.ArrowDown,jump=this.keys.Space;
    const inputX=(right?1:0)-(left?1:0),inputZ=(forward?1:0)-(back?1:0),length=Math.hypot(inputX,inputZ)||1;
    let moveX=0,moveZ=0;
    if(this.game.type==='race'){
      p.z+=dt*13;moveX=inputX;moveZ=0;p.x+=moveX*9*dt;p.x=Math.max(-3.7,Math.min(3.7,p.x));
    }else{
      const c=Math.cos(this.yaw),s=Math.sin(this.yaw);
      moveX=(inputX/length)*c-(inputZ/length)*s;
      moveZ=(inputX/length)*s+(inputZ/length)*c;
      const speed=8;p.x+=moveX*speed*dt;p.z+=moveZ*speed*dt;
      if(this.game.type==='coin'){p.x=Math.max(-20,Math.min(20,p.x));p.z=Math.max(-5,Math.min(40,p.z));}
    }
    if(jump&&p.ground){p.vy=10.5;p.ground=false;}
    p.vy-=25*dt;p.y+=p.vy*dt;
    if(this.game.type==='race'&&p.y<0){p.y=0;p.vy=0;p.ground=true;}
    else if(this.game.type==='obby'&&p.vy<=0){
        for(const a of this.platforms){
          if(p.x>a.x-a.w/2+.15&&p.x<a.x+a.w/2-.15&&p.z>a.z-a.d/2+.15&&p.z<a.z+a.d/2-.15&&oldY>=a.h-.09&&p.y<=a.h){
            p.y=a.h;p.vy=0;p.ground=true;break;
          }
        }
        if(p.y< -9){p.x=0;p.y=0;p.z=0;p.vy=0;p.ground=true;this.flash=.45;}
    }else if(this.game.type==='coin'&&p.y<0){p.y=0;p.vy=0;p.ground=true;}
    if(this.game.type==='race'){
      for(const o of this.obstacles)if(Math.abs(p.x-o.x)<1.3&&Math.abs(p.z-o.z)<1.35&&p.y<o.h){this.end(false,'¡Te chocaste!','Prueba otra vez y cambia de carril para esquivar los bloques.');return;}
      if(this.elapsed>=45){this.end(true,'¡Carrera completada!','Sobreviviste los 45 segundos. ¡Buen trabajo!');return;}
    }
    for(const coin of this.coins){
      if(!coin.got&&Math.hypot(p.x-coin.x,p.z-coin.z)<1.15&&Math.abs(p.y+1-coin.y)<2.0){
        coin.got=true;coin.mesh.visible=false;this.coinsCollected++;this.score+=10;
      }
    }
    if(this.game.type==='obby'&&p.z>45&&p.x>-4&&p.x<4&&p.y>=-.1)this.end(true,'¡Obby completado!','Llegaste a la isla final y recogiste '+this.coinsCollected+' monedas.');
    if(this.game.type==='coin'&&this.coinsCollected>=15)this.end(true,'¡Ciudad explorada!','Encontraste las 15 monedas. ¡Eres un gran explorador!');
    if(this.game.type==='coin'&&this.elapsed>90)this.end(this.coinsCollected>=10,this.coinsCollected>=10?'¡Buen recorrido!':'¡Se acabó el tiempo!','Recogiste '+this.coinsCollected+' de 15 monedas.');
    this.score=Math.max(this.score,Math.floor(this.elapsed*(this.game.type==='race'?10:2))+this.coinsCollected*10);
    this.saveBest();this.updateHud();this.updateAvatar(dt,this.game.type==='race'||Math.hypot(moveX,moveZ)>.05);
  }
  updateHud(){
    $('hudValue').textContent=this.game.type==='race'?Math.floor(this.elapsed)+'s / 45s':this.coinsCollected+' / '+(this.game.type==='obby'?10:15);
    $('bestValue').textContent=this.best;
  }
  updateAvatar(dt,moving){
    const p=this.player;this.avatar.position.set(p.x,p.y,p.z);
    if(this.game.type!=='race'&&(this.keys.w||this.keys.ArrowUp||this.keys.s||this.keys.ArrowDown||this.keys.a||this.keys.ArrowLeft||this.keys.d||this.keys.ArrowRight)){
      const ix=(this.keys.d||this.keys.ArrowRight?1:0)-(this.keys.a||this.keys.ArrowLeft?1:0);
      const iz=(this.keys.w||this.keys.ArrowUp?1:0)-(this.keys.s||this.keys.ArrowDown?1:0);
      const dx=ix*Math.cos(this.yaw)-iz*Math.sin(this.yaw),dz=ix*Math.sin(this.yaw)+iz*Math.cos(this.yaw);
      this.avatar.rotation.y=Math.atan2(dx,dz);
    }else if(this.game.type==='race')this.avatar.rotation.y=0;
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
    if(this.flash>0)this.flash=Math.max(0,this.flash-dt);
  }
  end(win,title,desc){
    this.messageShown=true;this.saveBest();$('messageIcon').textContent=win?'🏆':'💫';
    $('messageTitle').textContent=title;$('messageText').textContent=desc;$('gameMessage').hidden=false;
  }
}
window.Ablox3DEngine=Ablox3DEngine;
})();