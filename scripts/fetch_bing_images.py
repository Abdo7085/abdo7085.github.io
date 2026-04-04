import os
import json
import urllib.request
import re
from pathlib import Path

def get_bing_image(query):
    try:
        q = urllib.parse.quote_plus(query + " product")
        url = f"https://www.bing.com/images/search?q={q}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        
        # Extract the source URL from Bing's maddening JSON-in-attribute structure
        match = re.search(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
        if match:
            return match.group(1)
    except Exception as e:
        print(f"Error searching Bing for {query}: {e}")
    return None

def download_and_update():
    products_dir = Path("data/products")
    images_dir = Path("assets/products")
    images_dir.mkdir(parents=True, exist_ok=True)
    
    for json_file in products_dir.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        title = ""
        if isinstance(data.get("title"), dict):
            title = data["title"].get("en", "")
        else:
            title = data.get("title", data.get("id"))
            
        print(f"Searching image for: {title}")
        img_url = get_bing_image(title)
        
        if img_url:
            print(f" -> Found: {img_url}")
            filename = f"{data['id']}.jpg"
            filepath = images_dir / filename
            
            try:
                # Need user agent for downloading the image too
                req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
                img_data = urllib.request.urlopen(req, timeout=10).read()
                
                with open(filepath, 'wb') as f:
                    f.write(img_data)
                
                # Update JSON
                data['images'] = [f"/assets/products/{filename}"]
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f" -> Downloaded and saved.")
            except Exception as e:
                print(f" -> Failed to download: {e}")
        else:
            print(" -> No image found.")

if __name__ == '__main__':
    download_and_update()
