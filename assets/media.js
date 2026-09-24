document.querySelectorAll('video').forEach(video=>{
  const showFallback=()=>{video.hidden=true;const link=video.parentElement.querySelector('.video-fallback');if(link)link.setAttribute('role','status');};
  video.addEventListener('error',showFallback);
  video.querySelectorAll('source').forEach(source=>source.addEventListener('error',showFallback));
});
