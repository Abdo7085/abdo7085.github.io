# دليل تطوير موقع Smart Electricity المخصص للذكاء الاصطناعي

هذا الدليل مخصص لمطوري الويب ومساعدي الذكاء الاصطناعي لفهم بنية المشروع الخاصة بموقع Smart Electricity وكيفية عمل الترجمة وإدارة المنتجات وغيرها من الأجزاء الرئيسية للموقع.

## 1. البنية المعمارية للموقع (Project Architecture)

الموقع عبارة عن مزيج متقن بين موقع ثابت (Static Site) مدعوم بملفات HTML، وتطبيق صفحة واحدة (Single Page Application - SPA) خفيف لتقديم واجهة مستخدم سريعة وتفاعلية. **الموقع مُستضاف ويعمل مباشرةً كاستضافة مجانية على GitHub Pages.** ولأنه استضافة ثابتة (بدون خادم خلفي - No Backend)، يتم تخزين المحتوى المصدري وتوليد الصفحات المخصصة لمحركات البحث (SEO) من خلال سكريبتات أدوات البناء بلغة البايثون (Python).

**أبرز المجلدات والملفات:**
- `index.html`: الصفحة الرئيسية للموقع وتحتوي على حاوية `#root` ليتم حقن محتوى الـ SPA بداخلها.
- `products.html`: صفحة كتالوج المنتجات (تحتوي على `ItemList` JSON-LD يُحقن آلياً بواسطة `build_products.py`).
- `product.html`: قالب SPA لعرض تفاصيل المنتج الفردي. **مُعلّم بـ `noindex, nofollow`** لأنه قالب فارغ — الصفحات الفعلية المفهرسة هي المولّدة في `products/`.
- `project.html`: قالب SPA لعرض صفحة مشروع مفرد من معرض الأعمال. **مُعلّم بـ `noindex, nofollow`** — الصفحات الفعلية المفهرسة هي المولّدة في `projects/` (مع `index, follow` آلياً).
- `previous-work.html`: صفحة معرض الأعمال السابقة — شبكة المشاريع فيها تُحمَّل ديناميكياً من `data/projects_index.json` داخل الـ SPA bundle.
- `assets/`: مجلد الموارد ويحتوي على الصور، وملفات الترجمة (locales)، والسكربتات التأسيسية:
  - **`brand.css`** ⭐ (Single Source of Truth للتصميم): يُعرّف كل tokens البراند (`--brand`, `--brand-deep`, `--warm-dark*`, `--ink`, `--cream` إلخ) في مكان واحد. يُحمَّل **أوّلاً** في كل القوالب الجذرية الـ6 قبل `index-CJ3jXuVd.css`. الملفات الأخرى (`cart.css`, `find-solution.css`, `products.css`, `projects.css`, `homepage-products.css`) تستخدم هذه التوكنات عبر `var(--brand, fallback)` مع fallback يحفظ القيم الأصلية. **راجع القسم 10 لكامل التفاصيل والوصفة.**
  - **`section-eyebrows.css`** (2026-04-30): علامات صغيرة بصيغة `— 01 / Expertise` فوق عناوين 4 أقسام رئيسية في الصفحة الرئيسية. CSS pseudo-elements (`::before`) + `:lang()` selectors للترجمة. لا تلمس SPA bundle. **راجع القسم 10.**
  - `i18n.js` + `i18n.css`: نظام الترجمة.
  - `products.js` + `products.css`: منطق وأسلوب صفحة كتالوج المنتجات.
  - `product-detail.js`: عرض تفاصيل المنتج الفردي (SPA).
  - `projects.css`: **ملف CSS مشترك (Shared CSS)** — يحتوي على أسلوب صفحة المشروع الفردي (شبكة موزاييك للوسائط المتنوعة) **بالإضافة إلى** تنسيقات قسم CTA "Need a Custom Solution?" (`.proj-cta`, `.proj-cta-inner`, `.proj-cta-btn` إلخ). هذا القسم يُعرض عبر مكوّن `Od` داخل الـ SPA في الصفحة الرئيسية وعبر `renderCta()` في `project-detail.js`. **لذلك يجب تحميل هذا الملف في كل صفحات الموقع التي تستخدم الـ SPA** (بما فيها قوالب المنتجات `product.html` و `products.html`).
  - `project-detail.js`: عرض صفحة مشروع فردي داخل الـ SPA — يقرأ `window.__PROJECT__` المحقون مسبقاً من `build_projects.py`، ويدير تشغيل الفيديوهات الذاتية الاستضافة والريلز (`assets/reels/`) مع إيقافها تشغيلياً بـ `IntersectionObserver` لتوفير الموارد وتمكين زر كتم الصوت.
  - `homepage-products.js` + `homepage-products.css`: قسم المنتجات على الصفحة الرئيسية.
  - `find-solution.js` + `find-solution.css`: ويزارد "Find Your Solution" المنبثق متعدّد الخطوات الذي يساعد العميل على تحديد حاجته ويولّد رسالة واتساب جاهزة بلغته. يُفعَّل عبر `data-trigger="find-solution"` على أي عنصر، ومرتبط حالياً بزر "احجز استشارة مجانية" في قسم About. **راجع القسم 9 للتفاصيل الكاملة.**
  - `cart.js` + `cart.css`: سلّة تسوّق "WhatsApp-cart" — تجمع منتجات من الكتالوج وتولّد رسالة واتساب جاهزة بقائمة المنتجات + الكميات + الروابط + ملاحظات اختيارية. لا backend، لا أسعار، لا checkout حقيقي. تخزين في `localStorage` تحت `se_cart_v1`. أيقونة في النڤ-بار (Desktop + Mobile) مع badge عدّاد. **راجع القسم 12 للتفاصيل الكاملة.**
- **`assets/index-CGMiSPUa.js` (ملاحظة غاية في الأهمية):** هذا الملف الكودي (SPA Bundle) ليس مجرد مخرجات تجميعية (Build Output) قياسية مهملة، **بل هو ملف ثابت (Hardcoded) تم التعديل عليه يدوياً ودمجه مع الموقع المصدري**. يُعتبر الآن كملف برمجي أساسي (Static Source File). إحذر عند التعديل عليه حيث تتطلب أي محاولة لتغيير هيكلية (React) بداخله تركيزاً ودقة عالية، وتجرى التعديلات فيه مباشرة وبشكل دقيق.
- `data/products/`: قاعـدة بيانات المنتجات، حيث يخصص لكل منتج ملف JSON مستقل.
- `data/projects/`: قاعـدة بيانات معرض الأعمال — لكل مشروع ملف JSON مستقل بنفس نمط المنتجات. يدعم مصفوفة `media` غير متجانسة تجمع `image` (صور) و `video` (فيديوهات MP4 ذاتية الإنتاج مع poster) و `reel` (ريلزات إنستغرام غير مملوكة لنا — تُضمَّن عبر blockquote الرسمي وليس إعادة استضافة).
- `assets/projects/<slug>/`: مجلد الوسائط الخاص بكل مشروع (صور، فيديوهات، pisters الفيديو).
- `fr/` و `ar/`: المجلدات الخاصة باللغات الإضافية. تُولّد آلياً بواسطة `generate_localized.py` من القوالب الإنجليزية الجذرية. **أي تعديلات على الـ SEO أو الهيكلة يجب أن تتم في القوالب الإنجليزية ثم يُعاد تشغيل السكربت.**
- `scripts/`: أدوات البناء وسكربتات البايثون اللازمة لتوليد الفهارس والمخططات. تشمل:
  - `_lib.py`: **الوحدة المشتركة** — ثوابت موحّدة (`HOST`, `LANGS`, `OG_LOCALES`, `SITEMAP_EXCLUDE`) ومساعدات i18n/SEO (`t`, `make_meta_description`, `load_locale`, `set_html_lang_dir`, `og_locale_block`, `breadcrumb_jsonld`, `itemlist_jsonld`) + **`write_sitemap()`** المركزي (المولّد الوحيد لـ `sitemap.xml`، idempotent، يقرأ `products_index.json` و `projects_index.json` و `ROOT.glob('*.html')` من القرص).
  - `build_all.py`: **المنسّق** — يستدعي المراحل الثلاث في عملية بايثون واحدة (بدون subprocess). مُستحسن لعمليات البناء الشاملة.
  - `build_products.py`: يبني فهرس المنتجات + صفحات SEO الثابتة لكل منتج + يحقن ItemList JSON-LD في `products.html` + يكتب `sitemap.xml` عبر `_lib.write_sitemap()`. (سابقاً كان يستدعي `generate_static_seo.py` عبر subprocess؛ الآن مدموج داخلياً.)
  - `build_projects.py`: يبني فهرس معرض الأعمال `data/projects_index.json` + يستخرج أبعاد كل وسائط المشروع عبر Pillow + يولّد صفحات SEO لكل مشروع في `projects/` و `fr/projects/` و `ar/projects/` + يحقن ItemList JSON-LD في `previous-work.html` + يكتب `sitemap.xml` عبر `_lib.write_sitemap()`.
  - `generate_localized.py`: توليد نسخ الصفحات الجذرية المترجمة (`fr/index.html`، `ar/index.html`، إلخ) + ترجمة FAQ JSON-LD + **توطين كل كتل JSON-LD** (LocalBusiness و WebSite) بالـ `url` و `inLanguage` المناسبين + يكتب `sitemap.xml` عبر `_lib.write_sitemap()`.
  - `remove_bg.py`: إزالة الخلفيات عبر الذكاء الاصطناعي (مكتبة `rembg` ونموذج U²-Net). **ملاحظة:** يتطلب التثبيت المسبق للحزمة عبر `pip install "rembg[cpu]"`.
  - `remove_bg_traditional.py`: أداة بديلة (Fallback) تستخدم خوارزمية الإغراق اللوني (Flood Fill) التقليدية للمنتجات ذات الحواف الصلبة والمسطحة (مثل الشاشات) التي يفشل الذكاء الاصطناعي في تمييزها.
  - `crop_image.py`: قص الفراغ الشفاف من صور المنتجات لتملأ بطاقة المنتج بشكل متسق (مُصمم بفلتر ذكي يتجاهل الهوامش الشبحية الناتجة عن الذكاء الاصطناعي).

### جدول مرجعي سريع لسكربتات `scripts/` (Scripts Quick Reference)

| السكربت | النوع | الدور | المدخلات | المخرجات | متى تشغّله |
|---|---|---|---|---|---|
| `_lib.py` | وحدة مشتركة (مكتبة) | ثوابت + مساعدات i18n/SEO + `write_sitemap()` المركزي | — (يُستورد من السكربتات الأخرى) | — | لا يُشغَّل مباشرة |
| `build_all.py` | منسّق (Orchestrator) | يستدعي المراحل الثلاث بترتيبها في عملية بايثون واحدة | — | كل المخرجات أدناه | **الأمر المُستحسن لأي بناء شامل** |
| `generate_localized.py` | بناء (Build) | توليد نسخ `fr/` و `ar/` من الصفحات الجذرية + توطين JSON-LD (LocalBusiness/WebSite/FAQPage) | `index.html`, `products.html`, `previous-work.html`, `assets/locales/*.json` | `fr/*.html`, `ar/*.html`, `sitemap.xml` | عند تعديل قالب جذري أو قاموس ترجمة |
| `build_projects.py` | بناء (Build) | فهرسة المشاريع + استخراج أبعاد الوسائط (Pillow) + توليد صفحات SEO + حقن ItemList في `previous-work.html` | `data/projects/*.json`, `assets/projects/<slug>/*` | `data/projects_index.json`, `projects/*.html`, `fr/projects/*.html`, `ar/projects/*.html`, `previous-work.html` (محقون), `sitemap.xml` | عند إضافة/تعديل مشروع |
| `build_products.py` | بناء (Build) | فهرسة المنتجات + توليد صفحات SEO الثابتة + حقن ItemList في `products.html` (دمج `generate_static_seo.py` سابقاً) | `data/products/*.json` | `data/products_index.json`, `products/*.html`, `fr/products/*.html`, `ar/products/*.html`, `products.html` (محقون), `sitemap.xml` | عند إضافة/تعديل منتج |
| `remove_bg.py` | معالجة صور (AI) | إزالة خلفية صورة باستخدام `rembg` + U²-Net | صورة PNG/JPG | صورة PNG بخلفية شفافة | قبل إضافة صورة منتج جديد (الحالة العامة) |
| `remove_bg_traditional.py` | معالجة صور (تقليدية) | إزالة خلفية عبر Flood Fill (بديل) | صورة PNG/JPG | صورة PNG بخلفية شفافة | للمنتجات ذات الشاشات/الأسطح المستوية التي يفشل فيها AI |
| `crop_image.py` | معالجة صور | قص الهامش الشفاف حول المنتج وتمركزه | صورة PNG شفافة | صورة PNG مقصوصة | بعد `remove_bg*.py` دائماً |

**ملاحظات مهمة على الجدول:**
- **Idempotence**: كل من `generate_localized.py`, `build_projects.py`, `build_products.py` يكتب `sitemap.xml` كاملاً عبر `_lib.write_sitemap()` — الترتيب لم يعد يؤثر على صحة الـ sitemap.
- **ترتيب ItemList**: `build_projects.py` و `build_products.py` يحقنان في ملفات ينتجها `generate_localized.py` — لذا لضمان ItemList في النسخ الفرنسية/العربية، يجب تشغيل `generate_localized.py` **أولاً** (وهذا ما يضمنه `build_all.py` آلياً).
- **سكربتات الصور منفصلة**: `remove_bg*.py` و `crop_image.py` لا علاقة لها بدورة البناء — تُشغَّل يدوياً قبل إضافة أصول الصور إلى `assets/products/`.

---

## 2. نظام الترجمة وتعدد اللغات (i18n System)

الموقع مهيأ بالكامل لثلاث لغات: **الإنجليزية (en)**، **الفرنسية (fr)**، و**العربية (ar)**.
نظام الترجمة هنا خفيف، مستقل، ومخصص بشكل عميق، يعتمد على السكربت `assets/i18n.js`:

### كيف تعمل الترجمة تقنياً؟
1. **قواميس الترجمة (JSON Locales):** تتركز المفاتيح ونصوصها المقابلة في `assets/locales/<lang>.json`.
2. **الترجمة الديناميكية للعناصر (DOM Data Attributes):** يقوم السكربت بمسح الصفحة واستبدال النصوص استناداً للسمات التالية:
   - `data-i18n="..."`: يغير النص داخل العنصر المختار.
   - `data-i18n-alt="..."`: لترجمة النص البديل في الصور.
   - `data-i18n-attr="..."`: لتعديل سمات وصفية متنوعة ومفاتيح سيو (`data-i18n-title`).
3. **اندماج הـ SPA المخصص مع الترجمة:** بدلاً من انتظار تفاعل قسري، **تم التعديل برمجياً على `index-CGMiSPUa.js`** ليحتوي في تركيبته الأصلية على مفاتيح ترجمة (مثل `spa_a_sell_products`) وسمات `data-i18n` مدمجة باحترافية بداخل مصفوفاته وكائناته البرمجية، ليتحول من مجرد قالب أصم إلى نظام يتفاعل بانسجام وثيق مع قاموس الـ `i18n.js`.
4. **النصوص الصامتة (Text Nodes Map):** للجمل والتراكيب التفاعلية التي لا تمتلك أوسمة محددة في الـ SPA، يستخدم `i18n.js` قائمة برمجية تدعى `textReplacementMap` كآلية بديلة لتحويل النص الإنجليزي المعروض تلقائياً لنص مترجم.
5. **التقاط اللغة الفعالة:** النظام يلتقط اللغة من الروابط الفرعية (`/ar/`)، أو يستدعي الاختيار المفضل من التخزين المحلي `localStorage` إذا كان الزائر يتصفح الصفحة الرئيسية.
6. **⚠️ استثناء الحاويات ذات النصوص الديناميكية (Self-Translated / Dynamic Containers):** دالة `replaceTextNodesWithDict` تستخدم `TreeWalker` لاستبدال النصوص الإنجليزية بالمترجمة. **والأخطر:** تحفظ النص الأصلي في `parent.dataset.i18nOrigText` عند أول رؤية، ثم في كل تغيير DOM لاحق تستخدمه كـ baseline وتُعيد كتابة النص — مما يَعكس أي تحديث ديناميكي بنص ثابت من نفس العنصر. لذلك **يتم استثناء** الحاويات/العناصر التالية من الـ TreeWalker تماماً:
   - `#custom-products-root-wrapper` — كتالوج المنتجات (يقرأ JSON ثلاثي اللغة).
   - `#custom-product-detail-wrapper` — تفاصيل المنتج (يقرأ JSON).
   - `#custom-project-detail-wrapper` — تفاصيل المشروع (يقرأ JSON).
   - `#fs-modal-root` — ويزارد "Find Your Solution" (نصوص ديناميكية مُولَّدة عبر `t()` وقت الـ render، مع تحديثات مستمرّة لشريط التقدّم/رقم الخطوة).
   - `#cart-modal-root` — مودال السلّة (نصوص ديناميكية + أرقام الكميات +/-).
   - **أي عنصر يحمل `data-cart-badge`** — عدّاد السلّة في النڤ-بار. هذا استثناء بـ **سمة** وليس بـ id لأن الـ badge عنصر مفرد ليس له wrapper، ولأن هناك بادج واحد على Desktop وآخر على Mobile، وكلاهما يحتاج نفس الحماية. الشيك: `el.hasAttribute && el.hasAttribute('data-cart-badge')` في الـ `acceptNode`.

   **عند إضافة أي حاوية SPA جديدة تقرأ من JSON ثلاثي اللغة _أو_ تحدّث نصوصها ديناميكياً (counter, progress, live state)، يجب إضافة الـ `id` الخاص بها لقائمة الاستثناء في `i18n.js` (سطر ~373) لمنع الترجمة المزدوجة أو عودة النص لقيمته الأولى.** للعناصر بلا id (مثل بادج عدّاد متكرّر)، استخدم سمة مميّزة وافحصها بـ `hasAttribute`.

   **دروس مستفادة (Lessons learned):**
   - ويزارد Find Your Solution كان رقم الخطوة فيه يبقى عالقاً على "الخطوة 1 من 4" رغم أن الجسم وشريط التقدّم يتقدّمان. السبب: textContent للنص يتغيّر، لكن الـ MutationObserver في i18n.js يُطلَق بعد 120ms ويُعيد كتابة النص للقيمة المحفوظة في `dataset.i18nOrigText`. الإصلاح: إضافة `fs-modal-root` لقائمة الاستثناء.
   - **بادج السلّة كان "يرتدّ" لقيمة سابقة** بعد كل إضافة منتج جديد (مثلاً يصبح 21 لجزء من الثانية ثم يعود إلى 18). نفس الجذر السابق: i18n.js التقط القيمة الأولى كـ baseline على parent الـ badge عند أول مسح، ثم أعاد كتابتها فوق كل تحديث `cart.js`. الإصلاح: إضافة شيك `data-cart-badge` لقائمة الاستثناء. **الـ badge ليس داخل `cart-modal-root`** — هو في الـ SPA navbar مباشرة، فاستثناء المودال وحده غير كافٍ.

### إدارة المكونات العائمة (Floating Action Buttons)
لضمان التناسق البصري ونظافة الكود، تم توحيد تصميم الأزرار العائمة (زر تبديل اللغة `.lang-switch` وزر الواتساب `.mobile-dialer`) مركزياً داخل ملف **`assets/i18n.css`**:
- **مصدر واحد للتعديل (Single Source of Truth):** الخصائص المشتركة كدرجة اللون البرتقالي المخصصة للـ Brand، الظلال، وأبعاد الأزرار (كالدائرة بحجم `52px` للموبايل) موجودة في بلوك CSS موحد بأعلى الملف لتسهيل أي تغيير في تصميمها لاحقاً بخطوة واحدة.
- **التوازي والتوازن (Symmetrical Alignment):** صُمِّمت الأزرار لترتفع بمسافات متطابقة مليميترياً عن حافة الشاشة مقاسها `24px` للحفاظ على النظافة البصرية.
- **توجيه RTL التلقائي:** يتم عكس أماكن الأزرار وتوازنها تلقائياً (اليمين يصبح يساراً والعكس) عند تغيير اللغة من/إلى العربية بفضل قواعد `dir="rtl"` في نفس الملف. **لتسهيل الصيانة المستقبلية، يمنع إضافة خصائص عشوائية لهذه الأزرار عبر React ويفضل الاعتماد المباشر على `assets/i18n.css`.**

---

## 3. إدارة المنتجات والمحتوى (Product Catalog)

إدارة المنتجات مبنية على ملفات JSON وتولد بآلية المواقع الثابتة (SSG) لدعم محركات البحث بقوة. هناك ملف كامل `\.claude\commands\product.md` يفصّل طريقة إضافة المنتجات. والخلاصة:

1. **التعريف البرمجي للمنتج:** يتم إنشاء أو تعديل ملف المنتج في مسار `data/products/<id>.json`. مع التأكد من احتواء حقول العناوين والوصف والمواصفات على النصوص باللغات الثلاث (en, fr, ar).
2. **البناء والتوليد الآلي المنتظم:**
   بعد إنشاء المنتج أو تعديله، **يجب دائماً وبلا استثناء** تنفيذ الأمر التالي في موجه الأوامر:
   `python scripts/build_products.py`
   
   **العمليات التي ينجزها هذا السكريبت:**
   - إنتاج أو تحديث ملف الفهرسة `data/products_index.json` الضروري لتشغيل واجهة البحث والفلترة.
   - بناء وإعادة كتابة الصفحات الثابتة بصيغة HTML لكل اللغات داخل مسارات مثل (`/ar/products/` الخ).
   - إلحاق المنتجات وروابطها بقاعدة الروابط الشاملة للموقع `sitemap.xml` مع `lastmod` و `hreflang` (بما فيه `x-default`).
   - حقن `ItemList` JSON-LD في صفحة `products.html` (EN/FR/AR) لتحسين ظهور الكتالوج في محركات البحث.

---

## 3.1 إدارة معرض الأعمال (Project Portfolio)

معرض الأعمال يتبع نفس الفلسفة المعمارية لكتالوج المنتجات (JSON + SSG) لكنه مُحسَّن لصفحات دراسات حالة غنية بالوسائط المختلطة. ملف المهارة الكامل موجود في `.claude/commands/project.md`. الخلاصة:

1. **التعريف البرمجي للمشروع:** ملف في `data/projects/<slug>.json` يحتوي على:
   - حقول أساسية: `id`, `date`, `location`, `categories[]`.
   - حقول نصية ثلاثية اللغة: `title`, `short_description`, `description`.
   - `cover`: صورة البطاقة في صفحة `previous-work.html` + `og:image`.
   - `media[]`: مصفوفة وسائط غير متجانسة. كل عنصر له `type` من ثلاثة أنواع:
     - `image`: صورة مملوكة لنا (JPG/PNG/AVIF) + `alt` ثلاثي اللغة.
     - `video`: فيديو MP4 **ننتجه نحن** مع `poster` إلزامي (إطار ثابت يقود LCP ويمنع CLS).
     - `reel`: فيديو قصير 9:16 نملك حقوقه. يُخزّن محلياً بـ `/assets/reels/<slug>.mp4` ويُعرض كبطاقة ثابتة (Sticky Card) بوضع `autoplay muted` مع ميزة tap-to-unmute.
   - `related_products[]`: معرّفات منتجات مرتبطة (تتحوّل لاحقاً إلى `mentions[]` في JSON-LD).
   - `testimonial` (اختياري): اقتباس ثلاثي اللغة + اسم صاحبه → يُدرج في `review` داخل JSON-LD.
   - `duration_days` (اختياري): يُعرض كبادج بيانات المشروع.

2. **البناء الآلي:**
   ```bash
   python scripts/build_projects.py
   ```
   **ما الذي يفعله هذا السكربت:**
   - يقرأ كل `data/projects/*.json`.
   - يمرّ على كل عنصر `media` ويستخدم **Pillow** لاستخراج أبعاد الصور و poster الفيديوهات الحقيقية بالبكسل. تُكتب في `width`/`height` داخل الفهرس — هذا ما يسمح لشبكة الموزاييك بتقديم `aspect-ratio` دقيقاً بدون CLS. الـ Reels تُحدَّد افتراضياً بـ 1080×1920 (9:16) ويُقرأ الـ poster الخاص بها لو وُجد.
   - يكتب `data/projects_index.json` (مرتب تنازلياً بحسب `date`).
   - يولّد صفحات HTML ثابتة لكل مشروع × كل لغة في `projects/`, `fr/projects/`, `ar/projects/` مع كامل SEO (مثل المنتجات): hreflang, og:locale, CreativeWork JSON-LD, BreadcrumbList, noscript H1.
   - يحقن **`window.__PROJECT__`** inline في كل صفحة حتى يبدأ `project-detail.js` بالعرض فوراً دون fetch إضافي.
   - يحقن ItemList JSON-LD في `previous-work.html` (EN/FR/AR).
   - يكتب `sitemap.xml` كاملاً عبر `_lib.write_sitemap()` (ثابتة + منتجات + مشاريع). الـ sitemap دائماً كامل بغض النظر عن أي سكربت من الثلاثة شُغِّل آخراً.

3. **ترتيب التشغيل:**
   ```bash
   # الطريقة المُستحسنة — عملية بايثون واحدة:
   python scripts/build_all.py

   # أو تشغيل كل مرحلة مستقلّة (نفس الترتيب، نتيجة متطابقة):
   python scripts/generate_localized.py    # يولّد fr/ و ar/ الجذرية
   python scripts/build_projects.py         # المشاريع
   python scripts/build_products.py         # المنتجات
   ```
   **الترتيب لم يعد مسألة صحّة** — `_lib.write_sitemap()` يقرأ كل الفهارس من القرص في كل استدعاء، فـ `sitemap.xml` يبقى كاملاً بغض النظر عن أي سكربت شُغِّل آخراً. الترتيب مقترح فقط لأسباب الوضوح والأداء.

4. **استراتيجية Reels:**
   - يتم استضافة مقاطع الريل محلياً كملفات MP4 في مسار `/assets/reels/<project-slug>.mp4` لضمان الاستقرار وسرعة التحميل وبدون الاعتماد على Instagram iframe embeds.
   - تُعرض الريلز خارج شريط الصور المعرضي كـ **بطاقة ثابتة (Sticky Card)** بجوار النص الوصفي للمشروع.
   - يتحكم `project-detail.js` بتشغيل الفيديو بوضعية `autoplay, muted, playsinline, loop` لتوافقه التام مع أجهزة الجوال.
   - يتم إيقاف الفيديو عبر `IntersectionObserver` حين خروجه من إطار العرض للحفاظ على البطارية والموارد.
   - يظهر زر `unmute` بأعلى الفيديو لتشغيل الصوت عند النقر، وفي حال تم توفير رابط `instagram_url` إضافي، يظهر زر "View on Instagram" بالأسفل للتحويل لإنستغرام، وهو اختياري.

5. **تكامل صفحة `previous-work.html`:**
   الشبكة الـ 9-خانات التي كانت مكتوبة يدوياً في `index-CGMiSPUa.js` (السطر ~12358) استُبدلت بـ `S.useState` + `S.useEffect` يجلب `data/projects_index.json` ويعرض كل مشروع كبطاقة تشير إلى `/projects/<id>.html` (أو `/fr/...` / `/ar/...` حسب لغة الزائر). المهمة في الـ SPA bundle صارت: عرض ديناميكي مع روابط ذاتية اللغة.

6. **قسم Related Products على صفحة المشروع — دائماً 4 منتجات:**
   دالة `pickRelatedProducts(project, productsIndex)` في `assets/project-detail.js` تضمن أن القسم يعرض **4 بطاقات بالضبط** بغض النظر عن محتوى `related_products` في الـ JSON. الخوارزمية ثلاثية المسارات:
   - **القائمة الصريحة ≥ 4:** تُؤخذ أول 4 فقط (مع dedupe والتحقق من وجودها في `products_index.json`).
   - **القائمة الصريحة 1-3:** تُكمَّل الـ 4 بنظام نقاط ضد بقية الكتالوج: `+3` للـ brand مطابق، `+2` لكل technology مشترك، `+1` للـ product_type مطابق. ترتيب تنازلي.
   - **القائمة فارغة (0):** يُحسب hash بسيط (djb2 variant) من `project.id` يولّد offset حتمياً داخل `productsIndex` — كل مشروع يعرض شريحة ثابتة-ولكن-مختلفة من الكتالوج بدل أن يعرض جميع المشاريع نفس أول 4.
   - **التصميم:** البطاقات تستخدم كلاسات `.prod-card` و `.prod-grid` من `assets/products.css` (لا `proj-related-card*`) لتطابق صفحة المنتج بصرياً. لذلك `project.html` يُحمِّل `products.css` كذلك (راجع القسم 5 لاعتمادية CSS).

