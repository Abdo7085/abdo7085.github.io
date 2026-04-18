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
  - `i18n.js` + `i18n.css`: نظام الترجمة.
  - `products.js` + `products.css`: منطق وأسلوب صفحة كتالوج المنتجات.
  - `product-detail.js`: عرض تفاصيل المنتج الفردي (SPA).
  - `projects.css`: أسلوب صفحة المشروع الفردي (شبكة موزاييك للوسائط المتنوعة).
  - `project-detail.js`: عرض صفحة مشروع فردي داخل الـ SPA — يقرأ `window.__PROJECT__` المحقون مسبقاً من `build_projects.py`، ويدير تشغيل الفيديوهات الذاتية الاستضافة والريلز (`assets/reels/`) مع إيقافها تشغيلياً بـ `IntersectionObserver` لتوفير الموارد وتمكين زر كتم الصوت.
  - `homepage-products.js` + `homepage-products.css`: قسم المنتجات على الصفحة الرئيسية.
- **`assets/index-CGMiSPUa.js` (ملاحظة غاية في الأهمية):** هذا الملف الكودي (SPA Bundle) ليس مجرد مخرجات تجميعية (Build Output) قياسية مهملة، **بل هو ملف ثابت (Hardcoded) تم التعديل عليه يدوياً ودمجه مع الموقع المصدري**. يُعتبر الآن كملف برمجي أساسي (Static Source File). إحذر عند التعديل عليه حيث تتطلب أي محاولة لتغيير هيكلية (React) بداخله تركيزاً ودقة عالية، وتجرى التعديلات فيه مباشرة وبشكل دقيق.
- `data/products/`: قاعـدة بيانات المنتجات، حيث يخصص لكل منتج ملف JSON مستقل.
- `data/projects/`: قاعـدة بيانات معرض الأعمال — لكل مشروع ملف JSON مستقل بنفس نمط المنتجات. يدعم مصفوفة `media` غير متجانسة تجمع `image` (صور) و `video` (فيديوهات MP4 ذاتية الإنتاج مع poster) و `reel` (ريلزات إنستغرام غير مملوكة لنا — تُضمَّن عبر blockquote الرسمي وليس إعادة استضافة).
- `assets/projects/<slug>/`: مجلد الوسائط الخاص بكل مشروع (صور، فيديوهات، pisters الفيديو).
- `fr/` و `ar/`: المجلدات الخاصة باللغات الإضافية. تُولّد آلياً بواسطة `generate_localized.py` من القوالب الإنجليزية الجذرية. **أي تعديلات على الـ SEO أو الهيكلة يجب أن تتم في القوالب الإنجليزية ثم يُعاد تشغيل السكربت.**
- `scripts/`: أدوات البناء وسكربتات البايثون اللازمة لتوليد الفهارس والمخططات. تشمل:
  - `build_products.py`: السكربت الرئيسي — يبني فهرس المنتجات + صفحات SEO + sitemap + يحقن ItemList JSON-LD في products.html.
  - `build_projects.py`: **جديد** — يبني فهرس معرض الأعمال `data/projects_index.json` + يستخرج أبعاد كل وسائط المشروع عبر Pillow + يولّد صفحات SEO لكل مشروع في `projects/` و `fr/projects/` و `ar/projects/` + يحقن ItemList JSON-LD في `previous-work.html`.
  - `generate_static_seo.py`: مولد صفحات HTML الثابتة للمنتجات مع SEO كامل (يُستدعى من `build_products.py`). يدمج أيضاً روابط المشاريع من `projects_index.json` في `sitemap.xml` النهائي.
  - `generate_localized.py`: توليد نسخ الصفحات الجذرية المترجمة (`fr/index.html`، `ar/index.html`، إلخ) + ترجمة FAQ JSON-LD + **توطين كل كتل JSON-LD** (LocalBusiness و WebSite) بالـ `url` و `inLanguage` المناسبين.
  - `remove_bg.py`: إزالة الخلفيات عبر الذكاء الاصطناعي (مكتبة `rembg` ونموذج U²-Net). **ملاحظة:** يتطلب التثبيت المسبق للحزمة عبر `pip install "rembg[cpu]"`.
  - `remove_bg_traditional.py`: أداة بديلة (Fallback) تستخدم خوارزمية الإغراق اللوني (Flood Fill) التقليدية للمنتجات ذات الحواف الصلبة والمسطحة (مثل الشاشات) التي يفشل الذكاء الاصطناعي في تمييزها.
  - `crop_image.py`: قص الفراغ الشفاف من صور المنتجات لتملأ بطاقة المنتج بشكل متسق (مُصمم بفلتر ذكي يتجاهل الهوامش الشبحية الناتجة عن الذكاء الاصطناعي).

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
   - يكتب `sitemap.xml` مبدئياً (يُعاد كتابته لاحقاً بواسطة `build_products.py` مع دمج روابط المنتجات + المشاريع من جديد).

