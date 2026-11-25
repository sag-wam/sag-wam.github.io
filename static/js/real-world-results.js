(() => {
  const chart = document.querySelector('#demo-latency-chart');
  if (!chart) return;
  const panels = [...chart.querySelectorAll('[data-chart-benchmark]')];
  const tabs = [...document.querySelectorAll('[data-latency-benchmark]')];

  const chooseBenchmark = key => {
    const next = panels.find(panel => panel.dataset.chartBenchmark === key);
    if (!next) return;
    panels.forEach(panel => { panel.hidden = panel !== next; });
    tabs.forEach(tab => {
      const selected = tab.dataset.latencyBenchmark === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    chart.setAttribute('aria-label', `${next.dataset.chartTitle}. Inference latency comparison.`);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseBenchmark(tab.dataset.latencyBenchmark));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      chooseBenchmark(tabs[next].dataset.latencyBenchmark);
    });
  });

})();
