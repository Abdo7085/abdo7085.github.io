import os
import json

products_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'products')
os.makedirs(products_dir, exist_ok=True)

test_products = [
    {
        "id": "shelly-1-gen4",
        "brand": "Shelly",
        "technology": ["Wi-Fi", "Bluetooth"],
        "product_type": "Smart Relay",
        "installation": "Behind wall switch",
        "title": {
            "en": "Shelly 1 Gen4",
            "fr": "Shelly 1 Gen4",
            "ar": "شيلي 1 الجيل الرابع"
        },
        "short_description": {
            "en": "Smart Wi-Fi relay switch with 1 channel, 16A.",
            "fr": "Commutateur de relais Wi-Fi intelligent avec 1 canal, 16A.",
            "ar": "مفتاح ريلاي ذكي واي فاي بقناة واحدة، 16 أمبير."
        },
        "description": {
            "en": "Control a wide range of home appliances and office equipment from anywhere. Featuring dry contacts and extreme speed.",
            "fr": "Contrôlez une large gamme d'appareils de n'importe où. Comprend des contacts secs et une vitesse extrême.",
            "ar": "تحكم في مجموعة واسعة من الأجهزة المنزلية والمكتبية من أي مكان. يتميز بجهات اتصال جافة وسرعة فائقة."
        },
        "specs": {
            "en": {"Max Load": "16A", "Wireless": "Wi-Fi 802.11 b/g/n", "Processor": "ESP32"},
            "fr": {"Charge Max": "16A", "Sans Fil": "Wi-Fi 802.11 b/g/n", "Processeur": "ESP32"},
            "ar": {"الحمل الأقصى": "16A", "اللاسلكي": "واي فاي 802.11 b/g/n", "المعالج": "ESP32"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "knx-switching-actuator-8",
        "brand": "MDV KNX",
        "technology": ["KNX"],
        "product_type": "Actuator",
        "installation": "DIN Rail mounting",
        "title": {
            "en": "KNX Switching Actuator 8-fold",
            "fr": "Actionneur de commutation KNX 8 canaux",
            "ar": "مشغل تبديل KNX بـ 8 قنوات"
        },
        "short_description": {
            "en": "8-fold KNX switching actuator with manual operation.",
            "fr": "Actionneur de commutation KNX 8 canaux avec commande manuelle.",
            "ar": "مشغل تبديل KNX بـ 8 قنوات مع إمكانية التشغيل اليدوي."
        },
        "description": {
            "en": "Reliable 8-fold switching actuator designed for standard DIN rail. Supports heavy loads, capacitive loads, and features manual override switches.",
            "fr": "Actionneur de commutation 8 canaux fiable conçu pour rail DIN standard. Supporte de lourdes charges et dispose d'interrupteurs manuels.",
            "ar": "مشغل تبديل موثوق بـ 8 قنوات مصمم للتركيب القياسي بـ DIN Rail. يتحمل الأحمال الثقيلة ويحتوي على مفاتيح تشغيل يدوية."
        },
        "specs": {
            "en": {"Channels": "8", "Load": "16A per channel", "Bus Voltage": "21-30V DC"},
            "fr": {"Canaux": "8", "Charge": "16A par canal", "Tension de bus": "21-30V DC"},
            "ar": {"القنوات": "8", "الحمل": "16A لكل قناة", "جهد الناقل": "21-30V DC"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "fibaro-dimmer-2",
        "brand": "Fibaro",
        "technology": ["Z-Wave"],
        "product_type": "Dimmer",
        "installation": "Behind wall switch",
        "title": {
            "en": "Fibaro Dimmer 2",
            "fr": "Variateur Fibaro 2",
            "ar": "فيبارو ديمر 2"
        },
        "short_description": {
            "en": "Universal dimming module with built-in power metering.",
            "fr": "Module de variation universel avec mesure de puissance intégrée.",
            "ar": "وحدة تعتيم عالمية مع ميزة قياس استهلاك الطاقة المدمجة."
        },
        "description": {
            "en": "Remotely controlled light dimming module designed to work with various types of light sources. It senses the light source type automatically.",
            "fr": "Module de variation de lumière télécommandé conçu pour fonctionner avec différents types de sources lumineuses.",
            "ar": "وحدة تعتيم الإضاءة للتحكم عن بعد مصممة للعمل مع أنواع مختلفة من مصادر الإضاءة وتستشعر النوع تلقائياً."
        },
        "specs": {
            "en": {"Protocol": "Z-Wave Plus", "Power": "110-240V", "Features": "Power Metering"},
            "fr": {"Protocole": "Z-Wave Plus", "Puissance": "110-240V", "Caractéristiques": "Mesure de puissance"},
            "ar": {"البروتوكول": "Z-Wave Plus", "الطاقة": "110-240V", "الميزات": "قياس الطاقة"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "loxone-miniserver",
        "brand": "Loxone",
        "technology": ["Loxone Tree", "KNX", "LAN"],
        "product_type": "Server",
        "installation": "DIN Rail mounting",
        "title": {
            "en": "Loxone Miniserver",
            "fr": "Miniserver Loxone",
            "ar": "خادم لوكسون الصغير"
        },
        "short_description": {
            "en": "The brain of your Loxone smart home system.",
            "fr": "Le cerveau de votre système domotique Loxone.",
            "ar": "العقل المدبر لنظام منزلك الذكي من لوكسون."
        },
        "description": {
            "en": "The Loxone Miniserver handles all communication and intelligent decision making in your smart home perfectly.",
            "fr": "Le Miniserver Loxone gère toute la communication et les décisions intelligentes dans votre maison.",
            "ar": "يتولى خادم لوكسون الصغير جميع الاتصالات والقرارات الذكية في منزلك الذكي بكل مثالية."
        },
        "specs": {
            "en": {"Interfaces": "Loxone Link, Tree, KNX", "Mounting": "DIN Rail"},
            "fr": {"Interfaces": "Loxone Link, Tree, KNX", "Montage": "Rail DIN"},
            "ar": {"الواجهات": "Loxone Link, Tree, KNX", "التركيب": "لوحة DIN"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "sonoff-mini-r4",
        "brand": "Sonoff",
        "technology": ["Wi-Fi"],
        "product_type": "Smart Relay",
        "installation": "Behind wall switch",
        "title": {
            "en": "Sonoff Mini R4",
            "fr": "Sonoff Mini R4",
            "ar": "سونوف ميني R4"
        },
        "short_description": {
            "en": "Extreme mini Wi-Fi smart switch.",
            "fr": "Commutateur intelligent Wi-Fi extrêmement mini.",
            "ar": "مفتاح واي فاي ذكي صغير الحجم للغاية."
        },
        "description": {
            "en": "Super tiny Wi-Fi switch that fits precisely standard mounting boxes. Supports Matter protocol via updates.",
            "fr": "Interrupteur Wi-Fi super minuscule qui s'intègre dans des boîtes de montage standard.",
            "ar": "مفتاح واي فاي صغير جداً يتناسب تماماً مع علب التركيب القياسية. يدعم بروتوكول Matter عبر التحديثات."
        },
        "specs": {
            "en": {"Amperage": "10A", "Voltage": "100-240V"},
            "fr": {"Ampérage": "10A", "Tension": "100-240V"},
            "ar": {"الأمبير": "10A", "الجهد": "100-240V"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "philips-hue-bridge",
        "brand": "Philips",
        "technology": ["Zigbee", "LAN"],
        "product_type": "Gateway",
        "installation": "Surface mounting",
        "title": {
            "en": "Philips Hue Bridge",
            "fr": "Pont Philips Hue",
            "ar": "فيليبس هيو بريدج"
        },
        "short_description": {
            "en": "The heart of your Philips Hue smart lighting system.",
            "fr": "Le cœur de votre système d'éclairage intelligent Philips Hue.",
            "ar": "قلب نظام الإضاءة الذكية من فيليبس هيو."
        },
        "description": {
            "en": "Unlocks the full suite of smart lighting features, allowing you to connect and control up to 50 lights and accessories.",
            "fr": "Débloque toutes les fonctionnalités d'éclairage intelligent et vous permet de connecter 50 lampes.",
            "ar": "يفتح المجموعة الكاملة لميزات الإضاءة الذكية، مما يتيح لك توصيل والتحكم بـ 50 مصباحاً وملحقاً."
        },
        "specs": {
            "en": {"Max Lights": "50", "Max Accessories": "12", "Protocol": "Zigbee 3.0"},
            "fr": {"Lumières Max": "50", "Accessoires Max": "12", "Protocole": "Zigbee 3.0"},
            "ar": {"الحد الأقصى للمصابيح": "50", "الحد الأقصى للملحقات": "12", "البروتوكول": "Zigbee 3.0"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "aqara-door-sensor",
        "brand": "Aqara",
        "technology": ["Zigbee"],
        "product_type": "Sensor",
        "installation": "Surface mounting",
        "title": {
            "en": "Aqara Door and Window Sensor",
            "fr": "Capteur de porte et fenêtre Aqara",
            "ar": "مستشعر أبواب ونوافذ عقارة"
        },
        "short_description": {
            "en": "Detects the status of doors and windows in real-time.",
            "fr": "Détecte l'état des portes et fenêtres en temps réel.",
            "ar": "يكتشف حالة الأبواب والنوافذ في الوقت الفعلي."
        },
        "description": {
            "en": "A smart sensor that triggers alarms or automations when doors or windows are opened or closed.",
            "fr": "Un capteur intelligent qui déclenche des alarmes ou des automatisations lorsque les portes s'ouvrent.",
            "ar": "مستشعر ذكي يشغل الإنذارات الآلية عندما يتم فتح أو إغلاق الأبواب أو النوافذ."
        },
        "specs": {
            "en": {"Battery": "CR1632", "Battery Life": "2 years", "Range": "30m"},
            "fr": {"Batterie": "CR1632", "Autonomie": "2 ans", "Portée": "30m"},
            "ar": {"البطارية": "CR1632", "عمر البطارية": "سنتين", "المدى": "30m"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "shelly-pro-4pm",
        "brand": "Shelly",
        "technology": ["Wi-Fi", "LAN", "Bluetooth"],
        "product_type": "Actuator",
        "installation": "DIN Rail mounting",
        "title": {
            "en": "Shelly Pro 4PM",
            "fr": "Shelly Pro 4PM",
            "ar": "شيلي برو 4 بي إم"
        },
        "short_description": {
            "en": "4-channel DIN rail relay switch with Wi-Fi, LAN and Bluetooth connection.",
            "fr": "Relais 4 canaux pour rail DIN avec connexions Wi-Fi, LAN.",
            "ar": "مفتاح ريلاي بـ 4 قنوات يركب على لوحة DIN مزود بالواي فاي والاتصال السلكي."
        },
        "description": {
            "en": "Professional 4-channel relay switch equipped with precise power metering, temperature, overpower, and overvoltage protection.",
            "fr": "Actionneur 4 canaux professionnel avec mesure précise de la puissance et protections.",
            "ar": "مفتاح ريلاي احترافي بأربع قنوات مجهز بقياس دقيق للطاقة وحماية من الحرارة الزائدة والجهد الزائد."
        },
        "specs": {
            "en": {"Channels": "4", "Load per channel": "16A", "Screen": "1.8 inch LCD"},
            "fr": {"Canaux": "4", "Charge": "16A", "Écran": "1.8 pouces LCD"},
            "ar": {"القنوات": "4", "الحمل لكل قناة": "16A", "الشاشة": "1.8 إنش LCD"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "knx-presence-detector",
        "brand": "Steinel",
        "technology": ["KNX"],
        "product_type": "Sensor",
        "installation": "Ceiling mounting",
        "title": {
            "en": "True Presence Detector KNX",
            "fr": "Détecteur True Presence KNX",
            "ar": "مستشعر الوجود الحقيقي KNX"
        },
        "short_description": {
            "en": "High-frequency presence detector for precise human detection.",
            "fr": "Détecteur de présence haute fréquence pour une détection précise.",
            "ar": "مستشعر وجود عالي التردد لاكتشاف التواجد البشري بدقة فائقة."
        },
        "description": {
            "en": "The first true presence detector in the world. It reliably detects the presence of a person regardless of what they are doing, whether walking or sitting absolutely still.",
            "fr": "Le premier véritable détecteur de présence au monde. Détecte la présence d'une personne même immobile.",
            "ar": "أول مستشعر وجود حقيقي في العالم. يكتشف بوضوح وجود أي شخص بغض النظر عما يفعله، سواء أكان يمشي أو يجلس بثبات تام."
        },
        "specs": {
            "en": {"Sensor Type": "High Frequency", "Detection Zone": "64m²", "Mounting": "Ceiling"},
            "fr": {"Type de capteur": "Haute Fréquence", "Zone de détection": "64m²", "Montage": "Plafond"},
            "ar": {"نوع المستشعر": "تردد عالي", "منطقة التغطية": "64m²", "التركيب": "في السقف"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "yale-smart-lock",
        "brand": "Yale",
        "technology": ["Bluetooth", "Wi-Fi"],
        "product_type": "Smart Lock",
        "installation": "Door frame",
        "title": {
            "en": "Yale Linus Smart Lock",
            "fr": "Serrure Connectée Yale Linus",
            "ar": "قفل باب ذكي ييل لاينس"
        },
        "short_description": {
            "en": "Secure and keyless door lock.",
            "fr": "Serrure de porte sécurisée et sans clé.",
            "ar": "قفل باب آمن يعمل بدون مفتاح."
        },
        "description": {
            "en": "Upgrade your door lock with the Linus Smart Lock, a secure door lock that allows you to lock and unlock your door – no matter where you are.",
            "fr": "Améliorez votre serrure de porte avec la serrure intelligente Linus pour un accès sans clé où que vous soyez.",
            "ar": "قم بترقية قفل بابك بقفل لاينس الذكي، لتتمكن من فتح وقفل بابك بغض النظر عن مكان تواجدك."
        },
        "specs": {
            "en": {"Power": "4x AA Batteries", "Encryption": "AES 128 bit"},
            "fr": {"Énergie": "4x Piles AA", "Cryptage": "AES 128 bit"},
            "ar": {"الطاقة": "4 بطاريات AA", "التشفير": "AES 128 bit"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "ubiquiti-unifi-u6",
        "brand": "Ubiquiti",
        "technology": ["Wi-Fi", "LAN"],
        "product_type": "Network",
        "installation": "Ceiling mounting",
        "title": {
            "en": "UniFi U6 Professional",
            "fr": "UniFi U6 Professionnel",
            "ar": "نقطة وصول UniFi U6 برو"
        },
        "short_description": {
            "en": "High-performance Wi-Fi 6 access point.",
            "fr": "Point d'accès Wi-Fi 6 haute performance.",
            "ar": "نقطة وصول واي فاي 6 عالية الأداء."
        },
        "description": {
            "en": "Indoor, dual-band Wi-Fi 6 access point that can support over 300 clients with its 5.3 Gbps aggregate throughput rate.",
            "fr": "Point d'accès Wi-Fi 6 intérieur double bande capable de prendre en charge plus de 300 clients.",
            "ar": "نقطة وصول واي فاي 6 للاستخدام الداخلي، يمكنها توفير تغطية قوية لـ 300 مستخدم بانسيابية 5.3 جيجابت."
        },
        "specs": {
            "en": {"Standard": "Wi-Fi 6 (802.11ax)", "Throughput": "5.3 Gbps", "PoE": "Supported"},
            "fr": {"Standard": "Wi-Fi 6 (802.11ax)", "Débit": "5.3 Gbps", "PoE": "Supporté"},
            "ar": {"المعيار": "واي فاي 6", "سرعة النقل": "5.3 Gbps", "PoE": "مدعوم"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "somfy-tahoma",
        "brand": "Somfy",
        "technology": ["RTS", "Zigbee", "IO-Homecontrol"],
        "product_type": "Gateway",
        "installation": "Surface mounting",
        "title": {
            "en": "Somfy TaHoma switch",
            "fr": "Somfy TaHoma switch",
            "ar": "بوابة التحكم الذكية صومفي تاهوما"
        },
        "short_description": {
            "en": "Smart control for your home's motors and lighting.",
            "fr": "Contrôle intelligent des moteurs et de l'éclairage de votre maison.",
            "ar": "تحكم ذكي في محركات الستائر وإضاءة المنزل."
        },
        "description": {
            "en": "The TaHoma switch is a smart box that centralizes the control of your home appliances. Compatible with multiple protocols.",
            "fr": "La TaHoma switch est un boîtier intelligent qui centralise le contrôle de vos équipements domotiques.",
            "ar": "تاهوما سويتش عبارة عن مركز ذكي يجمع ويتحكم في كل تجهيزات منزلك الذكية بكل سلاسة ويدعم عدة بروتوكولات."
        },
        "specs": {
            "en": {"Max Devices": "200", "App": "TaHoma by Somfy"},
            "fr": {"Périphériques Max": "200", "Application": "TaHoma par Somfy"},
            "ar": {"الحد الأقصى للأجهزة": "200", "التطبيق": "TaHoma by Somfy"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "nest-thermostat",
        "brand": "Google Nest",
        "technology": ["Wi-Fi", "Matter"],
        "product_type": "Thermostat",
        "installation": "Wall mounting",
        "title": {
            "en": "Nest Learning Thermostat",
            "fr": "Thermostat Nest Learning",
            "ar": "ترموستات نيست الذكي"
        },
        "short_description": {
            "en": "Smart thermostat that learns your schedule.",
            "fr": "Thermostat intelligent qui mémorise vos habitudes.",
            "ar": "ترموستات ذكي يتعلم جدولك وروتينك المفضل."
        },
        "description": {
            "en": "The Nest Learning Thermostat automatically adapts as your life changes. Just use it for a week and it programs itself.",
            "fr": "Le Thermostat Nest s'adapte automatiquement à votre vie. Utilisez-le pendant une semaine et il se programme seul.",
            "ar": "يتكيف ترموستات نيست تلقائياً مع حياتك، ما عليك سوى استخدامه لمدة أسبوع ليقوم ببرمجة نفسه."
        },
        "specs": {
            "en": {"Screen": "High-res Color LCD", "Sensors": "Temperature, Humidity, Motion"},
            "fr": {"Écran": "Écran couleur LCD", "Capteurs": "Température, Humidité, Mouvement"},
            "ar": {"الشاشة": "LCD ملونة عالية الدقة", "المستشعرات": "حرارة، رطوبة، حركة"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "knx-power-supply",
        "brand": "Schneider",
        "technology": ["KNX"],
        "product_type": "Power Supply",
        "installation": "DIN Rail mounting",
        "title": {
            "en": "KNX Power Supply 640mA",
            "fr": "Alimentation KNX 640mA",
            "ar": "مزود طاقة للنظام KNX 640mA"
        },
        "short_description": {
            "en": "Reliable power supply for your KNX bus system.",
            "fr": "Alimentation fiable pour votre système KNX.",
            "ar": "مزود طاقة موثوق لنظام وأجهزة KNX."
        },
        "description": {
            "en": "Provides 30 V DC power for KNX components with an integrated choke. Essential for any secure KNX installation.",
            "fr": "Fournit une alimentation 30 V DC pour les composants KNX. Indispensable pour une installation KNX sécurisée.",
            "ar": "يقوم بتزويد أجهزة KNX بطاقة 30 فولت مستمر. عنصر أساسي ومطلوب في أي التركيبات الذكية KNX."
        },
        "specs": {
            "en": {"Output Current": "640 mA", "Width": "4 DIN modules"},
            "fr": {"Courant de sortie": "640 mA", "Largeur": "4 modules DIN"},
            "ar": {"تيار الخرج": "640 مللي أمبير", "التثبيت": "4 وحدات DIN"}
        },
        "images": [],
        "files": []
    },
    {
        "id": "tapo-c200",
        "brand": "TP-Link",
        "technology": ["Wi-Fi"],
        "product_type": "Camera",
        "installation": "Surface mounting",
        "title": {
            "en": "Tapo C200 Pan/Tilt Camera",
            "fr": "Caméra Tapo C200 Pan/Tilt",
            "ar": "كاميرا مراقبة ذكية Tapo C200 المحورية"
        },
        "short_description": {
            "en": "Home security Wi-Fi camera with 360° coverage.",
            "fr": "Caméra de sécurité Wi-Fi pour la maison avec couverture à 360°.",
            "ar": "كاميرا مراقبة منزلية بخاصية تصوير بزاوية 360 درجة."
        },
        "description": {
            "en": "Capture every detail in crystal-clear 1080p definition. See exactly what happened in front of your camera anytime it was on.",
            "fr": "Capturez chaque détail avec une résolution 1080p. Voyez exactement ce qui s'est passé devant la caméra.",
            "ar": "تمكنك من رؤية كل التفاصيل بجودة عالية ودقة 1080، وتوفر صوتاً باتجاهين للكشف و الرد على زوار منزلك."
        },
        "specs": {
            "en": {"Resolution": "1080p Full HD", "Storage": "MicroSD up to 128GB"},
            "fr": {"Résolution": "1080p Full HD", "Stockage": "MicroSD jusqu'à 128Go"},
            "ar": {"الدقة": "1080p HD", "التخزين": "MicroSD حتى 128 جيجا"}
        },
        "images": [],
        "files": []
    }
]

for p in test_products:
    path = os.path.join(products_dir, f"{p['id']}.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

print(f"Generated {len(test_products)} test products with updated schemas successfully.")