3. **ترتيب التشغيل المحدّث:**
   ```bash
   python scripts/generate_localized.py    # يولّد fr/ و ar/ الجذرية
   python scripts/build_projects.py         # المشاريع
   python scripts/build_products.py         # يجب أن يُشغّل أخيراً — ينتج sitemap الكامل (ثابتة + منتجات + مشاريع)
   ```
   `generate_static_seo.py` (الذي يُستدعى من `build_products.py`) عُدّل ليقرأ `projects_index.json` ويضيف روابط المشاريع إلى `sitemap.xml` النهائي.

4. **استراتيجية Reels:**
   - يتم استضافة مقاطع الريل محلياً كملفات MP4 في مسار `/assets/reels/<project-slug>.mp4` لضمان الاستقرار وسرعة التحميل وبدون الاعتماد على Instagram iframe embeds.
   - تُعرض الريلز خارج شريط الصور المعرضي كـ **بطاقة ثابتة (Sticky Card)** بجوار النص الوصفي للمشروع.
   - يتحكم `project-detail.js` بتشغيل الفيديو بوضعية `autoplay, muted, playsinline, loop` لتوافقه التام مع أجهزة الجوال.
   - يتم إيقاف الفيديو عبر `IntersectionObserver` حين خروجه من إطار العرض للحفاظ على البطارية والموارد.
   - يظهر زر `unmute` بأعلى الفيديو لتشغيل الصوت عند النقر، وفي حال تم توفير رابط `instagram_url` إضافي، يظهر زر "View on Instagram" بالأسفل للتحويل لإنستغرام، وهو اختياري.

5. **تكامل صفحة `previous-work.html`:**
   الشبكة الـ 9-خانات التي كانت مكتوبة يدوياً في `index-CGMiSPUa.js` (السطر ~12358) استُبدلت بـ `S.useState` + `S.useEffect` يجلب `data/projects_index.json` ويعرض كل مشروع كبطاقة تشير إلى `/projects/<id>.html` (أو `/fr/...` / `/ar/...` حسب لغة الزائر). المهمة في الـ SPA bundle صارت: عرض ديناميكي مع روابط ذاتية اللغة.

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
- `generate_static_seo.py` يتجاوز هذا آلياً ويضع `index, follow` في الصفحات المولّدة.

### ترتيب تشغيل السكربتات (Build Order)
عند تعديل أي شيء يؤثر على SEO:
```
1. python scripts/generate_localized.py    ← يولّد fr/ و ar/ + sitemap مبدئي
2. python scripts/build_projects.py         ← معرض الأعمال (إذا كانت هناك مشاريع)
3. python scripts/build_products.py         ← يجب أن يُشغّل أخيراً (ينتج sitemap كامل: ثابتة + منتجات + مشاريع)
```
**ملاحظة حرجة:** الثلاثة يكتبون `sitemap.xml`. `build_products.py` هو المحرر النهائي — يقرأ `projects_index.json` + ينتج sitemap شامل. لذلك **يجب أن يُشغّل دائماً آخراً**.

### ملفات مستثناة من sitemap
- `product.html` (قالب SPA — noindex)
- `404.html` (صفحة خطأ)
- `yandex_*.html` (ملفات تحقق)

---

## 5. قواعد التطوير الحذرة والنصائح المتبعة (Development Principles)

