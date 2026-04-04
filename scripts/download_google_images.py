import os
import json
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

def get_google_image(query):
    try:
        query = urllib.parse.quote_plus(query + " product")
        url = f"https://www.google.com/search?q={query}&tbm=isch"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        html = urllib.request.urlopen(req).read()
        soup = BeautifulSoup(html, 'html.parser')
        
        # The generic google images page has <img> tags with src="https://encrypted-tbn0..."
        for img in soup.find_all('img'):
            src = img.get('src')
            if src and src.startswith('https://encrypted'):
                return src
    except Exception as e:
        print(f"Error fetching image for {query}: {e}")
    return None

def update_products():
    products_dir = Path("data/products")
    images_dir = Path("assets/products")
    
    for json_file in products_dir.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Attempt to find search string or title
        query = ""
        if "title" in data and isinstance(data["title"], dict):
            query = data["title"].get("en", "")
        else:
            query = data.get("title", data.get("id"))
            
        print(f"Fetching image for {query}...")
        img_url = get_google_image(query)
        
        if img_url:
            img_filename = f"{data['id']}.jpg"
            img_path = images_dir / img_filename
            try:
                urllib.request.urlretrieve(img_url, img_path)
                data["images"] = [f"/assets/products/{img_filename}"]
                
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f" -> Saved {img_filename}")
            except Exception as e:
                print(f" -> Failed to download: {e}")
        else:
            print(f" -> No image found.")

if __name__ == '__main__':
    update_products()
