/* One continuous horizontal chain made from Figure 2's SVG primitives.
   Intermediate states are shared. A clipped camera follows the active call. */
(async () => {
  const player = document.querySelector('#sampling-player');
  if (!player) return;
  const host = document.querySelector('#sampling-diagram');
  const play = document.querySelector('#sampling-play');
  const replay = document.querySelector('#sampling-replay');
  const focusHeading = document.querySelector('#sampling-focus-heading');
  const focusTitle = document.querySelector('#sampling-focus-title');
  const stage = document.querySelector('#sampling-stage');
  const latency = document.querySelector('#sampling-latency');
  const latencyChart = document.querySelector('#sampling-latency-chart');
  const latencyTotal = document.querySelector('#sampling-latency-total');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let svg;
  try {
    const response = await fetch('static/images/baseline-integration.svg');
    if (!response.ok) throw new Error('Diagram unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid diagram');
    svg = document.importNode(doc.documentElement, true);
    host.replaceChildren(svg);
  } catch {
    stage.textContent = '10 sequential calls';
    stage.hidden = false;
    play.hidden = replay.hidden = true;
    return; // Retain the original static SVG image when playback is unavailable.
  }
  const steps = [...svg.querySelectorAll('[data-step]')];
  const states = [...svg.querySelectorAll('[data-state]')];
  const track = svg.querySelector('#baseline-track');
  svg.querySelector('#serial-mode-label').remove();
  // Show the predicted velocity before sending it toward the next state.
  const timing = { panEnd: 800, colorStart: 1050, colorEnd: 1800, inputEnd: 2600, modelEnd: 3600, velocityEnd: 4400, outputEnd: 5200 };
  const stepDuration = timing.outputEnd + 800;
  // The first state is already centered and orange; wait just one second.
  const openingHold = 1000, titleLead = 400, firstStepOffset = timing.colorEnd - openingHold;
  const lastOutputAt = (steps.length - 1) * stepDuration + timing.outputEnd - firstStepOffset + titleLead;
  const completionAt = lastOutputAt + 1000;
  const duration = completionAt + 1500;
  const completionMessage = '10 integration steps completed with 10 DiT calls';
  let position = 0;
  let playing = !motion.matches;
  let visible = false;
  let request = null;
  let lastTime = null;
  let viewWidth = 1234;
  let lastWidth = 0;
  let lastLatencyWidth = 0;
  let latencyUnitWidth = 100;
  const stateShapes = states.map(state => ({box: state.querySelector('rect'), circle: state.querySelector('circle')}));
  // Read both roles directly from Figure 2's original SVG, including borders.
  const statePalette = [0, 1].map(i => ({
    box: stateShapes[i].box.getAttribute('fill'),
    circle: stateShapes[i].circle.getAttribute('fill'),
    edge: stateShapes[i].circle.getAttribute('stroke')
  }));
  const blend = (from, to, amount) => {
    const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    return `rgb(${rgb(from).map((channel, i) => Math.round(channel + (rgb(to)[i] - channel) * amount)).join(',')})`;
  };
  const parts = steps.map(step => Object.fromEntries([...step.querySelectorAll('[data-part]')].map(e => [e.dataset.part, e])));
  const arrows = parts.map(part => ({
    input: SamplingPlayback.traceArrow(part['input-arrow'].querySelector('path')),
    output: SamplingPlayback.traceArrow(part['output-arrow'].querySelector('path'))
  }));
  player.style.setProperty('--sampling-ink', stateShapes[0].box.getAttribute('stroke'));
  player.style.setProperty('--sampling-model', parts[0].model.querySelector('rect').getAttribute('fill'));
  // The arrow itself advances along each transfer; its tip is the moving front.
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attributes, text) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // The focus window stays still as the chain advances beneath it. It encloses
  // the current input, model and output together, including the state indices.
  // Previous output arrow: -29..43 (midpoint 7). Next input arrow:
  // 446..517 (midpoint 481.5). Both boundaries bisect an outside arrow.
  const focusWidth = 474.5;
  const focus = element('rect', {class: 'sampling-focus', y: 86, width: focusWidth, height: 138, rx: 3, 'aria-hidden': 'true'});
  svg.appendChild(focus);
  const completionTitle = element('text', {id: 'baseline-completion-title', 'text-anchor': 'middle',
    'font-family': 'SpeCaTimes,Times New Roman,Times,serif', 'font-size': 29,
    'font-weight': 400, fill: '#000000', opacity: 0}, completionMessage);
  svg.appendChild(completionTitle);
  // Schematic model-call cost only: every completed DiT call adds one tau.
  // Animation duration and pauses are not measured inference latency.
  latencyChart.appendChild(element('title', {}, 'Each segment represents the latency of one DiT call. This is a normalized schematic, not a measured timing trace.'));
  const latencyTrack = element('rect', {class: 'latency-track', x: 0, y: 2, height: 16, rx: 2});
  latencyChart.appendChild(latencyTrack);
  const latencySegments = steps.map((_, i) => {
    const group = element('g', {'data-latency-call': i + 1});
    const box = element('rect', {class: 'latency-segment', y: 2, height: 16, rx: 2});
    group.appendChild(box);
    latencyChart.appendChild(group);
    return {group, box};
  });
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => n * n * (3 - 2 * n);
  // A model's native center is 244 + 339*n. Allow empty margins at either
  // end of the chain so even the first and last active DiT stay centered.
  const cameraFor = call => 244 + 339 * Math.max(0, call) - viewWidth / 2;
  const transport = SamplingPlayback.attach({
    player, duration, getPosition: () => position, getPlaying: () => playing,
    seek: value => { position = Math.max(0, Math.min(duration, value)); lastTime = null; render(); },
    setPlaying: value => { playing = value; updatePlayback(); },
    describe: () => position < openingHold ? 'Initial state' : focusTitle.textContent
  });
  function render() {
    // Let the first heading settle before its input arrow starts moving.
    const algorithmPosition = position + firstStepOffset - Math.min(titleLead, Math.max(0, position - openingHold));
    const current = Math.min(10, Math.floor(algorithmPosition / stepDuration));
    const elapsed = algorithmPosition - current * stepDuration;
    const complete = current === 10;
    const showCompletion = position >= completionAt;
    const completed = complete ? 10 : current + (elapsed >= timing.outputEnd ? 1 : 0);
    const finishedCalls = complete ? 10 : current + (elapsed >= timing.modelEnd ? 1 : 0);
    const progress = (start, end) => ease(clamp((elapsed - start) / (end - start)));
    const phase = showCompletion ? 'complete' : position >= lastOutputAt ? 'output' : elapsed < timing.colorEnd ? 'input' : elapsed < timing.inputEnd ? 'transfer-in' : elapsed < timing.modelEnd ? 'model' : elapsed < timing.velocityEnd ? 'velocity' : elapsed < timing.outputEnd ? 'transfer-out' : 'output';
    player.dataset.phase = phase;
    const camera = complete ? cameraFor(9) : cameraFor(current - 1) + (cameraFor(current) - cameraFor(current - 1)) * ease(clamp(elapsed / timing.panEnd));
    const focusLeft = camera + viewWidth / 2 - 237, focusRight = focusLeft + focusWidth;
    const windowOpacity = (left, right) => .12 + .88 * ease(clamp((Math.min(right, focusRight) - Math.max(left, focusLeft)) / (right - left)));
    states.forEach((state, i) => {
      // Once produced, a state stays clear inside the fixed focus window.
      const opacity = complete || i <= current ? 1
        : i === current + 1 ? .06 + .94 * progress(timing.outputEnd - 450, timing.outputEnd) : .06;
      state.style.opacity = String(opacity * windowOpacity(43 + 339 * i, 107 + 339 * i));
      // A newly produced output is green. As it becomes the next input,
      // its circle and surrounding box turn orange. x10 stays an output.
      const inputAmount = i === 0 || i < current ? 1 : i === current && !complete ? ease(clamp((elapsed - timing.colorStart) / (timing.colorEnd - timing.colorStart))) : 0;
      stateShapes[i].box.style.fill = blend(statePalette[1].box, statePalette[0].box, inputAmount);
      stateShapes[i].circle.style.fill = blend(statePalette[1].circle, statePalette[0].circle, inputAmount);
      stateShapes[i].circle.style.stroke = blend(statePalette[1].edge, statePalette[0].edge, inputAmount);
      state.dataset.role = inputAmount === 1 ? 'input' : inputAmount === 0 ? 'output' : 'handoff';
    });
    // Finish recentering and briefly settle before the green-to-orange change.
    // Color conversion and model execution both happen with a stationary camera.
    track.setAttribute('transform', `translate(${-camera},0)`);
    player.dataset.camera = camera.toFixed(2);
    steps.forEach((step, i) => {
      const active = i === current;
      arrows[i].input(complete || i < current ? 1 : active ? progress(timing.colorEnd, timing.inputEnd) : 0);
      // As in SAG, first draw from the DiT to the velocity, reveal v, then
      // continue the same arrow toward the output state.
      arrows[i].output(complete || i < current ? 1 : active
        ? .5 * progress(timing.modelEnd, timing.modelEnd + 400) + .5 * progress(timing.velocityEnd, timing.outputEnd) : 0);
      // Velocity and both arrows belong to their DiT call, so the entire
      // group dims together as its model leaves the fixed window.
      step.style.opacity = String((complete || i <= current ? 1 : .06) * windowOpacity(178 + 339 * i, 310 + 339 * i));
      for (const [key, element] of Object.entries(parts[i])) {
        if (!active) {
          element.style.removeProperty('opacity');
          continue;
        }
        // Reveal each component in order and retain it through later phases.
        if (key === 'model') element.style.opacity = String(.06 + .94 * progress(timing.inputEnd, timing.inputEnd + 250));
        else if (key === 'velocity') element.style.opacity = String(.06 + .94 * progress(timing.modelEnd + 400, timing.modelEnd + 600));
        else if (key === 'input-arrow') element.style.opacity = String(.06 + .94 * progress(timing.colorEnd, timing.colorEnd + 150));
        else if (key === 'output-arrow') element.style.opacity = String(.06 + .94 * progress(timing.modelEnd, timing.modelEnd + 150));
      }
    });
    focusHeading.hidden = position < openingHold || showCompletion;
    focusTitle.textContent = showCompletion ? completionMessage : `Denoising step ${Math.min(current + 1, 10)}`;
    completionTitle.style.opacity = showCompletion ? '1' : '0';
    latencySegments.forEach(({group, box}, i) => {
      const amount = complete || i < current ? 1 : i === current ? progress(timing.modelEnd, timing.modelEnd + 300) : 0;
      group.style.opacity = amount === 0 ? '0' : '1';
      group.dataset.complete = String(i < finishedCalls);
      box.setAttribute('width', String((latencyUnitWidth - 2) * amount));
    });
    SAGLatencyMath.render(latencyTotal, `dit-${finishedCalls}`);
    latencyTotal.setAttribute('aria-label', `${finishedCalls} times the latency of one DiT call`);
    latencyChart.setAttribute('aria-label', `Schematic cumulative DiT latency: ${finishedCalls} completed calls, ${finishedCalls} times the latency of one DiT call.`);
    player.dataset.completed = String(completed);
    player.dataset.calls = String(finishedCalls);
    stage.textContent = complete ? '10 DiT calls completed' : `DiT call ${current + 1} / 10`;
    transport.update();
  }
  function resizeWindow() {
    const width = host.clientWidth;
    const chartWidth = latencyChart.clientWidth;
    if (width === 0 || width === lastWidth && chartWidth === lastLatencyWidth) return;
    lastWidth = width;lastLatencyWidth = chartWidth;
    // Use the same native-unit scale as SAG, including on narrow screens.
    const scale = SamplingPlayback.diagramScale(innerWidth < 768 ? player.clientWidth : width);
    viewWidth = width / scale;
    const viewTop = 86 - 52 / scale;
    svg.setAttribute('viewBox', `0 ${viewTop} ${viewWidth} ${236 - viewTop}`);
    svg.style.height = `${(236 - viewTop) * scale}px`;
    focus.setAttribute('x', String(viewWidth / 2 - 237));
    completionTitle.setAttribute('x', String(viewWidth / 2));
    completionTitle.setAttribute('y', String(viewTop + 34 / scale));
    player.style.setProperty('--sampling-focus-left', `${237 * scale}px`);
    player.style.setProperty('--sampling-focus-width', `${474.5 * scale}px`);
    const viewport = host.closest('.sampling-window');
    viewport.scrollLeft = innerWidth < 768 ? Math.max(0, (width - viewport.clientWidth) / 2) : 0;
    latencyUnitWidth = (chartWidth + 2) / 10;
    latencyChart.setAttribute('viewBox', `0 0 ${chartWidth} 20`);
    latencyTrack.setAttribute('width', String(chartWidth));
    latencySegments.forEach(({box}, i) => {
      box.setAttribute('x', String(i * latencyUnitWidth));
    });
    render();
  }
  function updatePlayback() {
    play.dataset.playing = String(playing);
    play.title = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} baseline integration animation`);
    player.classList.toggle('sampling-paused', !playing || !visible || document.hidden);
    if (request !== null) cancelAnimationFrame(request);
    request = null; lastTime = null;
    if (playing && visible && !document.hidden) request = requestAnimationFrame(tick);
  }
  function tick(time) {
    if (lastTime !== null) position = Math.min(duration, position + time - lastTime);
    lastTime = time; render();
    if (position === duration) { playing = false; updatePlayback(); }
    else request = requestAnimationFrame(tick);
  }
  play.disabled = replay.disabled = false;
  latency.hidden = false;
  play.addEventListener('click', () => {
    if (!playing && position === duration) { position = 0; render(); }
    playing = !playing; updatePlayback();
  });
  replay.addEventListener('click', () => { position = 0; playing = true; render(); updatePlayback(); });
  // Begin the opening pause when the diagram itself is substantially in view.
  new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .5; updatePlayback(); }, {threshold: .5}).observe(host.closest('.sampling-window'));
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', () => { if (motion.matches) { playing = false; updatePlayback(); } });
  const resizeObserver = new ResizeObserver(resizeWindow);
  resizeObserver.observe(host);resizeObserver.observe(player);
  resizeWindow(); updatePlayback();
})();