- **توحيد مصطلحات الفلترة:** عند استخدام تقنية جديدة أو خيارات تنصيب في منتج ما (Installation / Technology)، أضف مقابلها المترجم فورًا إلى قواميس `ar.json` و `fr.json` (باستخدام البادئة `val_`).
- **تحسين المظهر العام للمنتجات:** يجب استخدام أدوات إزالة الخلفية لتحويل الصور إلى (PNG شفافة):
  - استخدم `python scripts/remove_bg.py` للمنتجات العادية والبلاستيكية (AI).
  - استخدم `python scripts/remove_bg_traditional.py` كبديل للمنتجات ذات الشاشات السوداء أو الأسطح اللامعة المستوية (حيث قد يقوم الذكاء الاصطناعي بحفر المنتج من الداخل).
  - اتبع ذلك دائماً بـ `python scripts/crop_image.py` لقص الهوامش الشفافة وإظهار المنتج في المركز بانسجام.
- **الحفاظ على قوة المصطلحات الاصطلاحية:** أثناء توليد المحتوى العربي، يجب صيانة المصطلحات التقنية الأساسية (Wi-Fi، KNX، Router، MQTT) وإبقاؤها بلغتها الانجليزية لضمان عدم ضياع المعنى التقني الدقيق.
- **تجنب التعديلات اليدوية المحكوم عليها بالضياع:** أي صفحات مصممة تلقائياً (Auto-generated) كصفحات المنتجات المنفردة `.html` في مجلداتها، وملفات الـ `products_index.json` و `sitemap.xml`، يُحظر التعديل اليدوي عليها. لأن سكريبت البناء سيستبدلها بالكامل دائماً بناءً على ملفات `data/products/`.
- **التعديلات على القوالب الجذرية:** أي تغيير في `index.html` أو `products.html` أو `previous-work.html` (مثل إضافة meta tags، أو تعديل JSON-LD) يجب أن يتبعه تشغيل `generate_localized.py` ثم `build_products.py` لنشر التغيير لكل اللغات.
- **og:image يجب أن يكون PNG/JPG دائماً** — لا تستخدم SVG لأن Facebook و Twitter لا يدعمانه.
- **حذار Tailwind في SPA Bundle:** قبل إضافة أي كلاس Tailwind جديد داخل `index-CGMiSPUa.js`، تحقق من وجوده في `assets/index-CJ3jXuVd.css`. خلاف ذلك فضِّل inline styles. راجع قسم 7 للتفاصيل.
- **Schema JSON-LD يجب أن يطابق المحتوى المرئي دائماً:** خاصة `FAQPage` — أي تعديل بصري في أسئلة FAQ **يُلزمك** بتحديث JSON-LD + مفاتيح `faq_q*/a*` في القواميس. عدم التطابق يخالف إرشادات Google.
- **عند تعديل أي JSON-LD schema في قالب جذري:** تأكد أن `generate_localized.py` يعالج `@type` الجديد (الدالة `process_json_ld_block` في السطر ~130). السكربت الحالي يعرف `LocalBusiness` و `WebSite` و `FAQPage` فقط.

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
3. أعد تشغيل `python scripts/generate_localized.py` ثم `python scripts/build_products.py` لنشر التغييرات.
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
- **المكوّنات** تحمل أسماء مختصرة ومُحرَّمة للقراءة: مثل `nv` (FAQ)، `Od` (Need a Custom Solution)، `rv` (Smart Home Focus). اعثر على المكوّن المطلوب دائماً عبر البحث عن مفتاح `data-i18n` مميّز داخله.

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
- **اللون الأساسي**: `--primary-color: #b86c25` (برتقالي-بُنّي نحاسي). استخدم `text-primary` أو `bg-primary` في Tailwind، أو `#b86c25` في inline styles.
- **Fonts**: `font-exo` (خط Exo) للعناوين الكبيرة.

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
5. ✅ شغِّل `generate_localized.py` ثم `build_products.py`.
6. ✅ اختبر `https://site/#faq-0` و `#faq-3` للتأكد من صحة deep-linking.