---

## 4. بنية SEO للموقع (SEO Architecture)

### صفحات المنتجات المولّدة (Auto-generated Product Pages)
كل صفحة منتج مولّدة تحتوي على:
- `<title>` + `<meta description>` مترجمين حسب اللغة.
- `hreflang` tags لكل اللغات الثلاث + `x-default` (يشير للنسخة الإنجليزية).
- Open Graph + Twitter Card tags كاملة مع صورة المنتج.
- `og:locale` + `og:locale:alternate` لكل لغة.
- JSON-LD `Product` schema مع `aggregateRating` + `BreadcrumbList`.
- `<meta name="robots" content="index, follow">` (يتم تجاوز قيمة القالب `noindex` آلياً).
- `<h1>` داخل `<noscript>` باسم المنتج — للزواحف التي لا تنفذ JavaScript.

### الصفحات الجذرية (Root Pages)
الصفحات الجذرية (`index.html`, `products.html`, `previous-work.html`) تحتوي على:
- `og:locale` + `og:locale:alternate` tags.
- `hreflang` لكل اللغات + `x-default`.
- `og:image` بصيغة PNG (وليس SVG — لتوافق Facebook/Twitter).
- JSON-LD: `LocalBusiness` + `WebSite` + `FAQPage` (في index.html).
- `<h1>` داخل `<noscript>` مع `data-i18n` لترجمته آلياً.

### اصطلاح التسمية التجارية في JSON-LD (Brand Naming)
- `"name": "S‑ELECTRICITY"` — الاسم الرسمي المكتوب (مع رمز Hyphen منقّط U+2011).
- `"alternateName": "SMART ELECTRICITY"` — الاسم المنطوق الكامل المخصص لإثراء Knowledge Graph وبحث Google autocomplete.
- مطبَّق على كلتا Schemas: `LocalBusiness` و `WebSite` في `index.html` و `previous-work.html` لكل اللغات.

### توطين JSON-LD عبر اللغات (JSON-LD Localization Pipeline)
`generate_localized.py` يمرّ على **كل** كتل JSON-LD في الصفحة ويحدّث كلاً بحسب `@type`:
- **LocalBusiness**: يُستبدل `description` بالمترجم + `url` بالـ canonical المحلي (مثل `https://smartelectricity.ma/ar/`).
- **WebSite**: يُحدَّث `url` للمسار المحلي + `inLanguage` يُضيَّق من `["en","fr","ar"]` إلى لغة واحدة (`"ar"` أو `"fr"` أو `"en"`).
- **FAQPage**: يُعالَج في دالة منفصلة (`replace_faq_jsonld`) تستخدم مفاتيح `faq_q1..4` / `faq_a1..4` من القواميس.

**درس مستفاد (Lesson learned):** في وقت سابق كان السكربت يحدّث الكتلة الأولى فقط (`count=1`)، مما ترك `WebSite.url` يشير للجذر الإنجليزي في كل اللغات. تسبّب ذلك في عرض Google صفحات العربية/الفرنسية بشكل "فتات خبز مقطوع" (`smartelectricity.ma › ...`) مع تصنيف "Translate this page" — لأن Google رأى تعارضاً بين `<link rel=canonical>` و `WebSite.url`. **أي تعديل مستقبلي على كتل JSON-LD يجب أن يراعي `@type` ويُحدَّث لكل لغة.**

### قالب product.html
- مُعلّم بـ `noindex, nofollow` — لأنه قالب SPA فارغ.
- `build_products.py` يتجاوز هذا آلياً ويضع `index, follow` في الصفحات المولّدة.

### ترتيب تشغيل السكربتات (Build Order)
عند تعديل أي شيء يؤثر على SEO، الطريقة المُستحسنة:
```bash
python scripts/build_all.py
```
أو بخطوات يدوية مستقلّة:
```
1. python scripts/generate_localized.py    ← يولّد fr/ و ar/ + يكتب sitemap
2. python scripts/build_projects.py         ← معرض الأعمال + يكتب sitemap
3. python scripts/build_products.py         ← المنتجات + يكتب sitemap
```
**ملاحظة:** `_lib.write_sitemap()` مركزي و idempotent — كل سكربت يكتب `sitemap.xml` كاملاً يشمل (ثابتة + منتجات + مشاريع) بغض النظر عن الترتيب. لذلك، تشغيل أي سكربت مستقلاً ينتج sitemap صالحاً وكاملاً (لم يعد هناك "محرر نهائي").

### ItemList injection ordering (ترتيب حقن ItemList)
`build_projects.py` يحقن ItemList في `previous-work.html`، و`build_products.py` يحقن ItemList في `products.html`. الاثنان يعدّلان ملفات تنتجها `generate_localized.py` — لذا **للحصول على ItemList في النسخ الفرنسية/العربية، يجب تشغيل `generate_localized.py` قبلها**. هذا قيد ترتيبي حقيقي (وليس مجرد مسألة sitemap). `build_all.py` يضمن هذا الترتيب آلياً.

### ملفات مستثناة من sitemap
محدّدة في `_lib.SITEMAP_EXCLUDE = {"product.html", "project.html", "404.html"}`. `_lib.write_sitemap()` يعتمد على `ROOT.glob('*.html')` ناقص هذه المجموعة — أي صفحة جذرية جديدة تُضاف تدخل sitemap آلياً دون تعديل كود.

---

## 5. قواعد التطوير الحذرة والنصائح المتبعة (Development Principles)

- **توحيد مصطلحات الفلترة:** عند استخدام تقنية جديدة أو خيارات تنصيب في منتج ما (Installation / Technology)، أضف مقابلها المترجم فورًا إلى قواميس `ar.json` و `fr.json` (باستخدام البادئة `val_`).
- **تحسين المظهر العام للمنتجات:** يجب استخدام أدوات إزالة الخلفية لتحويل الصور إلى (PNG شفافة):
  - استخدم `python scripts/remove_bg.py` للمنتجات العادية والبلاستيكية (AI).
  - استخدم `python scripts/remove_bg_traditional.py` كبديل للمنتجات ذات الشاشات السوداء أو الأسطح اللامعة المستوية (حيث قد يقوم الذكاء الاصطناعي بحفر المنتج من الداخل).
  - اتبع ذلك دائماً بـ `python scripts/crop_image.py` لقص الهوامش الشفافة وإظهار المنتج في المركز بانسجام.
- **الحفاظ على قوة المصطلحات الاصطلاحية:** أثناء توليد المحتوى العربي، يجب صيانة المصطلحات التقنية الأساسية (Wi-Fi، KNX، Router، MQTT) وإبقاؤها بلغتها الانجليزية لضمان عدم ضياع المعنى التقني الدقيق.
- **تجنب التعديلات اليدوية المحكوم عليها بالضياع:** أي صفحات مصممة تلقائياً (Auto-generated) كصفحات المنتجات المنفردة `.html` في مجلداتها، وملفات الـ `products_index.json` و `sitemap.xml`، يُحظر التعديل اليدوي عليها. لأن سكريبت البناء سيستبدلها بالكامل دائماً بناءً على ملفات `data/products/`.
- **التعديلات على القوالب الجذرية:** أي تغيير في `index.html` أو `products.html` أو `previous-work.html` (مثل إضافة meta tags، أو تعديل JSON-LD) يجب أن يتبعه تشغيل `python scripts/build_all.py` (أو `generate_localized.py` ثم `build_products.py`) لنشر التغيير لكل اللغات.
- **og:image يجب أن يكون PNG/JPG دائماً** — لا تستخدم SVG لأن Facebook و Twitter لا يدعمانه.
- **حذار Tailwind في SPA Bundle:** قبل إضافة أي كلاس Tailwind جديد داخل `index-CGMiSPUa.js`، تحقق من وجوده في `assets/index-CJ3jXuVd.css`. خلاف ذلك فضِّل inline styles. راجع قسم 7 للتفاصيل.
- **Schema JSON-LD يجب أن يطابق المحتوى المرئي دائماً:** خاصة `FAQPage` — أي تعديل بصري في أسئلة FAQ **يُلزمك** بتحديث JSON-LD + مفاتيح `faq_q*/a*` في القواميس. عدم التطابق يخالف إرشادات Google.
- **عند تعديل أي JSON-LD schema في قالب جذري:** تأكد أن `generate_localized.py` يعالج `@type` الجديد (الدالة `process_json_ld_block` في السطر ~130). السكربت الحالي يعرف `LocalBusiness` و `WebSite` و `FAQPage` فقط.
- **⚠️ ملفات الويزارد (Find Your Solution) مُشتركة عبر كل القوالب:** أي قالب جذري جديد يُحمّل SPA يجب أن يضيف **ثلاثة عناصر** في `<head>`:
  1. `<link rel="stylesheet" href="/assets/find-solution.css">`
  2. `<script defer src="/assets/find-solution.js"></script>`
  3. **inline bootstrap script** الذي يلتقط النقرة قبل تحميل defer (انظر القسم 9 للنموذج الكامل).
  بدون البوتستراب الـ inline، النقر السريع على زر "احجز استشارة مجانية" قد لا يفتح الويزارد على بعض الأجهزة البطيئة. بدون CSS، الـ Modal يظهر مكسور التنسيق.
- **⚠️ ملفات السلّة (WhatsApp Cart) مُشتركة كذلك عبر كل القوالب:** نفس النمط بالضبط — `cart.css` + `cart.js` + inline bootstrap (يلتقط `[data-trigger="cart-open"]` و `[data-trigger="cart-add"]`). بدون CSS، أيقونة السلّة في النڤ-بار تظهر بلا تنسيق وكذلك زر `+` على بطاقة المنتج وصف qty على صفحة التفاصيل. **انظر القسم 12 للنموذج الكامل.** ملاحظة: حتى الصفحات بلا منتجات (مثل `previous-work.html` و `project.html`) يجب أن تُحمّل ملفات السلّة لأن الـ SPA navbar (مع زر السلّة) يظهر فيها.
- **⚠️ اعتمادية CSS المشتركة بين الصفحات (Cross-Page CSS Dependency):** ملف `projects.css` لا يخدم صفحات المشاريع فقط — بل يحتوي على تنسيقات قسم CTA "Need a Custom Solution?" (`.proj-cta*`) الذي يُعرض عبر مكوّن `Od` في SPA Bundle على **كل صفحة** تُحمّل `index-CGMiSPUa.js`. **عند إنشاء أي قالب HTML جديد يُحمّل الـ SPA، يجب إضافة `<link rel="stylesheet" href="/assets/projects.css">` في `<head>`.** بدون ذلك، يظهر قسم الـ CTA كنص عارٍ بدون تنسيق عند التنقل عبر SPA إلى الصفحة الرئيسية.
  - **درس مستفاد (Lesson learned):** كانت صفحات المنتجات (`product.html`، `products.html`، والمُولّدة في `products/`) لا تُحمّل `projects.css`. عند انتقال المستخدم من صفحة منتج إلى الصفحة الرئيسية عبر SPA navigation (بدون إعادة تحميل كاملة)، كان قسم CTA يظهر معطوباً بصرياً (أيقونة واتساب ضخمة، بدون خلفية برتقالية، بدون تنسيق الأزرار). تم الإصلاح بإضافة `projects.css` في كل قوالب المنتجات + تشغيل `python scripts/build_all.py`.
  - **القاعدة:** كل ملفات CSS المُشار إليها في `index.html` يجب أن تكون مُحمّلة أيضاً في كل القوالب الأخرى (`product.html`, `products.html`, `project.html`, `previous-work.html`) لضمان اتساق المظهر أثناء التنقل SPA.
  - **`products.css` على `project.html`:** صفحة المشروع تُحمِّل أيضاً `assets/products.css` لأن قسم Related Products فيها يستخدم كلاسات `.prod-card` و `.prod-grid` (مطابقة بصرية لصفحة المنتج). إن أزال أحدهم هذا الـ link مستقبلاً ظاناً أنه دخيل، ستظهر بطاقات Related Products بدون تنسيق. المرجع الكامل في القسم 3.1 نقطة 6.
- **⚠️ اعتمادية JS+CSS pair dependency (Cross-Page JS Dependency):** القاعدة السابقة عن CSS تنطبق **بنفس القوة** على الـ JS scripts التي تتحكّم بمحتوى ديناميكي يظهر عبر SPA navigation. مثال محسوس: `homepage-products.js` يحقن قسم "Our Products" في الصفحة الرئيسية عبر MutationObserver + patched `pushState`. السكربت يبقى مقيماً في الذاكرة عبر SPA navigation طالما حُمِّل **مرّة واحدة على الأقل**.
  - **درس مستفاد (Lesson learned):** سيناريو الفشل: زائر يفتح صفحة مشروع مباشرة (`/projects/villa-knx-tetouan.html` من بحث Google أو رابط مشاركة) → يضغط "الرئيسية" في النڤ-بار → SPA navigation للرئيسية. **لكن** قسم "Our Products" لم يظهر! السبب: `project.html` كان يُحمِّل `homepage-products.css` فقط (أُضيف ضمن جولة توحيد CSS) لكن **بلا** `homepage-products.js`. بدون السكربت، لا أحد يحقن القسم. CSS وحده لا يفعل شيئاً عندما لا يوجد DOM ليُلوِّنه.
  - **القاعدة الموسَّعة:** أي ملف JS يتحكّم بمحتوى يظهر على صفحة محدّدة (مثل الرئيسية) عبر SPA navigation **يجب** تحميله أيضاً على كل القوالب التي يمكن للمستخدم البدء منها كـ entry point ثم الانتقال لتلك الصفحة. عملياً: `index.html`, `products.html`, `product.html`, `project.html`, `previous-work.html` يجب أن تُحمّل **نفس مجموعة CSS+JS** (مع استثناءات محدّدة جداً).
  - **Pattern check:** قبل دمج أي تغيير يضيف `<link>` لـ CSS، اسأل: "هل لهذا الـ CSS سكربت مرافق؟ إذا نعم، هل أضفته كذلك؟"

