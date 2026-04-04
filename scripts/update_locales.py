import json
from pathlib import Path

locales_dir = Path("assets/locales")

translations = {
    "val_Sensor": {"en": "Sensor", "fr": "Capteur", "ar": "مستشعر"},
    "val_Smart_Relay": {"en": "Smart Relay", "fr": "Relais Intelligent", "ar": "مرحل ذكي"},
    "val_Smart_Lock": {"en": "Smart Lock", "fr": "Serrure Connectée", "ar": "قفل ذكي"},
    "val_Camera": {"en": "Camera", "fr": "Caméra", "ar": "كاميرا مراقبة"},
    "val_Thermostat": {"en": "Thermostat", "fr": "Thermostat", "ar": "ترموستات"},
    "val_Power_Supply": {"en": "Power Supply", "fr": "Alimentation", "ar": "مزود طاقة"},
    "val_Dimmer": {"en": "Dimmer", "fr": "Variateur", "ar": "مخفت إضاءة"},
    "val_Network": {"en": "Network", "fr": "Réseau", "ar": "أجهزة شبكة"},
    "val_Actuator": {"en": "Actuator", "fr": "Actionneur", "ar": "مشغل كهربائي"},
    "val_Server": {"en": "Server", "fr": "Serveur", "ar": "خادم مركزي"},
    "val_Gateway": {"en": "Gateway", "fr": "Passerelle", "ar": "بوابة ربط"},
    "val_Door_frame": {"en": "Door frame", "fr": "Cadre de porte", "ar": "إطار الباب"},
    "val_Behind_wall_switch": {"en": "Behind wall switch", "fr": "Derrière l'interrupteur", "ar": "خلف مفتاح الحائط"},
    "val_DIN_Rail_mounting": {"en": "DIN Rail mounting", "fr": "Montage Rail DIN", "ar": "لوحة توزيع DIN"},
    "val_Free_standing": {"en": "Free standing", "fr": "Indépendant", "ar": "وضع حر مستقل"},
    "val_Wall_mount": {"en": "Wall mount", "fr": "Montage mural", "ar": "تثبيت حائطي"},
    "val_Ceiling_mounting": {"en": "Ceiling mounting", "fr": "Montage au plafond", "ar": "تثبيت في السقف"}
}

for lang in ["en", "fr", "ar"]:
    filepath = locales_dir / f"{lang}.json"
    if filepath.exists():
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for key, vals in translations.items():
            data[key] = vals[lang]
            
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Updated {lang}.json")
