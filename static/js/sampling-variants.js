/* Each algorithm explains one window, independently of the full SAG run. */
(async () => {
  const player = document.querySelector('#sag-variants-player');
  if (!player) return;
  const host = player.querySelector('#sag-details');
  const tabs = [...player.querySelectorAll('[data-sag-view]')];
  const stageNav = player.querySelector('#sag-stage-nav');
  const play = player.querySelector('#sag-variant-play');
  const replay = player.querySelector('#sag-variant-replay');
  const note = player.querySelector('#sag-variant-phase-note');
  const caption = player.querySelector('#sag-variant-action-caption');
  const views = player.querySelector('.sag-views');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const details = await SAGDetails.attach(host);
  const mobileNotes = new WeakMap();
  function placeMobileNote(svg, anchor) {
    const mobile = innerWidth < 768;
    let group = mobileNotes.get(svg);
    if (mobile && !group) {
      const make = (tag, attrs) => {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
        return element;
      };
      // Use the diagram's coordinates so the note scales and scrolls with
      // Action DiT, in the gap between the model and the drafting path.
      group = make('g', {'data-mobile-initial-note': '', 'aria-hidden': 'true', 'pointer-events': 'none'});
      group.appendChild(make('rect', {x: -82, y: -29, width: 164, height: 54, fill: 'var(--sampling-canvas, var(--background))'}));
      const label = make('text', {'text-anchor': 'middle', 'font-family': 'Arial, sans-serif', 'font-size': 20, fill: 'var(--sampling-ink)'});
      const first = make('tspan', {x: 0, y: -10, 'font-weight': 700});first.textContent = 'Only at x₀';
      const second = make('tspan', {x: 0, y: 14, 'font-weight': 400});second.textContent = '1 extra DiT call';
      label.append(first, second);group.appendChild(label);svg.appendChild(group);mobileNotes.set(svg, group);
    }
    if (group) {
      group.style.display = mobile && !note.hidden ? '' : 'none';
      group.style.opacity = note.style.opacity;
      group.setAttribute('transform', `translate(${anchor.x},${anchor.y})`);
    }
  }
  // Mechanism illustrations have their own pacing, with time to read each
  // construction and decision instead of matching the full SAG animation.
  const openingHold = 1000, titleFade = 200, reject = 2;
  // Shared actions use one schedule; route-specific durations start at drafting.
  const baseInitialTiming = {inputStart: 200, inputEnd: 650, modelEnd: 1250, outputEnd: 1700,
    velocityEnd: 1900, referenceStart: 2200, referenceEnd: 2650, ready: 2850, draftStart: 3250};
  const batchOffsets = {inputStart:0, sceneFadeStart:400, sceneFadeEnd:1000, stateMoveStart:1200, inputEnd:2400,
    modelStart:3200, modelEnd:3700, callInputStart:4200, callInputEnd:4800,
    outputStart:5600, outputEnd:6200, velocityStart:6200, velocityEnd:6600,
    modelFadeStart:7600, modelFadeEnd:8200, velocityMoveStart:8400, velocityMoveEnd:9400, verificationStart:10400};
  const baseDraftTiming = {start: 6200, interval: 1400, flowDuration: 700, stateDuration: 300};
  // Both variants return the corrected state with the same arrow, handoff,
  // reference-update pause, and purple-to-orange transition timing.
  const windowReturnOffsets = {returnArrowStart:600,returnEnd:3200,returnSettled:3600,
    referenceStart:4000,referenceMoveStart:4300,referenceMoveEnd:5500,
    referenceNameStart:6000,referenceNameEnd:6500,sceneFadeStart:6900,sceneFadeEnd:7500,
    purpleEnd:7700,orangeEnd:8300,nextDraftAt:9100};
  function makeTimeline(route) {
    const residual = route === 'residual', titleLead = 250;
    const initialTiming = {...baseInitialTiming};
    const draftTiming = residual ? {...baseDraftTiming, start: 3250, sharedDuration: 250}
      : {...baseDraftTiming, start:initialTiming.draftStart+250, sharedDuration:250, interval:2400,
        inputDuration:500, velocityDuration:300, velocityHold:200, noiseDelay:200, flowDuration:450};
    const draftEnd=residual?4500:draftTiming.start+3*draftTiming.interval+draftTiming.inputDuration
      +draftTiming.velocityDuration+draftTiming.velocityHold+draftTiming.flowDuration+draftTiming.stateDuration;
    const batchStart=draftEnd+500;
    const batchTiming=Object.fromEntries(Object.entries(batchOffsets).map(([key,value])=>[key,batchStart+value]));
    Object.assign(batchTiming,{acceptanceStart:batchTiming.verificationStart+(residual?5250:17850),acceptanceInterval:residual?6100:18800});
    const decisionTiming = residual ? {rejectAt: 32850, discardLabelStart: 34450, discardStart: 35050, discardEnd: 35750,
      discardLabelFadeStart: 36250, discardLabelEnd: 36650,
      correctStart: 37250, correctEnd: 37350, transferStart: 37350, transferRevealDuration: 200,
      replacementStart: 37650, replacementEnd: 38850, nameStart: 39250, nameEnd: 40150,
      replacementSettled: 40550, replaceStart: 40950, replaceEnd: 41450,
      clearStart: 42050, clearEnd: 42450,
      returnStart: 42750} : {};
    if(!residual){
      // Reflection has its own duration after the shared sequential verification beats.
      decisionTiming.rejectAt=batchTiming.acceptanceStart+reject*batchTiming.acceptanceInterval;
      decisionTiming.discardLabelStart=decisionTiming.rejectAt+1600;
      decisionTiming.discardStart=decisionTiming.discardLabelStart+600;
      decisionTiming.discardEnd=decisionTiming.discardStart+700;
      decisionTiming.discardLabelFadeStart=decisionTiming.discardEnd+500;
      decisionTiming.discardLabelEnd=decisionTiming.discardLabelFadeStart+400;
      decisionTiming.correctStart=decisionTiming.discardLabelEnd+600;
      const correctionOffsets={restoreStart:600,restoreEnd:1300,meanGuideStart:1700,meanGuideEnd:2350,meansStart:2500,meansEnd:2900,
        centerStart:3300,centerEnd:3900,centerFormulaStart:4200,centerFormulaEnd:4750,
        noiseArrowStart:5550,noiseArrowEnd:6150,deltaArrowStart:6950,deltaArrowEnd:7550,
        reflectStart:8350,reflectEnd:9850,correctEnd:9850,
        reflectedStart:10250,reflectedEnd:10950,pointStart:12150,resultStart:13150,resultEnd:13800,
        replacementStart:14500,replacementEnd:15700,
        clearStart:17000,clearEnd:17500,returnStart:18000};
      for(const [key,offset] of Object.entries(correctionOffsets))decisionTiming[key]=decisionTiming.correctStart+offset;
    }
    for(const [key,offset] of Object.entries(windowReturnOffsets))decisionTiming[key]=decisionTiming.returnStart+offset;
    const stages = [{at: 0, key: 'draft'}, {at: batchTiming.modelStart, key: 'evaluation'},
      {at: batchTiming.verificationStart, key: 'verification'}, {at: decisionTiming.correctStart, key: 'correction'},
      {at: decisionTiming.returnStart, key: 'reuse'}];
    stages.push({at:decisionTiming.referenceStart,key:'reference'});
    let titleDelay = 0;
    stages.forEach(stage => {
      stage.lead = stage.key === 'evaluation' ? 900 : stage.key === 'reference' ? 650 : titleLead;
      stage.start = stage.at + titleDelay;titleDelay += stage.lead;
    });
    const clock = elapsed => {
      let time = elapsed;
      for (const stage of stages) {
        if (time < stage.at) break;
        time -= Math.min(stage.lead, time - stage.at);
      }
      return time;
    };
    // Stop after the corrected state and reference are returned for the next window.
    const duration = openingHold + titleDelay + decisionTiming.nextDraftAt + 1800;
    const verificationSteps = Array.from({length: 4}, (_, i) => {
      const targetStart = batchTiming.verificationStart + batchTiming.acceptanceInterval * i;
      if(!residual)return {eligible:i<=reject,targetStart,targetEnd:targetStart+700,starEnd:targetStart+900,
        meanStart:targetStart+1100,meanEnd:targetStart+1700,curveStart:targetStart+2600,curveEnd:targetStart+3200,
        proposalStart:targetStart+3500,proposalEnd:targetStart+4100,qMeanEnd:targetStart+4300,qStart:targetStart+5300,qEnd:targetStart+6000,
        offsetStart:targetStart+6400,offsetEnd:targetStart+6900,deltaStart:targetStart+8050,deltaEnd:targetStart+8850,
        flowStart:targetStart+9500,flowEnd:targetStart+10100,positionEnd:targetStart+10300,
        ratioStart:targetStart+10500,ratioEnd:targetStart+11100,
        logcalcStart:targetStart+12350,logcalcEnd:targetStart+12850,
        uniformStart:targetStart+14000,uniformEnd:targetStart+14450,
        circleStart:targetStart+15050,circleEnd:targetStart+15850,
        testLinkStart:targetStart+15950,testLinkEnd:targetStart+16350,
        formulaStart:targetStart+16550,formulaEnd:targetStart+17000,
        comparisonStart:targetStart+17300,comparisonEnd:targetStart+17550,
        decisionAt:targetStart+17850,stateEnd:targetStart+18250};
      return {eligible: i <= reject, targetStart, targetEnd: targetStart + 1000, starEnd: targetStart + 1300,
          flowStart: targetStart + 1600, flowEnd: targetStart + 2600, positionEnd: targetStart + 2900,
          circleStart: targetStart + 3200, circleEnd: targetStart + 4000,
          formulaStart: targetStart + 4100, formulaEnd: targetStart + 4650,
          comparisonStart: targetStart + 4800, comparisonEnd: targetStart + 5050,
          decisionAt: targetStart + 5250, stateEnd: targetStart + 5650};
    });
    const phases = [
      {at: 0, name: 'draft'}, {at: batchTiming.inputStart, name: 'input'},
      {at: batchTiming.inputEnd, name: 'batch'}, {at: batchTiming.velocityStart, name: 'velocity'},
      {at: batchTiming.verificationStart, name: 'transfer'},
      ...verificationSteps.filter(step => step.eligible).map((step, i) => ({at: step.decisionAt, name: i === reject ? 'reject' : 'verify'})),
      {at: decisionTiming.discardLabelStart ?? decisionTiming.discardStart, name: 'discard'},
      {at: decisionTiming.correctStart, name: 'correct'}, {at: decisionTiming.returnStart, name: 'reuse'}
    ];
    return {initialTiming, draftTiming, batchTiming, decisionTiming, verificationSteps, phases, stages, clock, duration};
  }
  const timelines = Object.fromEntries(['residual', 'coupling'].map(route => [route, makeTimeline(route)]));
  const timeline = () => timelines[player.dataset.view];
  const titles = {draft: 'Drafting', evaluation: 'One Parallel Call', verification: 'Verification', correction: 'Correction', reuse: 'Next window', reference:'Reference Update'};
  const stageButtons = timelines.residual.stages.filter(stage => stage.key !== 'reference').map(stage => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sagStage = stage.key;
    button.textContent = titles[stage.key];
    button.title = `Jump to ${titles[stage.key]}`;
    button.setAttribute('aria-controls', 'sag-details');
    button.addEventListener('click', () => jumpToStage(stage.key));
    return button;
  });
  stageNav.replaceChildren(...stageButtons);
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  let position = 0, playing = !motion.matches, visible = false, request = null, lastTime = null, lastWidth = 0;
  const playback = Object.fromEntries(['residual', 'coupling'].map(route => [route, {position: 0, playing: !motion.matches}]));
  const transport = SamplingPlayback.attach({
    player, duration: () => timeline().duration, getPosition: () => position, getPlaying: () => playing,
    seek: value => {position = Math.max(0, Math.min(timeline().duration, value));lastTime = null;render();},
    setPlaying: value => {playing = value;updatePlayback();},
    describe: () => player.dataset.description || 'Drafting'
  });
  function render() {
    const {initialTiming, draftTiming, batchTiming, decisionTiming, verificationSteps, phases, stages, clock, duration} = timeline();
    const residual = player.dataset.view === 'residual';
    const elapsed = Math.max(0, position - openingHold), t = clock(elapsed);
    const preparingReference = t < initialTiming.draftStart;
    const progress = (a, b) => ease(clamp((t - a) / (b - a)));
    const phase = phases.findLast(phase => t >= phase.at);
    const stage = stages.findLast(stage => t >= stage.at);
    const nextDraft = t >= decisionTiming.nextDraftAt;
    const arrangingDrafts = t >= batchTiming.inputStart && t < batchTiming.modelStart;
    const nextStage = stages.find(s => s.at > t);
    const outgoingTitle = nextStage ? 1 - progress(nextStage.at - 600, nextStage.at - 300) : 1;
    const reuseTitle = stage.key === 'reference' ? 1 - progress(decisionTiming.sceneFadeStart, decisionTiming.sceneFadeEnd) : 1;
    const titleOpacity = arrangingDrafts ? 1 - progress(batchTiming.inputStart, batchTiming.inputStart + titleFade)
      : nextDraft ? progress(decisionTiming.nextDraftAt, decisionTiming.nextDraftAt + titleFade)
      : ease(clamp((elapsed - stage.start) / titleFade)) * outgoingTitle * reuseTitle;
    const title = nextDraft ? 'Drafting' : titles[stage.key];
    const activeStage = nextDraft ? 'draft' : stage.key === 'reference' ? 'reuse' : stage.key;
    if (player.dataset.stage !== activeStage) {
      player.dataset.stage = activeStage;
      stageButtons.forEach(button => {
        if (button.dataset.sagStage === activeStage) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }
    const labels = {verify: 'Accept draft', reject: 'Reject draft', discard: 'Discard', correct: player.dataset.view === 'residual' ? 'Replace' : 'Reflect'};
    player.dataset.phase = phase.name;
    player.dataset.window = '1';
    player.dataset.description = labels[phase.name] || title;
    player.dataset.finished = String(position === duration);
    const modelVisibleAt = initialTiming.inputEnd + 250;
    note.hidden = !(t >= modelVisibleAt && t < batchTiming.sceneFadeEnd);
    note.style.opacity = String(progress(modelVisibleAt, modelVisibleAt + 200)
      * (1 - progress(batchTiming.sceneFadeStart,batchTiming.sceneFadeEnd)));
    caption.hidden = !labels[phase.name];
    caption.textContent = labels[phase.name] || '';
    caption.style.opacity = String(['verify', 'reject'].includes(phase.name) ? progress(phase.at, phase.at + titleFade) : phase.name === 'correct' ? titleOpacity : 1);
    if(!residual&&phase.name==='discard')caption.style.opacity=String(progress(decisionTiming.discardLabelStart,decisionTiming.discardLabelStart+250)
      *(1-progress(decisionTiming.discardLabelFadeStart,decisionTiming.discardLabelEnd)));
    const layout = details.update({t, start: 0, reject, complete: false, preparingReference,
      handoff: 0, anchorChange: progress(decisionTiming.returnEnd, decisionTiming.returnEnd + 600),
      phase: phase.name, title, titleOpacity, initialTiming, draftTiming, batchTiming, decisionTiming, verificationSteps});
    if (layout) {
      if (layout.inlineActions) caption.hidden = true;
      const svg = layout.svg, bounds = svg.getBoundingClientRect(), frame = views.getBoundingClientRect();
      const box = svg.viewBox.baseVal, scale = bounds.width / box.width;
      function place(element, anchor) {
        if (element.hidden) return;
        const left = bounds.left - frame.left + (anchor.x - box.x) * scale - element.offsetWidth * (anchor.align ?? .5);
        const top = bounds.top - frame.top + (anchor.y - box.y) * scale - element.offsetHeight * (anchor.valign ?? 1);
        element.style.left = `${Math.max(8, Math.min(views.clientWidth - element.offsetWidth - 8, left))}px`;
        element.style.top = `${Math.max(8, Math.min(views.clientHeight - element.offsetHeight - 8, top))}px`;
      }
      const anchor = layout.actionAnchor;
      place(caption, innerWidth >= 768 ? {...anchor, x: anchor.x + 10 / scale} : anchor);
      placeMobileNote(svg, layout.noteAnchor);
      if (innerWidth >= 768) place(note, layout.noteAnchor);
    }
    transport.update();
  }
  function jumpToStage(key) {
    const stage = timeline().stages.find(stage => stage.key === key);
    if (!stage) return;
    // Use this algorithm's timeline, including its opening/title holds. Land
    // on the fully visible heading before the phase's first operation starts.
    position = openingHold + stage.start + titleFade;
    playing = !motion.matches;
    lastTime = null;
    render();updatePlayback();
  }
  function selectView(tab) {
    const route = tab.dataset.sagView;
    if (route === player.dataset.view) return;
    playback[player.dataset.view] = {position, playing};
    player.dataset.view = route;
    ({position, playing} = playback[route]);
    tabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));button.tabIndex = active ? 0 : -1;
      player.querySelector(`#${button.getAttribute('aria-controls')}`).hidden = !active;
    });
    details.resize();render();updatePlayback();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectView(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();tabs[next].focus();selectView(tabs[next]);
    });
  });
  function resize() {
    const width = player.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;
    details.resize();render();
  }
  function updatePlayback() {
    play.dataset.playing = String(playing);play.title = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} SAG algorithm animation`);
    if (request !== null) cancelAnimationFrame(request);
    request = null;lastTime = null;
    if (playing && visible && !document.hidden) request = requestAnimationFrame(tick);
  }
  function tick(time) {
    const duration = timeline().duration;
    if (lastTime !== null) position = Math.min(duration, position + time - lastTime);
    lastTime = time;render();
    if (position === duration) {playing = false;updatePlayback();}
    else request = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (!playing && position === timeline().duration) {position = 0;render();}
    playing = !playing;updatePlayback();
  });
  replay.addEventListener('click', () => {position = 0;playing = true;render();updatePlayback();});
  play.disabled = replay.disabled = false;
  player.querySelector('#sag-view-tabs').hidden = false;
  stageNav.hidden = false;
  new ResizeObserver(resize).observe(player);
  host.addEventListener('sag-detail-scroll', render);
  new IntersectionObserver(entries => {visible = entries[0].intersectionRatio >= .5;updatePlayback();}, {threshold: .5}).observe(views);
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', () => {if (motion.matches) {playing = false;updatePlayback();}});
  resize();updatePlayback();
})();