---

## 6. صور الصفحة الرئيسية (Homepage Images)

الصفحة الرئيسية (SPA في `index-CGMiSPUa.js`) تستخدم صوراً ثابتة مرجعية من مجلد `assets/`. هذه الصور **ليست مضمّنة كـ base64** بل يُشار إليها بمسارات نسبية (`/assets/...`) داخل كود JavaScript في الملف المجمّع.

### صور Hero (القسم العلوي — ملء الشاشة)
الـ Hero يغطي كامل ارتفاع الشاشة (`h-[100dvh]`) ويستخدم `background-image` مع `background-size: cover`:

- **Desktop** (≥ 768px): `/assets/roomwebp.webp`
- **Mobile** (< 768px): `/assets/Vila-big-background.webp`

الاختيار يتم ديناميكياً عبر `window.innerWidth` في سطر ~11411:
```js
backgroundImage: `...url('${window.innerWidth < 768 ? "/assets/Vila-big-background.webp" : "/assets/roomwebp.webp"}')`
```

> **ملاحظة:** لأن الصورة تُحمّل عبر CSS `background-image` المُولّد بـ JavaScript، لن يبدأ المتصفح بتحميلها حتى يُنفذ JS. لذلك يُنصح بإضافة `<link rel="preload">` في `<head>` لتسريع LCP.

### صور قسم "What We Do" (سطر ~11972–11981)
- **صورة 1:** `/assets/camera-man.webp` — تقني تركيب كاميرات مراقبة
- **صورة 2:** `/assets/smart-dashboard-panel.webp` — لوحة تحكم ذكية

كلتا الصورتين تستخدمان `loading="lazy"` لأنهما تحت الطيّة (below the fold).

### كيفية تعديل الصور
لتغيير أي صورة في الصفحة الرئيسية:
1. ضع الصورة الجديدة في `assets/` بصيغة `.webp` (الأمثل للويب).
2. إذا تغيّر اسم الملف، عدّل المسار في `assets/index-CGMiSPUa.js` مباشرة (ابحث عن اسم الملف القديم).
3. أعد تشغيل `python scripts/build_all.py` (أو `generate_localized.py` ثم `build_products.py`) لنشر التغييرات.
4. **لا حاجة لإعادة بناء الـ SPA** — الصور مُشار إليها بمسارات نسبية ثابتة.

### أبعاد الصور الموصى بها
| الاستخدام | الأبعاد الموصى بها | الحجم الأقصى |
|---|---|---|
| Hero Desktop | 1920×1080 | ≤ 200 KB |
| Hero Mobile | 1200×800 | ≤ 150 KB |
| صور الأقسام (What We Do) | 800×500 أو أكبر | ≤ 80 KB |

---

## 7. المرجع التقني لـ SPA Bundle (`index-CGMiSPUa.js`)

هذا الملف هو النواة التفاعلية للصفحة الرئيسية. بما أنه مُصغَّر/مُعدَّل يدوياً، هذه المراجع السريعة تختصر وقت أي تعديل مستقبلي.

### اصطلاحات الأسماء بعد التصغير (Minification Aliases)
- **`S`** = كائن React. كل hooks تُستدعى عبره:
  - `S.useState`، `S.useEffect`، `S.useRef`، `S.useMemo`
- **`u.jsx` / `u.jsxs`** = دوال JSX runtime (من `react/jsx-runtime`).
  - `u.jsx` لعنصر بطفل واحد (أو بدون أطفال).
  - `u.jsxs` لعنصر بعدة أطفال (array of children).
- **المكوّنات** تحمل أسماء مختصرة ومُحرَّمة للقراءة: مثل `nv` (FAQ)، `Od` (Need a Custom Solution)، `rv` (Smart Home Focus)، `av` (Navbar). اعثر على المكوّن المطلوب دائماً عبر البحث عن مفتاح `data-i18n` مميّز داخله.

### بنية الـ Navbar (مكوّن `av`)
الـ navbar حالياً يحتوي 4 أطفال داخل الـ `<div className="container...">` (سطر ~12647):
1. `<Mt to="/">` — اللوغو.
2. `<nav className="hidden md:flex...">` — روابط Desktop + **زر السلّة Desktop** (آخر طفل، بـ `data-trigger="cart-open"`).
3. `<div className="md:hidden flex items-center">` — wrapper يجمع **زر السلّة Mobile** + **الهامبرغر** ليبقيا مرئيين معاً على الموبايل (لأن `justify-between` على الأب كان سيوزّعهما).
4. القائمة المنسدلة (`<div className="md:hidden bg-secondary...">`) — تحوي روابط Mobile فقط (بلا CTA — زر "Call Now" حُذف نهائياً عند إضافة السلّة في 2026-04).

**درس مستفاد:** عند إضافة عنصر مرئي على الموبايل بجانب الهامبرغر داخل `justify-between` parent، يجب لفّهما في wrapper مشترك بـ `flex items-center`. وإلا الـ flex parent سيوزّعهما عبر العرض كله.

### تحذير Tailwind CSS (الأهم عند التعديل)
`assets/index-CJ3jXuVd.css` هو ملف CSS **مُجمَّع مسبقاً** (Pre-built Tailwind). يحتوي فقط على الكلاسات التي كانت مستخدمة في الكود المصدري الأصلي وقت البناء. **أي كلاس Tailwind جديد تضيفه داخل `index-CGMiSPUa.js` قد لا يعمل** لأنه ببساطة غير موجود في CSS.

أمثلة واقعية على كلاسات موجودة / مفقودة:
| ✅ موجودة ومؤكَّدة | ❌ غير مُجمَّعة |
|---|---|
| `space-y-3`, `space-y-6` | `space-y-4` |
| `p-6`, `p-4` | `p-5` |
| `text-xl`, `text-2xl`, `text-lg` | `text-start` (v3.3+) |
| `bg-white`, `shadow-md`, `rounded-lg` | `transition-colors` |
| `text-primary`, `bg-primary` | `flex-shrink-0`, `leading-none` |

**قواعد تعديل المظهر في SPA Bundle:**
1. إن كنت متأكداً أن الكلاس موجود (مستخدم في مكوّن آخر) — استخدمه.
2. إن لم تكن متأكداً — تحقق بـ `Grep` على ملف `index-CJ3jXuVd.css` أولاً.
3. إن كان الكلاس غير موجود — استخدم إما **inline styles** (`style: {...}`) أو **inline `<style>` block** داخل المكوّن عبر `u.jsx("style", {children: "..."})`.
4. لا تحاول إعادة بناء Tailwind — ستكسر الموقع.

### قيم التصميم المرجعية
- **اللون الأساسي**: `--primary-color: #b86c25` (برتقالي-بُنّي نحاسي). استخدم `text-primary` أو `bg-primary` في Tailwind، أو `var(--brand, #b86c25)` في CSS مخصّص (يقرأ من `assets/brand.css`)، أو `#b86c25` في inline styles داخل SPA bundle. **`brand.css` هو المصدر الواحد لكل لون البراند منذ 2026-04-30 — راجع §10.**
- **Tailwind opacity variants — تحذير:** الـ classes مثل `bg-primary/10`, `from-primary`, `border-primary/20` كانت تستخدم لون أزرق رمادي قديم (`#3a7ca5`) بسبب Tailwind drift. صُحِّحت في 2026-04-30 لكن **عند أي تعديل مستقبلي على هذه الـ variants تأكّد من القيمة الفعلية**.
- **Fonts**: `font-exo` و `font-poppins` (Tailwind aliases) — كلاهما يُحلّ الآن إلى **`Readex Pro`** (variable font، عائلة واحدة تغطي Latin + Arabic). تغيير 2026-04-29 لتوحيد التيبوغرافي عبر EN/FR/AR. الأوزان: 400/500/600/700. **سبب الاختيار:** rendering ناعم على Windows/Chrome (IBM Plex Arabic كان يبدو "مبكسلاً" في الأحجام الصغيرة).

### آلية `fade-in` العامة
يوجد `IntersectionObserver` مشترك في مكوّنات مثل `Od` و `rv` يلاحظ كل `.fade-in` في الصفحة ويضيف كلاس `.visible` عند الظهور في viewport. إذا أضفت عنصراً بـ `className: "fade-in"`، سيستفيد تلقائياً من هذا النظام بدون إعداد إضافي.

### التعديل الآمن في ملف الـ SPA (Patching Minified JSX)
بما أن ملف `index-CGMiSPUa.js` مضغوط (minified) ويعمل كملف ثابت، يجب إجراء أي تعديلات هيكلية داخله بأسلوب "الترقيع الجراحي" (Surgical Patching) لتفادي كسر الموقع:
1. **استخراج الكود المطابق تماماً:** بدلاً من تعديل الملف يدوياً، استخدم أداة أو سكربت بايثون مع `regex` للعثور على المنطقة المستهدفة ونسخها كمتغير `target` كما هي بحرفيتها وبمسافاتها.
2. **صناعة الكود البديل (Replacement):** اكتب الكود الجديد مع الالتزام الصارم بصيغة `react/jsx-runtime` (`u.jsx`, `u.jsxs`) واستخدم `className` بدلاً من `class`. لدمج الرسوميات كـ SVG يُفضل استخدام `dangerouslySetInnerHTML: { __html: '<svg>...</svg>'}` لضمان عملها بشكل سليم.
3. **الاستبدال الآمن:** قم باستبدال الـ `target` بـ `replacement` برمجياً بالاعتماد على التتطابق النصي 100% (`text.replace`) والتأكد من نجاحه وتجنب كسر الـ React Bundle. 
4. **فائدة هذه الطريقة:** تضمن هذه الممارسة دمج التعديلات الجديدة (كالتصميم الموحد للـ CTA) كأجزاء أساسية ومدمجة أصلياً (Native) في الموقع، لتتدفق بسلاسة تامة أثاء تنقل الزائر في تطبيق الصفحة الواحدة (SPA) دون اللجوء لحلول ترقيعية خارجية مثل الـ `MutationObserver` التي تسبب وميضاً.

---

## 8. قسم FAQ (Accordion + نظام المفاتيح المزدوج)

### المكوّن ودوره
قسم الأسئلة الشائعة مُعرَّف في المكوّن `nv` داخل `index-CGMiSPUa.js` (قرب السطر ~11758). تم تحويله من بطاقات ثابتة إلى **accordion قابل للطي** بالمواصفات التالية:
- ARIA كامل: `aria-expanded`، `aria-controls`، `role="region"`، `aria-labelledby`.
- حركة سلسة عبر تقنية `grid-template-rows: 0fr → 1fr`.
- أيقونة chevron SVG تدور 180° عند الفتح.
- السؤال الأول **مفتوح افتراضياً** (`S.useState(0)`) لتحسين LCP ورؤية المحتوى فوراً.
- **دعم الروابط المباشرة** عبر hash: `https://smartelectricity.ma/#faq-2` يفتح السؤال الثالث.
- يحترم `prefers-reduced-motion` (يعطل الانتقالات لمن يطلبها).
- يستمع لـ `hashchange` ليستجيب للروابط الداخلية أثناء الجلسة.

### ⚠️ نظام المفاتيح المزدوج (Dual-Key System) — اقرأ بعناية
محتوى الأسئلة الشائعة يعيش **في مكانين منفصلين** داخل قواميس الترجمة `assets/locales/<lang>.json`:

| الموقع | المفاتيح | الاستخدام |
|---|---|---|
| 1. الأكورديون المرئي (SPA) | `spa_q_services`, `spa_a_services`, `spa_q_price`, `spa_a_prices`, `spa_q_sell_products`, `spa_a_sell_products`, `spa_q_schedule`, `spa_a_schedule` | يقرأها `data-i18n` على عناصر الأكورديون |
| 2. FAQPage JSON-LD | `faq_q1`, `faq_a1`, `faq_q2`, `faq_a2`, `faq_q3`, `faq_a3`, `faq_q4`, `faq_a4` | تُستخدم في `replace_faq_jsonld()` لترجمة schema |

**عند تعديل أي سؤال/إجابة يجب تحديث المكانين في كل اللغات الثلاث + تحديث FAQPage JSON-LD الإنجليزي في `index.html` يدوياً.** وإلا يحدث **عدم تطابق بين schema والمحتوى المرئي** — وهو مخالف لإرشادات Google ويُعرِّض الموقع لعقوبة يدوية.

### Checklist تعديل أسئلة FAQ
1. ✅ حدِّث `spa_q_*` / `spa_a_*` في `en.json` و `fr.json` و `ar.json`.
2. ✅ حدِّث `faq_q1..4` / `faq_a1..4` في `en.json` و `fr.json` و `ar.json` (نفس الترتيب!).
3. ✅ عدِّل `FAQPage` JSON-LD في `index.html` يدوياً (النسخة الإنجليزية).
4. ✅ إن غيّرت عدد الأسئلة، عدِّل المصفوفة `e` داخل `nv` في `index-CGMiSPUa.js`.
5. ✅ شغِّل `python scripts/build_all.py` (أو `generate_localized.py` ثم `build_products.py`).
6. ✅ اختبر `https://site/#faq-0` و `#faq-3` للتأكد من صحة deep-linking.

---

## 9. ويزارد "Find Your Solution" (المساعد التفاعلي)

ويزارد متعدّد الخطوات يساعد العميل على تحديد ما يحتاجه (نوع المبنى → الخدمات → أسئلة فرعية → تفاصيل المشروع → ملخّص + رسالة واتساب جاهزة بلغته). الغاية الاستراتيجية: العميل المغربي العادي لا يعرف الفرق بين KNX و Wi-Fi ولا أنواع الكاميرات، لذا الويزارد يقود الحوار بدلاً من سؤال مفتوح "ماذا تريد؟".

### المكوّنات والملفات

