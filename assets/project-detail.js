/**
 * project-detail.js
 * Renders a single project case-study page by injecting content into the SPA layout.
 * Mirrors the architecture of product-detail.js:
 *   - Detects project URLs (`/project.html`, `/projects/<slug>.html`, `/fr/projects/...`, `/ar/projects/...`).
 *   - Waits for the SPA to render its shell, then injects a `#custom-project-detail-wrapper` div.
 *   - Reads pre-embedded `window.__PROJECT__` (written by build_projects.py) and falls back
 *     to fetching `/data/projects/<slug>.json` if not present (dev mode).
 *   - Lazy-loads Instagram's `embed.js` ONCE when the first reel nears the viewport.
 *   - Self-hosted <video> elements use poster frames and click-to-play (with muted autoplay-on-scroll fallback).
 */

(function() {
  // ---------------- Language redirect (mirrors product-detail.js) ----------------
  var _path = location.pathname || '/';
  if (_path === '/project.html' || (_path.startsWith('/projects/') && _path.endsWith('.html'))) {
    var _lang = localStorage.getItem('site_lang');
    if (_lang && _lang !== 'en' && (_lang === 'ar' || _lang === 'fr')) {
      location.replace('/' + _lang + _path + location.search + location.hash);
      return;
    }
  }

  // ---------------- Helpers ----------------
  function getLang() {
    return document.documentElement.lang || 'en';
  }
  function getLangPrefix() {
    const lang = getLang();
    if (lang === 'ar') return '/ar';
    if (lang === 'fr') return '/fr';
    return '';
  }
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[getLang()] || obj['en'] || obj['fr'] || obj['ar'] || '';
  }
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getProjectSlug() {
    const match = location.pathname.match(/\/projects\/([^/.]+)(?:\.html)?$/);
    if (match) return match[1];
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }

  async function fetchProject(slug) {
    // Prefer the pre-embedded project (written by build_projects.py into each static page)
    if (window.__PROJECT__ && (!slug || window.__PROJECT__.id === slug)) {
      return window.__PROJECT__;
    }
    if (!slug) return null;
    try {
      const res = await fetch('/data/projects/' + slug + '.json');
      if (!res.ok) throw new Error('Project not found');
      return await res.json();
    } catch (e) {
      console.error('Failed to fetch project:', e);
      return null;
    }
  }

  async function fetchProductsIndex() {
    try {
      const res = await fetch('/data/products_index.json');
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  // ---------------- Meta / head updates ----------------
  function updateMeta(project) {
    const title = t(project.title);
    const descText = t(project.short_description) || t(project.description);
    const cover = project.cover || '';
    const coverUrl = cover ? ('https://smartelectricity.ma' + cover) : '';

    const suffix = { en: 'S‑ELECTRICITY Morocco', fr: 'S‑ELECTRICITY Maroc', ar: 'S‑ELECTRICITY المغرب' };
    document.title = title + ' | ' + (suffix[getLang()] || suffix.en);

    function setContent(id, value) {
      const el = document.getElementById(id);
      if (el) el.content = value;
    }
    function setHref(id, value) {
      const el = document.getElementById(id);
      if (el) el.href = value;
    }

    const baseUrl = 'https://smartelectricity.ma';
    const canonicalUrl = baseUrl + getLangPrefix() + '/projects/' + project.id + '.html';
    setHref('meta-canonical', canonicalUrl);
    setContent('meta-description', descText);
    setContent('meta-og-title', title + ' | S‑ELECTRICITY');
    setContent('meta-og-description', descText);
    setContent('meta-og-image', coverUrl);
    setContent('meta-twitter-title', title + ' | S‑ELECTRICITY');
    setContent('meta-twitter-description', descText);
    setContent('meta-twitter-image', coverUrl);

    // Update hreflang
    document.querySelectorAll('link[hreflang]').forEach(function(link) {
      const lang = link.getAttribute('hreflang');
      const prefix = (lang === 'en' || lang === 'x-default') ? '' : '/' + lang;
      link.href = baseUrl + prefix + '/projects/' + project.id + '.html';
    });
  }

  function injectJsonLd(project, productsIndex) {
    const existing = document.getElementById('project-jsonld');
    if (existing) existing.remove();

    const title = t(project.title);
    const descText = t(project.description) || t(project.short_description);
    const cover = project.cover ? ('https://smartelectricity.ma' + project.cover) : undefined;
    const url = 'https://smartelectricity.ma' + getLangPrefix() + '/projects/' + project.id + '.html';

    const mentions = (project.related_products || []).map(function(pid) {
      const prod = productsIndex.find(function(p) { return p.id === pid; });
      if (!prod) return null;
      return {
        '@type': 'Product',
        'name': t(prod.title),
        'url': 'https://smartelectricity.ma/products/' + prod.id + '.html'
      };
    }).filter(Boolean);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      'name': title,
      'headline': title,
      'description': descText,
      'url': url,
      'datePublished': project.date || undefined,
      'locationCreated': project.location ? { '@type': 'Place', 'name': project.location } : undefined,
      'author': {
        '@type': 'Organization',
        'name': 'S‑ELECTRICITY',
        'url': 'https://smartelectricity.ma'
      }
    };
    if (cover) jsonLd.image = cover;
    if (mentions.length) jsonLd.mentions = mentions;

    if (project.testimonial && project.testimonial.quote) {
      jsonLd.review = {
        '@type': 'Review',
        'reviewBody': t(project.testimonial.quote),
        'author': {
          '@type': 'Person',
          'name': project.testimonial.author || 'Client'
        }
      };
    }

    // Prune undefined
    Object.keys(jsonLd).forEach(function(k) {
      if (jsonLd[k] === undefined) delete jsonLd[k];
    });

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'project-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  }

  // ---------------- Rendering ----------------
  function renderBreadcrumbs(project) {
    const prefix = getLangPrefix();
    return (
      '<nav class="proj-breadcrumbs" aria-label="Breadcrumb">' +
        '<a href="' + prefix + '/" data-i18n="breadcrumb_home">Home</a>' +
        '<span class="proj-breadcrumb-sep">›</span>' +
        '<a href="' + prefix + '/previous-work.html" data-i18n="spa_previous_work">Previous Work</a>' +
        '<span class="proj-breadcrumb-sep">›</span>' +
        '<span class="proj-breadcrumb-current">' + escapeHtml(t(project.title)) + '</span>' +
      '</nav>'
    );
  }

  function renderHero(project) {
    const title = escapeHtml(t(project.title));
    const lead = escapeHtml(t(project.short_description));
    const cover = project.cover || '/assets/S‑ELECTRICITY-LOGO.svg';
    const cats = (project.categories || []).map(function(c) {
      return '<span class="proj-cat-badge">' + escapeHtml(c) + '</span>';
    }).join('');

    const facts = [];
    if (project.date) {
      const d = new Date(project.date);
      const dateStr = isNaN(d) ? project.date : d.toLocaleDateString(getLang(), { year: 'numeric', month: 'long' });
      facts.push(
        '<span class="proj-fact">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
          escapeHtml(dateStr) +
        '</span>'
      );
    }
    if (project.location) {
      facts.push(
        '<span class="proj-fact">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          escapeHtml(project.location) +
        '</span>'
      );
    }
    if (project.duration_days) {
      facts.push(
        '<span class="proj-fact">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          escapeHtml(String(project.duration_days)) + ' days' +
        '</span>'
      );
    }

    return (
      '<section class="proj-hero">' +
        '<div class="proj-hero-content">' +
          (cats ? '<div class="proj-hero-categories">' + cats + '</div>' : '') +
          '<h1 class="proj-hero-title">' + title + '</h1>' +
          (lead ? '<p class="proj-hero-lead">' + lead + '</p>' : '') +
          (facts.length ? '<div class="proj-hero-facts">' + facts.join('') + '</div>' : '') +
        '</div>' +
        '<div class="proj-hero-cover">' +
          '<img src="' + escapeHtml(cover) + '" alt="' + title + '" loading="eager" />' +
        '</div>' +
      '</section>'
    );
  }

  function renderReelCard(reel) {
    if (!reel) return '';
    const alt = escapeHtml(t(reel.alt) || '');
    const igUrl = reel.instagram_url || '';
    const src = reel.src || '';
    const poster = reel.poster || '';

    // Instagram "camera" glyph used in both the gradient button and the
    // fallback placeholder (reused svg path kept short and inline-safe).
    const igIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.22.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.41 2.22.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.22-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.05.36-2.22.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.22-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.05-.41-2.22C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.22.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.36 2.22-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.39-.67.67-1.08 1.34-1.39 2.13-.3.76-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.39-2.13C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z"/><path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.17 6.17 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4z"/><circle cx="18.41" cy="5.59" r="1.44"/></svg>';

    // Unmute icons (two states — toggled via the is-unmuted class on the card).
    const iconMuted = '<svg class="icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
    const iconUnmuted = '<svg class="icon-unmuted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';

    let mediaNode;
    if (src) {
      mediaNode =
        '<video class="proj-reel-video" src="' + escapeHtml(src) + '"' +
          (poster ? ' poster="' + escapeHtml(poster) + '"' : '') +
          ' autoplay muted loop playsinline preload="metadata"' +
          ' aria-label="' + alt + '"></video>' +
        '<button type="button" class="proj-reel-unmute" aria-label="Unmute video">' +
          iconMuted + iconUnmuted +
        '</button>';
    } else if (igUrl) {
      // Fallback — no MP4 provided, show a branded card that opens Instagram.
      mediaNode =
        '<a href="' + escapeHtml(igUrl) + '" target="_blank" rel="noopener noreferrer" class="proj-reel-placeholder" aria-label="' + alt + '">' +
          '<span class="proj-reel-placeholder-inner">' + igIcon +
            '<span class="proj-reel-placeholder-label">View on Instagram</span>' +
          '</span>' +
        '</a>';
    } else {
      return '';
    }

    const igButton = igUrl ? (
      '<a href="' + escapeHtml(igUrl) + '" target="_blank" rel="noopener noreferrer" class="proj-reel-ig-btn">' +
        igIcon + '<span>View on Instagram</span>' +
      '</a>'
    ) : '';

    return (
      '<aside class="proj-reel-card">' +
        '<div class="proj-reel-card-media">' + mediaNode + '</div>' +
        igButton +
      '</aside>'
    );
  }

  function getReel(project) {
    return (project.media || []).find(function(m) { return m.type === 'reel'; });
  }

  function renderBrandsProtocols(project, productsIndex) {
    const brands = [];
    const protocols = [];

    // Derive from related_products (products we sell — looked up in the index).
    if (project.related_products && productsIndex && productsIndex.length) {
      project.related_products.forEach(function(pid) {
        const p = productsIndex.find(function(x) { return x.id === pid; });
        if (!p) return;
        if (p.brand && brands.indexOf(p.brand) === -1) brands.push(p.brand);
        if (Array.isArray(p.technology)) {
          p.technology.forEach(function(tech) {
            if (tech && protocols.indexOf(tech) === -1) protocols.push(tech);
          });
        }
      });
    }

    // Merge manual additions for equipment we don't sell / isn't in the catalog.
    if (Array.isArray(project.extra_brands)) {
      project.extra_brands.forEach(function(b) {
        if (b && brands.indexOf(b) === -1) brands.push(b);
      });
    }
    if (Array.isArray(project.extra_protocols)) {
      project.extra_protocols.forEach(function(t) {
        if (t && protocols.indexOf(t) === -1) protocols.push(t);
      });
    }

    if (brands.length === 0 && protocols.length === 0) return '';

    const brandChips = brands.map(function(b) {
      return '<span class="proj-brand-chip">' + escapeHtml(b) + '</span>';
    }).join('');
    const protocolChips = protocols.map(function(p) {
      return '<span class="proj-protocol-chip">' + escapeHtml(p) + '</span>';
    }).join('');

    const brandsRow = brands.length ? (
      '<div class="proj-brands-group">' +
        '<div class="proj-brands-group-label" data-i18n="proj_brands_label">Brands</div>' +
        '<div class="proj-brands-chips">' + brandChips + '</div>' +
      '</div>'
    ) : '';

    const protocolsRow = protocols.length ? (
      '<div class="proj-brands-group">' +
        '<div class="proj-brands-group-label" data-i18n="proj_protocols_label">Protocols</div>' +
        '<div class="proj-brands-chips">' + protocolChips + '</div>' +
      '</div>'
    ) : '';

    return (
      '<div class="proj-brands-card">' +
        '<h3 class="proj-brands-title" data-i18n="proj_brands_title">Brands &amp; Protocols</h3>' +
        brandsRow +
        protocolsRow +
      '</div>'
    );
  }

  function renderNarrative(project, productsIndex) {
    const desc = t(project.description);
    if (!desc) return '';
    // Split on blank lines into paragraphs
    const paragraphs = desc.split(/\n\s*\n/).map(function(p) {
      return '<p>' + escapeHtml(p.trim()) + '</p>';
    }).join('');

    const brandsBlock = renderBrandsProtocols(project, productsIndex);

    const reel = getReel(project);
    if (!reel) {
      return '<section class="proj-narrative">' + paragraphs + brandsBlock + '</section>';
    }
    // Reel present → 2-column layout: sticky reel card + narrative text.
    return (
      '<section class="proj-narrative proj-narrative--with-reel">' +
        renderReelCard(reel) +
        '<div class="proj-narrative-text">' + paragraphs + brandsBlock + '</div>' +
      '</section>'
    );
  }

  function mediaOrientation(item) {
    if (item.type === 'reel') return 'portrait';
    if (item.width && item.height) return item.height > item.width ? 'portrait' : 'landscape';
    if (item.type === 'video') return 'landscape'; // default if poster missing
    return 'landscape';
  }

  // Convert any Instagram URL (reel/reels/p/tv) into the direct embed URL that
  // plays the video in-page inside an iframe (instead of just showing a preview
  // that links out to instagram.com).
  function instagramEmbedSrc(url) {
    if (!url) return '';
    const m = String(url).match(/instagram\.com\/(?:reel|reels|p|tv)\/([^/?#]+)/i);
    if (!m) return url;
    return 'https://www.instagram.com/reel/' + m[1] + '/embed/';
  }

  function renderMediaItem(item, index) {
    const orient = mediaOrientation(item);
    const alt = escapeHtml(t(item.alt) || '');
    const ar = (item.width && item.height) ? (item.width + ' / ' + item.height) : (orient === 'portrait' ? '3 / 4' : '16 / 9');

    if (item.type === 'image') {
      return (
        '<figure class="proj-media-item" data-orientation="' + orient + '" data-type="image">' +
          '<img src="' + escapeHtml(item.src) + '" alt="' + alt + '" loading="lazy" ' +
               'style="aspect-ratio:' + ar + ';" ' +
               (item.width ? 'width="' + item.width + '" ' : '') +
               (item.height ? 'height="' + item.height + '"' : '') + ' />' +
        '</figure>'
      );
    }

    if (item.type === 'video') {
      const poster = item.poster ? ' poster="' + escapeHtml(item.poster) + '"' : '';
      return (
        '<figure class="proj-media-item" data-orientation="' + orient + '" data-type="video">' +
          '<span class="proj-media-badge" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>VIDEO' +
          '</span>' +
          '<video preload="metadata" playsinline muted loop' + poster +
                 ' data-src="' + escapeHtml(item.src) + '"' +
                 ' aria-label="' + alt + '"' +
                 ' style="aspect-ratio:' + ar + ';"></video>' +
          '<button type="button" class="proj-video-play" aria-label="Play video">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.5)"/><path d="M9 7.5v9l7-4.5z" fill="#fff"/></svg>' +
          '</button>' +
        '</figure>'
      );
    }

    // 'reel' entries are NOT rendered inside the gallery strip — they appear
    // as a sticky card beside the description narrative instead. See
    // renderReelCard() / renderNarrative().
    return '';
  }

  function renderMediaSection(project) {
    if (!project.media || project.media.length === 0) return '';
    // Exclude reels from the gallery strip — they're rendered beside the narrative.
    const gallery = project.media.filter(function(m) { return m.type !== 'reel'; });
    if (gallery.length === 0) return '';
    const items = gallery.map(renderMediaItem).join('');
    const arrowLeft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    const arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    return (
      '<section class="proj-media-section">' +
        '<h2 class="proj-section-title" data-i18n="proj_gallery_title">Project Gallery</h2>' +
        '<div class="proj-mosaic-wrapper">' +
          '<button type="button" class="proj-strip-nav proj-strip-nav--prev" aria-label="Previous" disabled>' + arrowLeft + '</button>' +
          '<div class="proj-mosaic-strip" role="region" aria-label="Project media gallery" tabindex="0">' +
            items +
          '</div>' +
          '<button type="button" class="proj-strip-nav proj-strip-nav--next" aria-label="Next">' + arrowRight + '</button>' +
        '</div>' +
      '</section>'
    );
  }

  function renderTestimonial(project) {
    if (!project.testimonial || !project.testimonial.quote) return '';
    const quote = escapeHtml(t(project.testimonial.quote));
    const author = escapeHtml(project.testimonial.author || '');
    return (
      '<section>' +
        '<blockquote class="proj-testimonial">' +
          '<p class="proj-testimonial-quote">' + quote + '</p>' +
          (author ? '<footer class="proj-testimonial-author">' + author + '</footer>' : '') +
        '</blockquote>' +
      '</section>'
    );
  }

  function renderRelatedProducts(project, productsIndex) {
    if (!project.related_products || project.related_products.length === 0) return '';
    if (!productsIndex || productsIndex.length === 0) return '';

    const prefix = getLangPrefix();
    const cards = project.related_products.map(function(pid) {
      const p = productsIndex.find(function(x) { return x.id === pid; });
      if (!p) return '';
      const img = p.image || (p.images && p.images[0]) || '/assets/S‑ELECTRICITY-LOGO.svg';
      return (
        '<a href="' + prefix + '/products/' + p.id + '.html" class="proj-related-card">' +
          '<div class="proj-related-card-img"><img src="' + escapeHtml(img) + '" alt="' + escapeHtml(t(p.title)) + '" loading="lazy" /></div>' +
          '<div class="proj-related-card-body">' +
            (p.brand ? '<div class="proj-related-card-brand">' + escapeHtml(p.brand) + '</div>' : '') +
            '<h3 class="proj-related-card-title">' + escapeHtml(t(p.title)) + '</h3>' +
          '</div>' +
        '</a>'
      );
    }).join('');

    if (!cards) return '';
    return (
      '<section class="proj-related">' +
        '<h2 class="proj-section-title" data-i18n="related_products">Related Products</h2>' +
        '<div class="proj-related-grid">' + cards + '</div>' +
      '</section>'
    );
  }

  function renderCta() {
    // Mirrors the homepage "Need a Custom Solution?" banner: solid primary
    // background, centered content. Two action buttons:
    //   1. Chat on WhatsApp (primary white pill, brand-orange text + icon) —
    //      the main CTA, styled to match the site brand on the orange banner.
    //   2. Discover Our Services (ghost outline) — forward-moving link
    //      pointing visitors away from the gallery they already came from.
    const prefix = getLangPrefix();
    const servicesHref = (prefix || '') + '/#services';
    const waMsgs = {
      en: "Hello, I'd like a consultation about your services.",
      fr: "Bonjour, je souhaite une consultation concernant vos services.",
      ar: "مرحباً، أود استشارة بخصوص خدماتكم."
    };
    const waLang = getLang();
    const waHref = 'https://wa.me/212654132112?text=' + encodeURIComponent(waMsgs[waLang] || waMsgs.en);
    return (
      '<section class="proj-cta">' +
        '<div class="proj-cta-inner">' +
          '<h2 class="proj-cta-title" data-i18n="spa_need_custom">Need a Custom Solution?</h2>' +
          '<p class="proj-cta-lead" data-i18n="spa_team">Our team of experts is ready to design a tailored smart home or commercial solution that perfectly fits your needs and budget.</p>' +
          '<div class="proj-cta-actions">' +
            '<a href="' + waHref + '" target="_blank" rel="noopener noreferrer" class="proj-cta-btn proj-cta-btn-primary">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.85 11.85 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.87c0 2.09.55 4.12 1.59 5.92L0 24l6.4-1.68a11.86 11.86 0 0 0 5.64 1.43h.01c6.54 0 11.86-5.32 11.86-11.87 0-3.17-1.23-6.15-3.39-8.4zM12.04 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.8 1 1.02-3.7-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.44 4.43-9.87 9.87-9.87 2.64 0 5.11 1.03 6.97 2.9a9.79 9.79 0 0 1 2.89 6.98c0 5.44-4.43 9.87-9.87 9.87zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.35.19 1.86.12.57-.08 1.76-.72 2.01-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.57-.35z"/></svg>' +
              '<span data-i18n="spa_cta_whatsapp">Chat on WhatsApp</span>' +
            '</a>' +
            '<a href="' + servicesHref + '" class="proj-cta-btn proj-cta-btn-secondary">' +
              '<span data-i18n="spa_cta_discover_services">Discover Our Services</span>' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="proj-cta-arrow"><polyline points="9 18 15 12 9 6"/></svg>' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderProjectContent(project, productsIndex) {
    return (
      '<div id="custom-project-container">' +
        renderBreadcrumbs(project) +
        renderHero(project) +
        renderNarrative(project, productsIndex) +
        renderMediaSection(project) +
        renderTestimonial(project) +
        renderRelatedProducts(project, productsIndex) +
        renderCta() +
      '</div>'
    );
  }

  function renderError() {
    const prefix = getLangPrefix();
    return (
      '<div class="proj-not-found">' +
        '<h2 data-i18n="project_not_found">Project Not Found</h2>' +
        '<p data-i18n="project_not_found_desc">The project you are looking for does not exist or has been removed.</p>' +
        '<a href="' + prefix + '/previous-work.html" class="proj-cta-btn proj-cta-btn-primary" data-i18n="spa_previous_work">Previous Work</a>' +
      '</div>'
    );
  }

  // ---------------- Reel card: autoplay muted + tap-to-unmute + pause off-screen ----------------
  function wireReelInteractions(container) {
    const cards = container.querySelectorAll('.proj-reel-card');
    cards.forEach(function(card) {
      const video = card.querySelector('.proj-reel-video');
      const btn = card.querySelector('.proj-reel-unmute');
      if (!video) return;

      // Kick off muted autoplay (mobile browsers require this to be user-gesture-adjacent;
      // since the element has autoplay+muted, most browsers will start on their own).
      const tryPlay = function() {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function() {});
      };
      if (video.readyState >= 2) tryPlay();
      else video.addEventListener('loadeddata', tryPlay, { once: true });

      // Pause when the reel leaves the viewport; resume when it comes back.
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) tryPlay();
            else video.pause();
          });
        }, { threshold: 0.25 });
        io.observe(video);
      }

      // Toggle audio on click (video body OR the dedicated unmute button).
      const toggleMute = function(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        video.muted = !video.muted;
        card.classList.toggle('is-unmuted', !video.muted);
        if (btn) btn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
        if (!video.muted && video.paused) tryPlay();
      };
      if (btn) btn.addEventListener('click', toggleMute);
      video.addEventListener('click', toggleMute);
    });
  }

  // ---------------- Horizontal strip: drag-to-scroll + nav buttons ----------------
  function wireMediaStrip(container) {
    const wrappers = container.querySelectorAll('.proj-mosaic-wrapper');
    wrappers.forEach(function(wrap) {
      const strip = wrap.querySelector('.proj-mosaic-strip');
      const prev = wrap.querySelector('.proj-strip-nav--prev');
      const next = wrap.querySelector('.proj-strip-nav--next');
      if (!strip) return;

      // --- Arrow buttons: scroll by one item width + gap ---
      function stepSize() {
        const item = strip.querySelector('.proj-media-item');
        if (!item) return 300;
        const gap = parseInt(getComputedStyle(strip).columnGap || '16', 10) || 16;
        return item.getBoundingClientRect().width + gap;
      }
      function updateNavState() {
        const max = strip.scrollWidth - strip.clientWidth - 1;
        const pos = Math.abs(strip.scrollLeft);
        const atStart = pos <= 2;
        const atEnd = pos >= max;
        if (prev) prev.disabled = atStart;
        if (next) next.disabled = atEnd;
      }
      function getCurrentIndex() {
        const items = Array.from(strip.querySelectorAll('.proj-media-item'));
        if (!items.length) return { items: [], index: 0 };
        const stripRect = strip.getBoundingClientRect();
        const stripCenter = stripRect.left + stripRect.width / 2;
        let closest = 0;
        let minDist = Infinity;
        items.forEach(function(item, i) {
          const r = item.getBoundingClientRect();
          const c = r.left + r.width / 2;
          const d = Math.abs(c - stripCenter);
          if (d < minDist) { minDist = d; closest = i; }
        });
        return { items: items, index: closest };
      }
      function goTo(targetIndex) {
        const items = strip.querySelectorAll('.proj-media-item');
        if (!items.length) return;
        const idx = Math.max(0, Math.min(items.length - 1, targetIndex));
        items[idx].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
      if (prev) prev.addEventListener('click', function() {
        const { index } = getCurrentIndex();
        goTo(index - 1);
      });
      if (next) next.addEventListener('click', function() {
        const { index } = getCurrentIndex();
        goTo(index + 1);
      });
      strip.addEventListener('scroll', updateNavState, { passive: true });
      window.addEventListener('resize', updateNavState);
      // Initial state after layout settles
      setTimeout(updateNavState, 50);

      // --- Mouse drag-to-scroll ---
      let isDown = false;
      let startX = 0;
      let startScroll = 0;
      let moved = 0;
      const DRAG_THRESHOLD = 6;

      strip.addEventListener('mousedown', function(e) {
        // Don't hijack interactive children (iframes, anchors, buttons)
        if (e.target.closest('iframe, a, button, input, textarea, select')) return;
        isDown = true;
        moved = 0;
        startX = e.clientX;
        startScroll = strip.scrollLeft;
        strip.classList.add('is-dragging');
        e.preventDefault();
      });
      window.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        const dx = e.clientX - startX;
        moved = Math.abs(dx);
        strip.scrollLeft = startScroll - dx;
      });
      window.addEventListener('mouseup', function() {
        if (!isDown) return;
        isDown = false;
        strip.classList.remove('is-dragging');
      });
      // Swallow the click that follows a drag so we don't trigger anchor navigation
      strip.addEventListener('click', function(e) {
        if (moved > DRAG_THRESHOLD) {
          e.preventDefault();
          e.stopPropagation();
          moved = 0;
        }
      }, true);

      // --- Keyboard arrow support when strip is focused ---
      strip.addEventListener('keydown', function(e) {
        const { index } = getCurrentIndex();
        if (e.key === 'ArrowRight') {
          goTo(index + 1);
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft') {
          goTo(index - 1);
          e.preventDefault();
        }
      });
    });
  }

  // ---------------- Self-hosted video click-to-play ----------------
  function wireVideos(container) {
    const items = container.querySelectorAll('.proj-media-item[data-type="video"]');
    items.forEach(function(fig) {
      const video = fig.querySelector('video');
      const button = fig.querySelector('.proj-video-play');
      if (!video || !button) return;

      button.addEventListener('click', function() {
        if (!video.src && video.getAttribute('data-src')) {
          video.src = video.getAttribute('data-src');
        }
        video.muted = true; // browsers require muted for programmatic play
        video.loop = true;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(function() {
            fig.classList.add('is-playing');
          }).catch(function() {
            // Autoplay denied — keep the play button visible so the user can retry
          });
        } else {
          fig.classList.add('is-playing');
        }
      });
    });
  }

  // ---------------- Link transitions (soft fade on nav) ----------------
  function attachLinkTransitions(container) {
    container.querySelectorAll('a[href]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const anchor = e.currentTarget;
        if (e.ctrlKey || e.metaKey || anchor.target === '_blank') return;
        const href = anchor.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('https://wa.me')) return;
        // Only animate same-origin transitions
        try {
          const u = new URL(href, location.href);
          if (u.origin !== location.origin) return;
        } catch(_) {}
        e.preventDefault();
        const wrap = document.getElementById('custom-project-detail-wrapper');
        if (wrap) {
          wrap.style.transition = 'opacity 0.2s ease-out';
          wrap.style.opacity = '0';
        }
        setTimeout(function() { window.location.href = href; }, 200);
      });
    });
  }

  // ---------------- Mount ----------------
  var _mounted = false;

  async function initApp() {
    if (_mounted || document.getElementById('custom-project-detail-wrapper')) return;
    _mounted = true;

    const root = document.getElementById('root');
    const target = document.querySelector('main.notfound-root') || document.querySelector('main');

    const appContainer = document.createElement('div');
    appContainer.id = 'custom-project-detail-wrapper';
    appContainer.innerHTML = '<div class="proj-loading"><div class="proj-loading-spinner"></div></div>';

    if (target && target.nodeName === 'MAIN') {
      target.innerHTML = '';
      target.appendChild(appContainer);
    } else {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.parentNode.insertBefore(appContainer, footer);
      } else if (root) {
        root.appendChild(appContainer);
      }
    }

    window.addEventListener('pageshow', function() {
      appContainer.style.transition = 'none';
      appContainer.style.opacity = '1';
    });

    if (window.__site_i18n && window.__site_i18n.init) window.__site_i18n.init();

    const slug = getProjectSlug();
    const [project, productsIndex] = await Promise.all([
      fetchProject(slug),
      fetchProductsIndex()
    ]);

    function renderPage() {
      let html;
      if (!project) {
        html = '<div id="custom-project-container">' + renderError() + '</div>';
      } else {
        updateMeta(project);
        injectJsonLd(project, productsIndex);
        html = renderProjectContent(project, productsIndex);
      }
      appContainer.innerHTML = html;
      attachLinkTransitions(appContainer);
      wireVideos(appContainer);
      wireReelInteractions(appContainer);
      wireMediaStrip(appContainer);

      if (window.__site_i18n && typeof window.__site_i18n.init === 'function') {
        setTimeout(function() { window.__site_i18n.init(); }, 50);
      }
    }

    renderPage();

    window.addEventListener('locationchange', function() {
      if (isProjectDetailPage()) renderPage();
    });
  }

  function isProjectDetailPage() {
    const path = location.pathname || '/';
    return path.endsWith('/project.html') || path.endsWith('/project') || /\/projects\/[^/]+\.html$/.test(path);
  }

  function cleanupProjectDetail() {
    const wrap = document.getElementById('custom-project-detail-wrapper');
    if (wrap) wrap.remove();
    _mounted = false;
  }

  function mountApp() {
    if (!isProjectDetailPage()) return;

    const tryMount = function() {
      const hasShell = document.querySelector('main') || document.querySelector('footer');
      if (hasShell) { initApp(); return true; }
      return false;
    };

    if (tryMount()) return;

    const observer = new MutationObserver(function(_, obs) {
      if (tryMount()) obs.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('locationchange', function() {
    if (!isProjectDetailPage()) cleanupProjectDetail();
    else if (!document.getElementById('custom-project-detail-wrapper')) mountApp();
  });
  window.addEventListener('popstate', function() {
    if (!isProjectDetailPage()) cleanupProjectDetail();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
})();
