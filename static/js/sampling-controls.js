/* Shared visual scale and seek controls for the two sampling illustrations. */
window.SamplingPlayback = Object.freeze({
  diagramScale: width => Math.min(1, width / 580),
  traceArrow(path, {terminalLength = 0} = {}) {
    const original = path.getAttribute('d');
    const length = path.getTotalLength();
    const count = Math.max(1, Math.ceil(length / 2));
    // Sample once, before changing the path. The native marker then follows
    // the actual drawn endpoint, including around bends and on backward seeks.
    const points = Array.from({length: count + 1}, (_, i) => path.getPointAtLength(length * i / count));
    const pair = point => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
    const prefixes = [`M ${pair(points[0])}`];
    for (let i = 1; i <= count; i++) prefixes.push(`${prefixes[i - 1]} L ${pair(points[i])}`);
    let previous = -1;
    return progress => {
      const p = Math.max(0, Math.min(1, progress));
      if (p === previous) return;
      previous = p;path.dataset.drawProgress = String(p);
      path.style.visibility = p === 0 ? 'hidden' : 'visible';
      if (p === 0) {path.setAttribute('d', prefixes[0]);return;}
      if (p === 1 && terminalLength === 0) {path.setAttribute('d', original);return;}
      const distance = p * count, index = Math.floor(distance), fraction = distance - index;
      const from = points[index], to = points[Math.min(index + 1,count)];
      const tip = {x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction};
      if (terminalLength > 0) {
        // Give the marker a straight stem longer than its head. Its vertex and
        // centerline then meet the shaft exactly, during drawing and at rest.
        const neckDistance=Math.max(0,distance-terminalLength/length*count);
        const neckIndex=Math.floor(neckDistance),neckFraction=neckDistance-neckIndex;
        const a=points[neckIndex],b=points[Math.min(neckIndex+1,count)];
        const neck={x:a.x+(b.x-a.x)*neckFraction,y:a.y+(b.y-a.y)*neckFraction};
        path.setAttribute('d',`${prefixes[neckIndex]} L ${pair(neck)} L ${pair(tip)}`);
        return;
      }
      path.setAttribute('d', `${prefixes[index]} L ${pair(tip)}`);
    };
  },
  attach({player, duration, getPosition, getPlaying, seek, setPlaying, describe}) {
    const transport = player.querySelector('.sampling-transport');
    const slider = transport.querySelector('input[type="range"]');
    const getDuration = typeof duration === 'function' ? duration : () => duration;
    let scrubbing = false, resumeAfterSeek = false;
    slider.max = String(getDuration());
    slider.disabled = false;
    transport.hidden = false;
    function finishScrub() {
      if (!scrubbing) return;
      scrubbing = false;
      setPlaying(resumeAfterSeek && getPosition() < getDuration());
    }
    slider.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      scrubbing = true;
      resumeAfterSeek = getPlaying();
      setPlaying(false);
    });
    slider.addEventListener('input', () => {
      seek(Number(slider.value));
      if (getPosition() >= getDuration()) setPlaying(false);
    });
    window.addEventListener('pointerup', finishScrub);
    window.addEventListener('pointercancel', finishScrub);
    slider.addEventListener('blur', finishScrub);
    return {
      update() {
        const position = getPosition();
        const duration = getDuration();
        slider.max = String(duration);
        const percent = Math.round(position / duration * 100);
        // Native range dragging and keyboard changes remain available.
        if (!scrubbing) slider.value = String(position);
        slider.style.setProperty('--seek-progress', `${position / duration * 100}%`);
        slider.setAttribute('aria-valuetext', `${percent}% · ${describe()}`);
      }
    };
  }
});
