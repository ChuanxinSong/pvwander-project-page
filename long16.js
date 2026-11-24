(() => {
  const data=window.LONG16, video=document.querySelector('#long16-video');
  const svg=document.querySelector('.long16-trajectory svg');
  const button=document.querySelector('#long16-play'), label=document.querySelector('#long16-frame');
  const xs=data.points.map(p=>p[0]),ys=data.points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(160/Math.max(maxX-minX,.001),250/Math.max(maxY-minY,.001));
  const points=data.points.map(([x,y])=>[100+(x-(minX+maxX)/2)*scale,150-(y-(minY+maxY)/2)*scale]);
  const path=points.map(p=>p.join(',')).join(' '),start=points[0],end=points.at(-1);
  svg.innerHTML=`<polyline points="${path}" fill="none" stroke="#c7cfd5" stroke-width="2.5"/><polyline class="long16-progress" fill="none" stroke="#397e82" stroke-width="3"/><circle cx="${start[0]}" cy="${start[1]}" r="4" fill="#397e82"/><rect x="${end[0]-4}" y="${end[1]-4}" width="8" height="8" fill="white" stroke="#647783"/><circle class="long16-point" r="5" fill="#db6b48" stroke="white"/>`;
  const progress=svg.querySelector('.long16-progress'),marker=svg.querySelector('.long16-point');
  let raf=0;
  function draw(){const n=Math.min(data.frames-1,Math.max(0,Math.floor(video.currentTime*data.fps)));progress.setAttribute('points',points.slice(0,n+1).map(p=>p.join(',')).join(' '));marker.setAttribute('cx',points[n][0]);marker.setAttribute('cy',points[n][1]);label.textContent=`Frame ${n+1} / ${data.frames}`;}
  function tick(){draw();if(!video.paused)raf=requestAnimationFrame(tick);}
  function play(){video.play().catch(()=>{button.textContent='Play';});}
  video.addEventListener('play',()=>{button.textContent='Pause';cancelAnimationFrame(raf);tick();});
  video.addEventListener('pause',()=>{button.textContent='Play';cancelAnimationFrame(raf);draw();});
  ['seeked','seeking','timeupdate','loadedmetadata'].forEach(e=>video.addEventListener(e,draw));
  button.onclick=()=>video.paused?play():video.pause();
  document.querySelector('#long16-restart').onclick=()=>{video.currentTime=0;play();};
  observeGallery(document.querySelector('#long-horizon'),play,()=>video.pause());
  draw();
})();
