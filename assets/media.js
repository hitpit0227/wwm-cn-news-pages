// Boxes are normalized x/y/width/height of the displayed source artwork.
// Reviewed regions use existing caption indices; they never generate new text.
function mobileRegions(filename,labels){
  const plans={
    '45b975edef4ad61c5b59dd1bd540b95dd53eb9c6505990eff7f73f4d974c53af.jpg':[
      {box:[.55,.13,.42,.23],labels:[11,12,13]},
      {box:[.56,.36,.41,.08],labels:[14]},
      {box:[.57,.425,.40,.12],labels:[15]},
      {box:[.57,.54,.40,.115],labels:[16]},
      {box:[.57,.65,.40,.115],labels:[17]},
      {box:[.57,.76,.40,.13],labels:[18]},
      {box:[.24,.64,.34,.12],labels:[19]},
      {box:[0,0,.30,1],labels:[0,1,2,3,4,5,6,7,8,9,10],secondary:true},
      {box:[.85,.91,.15,.09],labels:[20],secondary:true}
    ],
    '80aba3cab09bd2f2bef8763c2a7fcd684799a7fb9e5a96dbaf08a36f9b541056.jpg':[
      {box:[.02,.40,.59,.58],labels:[0,1,2]},
      {box:[.63,.14,.34,.08],labels:[3]},
      {box:[.63,.21,.34,.175],labels:[4,5]},
      {box:[.63,.385,.34,.17],labels:[6,7]},
      {box:[.63,.555,.34,.17],labels:[8,9]},
      {box:[.63,.72,.34,.17],labels:[10]}
    ],
    'f58054de109fb6df5b7011b0a7a25219ffa8f0e4ae8df85e21bedaf7c28df72f.jpg':[
      {box:[.79,.03,.20,.83],labels:[0,1]},
      {box:[0,.55,.60,.45],labels:[2,3]}
    ]
  };
  const reviewed=plans[filename];
  if(reviewed&&reviewed.flatMap(r=>r.labels).length===labels.length)return reviewed;
  // Future artwork: keep nearby phrases together in a local source view.
  // The full image remains available above; no source pixels are discarded.
  const groups=[];
  labels.forEach((label,i)=>{
    let group=groups.find(g=>g.labels.length<3&&Math.abs(g.x-label.x)<22&&Math.abs(g.y-label.y)<18);
    if(!group){group={x:label.x,y:label.y,labels:[]};groups.push(group);}
    group.labels.push(i);
  });
  return groups.map(g=>{
    const xs=g.labels.map(i=>labels[i].x/100),ys=g.labels.map(i=>labels[i].y/100);
    const x=Math.max(0,Math.min(...xs)-.22),y=Math.max(0,Math.min(...ys)-.23);
    return {box:[x,y,Math.min(1,Math.max(...xs)+.38)-x,Math.min(1,Math.max(...ys)+.18)-y],labels:g.labels};
  });
}

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
  // Mobile panels pair each source region with only its own translation.
  let panels;
  function mobileLayout(){
    if(panels)return;
    panels=document.createElement('div');panels.className='mobile-panels';
    const overview=document.createElement('details');overview.className='mobile-overview';
    const summary=document.createElement('summary');summary.textContent='전체 이미지 보기';
    const original=img.cloneNode();original.removeAttribute('style');original.alt='잘리지 않은 전체 원본';
    overview.append(summary,original);panels.append(overview);
    const regions=mobileRegions(new URL(img.src).pathname.split('/').pop(),labels);
    for(const region of regions){
      const panel=document.createElement(region.secondary?'details':'section');panel.className='mobile-panel';
      if(region.secondary){const heading=document.createElement('summary');heading.textContent='화면 메뉴 번역';panel.append(heading);}
      const [x,y,w,h]=region.box,ratio=img.naturalWidth*w/(img.naturalHeight*h);
      const crop=document.createElement('div');crop.className='mobile-crop';
      crop.style.aspectRatio=String(ratio);crop.style.width='min(100%, '+Math.round(360*ratio)+'px)';
      const detail=img.cloneNode();detail.removeAttribute('style');detail.removeAttribute('loading');detail.alt='해당 안내의 원문 영역';
      Object.assign(detail.style,{width:(100/w)+'%',maxWidth:'none',height:'auto',left:(-100*x/w)+'%',top:(-100*y/h)+'%'});
      crop.append(detail);panel.append(crop);
      const copy=document.createElement('div');copy.className='mobile-region-copy';
      for(const index of region.labels){
        const paragraph=document.createElement('p');paragraph.className='mobile-caption';paragraph.dataset.labelIndex=String(index);
        paragraph.textContent=labels[index].text.replace(/\n/g,'');copy.append(paragraph);
      }
      panel.append(copy);panels.append(panel);
    }
    art.classList.add('mobile-segmented');art.after(panels);
  }
  let frame;
  function layout(){
    if(window.innerWidth<=600)return;
    const width=art.clientWidth,height=img.getBoundingClientRect().height;
    if(!width||!height)return;
    art.style.height='auto';
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
  new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==lastWidth){lastWidth=width;schedule();}}).observe(art.parentElement);
  window.matchMedia('(max-width:600px)').addEventListener('change',schedule);
  img.addEventListener('load',schedule);
  document.fonts.ready.then(schedule);schedule();
});
