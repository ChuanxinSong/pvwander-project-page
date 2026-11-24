(() => {
  class SynchronizedVideos {
    constructor(videos, { onstate = () => {}, ontime = () => {}, onended = () => {} } = {}) {
      this.videos = videos;
      this.sources = videos.map(v => v.getAttribute('src'));
      this.onstate = onstate; this.ontime = ontime; this.onended = onended;
      this.abort = new AbortController(); this.urls = []; this.listeners = [];
      this.wanted = false; this.destroyed = false; this.epoch = 0; this.frame = 0;
      this.position = 0; this.state = 'paused'; this.loaded = false;
      for (const v of videos) {
        v.pause(); v.removeAttribute('src'); v.preload = 'none'; v.load();
        this.listen(v, 'waiting', () => { if (this.state === 'playing') this.recover(); });
        this.listen(v, 'error', () => { if (this.loaded) this.fail(); });
      }
      this.listen(videos[0], 'ended', () => {
        if (!this.wanted) return;
        this.pause(); this.position = 0; this.onended();
      });
    }
    listen(video, event, callback) {
      video.addEventListener(event, callback);
      this.listeners.push(() => video.removeEventListener(event, callback));
    }
    emit(state, count = 0) {
      this.state = state;
      if (!this.destroyed) this.onstate(state, count, this.videos.length);
    }
    halt() {
      cancelAnimationFrame(this.frame);
      this.videos.forEach(v => v.pause());
    }
    ready(video) {
      const signal = this.abort.signal;
      return new Promise((resolve, reject) => {
        const events = ['loadeddata', 'canplay', 'canplaythrough', 'seeked', 'error'];
        const cleanup = () => { events.forEach(e => video.removeEventListener(e, check)); signal.removeEventListener('abort', cancel); };
        const cancel = () => { cleanup(); reject(new Error('Cancelled')); };
        const check = () => {
          if (signal.aborted || video.error) { cleanup(); reject(new Error('Video unavailable')); }
          else if (video.readyState >= 3 && !video.seeking) { cleanup(); resolve(); }
        };
        events.forEach(e => video.addEventListener(e, check));
        signal.addEventListener('abort', cancel, { once: true }); check();
      });
    }
    prepare() {
      if (this.preparation) return this.preparation;
      const signal = this.abort.signal;
      let count = 0;
      this.preparation = Promise.all(this.videos.map(async (video, i) => {
        if (typeof location !== 'undefined' && location.protocol === 'file:') {
          video.src = this.sources[i];
        } else {
          const response = await fetch(this.sources[i], { signal });
          if (!response.ok) throw new Error('Video unavailable');
          const blob = await response.blob();
          if (this.destroyed || signal.aborted) throw new Error('Cancelled');
          const url = URL.createObjectURL(blob); this.urls.push(url); video.src = url;
        }
        video.preload = 'auto'; video.load();
        await this.ready(video);
        count++;
        if (this.wanted) this.emit('loading', count);
      })).then(() => { this.loaded = true; });
      return this.preparation;
    }
    async play() {
      if (this.destroyed) return;
      this.wanted = true;
      const token = ++this.epoch;
      this.halt(); this.emit(this.loaded ? 'buffering' : 'loading');
      try {
        await this.prepare();
        if (!this.wanted || this.destroyed || token !== this.epoch) return;
        for (const v of this.videos) if (Math.abs(v.currentTime - this.position) > .015) v.currentTime = this.position;
        await Promise.all(this.videos.map(v => this.ready(v)));
        if (!this.wanted || this.destroyed || token !== this.epoch) return;
        this.emit('starting');
        await Promise.all(this.videos.map(v => v.play()));
        if (!this.wanted || this.destroyed || token !== this.epoch) return;
        this.emit('playing'); this.tick();
      } catch (_) { if (!this.destroyed && token === this.epoch) this.fail(); }
    }
    tick() {
      if (!this.wanted || this.state !== 'playing') return;
      this.position = this.videos[0].currentTime;
      if (this.videos.some(v => v.readyState < 3 || v.seeking || Math.abs(v.currentTime - this.position) > .12)) {
        this.recover(); return;
      }
      this.ontime(this.position);
      this.frame = requestAnimationFrame(() => this.tick());
    }
    recover() {
      this.position = Math.min(...this.videos.map(v => v.currentTime));
      this.play();
    }
    pause() {
      this.wanted = false; this.epoch++; this.halt(); this.emit('paused');
    }
    seek(time) {
      this.position = Math.max(0, time);
      if (this.wanted) this.play();
      else if (this.loaded) { this.halt(); this.videos.forEach(v => { v.currentTime = this.position; }); }
      this.ontime(this.position);
    }
    fail() {
      this.wanted = false; this.epoch++; this.halt(); this.emit('error');
      if (!this.loaded) {
        this.abort.abort(); this.abort = new AbortController(); this.preparation = null;
        this.videos.forEach(v => { v.removeAttribute('src'); v.load(); });
        this.urls.forEach(url => URL.revokeObjectURL(url)); this.urls = [];
      }
    }
    destroy() {
      this.destroyed = true; this.wanted = false; this.epoch++; this.halt();
      this.abort.abort(); this.listeners.forEach(remove => remove());
      this.videos.forEach(v => { v.removeAttribute('src'); v.load(); });
      this.urls.forEach(url => URL.revokeObjectURL(url));
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SynchronizedVideos;
  else window.SynchronizedVideos = SynchronizedVideos;
})();
