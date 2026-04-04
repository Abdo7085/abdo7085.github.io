import os
import json
import time
import requests
from duckduckgo_search import DDGS
from pathlib import Path

# Setup directories
PRODUCTS_DIR = Path("data/products")
IMAGES_DIR = Path("assets/products")
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# Product Database
products = [
    {
        "id": "eae-knx-actuator-pa108",
        "search": "EAE KNX Switch Actuator PA108",
        "brand": "EAE Technology",
        "title": {
            "en": "EAE KNX Switch Actuator PA108",
            "fr": "Actionneur de Commutation EAE KNX PA108",
            "ar": "وحدة التحكم الكهربائي EAE KNX PA108"
        },
        "short_description": {
            "en": "8-channel KNX switch actuator for lighting, blinds and heating.",
            "fr": "Actionneur KNX à 8 canaux pour l'éclairage, stores et chauffage.",
            "ar": "وحدة تحكم KNX من 8 قنوات للإنارة والستائر والتدفئة."
        },
        "description": {
            "en": "The PA108 Switch Actuator operates on KNX. It has 8 independent output channels. Each channel can be configured as a switch, shutter/blind, or thermal valve. It supports manual control via push buttons on the device.",
            "fr": "L'actionneur PA108 fonctionne sous KNX. Il dispose de 8 canaux de sortie indépendants. Chaque canal peut être configuré comme interrupteur, volet/store ou vanne thermique. Contrôle manuel pris en charge.",
            "ar": "وحدة التحكم PA108 تعمل بنظام KNX. تحتوي على 8 قنوات خروج مستقلة يمكن برمجتها كمفاتيح أو للستائر أو للتدفئة الدقيقة. تدعم التحكم اليدوي من خلال الأزرار المدمجة."
        },
        "technology": ["KNX"],
        "product_type": "Actuator",
        "installation": "DIN Rail mounting",
        "specs": {
            "en": {"Channels": "8", "Current": "16A per channel", "Voltage": "230V AC"},
            "fr": {"Canaux": "8", "Courant": "16A par canal", "Tension": "230V AC"},
            "ar": {"القنوات": "8", "التيار": "16 أمبير لكل قناة", "الجهد": "230 فولت"}
        }
    },
    {
        "id": "eae-knx-presence-detector-pd100",
        "search": "EAE KNX Presence Detector PD100",
        "brand": "EAE Technology",
        "title": {
            "en": "EAE KNX Presence Detector PD100",
            "fr": "Détecteur de Présence EAE KNX PD100",
            "ar": "حساس التواجد EAE KNX PD100"
        },
        "short_description": {
            "en": "High sensitivity KNX presence sensor for offices and corridors.",
            "fr": "Capteur de présence KNX haute sensibilité pour bureaux et couloirs.",
            "ar": "مستشعر تواجد وحركة KNX عالي الحساسية للمكاتب والممرات."
        },
        "description": {
            "en": "The EAE PD100 is designed for ceiling flush mount. It detects minimal movements, integrated with a light level sensor for constant light control (daylight harvesting).",
            "fr": "Le EAE PD100 est conçu pour un montage encastré au plafond. Il détecte les mouvements minimes, intégré avec un capteur de luminosité pour un contrôle constant de la lumière.",
            "ar": "صُمم الـ PD100 للتركيب المخفي في السقف. يكتشف الحركات الدقيقة، ومدمج به مستشعر ضوء للتحكم المستمر في الإضاءة (استغلال ضوء النهار)."
        },
        "technology": ["KNX"],
        "product_type": "Sensor",
        "installation": "Ceiling mounting",
        "specs": {
            "en": {"Detection Angle": "360°", "Mounting": "Flush mount", "Light Sensor": "Integrated"},
            "fr": {"Angle de détection": "360°", "Montage": "Encastré", "Capteur de lumière": "Intégré"},
            "ar": {"زاوية الكشف": "360°", "التثبيت": "مخفي في السقف", "مستشعر الضوء": "مدمج"}
        }
    },
    {
        "id": "eae-knx-power-supply-ps640",
        "search": "EAE KNX Power Supply PS640",
        "brand": "EAE Technology",
        "title": {
            "en": "EAE KNX Power Supply 640mA",
            "fr": "Alimentation EAE KNX 640mA",
            "ar": "مزود طاقة EAE KNX 640mA"
        },
        "short_description": {
            "en": "Stable 30V DC power supply for KNX TP lines with integrated choke.",
            "fr": "Alimentation stable 30V DC pour lignes KNX TP avec self intégrée.",
            "ar": "إمداد طاقة ثابت 30 فولت لخطوط KNX TP مع محوّل مدمج."
        },
        "description": {
            "en": "Provides system power to the KNX line. With an integrated choke. Output current: 640 mA. Features short-circuit and overvoltage protection.",
            "fr": "Fournit l'alimentation système à la ligne KNX. Avec self intégrée. Courant de sortie : 640 mA. Dispose de protections contre les courts-circuits et les surtensions.",
            "ar": "يوفر طاقة للنظام على خط KNX. يتضمن محول مدمج. تيار الإخراج: 640 مللي أمبير. مزود بحماية ضد قصر الدائرة والجهد الزائد."
        },
        "technology": ["KNX"],
        "product_type": "Power Supply",
        "installation": "DIN Rail mounting",
        "specs": {
            "en": {"Output Voltage": "30V DC", "Current": "640mA", "Width": "4 Modules"},
            "fr": {"Tension de Sortie": "30V DC", "Courant": "640mA", "Largeur": "4 Modules"},
            "ar": {"جهد الخرج": "30 فولت", "التيار": "640 مللي أمبير", "العرض": "4 وحدات DIN"}
        }
    },
    {
        "id": "eae-knx-rosa-thermostat",
        "search": "EAE KNX Rosa Thermostat Metal",
        "brand": "EAE Technology",
        "title": {
            "en": "EAE Rosa Metal KNX Thermostat",
            "fr": "Thermostat Métallique EAE Rosa KNX",
            "ar": "ترموستات EAE Rosa المعدني KNX"
        },
        "short_description": {
            "en": "Premium metal touch thermostat with integrated room temperature controller.",
            "fr": "Thermostat tactile en métal premium avec contrôleur de température ambiante intégré.",
            "ar": "منظم حرارة معدني فاخر يعمل باللمس مع جهاز تحكم مدمج لدرجة حرارة الغرفة."
        },
        "description": {
            "en": "The Rosa Metal KNX Thermostat offers a frameless minimalist design with touch buttons matching the metal surface. Can control fans, heating, and cooling modes natively via KNX.",
            "fr": "Le Thermostat Rosa Metal KNX offre un design minimaliste sans cadre avec des boutons tactiles assortis à la surface métallique. Peut contrôler les ventilateurs, le chauffage et la climatisation.",
            "ar": "يوفر ترموستات Rosa المعدني تصميماً أنيقاً بدون إطار مع أزرار لمس مطابقة للسطح المعدني. يمكّنه التحكم في المراوح، أوضاع التدفئة، والتبريد برمجياً عبر نظام KNX."
        },
        "technology": ["KNX"],
        "product_type": "Thermostat",
        "installation": "Behind wall switch",
        "specs": {
            "en": {"Material": "Metal", "Screen": "LCD", "Sensors": "Temperature, Humidity (optional)"},
            "fr": {"Matériau": "Métal", "Écran": "LCD", "Capteurs": "Température, Humidité (optionnel)"},
            "ar": {"المادة": "معدن نفيس", "الشاشة": "LCD", "المستشعرات": "الحرارة، الرطوبة (اختياري)"}
        }
    },
    {
        "id": "shelly-pro-4pm",
        "search": "Shelly Pro 4PM smart switch with display",
        "brand": "Shelly",
        "title": {
            "en": "Shelly Pro 4PM",
            "fr": "Shelly Pro 4PM",
            "ar": "شيلي برو 4PM"
        },
        "short_description": {
            "en": "4-channel DIN rail smart switch with power measurement.",
            "fr": "Interrupteur intelligent rail DIN 4 canaux avec mesure de puissance.",
            "ar": "مفتاح ذكي من 4 قنوات مع إمكانية قياس استهلاك الطاقة."
        },
        "description": {
            "en": "Professional 4-channel relay switch with Wi-Fi, LAN, and Bluetooth connection. Real-time power measurement for each channel and a color screen.",
            "fr": "Relais professionnel 4 canaux avec connexion Wi-Fi, LAN et Bluetooth. Mesure de puissance en temps réel pour chaque canal et écran couleur.",
            "ar": "مرحل احترافي بأربع قنوات مع اتصال عبر Wi-Fi و LAN و Bluetooth. قياس فوري لاستهلاك الطاقة لكل قناة مع شاشة ملونة للتحكم."
        },
        "technology": ["Wi-Fi", "Bluetooth", "LAN"],
        "product_type": "Actuator",
        "installation": "DIN Rail mounting",
        "specs": {
            "en": {"Channels": "4", "Max Load": "16A per channel", "Display": "1.8 inch TFT"},
            "fr": {"Canaux": "4", "Charge Max": "16A par canal", "Écran": "1.8 pouces TFT"},
            "ar": {"القنوات": "4", "أقصى حمولة": "16 أمبير لكل قناة", "الشاشة": "1.8 بوصة TFT"}
        }
    },
    {
        "id": "shelly-1-gen4",
        "search": "Shelly 1 Gen3 smart relay",
        "brand": "Shelly",
        "title": {
            "en": "Shelly 1 Mini Gen3",
            "fr": "Shelly 1 Mini Gen3",
            "ar": "شيلي 1 ميني الجيل الثالث"
        },
        "short_description": {
            "en": "The smallest smart relay for simple automated control.",
            "fr": "Le plus petit relais intelligent pour un contrôle automatisé simple.",
            "ar": "أصغر مرحل ذكي للتحكم الآلي المبسط."
        },
        "description": {
            "en": "Easily automate your lights, garage door, or irrigation system. Fits behind any wall switch.",
            "fr": "Automatisez facilement vos lumières, votre porte de garage ou système d'irrigation. S'insère derrière n'importe quel interrupteur mural.",
            "ar": "تحكم آلياً بإضاءتك، باب الكراج أو نظام الري. يناسب التركيب خلف أي مفتاح حائط بسهولة."
        },
        "technology": ["Wi-Fi", "Bluetooth"],
        "product_type": "Smart Relay",
        "installation": "Behind wall switch",
        "specs": {
            "en": {"Contacts": "Dry contacts", "Max Load": "8A", "Size": "29x34x16 mm"},
            "fr": {"Contacts": "Contacts secs", "Charge Max": "8A", "Taille": "29x34x16 mm"},
            "ar": {"الجهات الخارجية": "توصيل جاف", "أقصى حمولة": "8 أمبير", "الحجم": "29x34x16 مم"}
        }
    },
    {
        "id": "yale-linus-smart-lock",
        "search": "Yale Linus Smart Lock",
        "brand": "Yale",
        "title": {
            "en": "Yale Linus Smart Lock L2",
            "fr": "Serrure Connectée Yale Linus L2",
            "ar": "قفل ييل لاينس الذكي L2"
        },
        "short_description": {
            "en": "Secure and keyless door lock managed via smartphone.",
            "fr": "Serrure de porte sécurisée et sans clé gérée via smartphone.",
            "ar": "قفل باب آمن وبدون مفتاح يدار بالكامل عبر الهاتف الذكي."
        },
        "description": {
            "en": "Upgrade your door lock with the Linus Smart Lock L2. Faster, quieter, and natively integrated with Wi-Fi. Auto-locks when you leave.",
            "fr": "Améliorez la serrure de votre porte avec la Linus Smart Lock L2. Plus rapide, plus silencieuse et intégrée nativement avec Wi-Fi.",
            "ar": "طوّر قفل بابك باستخدام القفل الذكي Linus L2. أسرع، أهدأ، ومبرمج تلقائياً على الواي فاي. يغلق الباب ذاتياً عند مغادرتك."
        },
        "technology": ["Wi-Fi", "Bluetooth"],
        "product_type": "Smart Lock",
        "installation": "Door frame",
        "specs": {
            "en": {"Battery": "Rechargeable pack", "Encryption": "AES 128 bit"},
            "fr": {"Batterie": "Pack rechargeable", "Chiffrement": "AES 128 bit"},
            "ar": {"البطارية": "حزمة قابلة لإعادة الشحن", "التشفير": "AES 128 بت"}
        }
    },
    {
        "id": "nest-thermostat",
        "search": "Google Nest Learning Thermostat 3rd gen",
        "brand": "Google",
        "title": {
            "en": "Nest Learning Thermostat v3",
            "fr": "Nest Learning Thermostat v3",
            "ar": "ترموستات نيست الذكي v3"
        },
        "short_description": {
            "en": "Learns your schedule and programs itself to save energy.",
            "fr": "Apprend votre emploi du temps et se programme pour économiser l'énergie.",
            "ar": "يتعلم جدولك ويبرمج نفسه لتوفير استهلاك الطاقة."
        },
        "description": {
            "en": "A beautiful, intelligent thermostat designed to manage your HVAC system effortlessly while providing energy reports.",
            "fr": "Un thermostat magnifique et intelligent conçu pour gérer votre système CVC sans effort, tout en fournissant des rapports énergétiques.",
            "ar": "ترموستات ذكي وجميل التصميم، صمم ليتولى إدارة نظام التدفئة والتبريد لديك ببراعة، مع تقارير حول توفير الطاقة."
        },
        "technology": ["Wi-Fi", "Thread"],
        "product_type": "Thermostat",
        "installation": "Wall mount",
        "specs": {
            "en": {"Screen": "2.08-inch", "Sensors": "Temperature, Humidity, Motion"},
            "fr": {"Écran": "2.08 pouces", "Capteurs": "Température, Humidité, Mouvement"},
            "ar": {"الشاشة": "2.08 بوصة", "المستشعرات": "الحرارة، الرطوبة، الحركة"}
        }
    },
    {
        "id": "sonoff-mini-r4",
        "search": "Sonoff Mini R4 Wi-Fi switch",
        "brand": "Sonoff",
        "title": {
            "en": "Sonoff MINI R4 Extreme",
            "fr": "Sonoff MINI R4 Extreme",
            "ar": "سونوف ميني R4 المكثف"
        },
        "short_description": {
            "en": "Extremely mini DIY smart switch.",
            "fr": "Un mini interrupteur intelligent DIY",
            "ar": "مفتاح ذكي مصغر جداً سهل التركيب."
        },
        "description": {
            "en": "MINIR4 is an extreme mini Wi-Fi smart switch equipped with an ESP32 chip. Turns traditional switches into smart ones.",
            "fr": "MINIR4 est un mini interrupteur intelligent Wi-Fi équipé d'une puce ESP32. Transforme les interrupteurs traditionnels en intelligents.",
            "ar": "جهاز MINIR4 هو أداة صغيرة جداً مزودة بشريحة ESP32، يحول أزرار الإنارة التقليدية في بيتك لتعمل برمجياً وبالصوت."
        },
        "technology": ["Wi-Fi", "Bluetooth"],
        "product_type": "Smart Relay",
        "installation": "Behind wall switch",
        "specs": {
            "en": {"Max Load": "10A", "Matter": "Supported (MINIR4M)", "Size": "39.5x33x16.8 mm"},
            "fr": {"Charge Max": "10A", "Matter": "Supporté (MINIR4M)", "Taille": "39.5x33x16.8 mm"},
            "ar": {"الحد الأقصى للتيار": "10 أمبير", "بروتوكول ماتر": "مدعوم", "الحجم": "39.5x33x16.8 ملم"}
        }
    },
    {
        "id": "philips-hue-bridge",
        "search": "Philips Hue Bridge",
        "brand": "Philips",
        "title": {
            "en": "Philips Hue Bridge",
            "fr": "Pont Philips Hue",
            "ar": "جسر فيليبس هيو"
        },
        "short_description": {
            "en": "The brain of the Philips Hue smart lighting system.",
            "fr": "Le cerveau du système d'éclairage intelligent Philips Hue.",
            "ar": "العقل المدبر لنظام الإضاءة الذكية والملونة."
        },
        "description": {
            "en": "Connect up to 50 lights and accessories. It enables voice control, automation, and out-of-home control via Zigbee.",
            "fr": "Connectez jusqu'à 50 lumières et accessoires. Il permet le contrôle vocal, l'automatisation et le contrôle hors domicile via Zigbee.",
            "ar": "يتيح لك توصيل ما يصل إلى 50 مصباحاً وملحقاً. يمكّن التحكم الصوتي والأتمتة والتحكم من خارج المنزل باستخدام بروتوكول Zigbee."
        },
        "technology": ["Zigbee", "LAN"],
        "product_type": "Gateway",
        "installation": "Free standing",
        "specs": {
            "en": {"Max Devices": "50", "Protocol": "Zigbee 3.0", "Apple HomeKit": "Yes"},
            "fr": {"Appareils Max": "50", "Protocole": "Zigbee 3.0", "Apple HomeKit": "Oui"},
            "ar": {"الحد الأقصى للأجهزة": "50", "البروتوكول": "زيجبي 3.0", "هوم كيت": "مدعوم"}
        }
    },
    {
        "id": "loxone-miniserver",
        "search": "Loxone Miniserver Gen 2",
        "brand": "Loxone",
        "title": {
            "en": "Loxone Miniserver",
            "fr": "Miniserver Loxone",
            "ar": "خادم لوكسون الصغير"
        },
        "short_description": {
            "en": "The central core for 360° home and building automation.",
            "fr": "Le cœur central pour l'automatisation à 360° des maisons et des bâtiments.",
            "ar": "النواة المركزية للتحكم بأتمتة المنازل والمباني بدرجة 360 درجة."
        },
        "description": {
            "en": "Loxone Miniserver is the most powerful tool for building automation. It acts as the brain handling all logic, security, heating and lighting tasks securely offline.",
            "fr": "Le miniserver Loxone est l'outil d'automatisation des bâtiments le plus puissant. Il agit comme le cerveau gérant toute la logique et les tâches de sécurité sans nécessiter le cloud.",
            "ar": "منصة Loxone Miniserver هي الأداة الأقوى في أتمتة البناء. تعمل كدماغ مستقر يتعامل مع كل مهام المنطق، التدفئة والإضاءة بسرعة خارقة وبدون إنترنت."
        },
        "technology": ["Tree", "LAN", "KNX"],
        "product_type": "Server",
        "installation": "DIN Rail mounting",
        "specs": {
            "en": {"Relays": "8", "Inputs": "8 Digital", "Network": "IPv4, IPv6 Support"},
            "fr": {"Relais": "8", "Entrées": "8 Numériques", "Réseau": "Support IPv4, IPv6"},
            "ar": {"المرحلات": "8", "مداخل": "8 ديجيتال", "الشبكة": "مدعوم لـ IPv4, IPv6"}
        }
    },
    {
        "id": "tapo-c200",
        "search": "TP-Link Tapo C200 Pan/Tilt Security Camera",
        "brand": "TP-Link",
        "title": {
            "en": "Tapo C200 Security Camera",
            "fr": "Caméra de Sécurité Tapo C200",
            "ar": "كاميرا المراقبة Tapo C200"
        },
        "short_description": {
            "en": "Pan/Tilt home security Wi-Fi camera.",
            "fr": "Caméra Wi-Fi de sécurité domestique Pan/Tilt.",
            "ar": "كاميرا مراقبة منزلية متحركة تعمل بالواي فاي."
        },
        "description": {
            "en": "High definition 1080p surveillance with 360° horizontal view. Advanced night vision, motion detection and two-way audio.",
            "fr": "Surveillance haute définition 1080p avec vue horizontale à 360°. Vision nocturne avancée, détection de mouvement et audio bidirectionnel.",
            "ar": "مراقبة بدقة 1080 بكسل العالية مع رؤية محيطية بـ 360 درجة. رؤية ليلية قوية وتنبيهات مستشعرات الحركة وتحدث في الاتجاهين."
        },
        "technology": ["Wi-Fi"],
        "product_type": "Camera",
        "installation": "Ceiling mounting",
        "specs": {
            "en": {"Resolution": "1080p FHD", "Storage": "MicroSD up to 128GB", "Night Vision": "up to 30 ft"},
            "fr": {"Résolution": "1080p FHD", "Stockage": "MicroSD jusqu'à 128Go", "Vision nocturne": "jusqu'à 9m"},
            "ar": {"الدقة": "1080 بكسل FHD", "التخزين": "بطاقة ذاكرة لغاية 128 جيجا", "الرؤية الليلية": "حتى 9 أمتار"}
        }
    },
    {
        "id": "aqara-door-sensor",
        "search": "Aqara Door and Window Sensor",
        "brand": "Aqara",
        "title": {
            "en": "Aqara Door and Window Sensor",
            "fr": "Capteur d'Ouverture Aqara",
            "ar": "حساس فتح الأبواب من Aqara"
        },
        "short_description": {
            "en": "Detects if a window or door is open in real time.",
            "fr": "Détecte si une fenêtre ou une porte est ouverte en temps réel.",
            "ar": "يكتشف إذا تُرك الباب أو النافذة مفتوحاً لحظياً."
        },
        "description": {
            "en": "A compact smart sensor that easily triggers the alarm or interacts with smart home scenes. Battery lasts for 2 years.",
            "fr": "Un capteur intelligent compact qui déclenche facilement l'alarme ou interagit avec les scènes de la maison. La batterie dure 2 ans.",
            "ar": "حساس ذكي مدمج لتفعيل إنذارات الحماية أو تشغيل الإضاءة عند فتح الباب. تدوم بطاريته لحوالي عامين متصلين."
        },
        "technology": ["Zigbee"],
        "product_type": "Sensor",
        "installation": "Door frame",
        "specs": {
            "en": {"Battery": "CR1632", "Clearance": "22mm max gap"},
            "fr": {"Batterie": "CR1632", "Écartement": "22mm espace maximal"},
            "ar": {"البطارية": "CR1632", "المسافة": "أقصى فراغ 22 ملم"}
        }
    },
    {
        "id": "ubiquiti-u6-lite",
        "search": "Ubiquiti UniFi 6 Lite Access Point",
        "brand": "Ubiquiti",
        "title": {
            "en": "Ubiquiti UniFi 6 Lite",
            "fr": "Ubiquiti UniFi 6 Lite",
            "ar": "نقطة توزيع Ubiquiti UniFi 6"
        },
        "short_description": {
            "en": "Wi-Fi 6 Access Point designed for indoor coverage.",
            "fr": "Point d'Accès Wi-Fi 6 conçu pour une couverture intérieure.",
            "ar": "نقطة وصول إنترنت بتقنية واي فاي 6 معدة للتغطية الداخلية القوية."
        },
        "description": {
            "en": "The U6 Lite is a 2x2 Wi-Fi 6 access point that delivers up to 1.5 Gbps aggregate radio rate with 5 GHz and 2.4 GHz radios. Ideal for dense home environments.",
            "fr": "Le U6 Lite est un point d'accès Wi-Fi 6 2x2 offrant un taux radio global allant jusqu'à 1,5 Gbps. Idéal pour les environnements domestiques denses.",
            "ar": "تعد U6 Lite نقطة وصول لاسلكية تعتمد على تقنية Wi-Fi 6 الفائقة بسرعات إجمالية تصل إلى 1.5 جيجابت لكل ثانية. مثالي للمنازل المزدحمة بالأجهزة الذكية."
        },
        "technology": ["Wi-Fi", "LAN"],
        "product_type": "Network",
        "installation": "Ceiling mounting",
        "specs": {
            "en": {"Wi-Fi Standard": "Wi-Fi 6", "Power Method": "PoE (802.3af)", "Throughput": "1500 Mbps"},
            "fr": {"Norme Wi-Fi": "Wi-Fi 6", "Alimentation": "PoE (802.3af)", "Débit": "1500 Mbps"},
            "ar": {"معيار الواي فاي": "الجيل 6", "التغذية الكهربائية": "PoE", "السرعة الغجمالية": "1500 ميجابت"}
        }
    },
    {
        "id": "somfy-tahoma",
        "search": "Somfy TaHoma switch",
        "brand": "Somfy",
        "title": {
            "en": "Somfy TaHoma switch",
            "fr": "Somfy TaHoma switch",
            "ar": "علبة التحكم Somfy TaHoma"
        },
        "short_description": {
            "en": "Smart control for motorized blinds, shutters and awnings.",
            "fr": "Contrôle intelligent pour stores, volets et auvents motorisés.",
            "ar": "مركز تحكم ذكي للستائر والمظلات المنزلية الآلية."
        },
        "description": {
            "en": "TaHoma switch is a smart command central to centralize and connect your Somfy smart home equipment and other compatible brands.",
            "fr": "L'interrupteur TaHoma est une centrale de commande intelligente pour centraliser et connecter vos équipements domotiques Somfy.",
            "ar": "جهاز التحكم الذكي TaHoma يمكنه تجميع ومركزة جميع أجهزة منزلك من منتجات Somfy والأجهزة الموافقة الأخرى لتشغيلها بضغطة واحدة."
        },
        "technology": ["Zigbee", "Wi-Fi", "RTS/io"],
        "product_type": "Gateway",
        "installation": "Free standing",
        "specs": {
            "en": {"Integrations": "Supports over 300 devices", "Protocol": "io-homecontrol, RTS, Zigbee 3.0"},
            "fr": {"Intégrations": "Prend en charge plus de 300 appareils", "Protocole": "io-homecontrol, RTS, Zigbee 3.0"},
            "ar": {"التوافق": "دعم لأكثر من 300 جهاز", "البروتوكولات": "Zigbee, RTS, IO"}
        }
    }
]

def search_image(query):
    try:
        with DDGS() as ddgs:
            results = ddgs.images(
                keywords=f"{query} high quality",
                max_results=5
            )
            for r in results:
                url = r.get("image")
                if url and "amazon" not in url and "ebay" not in url:
                    return url
            if results:
                return results[0].get("image")
    except Exception as e:
        print(f"Failed to search for {query}: {e}")
    return None

def download_image(url, filepath):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
    return False

def generate_products():
    for device in products:
        filename = PRODUCTS_DIR / f"{device['id']}.json"
        image_filename = f"{device['id']}.jpg"
        image_path = IMAGES_DIR / image_filename
        
        # Determine image
        query = device.get('search', device['id'])
        device.pop('search', None) # remove search keyword
        
        url = search_image(query)
        if url:
            print(f"Downloading image for {device['id']} -> {url}")
            success = download_image(url, image_path)
            if success:
                device['images'] = [f"/assets/products/{image_filename}"]
            else:
                device['images'] = []
                print(f"Failed to download image for {device['id']}")
        else:
            device['images'] = []
            
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(device, f, indent=2, ensure_ascii=False)
            
    print("Done generated 15 realistic products.")

if __name__ == '__main__':
    generate_products()
