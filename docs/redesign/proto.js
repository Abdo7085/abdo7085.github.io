/*
 * proto.js — S-ELECTRICITY full-site redesign prototype (phase 6, 2026-11-15)
 *
 * One script renders every prototype page from the site's REAL data
 * (data/*.json, assets/locales/*.json, product images), so the proposal is
 * judged on actual content in EN / FR / AR. Not loaded by any live page.
 *
 *   <body data-page="home|catalog|product|brands|brand|projects|project|404">
 *
 * Existing copy comes from assets/locales/<lang>.json; strings that only the
 * redesign needs live in P below (en/fr/ar). The quote request and the
 * wizard work for real (prototype storage keys, WhatsApp link at the end).
 */
(function () {
  'use strict';

  /* ───────────── Environment ───────────── */
  // Served from the repo (…/docs/redesign/) → data is two levels up.
  // Published as a flat bundle → data sits next to the page.
  var ROOT = /\/docs\/redesign\//.test(location.pathname) ? '../../' : './';
  // Flat bundle (hosted preview link): one page, views routed on the hash,
  // e.g. #ar-product-zennio-z50 · #fr-products-security · #en-services.
  var HASHNAV = ROOT === './';
  var PAGE = (document.body && document.body.getAttribute('data-page')) || 'home';
  var params = new URLSearchParams(location.search);
  var ANCHOR = '';
  var NAVQ = ''; // search text carried into the catalog view

  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  var LANGS = ['en', 'fr', 'ar'];
  var VIEWS = { products: 'catalog', product: 'product', brands: 'brands', brand: 'brand', projects: 'projects', project: 'project', notfound: '404' };
  var VIEW_OF = { home: '', catalog: 'products', product: 'product', brands: 'brands', brand: 'brand', projects: 'projects', project: 'project', '404': 'notfound' };
  function parseHash(h) {
    h = String(h || '').replace(/^#/, '');
    var m = /^(en|fr|ar)(?:-(.*))?$/.exec(h);
    if (!m) return null; // a plain in-page anchor such as #contact
    var rest = m[2] || '';
    var v = /^(products|product|brands|brand|projects|project|notfound)(?:-(.+))?$/.exec(rest);
    if (!v) return { lang: m[1], page: 'home', arg: '', anchor: rest };
    return { lang: m[1], page: VIEWS[v[1]], arg: v[2] || '', anchor: '' };
  }
  function applyRoute(r) {
    PAGE = r.page;
    params = new URLSearchParams();
    if (r.arg) params.set(PAGE === 'catalog' ? 'cat' : 'id', r.arg);
    ANCHOR = r.anchor;
  }
  function setLang(l) {
    lang = l;
    sset('proto-lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  var route = HASHNAV ? parseHash(location.hash) : null;
  var lang = route ? route.lang : params.get('lang');
  if (LANGS.indexOf(lang) < 0) lang = sget('proto-lang');
  if (LANGS.indexOf(lang) < 0) lang = 'en';
  if (route) applyRoute(route);
  setLang(lang);

  // Design variant under review: A Switchboard · B Villa · C Control (prototype only)
  var VARS = ['a', 'b', 'c', 'd'];
  var V = new URLSearchParams(location.search).get('v');
  if (VARS.indexOf(V) < 0) V = 'd'; // D adopted 2026-11-19; ?v=a|b|c still opens the old variants

  var WHATSAPP = '212654132112';
  var PHONE = '+212 654-132112';

  /* ───────────── Strings only the redesign needs ───────────── */
  var P = {
    en: {
      nav_products: 'Products', nav_projects: 'Projects', nav_services: 'Services', nav_contact: 'Contact', menu: 'Menu',
      logo_sub: 'Smart home · Tetouan',
      hero_kicker: 'Tetouan · Morocco',
      hero_title: 'Electrical craft,<br>with a <em>smart</em> touch.',
      fact_products: 'products in the catalogue', fact_brands: 'partner brands', fact_protocols: 'protocols supported',
      hero_cap: 'KNX villa · Tetouan', fig: '{n}', plate: '',
      edge: 'S‑Electricity · Tetouan · Morocco',
      strip_label: 'Brands we install & support',
      sec_expertise: 'Services', svc_go: 'See the products', svc_ask: 'Ask about this service', f_clear: 'Clear', f_done: 'Done', f_cats: 'Categories', svc_msg: 'Hello S-ELECTRICITY, I would like to ask about: {t}',
      svc_shutters: 'Motorised shutters & curtains', svc_intercom: 'Video intercoms', svc_access: 'Access control', svc_mesh: 'Mesh coverage for large homes', svc_ap: 'Access points & network switches', svc_office: 'Networks for offices & shops',
      sec_catalogue: 'Categories', cat_title: 'Browse by category',
      cat_lead: 'Every product we install, sorted by category.',
      drawer: 'Drawer {l}',
      sec_selection: 'Products', featured_title: 'Products we install',
      sec_field: 'Projects', case_study: 'Read the case study', all_projects: 'All projects',
      sec_questions: 'FAQ', faq_aside: 'Still unsure? Ask us directly — we answer on WhatsApp.',
      ticket_kicker: 'Free consultation',
      ftr_explore: 'Explore', ftr_catalogue: 'Catalogue', ftr_location: 'Tetouan, Morocco',
      cat_kicker: 'Catalogue · {n}', search_ph: 'Search by name, brand or protocol…', all: 'All',
      results: 'Showing <b>{a}</b> of {n}', sort: 'Sort', sort_featured: 'Featured', sort_name: 'Name A–Z', sort_brand: 'Brand',
      load_more: 'Load more', show_n: 'Show {n}',
      empty_title: 'No product matches these filters',
      empty_text: 'Remove a filter, or tell us what you need — we answer on WhatsApp.',
      ask_whatsapp: 'Ask on WhatsApp', add_short: '+ Add', added: 'Added', view: 'View',
      about_product: 'About this product', specs_more: 'Show all {n} specifications', specs_less: 'Show fewer',
      more_in: 'More in {c}',
      brands_kicker: 'Partners · {n}', since: 'since {y}', in_catalogue: 'in the catalogue',
      founded: 'Founded', country: 'Country', products_lbl: 'Products', website: 'Official website',
      brand_products: '{b} in our catalogue', other_brands: 'Other brands',
      pw_kicker: 'Portfolio · {n}', pw_title: 'Our installations',
      completed: 'Completed', duration: 'Duration', location: 'Location', scope: 'Scope',
      case_n: 'Project {n}', the_project: 'The project', client_words: 'In the client’s words',
      products_used: 'Products installed', next_project: 'Next project', watch_reel: 'Watch on Instagram',
      nf_kicker: 'Error 404', nf_title: 'This circuit is <em>open</em>.', nf_search: 'Search the catalogue',
      wiz_q_contact: 'Last step — where is the project?', wiz_contact_hint: 'Both fields are optional.',
      proto: 'Prototype', proto_note: 'Design proposal — not the live site', video_cap: 'Footage from a real installation', sec_demo: 'Try it', demo_hint: 'Tap a scene: the lights, facade and shutters of the villa follow the panel.', sec_clients: 'Clients', clients_title: 'Who we work with', clients_lead: 'Pick your type of building and the questions adapt to it.', cl_villa: 'Villas &amp; riads', cl_villa_d: 'Lighting, shutters, climate and security on one system.', cl_apt: 'Apartments', cl_apt_d: 'Smart switches and reliable Wi-Fi without heavy works.', cl_shop: 'Restaurants &amp; shops', cl_shop_d: 'Lighting scenes, cameras and a network that holds.', cl_office: 'Offices', cl_office_d: 'Access, cameras, network and energy control.', cl_pro: 'Builders &amp; architects', cl_pro_d: 'KNX design and wiring for your projects, from plans to handover.', sec_method: 'Method', method_title: 'How we work', st1: 'Visit', st1d: 'We visit the site and listen to how you use each space.', st2: 'Design &amp; quote', st2d: 'A clear plan of circuits, devices and costs before any work starts.', st3: 'Installation', st3d: 'Wiring, panel and devices, installed by our own team.', st4: 'Programming', st4d: 'Scenes, schedules and the app, set up and tested with you.', st5: 'Support', st5d: 'We stay reachable on WhatsApp after handover.', show_all: 'Show all {n}', st_on: 'On', st_off: 'Off', st_open: 'Open', st_closed: 'Closed', custom: 'Custom', room_villa: 'Villa · Facade', simulation: 'Simulation', ctl_facade: 'Facade lights', shut_open: 'Open shutters', shut_close: 'Close shutters', scene_alt: 'Villa facade at dusk; its lights and shutters follow the panel', room: 'Living room', ctl_lights: 'Lights', ctl_shutters: 'Shutters', ctl_climate: 'Climate', sc_dinner: 'Dinner', sc_movie: 'Movie', sc_sleep: 'Sleep', sc_away: 'Away'
    },
    fr: {
      nav_products: 'Produits', nav_projects: 'Réalisations', nav_services: 'Services', nav_contact: 'Contact', menu: 'Menu',
      logo_sub: 'Maison intelligente · Tétouan',
      hero_kicker: 'Tétouan · Maroc',
      hero_title: 'L’artisanat électrique,<br>avec une touche <em>intelligente</em>.',
      fact_products: 'produits au catalogue', fact_brands: 'marques partenaires', fact_protocols: 'protocoles pris en charge',
      hero_cap: 'Villa KNX · Tétouan', fig: '{n}', plate: '',
      edge: 'S‑Electricity · Tétouan · Maroc',
      strip_label: 'Marques que nous installons',
      sec_expertise: 'Services', svc_go: 'Voir les produits', svc_ask: 'Demander ce service', f_clear: 'Effacer', f_done: 'OK', f_cats: 'Catégories', svc_msg: 'Bonjour S-ELECTRICITY, je voudrais des informations sur : {t}',
      svc_shutters: 'Volets et rideaux motorisés', svc_intercom: 'Interphones vidéo', svc_access: 'Contrôle d’accès', svc_mesh: 'Couverture mesh pour grandes maisons', svc_ap: 'Points d’accès et switchs réseau', svc_office: 'Réseaux pour bureaux et commerces',
      sec_catalogue: 'Catégories', cat_title: 'Parcourir par catégorie',
      cat_lead: 'Tous les produits que nous installons, classés par catégorie.',
      drawer: 'Tiroir {l}',
      sec_selection: 'Produits', featured_title: 'Produits que nous installons',
      sec_field: 'Réalisations', case_study: 'Lire l’étude de cas', all_projects: 'Toutes les réalisations',
      sec_questions: 'FAQ', faq_aside: 'Un doute ? Écrivez-nous directement — nous répondons sur WhatsApp.',
      ticket_kicker: 'Consultation gratuite',
      ftr_explore: 'Explorer', ftr_catalogue: 'Catalogue', ftr_location: 'Tétouan, Maroc',
      cat_kicker: 'Catalogue · {n}', search_ph: 'Rechercher par nom, marque ou protocole…', all: 'Tout',
      results: '<b>{a}</b> sur {n}', sort: 'Trier', sort_featured: 'Sélection', sort_name: 'Nom A–Z', sort_brand: 'Marque',
      load_more: 'Afficher plus', show_n: 'Afficher {n}',
      empty_title: 'Aucun produit ne correspond à ces filtres',
      empty_text: 'Retirez un filtre, ou dites-nous ce qu’il vous faut — nous répondons sur WhatsApp.',
      ask_whatsapp: 'Demander sur WhatsApp', add_short: '+ Ajouter', added: 'Ajouté', view: 'Voir',
      about_product: 'À propos du produit', specs_more: 'Voir les {n} caractéristiques', specs_less: 'Réduire',
      more_in: 'Plus dans {c}',
      brands_kicker: 'Partenaires · {n}', since: 'depuis {y}', in_catalogue: 'au catalogue',
      founded: 'Fondée', country: 'Pays', products_lbl: 'Produits', website: 'Site officiel',
      brand_products: '{b} dans notre catalogue', other_brands: 'Autres marques',
      pw_kicker: 'Portfolio · {n}', pw_title: 'Nos réalisations',
      completed: 'Livré', duration: 'Durée', location: 'Lieu', scope: 'Périmètre',
      case_n: 'Projet {n}', the_project: 'Le projet', client_words: 'La parole au client',
      products_used: 'Produits installés', next_project: 'Projet suivant', watch_reel: 'Voir sur Instagram',
      nf_kicker: 'Erreur 404', nf_title: 'Ce circuit est <em>ouvert</em>.', nf_search: 'Rechercher dans le catalogue',
      wiz_q_contact: 'Dernière étape — où se trouve le projet ?', wiz_contact_hint: 'Les deux champs sont facultatifs.',
      proto: 'Prototype', proto_note: 'Proposition de design — pas le site en ligne', video_cap: 'Images d’une installation réelle', sec_demo: 'Essayez', demo_hint: 'Touchez une scène : l’éclairage, la façade et les volets de la villa suivent l’écran.', sec_clients: 'Clients', clients_title: 'Avec qui nous travaillons', clients_lead: 'Choisissez votre type de bâtiment, les questions s’y adaptent.', cl_villa: 'Villas &amp; riads', cl_villa_d: 'Éclairage, volets, climat et sécurité sur un seul système.', cl_apt: 'Appartements', cl_apt_d: 'Interrupteurs connectés et Wi-Fi fiable sans gros travaux.', cl_shop: 'Restaurants &amp; commerces', cl_shop_d: 'Ambiances lumineuses, caméras et un réseau qui tient.', cl_office: 'Bureaux', cl_office_d: 'Accès, caméras, réseau et maîtrise de l’énergie.', cl_pro: 'Promoteurs &amp; architectes', cl_pro_d: 'Étude KNX et câblage pour vos projets, du plan à la remise.', sec_method: 'Méthode', method_title: 'Notre façon de travailler', st1: 'Visite', st1d: 'Nous visitons le site et écoutons vos usages, pièce par pièce.', st2: 'Étude &amp; devis', st2d: 'Un plan clair des circuits, équipements et coûts avant tout travail.', st3: 'Installation', st3d: 'Câblage, tableau et équipements, posés par notre équipe.', st4: 'Programmation', st4d: 'Scènes, horaires et application, réglés et testés avec vous.', st5: 'Suivi', st5d: 'Nous restons joignables sur WhatsApp après la remise.', show_all: 'Tout afficher ({n})', st_on: 'Allumé', st_off: 'Éteint', st_open: 'Ouverts', st_closed: 'Fermés', custom: 'Personnalisé', room_villa: 'Villa · Façade', simulation: 'Simulation', ctl_facade: 'Éclairage façade', shut_open: 'Ouvrir les volets', shut_close: 'Fermer les volets', scene_alt: 'Façade de villa au crépuscule ; éclairage et volets suivent l’écran', room: 'Salon', ctl_lights: 'Éclairage', ctl_shutters: 'Volets', ctl_climate: 'Climat', sc_dinner: 'Dîner', sc_movie: 'Film', sc_sleep: 'Nuit', sc_away: 'Absence'
    },
    ar: {
      nav_products: 'المنتجات', nav_projects: 'أعمالنا', nav_services: 'خدماتنا', nav_contact: 'اتصل بنا', menu: 'القائمة',
      logo_sub: 'المنزل الذكي · تطوان',
      hero_kicker: 'تطوان · المغرب',
      hero_title: 'حرفة كهربائية أصيلة،<br><em>بلمسة ذكية</em>.',
      fact_products: 'منتجاً في الكتالوج', fact_brands: 'علامات شريكة', fact_protocols: 'بروتوكولات مدعومة',
      hero_cap: 'فيلا KNX · تطوان', fig: '{n}', plate: '',
      edge: 'S‑Electricity · تطوان · المغرب',
      strip_label: 'علامات نركّبها وندعمها',
      sec_expertise: 'خدماتنا', svc_go: 'المنتجات المرتبطة', svc_ask: 'اطلب هذه الخدمة', f_clear: 'مسح', f_done: 'تم', f_cats: 'الفئات', svc_msg: 'مرحباً S-ELECTRICITY، أريد الاستفسار عن خدمة: {t}',
      svc_shutters: 'الستائر والمصاريع الآلية', svc_intercom: 'أنظمة الإنتركم بالفيديو', svc_access: 'التحكم في الدخول', svc_mesh: 'تغطية mesh للمنازل الكبيرة', svc_ap: 'نقاط الوصول ومحوّلات الشبكة', svc_office: 'شبكات المكاتب والمحلات',
      sec_catalogue: 'الفئات', cat_title: 'تصفّح حسب الفئة',
      cat_lead: 'كل المنتجات التي نركّبها، مرتّبة حسب الفئة.',
      drawer: 'الدرج {l}',
      sec_selection: 'المنتجات', featured_title: 'منتجات نركّبها',
      sec_field: 'المشاريع', case_study: 'اقرأ تفاصيل المشروع', all_projects: 'كل المشاريع',
      sec_questions: 'أسئلة شائعة', faq_aside: 'ما زال لديك سؤال؟ اسألنا مباشرة — نجيبك عبر واتساب.',
      ticket_kicker: 'استشارة مجانية',
      ftr_explore: 'استكشف', ftr_catalogue: 'الكتالوج', ftr_location: 'تطوان، المغرب',
      cat_kicker: 'الكتالوج · {n}', search_ph: 'ابحث بالاسم أو العلامة أو البروتوكول…', all: 'الكل',
      results: 'يُعرض <b>{a}</b> من أصل {n}', sort: 'الترتيب', sort_featured: 'المقترح', sort_name: 'الاسم أ–ي', sort_brand: 'العلامة',
      load_more: 'عرض المزيد', show_n: 'عرض النتائج ({n})',
      empty_title: 'لا يوجد منتج يطابق هذه الفلاتر',
      empty_text: 'أزل أحد الفلاتر، أو أخبرنا بما تحتاجه — نجيبك عبر واتساب.',
      ask_whatsapp: 'اسأل عبر واتساب', add_short: '+ أضف', added: 'أُضيف', view: 'عرض',
      about_product: 'عن هذا المنتج', specs_more: 'عرض كل المواصفات ({n})', specs_less: 'عرض أقل',
      more_in: 'المزيد من {c}',
      brands_kicker: 'الشركاء · {n}', since: 'منذ {y}', in_catalogue: 'في الكتالوج',
      founded: 'التأسيس', country: 'البلد', products_lbl: 'المنتجات', website: 'الموقع الرسمي',
      brand_products: 'منتجات {b} في الكتالوج', other_brands: 'علامات أخرى',
      pw_kicker: 'معرض الأعمال · {n}', pw_title: 'أعمالنا المنجزة',
      completed: 'التسليم', duration: 'المدة', location: 'الموقع', scope: 'النطاق',
      case_n: 'مشروع {n}', the_project: 'المشروع', client_words: 'بكلمات العميل',
      products_used: 'المنتجات المركّبة', next_project: 'المشروع التالي', watch_reel: 'شاهد على إنستغرام',
      nf_kicker: 'خطأ 404', nf_title: 'هذه الدائرة <em>مفتوحة</em>.', nf_search: 'ابحث في الكتالوج',
      wiz_q_contact: 'الخطوة الأخيرة — أين يقع المشروع؟', wiz_contact_hint: 'الحقلان اختياريان.',
      proto: 'نموذج أولي', proto_note: 'مقترح تصميم — ليس الموقع المنشور', video_cap: 'لقطات من تركيب حقيقي', sec_demo: 'جرّبها', demo_hint: 'اضغط مشهداً: إضاءة الفيلا وواجهتها وستائرها تتبع اللوحة.', sec_clients: 'عملاؤنا', clients_title: 'مع من نعمل', clients_lead: 'اختر نوع المبنى وتتكيّف الأسئلة معه.', cl_villa: 'الفلل والرياضات', cl_villa_d: 'الإضاءة والستائر والتكييف والأمان في نظام واحد.', cl_apt: 'الشقق', cl_apt_d: 'مفاتيح ذكية وواي فاي مستقر دون أشغال كبيرة.', cl_shop: 'المطاعم والمحلات', cl_shop_d: 'مشاهد إضاءة وكاميرات وشبكة مستقرة.', cl_office: 'المكاتب', cl_office_d: 'التحكم في الدخول والكاميرات والشبكة والطاقة.', cl_pro: 'المنعشون العقاريون والمهندسون', cl_pro_d: 'دراسة KNX وتمديدات لمشاريعكم، من المخطط إلى التسليم.', sec_method: 'طريقة العمل', method_title: 'كيف نعمل', st1: 'المعاينة', st1d: 'نزور الموقع ونسمع كيف تستعمل كل مساحة.', st2: 'الدراسة والعرض', st2d: 'مخطط واضح للدوائر والأجهزة والتكلفة قبل أي عمل.', st3: 'التركيب', st3d: 'التمديدات واللوحة والأجهزة، يركّبها فريقنا.', st4: 'البرمجة', st4d: 'نضبط المشاهد والجداول والتطبيق ونجرّبها معك.', st5: 'المتابعة', st5d: 'نبقى معك عبر واتساب بعد التسليم.', show_all: 'عرض الكل ({n})', st_on: 'مشغّلة', st_off: 'مطفأة', st_open: 'مفتوحة', st_closed: 'مغلقة', custom: 'مخصّص', room_villa: 'الفيلا · الواجهة', simulation: 'محاكاة', ctl_facade: 'إضاءة الواجهة', shut_open: 'فتح الستائر', shut_close: 'إغلاق الستائر', scene_alt: 'واجهة فيلا عند الغسق، إضاءتها وستائرها تتبع اللوحة', room: 'الصالون', ctl_lights: 'الإضاءة', ctl_shutters: 'الستائر', ctl_climate: 'التكييف', sc_dinner: 'عشاء', sc_movie: 'فيلم', sc_sleep: 'نوم', sc_away: 'غياب'
    }
  };

  var COUNTRIES = {
    Spain: { fr: 'Espagne', ar: 'إسبانيا' }, Turkey: { fr: 'Turquie', ar: 'تركيا' },
    Bulgaria: { fr: 'Bulgarie', ar: 'بلغاريا' }, China: { fr: 'Chine', ar: 'الصين' }
  };

  var L = {}; // site dictionary for the current language (assets/locales)

  function s(key, vars) {
    var v = (P[lang] && P[lang][key] != null) ? P[lang][key]
      : (L[key] != null ? L[key] : (P.en[key] != null ? P.en[key] : key));
    if (vars) Object.keys(vars).forEach(function (k) { v = String(v).split('{' + k + '}').join(vars[k]); });
    return v;
  }
  function loc(o) { return o ? (o[lang] || o.en || '') : ''; }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function country(c) { return lang === 'en' ? c : ((COUNTRIES[c] || {})[lang] || c); }

  // Counted nouns. Arabic: 1 / 2 / 3–10 / 11+.
  var NOUNS = {
    product: { en: ['product', 'products'], fr: ['produit', 'produits'], ar: ['منتج واحد', 'منتجان', 'منتجات', 'منتجاً'] },
    brand: { en: ['brand', 'brands'], fr: ['marque', 'marques'], ar: ['علامة واحدة', 'علامتان', 'علامات', 'علامة'] },
    day: { en: ['day', 'days'], fr: ['jour', 'jours'], ar: ['يوم واحد', 'يومان', 'أيام', 'يوماً'] },
    project: { en: ['case study', 'case studies'], fr: ['étude de cas', 'études de cas'], ar: ['مشروع واحد', 'مشروعان', 'مشاريع', 'مشروعاً'] },
    media: { en: ['photo & video', 'photos & videos'], fr: ['photo et vidéo', 'photos et vidéos'], ar: ['صورة واحدة', 'صورتان', 'صور وفيديو', 'صورة وفيديو'] }
  };
  function count(n, noun) {
    var f = NOUNS[noun][lang];
    if (lang === 'ar') {
      if (n === 1) return f[0];
      if (n === 2) return f[1];
      return n + ' ' + (n >= 3 && n <= 10 ? f[2] : f[3]);
    }
    return n + ' ' + (n === 1 ? f[0] : f[1]);
  }

  function url(p) { return p && p.charAt(0) === '/' ? ROOT + p.slice(1) : p; }
  var PAGE_VIEW = { 'index.html': '', 'products.html': 'products', 'product.html': 'product', 'brands.html': 'brands', 'brand.html': 'brand', 'projects.html': 'projects', 'project.html': 'project', '404.html': 'notfound' };
  function href(page, q) {
    if (HASHNAV) {
      var view = PAGE_VIEW[page] || '';
      var arg = q ? (page === 'products.html' ? q.cat : q.id) : '';
      return '#' + lang + (view ? '-' + view : '') + (view && arg ? '-' + arg : '');
    }
    var sp = new URLSearchParams();
    Object.keys(q || {}).forEach(function (k) { if (q[k] != null && q[k] !== '') sp.set(k, q[k]); });
    if (lang !== 'en') sp.set('lang', lang);
    var qs = sp.toString();
    return page + (qs ? '?' + qs : '');
  }
  function currentRest() {
    var view = VIEW_OF[PAGE] || '';
    var arg = PAGE === 'catalog' ? (ST && ST.cat !== 'all' ? ST.cat : '') : (params.get('id') || '');
    return view + (view && arg ? '-' + arg : '');
  }
  function anchorHref(name) { return HASHNAV ? '#' + lang + '-' + name : href('index.html') + '#' + name; }
  function langHref(l) {
    if (HASHNAV) { var rest = currentRest(); return '#' + l + (rest ? '-' + rest : ''); }
    var sp = new URLSearchParams(location.search);
    sp.set('lang', l);
    return (location.pathname.split('/').pop() || '') + '?' + sp.toString() + location.hash;
  }

  /* ───────────── Data ───────────── */
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(ROOT + path).then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + path);
        return r.json();
      });
    }
    return cache[path];
  }

  var TAX = null, CAT = {}, TYPE = {}, INST = {}, PCAT = {};
  var PRODUCTS = [], PBYID = {}, BRANDS = [], BBYNAME = {};

  function brandSlug(name) { return String(name).toLowerCase().replace(/\s+/g, '-'); }
  function catLabel(id) { return CAT[id] ? loc(CAT[id].label) : id; }
  function typeLabel(id) { return TYPE[id] ? loc(TYPE[id].label) : id; }
  function instLabel(id) { return INST[id] ? loc(INST[id]) : id; }
  function pcatLabel(id) { return PCAT[id] ? loc(PCAT[id]) : id; }

  function boot() {
    return Promise.all([
      getJSON('assets/locales/' + lang + '.json'),
      getJSON('data/taxonomy.json'),
      getJSON('data/products_index.json'),
      getJSON('data/brands_index.json')
    ]).then(function (r) {
      L = r[0] || {};
      TAX = r[1];
      TAX.categories.forEach(function (c) {
        CAT[c.id] = c;
        c.types.forEach(function (t) { TYPE[t.id] = t; });
      });
      TAX.installations.forEach(function (i) { INST[i.id] = i.label; });
      TAX.project_categories.forEach(function (c) { PCAT[c.id] = c.label; });
      PRODUCTS = r[2];
      PRODUCTS.forEach(function (p) { PBYID[p.id] = p; });
      BRANDS = r[3].slice().sort(function (a, b) { return b.product_count - a.product_count; });
      BRANDS.forEach(function (b) { BBYNAME[b.brand] = b; });
    });
  }

  /* ───────────── Icons ───────────── */
  var I = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    quote: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 3h6v3H9z"/><path d="M8.5 11h7M8.5 15h4.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    media: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
    blinds: '<path d="M4 4h16M5 4v12M19 4v12M5 8h14M5 12h14M5 16h14M12 16v4"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
    sconce: '<rect x="9" y="8" width="6" height="8" rx="1.5"/><path d="M9.5 6 7.5 2.5M14.5 6l2-3.5M9.5 18l-2 3.5M14.5 18l2 3.5"/>',
    dinner: '<path d="M7 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 12v9"/><path d="M17 21V3c-2 1.2-3 3.6-3 6.5V13h3"/>',
    movie: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 9 4 2-4 2z"/>',
    sleep: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    plan: '<path d="M3 3h18v18H3z"/><path d="M3 10h8v11M11 14h10M15 3v4"/>',
    away: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><rect x="9.5" y="13.5" width="5" height="4.5" rx="1"/><path d="M10.5 13.5V12a1.5 1.5 0 0 1 3 0v1.5"/>',
    // wizard options
    villa: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    apartment: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M11 21v-3h2v3"/>',
    shop: '<path d="M4 9h16l-1.5-5h-13z"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>',
    office: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    restaurant: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M15 3c2 2 2.5 6 0 9v9"/>',
    farm: '<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M12 21V10"/><path d="m12 14 3-3M12 12 9 9"/>',
    other: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
    smart_home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M9.5 15.5a3.5 3.5 0 0 1 5 0M8 13.5a5.7 5.7 0 0 1 8 0"/>',
    electrical: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    cameras: '<path d="M3 7h12l4 3v4l-4 3H3z"/><circle cx="9" cy="12" r="2.5"/><path d="M19 10.5 22 9v6l-3-1.5"/>',
    network: '<path d="M5 12.55a11 11 0 0 1 14 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/><path d="M12 20h.01"/>'
  };
  function ic(name, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (cls ? ' class="' + cls + '"' : '') + '>' + (I[name] || '') + '</svg>';
  }
  var WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z"/></svg>';

  // Protocol strip — same dictionary as SE.protoMarkup on the live site
  var PROTO = {
    wifi: '<path d="M5 12.55a11 11 0 0114 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    bt: '<polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/>',
    lan: '<path d="m15 20 3-3h2a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2l3 3z"/><path d="M6 8v1"/><path d="M10 8v1"/><path d="M14 8v1"/><path d="M18 8v1"/>',
    zwave: '<path d="M16.247 7.761a6 6 0 0 1 0 8.478"/><path d="M19.075 4.933a10 10 0 0 1 0 14.134"/><path d="M4.925 19.067a10 10 0 0 1 0-14.134"/><path d="M7.753 16.239a6 6 0 0 1 0-8.478"/><circle cx="12" cy="12" r="2"/>'
  };
  var PROTO_FILL = {
    zigbee: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><path d="M32.042,9.792c4.595,1.238,4.88,3.165,5.524,5.048C34.841,17.664,17.35,35.7,17.35,35.7s10.901,1.177,23.487-1.003c-0.001,0.029-0.002,0.048-0.003,0.076C42.829,31.661,44,27.97,44,24c0-11.046-8.954-20-20-20c-5.634,0-10.715,2.338-14.35,6.087C15.489,9.124,26.89,8.403,32.042,9.792z"/><path d="M14.724,37.285c-1.982-0.347-4.212-2.131-4.707-5.302c1.437-1.239,19.994-20.507,19.994-20.507c-7.008-0.424-14.569-0.465-22.237,0.864C5.408,15.625,4,19.644,4,24c0,11.046,8.954,20,20,20c6.173,0,11.689-2.8,15.358-7.195C35.486,37.33,23.257,38.769,14.724,37.285z"/></svg>',
    matter: '<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M152 134.4c21.5 17.5 47.1 29.2 74.4 34.2V22.9l29.7-17.1 29.6 17.1v145.6c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.6-228.5 86.6-316.1 0zm65.5 371.8C248.7 387 178.1 264.9 59.3 232.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 414.9v34.2l29.7 17 126.1-72.8c9.4 26.1 12 54.2 7.6 81.5zm235.3-273.7C334 265 263.6 387.1 294.8 506.2l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.5l126 72.7 29.6-17.1v-34.2l-126.1-72.8c17.9-21.2 40.9-37.5 66.8-47.4z"/></svg>',
    thread: '<svg viewBox="0 0 165 165" fill="currentColor" aria-hidden="true"><path d="M82.498,0C37.008,0,0,37.008,0,82.496c0,45.181,36.51,81.977,81.573,82.476V82.569l-27.002-0.002c-8.023,0-14.554,6.53-14.554,14.561c0,8.023,6.531,14.551,14.554,14.551v17.98c-17.939,0-32.534-14.595-32.534-32.531c0-17.944,14.595-32.543,32.534-32.543l27.002,0.004v-9.096c0-14.932,12.146-27.08,27.075-27.08c14.932,0,27.082,12.148,27.082,27.08c0,14.931-12.15,27.08-27.082,27.08l-9.097-0.001v80.641C136.889,155.333,165,122.14,165,82.496C165,37.008,127.99,0,82.498,0z"/><path d="M117.748,55.493c0-5.016-4.082-9.098-9.1-9.098c-5.015,0-9.097,4.082-9.097,9.098v9.097l9.097,0.001C113.666,64.591,117.748,60.51,117.748,55.493z"/></svg>'
  };
  function proto(tech) {
    var t = String(tech).toLowerCase();
    var stroke = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var icon = '';
    if (t.indexOf('knx') >= 0) return '<span class="proto proto-knx">KNX</span>';
    if (t.indexOf('wi-fi') >= 0 || t.indexOf('wifi') >= 0) icon = stroke(PROTO.wifi);
    else if (t.indexOf('bluetooth') >= 0) icon = stroke(PROTO.bt);
    else if (t.indexOf('zigbee') >= 0) icon = PROTO_FILL.zigbee;
    else if (t.indexOf('matter') >= 0) icon = PROTO_FILL.matter;
    else if (t.indexOf('thread') >= 0) icon = PROTO_FILL.thread;
    else if (t.indexOf('lan') >= 0 || t.indexOf('ethernet') >= 0 || t.indexOf('poe') >= 0) icon = stroke(PROTO.lan);
    else if (t.indexOf('z-wave') >= 0) icon = stroke(PROTO.zwave);
    return '<span class="proto">' + icon + esc(tech) + '</span>';
  }
  function protos(list) {
    return list && list.length ? '<div class="protos">' + list.map(proto).join('') + '</div>' : '';
  }

  /* ───────────── Images ───────────── */
  function srcset(desc) {
    return (desc.srcset || '').split(',').map(function (part) {
      var bits = part.trim().split(/\s+/);
      return url(bits[0]) + (bits[1] ? ' ' + bits[1] : '');
    }).join(', ');
  }
  function pimg(desc, sizes, alt, eager) {
    if (!desc) return '';
    return '<img class="prod-img" src="' + esc(url(desc.src)) + '"' +
      (desc.srcset && !HASHNAV ? ' srcset="' + esc(srcset(desc)) + '" sizes="' + esc(sizes) + '"' : '') +
      (desc.width ? ' width="' + desc.width + '" height="' + desc.height + '"' : '') +
      ' alt="' + esc(alt || '') + '"' + (eager ? '' : ' loading="lazy"') + ' decoding="async">';
  }
  function brandLogo(name, cls) {
    var b = BBYNAME[name];
    if (b && b.logo) return '<img class="' + (cls || '') + '" src="' + esc(url(b.logo)) + '" alt="' + esc(name) + '" loading="lazy">';
    return '<span class="card-logo-text">' + esc(name) + '</span>';
  }

  /* ───────────── Quote request (prototype storage) ───────────── */
  var QUOTE = [];
  try { QUOTE = JSON.parse(sget('proto-quote') || '[]') || []; } catch (e) { QUOTE = []; }
  QUOTE = QUOTE.filter(function (x) { return x && x.id; });
  function qFind(id) { for (var i = 0; i < QUOTE.length; i++) if (QUOTE[i].id === id) return QUOTE[i]; return null; }
  function qTotal() { return QUOTE.reduce(function (n, x) { return n + x.qty; }, 0); }
  function qSave() {
    sset('proto-quote', JSON.stringify(QUOTE));
    var n = qTotal();
    document.querySelectorAll('[data-quote-count]').forEach(function (el) { el.textContent = n ? String(n) : ''; });
    document.querySelectorAll('[data-add]').forEach(function (b) { paintAdd(b); });
    if (drawerOpen) renderDrawer();
  }
  function qAdd(id, n) {
    var it = qFind(id);
    if (it) it.qty += n; else QUOTE.push({ id: id, qty: n });
    qSave();
  }
  function qSet(id, n) {
    var it = qFind(id);
    if (!it) return;
    if (n <= 0) QUOTE = QUOTE.filter(function (x) { return x.id !== id; }); else it.qty = n;
    qSave();
  }
  function addBtn(id) {
    return '<button class="btn-add" type="button" data-add="' + esc(id) + '"></button>';
  }
  function paintAdd(b) {
    var on = !!qFind(b.getAttribute('data-add'));
    if (b.getAttribute('data-painted') === (on ? '1' : '0')) return; // unchanged: don't touch the DOM (re-layout)
    b.setAttribute('data-painted', on ? '1' : '0');
    b.classList.toggle('is-added', on);
    b.innerHTML = on
      ? ic('check') + '<span>' + esc(s('added')) + '</span>'
      : '<span class="lbl-long">' + esc(s('cart_add_to_quote')) + '</span><span class="lbl-short">' + esc(s('add_short')) + '</span>';
    b.setAttribute('aria-label', s('cart_aria_add_btn'));
  }

  /* ───────────── Shared blocks ───────────── */
  // Section head = the electrician's label: breaker designation (Q1, Q2…) + name
  function ruler(n, label, meta) {
    return '<div class="sh"><span class="kicker">' + esc(label) + '</span>' +
      '<span class="sh-line"></span>' + (meta ? '<span class="sh-meta">' + esc(meta) + '</span>' : '') + '</div>';
  }
  // IEC wire colours: brown, black, grey (phases), blue (neutral), green-yellow (earth)
  function wires() {
    return '<div class="wires" aria-hidden="true"><i class="br"></i><i class="bk"></i><i class="gy"></i><i class="bl"></i><i class="pe"></i></div>';
  }
  function chunk(a, n) { var out = []; for (var i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; }
  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (i ? ic('chev', 'sep') : '') + (last
        ? '<span aria-current="page">' + esc(it[0]) + '</span>'
        : '<a href="' + esc(it[1]) + '">' + esc(it[0]) + '</a>');
    }).join('') + '</nav>';
  }

  function card(p) {
    var link = href('product.html', { id: p.id });
    var title = loc(p.title);
    return '<article class="card crop-host">' +
      '<a class="card-media recess crop" href="' + esc(link) + '" tabindex="-1" aria-hidden="true">' +
        pimg(p.image, '(max-width: 820px) 46vw, 300px', '') + '</a>' +
      '<div class="card-body">' +
        '<p class="card-kicker">' + esc(typeLabel(p.product_type)) + '</p>' +
        '<h3 class="card-title"><a href="' + esc(link) + '">' + esc(title) + '</a></h3>' +
        protos(p.technology) +
      '</div>' +
      '<div class="card-foot">' + brandLogo(p.brand, 'card-logo') + addBtn(p.id) + '</div>' +
    '</article>';
  }
  function mini(p) {
    if (!p) return '';
    return '<div class="mini"><div class="mini-media recess">' + pimg(p.image, '84px', '') + '</div>' +
      '<div><h4><a href="' + esc(href('product.html', { id: p.id })) + '">' + esc(loc(p.title)) + '</a></h4>' +
      '<p>' + esc(p.brand) + ' · ' + esc(typeLabel(p.product_type)) + '</p></div></div>';
  }

  var PLUG_SVG = '<svg class="plug" viewBox="0 0 160 110" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 80c24 0 28-24 50-24h4"/><rect x="58" y="43" width="28" height="26" rx="7"/><path d="M86 50h11M86 62h11"/>' +
    '<path d="M106 44l7-5M108 56h9M106 68l7 5" opacity=".55"/>' +
    '<rect x="124" y="32" width="32" height="48" rx="10"/><circle cx="135" cy="56" r="2.6" fill="currentColor"/><circle cx="145" cy="56" r="2.6" fill="currentColor"/></svg>';

  function header() {
    var cur = { catalog: 'products', product: 'products', brands: 'brands', brand: 'brands', projects: 'projects', project: 'projects' }[PAGE];
    var links = [
      ['products', href('products.html'), s('nav_products')],
      ['brands', href('brands.html'), s('nav_brands')],
      ['projects', href('projects.html'), s('nav_projects')],
      ['services', anchorHref('services'), s('nav_services')],
      ['contact', '#contact', s('nav_contact')]
    ];
    var langs = LANGS.map(function (l) {
      return '<a href="' + esc(langHref(l)) + '" data-lang="' + l + '" class="' + (l === lang ? 'on' : '') + '" hreflang="' + l + '" lang="' + l + '">' +
        (l === 'ar' ? 'ع' : l.toUpperCase()) + '</a>';
    }).join('');
    return '<header class="hdr"><div class="wrap hdr-in">' +
      '<a class="logo" href="' + esc(href('index.html')) + '" aria-label="' + esc(s('logo_alt_link')) + '">' +
        '<img src="' + url('/assets/logocircular.webp') + '" alt="" width="42" height="42">' +
        '<span class="logo-word"><b>S‑ELECTRICITY</b><small>' + esc(s('logo_sub')) + '</small></span></a>' +
      '<nav class="nav" aria-label="Main">' + links.map(function (l) {
        return '<a href="' + esc(l[1]) + '"' + (l[0] === cur ? ' aria-current="page"' : '') + '>' + esc(l[2]) + '</a>';
      }).join('') + '</nav>' +
      '<div class="hdr-tools">' +
        '<div class="lang" role="group" aria-label="Language">' + langs + '</div>' +
        '<button class="icon-btn" type="button" data-open-quote aria-label="' + esc(s('cart_aria_open')) + '">' + ic('quote') + '<span class="count" data-quote-count></span></button>' +
        '<button class="btn btn-primary btn-sm hdr-cta" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + '</button>' +
        '<button class="icon-btn burger" type="button" data-menu aria-expanded="false" aria-label="' + esc(s('menu')) + '">' + ic('menu') + '</button>' +
      '</div></div>' + wires() + '</header>' +
      '<div class="menu" id="menu"><nav>' + links.map(function (l, i) {
        return '<a href="' + esc(l[1]) + '">' + esc(l[2]) + '<span>0' + (i + 1) + '</span></a>';
      }).join('') + '</nav><div class="menu-foot"><div class="lang">' + langs + '</div>' +
      '<button class="btn btn-primary btn-sm" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + '</button></div></div>';
  }

  function footer() {
    var cats = TAX.categories.slice(0, 6).map(function (c) {
      return '<li><a href="' + esc(href('products.html', { cat: c.id })) + '">' + esc(loc(c.label)) + '</a></li>';
    }).join('');
    return '<footer class="ftr" id="contact"><div class="wrap">' +
      '<div class="ftr-grid">' +
        '<div class="ftr-about"><a class="logo" href="' + esc(href('index.html')) + '"><img src="' + url('/assets/logocircular.webp') + '" alt="" width="42" height="42">' +
          '<span class="logo-word"><b>S‑ELECTRICITY</b><small>' + esc(s('logo_sub')) + '</small></span></a>' +
          '<p>' + esc(s('spa_tagline')) + '</p></div>' +
        '<div><h4>' + esc(s('ftr_explore')) + '</h4><ul>' +
          '<li><a href="' + esc(href('products.html')) + '">' + esc(s('nav_products')) + '</a></li>' +
          '<li><a href="' + esc(href('brands.html')) + '">' + esc(s('nav_brands')) + '</a></li>' +
          '<li><a href="' + esc(href('projects.html')) + '">' + esc(s('nav_projects')) + '</a></li>' +
          '<li><a href="' + esc(anchorHref('services')) + '">' + esc(s('nav_services')) + '</a></li>' +
          '<li><button type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + '</button></li>' +
        '</ul></div>' +
        '<div><h4>' + esc(s('ftr_catalogue')) + '</h4><ul>' + cats + '</ul></div>' +
        '<div><h4>' + esc(s('spa_contact')) + '</h4><ul class="ftr-contact">' +
          '<li>' + ic('phone') + '<a href="tel:+212654132112" dir="ltr">' + PHONE + '</a></li>' +
          '<li>' + WA_ICON.replace('<svg', '<svg width="16" height="16"') + '<a href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + esc(s('spa_cta_whatsapp')) + '</a></li>' +
          '<li>' + ic('pin') + '<span>' + esc(s('ftr_location')) + '</span></li>' +
        '</ul></div>' +
      '</div>' +
      '<div class="ftr-base"><span>' + esc(s('spa_copyright')) + '</span><nav><a href="#">' + esc(s('spa_privacy_policy')) + '</a><a href="#">' + esc(s('spa_terms_of_service')) + '</a></nav></div>' +
    '</div></footer>';
  }

  function ticket() {
    return '<section class="wrap sec-tight"><div class="cta">' +
      '<div class="cta-copy"><span class="kicker">' + esc(s('ticket_kicker')) + '</span>' +
        '<h2 class="h2">' + esc(s('spa_need_custom')) + '</h2><p>' + esc(s('spa_team')) + '</p></div>' +
      '<div class="cta-side">' +
        '<button class="btn btn-primary" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + '</button>' +
        '<a class="btn btn-line" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + WA_ICON + esc(s('spa_cta_whatsapp')) + '</a>' +
        '<a class="readout" href="tel:+212654132112" dir="ltr">' + PHONE + '</a>' +
      '</div></div></section>';
  }

  function projectPlate(pj, full, i) {
    var t = full && full.testimonial;
    var date = fmtDate(pj.date);
    return '<article class="plate crop-host">' +
      '<a class="plate-media crop" href="' + esc(href('project.html', { id: pj.id })) + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + esc(url(pj.cover)) + '" alt="" loading="lazy"></a>' +
      '<div class="plate-body">' +
        '<span class="kicker plate-n">' + esc(s('case_n', { n: pad(i + 1) })) + '</span>' +
        '<h3 class="h3"><a href="' + esc(href('project.html', { id: pj.id })) + '">' + esc(loc(pj.title)) + '</a></h3>' +
        '<div class="plate-meta"><span>' + ic('pin') + esc(locCity(pj.location)) + '</span><span>' + ic('cal') + esc(date) + '</span>' +
          (pj.media_count ? '<span>' + ic('media') + esc(count(pj.media_count, 'media')) + '</span>' : '') + '</div>' +
        '<p>' + esc(loc(pj.short_description)) + '</p>' +
        '<div class="plate-tags">' + (pj.categories || []).map(function (c) { return '<span class="chip">' + esc(pcatLabel(c)) + '</span>'; }).join('') + '</div>' +
        (t ? '<blockquote class="quote-mini">' + esc(loc(t.quote)) + '<cite>— ' + esc(t.author) + '</cite></blockquote>' : '') +
        '<a class="link-arrow" href="' + esc(href('project.html', { id: pj.id })) + '">' + esc(s('case_study')) + ic('arrow') + '</a>' +
      '</div></article>';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : lang, { year: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00'));
    } catch (e) { return iso; }
  }
  function locCity(v) {
    if (lang === 'en' || !v) return v;
    var m = { 'Tetouan, Morocco': { fr: 'Tétouan, Maroc', ar: 'تطوان، المغرب' } };
    return (m[v] && m[v][lang]) || v;
  }

  // The hero panel: a KNX-style touch screen showing the villa. The photo is split into a
  // lights-off base and two light layers (screen-blended), so every scene is a few opacities
  // plus shutters that roll down — no video, no 3D, ~90 KB in total. See docs/redesign/media.
  var SCENE_GEO = {"int":{"left":43.152,"top":6.848,"width":38.696,"height":65.217},"ext":{"left":4.457,"top":14.674,"width":80.543,"height":85.326},"shutters":{"A":{"left":44.022,"top":7.717,"width":10.978,"height":18.804},"B":{"left":72.065,"top":17.717,"width":8.804,"height":18.478},"C":{"left":72.065,"top":62.174,"width":8.696,"height":8.913}}};
  var SCENES = {
    sc_dinner: { light: 80, facade: true, shut: false, clim: true, dim: 0 },
    sc_movie: { light: 20, facade: true, shut: true, clim: true, dim: 0.35 },
    sc_sleep: { light: 0, facade: false, shut: true, clim: true, dim: 0.55 },
    sc_away: { light: 0, facade: true, shut: true, clim: false, dim: 0.62 }
  };
  var HS = { light: 80, facade: true, shut: false, clim: true, dim: 0 };
  function media(f) { return 'media/' + f; }
  function geoStyle(g) { return 'left:' + g.left + '%;top:' + g.top + '%;width:' + g.width + '%;height:' + g.height + '%'; }
  var SCENE_ICON = { sc_dinner: 'dinner', sc_movie: 'movie', sc_sleep: 'sleep', sc_away: 'away' };
  var currentScene = 'sc_dinner';
  function panelDevice() {
    var up = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
    var down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    return '<div class="dev" id="dev" style="--dim:0"><div class="dev-face">' +
      '<span class="dev-sensor" aria-hidden="true"></span>' +
      '<div class="dev-top"><span><span class="led on"></span>' + esc(s('room_villa')) + '</span><small id="dev-scene">' + esc(s('sc_dinner')) + '</small></div>' +
      '<div class="screen">' +
        '<img class="sc-base" src="' + media('villa-night.webp') + '" alt="' + esc(s('scene_alt')) + '" width="920" height="920" fetchpriority="high">' +
        '<span class="sc-dim"></span>' +
        '<img class="sc-lt" id="lt-int" src="' + media('villa-light-int.webp') + '" alt="" style="' + geoStyle(SCENE_GEO.int) + ';opacity:0">' +
        ['A', 'B', 'C'].map(function (k) { return '<span class="shutter" style="' + geoStyle(SCENE_GEO.shutters[k]) + '"><i></i></span>'; }).join('') +
        '<img class="sc-lt" id="lt-ext" src="' + media('villa-light-ext.webp') + '" alt="" style="' + geoStyle(SCENE_GEO.ext) + ';opacity:0">' +
        '<span class="sim">' + esc(s('simulation')) + '</span>' +
      '</div>' +
      '<div class="dev-ctl">' +
        '<label class="key key-wide" id="key-light" data-type="light"><span class="key-head">' + ic('bulb') + '<span class="key-name">' + esc(s('ctl_lights')) + '</span>' +
          '<output class="key-val" id="dev-light-v">80%</output></span>' +
          '<input id="dev-light" type="range" min="0" max="100" step="10" value="80" aria-label="' + esc(s('ctl_lights')) + '"></label>' +
        '<button class="key" type="button" data-type="facade" data-dev="facade" aria-pressed="true"><span class="key-head">' + ic('sconce') + '<span class="led"></span></span>' +
          '<span class="key-name">' + esc(s('ctl_facade')) + '</span><span class="key-state" id="st-facade">' + esc(s('st_on')) + '</span></button>' +
        '<div class="key key-shut" data-type="shutter" role="group" aria-label="' + esc(s('ctl_shutters')) + '"><span class="key-head">' + ic('blinds') + '<span class="led"></span></span>' +
          '<span class="key-name">' + esc(s('ctl_shutters')) + '</span>' +
          '<span class="shut-btns"><button type="button" data-dev="open" aria-pressed="true" aria-label="' + esc(s('shut_open')) + '">' + up + '</button>' +
          '<button type="button" data-dev="close" aria-pressed="false" aria-label="' + esc(s('shut_close')) + '">' + down + '</button></span></div>' +
        '<button class="key" type="button" data-type="climate" data-dev="clim" aria-pressed="true"><span class="key-head">' + ic('thermo') + '<span class="led"></span></span>' +
          '<span class="key-name">' + esc(s('ctl_climate')) + '</span><span class="key-state" id="st-clim">22.5°</span></button>' +
      '</div>' +
      '<div class="scenes">' + Object.keys(SCENES).map(function (k, i) {
        return '<button type="button" class="scene-key" data-scene="' + k + '" aria-pressed="' + (i === 0) + '">' + ic(SCENE_ICON[k]) + '<span>' + esc(s(k)) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="dev-brand" aria-hidden="true">S‑ELECTRICITY</p>' +
    '</div></div>';
  }
  function applyHome() {
    var dev = document.getElementById('dev');
    if (!dev) return;
    dev.style.setProperty('--dim', String(HS.dim));
    document.getElementById('lt-int').style.opacity = String(Math.min(1, HS.light / 80));
    document.getElementById('lt-ext').style.opacity = HS.facade ? '1' : '0';
    dev.querySelectorAll('.shutter').forEach(function (el) { el.classList.toggle('closed', HS.shut); });
    var r = document.getElementById('dev-light');
    if (+r.value !== HS.light) r.value = HS.light;
    r.style.setProperty('--v', HS.light + '%');
    document.getElementById('dev-light-v').textContent = HS.light + '%';
    document.getElementById('key-light').classList.toggle('is-on', HS.light > 0);
    dev.querySelector('[data-dev="facade"]').setAttribute('aria-pressed', String(HS.facade));
    document.getElementById('st-facade').textContent = s(HS.facade ? 'st_on' : 'st_off');
    dev.querySelector('[data-dev="clim"]').setAttribute('aria-pressed', String(HS.clim));
    document.getElementById('st-clim').textContent = HS.clim ? '22.5°' : s('st_off');
    dev.querySelector('[data-dev="open"]').setAttribute('aria-pressed', String(!HS.shut));
    dev.querySelector('[data-dev="close"]').setAttribute('aria-pressed', String(HS.shut));
    dev.querySelector('.key-shut').classList.toggle('is-on', HS.shut);
    document.getElementById('dev-scene').textContent = s(currentScene || 'custom');
  }
  function customScene() { currentScene = ''; document.querySelectorAll('[data-scene]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
  function wireStrip() {
    var box = document.getElementById('bstrip');
    if (!box) return;
    var row = box.querySelector('.brand-logos'), rtl = document.documentElement.dir === 'rtl';
    function upd() {
      var max = row.scrollWidth - row.clientWidth, pos = Math.abs(row.scrollLeft);
      box.classList.toggle('is-scroll', max > 2);
      var before = pos > 2, after = pos < max - 2; // in reading direction
      row.style.setProperty('--fl', (rtl ? after : before) ? '0' : '1');
      row.style.setProperty('--fr', (rtl ? before : after) ? '0' : '1');
      box.querySelector('[data-bs="-1"]').disabled = !before;
      box.querySelector('[data-bs="1"]').disabled = !after;
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bs]');
      if (!b) return;
      row.scrollBy({ left: +b.getAttribute('data-bs') * row.clientWidth * 0.75 * (rtl ? -1 : 1), behavior: 'smooth' });
    });
    row.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
    setTimeout(upd, 400); // after logos load
  }
  function wireHome() {
    wireStrip();
    var main = document.getElementById('main');
    main.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-scene]'))) {
        currentScene = t.getAttribute('data-scene');
        var sc = SCENES[currentScene];
        Object.keys(sc).forEach(function (k) { HS[k] = sc[k]; });
        document.querySelectorAll('[data-scene]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
        applyHome();
      } else if ((t = e.target.closest('[data-dev]'))) {
        var k = t.getAttribute('data-dev');
        if (k === 'facade') HS.facade = !HS.facade;
        else if (k === 'clim') HS.clim = !HS.clim;
        else HS.shut = k === 'close';
        customScene(); applyHome();
      }
    });
    var range = document.getElementById('dev-light');
    if (range) range.addEventListener('input', function () { HS.light = +range.value; customScene(); applyHome(); });
    // the villa switches its lights on a moment after the page appears
    HS = { light: 80, facade: true, shut: false, clim: true, dim: 0 };
    currentScene = 'sc_dinner';
    setTimeout(applyHome, 350);
  }

  /* ───────────── Page: home ───────────── */
  function pageHome() {
    return getJSON('data/projects_index.json').then(function (projects) {
      return Promise.all(projects.map(function (pj) { return getJSON('data/projects/' + pj.id + '.json').catch(function () { return null; }); }))
        .then(function (full) { return renderHome(projects, full); });
    });
  }
  function renderHome(projects, full) {
    var techCount = TAX.technologies.length;
    var catCounts = {};
    PRODUCTS.forEach(function (p) { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });

    var hero =
      '<section class="hero dark" id="hero"><div class="wrap hero-grid"><div class="reveal">' +
          '<span class="tape">' + esc(s('hero_kicker')) + '</span>' +
          '<h1 class="display">' + s('hero_title') + '</h1>' +
          '<p class="lead">' + esc(s('spa_tagline')) + '</p>' +
          '<div class="actions"><button class="btn btn-primary" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + ic('arrow', 'flip') + '</button>' +
            '<a class="btn btn-ghost" href="' + esc(href('products.html')) + '">' + esc(s('spa_browse_products')) + '</a></div>' +
          '<dl class="meter">' +
            '<div><dt>' + PRODUCTS.length + '</dt><dd>' + esc(s('fact_products')) + '</dd></div>' +
            '<div><dt>' + BRANDS.length + '</dt><dd>' + esc(s('fact_brands')) + '</dd></div>' +
            '<div><dt>' + techCount + '</dt><dd>' + esc(s('fact_protocols')) + '</dd></div>' +
          '</dl></div>' +
          '<figure class="hero-video"><video autoplay muted loop playsinline preload="metadata" poster="' + url('/assets/example01-poster.webp') + '" width="1280" height="720">' +
            '<source src="' + url('/assets/example01.mp4') + '" type="video/mp4"></video>' +
            '<figcaption><span class="led on"></span>' + esc(s('video_cap')) + '</figcaption></figure>' +
        '</div></section>';

    var chev = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
    var strip = '<section class="brand-strip" id="bstrip"><div class="wrap brand-strip-in"><div class="bs-head"><p class="brand-strip-label">' + esc(s('strip_label')) + '</p>' +
      '<span class="bs-nav"><button type="button" data-bs="-1" aria-label="‹">' + chev('m15 6-6 6 6 6') + '</button><button type="button" data-bs="1" aria-label="›">' + chev('m9 6 6 6-6 6') + '</button></span></div>' +
      '<div class="brand-logos">' + BRANDS.map(function (b) {
        return '<a href="' + esc(href('brand.html', { id: b.id })) + '" title="' + esc(b.brand) + '"><img src="' + esc(url(b.logo)) + '" alt="' + esc(b.brand) + '" loading="lazy"></a>';
      }).join('') + '</div></div></section>';

    var SVC = [
      { k: 'spa_feat_thermostats', items: ['spa_title_smart_lighting', 'svc_shutters', 'spa_title_thermostat', 'spa_title_voice_integration'], cat: 'controls', icon: 'smart_home' },
      { k: 'spa_feat_locks', items: ['spa_title_security_cameras', 'spa_title_smart_locks', 'svc_intercom', 'svc_access'], cat: 'security', icon: 'cameras' },
      { k: 'spa_feat_voice', items: ['spa_title_network', 'svc_mesh', 'svc_ap', 'svc_office'], cat: 'networking', icon: 'network' },
      { k: 'spa_feat_lighting', items: ['spa_title_electrical_installations', 'spa_title_power_distribution_panels', 'spa_title_lighting_fixture_installation', 'spa_title_cabling_wiring_solutions'], cat: 'system', icon: 'electrical' }
    ];
    var services = '<section class="sec" id="services"><div class="wrap">' +
      ruler('01', s('sec_expertise'), s('plate', { n: '02' })) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('spa_trusted_partner')) + '</h2><p class="lead">' + esc(s('spa_transform_house')) + '</p></div>' +
      '<div class="svc-list">' + SVC.map(function (v, i) {
        var raw = String(s(v.k)); var cut = raw.indexOf(' — ');
        var title = cut > 0 ? raw.slice(0, cut) : raw; var desc = cut > 0 ? raw.slice(cut + 3) : '';
        return '<div class="svc"><span class="svc-n">' + ic(v.icon) + '</span>' +
          '<div><h3 class="h3">' + esc(title) + '</h3><p>' + esc(desc) + '</p></div>' +
          '<ul class="svc-items">' + v.items.map(function (k) { return '<li>' + esc(s(k)) + '</li>'; }).join('') + '</ul>' +
          '<div class="svc-foot"><a class="link-arrow" href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(s('svc_msg', { t: title })) + '" target="_blank" rel="noopener">' + esc(s('svc_ask')) + ic('arrow') + '</a>' +
            '<a class="svc-prod" href="' + esc(href('products.html', { cat: v.cat })) + '">' + esc(s('svc_go')) + '</a></div></div>';
      }).join('') + '</div></div></section>';

    var cats = TAX.categories.filter(function (c) { return catCounts[c.id]; });
    var catPhoto = catImg;
    var drawers = '<section class="sec"><div class="wrap">' +
      ruler('02', s('sec_catalogue'), count(PRODUCTS.length, 'product')) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('cat_title')) + '</h2><p class="lead">' + esc(s('cat_lead')) + '</p></div>' +
      '<div class="board">' + chunk(cats, 4).map(function (row, r) {
        return '<div class="board-row"><div class="brks">' + row.map(function (c, i) {
          return '<a class="brk" href="' + esc(href('products.html', { cat: c.id })) + '">' +
            '<span class="brk-top"><span>Q2.' + (r * 4 + i + 1) + '</span><span class="led"></span></span>' +
            '<span class="brk-img recess">' + pimg(catPhoto(c.id), '200px', '') + '</span>' +
            '<span class="brk-name">' + esc(loc(c.label)) + '</span>' +
            '<span class="brk-n">' + esc(count(catCounts[c.id], 'product')) + '</span></a>';
        }).join('') + '</div></div>';
      }).join('') + '</div></div></section>';

    var pick = [];
    ['Touch Panel', 'Switch', 'Indoor Monitor', 'Access Point', 'Dimmer', 'Smart Relay'].forEach(function (t) {
      var p = PRODUCTS.filter(function (x) { return x.product_type === t && x.image; })
        .sort(function (a, b) { return (b.image.width || 0) - (a.image.width || 0); })[0];
      if (p && pick.length < 4) pick.push(p);
    });
    var featured = '<section class="sec"><div class="wrap">' +
      ruler('03', s('sec_selection'), s('plate', { n: '04' })) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('featured_title')) + '</h2>' +
        '<div class="sec-aside"><p class="lead">' + esc(s('hp_products_subtitle')) + '</p>' +
        '<a class="link-arrow" href="' + esc(href('products.html')) + '">' + esc(s('hp_products_browse')) + ic('arrow') + '</a></div></div>' +
      '<div class="grid grid-4 rail">' + pick.map(card).join('') + '</div></div></section>';

    var work = '<section class="sec"><div class="wrap">' +
      ruler('04', s('sec_field'), s('plate', { n: '05' })) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('spa_recent_projects')) + '</h2>' +
        '<div class="sec-aside"><p class="lead">' + esc(s('spa_recent_projects_desc')) + '</p>' +
        '<a class="link-arrow" href="' + esc(href('projects.html')) + '">' + esc(s('all_projects')) + ic('arrow') + '</a></div></div>' +
      '<div class="plates">' + projects.map(function (pj, i) { return projectPlate(pj, full[i], i); }).join('') + '</div></div></section>';

    var QA = [['spa_q_services', 'spa_a_services'], ['spa_q_price', 'spa_a_prices'], ['spa_q_sell_products', 'spa_a_sell_products'], ['spa_q_schedule', 'spa_a_schedule']];
    var faq = '<section class="sec"><div class="wrap">' +
      ruler('05', s('sec_questions'), s('plate', { n: '06' })) +
      '<div class="faq-grid"><div class="faq-aside"><h2 class="h2">' + esc(s('spa_faq_title')) + '</h2><p class="lead">' + esc(s('faq_aside')) + '</p>' +
        // D: no WhatsApp button here — the closing contact block right below already has it
        (V === 'd' ? '' : '<div><a class="btn btn-line" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + WA_ICON + esc(s('spa_cta_whatsapp')) + '</a></div>') + '</div>' +
      '<div class="faq">' + QA.map(function (qa, i) {
        return '<details' + (i === 0 ? ' open' : '') + '><summary>' + esc(s(qa[0])) + '<span class="pm" aria-hidden="true"></span></summary><p class="ans">' + esc(s(qa[1])) + '</p></details>';
      }).join('') + '</div></div></div></section>';

    var CLIENTS = [['villa', 'villa', 'cl_villa'], ['apartment', 'apartment', 'cl_apt'], ['restaurant', 'restaurant', 'cl_shop'], ['office', 'office', 'cl_office'], ['', 'plan', 'cl_pro']];
    var clients = '<section class="sec-tight"><div class="wrap">' + ruler('', s('sec_clients')) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('clients_title')) + '</h2><p class="lead">' + esc(s('clients_lead')) + '</p></div>' +
      '<div class="clients">' + CLIENTS.map(function (c) {
        var inner = '<span class="client-ic">' + ic(c[1]) + '</span><span class="client-t"><b>' + s(c[2]) + '</b><span>' + esc(s(c[2] + '_d')) + '</span></span>' + ic('arrow', 'flip client-go');
        return c[0]
          ? '<button class="client" type="button" data-open-wizard="' + c[0] + '">' + inner + '</button>'
          : '<a class="client" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + inner + '</a>';
      }).join('') + '</div></div></section>';
    var method = '<section class="sec-tight"><div class="wrap">' + ruler('', s('sec_method')) +
      '<h2 class="h2" style="margin-block-end:30px">' + esc(s('method_title')) + '</h2>' +
      '<ol class="steps">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<li><span class="step-n">' + pad(n) + '</span><h3 class="h3">' + s('st' + n) + '</h3><p>' + esc(s('st' + n + 'd')) + '</p></li>';
      }).join('') + '</ol></div></section>';
    var demo = '<section class="sec"><div class="wrap demo">' +
      '<div class="demo-copy">' + ruler('', s('sec_demo')) + '<h2 class="h2">' + esc(s('spa_home_at_fingertips')) + '</h2>' +
        '<p class="lead">' + esc(s('spa_thanks_home_automation')) + '</p><p class="demo-hint">' + ic('bulb') + esc(s('demo_hint')) + '</p></div>' +
      panelDevice() + '</div></section>';
    var heroTxt = '<span class="tape">' + esc(s('hero_kicker')) + '</span>' +
      '<h1 class="display">' + s('hero_title') + '</h1>' +
      '<p class="lead">' + esc(s('spa_tagline')) + '</p>';
    var meter = '<dl class="meter">' +
      '<div><dt>' + PRODUCTS.length + '</dt><dd>' + esc(s('fact_products')) + '</dd></div>' +
      '<div><dt>' + BRANDS.length + '</dt><dd>' + esc(s('fact_brands')) + '</dd></div>' +
      '<div><dt>' + techCount + '</dt><dd>' + esc(s('fact_protocols')) + '</dd></div></dl>';
    var video = '<video autoplay muted loop playsinline preload="metadata" poster="' + url('/assets/example01-poster.webp') + '" width="1280" height="720">' +
      '<source src="' + url('/assets/example01.mp4') + '" type="video/mp4"></video>';

    // B — the film fills the screen; words sit on it
    var heroB = '<section class="hero-b dark" id="hero">' + video.replace('<video ', '<video class="hb-video" ') +
      '<div class="wrap hb-in"><div class="hb-copy reveal">' + heroTxt +
        '<div class="actions"><button class="btn btn-primary" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + ic('arrow', 'flip') + '</button>' +
        '<a class="btn btn-ghost" href="' + esc(href('products.html')) + '">' + esc(s('spa_browse_products')) + '</a></div></div>' +
        meter + '</div></section>';
    // C — the panel is the first thing you touch
    var heroC = '<section class="hero-c" id="hero"><div class="wrap demo hc-in"><div class="demo-copy reveal">' + heroTxt +
        '<div class="actions"><button class="btn btn-primary" type="button" data-open-wizard>' + esc(s('spa_cta_find_solution')) + ic('arrow', 'flip') + '</button>' +
        '<a class="btn btn-line" href="' + esc(href('products.html')) + '">' + esc(s('spa_browse_products')) + '</a></div>' +
        '<p class="demo-hint">' + ic('bulb') + esc(s('demo_hint')) + '</p></div>' +
      panelDevice() + '</div></section>';
    // B and C demo bands: B shows the panel on a dark band, C has it in the hero
    var demoB = demo.replace('<section class="sec">', '<section class="demo-band dark">');

    var catHead = ruler('', s('sec_catalogue'), count(PRODUCTS.length, 'product')) +
      '<div class="sec-head"><h2 class="h2">' + esc(s('cat_title')) + '</h2><p class="lead">' + esc(s('cat_lead')) + '</p></div>';
    var tiles = '<section class="sec" id="cats"><div class="wrap">' + catHead + '<div class="tiles' + (V === 'd' ? ' tiles-base' : '') + '">' + cats.map(function (c) {
      return '<a class="tile" href="' + esc(href('products.html', { cat: c.id })) + '"><span class="tile-img recess">' + pimg(catPhoto(c.id), '(max-width: 760px) 46vw, 280px', '') +
        '<span class="tile-n">' + catCounts[c.id] + '</span></span>' +
        '<span class="tile-t"><b>' + esc(loc(c.label)) + '</b><small>' + esc(count(catCounts[c.id], 'product')) + '</small></span>' +
        '<span class="tile-go">' + ic('arrow', 'flip') + '</span></a>';
    }).join('') + '</div></div></section>';
    var catlist = '<section class="sec"><div class="wrap">' + catHead + '<div class="catlist">' + cats.map(function (c) {
      return '<a class="catrow" href="' + esc(href('products.html', { cat: c.id })) + '"><span class="catrow-img recess">' + pimg(catPhoto(c.id), '72px', '') + '</span>' +
        '<span class="catrow-t"><b>' + esc(loc(c.label)) + '</b><small>' + esc(count(catCounts[c.id], 'product')) + '</small></span>' + ic('arrow', 'flip catrow-go') + '</a>';
    }).join('') + '</div></div></section>';

    var cta = ticket();
    if (V === 'd') return heroB + strip + clients + work + services + demoB + tiles + method + faq + cta;
    if (V === 'b') return heroB + strip + work + services + demoB + tiles + method + faq + cta;
    if (V === 'c') return heroC + strip + clients + catlist + featured + services + work + method + faq + cta;
    return hero + strip + drawers + services + demo + work + method + faq + cta;
  }

  /* ───────────── Page: catalog ───────────── */
  var ST = null;
  function pageCatalog() {
    var navq = NAVQ; NAVQ = '';
    CARDS = {}; // cards are built in the page language
    ST = {
      cat: params.get('cat') && CAT[params.get('cat')] ? params.get('cat') : 'all',
      q: params.get('q') || navq || '',
      type: new Set(), brand: new Set((params.get('brand') || '').split(',').filter(Boolean)),
      tech: new Set(), inst: new Set(), sort: 'featured', shown: 12
    };
    return Promise.resolve(
      '<section class="page-head cat-head"><div class="wrap">' +
        crumbs([[s('breadcrumb_home'), href('index.html')], [s('breadcrumb_products'), null]]) +
        '<div class="page-head-grid"><div class="reveal"><p class="kicker">' + esc(s('cat_kicker', { n: count(PRODUCTS.length, 'product') })) + '</p>' +
          '<h1 class="h2" id="cat-title"></h1><p class="lead" id="cat-lead"></p></div>' +
          '<label class="search"><span class="sr">' + esc(s('search_ph')) + '</span>' + ic('search') +
            '<input id="q" type="search" autocomplete="off" placeholder="' + esc(s('search_ph')) + '" value="' + esc(ST.q) + '"><kbd>/</kbd></label>' +
        '</div></div></section>' +
      catLayout()
    );
  }

  function catLayout() {
    var sortSel = '<label class="select"><span class="sr">' + esc(s('sort')) + '</span><select id="sort">' +
      '<option value="featured">' + esc(s('sort_featured')) + '</option><option value="name">' + esc(s('sort_name')) + '</option><option value="brand">' + esc(s('sort_brand')) + '</option></select></label>';
    var fbtn = '<button class="btn btn-line btn-sm btn-filters" type="button" data-filters>' + ic('filter') + esc(s('filters')) + '<span class="fg-n" id="fcount" hidden></span></button>';
    var count = '<p class="results-count" id="count"></p>';
    var aside = '<aside class="filters" id="filters" aria-label="' + esc(s('filters')) + '"></aside>';
    var res = '<div class="grid grid-4" id="grid"></div><div id="more"></div>';
    var chips = '<div class="active-chips" id="chips"></div>';
    // Catalog layout (owner picked 3 of 3 on 2026-11-19): sticky category tabs, one Filters button → drawer
    return '<div class="tabs-wrap"><div class="wrap rail-box">' + railArrows('<div class="cat-rail cat-line" id="rail" role="toolbar"></div>') + '</div></div>' +
      '<div class="wrap cat-body" id="cbody">' + aside + '<div class="toolbar tb3">' + fbtn + chips + '<div class="toolbar-r">' + count + sortSel + '</div></div>' + res + '</div>';
  }
  function hit(p, q) {
    if (!q) return true;
    var hay = [loc(p.title), p.title.en, p.brand, typeLabel(p.product_type), p.product_type, catLabel(p.category),
      (p.technology || []).join(' '), loc(p.short_description)].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }
  function match(p, skip) {
    if (skip !== 'cat' && ST.cat !== 'all' && p.category !== ST.cat) return false;
    if (!hit(p, ST.q)) return false;
    if (skip !== 'type' && ST.type.size && !ST.type.has(p.product_type)) return false;
    if (skip !== 'brand' && ST.brand.size && !ST.brand.has(p.brand)) return false;
    if (skip !== 'tech' && ST.tech.size && !(p.technology || []).some(function (t) { return ST.tech.has(t); })) return false;
    if (skip !== 'inst' && ST.inst.size && !ST.inst.has(p.installation)) return false;
    return true;
  }
  function tally(skip, keyFn) {
    var m = {};
    PRODUCTS.forEach(function (p) {
      if (!match(p, skip)) return;
      [].concat(keyFn(p)).forEach(function (k) { m[k] = (m[k] || 0) + 1; });
    });
    return m;
  }

  function catImg(id) { // the category's product with the largest photo
    return (PRODUCTS.filter(function (p) { return p.category === id && p.image; })
      .sort(function (a, b) { return (b.image.width || 0) - (a.image.width || 0); })[0] || {}).image;
  }
  // Speed: a filter click used to rebuild the rail, the drawer and all cards (≈15 ms here, 4–6× on a
  // cheap phone). Now the rail/drawer/chips are patched in place (only changed counts, states, text)
  // and product cards are kept per product, so their photos are never re-created or re-decoded.
  function morph(el, html) {
    if (!el) return;
    if (!el.firstChild || !document.createElement || !el.ownerDocument || !window.DOMParser) { el.innerHTML = html; return; }
    var tpl = document.createElement('template'); tpl.innerHTML = html;
    patchKids(el, tpl.content);
  }
  function patchKids(a, b) {
    var ak = a.childNodes, bk = Array.prototype.slice.call(b.childNodes), i;
    for (i = 0; i < bk.length; i++) {
      var x = ak[i], y = bk[i];
      if (!x) { a.appendChild(y); continue; }
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y, x); continue; }
      if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
      if (x.nodeType !== 1) continue;
      var j, at;
      for (j = x.attributes.length - 1; j >= 0; j--) { at = x.attributes[j].name; if (!y.hasAttribute(at)) x.removeAttribute(at); }
      for (j = 0; j < y.attributes.length; j++) { at = y.attributes[j]; if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value); }
      if (x.nodeName === 'INPUT' && x.checked !== y.hasAttribute('checked')) x.checked = y.hasAttribute('checked');
      if (x.nodeName === 'DETAILS') { /* keep the visitor's open/closed state */ }
      patchKids(x, y);
    }
    while (ak.length > bk.length) a.removeChild(a.lastChild);
  }
  var CARDS = {}; // product id → its card element, reused across filter changes
  function cardsInto(grid, list) {
    if (!document.createElement || !grid.replaceChildren) { grid.innerHTML = list.map(card).join(''); return; }
    var els = list.map(function (p) {
      var el = CARDS[p.id];
      if (!el) { var tp = document.createElement('template'); tp.innerHTML = card(p); el = CARDS[p.id] = tp.content.firstElementChild; }
      return el;
    });
    var same = grid.children.length === els.length && els.every(function (el, i) { return grid.children[i] === el; });
    if (!same) grid.replaceChildren.apply(grid, els);
  }
  var CAT_TOTAL = null;
  function renderCatalog() {
    if (!CAT_TOTAL) { CAT_TOTAL = {}; PRODUCTS.forEach(function (p) { CAT_TOTAL[p.category] = (CAT_TOTAL[p.category] || 0) + 1; }); }
    // rail
    var catN = tally('cat', function (p) { return p.category; });
    var allN = 0; Object.keys(catN).forEach(function (k) { allN += catN[k]; });
    morph(document.getElementById('rail'),
      '<button class="cat-tab" type="button" data-cat="all" aria-pressed="' + (ST.cat === 'all') + '">' + '<span class="ct-t">' + esc(s('all')) + '</span><span class="n">' + allN + '</span></button>' +
      TAX.categories.filter(function (c) { return CAT_TOTAL[c.id] || ST.cat === c.id; }).map(function (c) {
        var n = catN[c.id] || 0;
        return '<button class="cat-tab' + (n ? '' : ' is-zero') + '" type="button" data-cat="' + c.id + '" aria-pressed="' + (ST.cat === c.id) + '">' +
          '<span class="ct-t">' + esc(loc(c.label)) + '</span><span class="n">' + n + '</span></button>';
      }).join(''));

    // heading
    var c = CAT[ST.cat];
    var title = c ? loc(c.label) : s('products_title'), tEl = document.getElementById('cat-title');
    if (tEl.textContent !== title) tEl.textContent = title;
    var lead = c ? c.types.map(function (t) { return loc(t.label); }).join(' · ') : s('products_desc'), lEl = document.getElementById('cat-lead');
    if (lEl.textContent !== lead) lEl.textContent = lead;

    // filters — the drawer starts with the categories (one choice, same as the tabs)
    var catGroup = (function () {
      var key = 'cat', picked = ST.cat !== 'all' ? 1 : 0;
      var open = key in FOPEN ? FOPEN[key] : true;
      var rows = [['all', s('all'), allN]].concat(TAX.categories.filter(function (c) { return CAT_TOTAL[c.id] || ST.cat === c.id; })
        .map(function (c) { return [c.id, loc(c.label), catN[c.id] || 0]; }));
      return '<details class="fgroup" data-fg="cat"' + (open ? ' open' : '') + '><summary><h3>' + esc(s('f_cats')) + '</h3>' +
        (picked ? '<span class="fg-n">1</span>' : '') + '<span class="fg-chev" aria-hidden="true"></span></summary><div class="fg-body fcats">' +
        rows.map(function (r) {
          return '<button type="button" class="fcat' + (r[2] || ST.cat === r[0] ? '' : ' is-zero') + '" data-cat="' + r[0] + '" aria-pressed="' + (ST.cat === r[0]) + '">' +
            '<span class="lbl">' + esc(r[1]) + '</span><span class="n">' + r[2] + '</span></button>';
        }).join('') + '</div></details>';
    })();
    var groups = [];
    if (c && c.types.length > 1) {
      var tn = tally('type', function (p) { return p.product_type; });
      groups.push(['type', s('filter_product_type'), c.types.map(function (t) { return [t.id, loc(t.label), tn[t.id] || 0, '']; }), true]);
    }
    var bn = tally('brand', function (p) { return p.brand; });
    groups.push(['brand', s('filter_brand'), BRANDS.map(function (b) { return [b.brand, b.brand, bn[b.brand] || 0, '']; })]);
    var xn = tally('tech', function (p) { return p.technology || []; });
    groups.push(['tech', s('filter_technology'), TAX.technologies.map(function (t) {
      var icon = proto(t.id).replace(/^<span[^>]*>/, '').replace(/[^>]*<\/span>$/, '');
      return [t.id, t.id, xn[t.id] || 0, t.id === 'KNX' ? '' : icon];
    })]);
    var inN = tally('inst', function (p) { return p.installation; });
    groups.push(['inst', s('filter_installation'), TAX.installations.map(function (i) { return [i.id, loc(i.label), inN[i.id] || 0, '']; })]);

    var list = PRODUCTS.filter(function (p) { return match(p); });
    if (ST.sort === 'name') list.sort(function (a, b) { return loc(a.title).localeCompare(loc(b.title), lang); });
    if (ST.sort === 'brand') list.sort(function (a, b) { return a.brand.localeCompare(b.brand) || loc(a.title).localeCompare(loc(b.title), lang); });

    // patched in place, so the drawer keeps its own scroll position (reading/writing scrollTop here forced extra page layouts)
    var fEl = document.getElementById('filters');
    if (fEl) morph(fEl,
      '<div class="filters-head"><h2 class="h3">' + esc(s('filters')) + '</h2><button class="x-btn" type="button" data-close aria-label="' + esc(s('wizard_close')) + '">' + ic('x') + '</button></div>' +
      catGroup + groups.map(function (g) { return fgroup(g[0], g[1], g[2], g[3]); }).join('') +
      '<div class="filters-apply"><button class="btn btn-primary btn-block" type="button" data-close>' + esc(s('show_n', { n: list.length })) + '</button></div>');
    var picked = ST.type.size + ST.brand.size + ST.tech.size + ST.inst.size, fc = document.getElementById('fcount');
    if (fc) { fc.hidden = !picked; fc.textContent = picked; }

    // chips
    var chips = [];
    if (ST.q) chips.push(['q', ST.q, '“' + ST.q + '”']);
    ST.type.forEach(function (v) { chips.push(['type', v, typeLabel(v)]); });
    ST.brand.forEach(function (v) { chips.push(['brand', v, v]); });
    ST.tech.forEach(function (v) { chips.push(['tech', v, v]); });
    ST.inst.forEach(function (v) { chips.push(['inst', v, instLabel(v)]); });
    morph(document.getElementById('chips'), chips.map(function (ch) {
      return '<button class="chip chip-x" type="button" data-unset="' + ch[0] + '" data-v="' + esc(ch[1]) + '">' + esc(ch[2]) + ic('x') + '</button>';
    }).join('') + (chips.length > 1 ? '<button class="chip" type="button" data-clear>' + esc(s('clear_all')) + '</button>' : ''));

    // results
    var shown = list.slice(0, ST.shown);
    morph(document.getElementById('count'), s('results', { a: shown.length, n: count(list.length, 'product') }));
    var grid = document.getElementById('grid');
    if (!list.length) {
      grid.className = '';
      grid.innerHTML = '<div class="empty">' + PLUG_SVG + '<h3 class="h3">' + esc(s('empty_title')) + '</h3><p>' + esc(s('empty_text')) + '</p>' +
        '<div class="actions" style="justify-content:center"><button class="btn btn-primary" type="button" data-clear>' + esc(s('clear_all')) + '</button>' +
        '<a class="btn btn-line" href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener">' + WA_ICON + esc(s('ask_whatsapp')) + '</a></div></div>';
    } else {
      if (grid.className !== 'grid grid-4') { grid.className = 'grid grid-4'; grid.innerHTML = ''; }
      cardsInto(grid, shown);
    }
    morph(document.getElementById('more'), list.length > shown.length
      ? '<div class="load-more"><div class="bar"><span style="width:' + Math.round(shown.length / list.length * 100) + '%"></span></div>' +
        '<p>' + s('results', { a: shown.length, n: count(list.length, 'product') }) + '</p>' +
        '<button class="btn btn-line" type="button" data-more>' + esc(s('load_more')) + '</button></div>'
      : '');
    document.querySelectorAll('#grid [data-add]').forEach(paintAdd);

    var q = {};
    if (ST.cat !== 'all') q.cat = ST.cat;
    if (ST.q) q.q = ST.q;
    if (ST.brand.size) q.brand = Array.from(ST.brand).join(',');
    try { history.replaceState(null, '', href('products.html', q)); } catch (e) { /* sandboxed */ }
    railNav();
  }
  // Category tabs that don't fit: the row scrolls (swipe, mouse wheel, or the arrows at its ends);
  // the arrow + edge fade only show on a side that has more tabs hidden.
  function railDir() { return document.documentElement.dir === 'rtl' ? -1 : 1; }
  function railNav() {
    if (!document.querySelectorAll) return;
    Array.prototype.forEach.call(document.querySelectorAll('.rail-box'), function (box) {
      var rl = box.querySelector('.cat-rail'); if (!rl) return;
      var max = rl.scrollWidth - rl.clientWidth, at = Math.abs(rl.scrollLeft);
      box.classList.toggle('can-start', at > 2);
      box.classList.toggle('can-end', max - at > 2);
    });
  }
  // One rail: scroll + wheel listeners, and its two arrows
  function wireRail(rl) {
    if (!rl || !rl.parentNode) return;
    rl.addEventListener('scroll', railNav, { passive: true });
    rl.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = rl.scrollWidth - rl.clientWidth, at = Math.abs(rl.scrollLeft), fwd = e.deltaY > 0;
      if (max < 2 || (fwd && max - at < 2) || (!fwd && at < 2)) return; // at an end: let the page scroll
      e.preventDefault(); rl.scrollLeft += railDir() * e.deltaY;
    }, { passive: false });
    rl.parentNode.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rail]'); if (!b) return;
      rl.scrollBy({ left: +b.getAttribute('data-rail') * railDir() * rl.clientWidth * 0.7, behavior: 'smooth' });
    });
    if (!railNav.on) { railNav.on = 1; window.addEventListener('resize', railNav); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(railNav);
    railNav();
  }
  function railCenter(t) {
    if (!t) return; var rl = t.parentNode;
    rl.scrollTo({ left: t.offsetLeft - (rl.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
  }
  function railArrows(inner) {
    return '<button type="button" class="rail-btn rail-prev" data-rail="-1" tabindex="-1" aria-hidden="true"></button>' + inner +
      '<button type="button" class="rail-btn rail-next" data-rail="1" tabindex="-1" aria-hidden="true"></button>';
  }
  // Filter groups fold: the first one starts open, a group with a choice in it stays open,
  // and whatever the visitor opened or closed is kept while the list re-renders.
  var FOPEN = {};
  function fgroup(key, title, opts, first) {
    var picked = ST[key].size;
    var open = key in FOPEN ? FOPEN[key] : (first || picked > 0);
    return '<details class="fgroup" data-fg="' + key + '"' + (open ? ' open' : '') + '><summary><h3>' + esc(title) + '</h3>' +
      (picked ? '<span class="fg-n">' + picked + '</span>' : '') + '<span class="fg-chev" aria-hidden="true"></span></summary><div class="fg-body">' + opts.map(function (o) {
      var on = ST[key].has(o[0]);
      return '<label class="fopt' + (o[2] || on ? '' : ' is-zero') + '"><input type="checkbox" data-f="' + key + '" value="' + esc(o[0]) + '"' + (on ? ' checked' : '') + '>' +
        '<span class="lbl">' + (o[3] || '') + esc(o[1]) + '</span><span class="n">' + o[2] + '</span></label>';
    }).join('') + '</div></details>';
  }
  function wireCatalog() {
    wireRail(document.getElementById('rail'));
    var fEl0 = document.getElementById('filters');
    if (fEl0) fEl0.addEventListener('toggle', function (e) {
      var g = e.target.getAttribute && e.target.getAttribute('data-fg');
      if (g) FOPEN[g] = e.target.open;
    }, true);
    var input = document.getElementById('q');
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { ST.q = input.value.trim(); ST.shown = 12; renderCatalog(); }, 160);
    });
    document.getElementById('sort').addEventListener('change', function (e) { ST.sort = e.target.value; renderCatalog(); });
    document.getElementById('main').addEventListener('change', function (e) {
      var f = e.target.getAttribute('data-f');
      if (!f) return;
      if (e.target.checked) ST[f].add(e.target.value); else ST[f].delete(e.target.value);
      ST.shown = 12; renderCatalog();
    });
    document.getElementById('main').addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-rail]')) return; // handled by wireRail
      if ((t = e.target.closest('[data-fclear]'))) {
        ST[t.getAttribute('data-fclear')].clear(); ST.shown = 12; renderCatalog();
        return;
      }
      if ((t = e.target.closest('[data-cat]'))) {
        ST.cat = t.getAttribute('data-cat'); ST.type.clear(); ST.shown = 12; renderCatalog();
        railCenter(document.querySelector('#rail [data-cat="' + ST.cat + '"]'));
      } else if ((t = e.target.closest('[data-unset]'))) {
        var k = t.getAttribute('data-unset');
        if (k === 'q') { ST.q = ''; input.value = ''; } else ST[k].delete(t.getAttribute('data-v'));
        renderCatalog();
      } else if (e.target.closest('[data-clear]')) {
        ST.q = ''; input.value = ''; ['type', 'brand', 'tech', 'inst'].forEach(function (k) { ST[k].clear(); });
        renderCatalog();
      } else if (e.target.closest('[data-more]')) {
        ST.shown += 12; renderCatalog();
      } else if (e.target.closest('[data-filters]')) {
        document.getElementById('filters').classList.add('open'); scrim(true); lock(true);
      }
    });
    renderCatalog();
  }

  /* ───────────── Page: product ───────────── */
  function pageProduct() {
    var id = params.get('id') || 'shelly-pro-dual-cover-shutter-pm';
    return Promise.all([getJSON('data/products/' + id + '.json'), getJSON('data/product_images.json')]).then(function (r) {
      var p = r[0], imgs = (r[1] || {})[id] || [], idx = PBYID[id] || {};
      var cat = idx.category, title = loc(p.title);
      document.title = title + ' | S‑ELECTRICITY';
      var related = PRODUCTS.filter(function (x) { return x.category === cat && x.id !== id; });
      related.sort(function (a, b) { return (b.brand === p.brand) - (a.brand === p.brand); });
      related = related.slice(0, 4);
      var specs = (p.specs && (p.specs[lang] || p.specs.en)) || {};
      var specKeys = Object.keys(specs);
      var files = p.files || [];

      var gallery = '<div class="pd-gallery"><div class="pd-stage recess crop static" id="stage">' +
          pimg(imgs[0], '(max-width: 960px) 92vw, 560px', title, true) +
          '<span class="pd-fig" id="fig">' + esc(s('fig', { n: '01' })) + ' / ' + pad(Math.max(imgs.length, 1)) + '</span></div>' +
        (imgs.length > 1 ? '<div class="pd-thumbs">' + imgs.map(function (d, i) {
          return '<button class="pd-thumb recess" type="button" data-thumb="' + i + '" aria-current="' + (i === 0) + '" aria-label="' + esc(s('fig', { n: pad(i + 1) })) + '">' + pimg(d, '76px', '') + '</button>';
        }).join('') + '</div>' : '') + '</div>';

      var info = '<div class="pd-info">' +
        '<div class="pd-eyebrow"><a href="' + esc(href('brand.html', { id: brandSlug(p.brand) })) + '">' + brandLogo(p.brand, '') + '</a><span class="dash"></span><span>' + esc(typeLabel(p.product_type)) + '</span></div>' +
        '<h1 class="h2 pd-title">' + esc(title) + '</h1>' +
        '<p class="pd-short">' + esc(loc(p.short_description)) + '</p>' +
        '<dl class="pd-cells">' +
          '<div class="pd-cell recess"><dt>' + esc(s('pd_protocols')) + '</dt><dd>' + protos(p.technology) + '</dd></div>' +
          '<div class="pd-cell recess"><dt>' + esc(s('pd_installation')) + '</dt><dd>' + esc(instLabel(p.installation)) + '</dd></div>' +
          '<div class="pd-cell recess"><dt>' + esc(s('filter_category')) + '</dt><dd><a href="' + esc(href('products.html', { cat: cat })) + '">' + esc(catLabel(cat)) + '</a></dd></div>' +
        '</dl>' +
        '<div class="pd-buy" id="buy"><div class="pd-buy-row">' +
          '<div class="qty"><button type="button" data-qty="-1" aria-label="' + esc(s('cart_aria_decrease')) + '">' + ic('minus') + '</button><output id="qty">1</output>' +
            '<button type="button" data-qty="1" aria-label="' + esc(s('cart_aria_increase')) + '">' + ic('plus') + '</button></div>' +
          '<button class="btn btn-primary" type="button" data-add-qty="' + esc(id) + '">' + ic('quote') + esc(s('cart_pd_add_btn')) + '</button></div>' +
          '<p class="pd-hint">' + WA_ICON + esc(s('cart_pd_hint')) + '</p></div>' +
        (files.length ? '<div><p class="label-sm">' + esc(s('downloads')) + '</p><div class="files">' + files.map(function (f) {
          return '<a class="file" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + ic('file') + esc(f.name) + '</a>';
        }).join('') + '</div></div>' : '') +
      '</div>';

      var LIMIT = 8;
      var specRows = specKeys.map(function (k, i) {
        return '<tr' + (i >= LIMIT ? ' data-extra hidden' : '') + '><th scope="row">' + esc(k) + '</th><td>' + esc(specs[k]) + '</td></tr>';
      }).join('');

      var more = '<div class="pd-more">' +
        '<section class="panel"><h2 class="h3">' + esc(s('about_product')) + '</h2><div class="prose"><p>' + esc(loc(p.description)) + '</p></div></section>' +
        (specKeys.length ? '<section class="panel"><h2 class="h3">' + esc(s('specifications')) + '</h2>' +
          '<table class="specs"><tbody>' + specRows + '</tbody></table>' +
          (specKeys.length > LIMIT ? '<button class="btn btn-line btn-sm specs-more" type="button" data-specs>' + esc(s('specs_more', { n: specKeys.length })) + '</button>' : '') +
        '</section>' : '') + '</div>';

      var rel = related.length ? '<section class="sec-tight"><div class="wrap">' +
        ruler('4', s('related_products'), s('more_in', { c: catLabel(cat) })) +
        '<div class="grid grid-4 rail">' + related.map(card).join('') + '</div></div></section>' : '';

      return '<div class="wrap" style="padding-block:clamp(22px,3vw,36px) 0">' +
        crumbs([[s('breadcrumb_home'), href('index.html')], [s('breadcrumb_products'), href('products.html')], [catLabel(cat), href('products.html', { cat: cat })], [title, null]]) +
        '<div class="pd reveal" style="margin-block-start:22px">' + gallery + info + '</div>' + more + '</div>' + rel +
        '<div class="buybar" id="buybar"><span class="buybar-t">' + esc(title) + '</span>' +
          '<button class="btn btn-primary btn-sm" type="button" data-add-qty="' + esc(id) + '">' + esc(s('cart_add_to_quote')) + '</button></div>';
    }).catch(function () {
      return '<div class="wrap"><div class="nf"><div><p class="kicker">404</p><h1 class="h2">' + esc(s('product_not_found')) + '</h1><p class="lead">' + esc(s('product_not_found_desc')) +
        '</p><p style="margin-top:24px"><a class="btn btn-primary" href="' + esc(href('products.html')) + '">' + esc(s('back_to_products_btn')) + '</a></p></div></div></div>';
    });
  }
  function wireProduct() {
    var stage = document.getElementById('stage');
    if (!stage) return;
    var qty = 1, out = document.getElementById('qty');
    var imgs = Array.prototype.slice.call(document.querySelectorAll('.pd-thumb img'));
    document.getElementById('main').addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-thumb]'))) {
        var i = +t.getAttribute('data-thumb');
        var src = imgs[i];
        var main = stage.querySelector('img');
        if (src && main) { main.src = src.src; main.srcset = src.srcset || ''; }
        document.querySelectorAll('[data-thumb]').forEach(function (b) { b.setAttribute('aria-current', String(b === t)); });
        document.getElementById('fig').textContent = s('fig', { n: pad(i + 1) }) + ' / ' + pad(imgs.length);
      } else if ((t = e.target.closest('[data-qty]'))) {
        qty = Math.max(1, Math.min(99, qty + (+t.getAttribute('data-qty'))));
        out.textContent = qty;
      } else if ((t = e.target.closest('[data-add-qty]'))) {
        qAdd(t.getAttribute('data-add-qty'), qty); toast();
        qty = 1; out.textContent = 1;
      } else if ((t = e.target.closest('[data-specs]'))) {
        var open = t.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('[data-extra]').forEach(function (r) { r.hidden = open; });
        t.setAttribute('aria-expanded', String(!open));
        t.textContent = open ? s('specs_more', { n: document.querySelectorAll('.specs tr').length }) : s('specs_less');
      }
    });
    var bar = document.getElementById('buybar'), buy = document.getElementById('buy');
    if (bar && buy && 'IntersectionObserver' in window) {
      document.body.classList.add('has-buybar');
      new IntersectionObserver(function (en) {
        bar.classList.toggle('show', !en[0].isIntersecting && en[0].boundingClientRect.top < 0);
      }).observe(buy);
    }
  }

  /* ───────────── Page: brands ───────────── */
  function pageBrands() {
    return Promise.all(BRANDS.map(function (b) { return getJSON('data/brands/' + b.id + '.json').catch(function () { return {}; }); })).then(function (full) {
      return '<section class="page-head"><div class="wrap">' +
        crumbs([[s('breadcrumb_home'), href('index.html')], [s('nav_brands'), null]]) +
        '<div class="page-head-grid"><div class="reveal"><p class="kicker">' + esc(s('brands_kicker', { n: count(BRANDS.length, 'brand') })) + '</p>' +
          '<h1 class="h2">' + esc(s('brands_hero_title')) + '</h1></div><p class="lead">' + esc(s('brands_hero_subtitle')) + '</p></div></div></section>' +
        '<section class="wrap"><div class="ledger">' + BRANDS.map(function (b, i) {
          var f = full[i] || {};
          return '<article class="ledger-row crop-host">' +
            '<div class="ledger-logo recess crop">' + (b.logo ? '<img src="' + esc(url(b.logo)) + '" alt="" loading="lazy">' : '') + '</div>' +
            '<div><div class="ledger-name"><h2 class="h3"><a href="' + esc(href('brand.html', { id: b.id })) + '">' + esc(b.brand) + '</a></h2>' +
              '<span class="ledger-origin">' + esc(country(b.country_of_origin)) + (f.founded ? ' · ' + esc(s('since', { y: f.founded })) : '') + '</span></div>' +
              '<p class="ledger-tag">' + esc(loc(b.tagline)) + '</p></div>' +
            '<div class="ledger-focus">' + protos(b.tech_focus) + '<div class="ledger-cats">' + (b.category_focus || []).map(function (c) {
              return '<span class="chip">' + esc(catLabel(c)) + '</span>'; }).join('') + '</div></div>' +
            '<div class="ledger-count"><b>' + b.product_count + '</b><span>' + esc(s('in_catalogue')) + '</span></div>' +
          '</article>';
        }).join('') + '</div></section>' + ticket();
    });
  }

  /* ───────────── Page: brand ───────────── */
  function pageBrand() {
    var id = params.get('id') || 'zennio';
    return getJSON('data/brands/' + id + '.json').then(function (b) {
      document.title = b.brand + ' | S‑ELECTRICITY';
      var mine = PRODUCTS.filter(function (p) { return p.brand === b.brand; });
      var techs = []; mine.forEach(function (p) { (p.technology || []).forEach(function (t) { if (techs.indexOf(t) < 0) techs.push(t); }); });
      var cats = TAX.categories.filter(function (c) { return mine.some(function (p) { return p.category === c.id; }); });
      return '<div class="wrap" style="padding-block:clamp(22px,3vw,36px) 0">' +
        crumbs([[s('breadcrumb_home'), href('index.html')], [s('nav_brands'), href('brands.html')], [b.brand, null]]) +
        '<section class="brand-hero reveal" style="margin-block-start:22px">' +
          '<div class="brand-hero-logo recess crop static">' + (b.logo ? '<img src="' + esc(url(b.logo)) + '" alt="' + esc(b.brand) + '">' : '<span class="h2">' + esc(b.brand) + '</span>') + '</div>' +
          '<div class="brand-hero-body"><p class="kicker">' + esc(country(b.country_of_origin)) + '</p>' +
            '<h1 class="display" style="font-size:clamp(40px,5vw,64px)">' + esc(b.brand) + '</h1>' +
            '<p class="lead" style="color:var(--ink)">' + esc(loc(b.tagline)) + '</p>' +
            '<dl class="facts">' +
              '<div><dt>' + esc(s('founded')) + '</dt><dd class="big">' + esc(b.founded || '—') + '</dd></div>' +
              '<div><dt>' + esc(s('country')) + '</dt><dd>' + esc(country(b.country_of_origin)) + '</dd></div>' +
              '<div><dt>' + esc(s('products_lbl')) + '</dt><dd class="big">' + mine.length + '</dd></div>' +
              '<div><dt>' + esc(s('pd_protocols')) + '</dt><dd>' + protos(techs) + '</dd></div>' +
            '</dl>' +
            '<div class="prose"><p>' + esc(loc(b.description)) + '</p></div>' +
            (b.website ? '<a class="link-arrow" href="' + esc(b.website) + '" target="_blank" rel="noopener">' + esc(s('website')) + ic('ext') + '</a>' : '') +
          '</div></section></div>' +
        '<section class="sec-tight"><div class="wrap">' + ruler('01', s('products_lbl'), count(mine.length, 'product')) +
          '<h2 class="h2" style="margin-block-end:22px">' + s('brand_products', { b: esc(b.brand) }) + '</h2>' +
          (cats.length > 1 ? '<div class="rail-box in-wrap">' + railArrows('<div class="tabs cat-rail" id="btabs" role="toolbar"><button class="cat-tab" type="button" data-bcat="all" aria-pressed="true">' + esc(s('all')) + '<span class="n">' + mine.length + '</span></button>' +
            cats.map(function (c) {
              var n = mine.filter(function (p) { return p.category === c.id; }).length;
              return '<button class="cat-tab" type="button" data-bcat="' + c.id + '" aria-pressed="false">' + esc(loc(c.label)) + '<span class="n">' + n + '</span></button>';
            }).join('') + '</div>') + '</div>' : '') +
          '<div class="grid grid-4' + (mine.length > 12 ? ' collapsed' : '') + '" id="bgrid">' + mine.map(function (p) { return card(p).replace('<article class="card', '<article data-c="' + p.category + '" class="card'); }).join('') + '</div>' +
          (mine.length > 12 ? '<div class="load-more" id="bmore"><button class="btn btn-line" type="button" data-bmore>' + esc(s('show_all', { n: mine.length })) + '</button></div>' : '') +
        '</div></section>' +
        '<section class="sec-tight"><div class="wrap">' + ruler('02', s('other_brands')) +
          '<div class="mini-brands">' + BRANDS.filter(function (x) { return x.id !== id; }).map(function (x) {
            return '<a class="mini-brand" href="' + esc(href('brand.html', { id: x.id })) + '" title="' + esc(x.brand) + '"><img src="' + esc(url(x.logo)) + '" alt="' + esc(x.brand) + '" loading="lazy"></a>';
          }).join('') + '</div></div></section>';
    });
  }
  function wireBrand() {
    wireRail(document.getElementById('btabs'));
    document.getElementById('main').addEventListener('click', function (e) {
      var more = document.getElementById('bmore');
      if (e.target.closest('[data-bmore]')) { document.getElementById('bgrid').classList.remove('collapsed'); if (more) more.hidden = true; return; }
      var t = e.target.closest('[data-bcat]');
      if (!t) return;
      var c = t.getAttribute('data-bcat');
      document.getElementById('bgrid').classList.toggle('collapsed', c === 'all' && !!more && !more.hidden);
      document.querySelectorAll('[data-bcat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      railCenter(t);
      document.querySelectorAll('#bgrid [data-c]').forEach(function (el) { el.hidden = c !== 'all' && el.getAttribute('data-c') !== c; });
    });
  }

  /* ───────────── Page: projects ───────────── */
  function pageProjects() {
    return getJSON('data/projects_index.json').then(function (projects) {
      return Promise.all(projects.map(function (pj) { return getJSON('data/projects/' + pj.id + '.json').catch(function () { return null; }); })).then(function (full) {
        var used = [];
        projects.forEach(function (pj) { (pj.categories || []).forEach(function (c) { if (used.indexOf(c) < 0) used.push(c); }); });
        return '<section class="page-head"><div class="wrap">' +
          crumbs([[s('breadcrumb_home'), href('index.html')], [s('nav_projects'), null]]) +
          '<div class="page-head-grid"><div class="reveal"><p class="kicker">' + esc(s('pw_kicker', { n: count(projects.length, 'project') })) + '</p>' +
            '<h1 class="display" style="font-size:clamp(40px,5.6vw,76px)">' + s('pw_title') + '</h1></div>' +
            '<p class="lead">' + esc(s('spa_previous_work_lead')) + '</p></div></div></section>' +
          '<section class="wrap"><div class="tabs"><button class="cat-tab" type="button" data-pcat="all" aria-pressed="true">' + esc(s('all')) + '<span class="n">' + projects.length + '</span></button>' +
            TAX.project_categories.filter(function (c) { return used.indexOf(c.id) >= 0; }).map(function (c) {
              var n = projects.filter(function (pj) { return (pj.categories || []).indexOf(c.id) >= 0; }).length;
              return '<button class="cat-tab" type="button" data-pcat="' + esc(c.id) + '" aria-pressed="false">' + esc(loc(c.label)) + '<span class="n">' + n + '</span></button>';
            }).join('') + '</div>' +
          '<div class="plates" id="plates">' + projects.map(function (pj, i) {
            return projectPlate(pj, full[i], i).replace('<article class="plate', '<article data-cats="' + esc((pj.categories || []).join('|')) + '" class="plate');
          }).join('') + '</div></section>' + ticket();
      });
    });
  }
  function wireProjects() {
    document.getElementById('main').addEventListener('click', function (e) {
      var t = e.target.closest('[data-pcat]');
      if (!t) return;
      var c = t.getAttribute('data-pcat');
      document.querySelectorAll('[data-pcat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      document.querySelectorAll('#plates [data-cats]').forEach(function (el) { el.hidden = c !== 'all' && el.getAttribute('data-cats').split('|').indexOf(c) < 0; });
    });
  }

  /* ───────────── Page: project ───────────── */
  function pageProject() {
    return getJSON('data/projects_index.json').then(function (list) {
      var id = params.get('id') || (list[0] && list[0].id);
      var pos = 0; list.forEach(function (x, i) { if (x.id === id) pos = i; });
      var next = list[(pos + 1) % list.length];
      return getJSON('data/projects/' + id + '.json').then(function (pj) {
        var title = loc(pj.title);
        document.title = title + ' | S‑ELECTRICITY';
        var prods = (pj.related_products || []).map(function (x) { return PBYID[x]; }).filter(Boolean);
        var brands = []; prods.forEach(function (p) { if (brands.indexOf(p.brand) < 0) brands.push(p.brand); });
        (pj.extra_brands || []).forEach(function (b) { if (brands.indexOf(b) < 0) brands.push(b); });
        var techs = []; prods.forEach(function (p) { (p.technology || []).forEach(function (t) { if (techs.indexOf(t) < 0) techs.push(t); }); });
        (pj.extra_protocols || []).forEach(function (t) { if (techs.indexOf(t) < 0) techs.push(t); });
        var t = pj.testimonial;

        var hasReel = (pj.media || []).some(function (m) { return m.type === 'reel'; });
        var nImg = (pj.media || []).filter(function (m) { return m.type === 'image'; }).length;
        var media = (pj.media || []).map(function (m, i) {
          var cap = '<figcaption><b>' + esc(s('fig', { n: pad(i + 1) })) + '</b>' + esc(loc(m.alt)) + '</figcaption>';
          if (m.type === 'image') {
            var size = hasReel ? ' span8' : (nImg >= 3 && i === 0 ? ' hero' : '');
            return '<figure class="gal-item' + size + '"><img src="' + esc(url(m.src)) + '" alt="' + esc(loc(m.alt)) + '" loading="lazy">' + cap + '</figure>';
          }
          return '<figure class="gal-item' + (m.type === 'reel' ? ' tall' : ' hero') + '"><video src="' + esc(url(m.src)) + '"' + (m.poster ? ' poster="' + esc(url(m.poster)) + '"' : '') +
            ' controls playsinline preload="metadata"></video>' +
            (m.instagram_url ? '<figcaption><b>' + esc(s('fig', { n: pad(i + 1) })) + '</b><a href="' + esc(m.instagram_url) + '" target="_blank" rel="noopener">' + esc(s('watch_reel')) + '</a></figcaption>' : '') + '</figure>';
        }).join('');

        return '<section class="pj-hero"><img src="' + esc(url(pj.cover)) + '" alt="">' +
            '<div class="wrap pj-hero-in reveal">' +
              crumbs([[s('breadcrumb_home'), href('index.html')], [s('nav_projects'), href('projects.html')], [title, null]]) +
              '<p class="kicker" style="margin-block-start:28px">' + esc(s('case_n', { n: pad(pos + 1) })) + '</p>' +
              '<h1 class="display">' + esc(title) + '</h1></div></section>' +
          '<div class="wrap pj-facts"><dl class="facts">' +
            '<div><dt>' + esc(s('location')) + '</dt><dd>' + esc(locCity(pj.location)) + '</dd></div>' +
            '<div><dt>' + esc(s('completed')) + '</dt><dd>' + esc(fmtDate(pj.date)) + '</dd></div>' +
            '<div><dt>' + esc(s('duration')) + '</dt><dd>' + (pj.duration_days ? esc(count(pj.duration_days, 'day')) : '—') + '</dd></div>' +
            '<div><dt>' + esc(s('scope')) + '</dt><dd>' + esc((pj.categories || []).map(pcatLabel).join(' · ')) + '</dd></div>' +
          '</dl></div>' +
          '<section class="sec-tight"><div class="wrap">' + ruler('01', s('the_project')) +
            '<div class="pj-story"><div class="prose"><p>' + esc(loc(pj.description)) + '</p></div>' +
            (t ? '<aside class="testimonial dark"><p class="label-sm" style="color:var(--on-dark-faint)">' + esc(s('client_words')) + '</p><blockquote>' + esc(loc(t.quote)) + '</blockquote><cite>— ' + esc(t.author) + '</cite></aside>' : '<span></span>') +
          '</div></div></section>' +
          (media ? '<section class="sec-tight"><div class="wrap">' + ruler('02', s('proj_gallery_title'), count(pj.media.length, 'media')) +
            '<div class="gallery">' + media + '</div></div></section>' : '') +
          '<section class="sec-tight"><div class="wrap">' + ruler('03', s('proj_brands_title')) +
            '<div class="stack-row"><div class="stack-box"><p class="label-sm">' + esc(s('proj_brands_label')) + '</p><div class="stack-logos">' + brands.map(function (b) {
              var bi = BBYNAME[b];
              return bi && bi.logo
                ? '<a class="recess" href="' + esc(href('brand.html', { id: bi.id })) + '"><img src="' + esc(url(bi.logo)) + '" alt="' + esc(b) + '"></a>'
                : '<span class="recess txt">' + esc(b) + '</span>';
            }).join('') + '</div></div>' +
            '<div class="stack-box"><p class="label-sm">' + esc(s('proj_protocols_label')) + '</p>' + protos(techs).replace('class="protos"', 'class="protos" style="gap:12px 20px;font-size:14px"') + '</div></div>' +
          '</div></section>' +
          (prods.length ? '<section class="sec-tight"><div class="wrap">' + ruler('04', s('products_used'), count(prods.length, 'product')) +
            '<div class="grid grid-3">' + prods.map(mini).join('') + '</div></div></section>' : '') +
          (next && next.id !== id ? '<section class="wrap"><div class="next-pj"><div><p class="label-sm">' + esc(s('next_project')) + '</p><h2 class="h3"><a href="' + esc(href('project.html', { id: next.id })) + '">' + esc(loc(next.title)) + '</a></h2></div>' +
            '<span class="svc-go">' + ic('arrow', 'flip') + '</span></div></section>' : '') +
          ticket();
      });
    });
  }

  /* ───────────── Page: 404 ───────────── */
  function page404() {
    var links = [['nav_products', href('products.html')], ['nav_brands', href('brands.html')], ['nav_projects', href('projects.html')], ['nav_services', anchorHref('services')]];
    return Promise.resolve('<div class="wrap"><section class="nf">' +
      '<div class="nf-art dark" aria-hidden="true"><span class="nf-code">404</span>' +
        '<span class="brk"><span class="brk-top"><span>Q404</span><span class="led"></span></span><span class="brk-lever"></span>' +
        '<span class="brk-name">' + esc(s('nf_kicker')) + '</span></span></div>' +
      '<div class="reveal"><p class="kicker">' + esc(s('nf_kicker')) + '</p><h1 class="display" style="font-size:clamp(38px,5vw,64px)">' + esc(s('title')) + '</h1>' +
        '<p class="lead">' + esc(s('lead')) + '</p>' +
        '<form class="search" style="margin-block-start:26px" data-search>' + ic('search') +
          '<input id="nf-q" name="q" type="search" placeholder="' + esc(s('nf_search')) + '"></form>' +
        '<div class="nf-links">' + links.map(function (l) { return '<a href="' + esc(l[1]) + '">' + esc(s(l[0])) + ic('arrow', 'flip') + '</a>'; }).join('') + '</div>' +
        '<div class="actions" style="margin-block-start:22px"><a class="btn btn-primary" href="' + esc(href('index.html')) + '">' + esc(s('go_home')) + '</a>' +
          '<a class="btn btn-line" href="tel:+212654132112">' + ic('phone') + '<span dir="ltr">' + PHONE + '</span></a></div>' +
      '</div></section></div>');
  }

  /* ───────────── Overlays: scrim, drawer, wizard, toast, menu ───────────── */
  var drawerOpen = false;
  function scrim(on) { var el = document.getElementById('scrim'); if (el) el.classList.toggle('open', on); }
  function lock(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function closeAll() {
    var f = document.getElementById('filters'); if (f) f.classList.remove('open');
    var d = document.getElementById('quote'); if (d) d.classList.remove('open');
    var w = document.getElementById('wiz'); if (w) w.classList.remove('open');
    var m = document.getElementById('menu'); if (m) m.classList.remove('open');
    var b = document.querySelector('[data-menu]'); if (b) b.setAttribute('aria-expanded', 'false');
    drawerOpen = false; scrim(false); lock(false);
  }

  function renderDrawer() {
    var el = document.getElementById('quote');
    var n = qTotal();
    var items = QUOTE.map(function (it) {
      var p = PBYID[it.id];
      if (!p) return '';
      return '<div class="dp-item"><div class="mini-media recess">' + pimg(p.image, '72px', '') + '</div><div>' +
        '<h4>' + esc(loc(p.title)) + '</h4><p>' + esc(p.brand) + ' · ' + esc(typeLabel(p.product_type)) + '</p>' +
        '<div class="dp-item-row"><div class="qty"><button type="button" data-dq="' + esc(it.id) + '" data-d="-1" aria-label="' + esc(s('cart_aria_decrease')) + '">' + ic('minus') + '</button>' +
          '<output>' + it.qty + '</output><button type="button" data-dq="' + esc(it.id) + '" data-d="1" aria-label="' + esc(s('cart_aria_increase')) + '">' + ic('plus') + '</button></div>' +
        '<button class="dp-remove" type="button" data-dq="' + esc(it.id) + '" data-d="-999">' + esc(s('cart_item_remove')) + '</button></div></div></div>';
    }).join('');
    var note = (document.getElementById('dp-note') || {}).value || '';
    el.innerHTML =
      '<div class="dp-head"><div><h2 class="h3">' + esc(s('cart_title')) + '</h2><small>' + esc(n === 1 ? s('cart_total_one') : s('cart_total_items', { n: n })) + '</small></div>' +
        '<button class="x-btn" type="button" data-close aria-label="' + esc(s('cart_aria_close')) + '">' + ic('x') + '</button></div>' +
      (QUOTE.length
        ? '<div class="dp-body">' + items + '<div class="dp-notes"><label class="label-sm" for="dp-note">' + esc(s('cart_notes_label')) + '</label>' +
            '<textarea id="dp-note" placeholder="' + esc(s('cart_notes_placeholder')) + '">' + esc(note) + '</textarea></div></div>' +
          '<div class="dp-foot"><a class="btn btn-primary btn-block" id="dp-send" href="#" target="_blank" rel="noopener">' + WA_ICON + esc(s('cart_send_whatsapp')) + '</a>' +
            '<p>' + esc(s('cart_pd_hint')) + '</p></div>'
        : '<div class="dp-body"><div class="dp-empty">' + ic('quote') + '<p>' + esc(s('cart_empty')) + '</p>' +
            '<a class="btn btn-line" href="' + esc(href('products.html')) + '">' + esc(s('cart_empty_cta')) + '</a></div></div>');
  }
  function quoteMessage() {
    var lines = [s('cart_msg_header'), ''];
    QUOTE.forEach(function (it, i) {
      var p = PBYID[it.id]; if (!p) return;
      lines.push((i + 1) + '. ' + (p.title.en || loc(p.title)) + ' — ' + s('cart_msg_qty_label') + ' ' + it.qty);
    });
    var note = (document.getElementById('dp-note') || {}).value;
    if (note) { lines.push(''); lines.push(s('cart_msg_notes_label') + ' ' + note); }
    lines.push(''); lines.push(s('cart_msg_footer'));
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
  }
  function openDrawer() {
    closeAll();
    drawerOpen = true; renderDrawer();
    document.getElementById('quote').classList.add('open'); scrim(true); lock(true);
    var x = document.querySelector('#quote .x-btn'); if (x) x.focus();
  }

  var toastTimer;
  function toast() {
    var el = document.getElementById('toast');
    el.innerHTML = ic('check') + '<span>' + esc(s('cart_added_toast')) + '</span><button type="button" data-open-quote>' + esc(s('view')) + '</button>';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  // Wizard — same questions and keys as the live find-solution.js
  var WSTEPS = [
    { k: 'building', q: 'wizard_q_building', type: 'one', pfx: 'wizard_b_', sum: 'wizard_summary_building', icons: true,
      opts: ['villa', 'apartment', 'shop', 'office', 'restaurant', 'farm', 'other'] },
    { k: 'services', q: 'wizard_q_services', hint: 'wizard_q_services_hint', type: 'many', pfx: 'wizard_s_', sum: 'wizard_summary_services', icons: true,
      opts: ['smart_home', 'electrical', 'cameras', 'network'] },
    { k: 'smart_home', when: 'smart_home', q: 'wizard_q_smart_home', type: 'many', pfx: 'wizard_sh_', sum: 'wizard_summary_smart_home',
      opts: ['lighting', 'climate', 'curtains', 'audio', 'scenes', 'voice'] },
    { k: 'electrical', when: 'electrical', q: 'wizard_q_electrical', type: 'one', pfx: 'wizard_e_', sum: 'wizard_summary_electrical',
      opts: ['new_install', 'full_renov', 'partial_renov', 'repair', 'panel'] },
    { k: 'cameras', when: 'cameras', q: 'wizard_q_cameras', type: 'many', pfx: 'wizard_c_', sum: 'wizard_summary_cameras',
      opts: ['indoor', 'outdoor', 'doorbell', 'lock', 'alarm'] },
    { k: 'camera_count', when: 'cameras', q: 'wizard_q_camera_count', type: 'one', pfx: 'wizard_cc_', sum: 'wizard_summary_camera_count',
      opts: ['few', 'medium', 'many'] },
    { k: 'network', when: 'network', q: 'wizard_q_network', type: 'many', pfx: 'wizard_n_', sum: 'wizard_summary_network',
      opts: ['weak', 'dead_zones', 'slow', 'new_setup', 'other'] },
    { k: 'stage', q: 'wizard_q_stage', type: 'one', pfx: 'wizard_st_', sum: 'wizard_summary_stage',
      opts: ['building', 'renovating', 'completed', 'planning'] },
    { k: 'budget', q: 'wizard_q_budget', type: 'one', pfx: 'wizard_bg_', sum: 'wizard_summary_budget', compact: true,
      opts: ['under_5k', '5_15k', '15_50k', '50_100k', '100_250k', 'over_250k', 'discuss'] },
    { k: 'contact', type: 'fields', q: 'wiz_q_contact', hint: 'wiz_contact_hint' },
    { k: 'summary', type: 'summary', q: 'wizard_summary_title', hint: 'wizard_summary_lead' }
  ];
  var W = { i: 0, a: {}, city: '', name: '' };
  function wSteps() {
    return WSTEPS.filter(function (st) { return !st.when || (W.a.services || []).indexOf(st.when) >= 0; });
  }
  function wLabel(st, v) { return s(st.pfx + v); }
  function wRender() {
    var steps = wSteps(), st = steps[W.i], total = steps.length;
    var body = '<h2 class="h3 wiz-q" id="wiz-q">' + esc(s(st.q)) + '</h2>' + (st.hint ? '<p class="wiz-hint">' + esc(s(st.hint)) + '</p>' : '');
    if (st.type === 'one' || st.type === 'many') {
      var cur = W.a[st.k];
      body += '<div class="opts' + (st.compact || !st.icons ? ' compact' : '') + '">' + st.opts.map(function (v) {
        var on = st.type === 'one' ? cur === v : (cur || []).indexOf(v) >= 0;
        return '<button class="opt" type="button" data-opt="' + v + '" aria-pressed="' + on + '">' + (st.icons && I[v] ? ic(v) : '') + '<span>' + esc(wLabel(st, v)) + '</span></button>';
      }).join('') + '</div>';
    } else if (st.type === 'fields') {
      body += '<div class="field"><label for="w-city">' + esc(s('wizard_q_city')) + '</label><input id="w-city" value="' + esc(W.city) + '" placeholder="' + esc(s('wizard_q_city_ph')) + '"></div>' +
        '<div class="field"><label for="w-name">' + esc(s('wizard_q_name')) + '</label><input id="w-name" value="' + esc(W.name) + '" placeholder="' + esc(s('wizard_q_name_ph')) + '"></div>';
    } else {
      body += '<dl class="summary">' + steps.filter(function (x) { return x.pfx && W.a[x.k] && [].concat(W.a[x.k]).length; }).map(function (x) {
        return '<div><dt>' + esc(s(x.sum)) + '</dt><dd>' + esc([].concat(W.a[x.k]).map(function (v) { return wLabel(x, v); }).join(', ')) + '</dd></div>';
      }).join('') +
      (W.city ? '<div><dt>' + esc(s('wizard_summary_city')) + '</dt><dd>' + esc(W.city) + '</dd></div>' : '') +
      (W.name ? '<div><dt>' + esc(s('wizard_summary_name')) + '</dt><dd>' + esc(W.name) + '</dd></div>' : '') + '</dl>' +
      '<p class="wiz-hint" style="margin-block-start:16px">' + esc(s('wizard_summary_cta_lead')) + '</p>';
    }
    var last = st.type === 'summary';
    document.getElementById('wiz-card').innerHTML =
      '<div class="wiz-head"><div class="wiz-top"><span class="wiz-step">' + esc(s('wizard_step', { n: W.i + 1, total: total })) + '</span>' +
        '<button class="x-btn" type="button" data-close aria-label="' + esc(s('wizard_close')) + '">' + ic('x') + '</button></div>' +
        '<div class="wire" aria-hidden="true"><span style="width:' + Math.round((W.i + 1) / total * 100) + '%"></span></div></div>' +
      '<div class="wiz-body">' + (W.i === 0 ? '<p class="kicker" style="margin-block-end:12px">' + esc(s('wizard_title')) + '</p>' : '') + body + '</div>' +
      '<div class="wiz-foot">' +
        (W.i > 0 ? '<button class="btn btn-line" type="button" data-wback>' + esc(s('wizard_back')) + '</button>' : '<span class="wiz-msg" id="wiz-msg"></span>') +
        (W.i > 0 ? '<span class="wiz-msg" id="wiz-msg"></span>' : '') +
        (last
          ? '<a class="btn btn-primary" href="' + esc(wMessage(steps)) + '" target="_blank" rel="noopener">' + WA_ICON + esc(s('wizard_send_whatsapp')) + '</a>'
          : '<button class="btn btn-primary" type="button" data-wnext>' + esc(st.k === 'contact' ? s('wizard_finish') : s('wizard_next')) + ic('arrow', 'flip') + '</button>') +
      '</div>';
  }
  function wMessage(steps) {
    var lines = [W.name ? s('wizard_msg_greet_named', { name: W.name }) : s('wizard_msg_greet'), s('wizard_msg_intro'), ''];
    steps.forEach(function (x) {
      if (x.pfx && W.a[x.k] && [].concat(W.a[x.k]).length) lines.push('• ' + s(x.sum) + ': ' + [].concat(W.a[x.k]).map(function (v) { return wLabel(x, v); }).join(', '));
    });
    if (W.city) lines.push('• ' + s('wizard_summary_city') + ': ' + W.city);
    lines.push(''); lines.push(s('wizard_msg_outro'));
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n'));
  }
  function openWizard(building) {
    closeAll();
    W = { i: 0, a: {}, city: '', name: '' };
    if (building && WSTEPS[0].opts.indexOf(building) >= 0) { W.a.building = building; W.i = 1; }
    wRender();
    document.getElementById('wiz').classList.add('open'); scrim(true); lock(true);
  }
  function wireWizard() {
    var root = document.getElementById('wiz');
    root.addEventListener('click', function (e) {
      if (e.target === root) { closeAll(); return; }
      var steps = wSteps(), st = steps[W.i], t;
      if ((t = e.target.closest('[data-opt]'))) {
        var v = t.getAttribute('data-opt');
        if (st.type === 'one') W.a[st.k] = v;
        else {
          var arr = (W.a[st.k] || []).slice(), at = arr.indexOf(v);
          if (at >= 0) arr.splice(at, 1); else arr.push(v);
          W.a[st.k] = arr;
        }
        wRender();
        if (st.type === 'one') setTimeout(function () { if (wSteps()[W.i] === st) { W.i++; wRender(); } }, 220);
      } else if (e.target.closest('[data-wnext]')) {
        if (st.type === 'fields') {
          W.city = document.getElementById('w-city').value.trim();
          W.name = document.getElementById('w-name').value.trim();
        } else if (!W.a[st.k] || ![].concat(W.a[st.k]).length) {
          document.getElementById('wiz-msg').textContent = s('wizard_required_msg');
          return;
        }
        W.i = Math.min(W.i + 1, steps.length - 1); wRender();
      } else if (e.target.closest('[data-wback]')) {
        if (st.type === 'fields') { W.city = document.getElementById('w-city').value.trim(); W.name = document.getElementById('w-name').value.trim(); }
        W.i = Math.max(0, W.i - 1); wRender();
      }
    });
  }

  function protoBar() {
    var pages = [['index.html', s('spa_home'), 'home'], ['products.html', s('nav_products'), 'catalog'], ['product.html', s('breadcrumb_products') + ' → 1', 'product'],
      ['brands.html', s('nav_brands'), 'brands'], ['brand.html', s('nav_brands') + ' → 1', 'brand'], ['projects.html', s('nav_projects'), 'projects'], ['project.html', s('nav_projects') + ' → 1', 'project'], ['404.html', '404', '404']];
    return '<div class="proto-bar" title="' + esc(s('proto_note')) + '"><b>' + esc(s('proto')) + '</b>' +
      '<select id="proto-pages" aria-label="Pages">' + pages.map(function (p) {
        return '<option value="' + esc(href(p[0])) + '"' + (p[2] === PAGE ? ' selected' : '') + '>' + esc(p[1]) + '</option>';
      }).join('') + '</select>' +
      '<button type="button" class="pv-tags" data-tags aria-pressed="' + TAGS + '" title="ترقيم الأجزاء">#</button></div>';
  }

  // Numbering mode: every part of the home page gets a label (B4 = section, B4.2 = a part of it)
  // so the owner can point at things: "take C5.1 into B". A key is listed at the bottom.
  var TAGS = new URLSearchParams(location.search).get('tags') === '1' || sget('proto-tags') === '1';
  var TAG_PREFIX = { home: 'D', catalog: 'P', product: 'PD', brands: 'B', brand: 'BD', projects: 'R', project: 'RD', '404': 'E' };
  var TAG_PAGE = { home: 'الرئيسية', catalog: 'المنتجات', product: 'صفحة منتج', brands: 'العلامات التجارية', brand: 'صفحة علامة', projects: 'المشاريع', project: 'صفحة مشروع', '404': 'صفحة غير موجودة' };
  // parts that only exist on the inner pages (home keeps its numbers as the owner learned them)
  var TAG_PARTS_MORE = [
    ['.crumbs', 'مسار التنقل'], ['.kicker', 'العنوان الصغير'], ['.search', 'خانة البحث'],
    ['.cat-rail', 'شريط الفئات'], ['.cat-tab', 'زر فئة'], ['.tabs', 'أزرار التصفية'],
    ['.fcats', 'الفئات داخل لوحة الفلاتر'], ['.results-count', 'عدد النتائج'], ['.select', 'الترتيب'], ['.filters', 'لوحة الفلاتر (هاتف)'], ['.fgroup', 'مجموعة فلتر'], ['.toolbar', 'شريط العدد والترتيب'], ['.active-chips', 'الفلاتر المختارة'], ['.load-more', 'زر «عرض المزيد»'],
    ['.pd-gallery', 'معرض صور المنتج'], ['.pd-thumbs', 'الصور المصغّرة'], ['.pd-eyebrow', 'العلامة ونوع المنتج'], ['.pd-short', 'الوصف القصير'], ['.pd-cells', 'خانات المواصفات السريعة'],
    ['.protos', 'شارات البروتوكول'], ['.pd-buy', 'الكمية وزر الطلب'], ['.files', 'ملفات التحميل'], ['.specs', 'جدول المواصفات'], ['.buybar-t', 'اسم المنتج في الشريط'],
    ['.brand-hero-logo', 'شعار العلامة'], ['.facts', 'أرقام ومعلومات سريعة'], ['.prose', 'نص الوصف'], ['.mini-brand', 'علامة أخرى'],
    ['.ledger-row', 'سطر علامة'], ['.ledger-logo', 'شعار في السطر'], ['.ledger-cats', 'فئات العلامة'], ['.ledger-count', 'عدد المنتجات'],
    ['.pj-story', 'قصة المشروع'], ['.testimonial', 'شهادة العميل'], ['.gal-item', 'صورة من المعرض'], ['.stack-box', 'صندوق نظام مستعمل'], ['.mini', 'منتج مصغّر'], ['.next-pj', 'رابط المشروع التالي'],
    ['.nf-art', 'رسم القاطع 404'], ['.nf-links', 'روابط مفيدة']
  ];
  var TAG_PARTS = [
    ['.logo', 'الشعار'], ['.nav', 'روابط القائمة'], ['.lang', 'اختيار اللغة'], ['.hdr [data-open-quote]', 'أيقونة قائمة الطلب'], ['.hdr-cta', 'زر أعلى الصفحة'], ['.wires', 'خطوط الأسلاك الملوّنة'],
    ['.tape', 'الشارة الصفراء'], ['.display', 'العنوان الكبير'], ['.sh', 'العنوان الصغير مع النجمة والخط'], ['.h2', 'عنوان القسم'], ['.lead', 'النص التعريفي'],
    ['.btn-primary', 'الزر الرئيسي'], ['.btn-ghost', 'الزر الثاني (زجاجي)'], ['.btn-line', 'الزر الثاني (بإطار)'], ['.link-arrow', 'رابط بسهم وخط أصفر'], ['.meter', 'عدّاد الأرقام'],
    ['.hero-video', 'إطار الفيديو'], ['.demo-hint', 'صندوق التلميح'],
    ['.dev', 'إطار لوحة التحكم'], ['.dev-top', 'شريط أعلى اللوحة (الغرفة والمشهد)'], ['.screen', 'شاشة الفيلا'], ['.key-wide', 'مفتاح الإضاءة (المنزلق)'], ['.dev-ctl .key[data-type="facade"]', 'مفاتيح الوظائف الملوّنة'], ['.key-shut', 'مفتاح الستائر (أعلى/أسفل)'], ['.scenes', 'أزرار المشاهد'],
    ['.brand-strip-label', 'عنوان الشريط'], ['.brand-logos', 'شعارات العلامات'],
    ['.plate', 'بطاقة المشروع'], ['.plate-media', 'صورة المشروع (بقوس)'], ['.plate-meta', 'المكان والتاريخ'], ['.plate .chip', 'وسوم الفئات'], ['.quote-mini', 'شهادة العميل'],
    ['.svc', 'بطاقة الخدمة'], ['.svc-n', 'أيقونة الخدمة السوداء'], ['.svc-items', 'قائمة النقاط'], ['.svc-go', 'زر السهم في الزاوية'],
    ['.board', 'لوحة التوزيع'], ['.brk', 'قاطع الفئة'], ['.tile', 'بطاقة فئة بصورة كبيرة'], ['.catrow', 'سطر فئة بصورة صغيرة'],
    ['.client', 'بطاقة نوع العميل'], ['.client-ic', 'أيقونة العميل'],
    ['.steps', 'خط الخطوات'], ['.step-n', 'رقم الخطوة'],
    ['.card', 'بطاقة المنتج'], ['.card-kicker', 'نوع المنتج (شارة)'], ['.btn-add', 'زر «أضف للطلب»'], ['.card-logo', 'شعار العلامة في البطاقة'],
    ['.faq details', 'سؤال يُفتح ويُغلق'],
    ['.cta', 'صندوق التواصل'], ['.readout', 'رقم الهاتف'],
    ['.ftr-about', 'نبذة الشركة'], ['.ftr-grid h4', 'عناوين الأعمدة'], ['.ftr-contact', 'معلومات التواصل'], ['.ftr-base', 'سطر الحقوق']
  ];
  function regionName(el) {
    var has = function (q) { return el.querySelector(q); };
    if (el.classList.contains('hdr')) return 'الشريط العلوي (الهيدر)';
    if (el.classList.contains('ftr')) return 'التذييل';
    if (el.classList.contains('page-head') || el.classList.contains('pj-hero')) return 'رأس الصفحة';
    if (el.classList.contains('tabs-wrap')) return 'تبويبات الفئات (ثابتة)';
    if (el.classList.contains('cat-body')) return 'الفلاتر والمنتجات';
    if (el.classList.contains('buybar')) return 'شريط الطلب السفلي (يظهر عند النزول)';
    if (el.classList.contains('pj-facts')) return 'معلومات المشروع';
    if (has('.pd')) return 'المنتج: الصور والمعلومات';
    if (has('.brand-hero')) return 'واجهة العلامة';
    if (has('.ledger')) return 'قائمة العلامات';
    if (has('.mini-brands')) return 'علامات أخرى';
    if (has('.nf')) return 'رسالة الصفحة غير الموجودة';
    if (has('.pj-story')) return 'القصة';
    if (has('.gallery')) return 'معرض الصور';
    if (has('.stack-row')) return 'الأنظمة المستعملة';
    if (has('.mini')) return 'المنتجات المستعملة';
    if (has('.next-pj')) return 'المشروع التالي';
    if (el.id === 'hero') return el.classList.contains('hero-b') ? 'الواجهة: فيديو بكامل الشاشة' : el.classList.contains('hero-c') ? 'الواجهة: لوحة التحكم الحية' : 'الواجهة: نص وفيديو جانبي';
    if (el.classList.contains('brand-strip')) return 'شريط العلامات التجارية';
    if (has('.plates')) return 'المشاريع';
    if (has('.svc-list')) return 'الخدمات';
    if (has('.dev')) return 'تجربة لوحة التحكم' + (el.classList.contains('dark') ? ' (شريط داكن)' : '');
    if (has('.board')) return 'الفئات: لوحة توزيع بقواطع';
    if (has('.tiles')) return 'الفئات: بطاقات صور كبيرة';
    if (has('.catlist')) return 'الفئات: قائمة مختصرة';
    if (has('.clients')) return 'مع من نعمل';
    if (has('.steps')) return 'كيف نعمل';
    if (has('.card')) return PAGE === 'brand' ? 'منتجات العلامة' : PAGE === 'product' ? 'منتجات مشابهة' : 'منتجات مختارة';
    if (has('.faq')) return 'الأسئلة الشائعة';
    if (has('.cta')) return 'صندوق التواصل الأخير';
    return 'قسم';
  }
  function badge(el, label, big) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var b = document.createElement('span');
    b.className = 'tagb' + (big ? ' tagb-sec' : '');
    b.textContent = label;
    el.appendChild(b);
    if (!big) el.setAttribute('data-tagged', '');
  }
  function applyTags() {
    var L = TAG_PREFIX[PAGE] || 'X', key = [];
    var regions = [document.querySelector('.hdr')].concat([].slice.call(document.querySelectorAll('#main > :not(.tagkey)')), [document.querySelector('.ftr')]);
    regions.forEach(function (r, i) {
      if (!r) return;
      var n = L + (i + 1), parts = [], seen = [];
      (PAGE === 'home' ? TAG_PARTS : TAG_PARTS.concat(TAG_PARTS_MORE)).forEach(function (tp) {
        var el = r.querySelector(tp[0]);
        if (el && seen.indexOf(el) < 0) { seen.push(el); parts.push([el, tp[1]]); }
      });
      parts.sort(function (a, b) { return a[0].compareDocumentPosition(b[0]) & 2 ? 1 : -1; });
      badge(r, n, true);
      var items = parts.map(function (pt, j) { badge(pt[0], n + '.' + (j + 1)); return '<li><b>' + n + '.' + (j + 1) + '</b> ' + esc(pt[1]) + '</li>'; });
      key.push('<div class="tagkey-sec"><h3><b>' + n + '</b> ' + esc(regionName(r)) + '</h3><ul>' + items.join('') + '</ul></div>');
    });
    var box = document.createElement('section');
    box.className = 'wrap sec tagkey';
    box.setAttribute('dir', 'rtl');
    box.innerHTML = '<h2 class="h2">دليل الأرقام · ' + L + ' · ' + esc(TAG_PAGE[PAGE] || '') + '</h2><p class="lead">اكتب الرقم مع ما تريد، مثلاً: «' + L + '2.3 أصغر» أو «احذف ' + L + '4».</p><div class="tagkey-grid">' + key.join('') + '</div>';
    document.getElementById('main').appendChild(box);
  }
  var VNAME = { en: { a: 'Board', b: 'Villa', c: 'Control', d: 'Lean · WIP' }, fr: { a: 'Tableau', b: 'Villa', c: 'Contrôle', d: 'Épuré · en cours' }, ar: { a: 'لوحة', b: 'فيلا', c: 'تحكّم', d: 'المختزل · قيد التعديل' } };

  /* ───────────── Mount ───────────── */
  var PAGES = { home: pageHome, catalog: pageCatalog, product: pageProduct, brands: pageBrands, brand: pageBrand, projects: pageProjects, project: pageProject, '404': page404 };
  var WIRES = { home: wireHome, catalog: wireCatalog, product: wireProduct, brand: wireBrand, projects: wireProjects };
  var app = document.getElementById('app');
  var BASE_TITLE = document.title;
  var rendered = false;

  function scrollToAnchor(name) {
    var el = name && document.getElementById(name);
    if (el && el.scrollIntoView) el.scrollIntoView();
  }

  function render() {
    if (!rendered) app.innerHTML = '<div class="loading"><span></span></div>';
    document.title = BASE_TITLE;
    if (document.body) {
      document.body.className = String(document.body.className || '').replace(/(^|\s)(v|pg)-\S+/g, '').replace('has-buybar', '').trim();
      document.body.classList.add('v-' + V, 'pg-' + PAGE);
      if (V === 'd') document.body.classList.add('v-b');
    }
    ST = null;
    return boot().then(function () {
      return (PAGES[PAGE] || pageHome)();
    }).catch(function (err) {
      app.innerHTML = '<div class="wrap" style="padding:60px 0"><h1 class="h3">Prototype failed to load data</h1><p class="lead">' + esc(err && err.message) +
        '</p><p class="lead">Open it through the local server: <code>http://localhost:8000/docs/redesign/</code></p></div>';
      throw err;
    }).then(function (main) {
      drawerOpen = false; lock(false);
      app.innerHTML = header() + '<main id="main">' + main + '</main>' + footer() +
        '<div class="scrim" id="scrim"></div>' +
        '<aside class="drawer-panel" id="quote" role="dialog" aria-modal="true" aria-label="' + esc(s('cart_title')) + '"></aside>' +
        '<div class="wiz" id="wiz" role="dialog" aria-modal="true" aria-labelledby="wiz-q"><div class="wiz-card" id="wiz-card"></div></div>' +
        '<div class="toast" id="toast" role="status" aria-live="polite"></div>' + protoBar();
      rendered = true;
      qSave(); // paints counts + every add button
      var pp = document.getElementById('proto-pages');
      if (pp) pp.addEventListener('change', function () { location.href = pp.value; });
      wireWizard();
      if (WIRES[PAGE]) WIRES[PAGE]();
      if (TAGS) applyTags();
      if (ANCHOR) scrollToAnchor(ANCHOR);
      else if (!HASHNAV && location.hash) scrollToAnchor(location.hash.slice(1));
    }).catch(function (err) {
      if (window.console) console.error(err); // wiring errors keep the rendered page
    });
  }

  // Listeners that live for the whole session (the page body is re-rendered)
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-add]'))) {
      e.preventDefault();
      var id = t.getAttribute('data-add');
      if (qFind(id)) openDrawer(); else { qAdd(id, 1); toast(); }
    } else if (e.target.closest('[data-open-quote]')) { e.preventDefault(); document.getElementById('toast').classList.remove('show'); openDrawer(); }
    else if ((t = e.target.closest('[data-open-wizard]'))) { e.preventDefault(); openWizard(t.getAttribute('data-open-wizard')); }
    else if (e.target.closest('[data-close]') || e.target.id === 'scrim') { closeAll(); }
    else if ((t = e.target.closest('[data-dq]'))) {
      var it = qFind(t.getAttribute('data-dq'));
      if (it) qSet(it.id, it.qty + (+t.getAttribute('data-d')));
    } else if (e.target.closest('#dp-send')) {
      e.target.closest('#dp-send').href = quoteMessage();
    } else if ((t = e.target.closest('[data-menu]'))) {
      var m = document.getElementById('menu'), open = !m.classList.contains('open');
      closeAll(); m.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open));
    } else if (HASHNAV && (t = e.target.closest('[data-lang]'))) {
      // Language links are rebuilt at click time so the catalog keeps its category
      e.preventDefault();
      closeAll();
      var rest = currentRest();
      location.hash = t.getAttribute('data-lang') + (rest ? '-' + rest : '');
    } else if (e.target.closest('[data-tags]')) {
      TAGS = !TAGS; sset('proto-tags', TAGS ? '1' : '0');
      render();
    } else if (e.target.closest('#menu a')) { closeAll(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
    var q = document.getElementById('q');
    if (e.key === '/' && PAGE === 'catalog' && q && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      e.preventDefault(); q.focus();
    }
  });
  document.addEventListener('submit', function (e) {
    var form = e.target.closest && e.target.closest('[data-search]');
    if (!form) return;
    e.preventDefault();
    var input = form.querySelector('input');
    NAVQ = input ? input.value.trim() : '';
    location.href = href('products.html', { q: NAVQ });
  });
  if (HASHNAV && window.addEventListener) {
    window.addEventListener('hashchange', function () {
      var r = parseHash(location.hash);
      if (!r) { scrollToAnchor(location.hash.slice(1)); return; } // #contact
      var sameView = r.lang === lang && r.page === PAGE && !r.anchor && (r.arg || '') === (PAGE === 'catalog' ? (ST && ST.cat !== 'all' ? ST.cat : '') : (params.get('id') || ''));
      if (sameView) return;
      if (r.page === PAGE && r.lang === lang && r.anchor) { ANCHOR = r.anchor; scrollToAnchor(r.anchor); return; }
      if (r.lang !== lang) setLang(r.lang);
      applyRoute(r);
      closeAll();
      if (window.scrollTo && !r.anchor) window.scrollTo(0, 0);
      render();
    });
  }

  render();
})();
