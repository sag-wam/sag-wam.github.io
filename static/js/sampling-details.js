/* Local mechanisms for the two SAG variants. Geometry is schematic; the
   equations and distinct acceptance/correction rules follow the manuscript. */
window.SAGDetails = {
  async attach(host) {
    const formulaPhases = {
      residual: ['draft', 'verify', 'reuse'],
      coupling: ['draft']
    };
    // Equation assets use 10 TeX pt at 2.25x; render at 22 CSS px on desktop.
    const formulaScale = 22 / (10 * 72 / 72.27 * 2.25);
    const sharedDraftInputDuration = 400;
    const residualDraftOffset = 11;
    const couplingDraftInset = 18;
    const couplingDraftOffset = 73 + couplingDraftInset;
    const couplingDraftStroke = 2;
    // Explanatory pointers use blue; computation and acceptance retain Figure 2's colors.
    const annotationColor = '#0072B2';
    const couplingSerialApproach = 48;
    const couplingLineStyle = {'shape-rendering':'crispEdges','stroke-linecap':'butt','stroke-linejoin':'miter'};
    const draftStart = (route, i, timing) => timing.start + (route === 'residual' ? timing.sharedDuration ?? sharedDraftInputDuration : (i - 1) * timing.interval);
    const couplingDraftBeats = (i,timing) => {
      const start=draftStart('coupling',i,timing),velocityStart=start+timing.inputDuration;
      const velocityEnd=velocityStart+timing.velocityDuration,flowStart=velocityEnd+timing.velocityHold;
      const stateStart=flowStart+timing.flowDuration;
      return {start,velocityStart,velocityEnd,flowStart,noiseStart:flowStart+timing.noiseDelay,stateStart,stateEnd:stateStart+timing.stateDuration};
    };
    const clamp = x => Math.max(0, Math.min(1, x));
    const ease = x => x * x * (3 - 2 * x);
    const opacity = (element, amount) => {element.style.opacity = String(amount);};
    const number = (node, n) => node.querySelectorAll('[data-number]').forEach(e => {e.style.display = +e.dataset.number === n ? '' : 'none';});
    const make = (tag, attributes = {}) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
      return element;
    };
    const cards = await Promise.all([...host.querySelectorAll('[data-route]')].map(async card => {
      const route = card.dataset.route, imageHost = card.querySelector('.sag-detail-diagram');
      try {
        const response = await fetch(`static/images/sampling-${route}-detail.svg`);
        if (!response.ok) throw new Error('Detail unavailable');
        const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
        if (doc.querySelector('parsererror')) throw new Error('Invalid detail');
        const svg = document.importNode(doc.documentElement, true);imageHost.replaceChildren(svg);
        const prefix = `detail-svg-${route}-`;
        const scenes = Object.fromEntries([...svg.querySelectorAll('[data-scene]')].map(e => [e.dataset.scene, e]));
        // SAG's number baseline is 48 native units below the state center.
        svg.querySelectorAll('[data-number-bank]').forEach(bank => bank.setAttribute('transform', 'translate(0,2)'));
        // Keep the first call and its reference in the same scene as drafting.
        // The anchor stays fixed at (54,150); the drafts grow beneath this row.
        svg.querySelector('[data-init-call]').setAttribute('transform', 'translate(-21,0)');
        const reference = svg.querySelector('[data-init-part="reference"]');
        reference.setAttribute('transform', 'translate(124,5)');
        const referenceLink = make('g', {'data-init-part': 'reference-link'});
        referenceLink.appendChild(make('path', {d: 'M 417 150 H 512', fill: 'none', stroke: '#000000', 'stroke-width': 2, 'marker-end': `url(#${prefix}arrow-ink)`}));
        svg.querySelector('[data-init-reference]').replaceChildren(referenceLink, reference);
        const callArrows = ['input-arrow', 'output-arrow'].map(part => SamplingPlayback.traceArrow(svg.querySelector(`[data-call-part="${part}"] path`)));
        const referenceArrow = SamplingPlayback.traceArrow(svg.querySelector('[data-init-part="reference-link"] path'));
        const drafts = [...svg.querySelectorAll('[data-draft-step]')];
        drafts.forEach((group, i) => {
          if (!i) return;
          group.setAttribute('transform', 'translate(0,120)');
          const noise = group.querySelector('[data-math="noise"]');
          if (noise) {
            // Leave room beneath the retained DiT and reference boxes.
            noise.setAttribute('transform', `translate(0,20) ${noise.getAttribute('transform')}`);
            group.querySelectorAll('path[marker-end]')[1].setAttribute('d', `M ${54 + 130 * i} 110 V 120`);
          }
        });
        drafts[1].querySelector('path[marker-end]').setAttribute('d', 'M 86 45 H 108 V 150 H 157');
        const draftArrows = drafts.map(g => [...g.querySelectorAll('path[marker-end]')].map(path => SamplingPlayback.traceArrow(path)));
        const sharedDraftPaths = ['shared-draft-input', 'shared-draft-reference'].map(part => {
          const path = drafts[1].querySelector('path[marker-end]').cloneNode(false);
          path.removeAttribute('marker-end');path.dataset.part = part;
          scenes.draft.prepend(path);return path;
        });
        const draftReferenceBranches = route === 'coupling' ? drafts.map((group,i)=>{
          if(!i)return null;
          const path=group.querySelector('path[marker-end]').cloneNode(false);
          path.dataset.part='draft-reference-input';group.prepend(path);return path;
        }) : [];
        if(route==='coupling'){
          // Give drafting paths and their arrowheads the same native stroke.
          const marker=svg.querySelector(`#${prefix}arrow-green`).cloneNode(true);
          marker.id=`${prefix}arrow-coupling-draft`;
          for(const [key,value] of Object.entries({viewBox:'0 -6 12 12',markerWidth:12,markerHeight:12}))marker.setAttribute(key,String(value));
          const tip=marker.querySelector('path');
          tip.setAttribute('stroke-width',String(couplingDraftStroke));
          tip.setAttribute('stroke-linecap','round');tip.setAttribute('stroke-linejoin','round');
          tip.setAttribute('shape-rendering','geometricPrecision');
          svg.querySelector('defs').appendChild(marker);
        }
        // A single framed anchor spans first-call preparation and window return.
        const anchor = drafts[0].querySelector('[data-node-role]').cloneNode(true);
        anchor.dataset.nodeRole = 'anchor';
        anchor.prepend(make('rect', {x: 22, y: 121, width: 64, height: 58, rx: 7, fill: '#FAE4D5', stroke: '#162C51', 'stroke-width': 2.1, filter: `url(#${prefix}box-shadow)`}));
        svg.appendChild(anchor);
        const anchorIndex = anchor.querySelector('[data-number-bank]');
        const nextAnchorIndex = anchorIndex.cloneNode(true);anchor.appendChild(nextAnchorIndex);
        drafts[0].style.display = 'none';
        svg.querySelector('[data-call-part="state"]').style.display = 'none';
        const initialReferenceState = svg.querySelector('[data-init-part="state"]');
        if (initialReferenceState) initialReferenceState.style.display = 'none';
        const returnPath = make('path', {d: 'M 566 224 H 600 V 302 H 10 V 150 H 22', fill: 'none', stroke: '#8064A2', 'stroke-width': 2, 'stroke-linejoin': 'round', 'marker-end': `url(#${prefix}arrow-purple)`, 'data-part': 'return'});
        svg.insertBefore(returnPath, anchor);
        const returnArrow = SamplingPlayback.traceArrow(returnPath);
        const title = make('text', {x: 310, y: -30, 'text-anchor': 'middle', 'font-family': 'SpeCaTimes,Times New Roman,Times,serif', 'font-size': 29, 'font-weight': 400, fill: '#000000', 'data-detail-title': ''});
        svg.appendChild(title);
        const discarded = drafts[4].querySelector('[data-node-role]').cloneNode(true);
        discarded.dataset.nodeRole = 'discarded';discarded.setAttribute('transform', 'translate(-34,74)');
        scenes.local.appendChild(discarded);
        const verification = svg.querySelector('[data-part="verification"]');
        const correction = svg.querySelector('[data-part="correction"]');
        correction.querySelector('text').style.display = 'none';
        const replacement = correction.querySelector('[data-node-role="replacement"]');
        const formulaHost = card.querySelector('.sag-detail-formula');
        const formulas = await Promise.all(formulaPhases[route].map(async phase => {
          const suffix = route === 'residual' && phase === 'verify' ? '-local' : '';
          const response = await fetch(`static/images/detail-${route}-${phase}${suffix}.svg`);
          if (!response.ok) throw new Error('Equation unavailable');
          const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
          if (doc.querySelector('parsererror')) throw new Error('Invalid equation');
          const panel = document.importNode(doc.documentElement, true);
          panel.dataset.formulaPhase = phase;
          panel.setAttribute('aria-hidden', 'true');
          return {phase, panel, width: +panel.getAttribute('width'), height: +panel.getAttribute('height'), rows: [...panel.querySelectorAll('[data-formula-row]')]};
        }));
        const embeddedEquations = [],couplingDrafts=[];
        for (const formula of formulas.filter(f => f.phase === 'draft')) {
          formula.embedded = true;
          svg.querySelector('defs').append(...formula.panel.querySelector('defs').children);
          formula.rows.forEach((row, i) => {
            const key = i === 0 ? 'reference' : String(i);
            if(route==='coupling'&&i){
              const glyphs=[...row.children],velocity=make('g',{'data-coupling-draft-velocity':String(i-1)});
              const math=make('g');math.append(...glyphs.slice(0,3).map(e=>e.cloneNode(true)));velocity.appendChild(math);drafts[i].appendChild(velocity);
              const serial=drafts[i].querySelector('path[marker-end]:not([data-part])').cloneNode(false);
              serial.dataset.part='coupling-serial-input';drafts[i].appendChild(serial);
              const velocityFormula=make('g',{'data-coupling-velocity-formula':String(i-1)}),stateFormula=make('g',{'data-coupling-state-formula':String(i)});
              glyphs.forEach((g,j)=>{
                if(j<3){g.remove();return;}
                ((+g.getAttribute('y')||0)<70?velocityFormula:stateFormula).appendChild(g);
              });
              velocity.appendChild(velocityFormula);row.appendChild(stateFormula);
              // Reflow the outlined state equation into an aligned two-line update.
              const stateHead=make('g'),drift=make('g'),noise=make('g');
              [...stateFormula.children].forEach(g=>{
                const y=+g.getAttribute('y');
                (y<87?stateHead:y<110?drift:noise).appendChild(g);
              });
              stateFormula.append(stateHead,drift,noise);
              couplingDrafts[i]={velocity,math,serial,velocityFormula,stateFormula,stateHead,drift,noise};
            }
            const wrapper = make('g', {'data-equation-for': key});
            row.setAttribute('transform', row.dataset.localTransform);
            wrapper.appendChild(row);scenes.draft.appendChild(wrapper);
            const equation={key,wrapper,width:+row.dataset.width,height:+row.dataset.height};
            if(route==='coupling'&&i){
              const {drift,noise}=couplingDrafts[i];
              // Use the equation asset's coordinates: the inactive card is hidden
              // while loading, so its SVG bounding boxes are not measurable yet.
              drift.setAttribute('transform',`translate(30,${80.796972-98.790121})`);
              const rhsX=i===1?84.429134:84.657768;
              noise.setAttribute('transform',`translate(${rhsX-66.750114},${98.790121-114.859651})`);
              equation.width=263;
              equation.height-=(114.859651-98.790121)*2.25;
            }
            embeddedEquations.push(equation);
          });
        }
        formulaHost.replaceChildren(...formulas.filter(f => !f.embedded).map(f => f.panel));
        imageHost.addEventListener('scroll', () => host.dispatchEvent(new Event('sag-detail-scroll')));
        return {card, route, svg, imageHost, scenes, drafts, draftArrows, sharedDraftPaths, sharedDraftFlows: [], draftReferenceBranches, draftReferenceFlows: [], anchor, anchorIndex, nextAnchorIndex,
          returnPath, returnArrow, title, discarded, callArrows, referenceArrow,
          verification, correction, replacement,
          formulaHost, formulas, embeddedEquations,couplingDrafts,
          draftReferenceTransforms: drafts.map(group => group.querySelector('[data-math="vbar"], [data-math="abar"]')?.getAttribute('transform')),
          indexedLabels: [...svg.querySelectorAll('[data-indexed-math]')], local: false, phase: 'draft'};
      } catch (error) { console.error(`Unable to load ${route} sampling detail`, error);return null; }
    }));
    const createBatch = (entry,root) => {
      const {svg,verification,route}=entry,prefix=`detail-svg-${route}-`;
      const batch=make('g',{'data-parallel-batch':''});root.appendChild(batch);
      const model=svg.querySelector('[data-call-part="model"]').cloneNode(true);
      model.removeAttribute('data-call-part');model.removeAttribute('transform');model.setAttribute('data-batch-model','');
      for(const [key,value] of Object.entries({x:20,y:72,width:750,height:76}))model.querySelector('rect').setAttribute(key,String(value));
      const labels=[...model.querySelectorAll('text')];labels[0].textContent='Action DiT';
      labels[0].setAttribute('x','395');labels[0].setAttribute('y','120');labels.slice(1).forEach(e=>e.remove());
      const batchInputs=[],batchOutputs=[],batchVelocities=[];
      for(let i=0;i<4;i++){
        const input=make('path',{d:`M ${50+230*i} 196 V 148`,fill:'none',stroke:'#000000','stroke-width':2,'marker-end':`url(#${prefix}arrow-ink)`,'data-batch-input':i});
        const output=make('path',{d:`M ${50+230*i} 72 V 24`,fill:'none',stroke:'#000000','stroke-width':2,'marker-end':`url(#${prefix}arrow-ink)`,'data-batch-output':i});
        batch.append(input,output);batchInputs.push(SamplingPlayback.traceArrow(input));batchOutputs.push(SamplingPlayback.traceArrow(output));
        const velocitySource=verification.querySelector(':scope > [data-math="u"]') || verification.querySelector('[data-check="accepted"] [data-math="u"]');
        const velocity=velocitySource.cloneNode(true);
        if(route==='coupling'){
          // Coupling's local density diagram labels u on a different baseline.
          const math=make('g',{transform:'translate(13,-37)'});math.append(...velocity.children);velocity.appendChild(math);
        }
        velocity.querySelectorAll('[data-math-index]').forEach(e=>{e.style.display=+e.dataset.mathIndex===i?'':'none';});
        velocity.setAttribute('transform',`translate(${50+230*i-224},-125)`);velocity.setAttribute('data-reused-velocity',String(i));
        root.appendChild(velocity);batchVelocities.push(velocity);
      }
      batch.appendChild(model);return {batch,model,batchInputs,batchOutputs,batchVelocities};
    };
    const renderBatch = (batch,timing,progress) => {
      opacity(batch.batch,1-progress(timing.modelFadeStart,timing.modelFadeEnd));
      opacity(batch.model,progress(timing.modelStart,timing.modelEnd));
      batch.batchInputs.forEach(draw=>draw(progress(timing.callInputStart,timing.callInputEnd)));
      batch.batchOutputs.forEach(draw=>draw(progress(timing.outputStart,timing.outputEnd)));
    };
    for(const entry of cards.filter(e=>e?.route==='coupling')){
      const root=make('g',{'data-coupling-batch-scene':'',style:'display:none'});entry.svg.insertBefore(root,entry.returnPath);
      const predecessor=entry.scenes.local.querySelector('[data-node-role="predecessor"]');
      predecessor.prepend(make('rect',{x:68,y:195,width:64,height:58,rx:7,fill:'#FAE4D5',stroke:'#162C51','stroke-width':2.1,filter:'url(#detail-svg-coupling-box-shadow)'}));
      const states=[entry.anchor,...entry.drafts.slice(1).map(e=>e.querySelector('[data-node-role]'))].map((e,i)=>{
        const clone=e.cloneNode(true);clone.removeAttribute('transform');clone.setAttribute('data-node-role','batch-state');
        if(!i)[...clone.querySelectorAll('[data-number-bank]')].slice(1).forEach(e=>e.remove());
        number(clone,i);root.appendChild(clone);return clone;
      });
      const references=Array.from({length:4},()=>{
        const group=entry.svg.querySelector('[data-init-part="reference"]').cloneNode(true);group.removeAttribute('data-init-part');root.appendChild(group);
        const glyph=group.querySelector('[data-math="abar"]');
        return {group,frame:group.querySelector('rect'),glyph,glyphTransform:glyph.getAttribute('transform')};
      });
      const links=Array.from({length:4},()=>{
        const path=entry.drafts[1].querySelector('path[marker-end]').cloneNode(false);path.removeAttribute('data-part');
        for(const [key,value] of Object.entries(couplingLineStyle))path.setAttribute(key,value);
        root.prepend(path);return path;
      });
      const tails=links.map(path=>{const tail=path.cloneNode(false);root.prepend(tail);return tail;});
      const marker=entry.svg.querySelector('#detail-svg-coupling-arrow-coupling-draft').cloneNode(true);
      marker.id='detail-svg-coupling-batch-link';entry.svg.querySelector('defs').appendChild(marker);
      [...links,...tails].forEach(path=>path.setAttribute('marker-end',`url(#${marker.id})`));
      entry.parallel={root,states,references,links,tails,marker,...createBatch(entry,root)};
      const response=await fetch('static/images/detail-coupling-checks.svg');
      if(!response.ok)throw new Error('Coupling verification geometry unavailable');
      const computation=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
      entry.svg.querySelector('defs').append(...computation.querySelector('defs').children);
      const annotationMarker=make('marker',{id:'detail-coupling-annotation-arrow',viewBox:'-1 -6 12 12',refX:8,refY:0,
        markerWidth:12,markerHeight:12,markerUnits:'userSpaceOnUse',orient:'auto'});
      annotationMarker.appendChild(make('path',{d:'M 0 -4 L 8 0 L 0 4',fill:'none',stroke:annotationColor,'stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round'}));
      entry.svg.querySelector('defs').appendChild(annotationMarker);
      const traceAnnotation=path=>SamplingPlayback.traceArrow(path,{terminalLength:12});
      entry.parallel.steps=Array.from({length:3},(_,i)=>{
        const outcome=i===2?'rejected':'accepted',color=i===2?'#C0504D':'#538235',x=280+230*i;
        const source=entry.verification.querySelector(`[data-check="${outcome}"]`);
        const group=make('g',{'data-coupling-check':i});root.appendChild(group);
        // These three distinct plots come from the final Figure 2, anchored at
        // each existing draft. u_k ends at m^P_k, not at draft x_(k+1).
        const plot=computation.querySelector(`[data-figure2-check="${i}"]`).cloneNode(true);
        plot.setAttribute('transform',`translate(${x},150)`);group.appendChild(plot);
        const geometry=Object.fromEntries([...plot.querySelectorAll('[data-geometry]')].map(e=>[e.dataset.geometry,e]));
        const {axis,proposal:q,target:p,gap:bar,cap,boundary}=geometry;
        plot.prepend(geometry['accept-region'],geometry['reject-region']);
        p.setAttribute('data-coupling-density','target');q.setAttribute('data-coupling-density','proposal');
        const meanX=x+ +plot.dataset.meanX;
        const meanPoint=make('circle',{cx:meanX,cy:150,r:3,fill:'#555555','data-coupling-mean':i});group.appendChild(meanPoint);
        const uniformScale=+plot.dataset.uniformScale,proposalMeanX=x+ +plot.dataset.proposalMeanX,proposalPeak=+plot.dataset.proposalPeak;
        q.setAttribute('vector-effect','non-scaling-stroke');
        const proposalMean=make('circle',{cx:proposalMeanX,cy:150,r:3,fill:'#444444','data-proposal-mean':i});group.appendChild(proposalMean);
        const proposalGuide=make('path',{d:`M ${proposalMeanX} 150 V ${150+proposalPeak/uniformScale}`,fill:'none',stroke:'#999999','stroke-width':1.1,'stroke-dasharray':'2 4'});group.appendChild(proposalGuide);
        const labels=['p','uq'].map((kind,j)=>{
          const label=source.querySelector(`[data-math="${kind}"]`).cloneNode(true);
          label.querySelectorAll('[data-math-index]').forEach(e=>{e.style.display=+e.dataset.mathIndex===i?'':'none';});
          const chosen=label.querySelector(`[data-math-index="${i}"]`);
          const [tx,ty]=chosen.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(/[,\s]+/).map(Number);
          // Put Uq just above the proposal's left shoulder, as in Figure 2.
          // Its short numeric subscripts need a closer anchor than n+1/n+2.
          const lx=j?proposalMeanX-54:meanX+32,ly=j?150+proposalPeak-12:[92,108,87][i];
          if(j)label.setAttribute('data-coupling-q-label',i);
          label.setAttribute('transform',`translate(${lx-tx},${ly-ty})`);group.appendChild(label);return label;
        });
        const uniformGlyphs=[...labels[1].querySelector(`[data-math-index="${i}"]`).children].slice(0,2);
        uniformGlyphs.forEach(g=>g.setAttribute('data-coupling-u-factor',i));
        const uqLabelBase=labels[1].getAttribute('transform');
        const vector=make('path',{d:`M ${70+230*i} 207 L ${meanX-3} 152`,fill:'none',stroke:'#000000','stroke-width':2,'marker-end':'url(#detail-svg-coupling-arrow-ink)','data-coupling-target':i});
        group.appendChild(vector);
        const connector=make('path',{d:`M ${x} 196 V 157`,fill:'none',stroke:'#777777','stroke-width':1.5,'stroke-dasharray':'3 4','data-coupling-projection':i});
        group.appendChild(connector);
        const meanDifference=make('g',{'data-coupling-mean-difference':i});group.appendChild(meanDifference);
        // Native-coordinate displacement: P -> Q. Division by sigma is a
        // separate rightward transformation of its retained formula label.
        const meanBracket=make('path',{d:`M ${meanX} 137 H ${proposalMeanX}`,fill:'none',stroke:'#444444','stroke-width':1.5,
          'marker-end':'url(#detail-svg-coupling-arrow-ink)','data-raw-mean-displacement':i});meanDifference.appendChild(meanBracket);
        [meanX,proposalMeanX].forEach(cx=>meanDifference.appendChild(make('path',{d:`M ${cx} 150 V 134`,stroke:'#777777','stroke-width':1})));
        [meanX,proposalMeanX].forEach(cx=>meanDifference.appendChild(make('circle',{cx,cy:150,r:4,fill:'#FFFFFF',stroke:'#444444','stroke-width':1.5})));
        const densityValues=make('g',{'data-coupling-density-values':i});group.appendChild(densityValues);
        const pY=150+ +plot.dataset.targetAtSample,qY=150+ +plot.dataset.proposalAtSample/uniformScale;
        const densityLine=make('path',{d:`M ${x} 150 V ${Math.min(pY,qY)}`,fill:'none',stroke:'#777777','stroke-width':1.5});densityValues.appendChild(densityLine);
        const densityDots=[pY,qY].map((cy,j)=>{
          const mark=make('g');mark.appendChild(make('path',{d:`M ${x-5} ${cy} H ${x+5}`,stroke:j?'#444444':'#777777','stroke-width':1.5}));
          mark.appendChild(make('circle',{cx:x,cy,r:3,fill:j?'#444444':'#777777',stroke:'#FFFFFF','stroke-width':1}));densityValues.appendChild(mark);return mark;
        });
        const point=make('circle',{cx:x,cy:150,r:6,fill:'#777777',stroke:'#FFFFFF','stroke-width':1.5,'data-coupling-sample':i});group.appendChild(point);
        const pointMark=make('path',{d:i===2?`M ${x-3} 147 L ${x+3} 153 M ${x-3} 153 L ${x+3} 147`:`M ${x-3.3} 150 L ${x-1} 152.5 L ${x+3.5} 147.5`,fill:'none',stroke:'#FFFFFF','stroke-width':1.5});group.appendChild(pointMark);
        const state=entry.scenes.local.querySelector(`[data-node-role="candidate"][data-outcome="${outcome}"]`).cloneNode(true);
        state.removeAttribute('data-node-role');state.setAttribute('data-coupling-outcome',i);state.style.display='';state.setAttribute('transform',`translate(${x-330},0)`);number(state,i+1);root.appendChild(state);
        const decision=make('text',{x:meanX,y:50,'text-anchor':'middle','font-family':'SpeCaTimes,Times New Roman,Times,serif','font-size':24,'font-weight':700,fill:color,'data-coupling-decision':i});
        decision.textContent=i===2?'× Reject':'✓ Accept';group.appendChild(decision);
        const equations=Object.fromEntries(['mean','proposal','offset','delta','ratio','logcalc','uniform','test'].map(phase=>{
          const row=computation.querySelector(`[data-check-equation="${i}"][data-computation="${phase}"]`).cloneNode(true);
          const width=+row.dataset.width,height=+row.dataset.height;
          const clip=make('clipPath',{id:`coupling-computation-${i}-${phase}`,clipPathUnits:'userSpaceOnUse'}),clipRect=make('rect',{x:0,y:0,width:0,height});
          clip.appendChild(clipRect);entry.svg.querySelector('defs').appendChild(clip);
          const nearPlot=['mean','proposal','offset','delta','ratio'].includes(phase),center=phase==='mean'?meanX:phase==='proposal'?proposalMeanX:['offset','delta'].includes(phase)?(meanX+proposalMeanX)/2:x;
          const formulaY=phase==='ratio'?-24:['offset','delta'].includes(phase)?-8:nearPlot?6:285;
          const besidePlot=['uniform','test'].includes(phase),left=besidePlot?meanX+65:center-width/2,top=besidePlot?35:formulaY;
          const equation=make('g',{'data-coupling-computation':phase,'data-check-index':i,transform:`translate(${left},${top})`});
          if(phase==='test')equation.setAttribute('data-coupling-verification-formula',i);
          const content=make('g',{'clip-path':`url(#${clip.id})`});content.appendChild(row);equation.appendChild(content);root.appendChild(equation);
          return [phase,{equation,row,clipRect,width,height,baseline:+row.dataset.baseline,left,top}];
        }));
        // Continue the retained raw difference to the right: divide by sigma,
        // then reveal Delta. Its geometric pointer still belongs to the numerator.
        const offset=equations.offset,delta=equations.delta;
        const arrowStart=offset.left+offset.width+10,arrowEnd=arrowStart+62;
        const arrowY=offset.top+offset.baseline-7;
        delta.left=arrowEnd+12;delta.top=offset.top+offset.baseline-delta.baseline;
        delta.useLeft=meanX+125;delta.useTop=35;
        delta.equation.setAttribute('transform',`translate(${delta.left},${delta.top})`);
        const normalization=make('g',{'data-coupling-normalization':i});root.appendChild(normalization);
        const normalizationArrow=make('path',{d:`M ${arrowStart} ${arrowY} H ${arrowEnd}`,fill:'none',stroke:'#000000','stroke-width':1.6,
          'marker-end':'url(#detail-svg-coupling-arrow-ink)','data-normalization-arrow':i});normalization.appendChild(normalizationArrow);
        const factor=computation.querySelector(`[data-check-equation="${i}"][data-computation="normalize"]`).cloneNode(true);
        factor.setAttribute('transform',`translate(${(arrowStart+arrowEnd- +factor.dataset.width)/2},${arrowY- +factor.dataset.height-7})`);
        normalization.appendChild(factor);
        // Keep the density definition in place and append its actual Gaussian
        // computation after the p/q pointers have identified the two values.
        const ratio=equations.ratio,logcalc=equations.logcalc;
        logcalc.left=ratio.left+ratio.width+4;
        logcalc.top=ratio.top+ratio.baseline-logcalc.baseline;
        logcalc.equation.setAttribute('transform',`translate(${logcalc.left},${logcalc.top})`);
        const deltaGroup=make('g',{'data-coupling-delta-dependency':i});root.appendChild(deltaGroup);
        const deltaPath=make('path',{d:'M 0 0 V -1',fill:'none',stroke:annotationColor,'stroke-width':1.6,'stroke-linecap':'round',
          'marker-end':'url(#detail-coupling-annotation-arrow)'});deltaGroup.appendChild(deltaPath);
        const deltaInput={group:deltaGroup,path:deltaPath,draw:null};
        // Anchor the connection to the ell glyph itself, not the advance width
        // after its subscript. That old anchor pointed into the adjacent space.
        const ellEdges=math=>{
          const anchor=math.row.querySelector('[data-equation-anchor="ell"]');
          const glyph=anchor.previousElementSibling.previousElementSibling;
          glyph.setAttribute('data-coupling-ell-symbol',math.equation.dataset.couplingComputation);
          const box=glyph.getBBox(),matrix=math.equation.getCTM().inverse().multiply(glyph.getCTM());
          if(!box.width||!box.height)return null;
          return {top:new DOMPoint(box.x+box.width/2,box.y).matrixTransform(matrix),
            bottom:new DOMPoint(box.x+box.width/2,box.y+box.height).matrixTransform(matrix)};
        };
        const test=equations.test;
        const ellDependency=make('g',{'data-coupling-ell-dependency':i});root.appendChild(ellDependency);
        const ellPath=make('path',{d:'M 0 0 V 1',
          fill:'none',stroke:annotationColor,'stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round',
          'marker-end':'url(#detail-coupling-annotation-arrow)'});ellDependency.appendChild(ellPath);
        let sourceEll=null,targetEll=null,ellPathData='',drawEll=()=>{};
        const layoutEllConnection=()=>{
          // A route hidden during initial setup has no measurable glyph boxes.
          // Measure when it is displayed, then retain coordinates in formula units.
          sourceEll??=ellEdges(ratio);targetEll??=ellEdges(test);
          if(!sourceEll||!targetEll)return drawEll;
          const fromX=ratio.left+sourceEll.bottom.x,fromY=ratio.top+sourceEll.bottom.y+5;
          const toX=test.left+targetEll.top.x,toY=test.top+targetEll.top.y-3;
          const d=`M ${fromX} ${fromY} C ${fromX} ${fromY+42}, ${toX} ${toY-28}, ${toX} ${toY-14} V ${toY}`;
          if(d!==ellPathData){
            ellPathData=d;ellPath.setAttribute('d',d);
            ellPath.dataset.ellSourceX=String(fromX);ellPath.dataset.ellTargetX=String(toX);ellPath.dataset.ellTargetY=String(toY);
            drawEll=traceAnnotation(ellPath);
          }
          return drawEll;
        };
        const inputLeft=test.left;
        const layoutInputs=rightEdge=>{
          delta.useLeft=Math.min(meanX+125,rightEdge-delta.width);
          const fromX=delta.useLeft+ +delta.row.dataset.deltaX-10,fromY=delta.useTop+ +delta.row.dataset.deltaY-20;
          const toDeltaX=logcalc.left+ +logcalc.row.dataset.deltaX-10,toDeltaY=logcalc.top+ +logcalc.row.dataset.deltaY+8;
          deltaPath.setAttribute('d',`M ${fromX} ${fromY} L ${toDeltaX} ${toDeltaY}`);
          deltaPath.dataset.sourceX=String(fromX);deltaPath.dataset.targetX=String(toDeltaX);
          deltaInput.draw=traceAnnotation(deltaPath);
          const shift=Math.max(0,inputLeft+test.width-rightEdge);
          test.left=inputLeft-shift;
          test.equation.setAttribute('transform',`translate(${test.left},${test.top})`);
          decision.setAttribute('x',String(meanX-shift));
          return layoutEllConnection();
        };
        const curveXs=p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number).filter((_,j)=>j%2===0).map(v=>v+x);
        const plotLeft=Math.min(...curveXs);
        const uniform=equations.uniform;
        uniform.left=plotLeft-uniform.width+(i===2?24:-24);uniform.top=i===2?78:4;
        uniform.equation.setAttribute('transform',`translate(${uniform.left},${uniform.top})`);
        const annotations=Object.fromEntries(['mean','proposal','offset','ratio'].map(phase=>{
          const math=equations[phase],pointer=make('g',{'data-coupling-annotation':phase,'data-check-index':i,'aria-hidden':'true'});
          // Only the active equation owns a pointer. No extra labels are added.
          const targets=phase==='mean'?[[meanX,150]]:phase==='proposal'?[[proposalMeanX,150]]:
            phase==='offset'?[[(meanX+proposalMeanX)/2,137]]:[[x,pY],[x,qY]];
          const arrows=targets.map(([targetX,targetY],j)=>{
            const right=phase==='ratio';
            const term=j===0?'p':'q';
            const fromX=right?math.left+ +math.row.dataset[term+'X']+(term==='q'?14:6):math.left+14;
            const fromY=right?math.top+ +math.row.dataset[term+'Y']-5:math.top+math.height+4;
            const rail=right?Math.max(targetX+30,fromX+(j===0?48:20)):Math.min(plotLeft-20,fromX-8);
            const endX=targetX+(right?5:-5),endY=targetY-3;
            // The higher density uses the inner route so the two labeled
            // connections remain separate even when p and q exchange order.
            const inner=right&&j===(pY<qY?0:1);
            const c1=inner?[fromX,fromY+16]:[rail,right?fromY:fromY+14];
            const c2=inner?[fromX,endY]:[rail,right?endY:endY-18];
            const measured=phase==='offset'||right;
            const path=make('path',{d:measured?`M ${endX} ${endY} C ${c2.join(' ')}, ${c1.join(' ')}, ${fromX} ${fromY}`:
              `M ${fromX} ${fromY} C ${c1.join(' ')}, ${c2.join(' ')}, ${endX} ${endY}`,
              fill:'none',stroke:annotationColor,'stroke-width':1.6,'stroke-linecap':'round','stroke-linejoin':'round',
              'marker-end':'url(#detail-coupling-annotation-arrow)','data-annotation-target-x':targetX,'data-annotation-target-y':targetY,
              'data-annotation-direction':measured?'plot-to-formula':'formula-to-plot'});
            if(right)path.setAttribute('data-ratio-term-pointer',term);
            pointer.appendChild(path);return traceAnnotation(path);
          });
          const rings=targets.map(([cx,cy])=>{
            const ring=make('circle',{cx,cy,r:phase==='ratio'?5:6,fill:'none',stroke:annotationColor,'stroke-width':1.4});pointer.appendChild(ring);return ring;
          });
          root.appendChild(pointer);return [phase,{pointer,arrows,rings}];
        }));
        return {group,state,axis,p,q,pLabel:labels[0],qLabel:labels[1],uniformGlyphs,uqLabelBase,uniformScale,proposalPeak,proposalMean,proposalGuide,x,bar,cap,boundary,point,pointMark,meanPoint,connector,decision,equations,color,
          annotations,normalization,normalizationArrow:SamplingPlayback.traceArrow(normalizationArrow),normalizationFactor:factor,
          ellDependency,ellDependencyArrow:drawEll,layoutEllConnection,deltaInput,layoutInputs,
          meanDifference,meanBracket:SamplingPlayback.traceArrow(meanBracket),densityValues,densityLine:SamplingPlayback.traceArrow(densityLine),densityDots,
          regions:[geometry['accept-region'],geometry['reject-region']],meanGuide:geometry['mean-guide'],
          vector:SamplingPlayback.traceArrow(vector),projection:SamplingPlayback.traceArrow(connector),target:SamplingPlayback.traceArrow(p),proposal:SamplingPlayback.traceArrow(q),comparison:SamplingPlayback.traceArrow(bar)};
      });
      const discardLabel=make('text',{x:950,y:180,'text-anchor':'middle','font-family':'SpeCaTimes,Times New Roman,Times,serif','font-size':24,'font-weight':700,fill:'#C0504D','data-coupling-discard':''});
      discardLabel.textContent='Discard';root.appendChild(discardLabel);entry.parallel.discardLabel=discardLabel;
      entry.parallel.correction=await SAGCouplingCorrection.attach(entry);
    }
    // Keep Residual's three tests on one shared state chain, as in Figure 2.
    for (const entry of cards.filter(e => e?.route === 'residual')) {
      const {svg, scenes, verification} = entry;
      // Match Figure 2's rejection halo, scaled with its tolerance circle.
      const haloGradient = make('radialGradient', {id: 'detail-svg-residual-rejection-halo'});
      for (const [offset, color] of [['0%', '#E0A4A1'], ['60.4651%', '#E0A4A1'], ['75.5814%', '#EECDCC'], ['87.2093%', '#F7E9E8'], ['100%', '#FFFFFF']]) {
        haloGradient.appendChild(make('stop', {offset, 'stop-color': color}));
      }
      svg.querySelector('defs').appendChild(haloGradient);
      const root = make('g', {'data-residual-chain': '', style: 'display:none'});
      svg.insertBefore(root, entry.returnPath);
      const initial = scenes.local.querySelector('[data-node-role="predecessor"]').cloneNode(true);
      initial.prepend(make('rect', {x: 68, y: 195, width: 64, height: 58, rx: 7, fill: '#FAE4D5', stroke: '#162C51', 'stroke-width': 2.1,
        filter: 'url(#detail-svg-residual-box-shadow)'}));
      initial.setAttribute('transform', 'translate(-50,0)');root.appendChild(initial);number(initial, 0);
      const chainLinks = Array.from({length: 4}, (_, i) => {
        // Retain the drafting stroke and arrowhead through the entire handoff.
        const path = entry.drafts[1].querySelector('path[marker-end]').cloneNode(true);
        path.removeAttribute('data-part');path.setAttribute('data-chain-link', String(i));root.prepend(path);return path;
      });
      // Keep the shared-bus dash phases separate from the vertical branches.
      const chainBodies = chainLinks.map((path,i)=>Array.from({length:2},(_,side)=>{
        const body=path.cloneNode(false);body.removeAttribute('marker-end');body.removeAttribute('data-chain-link');
        body.setAttribute('data-chain-body',`${i}-${side}`);root.prepend(body);return body;
      }));
      const morphMarker = svg.querySelector('#detail-svg-residual-arrow-green').cloneNode(true);
      morphMarker.id = 'detail-svg-residual-arrow-morph';svg.querySelector('defs').appendChild(morphMarker);
      chainLinks.forEach(path => path.setAttribute('marker-end', 'url(#detail-svg-residual-arrow-morph)'));
      const referenceBus = entry.sharedDraftPaths[1].cloneNode(true);
      referenceBus.removeAttribute('data-part');referenceBus.setAttribute('data-morph-reference-bus', '');root.prepend(referenceBus);
      const purpleBox = entry.anchor.querySelector('rect').cloneNode(false);
      purpleBox.dataset.returnedTint = 'box';purpleBox.setAttribute('fill', '#E4DFEC');
      entry.anchor.querySelector('rect').after(purpleBox);
      const anchorCircle = entry.anchor.querySelector('circle'), purpleCircle = anchorCircle.cloneNode(false);
      purpleCircle.dataset.returnedTint = 'circle';purpleCircle.setAttribute('fill', '#D9D2E9');purpleCircle.setAttribute('stroke', '#8064A2');
      anchorCircle.after(purpleCircle);
      const references = Array.from({length: 4}, (_, i) => {
        const group = svg.querySelector('[data-init-part="reference"]').cloneNode(true);
        group.removeAttribute('data-init-part');group.setAttribute('data-reused-reference', String(i));root.appendChild(group);
        const glyph = group.querySelector('[data-math="vbar"]');
        return {group, frame: group.querySelector('rect'), glyph, glyphTransform: glyph.getAttribute('transform')};
      });
      const {batch,model,batchInputs,batchOutputs,batchVelocities}=createBatch(entry,root);
      const steps = Array.from({length: 3}, (_, i) => {
        const outcome = i === 2 ? 'rejected' : 'accepted';
        const group = make('g', {'data-chain-step': i, transform: `translate(${230 * i - 50},0)`});
        root.appendChild(group);
        const test = verification.cloneNode(true);group.appendChild(test);
        test.querySelectorAll('[data-check]').forEach(e => {if (e.dataset.check !== outcome) e.remove();});
        test.querySelectorAll('[data-indexed-math]').forEach(e => [...e.children].forEach(label => {
          label.style.display = +label.dataset.mathIndex === i ? '' : 'none';
        }));
        const check = test.querySelector('[data-check]');check.style.display = '';
        const connector = check.querySelector('path[stroke-dasharray]');
        const point = check.querySelector('circle'), residual = check.querySelector('path:not([stroke-dasharray])');
        // Figure 2 uses offsets (-30,31), (-30,0), (-30,62) with radius 52.
        // Keep each projected point directly above its draft in this layout.
        const figureScale = 57 / 52, centerX = 330 + 30 * figureScale;
        const pointY = 90 + [31, 0, 62][i] * figureScale;
        point.setAttribute('cy', String(pointY));
        residual.setAttribute('d', `M ${centerX} 90 L 330 ${pointY}`);
        connector.setAttribute('d', `M 330 196 V ${pointY + 8}`);
        const vector = test.querySelector('[data-part="target-arrow"]');
        vector.setAttribute('d', `M 120 207 L ${centerX - 6} 93`);
        const velocity = test.querySelector(':scope > [data-math="u"]');
        const targetPoint = test.querySelector(':scope > circle[r="4.5"]'), star = test.querySelector(':scope > [data-math="star"]');
        const circle = test.querySelector(':scope > circle[r="57"]');circle.setAttribute('stroke', 'none');
        const outline = make('path', {d: `M ${centerX} 33 A 57 57 0 1 1 ${centerX} 147 A 57 57 0 1 1 ${centerX} 33`, fill: 'none',
          stroke: '#538235', 'stroke-width': 1.7, 'stroke-dasharray': '5 4', 'data-tolerance-outline': ''});
        test.insertBefore(outline, targetPoint);
        const radius = test.querySelector(':scope > path[stroke="#538235"]:not([data-tolerance-outline])');
        const delta = test.querySelector(':scope > [data-math="delta"]');
        for (const e of [circle, radius, delta, targetPoint, star]) {
          e.setAttribute('transform', `translate(${centerX - 378},0) ${e.getAttribute('transform') || ''}`);
        }
        delta.setAttribute('transform', `translate(-12,-8) ${delta.getAttribute('transform')}`);
        const halo = make('circle', {cx: centerX, cy: 90, r: 86 * figureScale,
          fill: 'url(#detail-svg-residual-rejection-halo)', 'data-rejection-halo': ''});
        test.prepend(halo);
        // The opaque rejection interior must not cover the arrow into x*.
        test.insertBefore(vector, targetPoint);
        const pending = scenes.local.querySelector('[data-node-role="candidate"][data-outcome="draft"]').cloneNode(true);
        pending.dataset.nodeRole = 'chain-pending';pending.style.display = '';group.appendChild(pending);number(pending, i + 1);
        const state = scenes.local.querySelector(`[data-node-role="candidate"][data-outcome="${outcome}"]`).cloneNode(true);
        state.dataset.nodeRole = 'chain-state';state.style.display = '';group.appendChild(state);number(state, i + 1);
        const label = make('text', {x: centerX, y: 15, 'text-anchor': 'middle',
          'font-family': 'SpeCaTimes,Times New Roman,Times,serif', 'font-size': 24, 'font-weight': 700,
          fill: outcome === 'accepted' ? '#538235' : '#C0504D', 'data-chain-decision': i});
        label.textContent = outcome === 'accepted' ? '✓ Accept' : '× Reject';group.appendChild(label);
        return {group, test, velocity, pending, state, label, point, residual, projection: connector, targetPoint, star, circle, radius, delta, halo,
          circleOutline: SamplingPlayback.traceArrow(outline),
          vector: SamplingPlayback.traceArrow(vector), connector: SamplingPlayback.traceArrow(connector)};
      });
      const correction = entry.correction.cloneNode(true);
      correction.setAttribute('transform', 'translate(410,0)');root.appendChild(correction);
      const correctionLabel = correction.querySelector('text');correctionLabel.style.display = '';
      correctionLabel.setAttribute('font-family', 'SpeCaTimes,Times New Roman,Times,serif');correctionLabel.setAttribute('font-size', '24');
      const replacement = correction.querySelector('[data-node-role="replacement"]');number(replacement, 3);
      // Carry the already computed x*_3 from its verification point to replacement.
      const transfer = make('g', {'data-correction-transfer': ''});
      const transferPoint = steps[2].targetPoint.cloneNode(true), transferStar = steps[2].star.cloneNode(true);
      transferPoint.setAttribute('fill', '#8064A2');transfer.append(transferPoint, transferStar);root.appendChild(transfer);
      const transferSuperscript = transferStar.querySelector('[data-math-index="2"]').children[1];
      transferSuperscript.setAttribute('data-correction-star', '');
      const transferGlyphs = [...transferStar.querySelector('[data-math-index="2"]').children];
      const replacementGlyphs = [replacement.querySelector('[data-label] use'),replacement.querySelector('[data-number="3"] use')];
      const reusedVelocity = batchVelocities[2].cloneNode(true);reusedVelocity.removeAttribute('data-reused-velocity');
      reusedVelocity.setAttribute('data-updated-reference-velocity','');svg.insertBefore(reusedVelocity,entry.title);
      // Reuse the first reference already on the draft chain, including its frame.
      // Only its parent changes during the fade; its screen position stays fixed.
      const referenceEquation=make('g',{'data-reference-update-equation':'','aria-label':'First reference: v bar is assigned u 2'});
      references[0].frame.setAttribute('data-reference-update-frame','');
      const referenceClip=make('clipPath',{id:'detail-residual-reference-value-clip',clipPathUnits:'userSpaceOnUse'});
      referenceClip.appendChild(make('rect',{x:407,y:126,width:38,height:38,rx:5}));svg.querySelector('defs').appendChild(referenceClip);
      const referenceMath=make('g');
      references[0].group.appendChild(referenceMath);svg.insertBefore(referenceEquation,entry.title);
      const referenceLHS=make('g',{'data-reference-assignment-lhs':''});
      referenceLHS.appendChild(references[0].glyph);
      referenceMath.appendChild(referenceLHS);
      // Assignment changes the reference's value, not its v-bar label.
      svg.insertBefore(reusedVelocity,entry.title);
      const reuseFormula=entry.formulas.find(f=>f.phase==='reuse');
      svg.querySelector('defs').append(...reuseFormula.panel.querySelector('defs').children);
      const referenceFormula=make('g',{'data-reference-update-formula':'','aria-label':'v bar is assigned u 2'});
      const referenceFormulaMath=make('g',{'transform':`scale(${2.25*formulaScale}) translate(-150.723574,-62.764633)`});
      referenceFormulaMath.append(...[...reuseFormula.rows[0].children].slice(-5).map(e=>e.cloneNode(true)));
      referenceFormula.appendChild(referenceFormulaMath);svg.insertBefore(referenceFormula,entry.title);
      const localFormulas = {};
      for (const formula of entry.formulas.filter(f => f.phase === 'verify')) {
        formula.embedded = true;svg.querySelector('defs').append(...formula.panel.querySelector('defs').children);
        localFormulas[formula.phase] = formula.rows.map((row,i)=>{
          const width = +row.dataset.width, height = +row.dataset.height;
          const clip = make('clipPath', {id:`detail-residual-local-${formula.phase}-${i}`, clipPathUnits:'userSpaceOnUse'});
          const upper = make('rect',{x:0,y:0,width:0,height:height/2}), lower = make('rect',{x:0,y:height/2,width:0,height:height/2});
          clip.append(upper,lower);svg.querySelector('defs').appendChild(clip);
          const group = make('g', {'data-local-formula':formula.phase,'data-formula-index':i});
          const content = make('g',{'clip-path':`url(#${clip.id})`});row.setAttribute('transform',row.dataset.localTransform);
          content.appendChild(row);group.appendChild(content);root.appendChild(group);
          const x = 330 + 30*57/52 - 50 + i*230 + 68;
          group.setAttribute('transform',`translate(${x},40) scale(${formulaScale})`);
          const outcomeColor = steps[i].label.getAttribute('fill');
          const outcomeRGB = outcomeColor.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel,16));
          return {group, row, upper, lower, width, reveal(p,alpha=1,comparison=0){
            upper.setAttribute('width',String(width*clamp(p*2)));lower.setAttribute('width',String(width*clamp(p*2-1)));
            group.setAttribute('fill', `rgb(${outcomeRGB.map(channel => Math.round(channel*comparison)).join(',')})`);
            group.dataset.comparison=String(comparison);
            group.dataset.written=String(p);opacity(group,alpha);opacity(row,1);
          }};
        });
      }
      const discarded = entry.discarded.cloneNode(true);discarded.setAttribute('transform', 'translate(376,74)');
      root.appendChild(discarded);number(discarded, 4);
      const discardLabel = make('text', {x: 950, y: 180, 'text-anchor': 'middle', 'font-family': 'SpeCaTimes,Times New Roman,Times,serif', 'font-size': 24, 'font-weight': 700, fill: '#C0504D', 'data-discard-label':''});
      discardLabel.textContent = 'Discard';root.appendChild(discardLabel);
      entry.chain = {root, initial, chainLinks, chainBodies, morphMarker, referenceBus, purpleBox, purpleCircle, references, batch, model, batchInputs, batchOutputs, batchVelocities, steps, correction, correctionLabel, replacement, transfer, transferPoint, transferSuperscript, transferGlyphs, replacementGlyphs, reusedVelocity, referenceEquation, referenceMath, referenceLHS, referenceFormula, localFormulas, discarded, discardLabel,
        correctionArrow: SamplingPlayback.traceArrow(correction.querySelector('path'))};
      entry.returnPath.setAttribute('d', 'M 976 224 H 994 Q 1006 224 1006 236 V 290 Q 1006 302 994 302 H -10 Q -22 302 -22 290 V 236 Q -22 224 -10 224 H 18');
      entry.returnArrow = SamplingPlayback.traceArrow(entry.returnPath);
      // All phases share one SVG and one height; equation changes cannot move the player.
      entry.formulas.filter(f => !f.embedded).forEach(f => svg.insertBefore(f.panel, entry.title));
    }
    // Retain Figure 2's native node size; change the camera width, not the glyphs.
    const widestDraftEquation = Math.max(...cards.filter(Boolean).flatMap(entry => entry.embeddedEquations.map(e => e.width)));
    const layoutDraft = (entry, width) => {
      if (entry.draftWidth === width) return;
      entry.draftWidth = width;
      const parallel = entry.route === 'residual';
      const centers = Array.from({length: 4}, (_, i) => width * (i + .5) / 4);
      entry.draftCenters = centers;
      const {svg, drafts} = entry;
      const modelX = centers[1], velocityX = centers[2], referenceX = centers[3];
      svg.querySelector('[data-call-part="model"]').setAttribute('transform', `translate(${modelX - 223},0)`);
      svg.querySelector('[data-call-part="velocity"]').setAttribute('transform', `translate(${velocityX - 393},0)`);
      svg.querySelector('[data-init-part="reference"]').setAttribute('transform', `translate(${referenceX - 426},5)`);
      const callPaths = ['input-arrow', 'output-arrow'].map(part => svg.querySelector(`[data-call-part="${part}"] path`));
      callPaths[0].setAttribute('d', `M 107 150 H ${modelX - 66 + 21}`);
      callPaths[1].setAttribute('d', `M ${modelX + 66 + 21} 150 H ${velocityX - 28 + 21}`);
      entry.callArrows = callPaths.map(path => SamplingPlayback.traceArrow(path));
      const referencePath = svg.querySelector('[data-init-part="reference-link"] path');
      referencePath.setAttribute('d', `M ${velocityX + 24} 150 H ${referenceX - 38}`);
      entry.referenceArrow = SamplingPlayback.traceArrow(referencePath);
      const couplingFormulaScale=2.25*formulaScale;
      if (entry.sharedDraftPaths.length) {
        // Synchronize each bend, then meet halfway along the shared line.
        // Equal progress over unequal full paths made one side look ahead.
        const referenceEquation=entry.embeddedEquations.find(e=>e.key==='reference');
        const rightClearance=parallel?62:Math.max(62,referenceEquation.width*formulaScale/2+16);
        const left = 104, right = parallel ? referenceX + rightClearance : Math.round(referenceX + rightClearance);
        const meetingX = parallel ? (left + right) / 2 : Math.round((left + right) / 2);
        const busY=parallel?270:250;
        entry.sharedDraftPaths[0].setAttribute('d', `M 86 165 H ${left} V ${busY} H ${meetingX}`);
        entry.sharedDraftPaths[1].setAttribute('d', `M ${referenceX + 30} 150 H ${right} V ${busY} H ${meetingX}`);
        const segments = [[18, busY-165, meetingX - left], [rightClearance-30, busY-150, right - meetingX]];
        entry.sharedDraftFlows = entry.sharedDraftPaths.map((path, i) => {
          if(!parallel){
            path.setAttribute('stroke-width',String(couplingDraftStroke));
            for(const [key,value] of Object.entries(couplingLineStyle))path.setAttribute(key,value);
          }
          const draw = SamplingPlayback.traceArrow(path), [shoulder, descent, inward] = segments[i];
          return p => draw((shoulder * clamp(p / .2) + descent * clamp((p - .2) / .3) + inward * clamp((p - .5) / .5)) / (shoulder + descent + inward));
        });
      }
      drafts.forEach((group, i) => {
        if (!i) return;
        const originalX = 54 + 130 * i, targetX = centers[i - 1], dx = targetX - originalX;
        group.setAttribute('transform', `translate(${dx},180)`);
        group.querySelector('[data-node-role]').setAttribute('transform', `translate(0,${parallel?residualDraftOffset:couplingDraftOffset})`);
        const paths = [...group.querySelectorAll('path[marker-end]:not([data-part])')];
        const left = i === 1 ? (86 + targetX - 27) / 2 : centers[i - 2] + 26;
        paths[0].setAttribute('d', parallel ? `M ${originalX} 90 V ${123 + residualDraftOffset}` : `M ${originalX} ${140+couplingDraftInset} V ${123+couplingDraftOffset}`);
        if(entry.draftReferenceBranches[i]){
          entry.draftReferenceBranches[i].setAttribute('d',`M ${originalX} 70 V ${102+couplingDraftInset}`);
          entry.draftReferenceFlows[i]=SamplingPlayback.traceArrow(entry.draftReferenceBranches[i]);
        }
        if (paths[1]) paths[1].setAttribute('d', `M ${originalX+44} ${158+couplingDraftInset} H ${originalX}`);
        entry.draftArrows[i] = paths.map(path => SamplingPlayback.traceArrow(path));
        const coupling=entry.couplingDrafts[i];
        if(coupling){
          const glyphBox=coupling.math.getBBox(),formulaBox=coupling.velocityFormula.getBBox();
          const velocityWidth=(formulaBox.x+formulaBox.width-glyphBox.x)*couplingFormulaScale;
          coupling.velocityWidth=velocityWidth;
          const velocityTransform=`translate(${originalX-velocityWidth/2},${128+couplingDraftInset}) scale(${couplingFormulaScale}) translate(${-glyphBox.x},-61.867955)`;
          coupling.math.setAttribute('transform',velocityTransform);
          coupling.velocityFormula.setAttribute('transform',velocityTransform);
          group.querySelector('[data-math="noise"]').setAttribute('transform',`translate(70,${85+couplingDraftInset})`);
          const previousX=i>1?centers[i-2]-dx:originalX;
          const serialEnd=Math.round(originalX-velocityWidth/2-10),elbow=serialEnd-couplingSerialApproach;
          coupling.serial.setAttribute('d',`M ${previousX+27} ${150+couplingDraftOffset} H ${elbow} V ${120+couplingDraftInset} H ${serialEnd}`);
          coupling.serialFlow=SamplingPlayback.traceArrow(coupling.serial);
          group.querySelectorAll(':scope > path').forEach(path=>{
            path.setAttribute('stroke-width',String(couplingDraftStroke));path.setAttribute('stroke-dasharray','5 4');
            for(const [key,value] of Object.entries(couplingLineStyle))path.setAttribute(key,value);
            path.setAttribute('marker-end','url(#detail-svg-coupling-arrow-coupling-draft)');
          });
        }
        const midpoint = (left + targetX - 27) / 2 - dx;
        const referenceBox = group.querySelector(':scope > rect');
        referenceBox.setAttribute('x', String(midpoint - 19));
        referenceBox.style.display = 'none';
        const reference = group.querySelector('[data-math="vbar"], [data-math="abar"]');
        reference.style.display = 'none';
        reference.setAttribute('transform', `translate(${midpoint - (originalX - 65.5)},0) ${entry.draftReferenceTransforms[i]}`);
      });
      let bottom = 0;
      entry.embeddedEquations.forEach(e => {
        const center = e.key === 'reference' ? referenceX : centers[+e.key - 1];
        const top = e.key === 'reference' ? 208 : parallel ? 412 : 440;
        e.wrapper.setAttribute('transform', `translate(${center - e.width * formulaScale / 2},${top}) scale(${formulaScale})`);
        bottom = Math.max(bottom, top + e.height * formulaScale);
      });
      entry.draftHeight = bottom + 20 - 40;
    };
    // Crop unused space around the unchanged SVG. Only Coupling's drafting
    // needs the taller viewport; every other phase shares one fixed height.
    const compactViewportHeight = 410;
    const frameViewport = entry => {
      const expansion = entry.draftExpansion ?? (entry.route === 'coupling' ? 1 : 0);
      const height = compactViewportHeight
        + (Math.max(compactViewportHeight, entry.draftHeight) - compactViewportHeight) * expansion;
      entry.imageHost.style.height = `${height * entry.scale}px`;
    };
    const frameDiagram = entry => {
      const draftWidth = Math.max(entry.viewportWidth < 768 ? 1440 : 1120,
        4 * (widestDraftEquation * formulaScale + 20), entry.viewportWidth / entry.scale);
      const continuous = Boolean(entry.chain);
      const viewWidth = draftWidth;
      layoutDraft(entry, draftWidth);
      // The title stays 30 native units below the top of each compact camera.
      const top = 40;
      const height = continuous ? 520 : Math.max(520,entry.draftHeight);
      const left = 0;
      if(entry.parallel){
        entry.parallel.left=(viewWidth-1000)/2;entry.parallel.top=106+residualDraftOffset;
        entry.parallel.root.setAttribute('transform',`translate(${entry.parallel.left},${entry.parallel.top})`);
        entry.parallel.steps.forEach(item=>{item.ellDependencyArrow=item.layoutInputs(viewWidth-entry.parallel.left-12);});
        entry.localLeft=(viewWidth-620)/2;entry.localTop=110;
        entry.scenes.local.setAttribute('transform',`translate(${entry.localLeft},${entry.localTop})`);
        entry.returnPath.setAttribute('transform',`translate(${entry.localLeft},${entry.localTop})`);
      }
      if (continuous) {
        entry.chain.left = (viewWidth - 1000) / 2;entry.chain.top = 106 + residualDraftOffset;
        const transform = `translate(${entry.chain.left},${entry.chain.top})`;
        entry.chain.root.setAttribute('transform', transform);entry.returnPath.setAttribute('transform', transform);
        const refX=entry.draftCenters[3], cx=entry.chain.left, cy=entry.chain.top;
        entry.chain.referenceBus.setAttribute('d',`M ${refX+30-cx} ${150-cy} H ${refX+62-cx} V ${270-cy} H ${refX-cx}`);
        entry.chain.referenceRetract=SamplingPlayback.traceArrow(entry.chain.referenceBus);
        entry.formulas.filter(f => !f.embedded).forEach(f => {
          f.panel.setAttribute('x', String(entry.chain.left + 50));
          f.panel.setAttribute('y', f.phase === 'reuse' ? '450' : '414');
          f.panel.style.width = `${f.width * formulaScale}px`;
          f.panel.style.height = `${f.height * formulaScale}px`;
        });
      }
      entry.svg.setAttribute('viewBox', `${left} ${top} ${viewWidth} ${height}`);
      if(entry.parallel)entry.parallel.correction.layout();
      entry.svg.style.width = `${viewWidth * entry.scale}px`;
      entry.svg.style.height = `${height * entry.scale}px`;
      frameViewport(entry);
      entry.title.setAttribute('x', String(left + (entry.imageHost.scrollLeft + entry.viewportWidth / 2) / entry.scale));
      entry.title.setAttribute('y', String(top + 30));
    };
    const resize = () => {
      const scale = SamplingPlayback.diagramScale(host.closest('.sampling-player').clientWidth);
      for (const entry of cards) {
        if (!entry || !scale) continue;
        const width = entry.imageHost.clientWidth;
        if (!width || entry.viewportWidth === width && entry.scale === scale) continue;
        entry.viewportWidth = width;entry.scale = scale;
        frameDiagram(entry);
        const localFormulas = entry.formulas.filter(f => !f.embedded);
        if (!entry.chain) localFormulas.forEach(f => {f.panel.style.width = `${f.width * formulaScale * scale}px`;});
      }
    };
    const sizeObserver = new ResizeObserver(resize);sizeObserver.observe(host);
    cards.forEach(entry => {if (entry) sizeObserver.observe(entry.imageHost);});resize();
    return {
      resize,
      update({t, start, reject, complete, preparingReference, handoff, anchorChange, phase, title, titleOpacity, initialTiming, draftTiming, batchTiming, decisionTiming, verificationSteps}) {
        const progress = (a, b) => ease(clamp((t - a) / (b - a)));
        const local = t >= batchTiming.inputStart;
        const index = Math.max(0, verificationSteps.findLastIndex(step => step.eligible && t >= step.decisionAt));
        const step = verificationSteps[index];
        const rejected = index === reject && t >= step.decisionAt;
        const decided = t >= step.decisionAt;
        const stateReveal = progress(step.flowEnd, step.stateEnd);
        const discard = reject === null ? 0 : progress(decisionTiming.discardStart, decisionTiming.discardEnd);
        const correcting = reject !== null && t >= decisionTiming.correctStart;
        const returning = reject !== null && t >= decisionTiming.returnStart;
        const formulaPhase = !local ? 'draft'
          : returning ? 'reuse' : correcting ? 'correct' : t < batchTiming.verificationStart ? 'evaluate' : 'verify';
        host.dataset.phase = formulaPhase;
        let layout = null;
        for (const entry of cards) {
          if (!entry || entry.card.hidden) continue;
          const {card, route, svg, scenes, anchor, anchorIndex, nextAnchorIndex} = entry;
          const fade = 1 - handoff;
          opacity(card, 1);opacity(svg, 1);
          entry.title.textContent = title;opacity(entry.title, titleOpacity);
          if (entry.local !== local || entry.phase !== phase) {
            entry.local = local;entry.phase = phase;
            if (entry.scale) frameDiagram(entry);
          }
          // Let the drafting equations disappear before closing the extra
          // space. Use playback time so pause, replay, and scrubbing agree.
          entry.draftExpansion = route === 'coupling' ? Math.max(
            1 - progress(batchTiming.sceneFadeEnd, batchTiming.sceneFadeEnd + 600),
            progress(decisionTiming.nextDraftAt, decisionTiming.nextDraftAt + 600)
          ) : 0;
          if (entry.scale) frameViewport(entry);
          if ((!local || entry.chain) && entry.scale) entry.title.setAttribute('x', String(entry.svg.viewBox.baseVal.x + (entry.imageHost.scrollLeft + entry.viewportWidth / 2) / entry.scale));
          card.dataset.phase = formulaPhase;
          entry.formulaHost.hidden = true;
          entry.formulas.forEach(({phase: name, panel, rows}) => {
            if (name !== 'draft') {panel.style.display='none';return;}
            const active = formulaPhase === 'draft' && !(entry.chain && t >= decisionTiming.orangeEnd);
            panel.style.display = active ? 'block' : 'none';
            panel.setAttribute('aria-hidden', String(!active));
            rows.forEach((row, i) => {
              const at = i === 0 ? initialTiming.referenceEnd : draftStart(route, i, draftTiming) + draftTiming.flowDuration;
              let shown = progress(at, at + draftTiming.stateDuration);
              if(route==='coupling'&&i){
                const beats=couplingDraftBeats(i,draftTiming);
                shown=progress(beats.velocityStart,beats.velocityEnd);
                opacity(entry.couplingDrafts[i].stateFormula,progress(beats.stateStart,beats.stateEnd));
              }
              opacity(row, shown * fade);
              row.setAttribute('aria-hidden', String(!active || shown === 0));
            });
          });
          entry.indexedLabels.forEach(group => [...group.children].forEach(label => {
            label.style.display = +label.dataset.mathIndex === index ? '' : 'none';
          }));
          const movingDrafts = (entry.chain || entry.parallel) && t < batchTiming.inputEnd;
          scenes.initialize.style.display = !local || movingDrafts ? '' : 'none';
          scenes.draft.style.display = !local || movingDrafts ? '' : 'none';
          scenes.local.style.display = 'none';
          if (entry.chain) entry.chain.root.style.display = local ? '' : 'none';
          const draftingOpacity = fade * (1 - progress(batchTiming.sceneFadeStart,batchTiming.sceneFadeEnd));
          opacity(scenes.initialize, draftingOpacity);
          opacity(scenes.draft, draftingOpacity);
          // A single initial call occurs inside the first Drafting phase.
          entry.callArrows[0](progress(initialTiming.inputStart, initialTiming.inputEnd));
          entry.callArrows[1](progress(initialTiming.modelEnd, initialTiming.outputEnd));
          entry.referenceArrow(progress(initialTiming.referenceStart, initialTiming.referenceEnd));
          opacity(svg.querySelector('[data-init-call]'), 1);
          opacity(svg.querySelector('[data-init-reference]'), 1);
          svg.querySelectorAll('[data-call-part]').forEach(e => {
            const part = e.dataset.callPart;
            opacity(e, part === 'model' ? progress(initialTiming.inputEnd, initialTiming.inputEnd + 250) : part === 'velocity' ? progress(initialTiming.outputEnd, initialTiming.velocityEnd) : 1);
          });
          svg.querySelectorAll('[data-init-part]').forEach(e => {
            opacity(e, e.dataset.initPart === 'reference' ? progress(initialTiming.referenceEnd, initialTiming.ready) : 1);
          });
          // The single reference is now represented by its four moving copies.
          if (entry.chain && local) opacity(svg.querySelector('[data-init-part="reference"]'), 0);
          // Carry the framed anchor through initialization and window return.
          let x = 54, y = 150, anchorOpacity = 1;
          if (local && !returning) anchorOpacity = 0;
          else if (returning) {
            anchorOpacity = progress(decisionTiming.returnEnd,decisionTiming.returnEnd + 400);
            if (entry.chain) {
              const reset = progress(decisionTiming.orangeEnd, decisionTiming.nextDraftAt);
              x = (entry.chain.left + 50) * (1 - reset) + 54 * reset;
              y = (entry.chain.top + 224) * (1 - reset) + 150 * reset;
            }else if(entry.parallel){
              x+=entry.localLeft;y+=entry.localTop;
            }
          }
          else {
            const moving = entry.chain || entry.parallel ? 0 : progress(batchTiming.inputStart - 600, batchTiming.inputStart);
            x += 46 * moving;y += 74 * moving;anchorOpacity = 1 - moving;
          }
          anchor.setAttribute('transform', `translate(${x - 54},${y - 150})`);
          opacity(anchor, anchorOpacity);
          if(entry.parallel&&local)opacity(anchor,0);
          number(anchorIndex, start);number(nextAnchorIndex, start + 3);
          opacity(anchorIndex, 1 - clamp(anchorChange * 2));
          opacity(nextAnchorIndex, clamp((anchorChange - .5) * 2));
          if (entry.chain) {
            const purple = returning ? 1 - progress(decisionTiming.purpleEnd, decisionTiming.orangeEnd) : 0;
            opacity(entry.chain.purpleBox, purple);opacity(entry.chain.purpleCircle, purple);
            if (returning) {opacity(anchorIndex, 0);opacity(nextAnchorIndex, 1);}
          }
          const sharedDuration=draftTiming.sharedDuration??sharedDraftInputDuration;
          const sharedStart=route==='residual'?draftTiming.start:draftTiming.start-sharedDuration;
          entry.sharedDraftFlows.forEach(draw => draw(progress(sharedStart,sharedStart+sharedDuration)));
          // At handoff, identical complete paths take over and morph with the nodes.
          entry.sharedDraftPaths.forEach(path => opacity(path, entry.chain && local ? 0 : 1));
          entry.drafts.forEach((group, i) => {
            if (i === 0) return;
            if(entry.couplingDrafts[i]){
              const coupling=entry.couplingDrafts[i],beats=couplingDraftBeats(i,draftTiming);
              const inputs=progress(beats.start,beats.velocityStart),velocity=progress(beats.velocityStart,beats.velocityEnd);
              const noise=progress(beats.flowStart,beats.noiseStart),state=progress(beats.stateStart,beats.stateEnd);
              number(group,start+i);opacity(group,1);
              [...group.children].forEach(e=>opacity(e,1));
              opacity(group.querySelector('[data-node-role]'),state);opacity(coupling.velocity,velocity);
              opacity(group.querySelector('[data-math="noise"]'),noise);
              entry.draftReferenceFlows[i](inputs);coupling.serialFlow(i>1?inputs:0);
              entry.draftArrows[i][0](progress(beats.flowStart,beats.stateStart));
              entry.draftArrows[i][1](progress(beats.noiseStart,beats.stateStart));
              return;
            }
            const at = draftStart(route, i, draftTiming);
            const drawn = progress(at, at + draftTiming.flowDuration);
            const shown = progress(at + draftTiming.flowDuration, at + draftTiming.flowDuration + draftTiming.stateDuration);
            entry.draftArrows[i].forEach(draw => draw(drawn));
            entry.draftReferenceFlows[i]?.(drawn);
            number(group, start + i);opacity(group, 1);
            group.querySelector('[data-node-role]').style.visibility = entry.chain && local ? 'hidden' : '';
            [...group.children].forEach(e => opacity(e, e.hasAttribute('data-node-role') ? shown
              : entry.chain && local && e.matches('path[marker-end]') ? 0 : drawn));
          });
          if(entry.parallel){
            const batch=entry.parallel,moving=progress(batchTiming.stateMoveStart,batchTiming.inputEnd);
            const transfer=progress(batchTiming.velocityMoveStart,batchTiming.velocityMoveEnd);
            batch.root.style.display=local?'':'none';
            opacity(batch.root,1);
            const points=batch.states.map((node,i)=>{
              const fromX=i?entry.draftCenters[i-1]:54,fromY=i?330+couplingDraftOffset:150;
              const toX=batch.left+(i===4?950:50+230*i),toY=batch.top+224;
              const x=fromX+(toX-fromX)*moving,y=fromY+(toY-fromY)*moving;
              node.setAttribute('transform',`translate(${x-batch.left-(54+130*i)},${y-batch.top-150})`);
              const decision=i>0&&i<4?progress(verificationSteps[i-1].decisionAt,verificationSteps[i-1].stateEnd):0;
              opacity(node,i===4?1-discard:1-decision);return {x:x-batch.left,y:y-batch.top};
            });
            batch.links.forEach((path,i)=>{
              const from=points[i],to=points[i+1],mix=(a,b)=>a+(b-a)*moving;
              const color=`rgb(${Math.round(83+36*moving)},${Math.round(130-11*moving)},${Math.round(53+66*moving)})`;
              const originalX=54+130*(i+1),dx=entry.draftCenters[i]-originalX;
              const sourceEnd=Math.round(originalX-entry.couplingDrafts[i+1].velocityWidth/2-10)+dx-batch.left;
              const endX=i?mix(sourceEnd,to.x-27):to.x-27*moving;
              const endY=mix((i?300:282)+couplingDraftInset-batch.top,to.y);
              const elbow=i?endX-couplingSerialApproach*(1-moving):mix(104-batch.left,from.x+32);
              path.setAttribute('d',i?`M ${from.x+27} ${from.y} H ${elbow} V ${endY} H ${endX}`
                :`M ${from.x+32} ${from.y+15*(1-moving)} H ${elbow} V ${mix(250-batch.top,to.y)} H ${endX} V ${endY}`);
              const tail=batch.tails[i],tailX=to.x-27*moving;
              tail.setAttribute('d',`M ${tailX} ${mix(320+couplingDraftInset-batch.top,to.y)} V ${mix(303+couplingDraftOffset-batch.top,to.y)}`);
              for(const line of [path,tail]){
                line.setAttribute('stroke',color);line.setAttribute('stroke-width',String(2-.2*moving));
                line.style.visibility='visible';opacity(line,(line===tail&&moving===1?0:1)*(i===3?1-discard:1));
              }
              batch.marker.querySelector('path').setAttribute('stroke',color);
              batch.marker.querySelector('path').setAttribute('stroke-width',String(2-.25*moving));
            });
            batch.references.forEach((reference,i)=>{
              const x=entry.draftCenters[3]-batch.left,destination=i===3?845:164+230*i,y=150-batch.top;
              reference.group.setAttribute('transform',`translate(${x+(destination-x)*moving-426},${y+(253-y)*moving-145})`);
              const size=60-22*moving;
              for(const [key,value] of Object.entries({x:426-size/2,y:145-size/2,width:size,height:size,rx:7-2*moving}))reference.frame.setAttribute(key,String(value));
              reference.frame.setAttribute('stroke',`rgb(${Math.round(22+192*moving)},${Math.round(44+170*moving)},${Math.round(81+133*moving)})`);
              reference.frame.setAttribute('stroke-width',String(1.8-.8*moving));
              reference.glyph.setAttribute('transform',`translate(426,145) scale(${1-(1-25/32)*moving}) translate(-426,-145) ${reference.glyphTransform}`);
              opacity(reference.group,(i?clamp(moving*8):1)*(i===3?1-discard:1));
            });
            renderBatch(batch,batchTiming,progress);
            batch.batchVelocities.forEach((velocity,i)=>{
              // Keep the same 24 px velocity glyphs while leaving the parallel-call layout.
              const startX=50+230*i,destination=[132,362,642,950][i];
              const x=startX+(destination-startX)*transfer,y=15+([174,174,172,190][i]-15)*transfer;
              velocity.setAttribute('transform',`translate(${x-224},${y-140})`);
              opacity(velocity,progress(batchTiming.velocityStart,batchTiming.velocityEnd)*(i===3?1-discard:1));
            });
            batch.steps.forEach((item,i)=>{
              const check=verificationSteps[i],next=verificationSteps[i+1];
              const decision=progress(check.decisionAt,check.stateEnd),comparison=progress(check.comparisonStart,check.comparisonEnd);
              const color=item.color.match(/[a-f\d]{2}/gi).map(c=>parseInt(c,16));
              const equationFade=i<2?1-progress(next.targetStart-300,next.targetStart)
                :1-progress(decisionTiming.discardLabelStart-300,decisionTiming.discardLabelStart);
              item.vector(progress(check.targetStart,check.targetEnd));
              opacity(item.axis,progress(check.targetEnd,check.starEnd));
              opacity(item.meanPoint,progress(check.targetEnd,check.starEnd));
              item.target(progress(check.curveStart,check.curveEnd));opacity(item.pLabel,progress(check.curveStart,check.curveEnd));
              opacity(item.meanGuide,progress(check.curveStart,check.curveEnd));
              item.projection(progress(check.flowStart,check.flowEnd));opacity(item.point,progress(check.flowEnd,check.positionEnd));
              // Q is already known from drafting. Draw its full density first;
              // only after drawing U do we continuously scale its height to Uq.
              const qDraw=progress(check.qStart,check.qEnd),scaled=progress(check.circleStart,check.circleEnd);
              const qScale=1/item.uniformScale+(1-1/item.uniformScale)*scaled;
              item.proposal(qDraw);item.q.setAttribute('transform',`scale(1,${qScale})`);
              item.q.dataset.uniformProgress=String(scaled);item.q.dataset.heightScale=String(qScale);
              const labelShift=item.proposalPeak*(qScale-1);
              item.qLabel.setAttribute('transform',`translate(0,${labelShift}) ${item.uqLabelBase}`);
              opacity(item.qLabel,qDraw);item.uniformGlyphs.forEach(g=>opacity(g,scaled));
              opacity(item.proposalMean,progress(check.proposalEnd,check.qMeanEnd)*(1-scaled));opacity(item.proposalGuide,qDraw*(1-scaled));
              const offsetDraw=progress(check.offsetStart,check.offsetEnd);
              const offsetFade=1-progress(check.flowStart-250,check.flowStart);
              const deltaFade=1-progress(check.uniformStart-250,check.uniformStart);
              const delta=item.equations.delta,deltaMove=ease(progress(check.flowStart,check.positionEnd));
              delta.equation.setAttribute('transform',`translate(${delta.left+(delta.useLeft-delta.left)*deltaMove},${delta.top+(delta.useTop-delta.top)*deltaMove})`);
              item.deltaInput.draw(progress(check.logcalcStart,check.logcalcStart+300));opacity(item.deltaInput.group,deltaFade);
              item.meanBracket(offsetDraw);opacity(item.meanDifference,offsetDraw*offsetFade);
              item.normalizationArrow(progress(check.deltaStart+120,check.deltaStart+350));opacity(item.normalization,offsetFade);
              opacity(item.normalizationFactor,progress(check.deltaStart,check.deltaStart+150));
              const ratioDraw=progress(check.ratioStart,check.ratioEnd),ratioFade=1-progress(check.uniformStart-250,check.uniformStart);
              item.densityLine(ratioDraw);opacity(item.densityValues,ratioFade);
              item.densityDots.forEach(dot=>opacity(dot,progress(check.ratioStart+250,check.ratioEnd)));
              item.ellDependencyArrow=item.layoutEllConnection();
              item.ellDependencyArrow(progress(check.testLinkStart,check.testLinkEnd));opacity(item.ellDependency,equationFade);
              item.comparison(comparison);
              for(const e of [item.point,item.connector,item.bar,item.cap])e.setAttribute(e===item.point?'fill':'stroke',`rgb(${color.map(c=>Math.round(119+(c-119)*comparison)).join(',')})`);
              opacity(item.cap,comparison);opacity(item.boundary,comparison);item.regions.forEach(e=>opacity(e,comparison));opacity(item.pointMark,decision);
              const equationTimes={mean:[check.meanStart,check.meanEnd,1-progress(check.curveEnd,check.proposalStart)],
                proposal:[check.proposalStart,check.proposalEnd,1-progress(check.qStart-250,check.qStart)],
                offset:[check.offsetStart,check.offsetEnd,offsetFade],
                delta:[check.deltaStart+350,check.deltaEnd,deltaFade],
                ratio:[check.ratioStart,check.ratioEnd,equationFade],
                logcalc:[check.logcalcStart,check.logcalcEnd,equationFade],
                uniform:[check.uniformStart,check.uniformEnd,1-progress(check.circleEnd,check.formulaStart)],
                test:[check.formulaStart,check.formulaEnd,equationFade]};
              for(const [phase,math] of Object.entries(item.equations)){
                const [start,end,visible]=equationTimes[phase],written=progress(start,end),tint=phase==='test'?comparison:0;
                math.clipRect.setAttribute('width',String(math.width*written));opacity(math.equation,visible);
                math.equation.setAttribute('fill',`rgb(${color.map(c=>Math.round(c*tint)).join(',')})`);
                math.equation.dataset.written=String(written);math.equation.dataset.comparison=String(tint);
              }
              for(const [phase,annotation] of Object.entries(item.annotations)){
                const [,end,visible]=equationTimes[phase];
                // m^Q's point settles after its formula; other targets already exist.
                const start=phase==='proposal'?check.qMeanEnd:phase==='ratio'?check.ratioStart+200:end;
                const drawn=progress(start,start+350);
                const pointerFade=phase==='ratio'?1-progress(check.logcalcStart-200,check.logcalcStart):visible;
                annotation.arrows.forEach(draw=>draw(drawn));opacity(annotation.pointer,pointerFade);
                annotation.rings.forEach(ring=>opacity(ring,progress(start+250,start+350)));
              }
              opacity(item.decision,decision);opacity(item.state,decision);
            });
            opacity(batch.discardLabel,progress(decisionTiming.discardLabelStart,decisionTiming.discardLabelStart+250)
              *(1-progress(decisionTiming.discardLabelFadeStart,decisionTiming.discardLabelEnd)));
            batch.correction.render(t,decisionTiming,progress);
          }
          if (entry.chain) {
            const chain = entry.chain;
            const moving = progress(batchTiming.stateMoveStart, batchTiming.inputEnd);
            const annotationFade = 1-progress(decisionTiming.clearStart,decisionTiming.clearEnd);
            // Once x_3 has replaced x_0, retain the first reference as the rest
            // of the completed window fades and u_2 travels to that reference.
            opacity(chain.root, fade * (1 - progress(decisionTiming.referenceMoveStart, decisionTiming.referenceMoveEnd)));
            opacity(chain.initial, 1 - progress(decisionTiming.returnEnd, decisionTiming.returnEnd + 400));
            chain.initial.setAttribute('transform', `translate(${-50 + (54 - chain.left - 50) * (1 - moving)},${(150 - chain.top - 224) * (1 - moving)})`);
            const discardedTail = 1 - discard;
            const stateXs = [54 - chain.left + (chain.left + 50 - 54) * moving,
              ...entry.draftCenters.map((x, i) => x - chain.left + ((i < 3 ? 280 + 230 * i : 950) - (x - chain.left)) * moving)];
            const mix = (a, b) => a + (b - a) * moving;
            const linkColor = `rgb(${Math.round(mix(83,119))},${Math.round(mix(130,119))},${Math.round(mix(53,119))})`;
            chain.morphMarker.querySelector('path').setAttribute('stroke', linkColor);
            let previousTail;
            chain.chainLinks.forEach((path, i) => {
              let busY = mix(270 - chain.top, 224), bodyPoints;
              const angle = -Math.PI / 2 * (1 + moving);
              const toX = stateXs[i + 1] + 27 * Math.cos(angle), toY = 224 + 27 * Math.sin(angle);
              const controlX = toX + 27 * Math.cos(angle), controlY = toY + 27 * Math.sin(angle);
              if (i === 0) {
                const from = stateXs[0] + 32, y = mix(165 - chain.top, 224);
                const elbow = from + 18 * (1 - moving);
                bodyPoints = [[from,y],[elbow,y],[elbow,busY],[controlX,busY]];
              } else {
                // Slide the branch junction down the preceding curve. Drawing an
                // overlapping reverse branch had filled its dash gaps into a solid line.
                const [a, b, c] = previousTail, q = 1 - moving;
                const fromX = q * q * a.x + 2 * q * moving * b.x + moving * moving * c.x;
                busY = q * q * a.y + 2 * q * moving * b.y + moving * moving * c.y;
                bodyPoints = [[fromX,busY],[controlX,busY]];
              }
              previousTail = [{x: controlX, y: busY}, {x: controlX, y: controlY}, {x: toX, y: toY}];
              path.setAttribute('d', `M ${controlX} ${busY} Q ${controlX} ${controlY} ${toX} ${toY}`);
              path.setAttribute('stroke-dashoffset','0');
              path.setAttribute('stroke', linkColor);opacity(path, i === 3 ? discardedTail : 1);
              const referenceX=entry.draftCenters[3],meeting=(104+referenceX+62)/2;
              const originalStart=i?entry.draftCenters[i-1]:104, originalEnd=entry.draftCenters[i];
              const prefix=i?0:123, originalLength=prefix+originalEnd-originalStart;
              const leftRatio=clamp((prefix+meeting-originalStart)/originalLength);
              const splitRatio=leftRatio+(1-leftRatio)*moving;
              const lengths=bodyPoints.slice(1).map((p,j)=>Math.hypot(p[0]-bodyPoints[j][0],p[1]-bodyPoints[j][1]));
              let remaining=lengths.reduce((a,b)=>a+b,0)*splitRatio,left=[bodyPoints[0]],right=[];
              for(let j=0;j<lengths.length;j++){
                const a=bodyPoints[j],b=bodyPoints[j+1],len=lengths[j];
                if(right.length){right.push(b);continue;}
                if(remaining>=len){left.push(b);remaining-=len;continue;}
                const f=len?remaining/len:0,point=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
                left.push(point);right=[point,b];remaining=0;
              }
              const phases=[i?123+originalStart-104:0,152+referenceX+62-originalEnd];
              [left,right.reverse()].forEach((points,side)=>{
                const body=chain.chainBodies[i][side];
                body.setAttribute('d',points.length?points.map((p,j)=>`${j?'L':'M'} ${p[0]} ${p[1]}`).join(' '):'M 0 0');
                body.setAttribute('stroke-dashoffset',String(phases[side]));body.setAttribute('stroke',linkColor);
                opacity(body,i===3?discardedTail:1);
              });
            });
            // Retract along the completed feeder before the reference splits and moves.
            chain.referenceRetract(1-progress(batchTiming.sceneFadeStart,batchTiming.sceneFadeEnd));
            chain.references.forEach((reference, i) => {
              const x = entry.draftCenters[3] - chain.left;
              const destination = i === 3 ? 845 : 164 + 230 * i;
              const y = 150 - chain.top;
              reference.group.setAttribute('transform', `translate(${x + (destination - x) * moving - 426},${y + (253 - y) * moving - 145})`);
              const restoring = i === 0 ? progress(decisionTiming.orangeEnd,decisionTiming.nextDraftAt) : 0;
              const compact = moving * (1 - restoring), size = 60 - 22 * compact;
              for (const [key, value] of Object.entries({x: 426 - size / 2, y: 145 - size / 2, width: size, height: size, rx: 7 - 2 * compact})) reference.frame.setAttribute(key, String(value));
              reference.frame.setAttribute('stroke', `rgb(${Math.round(22+192*compact)},${Math.round(44+170*compact)},${Math.round(81+133*compact)})`);
              reference.frame.setAttribute('stroke-width', String(1.8 - .8 * compact));
              reference.glyph.setAttribute('transform', `translate(426,145) scale(${1 - (1 - 25 / 32) * compact}) translate(-426,-145) ${reference.glyphTransform}`);
              opacity(reference.group,i === 3 ? discardedTail : clamp(moving*8));
            });
            renderBatch(chain,batchTiming,progress);
            const velocityMoving = progress(batchTiming.velocityMoveStart, batchTiming.velocityMoveEnd);
            chain.batchVelocities.forEach((e, i) => {
              const x = 50 + 230 * i + 124 * velocityMoving, y = 15 + 125 * velocityMoving;
              e.setAttribute('transform', `translate(${x - 224},${y - 140})`);
              opacity(e, progress(batchTiming.velocityStart, batchTiming.velocityEnd)
                * (i === 3 ? discardedTail : i === 2 && t >= decisionTiming.referenceMoveStart ? 0 : 1));
            });
            chain.steps.forEach((item, i) => {
              const check = verificationSteps[i];
              const decision = progress(check.decisionAt, check.stateEnd);
              const target = progress(check.targetEnd, check.starEnd);
              const circle = progress(check.circleStart, check.circleEnd);
              const position = progress(check.flowEnd, check.positionEnd);
              opacity(item.group, 1);opacity(item.test, 1);
              item.vector(progress(check.targetStart, check.targetEnd));opacity(item.velocity, 0);
              const transferred = i === reject ? progress(decisionTiming.transferStart, decisionTiming.transferStart + decisionTiming.transferRevealDuration) : 0;
              opacity(item.targetPoint, target * (1 - .75 * transferred));opacity(item.star, target * (1 - transferred));
              opacity(item.circle, circle);item.circleOutline(circle);
              opacity(item.halo, i === reject ? decision : 0);
              item.circle.setAttribute('fill', i === reject && decision ? '#FFFFFF' : '#C5DFB4');
              item.circle.setAttribute('fill-opacity', i === reject && decision ? '1' : '.65');
              item.targetPoint.setAttribute('fill', i === reject && decision ? '#8064A2' : '#4F81BD');
              opacity(item.radius, progress(check.circleEnd, check.circleEnd + 150));opacity(item.delta, progress(check.circleEnd, check.circleEnd + 150));
              item.connector(progress(check.flowStart, check.flowEnd));opacity(item.point, position);opacity(item.residual, position);
              item.point.setAttribute('fill', decision ? i === reject ? '#C0504D' : '#538235' : '#000000');
              item.residual.setAttribute('stroke', decision ? i === reject ? '#C0504D' : '#538235' : '#777777');
              item.projection.setAttribute('stroke', decision ? i === reject ? '#C0504D' : '#538235' : '#777777');
              opacity(item.label, decision);
              const shift = (entry.draftCenters[i] - chain.left - (280 + 230 * i)) * (1 - moving);
              item.pending.setAttribute('transform', `translate(${shift},0)`);
              opacity(item.pending, 1 - decision);opacity(item.state, decision);
              const nextVerification = verificationSteps[i+1];
              const fadeAt = nextVerification?.eligible ? nextVerification.targetStart : decisionTiming.discardStart;
              chain.localFormulas.verify[i].reveal(progress(check.formulaStart,check.formulaEnd),1-progress(fadeAt,fadeAt+300),
                progress(check.comparisonStart,check.comparisonEnd));
            });
            const lastShift = (entry.draftCenters[3] - chain.left - 950) * (1 - moving);
            chain.discarded.setAttribute('transform', `translate(${376 + lastShift},74)`);
            opacity(chain.discarded, discardedTail);
            opacity(chain.discardLabel, progress(decisionTiming.discardLabelStart,decisionTiming.discardLabelStart+250)
              * (1-progress(decisionTiming.discardLabelFadeStart,decisionTiming.discardLabelEnd)));
            opacity(chain.correction, correcting ? 1 : 0);
            opacity(chain.correctionLabel, progress(decisionTiming.replaceStart, decisionTiming.replaceStart + 300) * annotationFade);
            chain.correctionArrow(progress(decisionTiming.replaceStart, decisionTiming.replaceEnd));
            opacity(chain.correction.querySelector('path'),1-progress(decisionTiming.returnEnd,decisionTiming.returnEnd+400));
            const transferShown = progress(decisionTiming.transferStart, decisionTiming.transferStart + decisionTiming.transferRevealDuration);
            const transferMoved = progress(decisionTiming.replacementStart, decisionTiming.replacementEnd);
            const renamed = progress(decisionTiming.nameStart, decisionTiming.nameEnd);
            opacity(chain.transferSuperscript,1-renamed);
            chain.transferSuperscript.removeAttribute('transform');
            const settled = progress(decisionTiming.nameEnd, decisionTiming.replacementSettled);
            const transferX = 330 + 30 * 57 / 52 + 410;
            chain.transfer.setAttribute('transform', `translate(${410 + (950 - transferX) * transferMoved},${134 * transferMoved})`);
            // Carry the same x and subscript into the corrected node instead of
            // dissolving one label and introducing another at a different position.
            [chain.transferGlyphs[0],chain.transferGlyphs[2]].forEach((glyph,i)=>{
              glyph.removeAttribute('transform');
              if(!renamed)return;
              const target=chain.replacementGlyphs[i],a=glyph.getBBox(),b=target.getBBox();
              const matrix=glyph.parentNode.getCTM().inverse().multiply(target.getCTM());
              const p=new DOMPoint(b.x,b.y).matrixTransform(matrix),q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(matrix);
              const sx=(q.x-p.x)/a.width,sy=(q.y-p.y)/a.height;
              glyph.setAttribute('transform',`matrix(${1+(sx-1)*renamed} 0 0 ${1+(sy-1)*renamed} ${(p.x-sx*a.x)*renamed} ${(p.y-sy*a.y)*renamed})`);
            });
            chain.transferPoint.setAttribute('r',String(4.5+19.5*renamed));
            chain.transferPoint.setAttribute('fill',`rgb(${Math.round(128+89*renamed)},${Math.round(100+110*renamed)},${Math.round(162+71*renamed)})`);
            chain.transferPoint.setAttribute('stroke','#8064A2');chain.transferPoint.setAttribute('stroke-width',String(1.5*renamed));
            opacity(chain.transfer, transferShown * (1 - settled));
            opacity(chain.replacement, settled*(1-progress(decisionTiming.returnEnd,decisionTiming.returnEnd+400)));
            const referenceMoving=progress(decisionTiming.referenceMoveStart,decisionTiming.referenceMoveEnd);
            const referenceRenamed=progress(decisionTiming.referenceNameStart,decisionTiming.referenceNameEnd);
            const resetReference=progress(decisionTiming.orangeEnd,decisionTiming.nextDraftAt);
            const referenceActive=t>=decisionTiming.referenceMoveStart;
            const referenceParent=referenceActive?chain.referenceEquation:chain.root;
            if(chain.references[0].group.parentNode!==referenceParent)referenceParent.appendChild(chain.references[0].group);
            const equationX=chain.left+164,equationY=chain.top+253;
            // Move the same frame in sync with x_3 while restoring its drafting
            // dimensions above; it stays visible throughout the transition.
            chain.referenceEquation.setAttribute('transform',`translate(${chain.left+(entry.draftCenters[3]-equationX)*resetReference},${chain.top+(150-equationY)*resetReference})`);
            chain.referenceLHS.removeAttribute('transform');
            if(referenceActive)chain.referenceMath.setAttribute('clip-path','url(#detail-residual-reference-value-clip)');
            else chain.referenceMath.removeAttribute('clip-path');
            const equationFade=1-progress(decisionTiming.sceneFadeStart,decisionTiming.sceneFadeEnd);
            opacity(chain.referenceEquation,referenceActive?1:0);
            opacity(chain.referenceLHS,1);
            chain.referenceEquation.dataset.replacementProgress=String(referenceRenamed);
            chain.referenceFormula.setAttribute('transform',`translate(${equationX-19},${equationY+54})`);
            opacity(chain.referenceFormula,progress(decisionTiming.referenceMoveEnd,decisionTiming.referenceMoveEnd+300)*equationFade);
            chain.reusedVelocity.setAttribute('transform',`translate(${chain.left+410},${chain.top})`);
            const source=chain.reusedVelocity.getBBox();
            if(referenceMoving){
              // Preserve u_2's original size and the first reference's baseline.
              const destinationX=equationX+38-(source.x+source.width/2);
              const destinationY=equationY+12*(25/32)-140;
              const dx=(chain.left+410)*(1-referenceMoving)+destinationX*referenceMoving;
              const dy=chain.top*(1-referenceMoving)+destinationY*referenceMoving;
              chain.reusedVelocity.setAttribute('transform',`translate(${dx},${dy})`);
            }
            opacity(chain.reusedVelocity,referenceActive?(1-referenceRenamed)*equationFade:0);
          }
          opacity(entry.returnPath, fade * (entry.chain ? 1 - progress(decisionTiming.referenceMoveStart,decisionTiming.referenceMoveEnd) : 1));
          entry.returnArrow(returning ? progress(decisionTiming.returnArrowStart, decisionTiming.returnEnd) : 0);
          if(entry.parallel)opacity(entry.returnPath,0);
          card.dataset.transition = String(start + index + 1);
          card.dataset.outcome = decided ? rejected ? 'rejected' : 'accepted' : 'pending';
          card.dataset.stateReveal = String(stateReveal);
          card.dataset.anchor = String(anchorChange >= .5 ? start + 3 : start);
          const localX=entry.parallel?entry.localLeft:0,localY=entry.parallel?entry.localTop:0;
          if (!card.hidden) layout = {svg, inlineActions: Boolean(local && (entry.chain || entry.parallel)),
            actionAnchor: phase === 'discard' ? {x: 540+localX, y: 292+localY, valign: 0}
              : phase === 'correct' ? {x: 435+localX, y: 207+localY}
              : {x: 375+localX, y: 224+localY, align: 0, valign: .5},
            noteAnchor: {x: entry.draftCenters[1], y: 222, valign: .5}};
        }
        return layout;
      }
    };
  }
};
