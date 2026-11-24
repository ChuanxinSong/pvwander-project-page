(() => {
  const names={pv:'PVWander',omni:'OmniRoam',matrix:'Matrix3D',pano:'PanoWorld',evo:'EvoWorld',gt:'GT'};
  const controllers=[];
  for(const type of ['indoor','outdoor']){
    const root=document.querySelector(`[data-comparison="${type}"]`), scenes=window.QUALITATIVE[type];
    let index=0,videos=[],scene=null,playing=false,generation=0,raf=0,rate=1,track=[],line=null,point=null,player=null;
    root.innerHTML=`<div class="qc-header"><h3>${type==='indoor'?'Indoor Scenes':'Outdoor Scenes'}</h3></div><div class="qc-stage"><button class="qc-arrow qc-prev" aria-label="Previous ${type} scene">&#8249;</button><div class="qc-grid"></div><button class="qc-arrow qc-next" aria-label="Next ${type} scene">&#8250;</button></div><div class="qc-toolbar"><button class="qc-play">Play</button><button class="qc-restart">Restart</button><input class="qc-seek" type="range" min="0" max="1000" value="0" aria-label="Seek all ${type} videos"></div><div class="qc-status" role="status"></div>`;
    const grid=root.querySelector('.qc-grid'), playButton=root.querySelector('.qc-play'), seek=root.querySelector('.qc-seek'), status=root.querySelector('.qc-status');
    const duration=()=>scene.frames/scene.fps;
    function draw(t){
      const n=Math.min(track.length-1,Math.max(0,Math.floor(t*scene.fps)));
      line.setAttribute('points',track.slice(0,n+1).map(p=>p.join(',')).join(' '));point.setAttribute('cx',track[n][0]);point.setAttribute('cy',track[n][1]);
      seek.value=String(t/duration()*1000);
    }
    function pause(){if(player)player.pause()}
    function play(){player.play()}
    function move(t){player.seek(Math.min(t,Math.max(0,duration()-.05)))}
    function state(value,count,total){
      playing=!['paused','error'].includes(value);playButton.textContent=playing?'Pause':'Play';
      root.setAttribute('aria-busy',String(['loading','buffering','starting'].includes(value)));
      status.textContent=value==='loading'?'Loading videos ('+count+'/'+total+')…':value==='buffering'||value==='starting'?'Synchronizing videos…':value==='error'?'A video could not load. Press Play to retry.':'';
    }
    function trajectory(){
      const xs=scene.points.map(p=>p[0]), ys=scene.points.map(p=>p[1]);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
      const scale=Math.min(350/Math.max(maxX-minX,.001),150/Math.max(maxY-minY,.001));
      track=scene.points.map(([x,y])=>[200+(x-(minX+maxX)/2)*scale,100-(y-(minY+maxY)/2)*scale]);
      const start=track[0],end=track.at(-1);const tile=document.createElement('figure');tile.className='qc-tile';tile.style.gridArea='traj';tile.dataset.slot='traj';
      tile.innerHTML=`<figcaption>Trajectory</figcaption><svg viewBox="0 0 400 200" role="img" aria-label="Shared ${scene.input?'input':'ground-truth'} camera trajectory"><polyline points="${track.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#c7cfd5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline class="qc-progress" fill="none" stroke="#397e82" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${start[0]}" cy="${start[1]}" r="4" fill="#397e82"/><rect x="${end[0]-4}" y="${end[1]-4}" width="8" height="8" fill="white" stroke="#647783" stroke-width="1.5"/><circle class="qc-point" r="4.5" fill="#db6b48" stroke="white" stroke-width="1.5"/></svg>`;
      grid.append(tile);line=tile.querySelector('.qc-progress');point=tile.querySelector('.qc-point');
    }
    function show(next,autoplay=false){
      if(player)player.destroy();playing=false;generation++;index=(next+scenes.length)%scenes.length;scene=scenes[index];grid.replaceChildren();
      for(const record of scene.videos){const f=document.createElement('figure');f.className='qc-tile';f.dataset.slot=record.slot;f.style.gridArea=record.slot;f.innerHTML=`<figcaption>${names[record.slot]}</figcaption><video muted playsinline preload="none" poster="${record.poster}" src="${record.src}" aria-label="${names[record.slot]}, ${scene.title}"></video>`;grid.append(f)}
      if(scene.input){const f=document.createElement('figure');f.className='qc-tile';f.style.gridArea='gt';f.dataset.slot='gt';f.innerHTML=`<figcaption>Input</figcaption><img src="${scene.input}" alt="Initial panorama"/>`;grid.append(f)}
      videos=[...grid.querySelectorAll('video')];videos.forEach(v=>{v.muted=true;v.playbackRate=rate});
      trajectory();draw(0);
      player=new SynchronizedVideos(videos,{onstate:state,ontime:draw,onended:()=>{player.seek(0);play()}});state('paused');
      
      if(autoplay)play();
    }

    root.querySelector('.qc-prev').onclick=()=>show(index-1,playing);root.querySelector('.qc-next').onclick=()=>show(index+1,playing);
    playButton.onclick=()=>playing?pause():play();root.querySelector('.qc-restart').onclick=()=>{pause();move(0);play()};
    seek.oninput=()=>move(Number(seek.value)/1000*duration());
    root.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;if(e.key==='ArrowRight'){e.preventDefault();show(index+1,playing)}if(e.key==='ArrowLeft'){e.preventDefault();show(index-1,playing)}});
    controllers.push({pause});show(0,false);observeGallery(root,play,pause);
  }
})();
