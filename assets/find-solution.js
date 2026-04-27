/* Find Your Solution — multi-step wizard modal.
   Self-contained: opens via [data-trigger="find-solution"] or
   [data-i18n="spa_cta_book_visit"] (the existing About-section button).
   Loads its own copy of the active locale dictionary so it works
   even before assets/i18n.js finishes hydrating SPA content. */
(function () {
  'use strict';

  const WHATSAPP_NUMBER = '212654132112';
  const AVAILABLE_LANGS = ['en', 'fr', 'ar'];
  const DEFAULT_LANG = 'en';

  // ---------- Language detection (mirrors assets/i18n.js logic) ----------
  function detectLang() {
    try {
      const parts = (location.pathname || '/').split('/').filter(Boolean);
      if (parts.length) {
        const first = parts[0].toLowerCase();
        if (AVAILABLE_LANGS.includes(first)) return first;
      }
    } catch (e) {}
    try {
      const p = location.pathname || '/';
      if (p === '/' || p === '') return DEFAULT_LANG;
    } catch (e) {}
    try {
      const stored = localStorage.getItem('site_lang');
      if (stored && AVAILABLE_LANGS.includes(stored)) return stored;
    } catch (e) {}
    return DEFAULT_LANG;
  }

  // ---------- Locale loader (independent cache) ----------
  const localeCache = {};
  function loadLocale(lang) {
    if (localeCache[lang]) return localeCache[lang];
    const candidates = [
      '/assets/locales/' + lang + '.json',
      'assets/locales/' + lang + '.json',
      './assets/locales/' + lang + '.json',
      '../assets/locales/' + lang + '.json'
    ];
    const promise = (async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: 'force-cache' });
          if (res && res.ok) return await res.json();
        } catch (e) {}
      }
      return {};
    })();
    localeCache[lang] = promise;
    return promise;
  }

  // ---------- Translation helper ----------
  let dict = {};
  function t(key, fallback) {
    const v = dict[key];
    if (typeof v === 'string' && v.length) return v;
    return fallback != null ? fallback : key;
  }

  // ---------- State ----------
  function freshState() {
    return {
      buildingType: null,        // string
      services: [],              // ['smart_home','electrical','cameras','network']
      smartHome: [],             // sub-controls
      electrical: null,          // single select
      cameras: [],               // sub-equipment
      cameraCount: null,         // '1-2' | '3-5' | '6+'
      network: [],               // sub-issues
      networkOther: '',          // free text
      projectStage: null,        // single select
      city: '',
      name: '',
      budget: null
    };
  }
  let state = freshState();
  let stepSequence = [];
  let currentIndex = 0;
  let modalEl = null;
  let lang = DEFAULT_LANG;

  // ---------- Configuration ----------
  const BUILDING_TYPES = [
    { id: 'villa',      icon: '🏡', label: 'wizard_b_villa' },
    { id: 'apartment',  icon: '🏢', label: 'wizard_b_apartment' },
    { id: 'shop',       icon: '🏬', label: 'wizard_b_shop' },
    { id: 'office',     icon: '🏤', label: 'wizard_b_office' },
    { id: 'restaurant', icon: '🍽️', label: 'wizard_b_restaurant' },
    { id: 'farm',       icon: '🌾', label: 'wizard_b_farm' },
    { id: 'other',      icon: '🏗️', label: 'wizard_b_other' }
  ];

  const SERVICES = [
    { id: 'smart_home', icon: '🏠', label: 'wizard_s_smart_home' },
    { id: 'electrical', icon: '⚡', label: 'wizard_s_electrical' },
    { id: 'cameras',    icon: '📹', label: 'wizard_s_cameras' },
    { id: 'network',    icon: '📡', label: 'wizard_s_network' }
  ];

  const SMART_HOME_OPTS = [
    { id: 'lighting', icon: '💡', label: 'wizard_sh_lighting' },
    { id: 'climate',  icon: '🌡️', label: 'wizard_sh_climate' },
    { id: 'curtains', icon: '🪟', label: 'wizard_sh_curtains' },
    { id: 'audio',    icon: '🔊', label: 'wizard_sh_audio' },
    { id: 'scenes',   icon: '🎬', label: 'wizard_sh_scenes' },
    { id: 'voice',    icon: '🗣️', label: 'wizard_sh_voice' }
  ];

  const ELECTRICAL_OPTS = [
    { id: 'new_install',    icon: '🔌', label: 'wizard_e_new_install' },
    { id: 'full_renovation',icon: '🛠️', label: 'wizard_e_full_renov' },
    { id: 'partial_renovation', icon: '🔧', label: 'wizard_e_partial_renov' },
    { id: 'repair',         icon: '🛟', label: 'wizard_e_repair' },
    { id: 'panel',          icon: '⚡', label: 'wizard_e_panel' }
  ];

  const CAMERA_OPTS = [
    { id: 'indoor',   icon: '📹', label: 'wizard_c_indoor' },
    { id: 'outdoor',  icon: '🏠', label: 'wizard_c_outdoor' },
    { id: 'doorbell', icon: '🔔', label: 'wizard_c_doorbell' },
    { id: 'lock',     icon: '🔒', label: 'wizard_c_lock' },
    { id: 'alarm',    icon: '🚨', label: 'wizard_c_alarm' }
  ];

  const CAMERA_COUNTS = [
    { id: '1-2', icon: '🟢', label: 'wizard_cc_few' },
    { id: '3-5', icon: '🟡', label: 'wizard_cc_medium' },
    { id: '6+',  icon: '🔴', label: 'wizard_cc_many' }
  ];

  const NETWORK_OPTS = [
    { id: 'weak_signal', icon: '📶', label: 'wizard_n_weak' },
    { id: 'dead_zones',  icon: '📵', label: 'wizard_n_dead_zones' },
    { id: 'slow',        icon: '🐌', label: 'wizard_n_slow' },
    { id: 'new_setup',   icon: '🆕', label: 'wizard_n_new_setup' },
    { id: 'other',       icon: '❓', label: 'wizard_n_other' }
  ];

  const PROJECT_STAGES = [
    { id: 'building',   icon: '🏗️', label: 'wizard_st_building' },
    { id: 'renovating', icon: '🔨', label: 'wizard_st_renovating' },
    { id: 'completed',  icon: '✅', label: 'wizard_st_completed' },
    { id: 'planning',   icon: '📅', label: 'wizard_st_planning' }
  ];

  const BUDGET_OPTS = [
    { id: 'under_5k',  label: 'wizard_bg_under_5k' },
    { id: '5_15k',     label: 'wizard_bg_5_15k' },
    { id: '15_50k',    label: 'wizard_bg_15_50k' },
    { id: '50_100k',   label: 'wizard_bg_50_100k' },
    { id: '100_250k',  label: 'wizard_bg_100_250k' },
    { id: 'over_250k', label: 'wizard_bg_over_250k' },
    { id: 'discuss',   label: 'wizard_bg_discuss' }
  ];

  // ---------- Logic helpers ----------
  function shouldShowBudget() {
    if (state.electrical === 'new_install' || state.electrical === 'full_renovation') return true;
    if (state.services.includes('smart_home') && state.smartHome.length > 0) return true;
    if (state.network.includes('new_setup')) return true;
    return false;
  }

  function buildStepSequence() {
    const steps = ['building', 'services'];
    if (state.services.includes('smart_home')) steps.push('smart_home');
    if (state.services.includes('electrical')) steps.push('electrical');
    if (state.services.includes('cameras')) steps.push('cameras');
    if (state.services.includes('network')) steps.push('network');
    steps.push('details', 'summary');
    return steps;
  }

  function getOptionById(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function labelsFor(list, ids) {
    return ids.map(function (id) {
      const o = getOptionById(list, id);
      return o ? t(o.label, o.id) : id;
    });
  }

  // ---------- DOM helpers ----------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'on') {
          for (const ev in attrs[k]) node.addEventListener(ev, attrs[k][ev]);
        } else if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(node.style, attrs[k]);
        } else if (k in node && typeof attrs[k] !== 'string') {
          node[k] = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children != null) {
      const arr = Array.isArray(children) ? children : [children];
      for (const c of arr) {
        if (c == null) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  // ---------- Renderers ----------
  function renderOptionGrid(list, opts) {
    opts = opts || {};
    const multi = !!opts.multi;
    const isSelected = opts.isSelected || function () { return false; };
    const onPick = opts.onPick || function () {};
    const layout = opts.layout || 'grid'; // 'grid' | 'list'
    const wrap = el('div', {
      class: layout === 'list' ? 'fs-options fs-options-list' : 'fs-options'
    });
    list.forEach(function (item) {
      const sel = !!isSelected(item.id);
      const btn = el('button', {
        type: 'button',
        class: 'fs-option' + (sel ? ' fs-selected' : ''),
        'data-id': item.id,
        'aria-pressed': sel ? 'true' : 'false',
        on: {
          click: function () { onPick(item.id); }
        }
      }, [
        item.icon ? el('span', { class: 'fs-option-icon', 'aria-hidden': 'true' }, item.icon) : null,
        el('span', { class: 'fs-option-label' }, t(item.label, item.id))
      ]);
      wrap.appendChild(btn);
    });
    multi; // (kept for clarity; selection logic in onPick)
    return wrap;
  }

  function setError(body, message) {
    const old = body.querySelector('.fs-error');
    if (old) old.remove();
    if (!message) return;
    const e = el('div', { class: 'fs-error fs-error-visible' }, message);
    body.appendChild(e);
  }

  // In-place update of option buttons' selected state — avoids re-rendering
  // the whole step (and replaying its fsFadeIn animation) on every click.
  function updateOptionStates(grid, isSelected) {
    if (!grid) return;
    const btns = grid.querySelectorAll('.fs-option');
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const id = btn.getAttribute('data-id');
      const sel = !!isSelected(id);
      btn.classList.toggle('fs-selected', sel);
      btn.setAttribute('aria-pressed', sel ? 'true' : 'false');
    }
  }

  function renderStep(stepKey, body) {
    body.innerHTML = '';
    const wrap = el('div', { class: 'fs-step-fade' });
    body.appendChild(wrap);

    if (stepKey === 'building') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_building', 'What type of building is this for?')));
      const grid = renderOptionGrid(BUILDING_TYPES, {
        isSelected: function (id) { return state.buildingType === id; },
        onPick: function (id) {
          state.buildingType = id;
          updateOptionStates(grid, function (x) { return state.buildingType === x; });
          updateFooter();
        }
      });
      wrap.appendChild(grid);
      return;
    }

    if (stepKey === 'services') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_services', 'Which services do you need?')));
      wrap.appendChild(el('p', { class: 'fs-question-hint' }, t('wizard_q_services_hint', 'Select all that apply')));
      const grid = renderOptionGrid(SERVICES, {
        multi: true,
        isSelected: function (id) { return state.services.includes(id); },
        onPick: function (id) {
          const i = state.services.indexOf(id);
          if (i >= 0) state.services.splice(i, 1);
          else state.services.push(id);
          updateOptionStates(grid, function (x) { return state.services.includes(x); });
          updateFooter();
        }
      });
      wrap.appendChild(grid);
      return;
    }

    if (stepKey === 'smart_home') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_smart_home', 'What would you like to control?')));
      wrap.appendChild(el('p', { class: 'fs-question-hint' }, t('wizard_q_services_hint', 'Select all that apply')));
      const grid = renderOptionGrid(SMART_HOME_OPTS, {
        multi: true,
        isSelected: function (id) { return state.smartHome.includes(id); },
        onPick: function (id) {
          const i = state.smartHome.indexOf(id);
          if (i >= 0) state.smartHome.splice(i, 1);
          else state.smartHome.push(id);
          updateOptionStates(grid, function (x) { return state.smartHome.includes(x); });
          updateFooter();
        }
      });
      wrap.appendChild(grid);
      return;
    }

    if (stepKey === 'electrical') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_electrical', 'What type of electrical work?')));
      const grid = renderOptionGrid(ELECTRICAL_OPTS, {
        layout: 'list',
        isSelected: function (id) { return state.electrical === id; },
        onPick: function (id) {
          state.electrical = id;
          updateOptionStates(grid, function (x) { return state.electrical === x; });
          updateFooter();
        }
      });
      wrap.appendChild(grid);
      return;
    }

    if (stepKey === 'cameras') {
      // Section 1 — equipment
      const s1 = el('div', { class: 'fs-section' });
      s1.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_cameras', 'What do you need?')));
      s1.appendChild(el('p', { class: 'fs-question-hint' }, t('wizard_q_services_hint', 'Select all that apply')));

      // The count section is conditionally inserted/removed in-place when
      // the user picks/unpicks the first camera type — never re-rendering
      // the equipment grid above (which would replay the fade animation).
      let countSection = null;
      function buildCountSection() {
        const s2 = el('div', { class: 'fs-section' });
        s2.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_camera_count', 'Approximate number of cameras')));
        const countGrid = renderOptionGrid(CAMERA_COUNTS, {
          isSelected: function (id) { return state.cameraCount === id; },
          onPick: function (id) {
            state.cameraCount = id;
            updateOptionStates(countGrid, function (x) { return state.cameraCount === x; });
            updateFooter();
          }
        });
        s2.appendChild(countGrid);
        return s2;
      }
      function syncCountSection() {
        if (state.cameras.length && !countSection) {
          countSection = buildCountSection();
          wrap.appendChild(countSection);
        } else if (!state.cameras.length && countSection) {
          countSection.remove();
          countSection = null;
        }
      }

      const camGrid = renderOptionGrid(CAMERA_OPTS, {
        multi: true,
        isSelected: function (id) { return state.cameras.includes(id); },
        onPick: function (id) {
          const i = state.cameras.indexOf(id);
          if (i >= 0) state.cameras.splice(i, 1);
          else state.cameras.push(id);
          updateOptionStates(camGrid, function (x) { return state.cameras.includes(x); });
          syncCountSection();
          updateFooter();
        }
      });
      s1.appendChild(camGrid);
      wrap.appendChild(s1);

      // Initial mount: show count section if returning to step with selections
      syncCountSection();
      return;
    }

    if (stepKey === 'network') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_network', "What's the issue?")));
      wrap.appendChild(el('p', { class: 'fs-question-hint' }, t('wizard_q_services_hint', 'Select all that apply')));

      // The "Other" free-text block is inserted/removed in-place whenever
      // the user picks/unpicks the "other" chip — without re-rendering the
      // chips grid above.
      let otherBlock = null;
      function buildOtherBlock() {
        const block = el('div', { class: 'fs-section' });
        block.appendChild(el('label', {
          class: 'fs-input-label',
          for: 'fs-network-other'
        }, [
          t('wizard_n_other_label', 'Tell us briefly...'),
          el('span', { class: 'fs-input-optional' }, t('wizard_optional', '(optional)'))
        ]));
        block.appendChild(el('input', {
          id: 'fs-network-other',
          type: 'text',
          class: 'fs-input',
          value: state.networkOther,
          on: { input: function (e) { state.networkOther = e.target.value; } }
        }));
        return block;
      }
      function syncOtherBlock() {
        const want = state.network.includes('other');
        if (want && !otherBlock) {
          otherBlock = buildOtherBlock();
          wrap.appendChild(otherBlock);
        } else if (!want && otherBlock) {
          otherBlock.remove();
          otherBlock = null;
        }
      }

      const grid = renderOptionGrid(NETWORK_OPTS, {
        multi: true,
        isSelected: function (id) { return state.network.includes(id); },
        onPick: function (id) {
          const i = state.network.indexOf(id);
          if (i >= 0) state.network.splice(i, 1);
          else state.network.push(id);
          updateOptionStates(grid, function (x) { return state.network.includes(x); });
          syncOtherBlock();
          updateFooter();
        }
      });
      wrap.appendChild(grid);

      syncOtherBlock();
      return;
    }

    if (stepKey === 'details') {
      // Stage (required)
      const s1 = el('div', { class: 'fs-section' });
      s1.appendChild(el('h3', { class: 'fs-question' }, t('wizard_q_stage', 'Project stage')));
      const stageGrid = renderOptionGrid(PROJECT_STAGES, {
        isSelected: function (id) { return state.projectStage === id; },
        onPick: function (id) {
          state.projectStage = id;
          updateOptionStates(stageGrid, function (x) { return state.projectStage === x; });
          updateFooter();
        }
      });
      s1.appendChild(stageGrid);
      wrap.appendChild(s1);

      // City (optional)
      const s2 = el('div', { class: 'fs-section' });
      s2.appendChild(el('label', {
        class: 'fs-input-label', for: 'fs-city'
      }, [
        t('wizard_q_city', 'City'),
        el('span', { class: 'fs-input-optional' }, t('wizard_optional', '(optional)'))
      ]));
      s2.appendChild(el('input', {
        id: 'fs-city', type: 'text', class: 'fs-input',
        placeholder: t('wizard_q_city_ph', 'e.g. Casablanca, Rabat, Marrakech...'),
        value: state.city,
        on: { input: function (e) { state.city = e.target.value; } }
      }));
      wrap.appendChild(s2);

      // Name (optional)
      const s3 = el('div', { class: 'fs-section' });
      s3.appendChild(el('label', {
        class: 'fs-input-label', for: 'fs-name'
      }, [
        t('wizard_q_name', 'Your name'),
        el('span', { class: 'fs-input-optional' }, t('wizard_optional', '(optional)'))
      ]));
      s3.appendChild(el('input', {
        id: 'fs-name', type: 'text', class: 'fs-input',
        placeholder: t('wizard_q_name_ph', 'How should we address you?'),
        value: state.name,
        on: { input: function (e) { state.name = e.target.value; } }
      }));
      wrap.appendChild(s3);

      // Budget (conditional, optional)
      if (shouldShowBudget()) {
        const s4 = el('div', { class: 'fs-section' });
        s4.appendChild(el('h3', { class: 'fs-question' }, [
          t('wizard_q_budget', 'Approximate budget'),
          el('span', { class: 'fs-input-optional' }, ' ' + t('wizard_optional', '(optional)'))
        ]));
        const budgetGrid = renderOptionGrid(BUDGET_OPTS, {
          layout: 'list',
          isSelected: function (id) { return state.budget === id; },
          onPick: function (id) {
            state.budget = (state.budget === id) ? null : id;
            updateOptionStates(budgetGrid, function (x) { return state.budget === x; });
            updateFooter();
          }
        });
        s4.appendChild(budgetGrid);
        wrap.appendChild(s4);
      }
      return;
    }

    if (stepKey === 'summary') {
      wrap.appendChild(el('h3', { class: 'fs-question' }, t('wizard_summary_title', 'Your Selection')));
      wrap.appendChild(el('p', { class: 'fs-question-hint' }, t('wizard_summary_lead', 'Review your choices, then send your inquiry to our team.')));
      wrap.appendChild(renderSummary());
      const cta = el('div', { class: 'fs-summary-cta' });
      cta.appendChild(el('p', { class: 'fs-summary-cta-lead' }, t('wizard_summary_cta_lead', 'Tap below to share your project details with us on WhatsApp.')));
      const waBtn = el('a', {
        class: 'fs-btn fs-btn-whatsapp',
        href: buildWhatsAppHref(),
        target: '_blank',
        rel: 'noopener noreferrer',
        on: {
          click: function () {
            // analytics opportunity: window.gtag && gtag('event','wizard_submit')
          }
        }
      }, [
        el('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.87c0 2.09.55 4.12 1.59 5.92L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.43h.01c6.54 0 11.86-5.32 11.86-11.87 0-3.17-1.23-6.15-3.39-8.4zM12.04 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.8 1 1.02-3.7-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.44 4.43-9.87 9.87-9.87 2.64 0 5.11 1.03 6.97 2.9a9.79 9.79 0 0 1 2.89 6.98c0 5.44-4.43 9.87-9.87 9.87zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.08 1.76-.72 2.01-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>' }),
        el('span', null, t('wizard_send_whatsapp', 'Send via WhatsApp'))
      ]);
      cta.appendChild(waBtn);
      wrap.appendChild(cta);
      return;
    }
  }

  function renderSummary() {
    const list = el('ul', { class: 'fs-summary-list' });

    function addRow(icon, label, value) {
      if (!value) return;
      list.appendChild(el('li', { class: 'fs-summary-item' }, [
        el('span', { class: 'fs-summary-icon', 'aria-hidden': 'true' }, icon),
        el('div', { class: 'fs-summary-text' }, [
          el('div', { class: 'fs-summary-label' }, label),
          el('div', { class: 'fs-summary-value' }, value)
        ])
      ]));
    }

    if (state.buildingType) {
      const bt = getOptionById(BUILDING_TYPES, state.buildingType);
      addRow(bt ? bt.icon : '🏠', t('wizard_summary_building', 'Building Type'), bt ? t(bt.label, bt.id) : state.buildingType);
    }
    if (state.services.length) {
      addRow('🛠️', t('wizard_summary_services', 'Services'), labelsFor(SERVICES, state.services).join(' • '));
    }
    if (state.smartHome.length) {
      addRow('🏠', t('wizard_summary_smart_home', 'Smart Home Controls'), labelsFor(SMART_HOME_OPTS, state.smartHome).join(' • '));
    }
    if (state.electrical) {
      const e = getOptionById(ELECTRICAL_OPTS, state.electrical);
      addRow('⚡', t('wizard_summary_electrical', 'Electrical Work'), e ? t(e.label, e.id) : state.electrical);
    }
    if (state.cameras.length) {
      addRow('📹', t('wizard_summary_cameras', 'Security Setup'), labelsFor(CAMERA_OPTS, state.cameras).join(' • '));
    }
    if (state.cameraCount) {
      const cc = getOptionById(CAMERA_COUNTS, state.cameraCount);
      addRow('🔢', t('wizard_summary_camera_count', 'Number of Cameras'), cc ? t(cc.label, cc.id) : state.cameraCount);
    }
    if (state.network.length) {
      const labels = labelsFor(NETWORK_OPTS, state.network);
      let value = labels.join(' • ');
      if (state.network.includes('other') && state.networkOther.trim()) {
        value += ' — "' + state.networkOther.trim() + '"';
      }
      addRow('📡', t('wizard_summary_network', 'Network Issue'), value);
    }
    if (state.projectStage) {
      const s = getOptionById(PROJECT_STAGES, state.projectStage);
      addRow(s ? s.icon : '🏗️', t('wizard_summary_stage', 'Project Stage'), s ? t(s.label, s.id) : state.projectStage);
    }
    if (state.city.trim()) {
      addRow('📍', t('wizard_summary_city', 'City'), state.city.trim());
    }
    if (state.name.trim()) {
      addRow('👤', t('wizard_summary_name', 'Name'), state.name.trim());
    }
    if (state.budget) {
      const b = getOptionById(BUDGET_OPTS, state.budget);
      addRow('💰', t('wizard_summary_budget', 'Budget'), b ? t(b.label, b.id) : state.budget);
    }
    return list;
  }

  // ---------- WhatsApp message ----------
  function buildWhatsAppHref() {
    const lines = [];
    const greeting = state.name.trim()
      ? t('wizard_msg_greet_named', "Hello! My name is {name}.").replace('{name}', state.name.trim())
      : t('wizard_msg_greet', 'Hello!');
    lines.push(greeting);
    lines.push(t('wizard_msg_intro', 'I am interested in a project with the following details:'));
    lines.push('');

    function pushRow(icon, label, value) {
      if (!value) return;
      lines.push(icon + ' ' + label + ': ' + value);
    }

    if (state.buildingType) {
      const bt = getOptionById(BUILDING_TYPES, state.buildingType);
      pushRow(bt ? bt.icon : '🏠', t('wizard_summary_building', 'Building'), bt ? t(bt.label, bt.id) : state.buildingType);
    }
    if (state.services.length) {
      pushRow('🛠️', t('wizard_summary_services', 'Services'), labelsFor(SERVICES, state.services).join(', '));
    }
    if (state.smartHome.length) {
      pushRow('🏠', t('wizard_summary_smart_home', 'Smart Home'), labelsFor(SMART_HOME_OPTS, state.smartHome).join(', '));
    }
    if (state.electrical) {
      const e = getOptionById(ELECTRICAL_OPTS, state.electrical);
      pushRow('⚡', t('wizard_summary_electrical', 'Electrical'), e ? t(e.label, e.id) : state.electrical);
    }
    if (state.cameras.length) {
      let v = labelsFor(CAMERA_OPTS, state.cameras).join(', ');
      if (state.cameraCount) {
        const cc = getOptionById(CAMERA_COUNTS, state.cameraCount);
        v += ' (' + (cc ? t(cc.label, cc.id) : state.cameraCount) + ')';
      }
      pushRow('📹', t('wizard_summary_cameras', 'Security'), v);
    }
    if (state.network.length) {
      let v = labelsFor(NETWORK_OPTS, state.network).join(', ');
      if (state.network.includes('other') && state.networkOther.trim()) {
        v += ' — "' + state.networkOther.trim() + '"';
      }
      pushRow('📡', t('wizard_summary_network', 'Network'), v);
    }
    if (state.projectStage) {
      const s = getOptionById(PROJECT_STAGES, state.projectStage);
      pushRow(s ? s.icon : '🏗️', t('wizard_summary_stage', 'Stage'), s ? t(s.label, s.id) : state.projectStage);
    }
    if (state.city.trim()) {
      pushRow('📍', t('wizard_summary_city', 'City'), state.city.trim());
    }
    if (state.budget) {
      const b = getOptionById(BUDGET_OPTS, state.budget);
      pushRow('💰', t('wizard_summary_budget', 'Budget'), b ? t(b.label, b.id) : state.budget);
    }

    lines.push('');
    lines.push(t('wizard_msg_outro', 'Please contact me to discuss the details. Thank you!'));

    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
  }

  // ---------- Validation per step ----------
  function isCurrentStepValid() {
    const key = stepSequence[currentIndex];
    switch (key) {
      case 'building':   return !!state.buildingType;
      case 'services':   return state.services.length > 0;
      case 'smart_home': return state.smartHome.length > 0;
      case 'electrical': return !!state.electrical;
      case 'cameras':    return state.cameras.length > 0 && !!state.cameraCount;
      case 'network':    return state.network.length > 0;
      case 'details':    return !!state.projectStage;
      case 'summary':    return true;
      default:           return true;
    }
  }

  // ---------- Footer / progress / nav ----------
  function updateProgress() {
    const total = stepSequence.length;
    const cur = currentIndex + 1;
    const pct = Math.round((cur / total) * 100);
    const bar = modalEl.querySelector('.fs-progress-bar');
    const text = modalEl.querySelector('.fs-progress-text');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = t('wizard_step', 'Step {n} of {total}')
      .replace('{n}', String(cur))
      .replace('{total}', String(total));
  }

  function updateFooter() {
    const back = modalEl.querySelector('.fs-back');
    const next = modalEl.querySelector('.fs-next');
    const isFirst = currentIndex === 0;
    const isSummary = stepSequence[currentIndex] === 'summary';
    const isLastQuestion = currentIndex === stepSequence.length - 2; // last before summary
    back.style.visibility = isFirst ? 'hidden' : 'visible';
    if (isSummary) {
      // On summary the WhatsApp button replaces "next"
      next.style.display = 'none';
    } else {
      next.style.display = '';
      next.textContent = isLastQuestion
        ? t('wizard_finish', 'Show Recommendation')
        : t('wizard_next', 'Next');
      const valid = isCurrentStepValid();
      next.setAttribute('aria-disabled', valid ? 'false' : 'true');
      if (valid) next.removeAttribute('disabled'); else next.setAttribute('disabled', 'disabled');
    }
    updateProgress();
  }

  function goNext() {
    if (!isCurrentStepValid()) {
      const body = modalEl.querySelector('.fs-body');
      setError(body, t('wizard_required_msg', 'Please make a selection to continue'));
      return;
    }
    // Recompute sequence in case services changed in step 2
    const newSeq = buildStepSequence();
    // Find next step: keep steps consistent with current state
    if (currentIndex < newSeq.length - 1) {
      stepSequence = newSeq;
      currentIndex = currentIndex + 1;
      // Safety: ensure new currentIndex still corresponds to a relevant step
      if (currentIndex >= stepSequence.length) currentIndex = stepSequence.length - 1;
      renderStep(stepSequence[currentIndex], modalEl.querySelector('.fs-body'));
      updateFooter();
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      stepSequence = buildStepSequence();
      if (currentIndex >= stepSequence.length) currentIndex = stepSequence.length - 1;
      renderStep(stepSequence[currentIndex], modalEl.querySelector('.fs-body'));
      updateFooter();
    }
  }

  // ---------- Mount / open / close ----------
  function buildModal() {
    const root = el('div', {
      // id used as a sentinel so i18n.js's text-replacement TreeWalker
      // skips the wizard subtree (it would otherwise revert our updated
      // step text back to the value cached in dataset.i18nOrigText).
      id: 'fs-modal-root',
      class: 'fs-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'fs-title'
    });
    root.appendChild(el('div', {
      class: 'fs-modal-backdrop',
      on: { click: close }
    }));
    const panel = el('div', { class: 'fs-modal-panel' });
    panel.appendChild(el('button', {
      type: 'button',
      class: 'fs-close',
      'aria-label': t('wizard_close', 'Close'),
      on: { click: close }
    }, '×'));
    // Progress bar/text are populated by updateFooter() — which always runs
    // synchronously after buildModal() and before the modal becomes visible
    // (fs-visible is added inside requestAnimationFrame). No pre-fill needed.
    const header = el('header', { class: 'fs-header' }, [
      el('h2', { id: 'fs-title', class: 'fs-title' }, t('wizard_title', 'Find Your Perfect Solution')),
      el('p', { class: 'fs-subtitle' }, t('wizard_subtitle', 'A few quick questions to design the right system for you.')),
      el('div', { class: 'fs-progress' }, [
        el('div', { class: 'fs-progress-track' }, el('div', { class: 'fs-progress-bar' })),
        el('span', { class: 'fs-progress-text' }, '')
      ])
    ]);
    panel.appendChild(header);
    panel.appendChild(el('div', { class: 'fs-body' }));
    panel.appendChild(el('footer', { class: 'fs-footer' }, [
      el('button', {
        type: 'button', class: 'fs-btn fs-btn-secondary fs-back',
        on: { click: goBack }
      }, t('wizard_back', 'Back')),
      el('button', {
        type: 'button', class: 'fs-btn fs-btn-primary fs-next',
        on: { click: goNext }
      }, t('wizard_next', 'Next'))
    ]));
    root.appendChild(panel);
    document.body.appendChild(root);
    return root;
  }

  async function open() {
    // Synchronously remove ANY existing wizard modal (including ones still
    // playing their close-fade animation) so a quick close→reopen never
    // shows stale step text or content from the previous session.
    document.querySelectorAll('.fs-modal').forEach(function (n) { n.remove(); });
    modalEl = null;

    lang = detectLang();
    dict = await loadLocale(lang);

    state = freshState();
    stepSequence = buildStepSequence();
    currentIndex = 0;
    modalEl = buildModal();
    // Match document direction for RTL behavior of CSS logical props
    modalEl.setAttribute('dir', document.documentElement.getAttribute('dir') || (lang === 'ar' ? 'rtl' : 'ltr'));
    renderStep(stepSequence[currentIndex], modalEl.querySelector('.fs-body'));
    updateFooter();
    // Force a repaint so CSS transitions kick in
    requestAnimationFrame(function () {
      document.body.classList.add('fs-open');
      modalEl.classList.add('fs-visible');
    });
    // Focus first focusable element after opening
    setTimeout(function () {
      const first = modalEl.querySelector('.fs-option, .fs-input');
      if (first) first.focus({ preventScroll: true });
    }, 250);
  }

  function close() {
    if (!modalEl) return;
    modalEl.classList.remove('fs-visible');
    document.body.classList.remove('fs-open');
    setTimeout(function () {
      if (modalEl) { modalEl.remove(); modalEl = null; }
    }, 280);
  }

  // ---------- Trigger handling ----------
  // Click delegation lives in the inline bootstrap script in each HTML
  // template — that script registers during HTML parsing (before this defer
  // script executes), so a quick click on the "Book a Free Consultation"
  // button right after page load is captured even if find-solution.js has
  // not finished loading yet. The bootstrap retries until window.FindSolution
  // is available, then calls FindSolution.open().

  // Escape closes modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalEl && modalEl.classList.contains('fs-visible')) close();
  });

  // Public API
  window.FindSolution = { open: open, close: close };
})();
