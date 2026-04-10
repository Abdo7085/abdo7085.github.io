import os, re

target_files = []
for d in ['fr', 'ar']:
    for f in ['index.html', 'product.html', 'products.html', 'previous-work.html', 'dummy.html']:
        path = os.path.join(d, f)
        if os.path.exists(path):
            target_files.append(path)

for f in target_files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Catch any variation of the hyphen or spaces
    content = re.sub(r'<meta\s+property="og:site_name"\s+content="S.*?ELECTRICITY Smart Home & Domotique\s*"\s*/>', '<meta property="og:site_name" content="S‑ELECTRICITY" />', content)
    
    # Replace alternative names
    content = content.replace('"alternateName": "S-ELECTRICITY",', '"alternateName": "SMART ELECTRICITY",')
    content = content.replace('"alternateName": "S‑ELECTRICITY",', '"alternateName": "SMART ELECTRICITY",')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f'Updated {f}')
