/* Timing for the full SAG process animation. */
window.SAGTiming = (() => {
  const processBatchTiming = {
    inputStart: 3600, inputEnd: 4400,
    velocityStart: 6000, velocityEnd: 6300,
    verificationStart: 6900, outputStart: 5200, outputEnd: 6000,
    acceptanceStart: 7300, acceptanceInterval: 1800
  };
  const processVerificationTiming = {decisionLead: 300, transferDuration: 500, stateRevealDuration: 200};
  const finalVerificationEnd = processBatchTiming.acceptanceStart + 3 * processBatchTiming.acceptanceInterval
    + processVerificationTiming.decisionLead + processVerificationTiming.transferDuration + processVerificationTiming.stateRevealDuration;
  const completionHold = 1000;
  const processDecisionTiming = {
    rejectAt: processBatchTiming.acceptanceStart + 2 * processBatchTiming.acceptanceInterval,
    discardStart: 12500, discardEnd: 13400,
    correctStart: 14000, correctEnd: 15200,
    replacementStart: 15200, replacementEnd: 16000,
    reuseStart: 17000, reuseEnd: 17300,
    returnStart: 17000, returnEnd: 19200
  };
  // Give each stage title its own beat before advancing the diagram clock.
  const titleLead = 400, titleFade = 160;
  const processIntros = (reject, preparation = 0) => [
    {at: 0, key: 'draft'},
    {at: processBatchTiming.inputStart, key: 'evaluation'},
    {at: processBatchTiming.verificationStart, key: 'verification'},
    ...(reject === null ? [] : [
      {at: processDecisionTiming.correctStart, key: 'correction'},
      {at: processDecisionTiming.returnStart, key: 'reuse'}
    ])
  ].map((stage, i) => ({...stage, start: stage.at + i * titleLead + (i ? preparation : 0), duration: titleLead + (i ? 0 : preparation)}));
  const processClock = (elapsed, intros) => {
    let time = elapsed;
    for (const stage of intros) {
      if (time < stage.at) break;
      time -= Math.min(stage.duration, time - stage.at);
    }
    return time;
  };
  return Object.freeze({
    batchTiming: processBatchTiming, decisionTiming: processDecisionTiming,
    verificationTiming: processVerificationTiming, finalVerificationEnd,
    completionHold, titleLead, titleFade, intros: processIntros, clock: processClock
  });
})();
