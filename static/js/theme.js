/* Apply the saved theme before styles load to avoid a light flash. */
(() => {
  const key = 'sag-color-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'dark' || value === 'light' ? value : null;
  let preference = null;
  try { preference = valid(localStorage.getItem(key)); } catch { /* Storage can be disabled. */ }

  function apply() {
    const theme = preference || (system.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#1b1b1a' : '#ffffff';
    const button = document.getElementById('theme-toggle');
    if (button) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    document.dispatchEvent(new CustomEvent('sag:theme-change', { detail: { theme } }));
  }

  apply();
  if (system.addEventListener) system.addEventListener('change', apply);
  else system.addListener(apply);
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue);
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    button.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch { /* Still switch for this visit. */ }
      apply();
    });
    apply();
    button.hidden = false;
  }, { once: true });
})();
