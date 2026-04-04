import urllib.request
import os
import json
from bs4 import BeautifulSoup

urls = [
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu0800-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu0808-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu1200-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu1212-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu1600-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu1616-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu2000-room-control-unit",
    "https://www.eaetechnology.com/en/products/knx-products/room-control-units/rcu2018-room-control-unit"
]

output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "products"))
images_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "products"))

if not os.path.exists(output_dir):
    os.makedirs(output_dir)
if not os.path.exists(images_dir):
    os.makedirs(images_dir)

# Helper translation function
def translate_ar(text):
    text = text.replace("Room Control Unit", "وحدة التحكم بالغرفة")
    text = text.replace("Does not require an external power supply", "لا يتطلب مصدر طاقة خارجي")
    text = text.replace("Switching", "التحويل")
    text = text.replace("Dimming", "التعتيم")
    text = text.replace("Blind Control", "تحكم الستائر")
    text = text.replace("Fan Control", "تحكم المراوح")
    text = text.replace("Valve Control", "تحكم الصمامات")
    return text

def translate_fr(text):
    text = text.replace("Room Control Unit", "Unité de contrôle de pièce")
    text = text.replace("Does not require an external power supply", "Ne nécessite pas d'alimentation externe")
    text = text.replace("Switching", "Commutation")
    text = text.replace("Dimming", "Variation")
    text = text.replace("Blind Control", "Contrôle des stores")
    text = text.replace("Fan Control", "Contrôle du ventilateur")
    text = text.replace("Valve Control", "Contrôle des vannes")
    return text

import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, context=ctx).read().decode('utf-8')
        soup = BeautifulSoup(response, 'html.parser')
        
        # 1. Title
        h1 = soup.find('h1')
        title = h1.text.strip() if h1 else "Unknown"
        title_id = url.split('/')[-1]
        
        # 2. Main content area
        # Often the description is in <p> tags after the h1.
        # Let's find the content container.
        desc_texts = []
        feature_texts = []
        for p in soup.find_all('p'):
            text = p.text.strip()
            if text and len(text) > 20 and "EAE" in text:
                desc_texts.append(text)
                
        for li in soup.find_all('li'):
            text = li.text.strip()
            # Most features mention "Control", "require", "Switching", etc.
            if "Control" in text or "Switching" in text or "require" in text or "Outputs" in text or "Inputs" in text:
                if len(text) < 150: # avoid scraping whole menus
                    if text not in feature_texts:
                        feature_texts.append(text)
        
        desc_en = " ".join(desc_texts[:2]) if desc_texts else "EAE KNX Room Control Unit with advanced features."
        
        # 3. Specs / Features mapping
        specs_en = {}
        for idx, feat in enumerate(feature_texts[:8]): # Take top 8 features as specs
            specs_en[f"Feature {idx+1}"] = feat
            
        specs_fr = {f"Caractéristique {idx+1}": translate_fr(feat) for idx, feat in enumerate(feature_texts[:8])}
        specs_ar = {f"الميزة {idx+1}": translate_ar(feat) for idx, feat in enumerate(feature_texts[:8])}
        
        # 4. Files
        files = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            # Strict file extension check
            if href.lower().endswith('.pdf') or href.lower().endswith('.knxprod'):
                name = a.text.strip()
                if not name:
                    continue
                # Ensure no duplicate names
                if len(name) > 3 and name.lower() not in [f.lower() for f in [fx['name'] for fx in files]]:
                    full_url = href if href.startswith('http') else "https://www.eaetechnology.com" + href
                    files.append({"name": name, "url": full_url})
        
        valid_files = files
        
        # 5. Image
        image_relative = ""
        main_img_element = None
        for img in soup.find_all('img'):
            src = img.get('data-src') or img.get('src') or ''
            if 'rc0' in src.lower() or 'rc1' in src.lower() or 'rc2' in src.lower() or 'rcu' in src.lower():
                main_img_element = img
                break
            
        if main_img_element:
            img_url = main_img_element.get('data-src') or main_img_element.get('src')
            if img_url:
                img_url = img_url if img_url.startswith('http') else "https://www.eaetechnology.com" + img_url
                img_name = f"{title_id}.png" # Usually EAE uses png for these images
                img_path = os.path.join(images_dir, img_name)
                try:
                    img_data = urllib.request.urlopen(urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'}), context=ctx).read()
                    with open(img_path, 'wb') as f:
                        f.write(img_data)
                    image_relative = f"/assets/products/{img_name}"
                except Exception as e:
                    print(f"Failed to download image for {title_id} from {img_url}: {e}")
        
        # Compile JSON
        product_data = {
            "id": title_id,
            "brand": "EAE Technology",
            "technology": ["KNX"],
            "product_type": "Actuator",
            "installation": "DIN Rail mounting",
            "title": {
                "en": title,
                "fr": translate_fr(title),
                "ar": translate_ar(title)
            },
            "short_description": {
                "en": desc_en[:150] + "...",
                "fr": translate_fr(desc_en[:150] + "..."),
                "ar": translate_ar(desc_en[:150] + "...")
            },
            "description": {
                "en": desc_en,
                "fr": translate_fr(desc_en),
                "ar": translate_ar(desc_en)
            },
            "specs": {
                "en": specs_en,
                "fr": specs_fr,
                "ar": specs_ar
            },
            "images": [image_relative] if image_relative else [],
            "files": valid_files
        }
        
        json_path = os.path.join(output_dir, f"{title_id}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(product_data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {title_id}")

    except Exception as e:
        print(f"Error on {url}: {e}")

# Run build_products to regenerate the index
print("Running build_products.py...")
try:
    build_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "build_products.py"))
    # In python 3, executing another script
    with open(build_script, 'r', encoding='utf-8') as f:
        exec(f.read())
except Exception as e:
    print("Failed to run build_products.py:", e)

print("All done!")