| الملف | الدور |
|---|---|
| `assets/find-solution.js` | منطق الويزارد كاملاً (state, step sequence, render, validation, WhatsApp message). ملف مستقل بدون أي إطار عمل. |
| `assets/find-solution.css` | تصميم Modal ملء الشاشة، RTL-aware، responsive، ألوان البراند، حركات `fade-in`. |
| `assets/locales/{en,fr,ar}.json` | ~85 مفتاح بـ prefix `wizard_*` لكل خطوات الويزارد ورسائل الواتساب. |
| Inline bootstrap script | داخل `<head>` كل قالب جذري — يلتقط النقرة فوراً ويُعيد محاولة الفتح حتى تجاهز `window.FindSolution`. |
| استثناء `i18n.js` | `#fs-modal-root` مُضاف لقائمة استثناء `replaceTextNodesWithDict` (سطر 373) — راجع القسم 2.6 للـ "لماذا". |
| تعديل SPA bundle | زر "احجز استشارة مجانية" في قسم About محوَّل من `<a href="tel:...">` إلى `<button data-trigger="find-solution">` بأيقونة Sparkles. |

### آلية التفعيل (Trigger Mechanism)

أي عنصر يحمل **`data-trigger="find-solution"`** على أي صفحة تُحمّل `find-solution.js` يفتح الويزارد آلياً عند النقر. لا حاجة لتعديل JS — فقط أضف السمة.

كذلك يلتقط الويزارد كل نقرة على أي عنصر يحمل `[data-i18n="spa_cta_book_visit"]` (الزر الموجود في قسم About بـ SPA bundle) — للتوافق العكسي.

**نقاط التفعيل الفعلية في الموقع** (للمراجعة السريعة):
| الموقع | المكوّن | الملف |
|---|---|---|
| زر "احجز استشارة مجانية" في قسم About (Hero الثاني) | SPA component | `assets/index-CGMiSPUa.js` (`spa_cta_book_visit`) |
| زر "Find Your Solution" داخل بانر "Need a Custom Solution?" — الصفحة الرئيسية | SPA component (`Od`) | `assets/index-CGMiSPUa.js` (~11939) |
| زر "Find Your Solution" داخل بانر "Need a Custom Solution?" — صفحات المشاريع | `renderCta()` | `assets/project-detail.js` (~520) |

**ملاحظة CSS (button vs anchor):** عند تحويل عنصر CTA يستخدم كلاسات الموقع (مثل `.proj-cta-btn`) من `<a>` إلى `<button>`، تَسرَّب أنماط المتصفّح الافتراضية للزر (border, font-family, line-height). الـ reset الكافي:
```css
button.proj-cta-btn {
  border: none;
  cursor: pointer;
  font-family: inherit;
  line-height: inherit;
}
```
استخدم نفس الفكرة لأي كلاس CTA مشترك بين `<a>` و `<button>` في المستقبل (لا تضع border:none على `.proj-cta-btn` نفسه — ستكسر `.proj-cta-btn-secondary` التي تحتاج border للحدود البيضاء).

### Inline bootstrap (سبب وجوده — race condition)

`find-solution.js` يُحمَّل بـ `defer`، مما يعني أنه ينفّذ بعد انتهاء HTML parse. المشكلة: إذا نقر المستخدم بسرعة جداً بعد reload (خاصة بعد cache clear)، النقرة قد تصيب الزر **قبل** تسجيل مستمع النقر → النقرة تنفّذ السلوك الافتراضي (مثلاً `tel:` لو كان موجوداً).

الإصلاح ثُلاثي الطبقات:
1. **حذف `tel:` تماماً من الزر** عبر تعديل SPA bundle → حتى لو فشل JS كلياً، الزر لن يُجري اتصالاً.
2. **inline bootstrap script** في `<head>` كل قالب جذري → يُسجَّل مستمع النقر أثناء HTML parse (قبل defer)، يلتقط النقرة، ويُعيد محاولة `window.FindSolution.open()` كل 80ms (50 محاولة = ~4 ثوان).
3. **مستمع داخل `find-solution.js` مُزال** → لتجنّب double-trigger (الـ bootstrap كافٍ).

```html
<!-- النموذج المُكرَّر في رأس كل قالب جذري -->
<link rel="stylesheet" href="/assets/find-solution.css">
<script defer src="/assets/find-solution.js"></script>
<script>
  (function () {
    document.addEventListener('click', function (e) {
      var hit = e.target.closest('[data-trigger="find-solution"], [data-i18n="spa_cta_book_visit"]');
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      (function tryOpen(retries) {
        if (window.FindSolution && typeof window.FindSolution.open === 'function') {
          window.FindSolution.open();
        } else if (retries > 0) {
          setTimeout(function () { tryOpen(retries - 1); }, 80);
        }
      })(50);
    }, true);
  })();
</script>
```

### بنية الـ State والـ Step Sequence

```js
state = {
  buildingType: null,        // villa, apartment, shop, office, restaurant, farm, other
  services: [],              // ['smart_home','electrical','cameras','network'] — متعدد
  smartHome: [],             // sub-controls (lighting, climate, ...)
  electrical: null,          // single (new_install, full_renovation, ...)
  cameras: [],               // sub-equipment (indoor, outdoor, doorbell, lock, alarm)
  cameraCount: null,         // '1-2' | '3-5' | '6+'
  network: [],               // sub-issues
  networkOther: '',          // free text إذا اختار "أخرى"
  projectStage: null,        // building, renovating, completed, planning
  city: '', name: '',        // اختياري
  budget: null               // اختياري + شرطي (انظر shouldShowBudget)
};
```

تسلسل الخطوات (`stepSequence`) **ديناميكي** يُعاد بناؤه عبر `buildStepSequence()` بناء على ما اختاره المستخدم في الخطوة 2:
- ثابتة: `['building', 'services', ..., 'details', 'summary']`
- متغيّرة: تُحقن خطوة فرعية واحدة لكل خدمة مختارة (`smart_home`, `electrical`, `cameras`, `network`).
- المجموع: من 4 خطوات (لا خدمات) إلى 8 خطوات (كل الخدمات).

### منطق الميزانية الشرطي

`shouldShowBudget()` يُظهر سؤال الميزانية فقط إذا تحقّق أحد:
- ⚡ كهرباء: `new_install` أو `full_renovation`
- 🏠 المنزل الذكي: أي اختيار
- 📡 شبكة: `new_setup`

في الحالات البسيطة (إصلاح عطل، تجديد جزئي، 1-2 كاميرا) → **لا يظهر السؤال إطلاقاً** — لتجنّب إحراج العميل بسؤال غير مناسب لحجم الطلب.

### توليد رسالة الواتساب

`buildWhatsAppHref()` يبني رسالة منسّقة بـ bullet style مع emojis، تُرَتَّب فيها كل اختيارات المستخدم بلغته الفعّالة، تنتهي برابط `https://wa.me/212654132112?text=<encoded>`. الحقول الاختيارية الفارغة لا تظهر في الرسالة.

### قواعد التعديل

- **إضافة خيار جديد لخطوة موجودة:** أضف entry لمصفوفة الـ OPTIONS المناسبة (`SMART_HOME_OPTS`, `CAMERA_OPTS`, إلخ) + أضف مفاتيح الترجمة الثلاث في `wizard_{prefix}_{id}` بـ `en/fr/ar.json`.
- **إضافة خطوة فرعية جديدة:** عدّل `buildStepSequence()` + أضف `if (stepKey === '...')` block في `renderStep()` + أضف case في `isCurrentStepValid()` + أضف rows في `renderSummary()` + أضف rows في `buildWhatsAppHref()`.
- **تعديل صياغة سؤال:** غيّر القيمة في `assets/locales/{lang}.json` (مفاتيح `wizard_q_*`). **لا تعدّل النص داخل `find-solution.js`** — هو fallback فقط.
- **إضافة زر مُحفِّز جديد على أي صفحة:** أضف `data-trigger="find-solution"` للعنصر. يفتح الويزارد آلياً.
- **حذف الويزارد من صفحة معيّنة:** احذف `<link>` و `<script>` لـ find-solution من القالب الجذري المعني.

### ⚠️ تحذيرات

- **لا تستخدم `data-i18n` داخل عناصر الويزارد** — الترجمة تتم وقت الـ render عبر `t()` المحلي. أي `data-i18n` سيُطلِق مسار `applyTranslations` في i18n.js ويتعارض.
- **لا تنزع `id="fs-modal-root"`** عن حاوية الويزارد — هو السبيل الوحيد لاستثنائها من الـ TreeWalker (انظر القسم 2.6).
- **لا تُعِد إضافة `<a href="tel:...">` لزر "احجز استشارة مجانية"** — سيُعيد المشكلة الأصلية (race condition + اتصال هاتفي عند النقر السريع). الزر مخصّص حصرياً لفتح الويزارد.
- **عند تشغيل أي build script** بعد تعديل القوالب الجذرية، ستنتشر التغييرات تلقائياً لكل النسخ الفرنسية والعربية وصفحات المنتجات/المشاريع المُولَّدة.

### استراتيجية إعادة الرسم (Render Strategy) — لا تستدعِ `renderStep` داخل `onPick`

**القاعدة:** كل callback نقر على خيار يجب أن يحدّث **حالة العناصر المتأثرة فقط** بدون إعادة بناء الخطوة كاملة. السبب التقني: حاوية كل خطوة هي `<div class="fs-step-fade">` وتشتغل عليها CSS animation `fsFadeIn 0.3s`. كل استدعاء لـ `renderStep(stepKey, body)` يفعل `body.innerHTML = ''` ثم يُنشئ wrapper جديداً → تُعاد الانيميشن → **رمش بصري ملحوظ** يكسر الانطباع الاحترافي.

**النمط الصحيح:** helper `updateOptionStates(grid, isSelected)` يمرّ على الأزرار في الشبكة فقط ويبدّل `class="fs-selected"` و `aria-pressed`:
```js
function updateOptionStates(grid, isSelected) {
  grid.querySelectorAll('.fs-option').forEach(function (btn) {
    var sel = !!isSelected(btn.getAttribute('data-id'));
    btn.classList.toggle('fs-selected', sel);
    btn.setAttribute('aria-pressed', sel ? 'true' : 'false');
  });
}
```
ثم في كل خطوة، احفظ مرجع الشبكة محلياً واستخدمه في `onPick`:
```js
const grid = renderOptionGrid(BUILDING_TYPES, {
  isSelected: function (id) { return state.buildingType === id; },
  onPick: function (id) {
    state.buildingType = id;
    updateOptionStates(grid, function (x) { return state.buildingType === x; });
    updateFooter(); // فقط تحديث footer + progress
  }
});
```
الـ `renderStep` الكامل يُستدعى **فقط** عند: `goNext`, `goBack`, `open()` — أي عند انتقال خطوة فعلي.

### نمط الأقسام الفرعية الشرطية (Conditional Sub-Sections)

عندما يحتاج اختيار في الخطوة إلى إظهار/إخفاء قسم فرعي (مثل: اختيار "Other" يُظهر input حر، أو اختيار كاميرا يُظهر سؤال العدد)، **لا تعتمد على `renderStep` كاملاً** — استخدم نمط `sync` موضعي:

```js
let countSection = null;            // مرجع للقسم الفرعي
function buildCountSection() { /* يبني ويعيد الـ DOM node */ }
function syncCountSection() {
  const need = hasActualCamera();
  if (need && !countSection) {
    countSection = buildCountSection();
    wrap.appendChild(countSection);
  } else if (!need && countSection) {
    countSection.remove();
    countSection = null;
    state.cameraCount = null;       // **مهم:** صفّر الحالة عند الإخفاء لتجنّب بيانات شبحية
  }
}
// استدعِ syncCountSection() في onPick + مرة عند الـ initial mount
```

**ميزات النمط:** الشبكة الأم لا تُعاد رسمها (لا رمش)، الانيميشن لا تُعاد، الحالة المرتبطة بالقسم المُخفى تُصفَّر تلقائياً.

### نمط Logical Gating للأسئلة الفرعية

ليست كل اختيارات المستخدم تستدعي نفس السؤال التالي. مثال محسوس: في خطوة `cameras`، سؤال "تقريباً كم كاميرا؟" مطلوب فقط لـ `indoor`/`outdoor` (كاميرات حقيقية). أما `doorbell`/`lock`/`alarm` فهي وحدات مفردة لا تحتاج عدّاً.

**النمط:** عرّف whitelist واضحاً + helper:
```js
const ACTUAL_CAMERA_IDS = ['indoor', 'outdoor'];
function hasActualCamera() {
  return state.cameras.some(function (c) {
    return ACTUAL_CAMERA_IDS.indexOf(c) !== -1;
  });
}
```
استخدمه في **ثلاثة مواضع** متزامنة:
1. `syncCountSection()` للظهور/الإخفاء في الـ UI.
2. `isCurrentStepValid()` للتحقق من صحة الخطوة (هل العدد مطلوب؟).
3. `renderSummary()` و `buildWhatsAppHref()` لمنع إظهار قيمة شبحية في الملخّص/الواتساب.

**درس مستفاد:** الـ gating logic يعيش في 3-4 أماكن — ضع الشرط في helper واحد وادعُه من كل مكان، لا تكرّر الشرط.

### نظام الأيقونات (Lucide + Tabler SVG)

**القاعدة:** الويزارد يستخدم أيقونات SVG inline من مصادر مفتوحة (Lucide + Tabler — كلاهما MIT). ممنوع الإيموجي في بطاقات الخيارات (غير احترافي). الإيموجي يُحفَظ فقط للملخّص ورسالة الواتساب (نص خام).

**النمط (Dual-icon Pattern):** كل entry في مصفوفات الخيارات يحمل حقلين:
```js
{ id: 'villa', icon: ICONS.home, emoji: '🏡', label: 'wizard_b_villa' }
```
- `icon` → SVG string، يُعرض في بطاقة الويزارد عبر `el('span', { html: item.icon })`.
- `emoji` → نص بسيط، يُستخدم في `renderSummary()` و `buildWhatsAppHref()`.

**قاموس `ICONS`:** كل الأيقونات في كائن واحد بأعلى الملف. helper:
```js
function svg(content) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>';
}
const ICONS = { home: svg('<path d="..."/>'), /* ... */ };
```

