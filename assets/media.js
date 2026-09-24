document.querySelectorAll('video').forEach(video=>{
  const showFallback=()=>{video.hidden=true;const link=video.parentElement.querySelector('.video-fallback');if(link)link.setAttribute('role','status');};
  video.addEventListener('error',showFallback);
  video.querySelectorAll('source').forEach(source=>source.addEventListener('error',showFallback));
});

// Fit the original artwork to the viewport independently of readable captions.
// This also upgrades already-published pages containing inline min-width rules.
document.querySelectorAll('.artwork').forEach(art=>{
  const img=art.querySelector('img');
  const labels=[...art.querySelectorAll('.art-label')].map(el=>({
    el,x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,
    size:parseFloat(el.dataset.size||el.style.fontSize)||2,
    vertical:el.classList.contains('vertical'),text:el.textContent,
    color:el.style.color,shadow:el.style.textShadow
  }));
  if(!img||!labels.length)return;
  art.parentElement.removeAttribute('tabindex');
  art.parentElement.setAttribute('aria-label','한국어 번역 이미지');
  const intersects=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+5&&a.y+a.h+5>b.y;
  // Narrow screens get their own layout; the desktop path below is unchanged.
  function mobileLayout(width,height){
    const placed=[],notes=[];
    const clamp=(v,max)=>Math.max(0,Math.min(max,v));
    for(const label of labels){
      const el=label.el,text=label.text.replace(/\n/g,'');
      el.classList.remove('vertical');
      Object.assign(el.style,{fontSize:'16px',lineHeight:'1.5',fontWeight:'600',whiteSpace:'normal',height:'auto',maxWidth:width+'px',color:label.color,textShadow:label.shadow});
      el.textContent=text;
      const long=text.length>24;
      el.style.width=Math.min(width,Math.max(96,Math.min(180,width*.42,text.length*16)))+'px';
      const box=el.getBoundingClientRect(),w=box.width,h=box.height;
      const x=clamp(width*label.x/100,width-w),y=clamp(height*label.y/100,height-h);
      const candidates=[{x,y},{x,y:y-h-6},{x,y:y+h+6}];
      for(const q of placed)candidates.push({x,y:q.y+q.h+6},{x,y:q.y-h-6});
      const pos=!long&&candidates.find(p=>p.y>=0&&p.y+h<=height&&Math.abs(p.y-y)<=48&&!placed.some(q=>intersects({...p,w,h},q)));
      if(pos){el.style.left=pos.x+'px';el.style.top=pos.y+'px';placed.push({...pos,w,h});}
      else notes.push(label);
    }
    let bottom=height;
    for(const {el} of notes){
      Object.assign(el.style,{left:'0px',top:(bottom+10)+'px',width:width+'px',fontWeight:'400',color:'var(--ink)',textShadow:'none',lineHeight:'1.6'});
      bottom+=10+el.getBoundingClientRect().height;
    }
    art.style.height=Math.ceil(bottom)+'px';
  }
  let frame;
  function layout(){
    const width=art.clientWidth,height=img.getBoundingClientRect().height;
    if(!width||!height)return;
    art.style.height='auto';
    if(window.innerWidth<=600){mobileLayout(width,height);return;}
    for(const {el} of labels){el.style.lineHeight='1.25';el.style.fontWeight='700';}
    const placed=[];
    let bottom=height;
    for(const label of labels){
      const {el}=label;
      const font=Math.max(16,width*label.size/100);
      const anchor={x:width*label.x/100,y:height*label.y/100};
      el.style.fontSize=font+'px';
      el.style.color=label.color;el.style.textShadow=label.shadow;
      el.style.width='auto';el.style.height='auto';
      el.style.maxWidth=width+'px';
      el.classList.toggle('vertical',label.vertical);
      el.textContent=label.text;
      if(label.vertical){
        el.style.whiteSpace='pre';
        // Use the full available height before introducing a second column.
        const chars=label.text.replace(/\s/g,'');
        if(chars.length*font<=height){el.textContent=chars;}
        else {el.classList.remove('vertical');}
      }
      if(!el.classList.contains('vertical')){
        el.textContent=label.text.replace(/\n/g,'');
        el.style.whiteSpace='normal';
        el.style.width=Math.min(width,Math.max(140,width-anchor.x,Math.min(320,width)))+'px';
        el.style.width=Math.min(el.getBoundingClientRect().width,Math.max(font*2,el.textContent.length*font))+'px';
      }
      let box=el.getBoundingClientRect(),w=box.width,h=box.height;
      const clampX=x=>Math.max(0,Math.min(width-w,x));
      const candidates=[{x:clampX(anchor.x),y:Math.max(0,Math.min(height-h,anchor.y))}];
      for(const p of placed){
        candidates.push({x:clampX(anchor.x),y:p.y+p.h+6});
        candidates.push({x:clampX(p.x+p.w+6),y:anchor.y});
        candidates.push({x:clampX(p.x-w-6),y:anchor.y});
        candidates.push({x:clampX(anchor.x),y:Math.max(0,p.y-h-6)});
      }
      candidates.sort((a,b)=>Math.hypot(a.x-anchor.x,a.y-anchor.y)-Math.hypot(b.x-anchor.x,b.y-anchor.y));
      let pos=candidates.find(p=>p.y>=0&&p.y+h<=height&&Math.hypot(p.x-anchor.x,p.y-anchor.y)<=Math.max(48,height*.12)&&!placed.some(q=>intersects({...p,w,h},q)));
      // Dense artwork can need extra nearby space on narrow phones. Move the
      // existing caption once; never duplicate it or shrink it below 16px.
      if(!pos){
        el.classList.remove('vertical');el.textContent=label.text.replace(/\n/g,'');
        el.style.whiteSpace='normal';el.style.width=width+'px';
        h=el.getBoundingClientRect().height;w=width;
        pos={x:0,y:bottom+8};
        el.style.color='#30251a';el.style.textShadow='none';
      }
      el.style.left=pos.x+'px';el.style.top=pos.y+'px';
      placed.push({...pos,w,h});bottom=Math.max(bottom,pos.y+h);
    }
    art.style.height=Math.ceil(bottom)+'px';
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(layout);};
  let lastWidth=0;
  new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==lastWidth){lastWidth=width;schedule();}}).observe(art);
  img.addEventListener('load',schedule);
  document.fonts.ready.then(schedule);schedule();
});

