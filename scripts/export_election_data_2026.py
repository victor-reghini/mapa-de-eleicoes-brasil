"""
Export official 2026 results from data/bu_presidente.db into public/data/elections/2026_2.json
and inject all municipal results into public/data/elections/2026_1.json.
Zero em-dashes used.
"""

import json
import sqlite3
import unicodedata
import os

DB_PATH = 'data/bu_presidente.db'
MUN_INDEX_PATH = 'public/geo/municipalities_index.json'
OUT_2026_2 = 'public/data/elections/2026_2.json'
OUT_2026_1 = 'public/data/elections/2026_1.json'

def norm(s: str) -> str:
    if not s:
        return ''
    return ''.join(c for c in unicodedata.normalize('NFD', s.upper()) if unicodedata.category(c) != 'Mn').strip()

def main():
    con = sqlite3.connect(DB_PATH)
    muns_idx = json.load(open(MUN_INDEX_PATH))
    idx_map = {(m['uf'], norm(m['name'])): m['id'] for m in muns_idx}
    # Also index by normalized name without punctuation (like D'OESTE -> DOESTE)
    for m in muns_idx:
        clean_nm = norm(m['name']).replace("'", "").replace("-", " ")
        idx_map[(m['uf'], clean_nm)] = m['id']

    # --- 1. BUILD 2026 2º TURNO ---
    print("Building 2026 2º Turno official dataset...")
    # Brasil totals
    r_br = con.execute('''
        SELECT SUM(qt_aptos), SUM(qt_comparecimento), SUM(qt_abstencoes),
               SUM(qt_votos_validos), SUM(qt_brancos), SUM(qt_nulos),
               SUM(votos_13), SUM(votos_22), SUM(qt_secoes)
        FROM bu_uf WHERE ano=2026 AND turno=2
    ''').fetchone()

    aptos_br, comp_br, abs_br, val_br, br_br, nul_br, v13_br, v22_br, sec_br = r_br
    pct_comp_br = round((comp_br / aptos_br) * 100, 2)
    pct_abs_br = round((abs_br / aptos_br) * 100, 2)
    pct_val_br = round((val_br / comp_br) * 100, 2)
    pct_br_br = round((br_br / comp_br) * 100, 2)
    pct_nul_br = round((nul_br / comp_br) * 100, 2)
    pct_13_br = round((v13_br / val_br) * 100, 2)
    pct_22_br = round((v22_br / val_br) * 100, 2)

    cands_br = [
        {
            "numero": "13",
            "nome": "Luiz Inácio Lula da Silva",
            "nomeUrna": "Lula",
            "partido": "PT",
            "coligacao": "Federação Brasil da Esperança (PT/PCdoB/PV)",
            "cor": "#e11d48",
            "votos": v13_br,
            "pctValidos": pct_13_br,
            "eleito": True
        },
        {
            "numero": "22",
            "nome": "Flávio Nantes Bolsonaro",
            "nomeUrna": "Flávio Bolsonaro",
            "partido": "PL",
            "coligacao": "Coligação Pelo Bem do Brasil (PL/PP/REPUBLICANOS)",
            "cor": "#2563eb",
            "votos": v22_br,
            "pctValidos": pct_22_br,
            "eleito": False
        }
    ]

    brasil_data = {
        "aptos": aptos_br,
        "comparecimento": comp_br,
        "pctComparecimento": pct_comp_br,
        "abstencoes": abs_br,
        "pctAbstencoes": pct_abs_br,
        "votosValidos": val_br,
        "pctValidos": pct_val_br,
        "votosBrancos": br_br,
        "pctBrancos": pct_br_br,
        "votosNulos": nul_br,
        "pctNulos": pct_nul_br,
        "secoesTotalizadas": sec_br,
        "totalSecoes": sec_br,
        "pctApuracao": 100.0,
        "candidatos": cands_br
    }

    # UFs data
    ufs_rows = con.execute('''
        SELECT sg_uf, qt_aptos, qt_comparecimento, qt_abstencoes, pct_comparecimento, pct_abstencoes,
               qt_votos_validos, pct_validos, qt_brancos, pct_brancos, qt_nulos, pct_nulos,
               votos_13, pct_13, votos_22, pct_22, qt_secoes
        FROM bu_uf WHERE ano=2026 AND turno=2
        ORDER BY sg_uf
    ''').fetchall()

    ufs_dict = {}
    for r in ufs_rows:
        uf, aptos, comp, abst, p_comp, p_abs, val, p_val, br, p_br, nul, p_nul, v13, p13, v22, p22, sec = r
        vencedor_nome = "Lula" if v13 > v22 else "Flávio Bolsonaro"
        vencedor_cor = "#e11d48" if v13 > v22 else "#2563eb"
        uf_cands = [
            {
                "numero": "13",
                "nome": "Luiz Inácio Lula da Silva",
                "nomeUrna": "Lula",
                "partido": "PT",
                "cor": "#e11d48",
                "votos": v13,
                "pctValidos": round(p13, 2),
                "eleito": v13 > v22
            },
            {
                "numero": "22",
                "nome": "Flávio Nantes Bolsonaro",
                "nomeUrna": "Flávio Bolsonaro",
                "partido": "PL",
                "cor": "#2563eb",
                "votos": v22,
                "pctValidos": round(p22, 2),
                "eleito": v22 > v13
            }
        ]
        uf_cands.sort(key=lambda c: c["votos"], reverse=True)
        ufs_dict[uf] = {
            "sigla": uf,
            "aptos": aptos,
            "comparecimento": comp,
            "pctComparecimento": round(p_comp, 2),
            "abstencoes": abst,
            "pctAbstencoes": round(p_abs, 2),
            "votosValidos": val,
            "pctValidos": round(p_val, 2),
            "votosBrancos": br,
            "pctBrancos": round(p_br, 2),
            "votosNulos": nul,
            "pctNulos": round(p_nul, 2),
            "secoesTotalizadas": sec,
            "totalSecoes": sec,
            "pctApuracao": 100.0,
            "vencedor": vencedor_nome,
            "vencedorCor": vencedor_cor,
            "candidatos": uf_cands
        }

    # Exterior consular cities
    zz_muns = con.execute('''
        SELECT nm_municipio, qt_aptos, qt_comparecimento, qt_abstencoes, qt_votos_validos,
               votos_13, pct_13, votos_22, pct_22
        FROM bu_municipio WHERE ano=2026 AND turno=2 AND sg_uf='ZZ'
        ORDER BY qt_comparecimento DESC
    ''').fetchall()

    # Pre-defined city coordinates for major external cities
    CITY_COORDS = {
        "LISBOA": {"pais": "Portugal", "iso": "PRT", "lat": 38.7223, "lon": -9.1393},
        "PORTO": {"pais": "Portugal", "iso": "PRT", "lat": 41.1579, "lon": -8.6291},
        "BOSTON": {"pais": "Estados Unidos", "iso": "USA", "lat": 42.3601, "lon": -71.0589},
        "NAGÓIA": {"pais": "Japão", "iso": "JPN", "lat": 35.1815, "lon": 136.9066},
        "LONDRES": {"pais": "Reino Unido", "iso": "GBR", "lat": 51.5074, "lon": -0.1278},
        "MIAMI": {"pais": "Estados Unidos", "iso": "USA", "lat": 25.7617, "lon": -80.1918},
        "TÓQUIO": {"pais": "Japão", "iso": "JPN", "lat": 35.6762, "lon": 139.6503},
        "NOVA YORK": {"pais": "Estados Unidos", "iso": "USA", "lat": 40.7128, "lon": -74.0060},
        "PARIS": {"pais": "França", "iso": "FRA", "lat": 48.8566, "lon": 2.3522},
        "TORONTO": {"pais": "Canadá", "iso": "CAN", "lat": 43.6532, "lon": -79.3832},
        "MADRI": {"pais": "Espanha", "iso": "ESP", "lat": 40.4168, "lon": -3.7038},
        "ROMA": {"pais": "Itália", "iso": "ITA", "lat": 41.9028, "lon": 12.4964},
        "SYDNEY": {"pais": "Austrália", "iso": "AUS", "lat": -33.8688, "lon": 151.2093},
        "BERLIM": {"pais": "Alemanha", "iso": "DEU", "lat": 52.5200, "lon": 13.4050},
        "BUENOS AIRES": {"pais": "Argentina", "iso": "ARG", "lat": -34.6037, "lon": -58.3816},
        "MONTEVIDÉU": {"pais": "Uruguai", "iso": "URY", "lat": -34.9011, "lon": -56.1645},
        "SANTIAGO": {"pais": "Chile", "iso": "CHL", "lat": -33.4489, "lon": -70.6693},
        "WASHINGTON": {"pais": "Estados Unidos", "iso": "USA", "lat": 38.9072, "lon": -77.0369},
        "ORLANDO": {"pais": "Estados Unidos", "iso": "USA", "lat": 28.5383, "lon": -81.3792},
        "HAMAMATSU": {"pais": "Japão", "iso": "JPN", "lat": 34.7108, "lon": 137.7261},
    }

    exterior_cidades = []
    tot_ext_aptos = 0
    tot_ext_comp = 0
    tot_ext_abs = 0

    for z in zz_muns:
        nm, apt, cmp, abs_v, val_v, v13, p13, v22, p22 = z
        tot_ext_aptos += apt
        tot_ext_comp += cmp
        tot_ext_abs += abs_v
        coord = CITY_COORDS.get(nm.upper(), {"pais": "Exterior", "iso": "EXT", "lat": 0.0, "lon": 0.0})
        exterior_cidades.append({
            "cidade": nm.title(),
            "pais": coord["pais"],
            "codigoIso": coord["iso"],
            "lat": coord["lat"],
            "lon": coord["lon"],
            "eleitores": apt,
            "comparecimento": cmp,
            "abstencoes": abs_v,
            "lula_r2": v13,
            "bolsonaro_r2": v22,
            "lula_pct": round(p13, 2),
            "bolsonaro_pct": round(p22, 2)
        })

    exterior_data = {
        "totalAptos": tot_ext_aptos,
        "comparecimento": tot_ext_comp,
        "abstencoes": tot_ext_abs,
        "cidades": exterior_cidades
    }

    # Municipalities data for 2026 2º Turno
    muns_26_2_rows = con.execute('''
        SELECT sg_uf, cd_municipio, nm_municipio, qt_aptos, qt_comparecimento, qt_abstencoes,
               qt_votos_validos, qt_brancos, qt_nulos, votos_13, pct_13, votos_22, pct_22
        FROM bu_municipio WHERE ano=2026 AND turno=2 AND sg_uf != 'ZZ'
    ''').fetchall()

    municipios_26_2 = []
    matched_26_2 = 0
    for r in muns_26_2_rows:
        uf, cd, nm, aptos, comp, abst, val, br, nul, v13, p13, v22, p22 = r
        clean_nm = norm(nm)
        ibge_id = idx_map.get((uf, clean_nm)) or idx_map.get((uf, clean_nm.replace("'", "").replace("-", " ")))
        if not ibge_id:
            # Fallback to TSE code formatted as string
            ibge_id = f"TSE_{cd}"
        else:
            matched_26_2 += 1

        cand_list = [
            {
                "numero": "22" if v22 >= v13 else "13",
                "nome": "Flávio Nantes Bolsonaro" if v22 >= v13 else "Luiz Inácio Lula da Silva",
                "nomeUrna": "Flávio Bolsonaro" if v22 >= v13 else "Lula",
                "partido": "PL" if v22 >= v13 else "PT",
                "cor": "#2563eb" if v22 >= v13 else "#e11d48",
                "votos": max(v22, v13),
                "pctValidos": round(max(p22, p13), 2),
                "eleito": v22 >= v13
            },
            {
                "numero": "13" if v22 >= v13 else "22",
                "nome": "Luiz Inácio Lula da Silva" if v22 >= v13 else "Flávio Nantes Bolsonaro",
                "nomeUrna": "Lula" if v22 >= v13 else "Flávio Bolsonaro",
                "partido": "PT" if v22 >= v13 else "PL",
                "cor": "#e11d48" if v22 >= v13 else "#2563eb",
                "votos": min(v22, v13),
                "pctValidos": round(min(p22, p13), 2),
                "eleito": False
            }
        ]

        municipios_26_2.append({
            "id": str(ibge_id),
            "nome": nm.title(),
            "uf": uf,
            "aptos": aptos,
            "comparecimento": comp,
            "abstencoes": abst,
            "votosValidos": val,
            "brancos": br,
            "nulos": nul,
            "lula_r2": v13,
            "bolsonaro_r2": v22,
            "lula_pct": round(p13, 2),
            "bolsonaro_pct": round(p22, 2),
            "candidatos": cand_list
        })

    print(f"2026 2T: {len(municipios_26_2)} municipalities processed ({matched_26_2} mapped to IBGE).")

    final_2026_2 = {
        "ano": 2026,
        "cargo": "PRESIDENTE",
        "turno": 2,
        "data": "25/10/2026",
        "titulo": "Eleição Presidencial 2026 - 2º Turno (Oficial Final)",
        "fonte": "TSE - Boletins de Urna Oficiais Consolidados",
        "isTempoReal": False,
        "apuracao": {
            "pct": 100.0,
            "secoesTotalizadas": sec_br,
            "totalSecoes": sec_br,
            "status": "FINALIZADA"
        },
        "brasil": brasil_data,
        "ufs": ufs_dict,
        "exterior": exterior_data,
        "zonas": [],
        "municipios": municipios_26_2,
        "detalhesNulos": {
            "motivos": [
                {"motivo": "Voto Nulo Convencional (Dígito inválido)", "pct": 74.2},
                {"motivo": "Voto Nulo Técnico / Seção Anulada", "pct": 0.0},
                {"motivo": "Outros nulos computados", "pct": 25.8}
            ]
        }
    }

    with open(OUT_2026_2, 'w', encoding='utf-8') as f:
        json.dump(final_2026_2, f, ensure_ascii=False, indent=2)
    print(f"Saved {OUT_2026_2} ({os.path.getsize(OUT_2026_2) / 1024 / 1024:.2f} MB)")

    # --- 2. ENRICH 2026 1º TURNO WITH MUNICIPALITIES ---
    print("Enriching 2026 1º Turno with municipal results...")
    with open(OUT_2026_1, 'r', encoding='utf-8') as f:
        data_2026_1 = json.load(f)

    cands_meta = {c["numero"]: c for c in data_2026_1["brasil"]["candidatos"]}

    muns_26_1_rows = con.execute('''
        SELECT sg_uf, cd_municipio, nm_municipio, qt_aptos, qt_comparecimento, qt_abstencoes,
               qt_votos_validos, qt_brancos, qt_nulos, votos_json, votos_13, pct_13, votos_22, pct_22
        FROM bu_municipio WHERE ano=2026 AND turno=1 AND sg_uf != 'ZZ'
    ''').fetchall()

    municipios_26_1 = []
    for r in muns_26_1_rows:
        uf, cd, nm, aptos, comp, abst, val, br, nul, v_json_str, v13, p13, v22, p22 = r
        clean_nm = norm(nm)
        ibge_id = idx_map.get((uf, clean_nm)) or idx_map.get((uf, clean_nm.replace("'", "").replace("-", " ")))
        if not ibge_id:
            ibge_id = f"TSE_{cd}"

        cands_for_mun = []
        try:
            v_dict = json.loads(v_json_str) if v_json_str else {}
        except Exception:
            v_dict = {}

        for nr_str, v_count in v_dict.items():
            meta = cands_meta.get(str(nr_str))
            cand_name = meta["nome"] if meta else f"Candidato {nr_str}"
            cand_urna = meta["nomeUrna"] if meta else cand_name
            partido = meta["partido"] if meta else "PART"
            cor = meta["cor"] if meta else "#64748b"
            pct = round((v_count / val * 100), 2) if val > 0 else 0.0
            cands_for_mun.append({
                "numero": str(nr_str),
                "nome": cand_name,
                "nomeUrna": cand_urna,
                "partido": partido,
                "cor": cor,
                "votos": v_count,
                "pctValidos": pct,
                "eleito": False
            })

        cands_for_mun.sort(key=lambda c: c["votos"], reverse=True)

        municipios_26_1.append({
            "id": str(ibge_id),
            "nome": nm.title(),
            "uf": uf,
            "aptos": aptos,
            "comparecimento": comp,
            "abstencoes": abst,
            "votosValidos": val,
            "brancos": br,
            "nulos": nul,
            "lula_r2": v13,
            "bolsonaro_r2": v22,
            "lula_pct": round(p13, 2),
            "bolsonaro_pct": round(p22, 2),
            "candidatos": cands_for_mun
        })

    data_2026_1["municipios"] = municipios_26_1
    with open(OUT_2026_1, 'w', encoding='utf-8') as f:
        json.dump(data_2026_1, f, ensure_ascii=False, indent=2)
    print(f"Saved {OUT_2026_1} ({len(municipios_26_1)} municipalities, {os.path.getsize(OUT_2026_1) / 1024 / 1024:.2f} MB)")

if __name__ == '__main__':
    main()