**استخدام `currentColor`:** SVG لا يحدّد لوناً ثابتاً — الـ CSS يتحكّم:
```css
.fs-option-icon { color: var(--fs-orange); }
.fs-option-icon svg { width: 28px; height: 28px; display: block; }
.fs-options-list .fs-option-icon svg { width: 22px; height: 22px; }
.fs-option.fs-selected .fs-option-icon { color: var(--fs-orange-dark); }
```
هذا يضمن: لون موحّد طبيعي + أغمق عند الاختيار + يستجيب لأي تغيير في الـ brand color مستقبلاً.

**`el()` helper يدعم `html`:** السبب التقني لتمرير SVG كـ string عبر `el('span', { html: '<svg>...</svg>' })`. الـ helper يفعل `node.innerHTML = attrs.html`. لا تستخدم `children` لـ SVG لأنه سيتحوّل إلى text node فيُعرض كنص.

#### ⚠️ لا تكتب مسارات SVG من الذاكرة — اجلبها من المصدر الرسمي

**درس مستفاد قاسٍ:** كتبتُ مسار `siren` من الذاكرة، فاختلطت أجزاء من أيقونتين مختلفتين، وانتهت أيقونة "Alarm System" بشكل عشوائي معطوب يظهر للزائر. تكرّر الأمر مع `cctv` (مسار قديم لا يرسم بشكل صحيح).

**القاعدة:** قبل إضافة أي أيقونة جديدة، اجلب المسار الرسمي مباشرة من المصدر:
- **Lucide:** `https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/<name>.svg`
- **Tabler:** `https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/<name>.svg`

استخدم `WebFetch` بـ prompt: `"Return the raw SVG content exactly as-is."`. انسخ الـ `<path>` الداخلي فقط (بدون `<svg>` wrapper) ومرّره لـ `svg()` helper.

#### اختيار الأيقونات — قواعد التمييز الدلالي

- **Indoor vs Outdoor cameras:** يجب أن تُميَّز بصرياً. حالياً: indoor = Tabler `device-cctv` (شكل قبّة سقف)، outdoor = Lucide `cctv` (مثبَّتة على حامل جانبي).
- **Smart Home (خدمة) vs Villa (مبنى):** كلاهما "منزل". لا تستخدم نفس الأيقونة. حالياً: Villa = Lucide `home`, Smart Home = Lucide `house-wifi` (موجات Wi-Fi داخل المنزل).
- **تجنّب التكرار في خطوات مختلفة:** كان `hammer` مستخدماً في `full_renovation` (electrical) و `renovating` (project stage) — أُبدل الثاني بـ `paint-roller` للتمييز.
- **`HelpCircle` (?)** مكرّر مقبول في `other` (building) و `other` (network issue) لأنهما في خطوات مختلفة، لا تعارض بصري.

### تحديث صياغة الأسئلة الفرعية — اجعلها ذاتية الوصف

**درس مستفاد:** الأسئلة العامّة مثل "What do you need?" أو "What's the issue?" تُفقد المستخدم السياق عندما تكون موزّعة على عدّة خطوات فرعية. الأفضل: ضمّن اسم الخدمة في السؤال نفسه:
- ❌ "What would you like to control?" → ✅ "What smart home features would you like to control?"
- ❌ "What do you need?" → ✅ "What security equipment do you need?"
- ❌ "What's the issue?" → ✅ "What's the network or Wi-Fi issue?"

**فائدة هذا النمط:** لا حاجة لإضافة "بادج" بصري فوق السؤال (أقل فوضى)، والمستخدم يعرف موقعه في التسلسل من السؤال نفسه.

---

## 10. تغيير اللون التجاري على الموقع كاملاً (Brand Color Swap)

### 🎯 ابدأ من هنا: `assets/brand.css` (Single Source of Truth)

**منذ 2026-04-30**، الموقع يحتوي على **`assets/brand.css`** الذي يُعرِّف كل tokens البراند مرّة واحدة:

```css
:root {
  --brand:        #b86c25;   /* اللون الأساسي */
  --brand-deep:   #9c5a1e;   /* hover/active */
  --brand-pale:   #f5e7d8;   /* tint backgrounds */
  --brand-tint:   rgba(184, 108, 37, 0.1);
  --brand-glow:   rgba(184, 108, 37, 0.45);
  --warm-dark:        #1a140d;   /* dark hero/section bg */
  --warm-dark-deep:   #0f0a05;
  --warm-dark-light:  #3d2e1f;
  --ink:       #1f2937;
  --ink-muted: #6b7280;
  --paper:     #ffffff;
  --cream:     #f8fafc;
}
```

**يُحمَّل أوّلاً** في كل القوالب الجذرية الـ6 (`index`, `products`, `product`, `project`, `previous-work`, `404`) قبل `index-CJ3jXuVd.css`.

**الملفات الـ4 الأخرى** (`cart.css`, `find-solution.css`, `products.css`, `projects.css`, `homepage-products.css`) تستخدم هذه التوكنات عبر `var(--brand, #b86c25)` مع fallback يحفظ نفس القيمة الأصلية لو فشل التحميل.

**النتيجة العملية:** لتبديل لون البراند الآن، **عدِّل قيمة `--brand` في `brand.css` فقط** — كل CSS ينتشر آلياً عبر `var()` references.

**استثناءات لا تزال خارج النظام (تتطلّب التغيير اليدوي + sed):**
- `assets/index-CJ3jXuVd.css` — Tailwind compiled (12 موقع `#b86c25` hardcoded). إعادة compile تكسر الموقع.
- `assets/index-CGMiSPUa.js` — SPA bundle (inline `#b86c25` في category badge ~السطر 12565، و gradient background للقسم `#example`).
- إعدادات Google Analytics و meta tags لا تتأثر باللون.

### وصفة الـSwap الكاملة (للتغيير الشامل بما فيه Tailwind drift)

عند طلب **تغيير لون البراند الجذري** (مثلاً من برتقالي لذهبي)، الـ`brand.css` وحده لا يكفي. اللون مُكرَّر بصيغ هندسية مختلفة عبر سبعة ملفات. هذا القسم يختصر الجولة.

### ⚠️ القيمة الواحدة للون لها صيغتان مختلفتان قليلاً

اللون التجاري الحالي **`#b86c25`** يظهر بصيغتين متقاربتين لكن غير متطابقتين:
- **`#b86c25`** = `rgb(184, 108, 37)` — قيمة الـ`--primary-color` ومعظم متغيّرات الـCSS المخصّصة.
- **`rgb(187, 118, 31)`** = `#bb761f` — قيمة Tailwind المُجمَّعة مسبقاً في `index-CJ3jXuVd.css`.

السببب: الـTailwind compile أُجري بإعداد لون مختلف بقليل، ولم يُعد التجميع. **عند الـswap، يجب استبدال الـHex والـRGB كليهما.**

### خريطة كاملة لمواقع اللون التجاري

| الملف | الاستعمال | عدد المرّات |
|---|---|---|
| `assets/index-CJ3jXuVd.css` | `--primary-color: #b86c25` + كل Tailwind classes (`.bg-primary`, `.text-primary`, `.border-primary`, `.from-primary`, `.to-primary`, `.shadow-primary/*`, `.ring-primary/*`, `.hover:*-primary`, `.btn-primary`) عبر صيغة `rgb(187 118 31)` | ~20 |
| `assets/projects.css` | `--proj-primary` + `--proj-primary-hover` + ~7 ظلال `rgba(184, 108, 37, …)` | ~10 |
| `assets/products.css` | `--prod-primary` + ~14 ظلال rgba | ~15 |
| `assets/find-solution.css` | `--fs-orange` (لون الويزارد) | 1 |
| `assets/cart.css` | `--cart-orange` + `--cart-orange-dark` + `--cart-orange-light` + ~4 ظلال `rgba(184, 108, 37, …)` (نڤ-بار button + badge + أزرار qty + Add to Cart) | ~8 |
| `assets/homepage-products.css` | hex مباشر + `rgb(187, 118, 31)` (FAQ outline + بادجات + زرّ CTA) | ~5 |
| `assets/i18n.css` | `rgb(187, 118, 31)` للأزرار العائمة (تبديل اللغة + WhatsApp dialer) في الزوايا | ~5 |
| `assets/index-CGMiSPUa.js` | inline في SPA bundle: FAQ outline + لون category badge | 2 |

### وصفة الـSwap بأمر واحد

**الطريقة الموصى بها (إن أردت تجربة سريعة):** عدِّل `assets/brand.css` فقط (4 سطور: `--brand`, `--brand-deep`, `--brand-pale`, plus tints) ثم اختبر بصرياً. هذا يغطّي 90% من الموقع. للحالات المتبقّية (Tailwind compiled + SPA bundle inline)، استخدم sed أدناه:

```bash
# استبدِل OLD_HEX و NEW_HEX و OLD_HEX_HOVER و NEW_HEX_HOVER
# كذلك القيم العشرية المرافقة (تنبيه: Tailwind = "187 118 31" بمسافات؛
# باقي الملفات = "184, 108, 37" بفواصل + مسافات)

FILES="assets/index-CJ3jXuVd.css assets/index-CGMiSPUa.js \
       assets/projects.css assets/products.css \
       assets/find-solution.css assets/cart.css \
       assets/homepage-products.css assets/i18n.css \
       assets/brand.css"

for f in $FILES; do
  sed -i \
    -e 's/#b86c25/#NEW_HEX/g' \
    -e 's/#9c5a1e/#NEW_HEX_HOVER/g' \
    -e 's/184, *108, *37/NEW_R, NEW_G, NEW_B/g' \
    -e 's/184,108,37/NEW_R,NEW_G,NEW_B/g' \
    -e 's/187 118 31/NEW_R NEW_G NEW_B/g' \
    -e 's/#bb761f/#NEW_HEX/g' \
    "$f"
done

# تحقّق نهائي — يجب أن يكون فارغاً
grep -rn "b86c25\|9a5a1f\|9c5a1e\|184, *108, *37\|187 118 31\|bb761f" assets/
```

### ⚠️ Tailwind drift trap — تحذير من lesson learned مهم

في 2026-04-30 اكتُشف **bug قديم خطير**: الـ Tailwind classes التي تستخدم opacity modifiers (`/10`, `/20`, `/30`, `/50`, `/90`) كانت تشير لـ **`#3a7ca5` (أزرق رمادي)** بدل البرتقالي. هذا تسرّب من إعداد Tailwind سابق قبل تبديل البراند للبرتقالي. الـ classes الـ"plain" (`.bg-primary`, `.text-primary`) كانت محدّثة، لكن الـ opacity variants نُسِيت.

**الأماكن المتأثّرة سابقاً:** 9 مواقع في `index-CJ3jXuVd.css` (`.from-primary`, `.bg-primary/10`, `.bg-primary/5`, `.bg-primary/90`, `.border-primary/20`, `.border-primary/30`, ظلال box-shadow, إلخ). الـbug تجلّى بصرياً كأزرق-رمادي على Hero `previous-work.html` (الذي يستخدم `from-primary via-secondary to-primary`).

**الإصلاح:** سُحب كل `#3a7ca5` و `#3A7CA5` → `#b86c25` بـ `replace_all`.

**الدرس:** عند **أي** تبديل لون مستقبلي، أضف خطوة تحقّق ضمن الـ checklist:
```bash
# ابحث عن أي بقايا من الألوان السابقة في Tailwind compiled CSS
grep -i "OLD_HEX_PARTIAL" assets/index-CJ3jXuVd.css
```
خاصةً عند فحص opacity variants المُولَّدة آلياً (`.bg-primary\/10`, إلخ) — قد لا تتحدّث مع `--primary-color`.

### الخلفيات الداكنة في الـSPA (ليست لها متغيّر)

ثلاثة مقاطع داكنة في الـSPA bundle تستخدم رمادي **بارد** Tailwind (`bg-gradient-to-br from-gray-900 via-black to-gray-900` أو `linear-gradient(..., #111827, #000000, #111827)`):

| المقطع | المكان | كيفية التغيير |
|---|---|---|
| `#example` ("Your home at your fingertips") | `index-CGMiSPUa.js` ~11546 — Tailwind classes | ✅ تم: override في `homepage-products.css` بـ `!important` يستخدم `var(--warm-dark, #1a140d)` |
| `#homepage-products-section` | `assets/homepage-products.css` السطر 4 | ✅ تم: gradient warm-dark عبر `var(--warm-dark, ...)` |
| `.prod-hero` (products page) | `assets/products.css` ~46 | ✅ تم: warm gradient `var(--warm-dark-deep) → var(--warm-dark) → var(--warm-dark-light)` |
| `.proj-hero` (project case-study) | `assets/projects.css` ~100 | ✅ تم: نفس warm gradient |
| `.proj-cta` (CTA banner) | `assets/projects.css` ~723 | يستخدم `var(--proj-primary)` = البرتقالي (دافئ أصلاً) |
| `previous-work.html` Hero | SPA `index-CGMiSPUa.js` ~12476 | برتقالي (`from-primary via-secondary to-primary`) — دافئ أصلاً |

**جولة "Warm-dark Pass" (2026-04-30):** الأقسام الأربعة الأولى أعلاه كانت تستخدم cool gray (`#111827`, slate-800/900). تم تبديلها لـ warm-dark spectrum محدَّد في `brand.css`:
- `--warm-dark: #1a140d` (base)
- `--warm-dark-deep: #0f0a05` (deepest)
- `--warm-dark-light: #3d2e1f` (lightest)

نفس تدرّج الـ luminance للسلسلة الـ slate القديمة، لكن في الفضاء الـ warm. النتيجة: البرتقالي يبدو "مولوداً من الخلفية" بدل "مصطدماً بها".

**درس مستفاد:** عند تغيير لون الأكسنت (مثلاً برتقالي → ذهبي)، يجب التأكّد أن الخلفيات الداكنة تحافظ على نفس "الـ hue family" — الذهبي على رمادي بارد يبدو غير منسجم. عدِّل قيم `--warm-dark*` في `brand.css` بما يناسب اللون الجديد.

### ⚠️ اللون التجاري يظهر مرّتين بدرجتين متقاربتين عمداً (not a bug)

في بعض الأماكن نحتاج درجتين من نفس اللون:
- **درجة فاتحة** للـbackgrounds الكبيرة (تحتاج تباين جيّد مع نصّ أبيض → ينبغي ألا تكون فاتحة جداً)
- **درجة أعمق** للنصوص على الخلفيات البيضاء (text-on-light contrast)

