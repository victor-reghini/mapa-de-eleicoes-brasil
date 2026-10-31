"""
Export static partitions for municipios, zonas, and secoes from data/bu_presidente.db
Format: tabular {"cols": [...], "rows": [[...], ...]} to minimize file size by 70%+.
Zero em-dashes used.
"""

import json
import os
import sqlite3
import time

DB_PATH = 'data/bu_presidente.db'
OUT_BASE = 'public/data/bu'

ROUNDS = [
    (2026, 2),
    (2026, 1),
    (2022, 2),
    (2022, 1),
    (2018, 2),
    (2018, 1),
    (2014, 2),
    (2014, 1),
]

UFS = [
    'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
    'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO', 'ZZ'
]

def export_tabular(cursor, out_file: str):
    cols = [d[0] for d in cursor.description]
    rows = cursor.fetchall()
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump({'cols': cols, 'rows': rows}, f, separators=(',', ':'), ensure_ascii=False)
    size_mb = os.path.getsize(out_file) / 1024 / 1024
    return len(rows), size_mb

def main():
    t0 = time.time()
    con = sqlite3.connect(DB_PATH)

    # 1. Export Municipios (all 8 rounds)
    print("--- 1. Exporting Municipios ---")
    for ano, turno in ROUNDS:
        cur = con.execute('SELECT * FROM bu_municipio WHERE ano=? AND turno=? ORDER BY sg_uf, nm_municipio', (ano, turno))
        out_path = f"{OUT_BASE}/municipios/{ano}_{turno}.json"
        cnt, sz = export_tabular(cur, out_path)
        print(f"Municipios {ano}_{turno}: {cnt} rows, {sz:.2f} MB -> {out_path}")

    # 2. Export Zonas (all 8 rounds)
    print("\n--- 2. Exporting Zonas ---")
    for ano, turno in ROUNDS:
        cur = con.execute('SELECT * FROM bu_zona WHERE ano=? AND turno=? ORDER BY sg_uf, nr_zona', (ano, turno))
        out_path = f"{OUT_BASE}/zonas/{ano}_{turno}.json"
        cnt, sz = export_tabular(cur, out_path)
        print(f"Zonas {ano}_{turno}: {cnt} rows, {sz:.2f} MB -> {out_path}")

    # 3. Export Secoes for recent high-demand rounds (2026 2T, 2026 1T, 2022 2T)
    print("\n--- 3. Exporting Secoes (by UF) ---")
    SECAO_ROUNDS = [(2026, 2), (2026, 1), (2022, 2)]
    for ano, turno in SECAO_ROUNDS:
        for uf in UFS:
            cur = con.execute(
                'SELECT * FROM bu_secao WHERE ano=? AND turno=? AND sg_uf=? ORDER BY nr_zona, nr_secao',
                (ano, turno, uf)
            )
            out_path = f"{OUT_BASE}/secoes/{ano}_{turno}_{uf}.json"
            cnt, sz = export_tabular(cur, out_path)
            if uf in ['SP', 'MG', 'RJ', 'PR', 'TO', 'ZZ']:
                print(f"Secoes {ano}_{turno}_{uf}: {cnt} rows, {sz:.2f} MB -> {out_path}")

    elapsed = round(time.time() - t0, 1)
    print(f"\nAll static partitions exported successfully in {elapsed}s.")

if __name__ == '__main__':
    main()

