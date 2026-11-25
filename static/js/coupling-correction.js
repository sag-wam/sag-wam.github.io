/* Continue the rejected Figure 2 check in place. z* is the reflected draft
   noise, not a fresh draw; the clean-action reference uses the cached u_3. */
window.SAGCouplingCorrection = {
  async attach(entry) {
    const ns='http://www.w3.org/2000/svg',purple='#8064A2',blue='#0072B2';
    const make=(tag,attrs={})=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
    const opacity=(e,p)=>{e.style.opacity=String(p);};
    const mix=(a,b,p)=>a+(b-a)*p;
    const {svg,parallel:batch}=entry,check=batch.steps[2];
    const response=await fetch('static/images/detail-coupling-correction.svg');
    if(!response.ok)throw new Error('Coupling correction equations unavailable');
    const asset=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
    svg.querySelector('defs').append(...asset.querySelector('defs').children);
    const root=make('g',{'data-coupling-correction-scene':''});svg.insertBefore(root,entry.title);
    const formulaRoot=make('g',{'data-correction-formula-block':''});svg.insertBefore(formulaRoot,entry.title);
    const upperFormulas=new Set(['reflected','result','center']);
    const math=Object.fromEntries([...asset.querySelectorAll('[data-computation]')].map(row=>{
      const key=row.dataset.computation,width=+row.dataset.width,height=+row.dataset.height;
      const group=make('g',{'data-correction-equation':key});
      const clip=make('clipPath',{id:`coupling-correction-${key}-clip`,clipPathUnits:'userSpaceOnUse'});
      const rect=make('rect',{x:0,y:0,width:0,height});clip.appendChild(rect);svg.querySelector('defs').appendChild(clip);
      const content=make('g',{'clip-path':`url(#${clip.id})`});content.appendChild(row);group.appendChild(content);(upperFormulas.has(key)?formulaRoot:root).appendChild(group);
      return [key,{group,row,width,height,baseline:+row.dataset.baseline,equals:+row.dataset.equalsX,clip:rect,x:0,y:0}];
    }));
    const place=(key,x,y)=>{const m=math[key];m.x=x;m.y=y;m.group.setAttribute('transform',`translate(${x},${y})`);};
    // The purple point label supplies x₃; reveal only its equality and RHS.
    math.result.start=math.result.equals;
    math.result.clip.setAttribute('x',String(math.result.start));
    const show=(key,written,visible=1)=>{const m=math[key];m.clip.setAttribute('width',String((m.width-(m.start??0))*written));opacity(m.group,visible);m.group.dataset.written=String(written);};
    const path=(d,color=purple,attrs={})=>{
      const p=make('path',{d,fill:'none',stroke:color,'stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round',
        'marker-end':`url(#${color===blue?'detail-coupling-annotation-arrow':'detail-svg-coupling-arrow-purple'})`,...attrs});root.appendChild(p);return p;
    };
    const sampleX=check.x,meanP=+check.meanPoint.getAttribute('cx'),meanQ=+check.proposalMean.getAttribute('cx');
    // The density plot is a one-dimensional schematic: reflecting the same
    // draft noise yields mP + (mQ - sample), not a reflection around mP alone.
    const correctedX=meanP+meanQ-sampleX;
    const centerX=(meanP+meanQ)/2;
    const symmetryGuide=make('g',{'data-correction-symmetry-guide':'','aria-label':'One-dimensional reflection about the midpoint of the two means'});root.appendChild(symmetryGuide);
    const centerLine=make('path',{d:`M ${centerX} 8 V 188`,fill:'none',stroke:purple,'stroke-width':1.4,'stroke-dasharray':'4 4','data-correction-center-line':''});
    const centerDot=make('circle',{cx:centerX,cy:150,r:4,fill:'#FFFFFF',stroke:purple,'stroke-width':1.5});symmetryGuide.append(centerLine,centerDot);
    const drawCenter=SamplingPlayback.traceArrow(centerLine);
    const meanGuides=make('g',{'data-correction-density-centers':''});root.appendChild(meanGuides);
    // P and Q have the same variance and peak height. Read the stored curve
    // geometry so this also works while the Coupling tab is initially hidden.
    const densityPeak=150+check.proposalPeak/check.uniformScale;
    const meanCenterLines=[['p',meanP,densityPeak],['q',meanQ,densityPeak]].map(([key,x,y])=>{
      const line=make('path',{d:`M ${x} ${y} V 150`,fill:'none',stroke:'#777777','stroke-width':1.2,'stroke-dasharray':'3 4','data-correction-density-center':key});
      meanGuides.appendChild(line);return {line,draw:SamplingPlayback.traceArrow(line)};
    });
    const noiseLineY=165,deltaLineY=192;
    const noisePath=path(`M ${meanQ} ${noiseLineY} H ${sampleX}`,blue,{'data-correction-noise-displacement':''});
    const drawNoise=SamplingPlayback.traceArrow(noisePath,{terminalLength:12});
    const deltaPath=path(`M ${meanP} ${deltaLineY} H ${meanQ}`,blue,{'data-correction-mean-displacement':''});
    const drawDelta=SamplingPlayback.traceArrow(deltaPath,{terminalLength:12});
    const deltaGuides=make('path',{d:`M ${meanP} 153 V ${deltaLineY+4}`,fill:'none',stroke:blue,'stroke-width':1,'stroke-dasharray':'2 3','data-correction-mean-guides':''});root.appendChild(deltaGuides);
    const reflectedNoise=path(`M ${meanP} ${noiseLineY} H ${correctedX}`,purple,{'data-correction-reflected-displacement':''});
    const movingMarker=svg.querySelector('#detail-coupling-annotation-arrow').cloneNode(true);
    movingMarker.id='coupling-moving-noise-arrow';svg.querySelector('defs').appendChild(movingMarker);
    reflectedNoise.setAttribute('marker-end',`url(#${movingMarker.id})`);
    const noiseGuides=make('g',{'data-correction-noise-guides':''});root.appendChild(noiseGuides);
    const noiseGuideLines=[sampleX,meanQ].map(x=>{const line=make('path',{d:`M ${x} 153 V ${noiseLineY+4}`,stroke:blue,'stroke-width':1,'stroke-dasharray':'2 3'});noiseGuides.appendChild(line);return line;});
    const reflection=path(`M ${sampleX+7} 150 H ${correctedX-7}`,purple,{'data-correction-reflection':''});
    const drawReflection=SamplingPlayback.traceArrow(reflection);
    const reflectStatePath=path(`M ${sampleX+27} 224 H ${correctedX-27}`,purple,{'data-correction-reflect-state':''});
    const drawReflectState=SamplingPlayback.traceArrow(reflectStatePath);
    const reflectLabel=make('text',{x:(sampleX+correctedX)/2,y:260,'text-anchor':'middle',
      'font-family':'SpeCaTimes,Times New Roman,Times,serif','font-size':24,fill:purple,'data-correction-reflect-label':''});
    reflectLabel.textContent='Reflect';root.appendChild(reflectLabel);
    const correctedPoint=make('circle',{cx:sampleX,cy:150,r:6,fill:purple,stroke:'#FFFFFF','stroke-width':1.5,'data-correction-point':''});root.appendChild(correctedPoint);
    const pointRing=make('circle',{cx:correctedX,cy:150,r:10,fill:'none',stroke:purple,'stroke-width':1.5,'data-correction-point-ring':''});root.appendChild(pointRing);
    const pointPointer=path(`M ${correctedX+40} 128 Q ${correctedX+26} 128 ${correctedX+8} 145`,purple,{'data-correction-point-label-arrow':''});
    let drawPointPointer=SamplingPlayback.traceArrow(pointPointer,{terminalLength:8});
    math.point.group.setAttribute('fill',purple);
    const toState=make('path',{d:`M ${correctedX} 157 V 199`,fill:'none',stroke:purple,'stroke-width':1.5,'stroke-dasharray':'3 4','data-correction-to-state':''});root.appendChild(toState);
    const drawToState=SamplingPlayback.traceArrow(toState);
    const travelingPoint=make('circle',{cx:correctedX,cy:150,r:6,fill:purple,stroke:'#FFFFFF','stroke-width':1.5,'data-correction-moving-point':''});root.appendChild(travelingPoint);
    const state=entry.replacement.cloneNode(true);state.removeAttribute('data-node-role');state.setAttribute('data-correction-state','');
    state.prepend(make('rect',{x:508,y:195,width:64,height:58,rx:7,fill:'#E4DFEC',stroke:'#162C51','stroke-width':2.1,filter:'url(#detail-svg-coupling-box-shadow)'}));
    state.querySelectorAll('[data-number]').forEach(e=>{e.style.display=+e.dataset.number===3?'':'none';});
    root.appendChild(state);
    const returnedState=state.cloneNode(true);returnedState.removeAttribute('data-correction-state');returnedState.setAttribute('data-correction-returned-state','');root.appendChild(returnedState);
    const returnPath=path(`M ${correctedX+26} 224 H ${correctedX+44} Q ${correctedX+56} 224 ${correctedX+56} 236 V 290 Q ${correctedX+56} 302 ${correctedX+44} 302 H -10 Q -22 302 -22 290 V 236 Q -22 224 -10 224 H 18`,purple,{'stroke-width':2,'data-correction-return':''});
    root.insertBefore(returnPath,state);const drawReturn=SamplingPlayback.traceArrow(returnPath);
    const reference=batch.references[0].group.cloneNode(true);reference.setAttribute('data-correction-reference','');root.appendChild(reference);
    const refFrame=reference.querySelector('rect'),refGlyph=reference.querySelector('[data-math="abar"]'),refTransform=batch.references[0].glyphTransform;
    const refPulse=make('rect',{x:145,y:234,width:38,height:38,rx:5,fill:'none',stroke:purple,'stroke-width':1.8,'data-correction-reference-pulse':''});root.appendChild(refPulse);
    const sourceRect=state.querySelector('rect'),returnedRect=returnedState.querySelector('rect'),returnedCircle=returnedState.querySelector('circle');
    const blend=(from,to,p)=>{const channels=s=>s.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));return `rgb(${channels(from).map((v,i)=>Math.round(mix(v,channels(to)[i],p))).join(',')})`;};
    function layout(){
      root.setAttribute('transform',`translate(${batch.left},${batch.top})`);
      formulaRoot.setAttribute('transform',`translate(${batch.left},${batch.top})`);
      const right=svg.viewBox.baseVal.width-batch.left-12;
      // Attach the reflection formula to its displacement annotation and
      // continue the existing purple x₃ label with the result equality.
      const reflectedX=Math.min(correctedX+38,right-math.reflected.width);
      const besideNoise=reflectedX>=correctedX+30;
      const reflectedY=besideNoise
        ? noiseLineY+3+math['reflected-noise'].baseline+18-math.reflected.baseline : 269;
      place('reflected',reflectedX,reflectedY);
      const pointX=Math.max(correctedX+12,Math.min(correctedX+40,right-math.result.width)),pointY=105;
      place('point',pointX,pointY);
      place('result',pointX,pointY+math.point.baseline-math.result.baseline);
      pointPointer.setAttribute('d',`M ${pointX} 128 Q ${(pointX+correctedX+8)/2} 128 ${correctedX+8} 145`);
      drawPointPointer=SamplingPlayback.traceArrow(pointPointer,{terminalLength:8});
      // Reveal c₂ first, then its equality in the same label above the axis.
      place('center',centerX-math.center.equals/2,-45);
      place('mean-q',meanQ-math['mean-q'].width-8,139-math['mean-q'].baseline);
      place('mean-p',meanP+8,139-math['mean-p'].baseline);
      place('raw-noise',(sampleX+meanQ-math['raw-noise'].width)/2,noiseLineY+3);
      place('raw-delta',(meanQ+meanP-math['raw-delta'].width)/2,deltaLineY+5);
      place('reflected-noise',(meanP+correctedX-math['reflected-noise'].width)/2,noiseLineY+3);
      place('reference',140,290);
    }
    return {root,layout,correctedX,render(t,d,p){
      const active=t>=d.correctStart,cleared=1-p(d.clearStart,d.clearEnd),background=1-p(d.referenceMoveStart,d.referenceMoveEnd);
      root.style.display=active?'':'none';
      formulaRoot.style.display=active?'':'none';
      for(const group of [root,batch.root])group.setAttribute('transform',`translate(${batch.left},${batch.top})`);
      opacity(batch.root,background);
      // The accepted states still form the prefix. Their completed density
      // tests and the u arrows no longer participate in reflection.
      const cleanup=p(d.restoreStart,d.restoreStart+500);
      batch.steps.slice(0,2).forEach(item=>opacity(item.group,1-cleanup));
      batch.batchVelocities.forEach(velocity=>opacity(velocity,(+velocity.style.opacity)*(1-cleanup)));
      opacity(check.group.querySelector('[data-coupling-target]'),1-cleanup);opacity(check.bar,1-cleanup);
      const obsolete=[check.decision,check.cap,check.boundary,check.pointMark,check.meanGuide,check.proposalGuide,...check.regions];
      obsolete.forEach(e=>opacity(e,(+e.style.opacity||0)*(1-cleanup)));
      if(active){
        const restored=p(d.restoreStart,d.restoreEnd),means=p(d.meansStart,d.meansEnd);
        const qScale=1+restored*(1/check.uniformScale-1);
        check.q.setAttribute('transform',`scale(1,${qScale})`);
        check.q.dataset.correctionRestore=String(restored);
        check.qLabel.setAttribute('transform',`translate(0,${check.proposalPeak*(qScale-1)}) ${check.uqLabelBase}`);
        check.uniformGlyphs.forEach(g=>opacity(g,1-restored));
        for(const curve of [check.p,check.q])opacity(curve,1-.7*means);
        for(const label of [check.pLabel,check.qLabel])opacity(label,1-.45*means);
        opacity(check.proposalMean,means);
        opacity(check.meanPoint,Math.max(1-cleanup,means));
      }else{
        // Restore the untouched verification scene when scrubbing backwards.
        opacity(check.p,1);opacity(check.q,1);
      }
      const progress={reflected:p(d.reflectedStart,d.reflectedEnd),result:p(d.resultStart,d.resultEnd),reflect:p(d.reflectStart,d.reflectEnd),
        drop:p(d.replacementStart,d.replacementEnd),handoff:p(d.returnEnd,d.returnSettled),
        reset:p(d.orangeEnd,d.nextDraftAt),orange:p(d.purpleEnd,d.orangeEnd)};
      // Read the reflection from the picture before naming its result.
      show('reflected',progress.reflected,cleared);
      show('result',progress.result,cleared);
      const centerName=math.center.equals/math.center.width*p(d.centerStart,d.centerStart+250);
      show('center',mix(centerName,1,p(d.centerFormulaStart,d.centerFormulaEnd)),background);
      const symmetryFade=background;
      meanCenterLines.forEach(({draw})=>draw(p(d.meanGuideStart,d.meanGuideEnd)));opacity(meanGuides,background);
      drawCenter(p(d.centerStart,d.centerEnd));opacity(centerDot,p(d.centerEnd-100,d.centerEnd));
      opacity(symmetryGuide,symmetryFade);
      const meanLabelFade=background;
      show('mean-q',p(d.meansStart,d.meansEnd),meanLabelFade);
      show('mean-p',p(d.meansStart,d.meansEnd),meanLabelFade);
      // The plotted brackets are sigma*z, because the horizontal axis is x.
      drawNoise(p(d.noiseArrowStart,d.noiseArrowEnd));opacity(noisePath,background);
      opacity(noiseGuides,p(d.noiseArrowStart,d.noiseArrowEnd)*background);
      noiseGuideLines[1].setAttribute('d',`M ${meanQ} 153 V ${mix(noiseLineY+4,deltaLineY+4,p(d.deltaArrowStart,d.deltaArrowEnd))}`);
      show('raw-noise',p(d.noiseArrowEnd,d.noiseArrowEnd+250),background);
      drawDelta(p(d.deltaArrowStart,d.deltaArrowEnd));opacity(deltaPath,background);
      opacity(deltaGuides,p(d.deltaArrowStart,d.deltaArrowEnd)*background);
      show('raw-delta',p(d.deltaArrowEnd,d.deltaArrowEnd+250),background);
      const movingFrom=mix(meanQ,meanP,progress.reflect),movingTo=mix(sampleX,correctedX,progress.reflect);
      reflectedNoise.setAttribute('d',`M ${movingFrom} ${noiseLineY} H ${movingTo}`);
      const noiseColor=blend(blue,purple,progress.reflect);reflectedNoise.setAttribute('stroke',noiseColor);movingMarker.querySelector('path').setAttribute('stroke',noiseColor);
      const reflectedFade=background;
      opacity(reflectedNoise,t>=d.reflectStart&&Math.abs(movingFrom-movingTo)>1?reflectedFade:0);
      show('reflected-noise',p(d.reflectEnd,d.reflectEnd+250),background);
      drawReflection(progress.reflect);opacity(reflection,background);
      correctedPoint.setAttribute('cx',String(mix(sampleX,correctedX,progress.reflect)));
      opacity(correctedPoint,p(d.reflectStart,d.reflectStart+180)*background);
      show('point',p(d.pointStart,d.pointStart+200),background);
      drawPointPointer(p(d.pointStart+200,d.pointStart+650));opacity(pointPointer,background);
      opacity(pointRing,p(d.pointStart+450,d.pointStart+650)*background);
      drawReflectState(p(d.replacementEnd,d.replacementEnd+450));opacity(reflectStatePath,1-progress.handoff);
      opacity(reflectLabel,p(d.replacementEnd,d.replacementEnd+300)*cleared);
      const measurementGuide=p(d.reflectEnd,d.reflectEnd+250)*(noiseLineY+4-157)/(199-157);
      drawToState(mix(measurementGuide,1,progress.drop));opacity(toState,background);
      travelingPoint.setAttribute('cy',String(mix(150,224,progress.drop)));
      opacity(travelingPoint,p(d.replacementStart,d.replacementStart+150)*(1-p(d.replacementStart+750,d.replacementEnd)));
      // Match Residual: retain the unframed result while the return arrow
      // draws, then replace x₀ in place with a framed purple x₃ over 400 ms.
      state.setAttribute('transform',`translate(${correctedX-540},0)`);
      opacity(state,p(d.replacementStart+750,d.replacementEnd)*(1-progress.handoff));opacity(sourceRect,0);
      const sx=mix(50,54-batch.left,progress.reset),sy=mix(224,150-batch.top,progress.reset);
      returnedState.setAttribute('transform',`translate(${sx-540},${sy-224})`);opacity(returnedState,progress.handoff);
      returnedRect.setAttribute('fill',blend('#E4DFEC','#FAE4D5',progress.orange));
      returnedCircle.setAttribute('fill',blend('#D9D2E9','#F8CAAC',progress.orange));
      returnedCircle.setAttribute('stroke',blend('#8064A2','#C55A11',progress.orange));
      returnedState.dataset.orangeProgress=String(progress.orange);returnedState.dataset.nextWindowProgress=String(progress.reset);
      drawReturn(p(d.returnArrowStart,d.returnEnd));opacity(returnPath,background);
      if(active)opacity(batch.states[0],1-progress.handoff);
      const referenceActive=t>=d.referenceMoveStart;
      if(referenceActive)opacity(batch.references[0].group,0);
      const refX=mix(164,entry.draftCenters[3]-batch.left,progress.reset),refY=mix(253,150-batch.top,progress.reset),size=mix(38,60,progress.reset);
      reference.setAttribute('transform',`translate(${refX-426},${refY-145})`);
      for(const [k,v] of Object.entries({x:426-size/2,y:145-size/2,width:size,height:size,rx:mix(5,7,progress.reset)}))refFrame.setAttribute(k,String(v));
      refFrame.setAttribute('stroke',blend('#D6D6D6','#162C51',progress.reset));refFrame.setAttribute('stroke-width',String(mix(1,1.8,progress.reset)));
      refGlyph.setAttribute('transform',`translate(426,145) scale(${mix(25/32,1,progress.reset)}) translate(-426,-145) ${refTransform}`);
      opacity(reference,referenceActive?1:0);
      const refDone=p(d.referenceNameStart,d.referenceNameEnd),refFade=1-p(d.sceneFadeStart,d.sceneFadeEnd);
      show('reference',p(d.referenceMoveEnd,d.referenceMoveEnd+400),refFade);
      opacity(refPulse,refDone*refFade);
      if(active)opacity(check.decision,1-p(d.restoreStart,d.restoreStart+250));
    }};
  }
};
