// Lightweight i18n loader for static parts of the site.
// Behavior:
// - Loads JSON from /assets/locales/{lang}.json
// - Finds elements with data-i18n and replaces textContent
// - For elements with data-i18n-alt replaces alt attribute
// - Persists selection in localStorage key 'site_lang'
// - Sets <html lang> and <html dir> (rtl for 'ar')
// Note: For SPA content rendered inside #root, integrate your app's i18n
(function(){
  const defaultLang = 'en';
  const available = ['en','fr','ar'];
  // Display names of languages in their own language (used in the button label)
  const langNames = { en: 'English', fr: 'Français', ar: 'العربية' };
  // Localized word for "Language" per language
  const langWord = { en: 'Language', fr: 'Langue', ar: 'اللغة' };

  // Update the visible language toggle/button labels consistently
  function updateLanguageButtons(lang){
    try{
      const word = langWord[lang] || 'Language';
      const name = langNames[lang] || (lang.toUpperCase());
      const mobileBtn = document.getElementById('langToggleBtn');
      // helper: measure text width using an offscreen span copying font styles
      function measureTextWidth(text, refEl){
        try{
          const span = document.createElement('span');
          const style = getComputedStyle(refEl);
          // Copy key font properties to ensure accurate width for different fonts/weights
          span.style.fontFamily = style.fontFamily || 'inherit';
          span.style.fontSize = style.fontSize || 'inherit';
          span.style.fontWeight = style.fontWeight || 'normal';
          span.style.fontStyle = style.fontStyle || 'normal';
          span.style.letterSpacing = style.letterSpacing || 'normal';
          span.style.textTransform = style.textTransform || 'none';
          span.style.whiteSpace = 'nowrap';
          span.style.position = 'absolute';
          span.style.left = '-9999px';
          span.style.top = '-9999px';
          span.textContent = text;
          document.body.appendChild(span);
          const w = span.getBoundingClientRect().width;
          document.body.removeChild(span);
          return w;
        }catch(e){ return null; }
      }

      if(mobileBtn){
        try{
          const curW = mobileBtn.getBoundingClientRect().width || 0;
          const newText = `${word}`;
          const newW = measureTextWidth(newText, mobileBtn) || 0;
          // include horizontal padding so the measured width matches visual space
          const cs = getComputedStyle(mobileBtn);
          const padLeft = parseFloat(cs.paddingLeft) || 0;
          const padRight = parseFloat(cs.paddingRight) || 0;
          const extra = padLeft + padRight;
          const desired = Math.ceil(Math.max(curW, newW + extra));
          // only increase minWidth if it's smaller than desired to avoid shrinking flicker
          const curMin = parseFloat(mobileBtn.style.minWidth) || 0;
          if(desired > curMin) mobileBtn.style.minWidth = desired + 'px';
        }catch(e){}
        mobileBtn.textContent = `${word}`;
      }
      const desktopBtn = document.getElementById('langDesktopBtn');
      if(desktopBtn){
        try{
          const curW = desktopBtn.getBoundingClientRect().width || 0;
          const newText = `${word} ▾`;
          const newW = measureTextWidth(newText, desktopBtn) || 0;
          const cs = getComputedStyle(desktopBtn);
          const padLeft = parseFloat(cs.paddingLeft) || 0;
          const padRight = parseFloat(cs.paddingRight) || 0;
          const extra = padLeft + padRight;
          const desired = Math.ceil(Math.max(curW, newW + extra));
          const curMin = parseFloat(desktopBtn.style.minWidth) || 0;
          if(desired > curMin) desktopBtn.style.minWidth = desired + 'px';
        }catch(e){}
        // desktop includes a caret only
        desktopBtn.textContent = `${word} ▾`;
      }
      // also update any selects
      const sel = document.getElementById('langSelect') || document.getElementById('langSelect404') || document.getElementById('langSelectPW');
      if(sel) sel.value = lang;
    }catch(e){}
  }
  function detect(){
    // 1) honor explicit language in the URL path (/ar/ or /fr/)
    try{
      const parts = location.pathname.split('/').filter(Boolean);
      if(parts.length){
        const first = parts[0].toLowerCase();
        if(available.includes(first)) return first;
      }
    }catch(e){}

    // 2) If the user is on the root path, default to English regardless of stored value.
    // This makes the root URL (/) show English while language-prefixed paths show
    // their respective languages.
    try{
      const p = location.pathname || '/';
      if(p === '/' || p === '') return defaultLang;
    }catch(e){}

    // 3) Otherwise, fall back to any persisted selection if present.
    const stored = localStorage.getItem('site_lang');
    if(stored && available.includes(stored)) return stored;

    // 4) final fallback
    return defaultLang;
  }

  async function loadLocale(lang){
    // Try a few fetch path variants so the loader works whether the site
    // is hosted at the site root or under a language subpath (e.g. /ar/).
    const candidates = [
      `/assets/locales/${lang}.json`,
      `assets/locales/${lang}.json`,
      `./assets/locales/${lang}.json`,
      `../assets/locales/${lang}.json`
    ];

    for(const p of candidates){
      try{
        const res = await fetch(p);
        if(res && res.ok){
          try{ return await res.json(); }catch(e){ /* parse error -> continue */ }
        }
      }catch(e){ /* continue to next candidate */ }
    }

    // Fallback to default language if nothing worked
    if(lang !== defaultLang) return loadLocale(defaultLang);
    return {};
  }

  function applyTranslations(dict){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(key && dict[key]) el.textContent = dict[key];
    });
    // alt attributes
    document.querySelectorAll('[data-i18n-alt]').forEach(el=>{
      const key = el.getAttribute('data-i18n-alt');
      if(key && dict[key]) el.setAttribute('alt', dict[key]);
    });
    // aria-label or title replacements if needed
    document.querySelectorAll('[data-i18n-attr]').forEach(el=>{
      // format: data-i18n-attr="attrName:key"
      const spec = el.getAttribute('data-i18n-attr');
      if(!spec) return;
      const parts = spec.split(':');
      if(parts.length===2){
        const [attr,key] = parts;
        if(dict[key]) el.setAttribute(attr, dict[key]);
      }
    });
  }

  // Text replacement map for SPA-rendered strings that don't include data-i18n attributes.
  // Map original English text (exact substring) -> translation key in locale files.
  const textReplacementMap = {
    "Services": "spa_services",
    "Residential Services": "spa_residential_services",
    "Commercial Services": "spa_commercial_services",
  "What services do you offer?": "spa_q_services",
  "Smart solutions for both residential and commercial clients.": "spa_services_lead",
  "Frequently Asked Questions": "spa_faq_title",
  "Complete smart home solutions including installation, setup, and programming of connected devices for seamless control and automation.": "spa_desc_smart_home",
  "Secure your home with smart locks and doorbells featuring remote access, real-time alerts, and expert installation.": "spa_desc_smart_locks",
  "Energy-efficient thermostat installation and programming, including integration with your smart home system.": "spa_desc_thermostat",
  "Custom surveillance setups with motion-activated cameras, mobile access, and expert system configuration.": "spa_desc_security_cameras",
  "Hands-free control with Alexa, Google Assistant, or Siri—fully configured for your home devices and routines.": "spa_desc_voice_integration",
  "Optimized home networks with mesh Wi-Fi and expert placement for fast, stable, and full-home coverage.": "spa_desc_network",
  "Install and automate lighting systems with smart switches, dimmers, and remote controls for personalized ambiance.": "spa_desc_smart_lighting",
  "Integrated control systems for lighting, HVAC, and security to optimize energy usage and enhance operational efficiency.": "spa_desc_commercial_automation",
  "High-performance wireless networks designed for business environments with multiple access points and advanced security features.": "spa_desc_enterprise_wifi",
  "Comprehensive security camera systems with analytics capabilities for retail, office, and industrial environments.": "spa_desc_commercial_surveillance",
  "Professional audio solutions for retail spaces, restaurants, and offices with zoned controls and background music systems.": "spa_desc_commercial_audio",
    "We specialize in smart home automation, Smart Locks setup, Domotique, reverse osmosis water purification, and other low-voltage solutions.": "spa_a_services",
    "Services depends on the service. Domotique starts at $105, and water purification starts at $300. Contact us for a custom quote.": "spa_a_prices",
    "Our team of experts is ready to design a tailored smart home or commercial solution that perfectly fits your needs and budget.": "spa_team",
    "Your Trusted Partner in Smart Home & Security Solutions": "spa_trusted_partner",
    "Smart Home Automation": "spa_smart_home_automation",
    "Complete Smart Home Integration": "spa_complete_integration",
    "Transform your house into an intelligent Smart Home with seamless automation, voice control, and cutting-edge tech that adapts to your lifestyle. Full control, no contracts, no confusion.": "spa_transform_house",
    "Your smart home works together, just like it should. Simple, connected, and always under your command.": "spa_tagline",
    "Contact Us": "spa_contact_us",
    "Previous Work": "spa_previous_work",
    "Contact": "spa_contact",
    "S‑ELECTRICITY Smart Home & Domotique | Morocco": "spa_site_title",
    "Smart home automation & low voltage solutions in Morocco. Upgrade your home for a modern & seamless experience.": "spa_intro"
    ,
    "Free Consultation - Call Now": "spa_cta_free_consultation",
    "Call Now": "spa_cta_call_now",
    "Call Now: 061-234-5678": "spa_call_now_phone",
    "Need a Custom Solution?": "spa_need_custom",
    "How much does installation cost?": "spa_q_price",
    "How long does installation take?": "spa_q_how_long",
    "Most installations are completed within a few hours. More complex projects may take longer, and we’ll provide an estimated timeline during consultation.": "spa_a_how_long",
    "Do you offer warranties on installations?": "spa_q_warranty",
    "Yes, we provide warranties on our installations to ensure quality and reliability. Specific warranty details depend on the service.": "spa_a_warranty",
    "How do I schedule an appointment?": "spa_q_schedule",
    "You can call us at 061-234-5678. We'll be happy to talk to you anytime.": "spa_a_schedule",
  };

  // Additional mappings discovered in the SPA bundle
  Object.assign(textReplacementMap, {
    "S‑ELECTRICITY": "spa_brand_short",
    "Home Automation & Video Surveillance & Security": "spa_subtitle",
    "Upgrade your home or business for comfort, security and easy controlling": "spa_upgrade_business",
    "Tell me more": "spa_tell_me_more",
    "Your home at your fingertips": "spa_home_at_fingertips",
    "Thanks to home automation, your home is just a click away. Whether you're at home or out, control your lighting, motorized systems, gates, heating, or air conditioning... with a fingertip.": "spa_thanks_home_automation",

    // Service titles
    "Smart Locks & Video Doorbells": "spa_title_smart_locks",
    "Thermostat Installation & Setup": "spa_title_thermostat",
    "Security Cameras & Motion Sensors": "spa_title_security_cameras",
    "Voice Assistant Integration (Alexa, Google, etc.)": "spa_title_voice_integration",
    "Network & Wi-Fi Optimization": "spa_title_network",
    "Smart Lighting & Switches": "spa_title_smart_lighting",
    "Commercial Automation": "spa_title_commercial_automation",
    "Enterprise WiFi": "spa_title_enterprise_wifi",
    "Commercial Surveillance": "spa_title_commercial_surveillance",
    "Commercial Audio": "spa_title_commercial_audio",

    // Service feature lines
    "Smart thermostats — control temp anywhere.": "spa_feat_thermostats",
    "Smart Locks — app-based access, no keys.": "spa_feat_locks",
    "Voice control — Google, Alexa, or Siri.": "spa_feat_voice",
    "Lighting & fans — adjust anytime, anywhere.": "spa_feat_lighting",
    "Security setup — cameras, sensors, no fees.": "spa_feat_security",

    // CTAs and nav
    "👉 Upgrade Your Home": "spa_cta_upgrade",
    "See Real Installs": "spa_cta_real_installs",
    "Quick Links": "spa_quick_links",
    "Home": "spa_home",
    "What We Do": "spa_what_we_do",
    "Example": "spa_example",

    // Footer & misc
    "© 2025 S‑ELECTRICITY LLC. All rights reserved.": "spa_copyright",
    "Privacy Policy": "spa_privacy_policy",
    "Terms of Service": "spa_terms_of_service",
    "Scroll down to see our gallery": "spa_scroll_gallery",
    "Our Recent Projects": "spa_recent_projects",
    "Real installations from satisfied customers across Morocco. Each project showcases our commitment to quality and attention to detail.": "spa_recent_projects_desc",
    "Tell me more": "spa_tell_me_more"
  });

  function replaceTextNodesWithDict(dict){
    if(!dict) return;
    // Create array of [original, key, translation]
  const replacements = Object.keys(textReplacementMap).map(orig=>({ orig, key: textReplacementMap[orig], trans: dict[textReplacementMap[orig]] || null }));
  // Apply longest originals first to avoid short substring replacements breaking longer phrases
  replacements.sort((a,b)=>b.orig.length - a.orig.length);
    if(!replacements.some(r=>r.trans)) return; // nothing to do

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);

    // Use a preserved original baseline per element so translations remain idempotent
    nodes.forEach(node => {
      if(!node.nodeValue || !node.nodeValue.trim()) return;
      const parent = node.parentElement;
      // Store the original text for this element (only once). We use a data attribute on the parent
      // element because text nodes can't hold attributes. This preserves the baseline so re-translations
      // always start from the original source text instead of a previously translated value.
      let base = node.nodeValue;
      try{
        if(parent){
          if(!parent.dataset.i18nOrigText) parent.dataset.i18nOrigText = node.nodeValue;
          base = parent.dataset.i18nOrigText || node.nodeValue;
        }
      }catch(e){ /* ignore DOM exceptions */ }

      let v = base;
      replacements.forEach(r => {
        if(!r.trans) return;
        if(v.includes(r.orig)){
          v = v.split(r.orig).join(r.trans);
        }
      });
      if(v !== node.nodeValue) node.nodeValue = v;
    });
  }

  function setHtmlLangDir(lang){
    document.documentElement.lang = lang;
    // NOTE: By default we keep the page layout left-to-right even when Arabic is selected
    // to avoid automatic UI flipping that may break the layout (per project request).
    // If you want to allow RTL behavior later, change `forceLtrForArabic` to false.
    const forceLtrForArabic = true;
    document.documentElement.dir = (lang === 'ar' && !forceLtrForArabic) ? 'rtl' : 'ltr';
  }

  async function init(lang){
    const l = lang || detect();
    setHtmlLangDir(l);
    const dict = await loadLocale(l);
  applyTranslations(dict);
  // Replace SPA-rendered plain text occurrences (best-effort) using the translations
  try{ replaceTextNodesWithDict(dict); }catch(e){}
    // update document title: prefer page-specific key via data-i18n-title, fallback to dict.title
    try{
      const titleEl = document.querySelector('[data-i18n-title]');
      if(titleEl){
        const key = titleEl.getAttribute('data-i18n-title') || 'title';
        if(dict[key]) document.title = dict[key];
      } else {
        // Avoid applying a generic `dict.title` that may be the 404 title
        // (e.g. locale files often contain a "title" for the 404 page).
        // Instead: prefer page-specific keys (by path) or the 404 page when present.
        try{
          const p = (location.pathname || '/').toLowerCase();
          // 404 template detection (the generated 404.html uses .notfound-root)
          const is404 = !!document.querySelector('main.notfound-root');
          if(is404 && dict.title){
            document.title = dict.title;
          } else if(p === '/' || p === '' || p === '/index.html'){
            if(dict.page_title_index) document.title = dict.page_title_index;
          } else if(p.startsWith('/previous-work')){
            if(dict.page_title_previous_work) document.title = dict.page_title_previous_work;
          }
          // otherwise leave the HTML <title> as authored by the server
        }catch(e){}
      }

      // update meta description(s) via data-i18n-meta on meta tags, or fallback to dict.meta_description
      const metas = document.querySelectorAll('[data-i18n-meta]');
      if(metas && metas.length){
        metas.forEach(m=>{
          const key = m.getAttribute('data-i18n-meta');
          if(key && dict[key]) m.setAttribute('content', dict[key]);
        });
      } else if(dict.meta_description){
        const m = document.querySelector('meta[name="description"]');
        if(m) m.setAttribute('content', dict.meta_description);
        const og = document.querySelector('meta[property="og:description"]');
        if(og) og.setAttribute('content', dict.meta_description);
        const tw = document.querySelector('meta[name="twitter:description"]');
        if(tw) tw.setAttribute('content', dict.meta_description);
      }

      // update JSON-LD description if present and a meta description key exists
      const ld = document.querySelector('script[type="application/ld+json"]');
      if(ld){
        try{
          const json = JSON.parse(ld.textContent);
          // look for any meta description key we used
          const metaKeyEl = document.querySelector('[data-i18n-meta]');
          const metaKey = metaKeyEl ? metaKeyEl.getAttribute('data-i18n-meta') : 'meta_description';
          const desc = dict[metaKey] || dict.meta_description;
          if(json && typeof json === 'object' && desc){
            json.description = desc;
            ld.textContent = JSON.stringify(json, null, 2);
          }
        }catch(e){/* ignore invalid json-ld */}
      }
    }catch(e){/* noop */}
  // set selectors if present (support index, 404 and previous-work pages)
  const sel = document.getElementById('langSelect') || document.getElementById('langSelect404') || document.getElementById('langSelectPW');
  if(sel) sel.value = l;
    // update toggle labels if present (mobile & desktop)
    try{ updateLanguageButtons(l); }catch(e){}
  }

  // Re-run translations when SPA updates the DOM or when the URL changes
  function watchSpaUpdates(){
    let root = document.getElementById('root') || document.body;
    try{
      const mo = new MutationObserver(() => {
        // re-run with the currently detected language (path-first). This ensures
        // that visiting root (/) stays English even if a different language is
        // stored from a previous visit.
        const lang = detect();
        loadLocale(lang).then(dict=>{ applyTranslations(dict); try{ replaceTextNodesWithDict(dict); }catch(e){} try{ updateLanguageButtons(lang); }catch(e){} });
      });
      mo.observe(root, { childList: true, subtree: true, characterData: true });
    }catch(e){}

    // detect history navigation in SPA (pushState/replaceState) and popstate
    try{
      const wrap = (type)=>{
        const orig = history[type];
        return function(){
          const res = orig.apply(this, arguments);
          window.dispatchEvent(new Event('locationchange'));
          return res;
        };
      };
      history.pushState = wrap('pushState');
      history.replaceState = wrap('replaceState');
      window.addEventListener('popstate', ()=> window.dispatchEvent(new Event('locationchange')));
      window.addEventListener('locationchange', ()=>{
        // Use the detected language (path-first) for location changes so that
        // language-prefixed routes win over any persisted selection.
        const lang = detect();
        loadLocale(lang).then(dict=>{ applyTranslations(dict); try{ replaceTextNodesWithDict(dict); }catch(e){} try{ updateLanguageButtons(lang); }catch(e){} });
      });
    }catch(e){}
  }

  // Change language handler: persist selection, update URL (preserve the rest of the path),
  // update html lang/dir and re-run init so translations apply immediately.
  function changeTo(lang){
    if(!available.includes(lang)) return;
  try{ localStorage.setItem('site_lang', lang); }catch(e){}
  try{ document.documentElement.lang = lang; document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr'; }catch(e){}
  try{ updateLanguageButtons(lang); }catch(e){}

    // Build target path preserving the suffix after any existing language prefix
    try{
      const cur = location.pathname || '/';
      // capture optional prefix and the rest: /fr/whatever -> rest = /whatever
      const m = cur.match(/^\/(en|fr|ar)(\/|$)([\s\S]*)/i);
      let rest = '/';
      if(m){ rest = '/' + (m[3] || ''); }
      else rest = cur;
      if(!rest.startsWith('/')) rest = '/' + rest;

      let target;
      if(lang === 'en'){
        // english lives at root (no prefix)
        target = rest;
      } else {
        // prefix with language
        target = '/' + lang + (rest === '/' ? '/' : rest);
      }
      // normalize multiple slashes
      target = target.replace(/\/\/+/g, '/');
      // push new URL (wrapped pushState will trigger locationchange watcher)
      try{
        // Use a full navigation to the language-prefixed page so the server-provided
        // localized HTML (fr/index.html, ar/index.html) is loaded. This ensures
        // correct router basename and SEO-friendly content for crawlers.
        location.assign(target + location.search + location.hash);
        return; // navigation will unload current script
      }catch(e){ /* fallback to pushState if assign isn't allowed */
        try{ history.pushState({}, '', target + location.search + location.hash); }catch(e){}
      }
    }catch(e){}

    // re-run translations and any init logic for the chosen language
    init(lang);
    // trigger locationchange so SPA routers and observers react immediately
    try{ window.dispatchEvent(new Event('locationchange')); }catch(e){}
  }

  // Wire global listeners on load
  window.addEventListener('DOMContentLoaded', ()=>{
    init();
    // start watching for SPA updates so translations are applied immediately on navigation
    watchSpaUpdates();
    ['langSelect','langSelect404','langSelectPW'].forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('change',(e)=>{ changeTo(e.target.value); });
    });
    // Helper to close both menus
    function closeLanguageMenus(){
      try{
        const db = document.getElementById('langDesktopBtn');
        const dm = document.getElementById('langDesktopMenu');
        const mb = document.getElementById('langToggleBtn');
        const mm = document.getElementById('langMenu');
        if(db && dm){ db.setAttribute('aria-expanded','false'); dm.hidden = true; }
        if(mb && mm){ mb.setAttribute('aria-expanded','false'); mm.hidden = true; }
      }catch(e){}
    }

    // Helper to sync menu width to its button so menu always matches button size
    function syncMenuWidth(btn, menu){
      try{
        if(!btn || !menu) return;
        // compute width including padding and border
        const rect = btn.getBoundingClientRect();
        // set minWidth so menu is at least as wide as button
        menu.style.minWidth = Math.ceil(rect.width) + 'px';
      }catch(e){}
    }

    // Mobile custom language menu wiring
    const mobileBtn = document.getElementById('langToggleBtn');
    const langMenu = document.getElementById('langMenu');
    if(mobileBtn && langMenu){
      mobileBtn.addEventListener('click', (ev)=>{
        const expanded = mobileBtn.getAttribute('aria-expanded') === 'true';
        if(expanded){
          mobileBtn.setAttribute('aria-expanded','false');
          langMenu.hidden = true;
        } else {
          closeLanguageMenus();
          mobileBtn.setAttribute('aria-expanded','true');
          // ensure menu is at least as wide as the button
          syncMenuWidth(mobileBtn, langMenu);
          langMenu.hidden = false;
        }
      });

      // menu item clicks
      langMenu.querySelectorAll('button[data-lang]').forEach(b=>{
        b.addEventListener('click', ()=>{
          const chosen = b.getAttribute('data-lang');
          if(chosen) changeTo(chosen);
          closeLanguageMenus();
        });
      });
    }

    // Desktop modern dropdown wiring
    const desktopBtn = document.getElementById('langDesktopBtn');
    const desktopMenu = document.getElementById('langDesktopMenu');
    if(desktopBtn && desktopMenu){
      desktopBtn.addEventListener('click', (ev)=>{
        const expanded = desktopBtn.getAttribute('aria-expanded') === 'true';
        if(expanded){
          desktopBtn.setAttribute('aria-expanded','false');
          desktopMenu.hidden = true;
        } else {
          closeLanguageMenus();
          desktopBtn.setAttribute('aria-expanded','true');
          // ensure desktop menu matches button width
          syncMenuWidth(desktopBtn, desktopMenu);
          desktopMenu.hidden = false;
        }
      });

      desktopMenu.querySelectorAll('button[data-lang]').forEach(b=>{
        b.addEventListener('click', ()=>{
          const chosen = b.getAttribute('data-lang');
          if(chosen) changeTo(chosen);
          closeLanguageMenus();
        });
      });
    }

    // click outside to close (use capture to be robust)
    document.addEventListener('click', (e)=>{
      try{
        const target = e.target;
        const db = document.getElementById('langDesktopBtn');
        const dm = document.getElementById('langDesktopMenu');
        const mb = document.getElementById('langToggleBtn');
        const mm = document.getElementById('langMenu');
        if(dm && !dm.hidden){
          if(!(db && db.contains(target)) && !(dm && dm.contains(target))){
            closeLanguageMenus();
          }
        }
        if(mm && !mm.hidden){
          if(!(mb && mb.contains(target)) && !(mm && mm.contains(target))){
            closeLanguageMenus();
          }
        }
      }catch(e){}
    }, true);

    // Close menus on resize/scroll/orientation change and ESC key
    ['resize','orientationchange','scroll'].forEach(evt=>{
      window.addEventListener(evt, closeLanguageMenus);
    });
    window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeLanguageMenus(); });
  });

  // expose for console/debug
  window.__site_i18n = { changeTo, init };
})();
