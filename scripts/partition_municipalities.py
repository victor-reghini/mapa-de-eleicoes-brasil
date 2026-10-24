import urllib.request
import json
import os

UF_CODES = {
    '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
    '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
    '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
    '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
}

os.makedirs('public/geo/mun', exist_ok=True)

print("Fetching full Brazilian municipalities GeoJSON (~30MB)...")
url = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-100-mun.json'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
raw = urllib.request.urlopen(req, timeout=30).read()
try:
    data = json.loads(raw.decode('utf-8'))
except:
    data = json.loads(raw.decode('latin-1'))

uf_features = {uf: [] for uf in UF_CODES.values()}
index = []

def round_coords(coords):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], 4), round(coords[1], 4)]
    return [round_coords(c) for c in coords]

def get_centroid(coords):
    # Flatten coords to get rough centroid bbox center
    pts = []
    def extract(c):
        if not c:
            return
        if isinstance(c[0], (int, float)):
            pts.append(c)
        else:
            for sub in c:
                extract(sub)
    extract(coords)
    if not pts:
        return [0, 0]
    min_x = min(p[0] for p in pts)
    max_x = max(p[0] for p in pts)
    min_y = min(p[1] for p in pts)
    max_y = max(p[1] for p in pts)
    return [round((min_x + max_x) / 2, 4), round((min_y + max_y) / 2, 4)]

for f in data.get('features', []):
    props = f.get('properties', {})
    mun_id = str(props.get('id', ''))
    name = props.get('name', '')
    uf_code = mun_id[:2]
    uf_sigla = UF_CODES.get(uf_code)
    
    if not uf_sigla:
        continue
        
    geom = f.get('geometry', {})
    geom['coordinates'] = round_coords(geom.get('coordinates', []))
    centroid = get_centroid(geom.get('coordinates', []))
    
    clean_f = {
        'type': 'Feature',
        'id': mun_id,
        'properties': {
            'id': mun_id,
            'name': name,
            'uf': uf_sigla,
            'lon': centroid[0],
            'lat': centroid[1]
        },
        'geometry': geom
    }
    uf_features[uf_sigla].append(clean_f)
    index.append({
        'id': mun_id,
        'name': name,
        'uf': uf_sigla,
        'lon': centroid[0],
        'lat': centroid[1]
    })

print(f"Loaded {len(index)} municipalities across {len(uf_features)} states.")

# Save index for fast search & autocomplete
with open('public/geo/municipalities_index.json', 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False)
print("Saved public/geo/municipalities_index.json")

# Save per-UF slices
for uf, feats in uf_features.items():
    fc = {
        'type': 'FeatureCollection',
        'features': feats
    }
    with open(f'public/geo/mun/{uf}.json', 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False)

print("Saved all per-UF municipality GeoJSONs!")
