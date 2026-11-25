(() => {
  const tabs = [...document.querySelectorAll('#results .simulation-tabs [role="tab"]')];
  const models = ['fast-wam', 'faster-wam', 'pi05'];
  const methods = ['baseline', 'residual', 'coupling'];

  const successChart = group => {
    const description = group.rows.map(row => `${row.label}: ${row.success.toFixed(2)}%`).join(', ');
    return `<div class="simulation-success-chart">
      <svg class="simulation-success-svg" role="img" aria-label="${description}">
        <line class="simulation-success-baseline" aria-hidden="true"/>
        <polyline class="simulation-success-line"/>
        ${group.rows.map(row => `<g class="is-${row.method}" data-success-method="${row.method}" data-success="${row.success}">
          <circle class="simulation-success-point" r="4.5"/>
          <text class="simulation-success-label" dominant-baseline="central">${row.success.toFixed(2)}%</text>
        </g>`).join('')}
      </svg>
    </div>`;
  };

  // Measure the bar centers so the success points stay aligned when labels wrap.
  const alignSuccessChart = chart => {
    const bounds = chart.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const style = getComputedStyle(chart);
    const start = parseFloat(style.getPropertyValue('--success-axis-start'));
    const end = bounds.width - parseFloat(style.getPropertyValue('--success-value-space'));
    const summary = chart.closest('.simulation-summary');
    const minimum = Number(summary.dataset.successMin);
    const maximum = Number(summary.dataset.successMax);
    const x = rate => start + (end - start) * (rate - minimum) / (maximum - minimum);
    const svg = chart.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const baselineX = x(Number(svg.querySelector('[data-success-method="baseline"]').dataset.success));
    const reference = svg.querySelector('.simulation-success-baseline');
    reference.setAttribute('x1', baselineX);
    reference.setAttribute('x2', baselineX);
    reference.setAttribute('y1', 0);
    reference.setAttribute('y2', bounds.height);
    const points = [...svg.querySelectorAll('[data-success-method]')].map(point => {
      const row = chart.closest('.simulation-model').querySelector(`[data-summary-method="${point.dataset.successMethod}"] .simulation-speed-plot`).getBoundingClientRect();
      const px = x(Number(point.dataset.success));
      const py = row.y + row.height / 2 - bounds.y;
      const circle = point.querySelector('circle');
      circle.setAttribute('cx', px);
      circle.setAttribute('cy', py);
      const label = point.querySelector('text');
      label.setAttribute('x', px + 10);
      label.setAttribute('y', py);
      return `${px},${py}`;
    });
    svg.querySelector('polyline').setAttribute('points', points.join(' '));
  };

  // Derive both metrics from the existing table so the summary has one data source.
  const summarize = panel => {
    const source = panel.querySelector('.paper-results-block');
    const table = source.querySelector('table');
    const headers = [...table.tHead.rows[table.tHead.rows.length - 1].cells];
    const averageColumn = headers.findIndex(cell => cell.textContent.trim() === 'Avg.');
    if (averageColumn < 0) return;

    const groups = models.map(model => {
      const baseline = table.querySelector(`[data-model="${model}"][data-result-method="baseline"]`);
      const baselineAction = Number(baseline.cells[averageColumn + 1].textContent);
      const rows = methods.map(method => {
        const row = table.querySelector(`[data-model="${model}"][data-result-method="${method}"]`);
        const success = Number(row.cells[averageColumn].textContent);
        const action = Number(row.cells[averageColumn + 1].textContent);
        return { method, label: method === 'baseline' ? 'Baseline' : row.cells[0].textContent.trim(), speedup: baselineAction / action, success };
      });
      return { model, label: baseline.cells[0].innerHTML, rows };
    });
    if (groups.some(group => group.rows.some(row => !Number.isFinite(row.speedup) || row.speedup <= 0 || !Number.isFinite(row.success) || row.success < 0 || row.success > 100))) return;

    // All models within a benchmark share a scale, derived from that benchmark.
    const values = groups.flatMap(group => group.rows);
    const speedLimit = Math.ceil(Math.max(...values.map(row => row.speedup)) * 2) / 2;
    const rates = values.map(row => row.success);
    const low = Math.min(...rates), high = Math.max(...rates);
    const step = high - low > 40 ? 10 : high - low > 10 ? 5 : 1;
    const padding = Math.max(0.5, (high - low) * 0.1);
    const successMin = Math.max(0, Math.floor((low - padding) / step) * step);
    const successMax = Math.min(100, Math.ceil((high + padding) / step) * step);
    const speedTicks = [...new Set([0, ...Array.from({ length: Math.floor(speedLimit) }, (_, index) => index + 1), speedLimit])];
    const successTickStep = Math.ceil((successMax - successMin) / 3 / step) * step;
    const successTicks = [successMin];
    for (let value = successMin + successTickStep; value < successMax; value += successTickStep) successTicks.push(value);
    successTicks.push(successMax);

    const summary = document.createElement('figure');
    summary.className = 'simulation-summary';
    summary.dataset.speedLimit = speedLimit;
    summary.dataset.successMin = successMin;
    summary.dataset.successMax = successMax;
    summary.style.setProperty('--baseline-speed', `${100 / speedLimit}%`);
    summary.setAttribute('aria-label', `${document.getElementById(panel.getAttribute('aria-labelledby')).textContent}: action generation speedup and average success rate`);
    summary.innerHTML = `
      <div class="simulation-summary-head" aria-hidden="true">
        <span class="simulation-speed-heading">Action generation speedup</span>
        <span class="simulation-success-heading">Average success rate (%)</span>
      </div>
      ${groups.map(group => `
        <section class="simulation-model" aria-labelledby="summary-model-${panel.id}-${group.model}">
          <h3 id="summary-model-${panel.id}-${group.model}">${group.label}</h3>
          <div class="simulation-model-body">
          <div class="simulation-model-rows">
          ${group.rows.map(row => `
            <div class="simulation-summary-row is-${row.method}" data-summary-model="${group.model}" data-summary-method="${row.method}" data-speedup="${row.speedup}">
              <span class="simulation-method-name">${row.label}</span>
              <div class="simulation-speed-cell">
                <span class="simulation-speed-plot" style="--speed:${row.speedup / speedLimit * 100}%">
                  <span class="simulation-speed-fill" aria-hidden="true"></span>
                  <span class="simulation-speed-value"><span class="simulation-sr-only">Action generation speedup: </span>${row.speedup.toFixed(2)}×</span>
                </span>
              </div>
            </div>`).join('')}
          </div>
          ${successChart(group)}
          </div>
        </section>`).join('')}
      <div class="simulation-summary-axis" aria-hidden="true">
        <div class="simulation-speed-cell"><div class="simulation-axis-track">${speedTicks.map(value => `<span class="simulation-tick${value === 1 ? ' is-baseline' : ''}${value > 1 && value < speedLimit ? ' is-secondary' : ''}" style="--tick:${value / speedLimit * 100}%">${value === 0 ? '0' : `${value}×`}</span>`).join('')}</div></div>
        <div class="simulation-success-axis"><div class="simulation-axis-track">${successTicks.map(value => `<span class="simulation-tick${value > successMin && value < successMax ? ' is-secondary' : ''}" style="--tick:${(value - successMin) / (successMax - successMin) * 100}%">${value}</span>`).join('')}</div></div>
      </div>`;

    const details = document.createElement('details');
    details.className = 'simulation-full-results';
    const control = document.createElement('summary');
    const benchmark = document.getElementById(panel.getAttribute('aria-labelledby')).textContent;
    control.innerHTML = `<span>Full results on ${benchmark}</span><svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h12"/><path class="simulation-details-plus" d="M9 3v12"/></svg>`;
    const caption = source.querySelector(':scope > figcaption');
    if (caption) {
      control.querySelector('span').id = caption.id;
      caption.remove();
    }
    details.append(control);
    source.before(summary, details);
    details.append(source);
  };

  document.querySelectorAll('#results .paper-benchmark-panel').forEach(summarize);
  const successResize = new ResizeObserver(entries => {
    entries.forEach(entry => alignSuccessChart(entry.target.querySelector('.simulation-success-chart')));
  });
  document.querySelectorAll('#results .simulation-model-body').forEach(body => successResize.observe(body));

  const choose = selected => {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
    document.querySelectorAll('#results .paper-benchmark-panel:not([hidden]) .simulation-success-chart').forEach(alignSuccessChart);
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus();
      choose(tabs[next]);
    });
  });

  // Existing links to a full table still open the correct benchmark and details.
  const revealLinkedResult = () => {
    const target = document.getElementById(location.hash.slice(1));
    const panel = target?.closest('#results .paper-benchmark-panel');
    if (!panel) return;
    choose(tabs.find(tab => tab.getAttribute('aria-controls') === panel.id));
    const details = target.closest('.simulation-full-results');
    if (details) details.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  };
  window.addEventListener('hashchange', revealLinkedResult);
  revealLinkedResult();
})();
