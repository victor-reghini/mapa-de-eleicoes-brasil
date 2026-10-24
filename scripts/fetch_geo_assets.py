import urllib.request
import json
import os

os.makedirs('public/geo', exist_ok=True)

print("1. Fetching World TopoJSON for 3D Globe...")
try:
    world_url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    req = urllib.request.Request(world_url, headers={'User-Agent': 'Mozilla/5.0'})
    world_data = urllib.request.urlopen(req, timeout=15).read()
    with open('public/geo/world-110m.json', 'wb') as f:
        f.write(world_data)
    print("✓ World TopoJSON saved (size:", len(world_data), "bytes)")
except Exception as e:
    print("✗ Error fetching world topojson:", e)

print("2. Fetching Brazil States GeoJSON...")
try:
    uf_url = 'https://raw.githubusercontent.com/fititnt/gis-dataset-brasil/master/uf/geojson/uf.json'
    req = urllib.request.Request(uf_url, headers={'User-Agent': 'Mozilla/5.0'})
    raw_uf = urllib.request.urlopen(req, timeout=15).read()
    uf_json = json.loads(raw_uf.decode('latin-1'))
    
    # Normalize features to clean UTF-8 with standard properties
    cleaned_features = []
    for f in uf_json.get('features', []):
        props = f.get('properties', {})
        sigla = props.get('UF_05', '').upper()
        nome = props.get('NOME_UF', '')
        regiao = props.get('REGIAO', '')
        geocodigo = props.get('GEOCODIGO', '')
        
        # Round coords to 4 decimals for 70% size reduction
        def round_coords(coords):
            if isinstance(coords[0], (int, float)):
                return [round(coords[0], 4), round(coords[1], 4)]
            return [round_coords(c) for c in coords]
            
        geom = f.get('geometry', {})
        if 'coordinates' in geom:
            geom['coordinates'] = round_coords(geom['coordinates'])
            
        cleaned_features.append({
            'type': 'Feature',
            'id': sigla,
            'properties': {
                'sigla': sigla,
                'nome': nome,
                'regiao': regiao,
                'geocodigo': geocodigo
            },
            'geometry': geom
        })
        
    cleaned_geojson = {
        'type': 'FeatureCollection',
        'features': cleaned_features
    }
    
    with open('public/geo/br-states.json', 'w', encoding='utf-8') as f:
        json.dump(cleaned_geojson, f, ensure_ascii=False)
    print(f"✓ Brazil States GeoJSON saved with {len(cleaned_features)} UFs (size: {os.path.getsize('public/geo/br-states.json')} bytes)")
except Exception as e:
    print("✗ Error fetching UF geojson:", e)

print("Done geo assets download.")
