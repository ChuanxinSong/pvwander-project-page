const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Each gallery owns its playback. Only the visible gallery autoplays.
function observeGallery(root, play, pause) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) pause();
    else if (!reducedMotion.matches) play();
  }, {threshold: 0.12});
  observer.observe(root);
}
