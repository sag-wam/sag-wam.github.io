/* Figure 2's shared SAG workflow. The acceptance path is an illustration,
   not a recorded experiment; the strip uses normalized per-call latency. */
(async () => {
  const player = document.querySelector('#sag-player');
  if (!player) return;
  const host = document.querySelector('#sag-diagram');
  const play = document.querySelector('#sag-play');
  const replay = document.querySelector('#sag-replay');
  const heading = document.querySelector('#sag-playback-heading');
  const phaseTitle = document.querySelector('#sag-phase-title');
  const phaseNote = document.querySelector('#sag-phase-note');
  const actionCaption = document.querySelector('#sag-action-caption');
  const views = player.querySelector('.sag-views');
  const ledger = document.querySelector('#sag-call-ledger');
  const chart = document.querySelector('#sag-call-chart');
  const total = document.querySelector('#sag-call-total');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let svg;
  try {
    const response = await fetch('static/images/speculative-integration.svg');
    if (!response.ok) throw new Error('Diagram unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid diagram');
    svg = document.importNode(doc.documentElement, true);
    host.replaceChildren(svg);
  } catch { return; }
  const select = id => svg.querySelector(`#sa-${id}`);
  // The process view annotates the initial call beside drafting; its full
  // reference construction remains in the algorithm detail views.
  select('spec-initialize').remove();
  const panel = select('spec-window');
  const inputs = Array.from({length: 5}, (_, i) => select(`sag-in-${i}`));
  const outputs = Array.from({length: 4}, (_, i) => select(`spec-result-${i + 1}`));
  const inputArrows = Array.from({length: 4}, (_, i) => select(`batch-input-${i}`));
  const outputArrows = Array.from({length: 4}, (_, i) => select(`batch-output-${i}`));
  const velocities = Array.from({length: 4}, (_, i) => select(`spec-velocity-${i}`));
  const boxes = Object.fromEntries([...panel.querySelectorAll('[data-part]')].map(e => [e.dataset.part, e]));
  const model = select('sag-dit');
  const corrected = select('sag-corrected');
  const correctionArrow = select('first-rejection-correction');
  const reuseArrow = select('next-window-return');
  const draftArrow = select('draft-window-generation');
  const ns = 'http://www.w3.org/2000/svg';
  const make = (tag, attrs) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  // Keep Figure 2's font and column centers, with more space above the diagram.
  // The current manuscript calls its model column "One Parallel Call".
  const processHeadingY = 59;
  const nextWindowTitle = 'Next window';
  const completionTitle = '10 integration steps completed with 4 DiT calls';
  const figureHeadings = Object.fromEntries([
    ['draft', 'Drafting', 775], ['evaluation', 'One Parallel Call', 1087],
    ['verification', 'Verification', 1388], ['correction', 'Correction', 1635],
    ['reuse', nextWindowTitle, 1100], ['complete', completionTitle, 1195]
  ].map(([key, title, x]) => {
    const label = make('text', {id: `sa-heading-${key}`, x, y: processHeadingY, 'text-anchor': 'middle',
      'font-family': 'SpeCaTimes,Times New Roman,Times,serif', 'font-size': 29, 'font-weight': 400, fill: '#000000', opacity: 0});
    label.textContent = title;svg.appendChild(label);return [key, label];
  }));
  const focus = make('rect', {x: 1305, y: 164, width: 166, height: 355, rx: 3, class: 'sampling-focus', 'aria-hidden': 'true'});
  panel.appendChild(focus);
  // Keep the starting state in place while one round hands off to the next.
  // Update its index after the return arrow arrives, before fading the round.
  const anchorLayer = make('g', {id: 'sa-round-anchor'});
  anchorLayer.append(boxes['anchor-box'], inputs[0]);
  svg.appendChild(anchorLayer);
  const anchorIndex = inputs[0].querySelector('[data-index-bank]');
  const nextAnchorIndex = make('g', {id: 'sa-next-anchor-index', 'aria-hidden': 'true'});
  nextAnchorIndex.appendChild(anchorIndex.cloneNode(true));
  anchorLayer.appendChild(nextAnchorIndex);
  // Carry the correction's exact Figure 2 colors back to the anchor. The
  // returned state stays purple until the next window introduces drafting.
  const returnedAnchorBox = boxes['anchor-box'].cloneNode(false);
  returnedAnchorBox.dataset.part = 'returned-anchor-box';
  returnedAnchorBox.removeAttribute('filter');
  returnedAnchorBox.setAttribute('fill', boxes['corrected-box'].getAttribute('fill'));
  boxes['anchor-box'].after(returnedAnchorBox);
  const anchorCircle = inputs[0].querySelector('circle');
  const correctedCircle = corrected.querySelector('circle');
  const returnedAnchorCircle = anchorCircle.cloneNode(false);
  returnedAnchorCircle.dataset.part = 'returned-anchor-circle';
  for (const attribute of ['fill', 'stroke']) returnedAnchorCircle.setAttribute(attribute, correctedCircle.getAttribute(attribute));
  anchorCircle.after(returnedAnchorCircle);
  // Preserve Figure 2's straight arrows and original u labels. Pause the
  // moving tip under u (x=1248) before continuing to the verification state.
  const velocityOutputFraction = (1248 - 1164) / (1364 - 1164);
  const inputFlows = inputArrows.map(path => SamplingPlayback.traceArrow(path));
  const outputFlows = outputArrows.map(path => SamplingPlayback.traceArrow(path));
  const correctionFlow = SamplingPlayback.traceArrow(correctionArrow);
  const reuseFlow = SamplingPlayback.traceArrow(reuseArrow);
  // A fully accepted window returns its last green state directly. It never
  // visits the purple correction column.
  const acceptedReturnArrow = make('path', {id: 'sa-all-accepted-return',
    d: 'M 1412 456 H 1450 Q 1466 456 1466 472 V 527 Q 1466 543.298058 1450 543.298058 H 640 Q 622 543.298058 622 524.531149 V 138.766909 Q 622 120 640 120 H 743',
    fill: 'none', stroke: '#538235', 'stroke-width': 2.2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'marker-end': 'url(#sa-arrow-green)'});
  panel.appendChild(acceptedReturnArrow);
  const acceptedReturnFlow = SamplingPlayback.traceArrow(acceptedReturnArrow);
  const drawDraftArrow = SamplingPlayback.traceArrow(draftArrow);
  // Progress by 3, 4, then 3 steps. The middle window exercises the
  // nonterminal all-accepted branch; the last window stops at x_10.
  const windows = [{start: 0, length: 4, reject: 2}, {start: 3, length: 4, reject: null}, {start: 7, length: 3, reject: null}];
  const latencyDescription = make('title', {});
  latencyDescription.textContent = 'Schematic DiT latency: one initial call plus three slightly longer batched calls, approximately four single-call time units. Segment widths are illustrative, not measured.';
  chart.appendChild(latencyDescription);
  const costSegments = Array.from({length: 4}, (_, i) => {
    const e = make('rect', {class: 'latency-segment', y: 2, height: 16, rx: 2, 'data-call': i});
    if (i > 0) e.style.setProperty('--sampling-latency-fill', 'var(--sampling-batch-latency-fill)');
    const title = make('title', {});
    title.textContent = i === 0 ? 'One initial DiT call to obtain v_0; no integration step committed' : `Batched call ${i}: ${windows[i - 1].length} predecessor velocities evaluated together`;
    e.appendChild(title);chart.appendChild(e);return e;
  });
  const openingHold = 500, initDuration = openingHold + 2400;
  const nextWindowHold = 500, anchorColorDuration = 400, anchorColorSettle = 120;
  const viewOffset = () => initDuration;
  const {batchTiming: processBatchTiming, decisionTiming: processDecisionTiming,
    verificationTiming: processVerificationTiming,
    completionHold, titleLead, titleFade, intros: processIntros, clock: processClock} = SAGTiming;
  const windowTiming = windows.map(({length, reject}, i) => {
    const verificationEnd = processBatchTiming.acceptanceStart + (length - 1) * processBatchTiming.acceptanceInterval
      + processVerificationTiming.decisionLead + processVerificationTiming.transferDuration + processVerificationTiming.stateRevealDuration;
    const returns = i < windows.length - 1;
    const returnStart = reject === null ? verificationEnd + completionHold : processDecisionTiming.returnStart;
    const returnEnd = returnStart + processDecisionTiming.returnEnd - processDecisionTiming.returnStart;
    const intros = processIntros(reject);
    if (reject === null && returns) intros.push({at: returnStart, key: 'reuse',
      start: returnStart + intros.length * titleLead, duration: titleLead});
    return {returns, returnStart, returnEnd, intros,
      duration: (returns ? returnEnd + 1000 : verificationEnd + completionHold) + intros.length * titleLead};
  });
  const makeTimeline = (activeDurations, enterDuration, exitDurations, firstHold = 500) => {
    let offset = 0;
    const rounds = activeDurations.map((activeDuration, i) => {
      const roundLead = enterDuration + (i === 0 ? firstHold : nextWindowHold + anchorColorDuration + anchorColorSettle), exitDuration = exitDurations[i];
      const windowDuration = roundLead + activeDuration + exitDuration;
      const round = {offset, enterDuration, roundLead, activeDuration, exitDuration};
      offset += windowDuration;
      return round;
    });
    return {rounds, duration: initDuration + offset + 1500};
  };
  const timeline = makeTimeline(windowTiming.map(round => round.duration), 0, [1000, 1000, 0], 1000);
  const getTimeline = () => timeline;
  const getDuration = () => getTimeline().duration;
  // Stage titles lead their actions; decision labels stay beside the states.
  const processPhases = ({length, reject}, timing) => [
    {start: 0, name: 'draft', title: 'Drafting', center: 775, label: {x: 775, y: processHeadingY}},
    {start: processBatchTiming.inputStart, name: 'input', title: '', center: 1087, label: {x: 1087, y: 85}},
    {start: processBatchTiming.inputEnd, name: 'batch', title: 'Batched DiT call', fade: 300, center: 1087, label: {x: 1087, y: 85}},
    {start: processBatchTiming.velocityStart, name: 'velocity', title: 'Velocities for verification', fade: 300, center: 1248, label: {x: 1248, y: 85}},
    {start: processBatchTiming.verificationStart, name: 'transfer', title: '', center: 1388, label: {x: 1388, y: 160}},
    ...Array.from({length: reject ?? length}, (_, i) => ({
      start: processBatchTiming.acceptanceStart + i * processBatchTiming.acceptanceInterval,
      name: 'verify', title: 'Accept draft', center: 1388, label: {x: 1478, y: 204 + 84 * i, align: 0, valign: .5}
    })),
    ...(reject === null ? [] : [
      {start: processDecisionTiming.rejectAt, name: 'reject', title: 'Reject draft', center: 1388, label: {x: 1478, y: 372, align: 0, valign: .5}},
      {start: processDecisionTiming.discardStart, name: 'discard', title: 'Discard', center: 1388, label: {x: 1478, y: 456, align: 0, valign: .5}},
      {start: processDecisionTiming.correctStart, name: 'correct', title: 'Correction', center: 1510, label: {x: 1635, y: processHeadingY}}
    ]),
    ...(timing.returns ? [{start: timing.returnStart, name: 'reuse', title: nextWindowTitle,
      center: 1100, label: {x: 1100, y: processHeadingY}}] : [])
  ];
  let position = initDuration, playing = !motion.matches, visible = false, request = null, lastTime = null;
  let viewWidth = 1236, scale = 1, compact = false, wideCenter = 1195, callWidth = 100, lastWidth = 0, lastPlayerWidth = 0, lastChartWidth = 0;
  // A barely longer batch segment distinguishes approximate latency from
  // exact call count; this 1% visual difference is not an empirical estimate.
  const segmentWidth = i => (callWidth - 2) * (i === 0 ? 1 : 1.01);
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => x * x * (3 - 2 * x);
  const opacity = (e, a) => {e.style.opacity = String(a);};
  const bankValue = (node, n) => {
    node.querySelectorAll('[data-index-bank] > [data-value]').forEach(e => {e.style.display = +e.dataset.value === n ? '' : 'none';});
  };
  const transport = SamplingPlayback.attach({
    player, duration: () => getDuration() - viewOffset(), getPosition: () => position - viewOffset(), getPlaying: () => playing,
    seek: value => { position = Math.max(viewOffset(), Math.min(getDuration(), value + viewOffset())); lastTime = null; render(); },
    setPlaying: value => { playing = value; updatePlayback(); },
    describe: () => player.dataset.description || phaseTitle.textContent
  });
  function render() {
    const batchTiming = processBatchTiming;
    const decisionTiming = processDecisionTiming;
    const acceptanceStart = batchTiming.acceptanceStart;
    const acceptanceInterval = batchTiming.acceptanceInterval;
    const {rounds} = getTimeline(), finalRound = rounds[rounds.length - 1];
    const initializing = position < initDuration;
    const complete = position >= initDuration + finalRound.offset + finalRound.roundLead + finalRound.activeDuration;
    const w = Math.max(0, rounds.findLastIndex(round => position >= initDuration + round.offset));
    const {offset, enterDuration, roundLead, activeDuration, exitDuration} = rounds[w];
    const {start, length, reject} = windows[w];
    const timing = windowTiming[w];
    const roundTime = Math.max(0, position - initDuration - offset);
    // Freeze the algorithm clock while the next round settles into view.
    const elapsed = Math.max(0, Math.min(activeDuration, roundTime - roundLead));
    const {intros} = timing;
    const t = processClock(elapsed, intros);
    const introProgress = key => {
      const intro = intros.find(stage => stage.key === key);
      return intro ? ease(clamp((elapsed - intro.start) / titleFade)) : 0;
    };
    const prog = (a, b) => ease(clamp((t - a) / (b - a)));
    const entering = w > 0;
    const openingReveal = w === 0 ? prog(0, 300) : 1;
    const anchorChange = timing.returns ? prog(timing.returnEnd, timing.returnEnd + 400) : 0;
    const handoff = w < windows.length - 1 ? ease(clamp((roundTime - roundLead - activeDuration) / exitDuration)) : 0;
    const sceneOpacity = (1 - .94 * handoff) * openingReveal;
    const phases = processPhases(windows[w], timing);
    let phaseIndex = phases.findLastIndex(p => t >= p.start);
    const phase = phases[Math.max(0, phaseIndex)];
    const verificationPhase = ['transfer', 'verify', 'reject', 'discard', 'correct'].includes(phase.name);
    // Figure 2 places all column headings on the same row. Decisions remain
    // separate annotations beside their corresponding states.
    const column = complete ? {key: 'complete', title: completionTitle, x: 1195}
      : phase.name === 'draft' ? {key: 'draft', title: 'Drafting', x: 775}
      : ['input', 'batch', 'velocity'].includes(phase.name) ? {key: 'evaluation', title: 'One Parallel Call', x: 1087}
      : phase.name === 'correct' ? {key: 'correction', title: 'Correction', x: 1635}
      : phase.name === 'reuse' ? {key: 'reuse', title: nextWindowTitle, x: 1100}
      : verificationPhase ? {key: 'verification', title: 'Verification', x: 1388} : null;
    const verificationSteps = outputs.map((_, i) => {
      const decisionAt = acceptanceStart + acceptanceInterval * i;
      const flowStart = decisionAt + processVerificationTiming.decisionLead;
      const flowEnd = flowStart + processVerificationTiming.transferDuration;
      return {eligible: i < length && (reject === null || i <= reject), decisionAt, flowStart, flowEnd,
        stateEnd: flowEnd + processVerificationTiming.stateRevealDuration};
    });
    const batches = initializing ? 0 : w + (t >= 6000 ? 1 : 0);
    const initialCallProgress = w === 0 ? prog(400, 800) : 1;
    const initialized = initialCallProgress > 0;
    const callCount = Number(initialized) + batches;
    let committed = start;
    for (let i = 0; i < length; i++) if ((reject === null || i < reject) && t >= verificationSteps[i].stateEnd) committed++;
    if (reject !== null && t >= decisionTiming.replacementEnd) committed++;
    if (complete) committed = 10;
    player.dataset.phase = initializing ? 'initialize' : complete ? 'complete' : phase.name;
    player.dataset.window = String(w + 1);
    player.dataset.windowLength = String(length);
    player.dataset.calls = String(callCount);
    player.dataset.committed = String(committed);
    player.dataset.pacing = initializing ? position < openingHold ? 'hold' : 'active'
      : complete ? 'complete' : roundTime < enterDuration && entering ? 'enter'
      : roundTime < roundLead ? 'hold' : roundTime >= roundLead + activeDuration ? 'handoff' : 'active';
    phaseTitle.textContent = column?.title ?? '';
    heading.hidden = true;
    player.dataset.description = complete ? phaseTitle.textContent : phase.title || ({input: 'Send drafts to the DiT', transfer: 'Transfer verification velocities', reuse: 'Return to the next window'}[phase.name] ?? phaseTitle.textContent);
    phaseNote.hidden = !(w === 0 && phase.name === 'draft' && t > 0);
    actionCaption.hidden = !(!complete && ['verify', 'reject', 'discard'].includes(phase.name));
    actionCaption.textContent = actionCaption.hidden ? '' : phase.title;
    opacity(panel, sceneOpacity);
    opacity(anchorLayer, 1);
    opacity(anchorIndex, 1 - ease(clamp(anchorChange * 2)));
    opacity(nextAnchorIndex, ease(clamp((anchorChange - .5) * 2)));
    const returnedTint = ease(clamp((anchorChange - .5) * 2));
    // Carry either the corrected purple state or the accepted green state.
    // Turn orange and settle before the next Drafting title and its flow.
    const openingTint = w > 0 ? 1 - ease(clamp((roundTime - enterDuration - nextWindowHold) / anchorColorDuration)) : 0;
    const anchorTint = Math.max(returnedTint, openingTint);
    const greenReturn = (anchorChange > 0 ? reject : windows[Math.max(0, w - 1)].reject) === null;
    returnedAnchorBox.setAttribute('fill', greenReturn ? boxes['result-box'].getAttribute('fill') : boxes['corrected-box'].getAttribute('fill'));
    const sourceCircle = greenReturn ? outputs[0].querySelector('[data-variant="accepted"] circle') : correctedCircle;
    for (const attribute of ['fill', 'stroke']) returnedAnchorCircle.setAttribute(attribute, sourceCircle.getAttribute(attribute));
    opacity(returnedAnchorBox, anchorTint);
    opacity(returnedAnchorCircle, anchorTint);
    bankValue(nextAnchorIndex, windows[Math.min(w + 1, windows.length - 1)].start);
    const titleProgress = complete ? 1 : column ? introProgress(column.key) : 0;
    const nextRoundLabel = w > 0 ? ease(clamp(roundTime / 350)) : 1;
    opacity(heading, (1 - handoff) * titleProgress * nextRoundLabel);
    for (const [key, label] of Object.entries(figureHeadings)) {
      opacity(label, column?.key === key ? (1 - handoff) * titleProgress * nextRoundLabel : 0);
    }
    opacity(phaseNote, openingReveal);
    opacity(actionCaption, (1 - handoff) * (['verify', 'reject'].includes(phase.name) ? prog(phase.start, phase.start + titleFade) : 1));
    const discardProgress = prog(decisionTiming.discardStart, decisionTiming.discardEnd);
    inputs.forEach((e, i) => {
      e.style.display = i <= length ? '' : 'none';
      bankValue(e, start + i);
      const shown = i === 0 ? 1 : prog(400 + i * 420, 700 + i * 420);
      // Keep the endpoint bright during evaluation; dim it only when the
      // remaining drafts are discarded after rejection.
      const discarded = reject !== null && i > reject + 1;
      opacity(e, (.06 + .94 * shown) * (discarded ? 1 - .88 * discardProgress : 1));
    });
    opacity(boxes['anchor-box'], 1);
    boxes['draft-box'].setAttribute('height', 84 * length);
    boxes['result-box'].setAttribute('height', 84 * length);
    focus.setAttribute('height', 84 * length + 19);
    opacity(boxes['draft-box'], .06 + .94 * prog(400, 900));
    opacity(draftArrow, .18 + .82 * prog(0, 400));
    drawDraftArrow(prog(0, 800));
    // Activate once, only after the incoming arrows reach the model.
    opacity(model, .06 + .94 * prog(batchTiming.inputEnd, batchTiming.inputEnd + 300));
    inputArrows.forEach((e, i) => {e.style.display = i < length ? '' : 'none';opacity(e, .08 + .92 * prog(batchTiming.inputStart, batchTiming.inputStart + 400));});
    outputArrows.forEach((e, i) => {e.style.display = i < length ? '' : 'none';opacity(e, .06 + .94 * prog(batchTiming.outputStart, batchTiming.outputStart + 200) - (reject !== null && i > reject ? .92 * discardProgress : 0));});
    velocities.forEach((e, i) => {
      e.style.display = i < length ? '' : 'none';
      e.querySelectorAll('[data-value]').forEach(g => {g.style.display = +g.dataset.value === start + i ? '' : 'none';});
      opacity(e, .06 + .94 * prog(batchTiming.velocityStart, batchTiming.velocityEnd) - (reject !== null && i > reject ? .92 * discardProgress : 0));
    });
    const resultProgress = prog(batchTiming.verificationStart, batchTiming.verificationStart + 300);
    opacity(boxes['result-box'], .06 + .94 * resultProgress);
    outputs.forEach((e, i) => {
      e.style.display = i < length ? '' : 'none';
      bankValue(e, start + i + 1);
      const decided = i < length && t >= acceptanceStart + i * acceptanceInterval && (reject === null || i <= reject);
      const discarded = reject !== null && i > reject && t >= decisionTiming.discardStart;
      const kind = decided ? i === reject ? 'rejected' : 'accepted' : 'pending';
      e.dataset.outcome = discarded ? 'discarded' : kind;
      e.querySelectorAll('[data-variant]').forEach(v => {v.style.display = v.dataset.variant === kind ? '' : 'none';});
      const step = verificationSteps[i];
      // State and index appear only after this decision and its arrow.
      // Unverified trailing drafts appear only as discarded placeholders.
      opacity(e, discarded ? .12 * discardProgress : step.eligible ? prog(step.flowEnd, step.stateEnd) : 0);
    });
    bankValue(corrected, start + (reject ?? 0) + 1);
    opacity(corrected, reject !== null ? prog(decisionTiming.replacementStart, decisionTiming.replacementEnd) : 0);
    opacity(boxes['corrected-box'], reject !== null ? prog(decisionTiming.replacementStart, decisionTiming.replacementEnd) : 0);
    opacity(correctionArrow, reject !== null ? prog(decisionTiming.correctStart, decisionTiming.correctStart + 300) : 0);
    opacity(reuseArrow, reject !== null ? prog(decisionTiming.returnStart, decisionTiming.reuseEnd) : 0);
    opacity(acceptedReturnArrow, reject === null && timing.returns ? prog(timing.returnStart, timing.returnStart + 300) : 0);
    opacity(focus, .7 * resultProgress);
    inputFlows.forEach(draw => draw(prog(batchTiming.inputStart, batchTiming.inputEnd)));
    outputFlows.forEach((draw, i) => {
      const step = verificationSteps[i];
      const verificationFlow = step.eligible ? prog(step.flowStart, step.flowEnd) : 0;
      draw(velocityOutputFraction * prog(batchTiming.outputStart, batchTiming.outputEnd) + (1 - velocityOutputFraction) * verificationFlow);
    });
    correctionFlow(reject !== null ? prog(decisionTiming.correctStart, decisionTiming.correctEnd) : 0);
    reuseFlow(reject !== null ? prog(decisionTiming.returnStart, decisionTiming.returnEnd) : 0);
    acceptedReturnFlow(reject === null && timing.returns ? prog(timing.returnStart, timing.returnEnd) : 0);
    // Only narrow screens need to follow the active stage across Figure 2.
    let center = wideCenter;
    if (compact && !initializing) {
      if (phaseIndex <= 0) {
        center = 775;
      } else {
        const previous = phases[phaseIndex - 1].center;
        const intro = intros.find(stage => stage.at === phase.start);
        const pan = intro ? ease(clamp((elapsed - intro.start) / titleLead)) : prog(phase.start, phase.start + 800);
        center = previous + (phase.center - previous) * pan;
      }
      if (phase.name === 'reuse' && t >= timing.returnEnd - 800) {
        center = 1100 + (775 - 1100) * prog(timing.returnEnd - 800, timing.returnEnd);
      }
      if (complete) center = 1388;
    }
    svg.setAttribute('viewBox', `${center - viewWidth / 2} 20 ${viewWidth} 530`);
    figureHeadings.reuse.setAttribute('x', center);
    figureHeadings.complete.setAttribute('x', center);
    SAGLatencyMath.render(total, batches > 0 ? `batch-${batches}` : `dit-${callCount}`);
    // Keep the baseline's visual time unit when the full LaTeX expression
    // takes up more horizontal space.
    const chartWidth = chart.clientWidth;
    const baselineUnit = (document.querySelector('#sampling-latency-chart').clientWidth + 2) / 10;
    if (chartWidth !== lastChartWidth || baselineUnit !== callWidth) {
      lastChartWidth = chartWidth;callWidth = baselineUnit;
      chart.setAttribute('viewBox', `0 0 ${chartWidth} 20`);
      let segmentX = 0;
      costSegments.forEach((e, i) => {e.setAttribute('x', segmentX);segmentX += segmentWidth(i) + 2;});
    }
    costSegments.forEach((e, i) => {
      let amount = i === 0 ? initialCallProgress : initializing ? 0 : i <= w ? 1 : i === w + 1 ? prog(6000, 6300) : 0;
      if (complete) amount = 1;
      opacity(e, amount === 0 ? 0 : 1);e.setAttribute('width', segmentWidth(i) * amount);
    });
    total.setAttribute('aria-label', `${Number(initialized)} initial call plus ${batches} batched calls, approximately ${callCount} single-call time units`);
    chart.setAttribute('aria-label', `Schematic cumulative DiT latency: ${Number(initialized)} initial call and ${batches} slightly longer batches, approximately ${callCount} single-call time units. Illustrative, not measured.`);
    transport.update();
    // Place each annotation beside its operation in the SVG camera.
    const label = complete ? {x: 1388, y: processHeadingY} : column ? {x: column.x, y: processHeadingY} : phase.label;
    function placeCaption(element, anchor, diagram) {
      if (!diagram || element.hidden) return;
      const bounds = diagram.getBoundingClientRect(), frame = views.getBoundingClientRect();
      const box = diagram.viewBox.baseVal, diagramScale = bounds.width / box.width;
      const left = bounds.left - frame.left + (anchor.x - box.x) * diagramScale - element.offsetWidth * (anchor.align ?? .5);
      const top = bounds.top - frame.top + (anchor.y - box.y) * diagramScale - element.offsetHeight * (anchor.valign ?? 1);
      element.style.left = `${Math.max(8, Math.min(views.clientWidth - element.offsetWidth - 8, left))}px`;
      element.style.top = `${Math.max(8, Math.min(views.clientHeight - element.offsetHeight - 8, top))}px`;
    }
    placeCaption(heading, label, svg);
    const actionAnchor = phase.label;
    placeCaption(actionCaption, innerWidth >= 768 ? {...actionAnchor, x: actionAnchor.x + 10 / scale} : actionAnchor, svg);
    placeCaption(phaseNote, {x: 686, y: 239.5, valign: .5}, svg);
    if (!phaseNote.hidden) {
      // The note sits on the dashed drafting path. On narrow screens, keep
      // its right edge clear of the neighboring draft-state box.
      const draftBox = boxes['draft-box'].getBoundingClientRect(), frame = views.getBoundingClientRect();
      const clearLeft = draftBox.left - frame.left - phaseNote.offsetWidth - 4;
      phaseNote.style.left = `${Math.max(8, Math.min(parseFloat(phaseNote.style.left), clearLeft))}px`;
    }
  }
  function resize() {
    // On phones the complete process is a scrollable canvas, independent of
    // the playback controls' width. Desktop keeps its existing camera.
    const width = innerWidth < 768 ? views.clientWidth : player.clientWidth;
    if (!width || width === lastWidth && player.clientWidth === lastPlayerWidth) return;
    lastWidth = width;lastPlayerWidth = player.clientWidth;
    scale = SamplingPlayback.diagramScale(innerWidth < 768 ? player.clientWidth : width);
    viewWidth = width / scale;
    compact = innerWidth >= 768 && viewWidth < 1160;
    // Reserve room for the first-round note at its desktop text size.
    const noteHidden = phaseNote.hidden;
    phaseNote.hidden = false;
    const noteSpace = phaseNote.offsetWidth + 12;
    phaseNote.hidden = noteHidden;
    wideCenter = Math.min(1195, viewWidth / 2 + boxes['draft-box'].getBBox().x - noteSpace / scale);
    svg.style.height = `${530 * scale}px`;
    player.style.setProperty('--sag-top-extension', `${60 * scale}px`);
    player.style.setProperty('--sag-stage-height', `${470 * scale}px`);
    render();
  }
  function updatePlayback() {
    play.dataset.playing = String(playing);play.title = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} SAG animation`);
    if (request !== null) cancelAnimationFrame(request);
    request = null;lastTime = null;
    if (playing && visible && !document.hidden) request = requestAnimationFrame(tick);
  }
  function tick(time) {
    if (lastTime !== null) position = Math.min(getDuration(), position + time - lastTime);
    lastTime = time;render();
    if (position === getDuration()) {playing = false;updatePlayback();}
    else request = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => {
    if (!playing && position === getDuration()) {position = viewOffset();render();}
    playing = !playing;updatePlayback();
  });
  replay.addEventListener('click', () => {position = viewOffset();playing = true;render();updatePlayback();});
  play.disabled = replay.disabled = false;heading.hidden = ledger.hidden = false;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(player);resizeObserver.observe(views);
  // Start the opening hold when the diagram is in view, not when only its
  // tabs have entered the viewport while the reader is scrolling down.
  new IntersectionObserver(entries => {visible = entries[0].intersectionRatio >= .5;updatePlayback();}, {threshold: .5}).observe(views.closest('.sag-process-viewport'));
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', () => {if (motion.matches) {playing = false;updatePlayback();}});
  resize();updatePlayback();
})();
