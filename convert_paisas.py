import csv
from PyPDF2 import PdfReader

pdf_path = r"C:\Users\F Conrado\.gemini\antigravity-ide\brain\a75abecc-2c40-44df-92eb-3eac18935bd1\.user_uploaded\media_1787996900011.pdf"

products = []

with open(pdf_path, 'rb') as f:
    reader = PdfReader(f)
    is_data = False
    
    for page in reader.pages:
        text = page.extract_text()
        if not text:
            continue
            
        lines = text.split('\n')
        for line in lines:
            t = line.strip()
            if not t:
                continue
            
            if 'Codigo Descripcion Marca' in t:
                is_data = True
                continue
                
            if 'SOMOS PAISAS' in t or 'TU PROVEEDOR DE CONFIANZA' in t or 'Inventario' in t or 'FINAL' in t:
                continue
                
            if not is_data:
                continue
                
            parts = t.split(' ')
            if len(parts) < 3:
                continue
                
            price_str = parts[-1].replace(',', '')
            try:
                precio = float(price_str)
            except ValueError:
                continue
                
            codigo = parts[0]
            
            # Reconstruct name & brand
            nombre_parts = parts[1:-1]
            nombre = " ".join(nombre_parts).strip()
            
            # Infer level
            nivel = 2
            upper = nombre.upper()
            if any(k in upper for k in ['ACETAMINOFEN', 'IBUPROFENO', 'PARACETAMOL', 'AMOXICILINA', 'VIROGRIP', 'DOLO', 'ELECTROLIT', 'SUERO', 'NEUROBION', 'TABCIN', 'ASPIRINA']):
                nivel = 1
            elif any(k in upper for k in ['GEL', 'CREMA', 'SHAMPOO', 'DERM', 'SOLAR', 'JABON', 'PROTECTOR', 'ENSURE', 'GLUCERNA', 'PEDIASURE', 'CONDON']):
                nivel = 3
            
            products.append({
                'nombre_producto': nombre,
                'ingrediente_activo': 'PAISAS',
                'categoria': 'General',
                'nivel': nivel,
                'proveedor': 'PAISAS',
                'codigo_proveedor': codigo,
                'precio_base': "0.00",
                'descuento_porcentaje': 0,
                'precio_neto': "0.00",
                'escala_compra': 0,
                'escala_regalo': 0
            })

fieldnames = [
    'nombre_producto',
    'ingrediente_activo',
    'categoria',
    'nivel',
    'proveedor',
    'codigo_proveedor',
    'precio_base',
    'descuento_porcentaje',
    'precio_neto',
    'escala_compra',
    'escala_regalo'
]

for out_path in ['catalogo_paisas.csv', 'public/catalogo_paisas.csv']:
    with open(out_path, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for p in products:
            writer.writerow(p)

print(f"Generated catalogo_paisas.csv with {len(products)} products.")
