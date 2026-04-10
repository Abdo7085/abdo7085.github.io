import os, re

target_files = [
    'index.html', 'product.html', 'products.html', 'previous-work.html', '404.html'
]

for f in target_files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace og:site_name
        content = re.sub(r'<meta\s+property="og:site_name"\s+content="S‑ELECTRICITY Smart Home & Domotique\s*"\s*/>', '<meta property="og:site_name" content="S‑ELECTRICITY" />', content)
        
        # Replace alternate name in WebSite schema
        content = content.replace('"alternateName": "S-ELECTRICITY",', '"alternateName": "SMART ELECTRICITY",')
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Updated {f}')
