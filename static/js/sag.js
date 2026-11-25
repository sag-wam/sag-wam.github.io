(() => {
  const topbar = document.querySelector('.topbar');
  const menu = document.querySelector('.nav-toggle');
  const closeMenu = () => {
    topbar.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    topbar.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!topbar.contains(event.target)) closeMenu();
  });
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  navLinks.forEach(link => link.addEventListener('click', closeMenu));
  const updateTopbar = () => topbar.classList.toggle('scrolled', window.scrollY > 32);
  window.addEventListener('scroll', updateTopbar, { passive: true });
  updateTopbar();
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -60% 0px' });
  document.querySelectorAll('main section[id]').forEach(section => navObserver.observe(section));

  const heroVideo = document.querySelector('#hero-video');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let backgroundAllowed = !reducedMotion.matches && !navigator.connection?.saveData;
  let heroVisible = true;
  const updateBackground = () => {
    if (backgroundAllowed && heroVisible && !document.hidden) heroVideo.play().catch(() => {});
    else heroVideo.pause();
  };
  reducedMotion.addEventListener('change', () => {
    backgroundAllowed = !reducedMotion.matches && !navigator.connection?.saveData;
    updateBackground();
  });
  new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    updateBackground();
  }, { threshold: .05 }).observe(document.querySelector('.publication-header'));
  document.addEventListener('visibilitychange', updateBackground);

  const tasks = {
    banana: { title: 'Banana pick-and-place' },
    blocks: { title: 'Block stacking' },
    drawer: { title: 'Toy storage' },
    shuttlecocks: { title: 'Shuttlecock stacking' }
  };
  const video = document.querySelector('#task-video');
  const tabs = [...document.querySelectorAll('[data-task]')];
  const panel = document.querySelector('#task-panel');
  const videoError = document.querySelector('#task-video-error');
  let taskVisible = false;
  let taskPlayingBeforeHide = false;
  const updateTaskPlayback = () => {
    if (taskVisible && !document.hidden) video.play().catch(() => {});
    else video.pause();
  };
  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
    if (visible === taskVisible) return;
    taskVisible = visible;
    updateTaskPlayback();
  }, { threshold: [0, .35], rootMargin: '-64px 0px 0px' }).observe(video);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      taskPlayingBeforeHide = !video.paused;
      video.pause();
    } else if (taskPlayingBeforeHide) {
      updateTaskPlayback();
    }
  });
  let selected = 'banana';
  const chooseTask = (button) => {
    const key = button.dataset.task;
    if (selected === key) return;
    video.pause();
    selected = key;
    tabs.forEach(tab => {
      const active = tab === button;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', button.id);
    video.poster = `static/images/${key}-poster.jpg`;
    video.src = `static/videos/${key}.mp4`;
    video.setAttribute('aria-label', `${tasks[key].title}: Base, SAG-Residual, and SAG-Coupling, shown at original speed`);
    videoError.hidden = true;
    video.load();
    updateTaskPlayback();
    document.dispatchEvent(new CustomEvent('sag:task-change', { detail: { task: key } }));
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseTask(tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      chooseTask(tabs[next]);
    });
  });
  video.addEventListener('error', () => {
    videoError.hidden = false;
  });
  const dialog = document.querySelector('#figure-dialog');
  let activeFigure = null;
  const figureSource = link => document.documentElement.dataset.theme === 'dark' && link.dataset.imageDark
    ? link.dataset.imageDark : link.dataset.image;
  const updateDialogFigure = () => {
    if (!activeFigure) return;
    const image = document.querySelector('#dialog-image');
    image.src = figureSource(activeFigure);
    image.alt = activeFigure.querySelector('img').alt;
    dialog.querySelector('.dialog-image-wrap').classList.toggle('figure-themed', Boolean(activeFigure.dataset.imageDark));
    dialog.setAttribute('aria-label', activeFigure.dataset.title || image.alt || 'Enlarged figure');
  };
  const updateThemedFigures = () => {
    document.querySelectorAll('.figure-zoom[data-image-dark]').forEach(link => { link.href = figureSource(link); });
    if (dialog.open) updateDialogFigure();
  };
  document.addEventListener('sag:theme-change', updateThemedFigures);
  updateThemedFigures();
  dialog.addEventListener('close', () => { activeFigure = null; });
  document.querySelectorAll('.figure-zoom').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      activeFigure = link;
      updateDialogFigure();
      dialog.showModal();
    });
  });
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  document.querySelector('#copy-citation').addEventListener('click', async () => {
    const citation = document.querySelector('#bibtex');
    const status = document.querySelector('#copy-status');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.textContent);
      status.textContent = 'BibTeX copied.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(citation);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'Citation selected. Press Ctrl+C (or Command+C) to copy.';
    }
  });
})();