التصميم الذي قدّمه claude.ai/design يُعرّف هذا صراحة بـ`--accent` (فاتح، on-dark) و`--accent-text` (أعمق، on-light). إذا حدث طلب اعتماد نظام مزدوج، أنشئ متغيّرين منفصلين بدل تخمين أيّهما الأصحّ في كل موقع.

### 🆎 Typography — تبديل الخط على الموقع كاملاً (Font Swap)

نفس فلسفة Brand Color Swap: **لا يوجد متغيّر CSS واحد للخط**، الإعلانات موزّعة على عدّة ملفات + رابط Google Fonts في كل قالب جذري + inline style واحد في SPA bundle.

**الخط الحالي (2026-04-29):** `Readex Pro` (variable font، عائلة واحدة تغطي Latin + Arabic + diacritics). الأوزان: 400/500/600/700.

**سبب الاختيار التاريخي:**
- **سابقاً:** Exo 2 (عناوين) + Poppins (جسم) + Tajawal (عربي). ثلاثة خطوط من فلسفات مختلفة، فالعناوين والجسم في الصفحة العربية ينقلبان كلاهما لـ Tajawal فيضعف التسلسل البصري.
- **محاولة وسطى:** IBM Plex Sans + Plex Sans Arabic. حلّ مشكلة عدم التزامن لكن **rendering Plex Arabic على Windows/Chrome ظهر "مبكسلاً"** في الأحجام الصغيرة (body 14-16px) بسبب hinting صارم.
- **الحلّ النهائي:** Readex Pro — variable font حديث، rendering ناعم، عائلة واحدة لكل اللغات → تيبوغرافي موحَّد بصرياً عبر EN/FR/AR.

**خريطة كاملة لمواقع الخط:**

| الملف | الاستعمال | عدد المرّات |
|---|---|---|
| 5 قوالب HTML جذرية (`index.html`, `products.html`, `product.html`, `project.html`, `previous-work.html`) | رابط Google Fonts (`<link href="...">`) | 5 |
| `assets/index-CJ3jXuVd.css` | `body`, `h1-h6`, `.font-exo`, `.font-poppins` | 4 |
| `assets/projects.css` | `#custom-project-detail-wrapper`, RTL variant، `.proj-cta-title`، RTL variant | 4 |
| `assets/products.css` | `#custom-products-container` | 1 |
| `assets/homepage-products.css` | `.hp-products-section` | 1 |
| `assets/cart.css` | badge، CTA button، modal body، `.cart-title` | 4 |
| `assets/find-solution.css` | modal root، `.fs-title` | 2 |
| `assets/i18n.css` | `[dir="rtl"] body`، `[dir="rtl"] h1-h6` | 2 |
| `assets/index-CGMiSPUa.js` | inline style — السطر ~12597 (`fontFamily: "..."`) | 1 |

**وصفة الـSwap بأمر واحد (مع Readex Pro كمثال للحالي):**

```bash
# 1. رابط Google Fonts في القوالب الجذرية الـ5
OLD_URL="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=swap"
NEW_URL="https://fonts.googleapis.com/css2?family=NEW_FONT:wght@400;500;600;700&display=swap"

for f in index.html products.html product.html project.html previous-work.html; do
  sed -i "s|$OLD_URL|$NEW_URL|g" "$f"
done

# 2. font-family في كل ملفات CSS + SPA bundle
sed -i "s/'Readex Pro'/'NEW_FONT'/g; s/\"Readex Pro\"/\"NEW_FONT\"/g" \
  assets/*.css assets/index-CGMiSPUa.js

# 3. تشغيل البناء لنشر التغيير على fr/, ar/, products/, projects/
python scripts/build_all.py

# 4. تحقّق نهائي — يجب أن يكون فارغاً (ما عدا التوثيق)
grep -rn "Readex Pro" assets/ *.html
```

**ملاحظات حرجة عند التبديل:**
- **رابط Google Fonts** يتكرّر بحرفيته في كل القوالب الجذرية الـ5 → استبدله مرة واحدة بـ sed.
- **القوالب المُولَّدة في `fr/`, `ar/`, `products/`, `projects/` لا تُعدَّل يدوياً** — `build_all.py` يعيد توليدها من القوالب الجذرية.
- **`.font-exo` و `.font-poppins` في `index-CJ3jXuVd.css`** أُبقيا كأسماء كلاسات (موجودة في SPA bundle) لكن قيمتهما تشير الآن للخط الجديد. لا تحذف الكلاسات نفسها.
- **عند اختيار خط جديد لمواقع تستهدف العربية على Windows/Chrome**، تجنّب IBM Plex Arabic (مبكسل). البدائل المُختبَرة: Readex Pro (الأنعم)، Cairo، Tajawal، Noto Sans Arabic.
- **SPA inline style واحد في السطر ~12597** سهل النسيان — تأكّد من تضمينه.

### 🏷️ Section Eyebrows — علامات صغيرة فوق عناوين الأقسام

**ملف مستقلّ:** `assets/section-eyebrows.css` (2026-04-30) يضيف "eyebrow markers" صغيرة بصيغة `— 01 / Expertise` فوق عناوين 4 أقسام رئيسية في الصفحة الرئيسية. تستخدم CSS pseudo-elements (`::before`) **بدون لمس SPA bundle** — صفر مخاطرة.

**الأقسام المُغطّاة:**

| القسم | EN | FR | AR |
|---|---|---|---|
| `#services` | `— 01 / Expertise` | `— 01 / Expertise` | `— ٠١ / خبرتنا` |
| `#example` | `— 02 / Showcase` | `— 02 / Vitrine` | `— ٠٢ / المعرض` |
| `#homepage-products-section` | `— 03 / Catalog` | `— 03 / Catalogue` | `— ٠٣ / الكتالوج` |
| `#faq` | `— 04 / Answers` | `— 04 / Réponses` | `— ٠٤ / إجابات` |

**الترجمة:** عبر `:lang()` selectors (يقرأ `<html lang>` المُحدَّث من i18n.js). لا حاجة لـ JSON locale keys.

**التحميل:** `<link>` في كل القوالب الجذرية الـ6 بعد `i18n.css` (لتسمح لـ RTL rules بالتجاوز إن لزم).

**معالجات RTL:**
- العربية تستخدم Readex Pro (لا monospace) لأن uppercase وletter-spacing لا يناسبان الأبجدية العربية.
- الأرقام الهندية-العربية (`٠١, ٠٢, ٠٣, ٠٤`) — أكثر "أصالة" بصرياً مع النصّ العربي.
- الـ em-dash يُوضع في **بداية source string** للعربية (`— ٠١ / ...`) ليظهر على اليمين بصرياً (بداية القراءة في RTL).

**درس مستفاد:** المحاولة الأولى استخدمت نصاً يكرّر العنوان (`— ٠١ / الخدمات` فوق `الخدمات`) — ظهر كتكرار بصري خاصة في العربية حيث العناوين قصيرة (لا "Our X" prefix كالإنجليزية). الإصلاح: استخدام مسمّيات **مختلفة عن العنوان** تكمّله بدل أن تردّده (Expertise بدل Services، Catalog بدل Products، Answers بدل FAQ).

**القاعدة:** عند إضافة eyebrow لقسم جديد، اختر اسماً يكون **category framing** للقسم بدل أن يكرّر العنوان. مثال صحيح: `Workflow` فوق "How We Work". مثال خاطئ: `How We Work` فوق "How We Work".

**إضافة eyebrow لقسم جديد:**
```css
/* في assets/section-eyebrows.css */
section#NEW_ID > .container > .HEADER_WRAPPER::before { /* selector شاملة */
  /* style block المشترك يُطبَّق آلياً عبر comma-separated rule */
}
section#NEW_ID > .container > .HEADER_WRAPPER::before { content: '— 05 / NEW_LABEL'; }
:lang(fr) section#NEW_ID ... ::before { content: '— 05 / NEW_LABEL_FR'; }
:lang(ar) section#NEW_ID ... ::before { content: '— ٠٥ / NEW_LABEL_AR'; }
```

---

## 11. استلام تصميم من claude.ai/design (Design Handoff)

عندما يُمرّر المستخدم رابطاً بصيغة `https://api.anthropic.com/v1/design/h/<hash>?open_file=<file>`، **النتيجة ليست HTML قابلة للقراءة بل أرشيف tar مضغوط بـgzip**.

### وصفة الفكّ

```bash
# WebFetch يحفظ المحتوى البايني تلقائياً في tool-results/*.bin
# ابحث عن آخر ملف bin أُنشئ، ثم:

mkdir -p /tmp/design-fetch && cd /tmp/design-fetch
cp <PATH_TO_LATEST_BIN> archive.gz
gunzip -f archive.gz   # ينتج "archive" (POSIX tar)
mkdir -p extracted
tar -xf archive -C extracted
find extracted -type f
```

### بنية الأرشيف المتوقّعة

```
<project-name>/
├── README.md            ← ابدأ من هنا (تعليمات للوكيل)
├── chats/
│   └── chat<N>.md       ← المحادثات بين المستخدم والمصمّم — اقرأها كاملةً
└── project/
    ├── *.html           ← صفحات HTML النموذجية
    ├── assets/
    │   ├── styles.css   ← نظام التصميم (tokens + utilities)
    │   ├── partials.js  ← header/footer renderer
    │   └── shared.js    ← منطق مشترك
    ├── screenshots/     ← مرجع بصري
    └── uploads/         ← صور رفعها المستخدم
```

### قواعد التعامل

- **اقرأ README ثم chats قبل أيّ شيء** — الـchat هو المكان الذي يكشف نوايا المستخدم الحقيقية ومراحل التكرار التي وصلوا إليها.
- **التصميم prototype وليس production code.** لا تنقل البنية حرفياً — انقل التأثير البصري بما يناسب البنية الحالية للموقع.
- **لا تشغّل الـHTML في متصفّح ولا تأخذ screenshots** — الأبعاد والألوان والـlayout مكتوبة في المصدر؛ القراءة المباشرة أكفأ.
- **حدّد الفجوة بين التصميم والبنية الحالية:** التصاميم من claude.ai/design عادةً صفحات HTML ساكنة بدون i18n حقيقي، بدون SSG للمنتجات، بدون wizard. **الـ literal port يفقد كل هذا.** اقترح نهجاً هجيناً يحتفظ بالبنية ويتبنّى البصريات.

### ما يستحقّ الاستعارة عادةً

من تجربة الـhandoff الأولى (claude.ai/design لـS-ELECTRICITY 2026-04):
- **نظام tokens موحّد بـoklch** أنظف بكثير من Hex متناثرة.
- **Eyebrow markers (monospace + hairline)** فوق العناوين — تأثير "فخامة" بسيط.
- **Section rhythm** (تناوب dark/cream) لمنع الكتل الطويلة المملّة.
- **CTA banners ذات gradient شعاعي** بدل الفلات الموحّد.

### ما لا يستحقّ النقل عادةً

- **Visual stub language toggle** (يُبدّل label فقط بدون ترجمة) — الموقع لديه نظام i18n حقيقي.
- **Hardcoded products** بدلاً من الـSSG.
- **Reset كامل للـbundle** — تكلفة عالية، فائدة منخفضة.

---

## 12. سلّة WhatsApp (WhatsApp Cart)

سلّة تسوّق خفيفة تجمع منتجات من الكتالوج وتولّد رسالة واتساب جاهزة لإرسالها للمالك. **ليست checkout حقيقي** — لا أسعار، لا backend، لا دفع. الفلسفة: العميل المغربي العادي يفضّل التفاوض على واتساب، فالسلّة تقتصر على "مساعدة في صياغة الطلب".

### المكوّنات والملفات

| الملف | الدور |
|---|---|
| `assets/cart.js` | منطق السلّة كاملاً. IIFE يكشف `window.Cart`. ~480 سطر. |
| `assets/cart.css` | تنسيق المودال + زر النڤ-بار + badge + زر `+` على بطاقة المنتج + qty stepper على صفحة التفاصيل + toast، RTL-aware. |
| `assets/locales/{en,fr,ar}.json` | ~22 مفتاح بـ prefix `cart_*` لكل لغة. |
| Inline bootstrap script | في `<head>` كل قالب جذري — يلتقط النقرة فوراً ويُعيد المحاولة حتى يجاهز `window.Cart`. |
| استثناء `i18n.js` | `#cart-modal-root` + شيك `data-cart-badge` مُضافان لقائمة استثناء `replaceTextNodesWithDict` (سطر ~373). |
| تعديل SPA bundle | زر "Call Now" Desktop في `av` استُبدل بزر سلّة دائري بـ badge؛ زر "Call Now" Mobile في القائمة المنسدلة حُذف نهائياً؛ زر سلّة جديد أُضيف بجانب الهامبرغر داخل wrapper `md:hidden flex items-center`. |
| تعديل `products.js` | `renderCard()` يضيف `<button class="prod-card-add" data-trigger="cart-add" data-product-id="..." data-i18n-attr="aria-label:cart_aria_add_btn">` فوق الصورة. |
| تعديل `product-detail.js` | `renderProductContent()` يضيف `<div class="pd-cart-row" data-cart-row>` بـ qty +/- + زر "Add to Cart". قسم "Quantity +/- buttons" في `attachLinkTransitions()` يربط الـ +/-. |

### آلية التفعيل (Trigger Mechanism)

عناصر بسمات معروفة يلتقطها الـ inline bootstrap الموجود في `<head>` كل قالب:

| السمة | الفعل |
|---|---|
| `data-trigger="cart-open"` | يفتح المودال (`Cart.open()`). |
| `data-trigger="cart-add"` + `data-product-id="<id>"` | يضيف منتجاً واحداً بالـ id. الكمية الافتراضية 1. |
| `data-trigger="cart-add"` + `data-product-id="<id>"` + `data-qty-source` | يقرأ الكمية من أقرب `.pd-qty-input` أو `.cart-qty-input` داخل `.pd-cart-row` أو `[data-cart-row]` ثم يستدعي `Cart.add(id, qty)`. |

**نقاط التفعيل الفعلية:**
| الموقع | السمة | الملف |
|---|---|---|
| زر السلّة في النڤ-بار (Desktop + Mobile) | `data-trigger="cart-open"` | `assets/index-CGMiSPUa.js` (داخل `av`) |
| زر `+` على بطاقة المنتج في الكتالوج | `data-trigger="cart-add"` | `assets/products.js` (`renderCard`) |
| زر "Add to Cart" في صفحة المنتج | `data-trigger="cart-add"` + `data-qty-source` | `assets/product-detail.js` (`renderProductContent`) |
| **بادج العدّاد** | `data-cart-badge=""` | `assets/index-CGMiSPUa.js` (داخل زر السلّة في النڤ-بار، Desktop + Mobile) |

### الـ Public API (`window.Cart`)

```js
window.Cart = {
  open(),                  // يفتح المودال (يحمّل الترجمة + index المنتجات قبل الفتح)
  close(),
  add(id, qty),            // qty افتراضياً 1، يُحدُّ بـ [1, 99]
  remove(id),
  setQty(id, qty),         // qty=0 تحذف العنصر
  clear(),
  count(),                 // المجموع لكل البادجات
  getItems()               // [{id, qty}, ...] (نسخة)
}
```

### بنية الـ State + التخزين

```js
state = { items: [{ id: 'zennio-z50-knx-touch-panel-5', qty: 2 }, ...] };
```
- يُحفظ في `localStorage` تحت مفتاح **`se_cart_v1`** بصيغة `{v: 1, items: [...]}`. الإصدار `v: 1` لتسهيل أي migration مستقبلي.
- على فشل JSON.parse → state فارغ صامت (لا UX rejection).
- localStorage يحفظ `id + qty` فقط. الأسماء/الصور/البراند تُقرأ من `data/products_index.json` (مرّة واحدة في الذاكرة عبر `loadProductsIndex()`).
- **التصفية الذاتية:** عند بدء التحميل، أي عنصر `id` لا يطابق منتجاً في الفهرس يُحذف صامتاً. هذا يحمي السلّة من المنتجات المحذوفة لاحقاً.

### رسالة الواتساب (`buildWhatsAppHref()`)

```
🛒 Order from smartelectricity.ma

1) [Brand] Product Title
   • Quantity: 2
   • https://smartelectricity.ma/products/<id>.html

2) ...

📝 Notes: <نص اختياري>

Awaiting your quote, thank you.
```
- العناوين باللغة الفعّالة عبر `pickLangText(product.title, lang)`.
- الروابط بالـ prefix الصحيح (`/`, `/fr/`, `/ar/`).
- الملاحظات: `textarea` اختياري في جسم المودال (`#cart-notes`).
- ترميز نهائي بـ `encodeURIComponent` (نفس نمط `find-solution`).

### Inline bootstrap (race condition)

نفس المنطق المشروح في القسم 9 (Find Your Solution): `cart.js` مُحمَّل بـ `defer`، نقرة سريعة قد تَسبق التحميل. الـ bootstrap inline يلتقط النقرة في فاز الـ capture، يُجمّع الـ pending action (open أو add)، ويُعيد المحاولة كل 80ms (50 محاولة) حتى يجاهز `window.Cart`.

```html
<!-- النموذج الموحَّد في كل قالب جذري -->
<link rel="stylesheet" href="/assets/cart.css">
<script defer src="/assets/cart.js"></script>
<script>
  (function () {
    document.addEventListener('click', function (e) {
      var hit = e.target.closest('[data-trigger="cart-open"], [data-trigger="cart-add"]');
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      var pending;
      if (hit.getAttribute('data-trigger') === 'cart-add') {
        var id = hit.getAttribute('data-product-id');
        var qty = 1;
        if (hit.hasAttribute('data-qty-source')) {
          var row = hit.closest('[data-cart-row], .pd-cart-row');
          var input = row ? row.querySelector('.pd-qty-input, .cart-qty-input') : null;
          if (input) {
            var v = parseInt(input.value, 10);
            qty = (Number.isFinite(v) && v > 0) ? Math.min(99, v) : 1;
          }
        }
        pending = { type: 'add', id: id, qty: qty };
      } else {
        pending = { type: 'open' };
      }
      (function tryRun(retries) {
        if (window.Cart) {
          if (pending.type === 'add') window.Cart.add(pending.id, pending.qty);
          else window.Cart.open();
        } else if (retries > 0) {
          setTimeout(function () { tryRun(retries - 1); }, 80);
        }
      })(50);
    }, true);
  })();
</script>
```

### تحديث الـ badge عبر Mutation Observer

`cart.js` يُسجّل `MutationObserver` على `document.body` يلاحظ إضافة عناصر تحمل `data-cart-badge` (أو تحوي عناصر كذلك). السبب: الـ SPA navbar (مكوّن `av`) يُركَّب بعد تحميل bundle React، أحياناً بعد أن يكون `cart.js` نفّذ `refreshBadges()` الأولي. بدون هذا الـ observer، الـ badge يظهر فارغاً حتى أول `add` رغم وجود عناصر في localStorage.

### نمط الكتابة في `cart.js`

نفس قواعد `find-solution.js` (راجع القسم 9):
- IIFE واحد، يكشف **`window.Cart`** فقط.
- helpers مماثلة: `detectLang()`, `loadLocale()`, `t()`, `el()`.
- **نمط `el()` helper** (DOM builder) يدعم: `class`, `html` (innerHTML)، `on` (event listeners)، `style` (object)، plus standard attributes.
- نمط الـ `requestAnimationFrame` لـ open/close + `body.cart-open` لقفل scroll.
- esc-to-close, click-outside-to-close.

### نمط الستايل البصري (Loxone-inspired Visual Style)

الـ CSS في `cart.css` يتبع فلسفة **line-art بسيطة بدون أوزان بصرية ثقيلة** — لا دوائر ممتلئة بألوان البراند، لا ظلال مكثّفة، لا scale on hover. الفكرة أن أزرار السلّة جزء من النافيغ والكتالوج، ليست عناصر منفصلة تنافس اللوغو أو صور المنتجات.

| العنصر | الأبعاد | الخلفية | اللون | Hover |
|---|---|---|---|---|
| `.cart-nav-btn` (نڤ-بار) | 40×40 | شفاف | أبيض، الأيقونة 24px stroke 1.75 | bg `rgba(255,255,255,0.08)` + لون برتقالي |
| `.cart-nav-badge` (عدّاد) | min 18×18 | برتقالي ممتلئ | أبيض، 10px Readex Pro bold | حدّ أسود 2px ليبدو "مُنطبع" على النڤ-بار الداكن |
| `.prod-card-add` (زر `+` على البطاقة) | 38×38، أعلى-يمين 10px | `rgba(255,255,255,0.95)` + `backdrop-filter: blur(6px)` | برتقالي، أيقونة 18px | يصير برتقالي ممتلئ مع لون أبيض |
| `.pd-qty` (stepper الكمية) | ارتفاع 52px موحَّد مع الزر، radius 12px | أبيض | `--cart-text` | bg ناعم + لون برتقالي |
| `.pd-add-to-cart` | ارتفاع 52px، padding 0 26px، radius 12px | برتقالي ممتلئ | أبيض | برتقالي أعمق، **بدون transform/shadow** |

**قواعد التموضع:**
- زر السلّة في النڤ-بار: داخل مكوّن `av` بـ `data-trigger="cart-open"` + الـ inner span + الـ badge مع `data-cart-badge=""`. على Desktop: ضمن `<nav>` بعد روابط النافيغ. على Mobile: ضمن wrapper `md:hidden flex items-center` يجمعه مع زرّ الهامبرغر، مع `margin-inline-end: 6px` للفصل البصري.
- زر `+` على بطاقة المنتج: `position: absolute; top: 10px; inset-inline-end: 10px;` فوق صورة المنتج (داخل `.prod-card-img-wrapper`). تجنّب `bottom` لأن أسفل الصورة مكان البراند والعنوان.
- صفحة التفاصيل: `.pd-cart-row` بـ `display: flex; gap: 10px; flex-wrap: wrap;` — على Desktop والـ tablet يبقى الـ stepper والزر في سطر واحد. على الموبايل (< 540px): يبقيان في سطر واحد كذلك (`flex: 0 0 auto` للـ stepper، `flex: 1 1 0; min-width: 0` للزر) بدل أن يتكدّس الزر تحت الـ stepper بشكل غير منسَّق.

**درس مستفاد (Lesson learned):**
كانت النسخة الأولى من زر السلّة في النڤ-بار **دائرة برتقالية ممتلئة 40×40 بظلّ 14px** + badge أبيض بحدّ برتقالي + transform يرتفع عند hover. بصرياً كانت تنافس اللوغو وتبدو "مُلصَقة" بدل أن تكون جزءاً من النافيغ. على الموبايل خاصةً الدائرة البرتقالية كانت تهيمن على الشريط بجوار الهامبرغر الأبيض.

الإصلاح (إلهام من Loxone): تحويل الزر إلى **أيقونة line-art شفافة الخلفية** بنفس لون باقي عناصر النڤ-بار، badge صغير برتقالي بحدّ أسود ليبدو منطبعاً، إزالة الـ shadow والـ transform. النتيجة: الزر يندمج مع الهامبرغر بصرياً ولا يصرف الانتباه عن اللوغو.

نفس الفلسفة طُبِّقت على `.pd-add-to-cart`: أُزيل الـ shadow البرتقالي والـ translateY hover — بقي الزر برتقالي قوي (لأنه CTA رئيسي يجب أن يكون مرئياً) لكن مسطّح وهادئ.

**القاعدة العامة:** عند إضافة أي زر جديد متعلّق بالسلّة، اتّبع هذا النمط — line-art شفاف للأزرار الثانوية، ممتلئ مسطّح للـ CTA. لا scale on hover، لا shadow ملوّن، لا border ثقيل.

**توحيد زرّ القائمة المنسدلة (الهامبرغر) مع زرّ السلّة على الموبايل:**
الزرّ الـ burger في `av` يستخدم class `cart-nav-btn` نفسه (بدل `text-white focus:outline-none` الأصلي) + أيقونة `w-6 h-6`. النتيجة: زرّان متماثلان بصرياً (40×40، transparent، نفس hover) بجوار بعضهما داخل wrapper `md:hidden flex items-center`. هذا يعطي القائمة وزناً بصرياً مساوياً للسلّة بدل أن تظهر كأيقونة صغيرة منسيّة.

### ⚠️ موضع `cart-nav-badge` لا يتبع `inset-inline-end` — يبقى دائماً على اليمين

الـ badge في الأصل كان `inset-inline-end: 0` (يلتزم بالاتجاه: يمين في LTR، يسار في RTL). المشكلة في العربية: الـ badge ينتقل لليسار → يقع **فوق جسم العربة** (basket في SVG شغّال من اليسار لليمين، فاليسار = handle، واليمين = basket). الـ badge يُغطّي السلّة بدل أن يطفو خارجها.

**القاعدة:** أيقونة السلّة الـ SVG لا تنعكس في RTL — شكل العربة ثابت. لذلك الـ badge يجب أن يكون مرتبطاً بـ **شكل الأيقونة** لا باتجاه اللغة. الـ CSS الصحيح:

```css
.cart-nav-badge {
  position: absolute;
  top: 2px;
  right: 0;            /* ← ليس inset-inline-end */
  ...
}
```

**درس عام:** عناصر التزيين الموضوعة فوق أيقونة ذات شكل ثابت (badges, status dots, notification indicators) يجب أن تتموضع بالنسبة لـ **هيكل الأيقونة** (يمين/يسار حقيقي بـ `right`/`left`)، لا بالنسبة لاتجاه التدفّق (`inset-inline-*`). هذا الأخير صحيح فقط للنصوص والأزرار التي تنعكس مع اللغة.

### قواعد التعديل

- **إضافة منتج للسلّة برمجياً من السكربت:** `window.Cart.add(productId, qty)`. لا تعدّل localStorage مباشرة.
- **ترقية الـ schema:** غيّر الإصدار في `STORAGE_KEY` (`se_cart_v2`) وأضف منطق migration في `loadState()`.
- **تغيير صياغة رسالة الواتساب:** عدّل قيم المفاتيح `cart_msg_*` في `assets/locales/{en,fr,ar}.json`. لا تعدّل الكود.
- **إضافة محفّز جديد على أي صفحة:** أضف `data-trigger="cart-add"` + `data-product-id="<id>"` للعنصر. الـ bootstrap يلتقطه آلياً.
- **حذف ميزة الكميات (تبسيط):** بسّط `cart.js`: احذف `setQty` + `cart-qty-*` من DOM، اضبط qty=1 في `add()` دائماً، بسّط رسالة الواتساب. ولا تنسَ المفاتيح `cart_aria_increase`/`decrease`/`item_qty`.

### ⚠️ تحذيرات

- **لا تستخدم `data-i18n` على نصوص ديناميكية داخل المودال** — الترجمة تتم وقت الـ render عبر `t()`. أي `data-i18n` سيُطلق i18n.js TreeWalker ويتعارض. هذا قد يكون آمناً اليوم لأن `#cart-modal-root` مُستثنى، لكن الاعتماد على الاستثناء فقط هشّ.
- **لا تنزع `id="cart-modal-root"` ولا `data-cart-badge=""`** — كلاهما sentinel للـ TreeWalker. حذف أحدهما يُعيد bug "البادج المرتدّ" أو "نص المودال يرجع إنجليزياً".
- **زر `+` على بطاقة المنتج موجود داخل `<a class="product-link">`** — لذلك الـ inline bootstrap يستدعي `e.preventDefault()` و `e.stopPropagation()` في فاز الـ capture لمنع التنقل. إن غيّرت بنية البطاقة بحيث الزر خرج من `<a>`، تظل الـ stopPropagation آمنة (لا تكسر شيئاً) لكنها أصبحت غير ضرورية.
- **عند إضافة قالب HTML جذري جديد**، يجب إضافة 3 عناصر في `<head>`: `cart.css` + `cart.js` + inline bootstrap. حتى لو القالب لا يعرض منتجات (مثل `previous-work.html`)، الـ navbar (المُحمَّل من SPA bundle) يحوي زر السلّة، فالـ click handler ضروري.
- **بعد تعديل أي قالب جذري** أو ملف `cart.js`/`cart.css`، شغّل `python scripts/build_all.py` لنشر التغييرات على نسخ `fr/` و `ar/` وكل صفحات المنتجات والمشاريع المُولَّدة.
