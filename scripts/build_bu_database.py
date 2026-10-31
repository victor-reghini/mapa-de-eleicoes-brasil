#!/usr/bin/env python3
"""
Constrói o banco analítico SQLite `data/bu_presidente.db` a partir dos 224 pacotes
oficiais de Boletins de Urna (`dados_tse/boletins_urna/{ano}/bweb_*.zip`) das
eleições presidenciais de 2014, 2018, 2022 e 2026 (1º e 2º turnos, 27 UFs + ZZ).

Gera tabelas com esquema métrico uniforme em 5 níveis:
- `bu_secao`: boletins de urna individuais por seção eleitoral (~3,8M registros)
- `bu_local`: consolidado por local de votação
- `bu_zona`: consolidado por zona eleitoral
- `bu_municipio`: consolidado por município / cidade no exterior
- `bu_uf`: consolidado por UF + ZZ
- `bu_candidatos`: catálogo oficial dos candidatos votados em cada ano/turno
"""

import concurrent.futures
import csv
import json
import os
import re
import sqlite3
import sys
import time
import zipfile
from pathlib import Path

COLS_2014 = [
    "DT_GERACAO", "HH_GERACAO", "CD_PLEITO", "CD_ELEICAO", "SG_UF",
    "CD_CARGO_PERGUNTA", "DS_CARGO_PERGUNTA", "NR_ZONA", "NR_SECAO",
    "NR_LOCAL_VOTACAO", "NR_PARTIDO", "SG_PARTIDO", "CD_MUNICIPIO",
    "NM_MUNICIPIO", "DT_BU_RECEBIDO", "QT_APTOS", "QT_ABSTENCOES",
    "QT_COMPARECIMENTO", "CD_TIPO_ELEICAO", "CD_TIPO_URNA", "DS_TIPO_URNA",
    "NR_VOTAVEL", "NM_VOTAVEL", "QT_VOTOS", "CD_TIPO_VOTAVEL",
    "NR_URNA_EFETIVADA", "CD_CARGA_1_URNA_EFETIVADA",
    "CD_CARGA_2_URNA_EFETIVADA", "DT_CARGA_URNA_EFETIVADA",
    "CD_FLASHCARD_URNA_EFETIVADA", "DS_CARGO_PERGUNTA_SECAO"
]

TRACKED_NUMBERS = (13, 22, 17, 45, 12, 15, 40, 30, 55, 70, 14)


def clean_str(val: str) -> str:
    if not val:
        return ""
    v = val.strip()
    return "" if v in ("#NULO#", "#NE#", "-1", "-3") else v


def clean_int(val: str, default: int = 0) -> int:
    if not val:
        return default
    v = val.strip()
    if v in ("#NULO#", "#NE#", "-1", "-3", ""):
        return default
    try:
        return int(v)
    except ValueError:
        return default


def compute_vote_metrics(
    aptos: int,
    comp: int,
    abst: int,
    biom: int,
    brancos: int,
    nulos: int,
    cands: dict[int, int],
    cand_totals: dict[int, dict]
) -> tuple:
    validos = sum(cands.values())
    total_votos = validos + brancos + nulos

    pct_comp = round(comp * 100.0 / aptos, 2) if aptos > 0 else 0.0
    pct_abst = round(abst * 100.0 / aptos, 2) if aptos > 0 else 0.0
    pct_val = round(validos * 100.0 / total_votos, 2) if total_votos > 0 else 0.0
    pct_bra = round(brancos * 100.0 / total_votos, 2) if total_votos > 0 else 0.0
    pct_nul = round(nulos * 100.0 / total_votos, 2) if total_votos > 0 else 0.0

    ranked = sorted(cands.items(), key=lambda kv: (-kv[1], kv[0]))
    if ranked:
        v1_nr, v1_votos = ranked[0]
        v1_info = cand_totals.get(v1_nr, {"nome": str(v1_nr), "partido": ""})
        v1_nome, v1_part = v1_info["nome"], v1_info["partido"]
        v1_pct = round(v1_votos * 100.0 / validos, 2) if validos > 0 else 0.0
    else:
        v1_nr, v1_nome, v1_part, v1_votos, v1_pct = 0, "", "", 0, 0.0

    if len(ranked) > 1:
        v2_nr, v2_votos = ranked[1]
        v2_info = cand_totals.get(v2_nr, {"nome": str(v2_nr), "partido": ""})
        v2_nome, v2_part = v2_info["nome"], v2_info["partido"]
        v2_pct = round(v2_votos * 100.0 / validos, 2) if validos > 0 else 0.0
    else:
        v2_nr, v2_nome, v2_part, v2_votos, v2_pct = 0, "", "", 0, 0.0

    margem_votos = v1_votos - v2_votos
    margem_pct = round(v1_pct - v2_pct, 2)

    tracked: list = []
    for num in TRACKED_NUMBERS:
        vv = cands.get(num, 0)
        vp = round(vv * 100.0 / validos, 2) if validos > 0 else 0.0
        tracked.append(vv)
        tracked.append(vp)

    votos_json = json.dumps({str(k): v for k, v in cands.items()}, separators=(",", ":"))

    return (
        aptos, comp, abst, pct_comp, pct_abst, biom,
        validos, brancos, nulos, total_votos, pct_val, pct_bra, pct_nul,
        v1_nr, v1_nome, v1_part, v1_votos, v1_pct,
        v2_nr, v2_nome, v2_part, v2_votos, v2_pct,
        margem_votos, margem_pct,
        *tracked,
        votos_json,
    )


def new_bucket(nm_mun: str = "") -> dict:
    return {
        "nm_mun": nm_mun,
        "secoes": 0,
        "zonas": set(),
        "locais": set(),
        "muns": set(),
        "aptos": 0,
        "comp": 0,
        "abst": 0,
        "biom": 0,
        "brancos": 0,
        "nulos": 0,
        "cands": {},
    }


def accum_bucket(b: dict, sec: dict, cd_mun: int, nr_zona: int, nr_local: int) -> None:
    b["secoes"] += 1
    b["zonas"].add(nr_zona)
    b["locais"].add((nr_zona, nr_local))
    b["muns"].add(cd_mun)
    if not b["nm_mun"] and sec["nm_mun"]:
        b["nm_mun"] = sec["nm_mun"]
    b["aptos"] += sec["aptos"]
    b["comp"] += sec["comp"]
    b["abst"] += sec["abst"]
    b["biom"] += sec["biom"]
    b["brancos"] += sec["brancos"]
    b["nulos"] += sec["nulos"]
    bc = b["cands"]
    for k, v in sec["cands"].items():
        bc[k] = bc.get(k, 0) + v


def parse_zip_file(task: tuple[int, int, str, str]) -> dict:
    ano, turno, uf_hint, zip_path_str = task
    zip_path = Path(zip_path_str)
    sections: dict[tuple[str, int, int, int], dict] = {}
    cand_totals: dict[int, dict] = {}

    with zipfile.ZipFile(zip_path, "r") as zf:
        data_files = [
            n for n in zf.namelist()
            if n.lower().endswith(".csv") or n.lower().endswith(".txt")
        ]
        if not data_files:
            return {"ano": ano, "turno": turno, "uf": uf_hint, "secoes": [], "locais": [], "zonas": [], "muns": [], "ufs": [], "cands": {}}

        with zf.open(data_files[0], "r") as raw_f:
            first_bytes = raw_f.readline()
            if not first_bytes:
                return {"ano": ano, "turno": turno, "uf": uf_hint, "secoes": [], "locais": [], "zonas": [], "muns": [], "ufs": [], "cands": {}}
            first_str = first_bytes.decode("latin1")
            first_cols = next(csv.reader([first_str], delimiter=";"))

            has_header = first_cols[0].strip().upper() == "DT_GERACAO"
            if has_header:
                headers = [c.strip().upper().replace("SG_ UF", "SG_UF") for c in first_cols]
                idx = {name: i for i, name in enumerate(headers)}
                pending_first = None
            else:
                idx = {name: i for i, name in enumerate(COLS_2014)}
                pending_first = first_cols

            i_cargo = idx["CD_CARGO_PERGUNTA"]
            i_uf = idx["SG_UF"]
            i_cd_mun = idx["CD_MUNICIPIO"]
            i_nm_mun = idx["NM_MUNICIPIO"]
            i_zona = idx["NR_ZONA"]
            i_secao = idx["NR_SECAO"]
            i_local = idx["NR_LOCAL_VOTACAO"]
            i_aptos = idx["QT_APTOS"]
            i_comp = idx["QT_COMPARECIMENTO"]
            i_abst = idx["QT_ABSTENCOES"]
            i_biom = idx.get("QT_ELEI_BIOM_SEM_HABILITACAO", idx.get("QT_ELEITORES_BIOMETRIA_NH"))
            i_tp_vot = idx["CD_TIPO_VOTAVEL"]
            i_nr_vot = idx["NR_VOTAVEL"]
            i_nm_vot = idx["NM_VOTAVEL"]
            i_partido = idx["SG_PARTIDO"]
            i_qt_votos = idx["QT_VOTOS"]
            i_urna = idx["NR_URNA_EFETIVADA"]
            i_ds_urna = idx["DS_TIPO_URNA"]
            i_flash = idx.get("CD_FLASHCARD_URNA_EFETIVADA", idx.get("CD_FLASCARD_URNA_EFETIVADA"))
            i_carga1 = idx.get("CD_CARGA_1_URNA_EFETIVADA")
            i_dt_carga = idx.get("DT_CARGA_URNA_EFETIVADA")
            i_agreg = idx.get("DS_SECOES_AGREGADAS", idx.get("DS_AGREGADAS"))
            i_abert = idx.get("DT_ABERTURA")
            i_encerr = idx.get("DT_ENCERRAMENTO")
            i_emissao = idx.get("DT_EMISSAO_BU")
            i_receb = idx.get("DT_BU_RECEBIDO")

            def process_row(row: list[str]) -> None:
                if len(row) <= i_qt_votos or row[i_cargo] != "1":
                    return
                sg_uf = row[i_uf].strip() or uf_hint
                cd_mun = clean_int(row[i_cd_mun])
                nr_zona = clean_int(row[i_zona])
                nr_secao = clean_int(row[i_secao])
                key = (sg_uf, cd_mun, nr_zona, nr_secao)

                sec = sections.get(key)
                if sec is None:
                    sec = {
                        "nm_mun": row[i_nm_mun].strip(),
                        "local": clean_int(row[i_local]),
                        "agreg": clean_str(row[i_agreg]) if i_agreg is not None else "",
                        "aptos": clean_int(row[i_aptos]),
                        "comp": clean_int(row[i_comp]),
                        "abst": clean_int(row[i_abst]),
                        "biom": clean_int(row[i_biom]) if i_biom is not None else 0,
                        "urna": clean_int(row[i_urna]),
                        "ds_urna": clean_str(row[i_ds_urna]),
                        "flash": clean_str(row[i_flash]) if i_flash is not None else "",
                        "carga1": clean_str(row[i_carga1]) if i_carga1 is not None else "",
                        "dt_carga": clean_str(row[i_dt_carga]) if i_dt_carga is not None else "",
                        "dt_abert": clean_str(row[i_abert]) if i_abert is not None else "",
                        "dt_encerr": clean_str(row[i_encerr]) if i_encerr is not None else "",
                        "dt_emissao": clean_str(row[i_emissao]) if i_emissao is not None else "",
                        "dt_receb": clean_str(row[i_receb]) if i_receb is not None else "",
                        "brancos": 0,
                        "nulos": 0,
                        "cands": {},
                    }
                    sections[key] = sec

                tp_vot = row[i_tp_vot].strip()
                nr_vot = clean_int(row[i_nr_vot])
                qt_votos = clean_int(row[i_qt_votos])

                if tp_vot == "2" or nr_vot == 95:
                    sec["brancos"] += qt_votos
                elif tp_vot == "3" or nr_vot == 96:
                    sec["nulos"] += qt_votos
                elif tp_vot == "1" and nr_vot not in (95, 96, 97):
                    sec["cands"][nr_vot] = sec["cands"].get(nr_vot, 0) + qt_votos
                    nm_vot = clean_str(row[i_nm_vot])
                    sg_part = clean_str(row[i_partido])
                    cinfo = cand_totals.get(nr_vot)
                    if cinfo is None:
                        cand_totals[nr_vot] = {"nome": nm_vot, "partido": sg_part, "votos": qt_votos}
                    else:
                        cinfo["votos"] += qt_votos
                        if not cinfo["nome"] and nm_vot:
                            cinfo["nome"] = nm_vot
                        if not cinfo["partido"] and sg_part:
                            cinfo["partido"] = sg_part

            if pending_first is not None:
                process_row(pending_first)

            filtered_lines = (
                ln.decode("latin1")
                for ln in raw_f
                if b"residente" in ln or b"RESIDENTE" in ln
            )
            for row in csv.reader(filtered_lines, delimiter=";"):
                process_row(row)

    sec_rows: list[tuple] = []
    by_local: dict[tuple[str, int, int, int], dict] = {}
    by_zona: dict[tuple[str, int, int], dict] = {}
    by_mun: dict[tuple[str, int], dict] = {}
    by_uf: dict[str, dict] = {}

    for (sg_uf, cd_mun, nr_zona, nr_secao), sec in sections.items():
        nr_local = sec["local"]
        metrics = compute_vote_metrics(
            sec["aptos"], sec["comp"], sec["abst"], sec["biom"],
            sec["brancos"], sec["nulos"], sec["cands"], cand_totals
        )
        sec_rows.append((
            ano, turno, sg_uf, cd_mun, sec["nm_mun"], nr_zona, nr_secao,
            nr_local, sec["agreg"],
            *metrics,
            sec["urna"], sec["ds_urna"], sec["flash"], sec["carga1"],
            sec["dt_carga"], sec["dt_abert"], sec["dt_encerr"],
            sec["dt_emissao"], sec["dt_receb"]
        ))

        l_key = (sg_uf, cd_mun, nr_zona, nr_local)
        if l_key not in by_local:
            by_local[l_key] = new_bucket(sec["nm_mun"])
        accum_bucket(by_local[l_key], sec, cd_mun, nr_zona, nr_local)

        z_key = (sg_uf, cd_mun, nr_zona)
        if z_key not in by_zona:
            by_zona[z_key] = new_bucket(sec["nm_mun"])
        accum_bucket(by_zona[z_key], sec, cd_mun, nr_zona, nr_local)

        m_key = (sg_uf, cd_mun)
        if m_key not in by_mun:
            by_mun[m_key] = new_bucket(sec["nm_mun"])
        accum_bucket(by_mun[m_key], sec, cd_mun, nr_zona, nr_local)

        if sg_uf not in by_uf:
            by_uf[sg_uf] = new_bucket()
        accum_bucket(by_uf[sg_uf], sec, cd_mun, nr_zona, nr_local)

    local_rows = [
        (ano, turno, uf, cd_mun, b["nm_mun"], nr_zona, nr_local, b["secoes"],
         *compute_vote_metrics(b["aptos"], b["comp"], b["abst"], b["biom"], b["brancos"], b["nulos"], b["cands"], cand_totals))
        for (uf, cd_mun, nr_zona, nr_local), b in by_local.items()
    ]
    zona_rows = [
        (ano, turno, uf, cd_mun, b["nm_mun"], nr_zona, len(b["locais"]), b["secoes"],
         *compute_vote_metrics(b["aptos"], b["comp"], b["abst"], b["biom"], b["brancos"], b["nulos"], b["cands"], cand_totals))
        for (uf, cd_mun, nr_zona), b in by_zona.items()
    ]
    mun_rows = [
        (ano, turno, uf, cd_mun, b["nm_mun"], len(b["zonas"]), len(b["locais"]), b["secoes"],
         *compute_vote_metrics(b["aptos"], b["comp"], b["abst"], b["biom"], b["brancos"], b["nulos"], b["cands"], cand_totals))
        for (uf, cd_mun), b in by_mun.items()
    ]
    uf_rows = [
        (ano, turno, uf, len(b["muns"]), len(b["zonas"]), len(b["locais"]), b["secoes"],
         *compute_vote_metrics(b["aptos"], b["comp"], b["abst"], b["biom"], b["brancos"], b["nulos"], b["cands"], cand_totals))
        for uf, b in by_uf.items()
    ]

    return {
        "ano": ano,
        "turno": turno,
        "uf": uf_hint,
        "secoes": sec_rows,
        "locais": local_rows,
        "zonas": zona_rows,
        "muns": mun_rows,
        "ufs": uf_rows,
        "cands": cand_totals,
    }


METRIC_COLS_DDL = """
    qt_aptos INTEGER NOT NULL,
    qt_comparecimento INTEGER NOT NULL,
    qt_abstencoes INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    pct_abstencoes REAL NOT NULL,
    qt_biometria_nh INTEGER NOT NULL,
    qt_votos_validos INTEGER NOT NULL,
    qt_brancos INTEGER NOT NULL,
    qt_nulos INTEGER NOT NULL,
    qt_total_votos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    pct_brancos REAL NOT NULL,
    pct_nulos REAL NOT NULL,
    vencedor_nr INTEGER NOT NULL,
    vencedor_nome TEXT NOT NULL,
    vencedor_partido TEXT NOT NULL,
    vencedor_votos INTEGER NOT NULL,
    vencedor_pct REAL NOT NULL,
    segundo_nr INTEGER NOT NULL,
    segundo_nome TEXT NOT NULL,
    segundo_partido TEXT NOT NULL,
    segundo_votos INTEGER NOT NULL,
    segundo_pct REAL NOT NULL,
    margem_votos INTEGER NOT NULL,
    margem_pct REAL NOT NULL,
    votos_13 INTEGER NOT NULL, pct_13 REAL NOT NULL,
    votos_22 INTEGER NOT NULL, pct_22 REAL NOT NULL,
    votos_17 INTEGER NOT NULL, pct_17 REAL NOT NULL,
    votos_45 INTEGER NOT NULL, pct_45 REAL NOT NULL,
    votos_12 INTEGER NOT NULL, pct_12 REAL NOT NULL,
    votos_15 INTEGER NOT NULL, pct_15 REAL NOT NULL,
    votos_40 INTEGER NOT NULL, pct_40 REAL NOT NULL,
    votos_30 INTEGER NOT NULL, pct_30 REAL NOT NULL,
    votos_55 INTEGER NOT NULL, pct_55 REAL NOT NULL,
    votos_70 INTEGER NOT NULL, pct_70 REAL NOT NULL,
    votos_14 INTEGER NOT NULL, pct_14 REAL NOT NULL,
    votos_json TEXT NOT NULL
"""

DDL_SCHEMA = f"""
CREATE TABLE bu_secao (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    nr_zona INTEGER NOT NULL,
    nr_secao INTEGER NOT NULL,
    nr_local_votacao INTEGER NOT NULL,
    ds_secoes_agregadas TEXT NOT NULL,
    {METRIC_COLS_DDL},
    nr_urna_efetivada INTEGER NOT NULL,
    ds_tipo_urna TEXT NOT NULL,
    cd_flashcard TEXT NOT NULL,
    cd_carga_1 TEXT NOT NULL,
    dt_carga_urna TEXT NOT NULL,
    dt_abertura TEXT NOT NULL,
    dt_encerramento TEXT NOT NULL,
    dt_emissao_bu TEXT NOT NULL,
    dt_bu_recebido TEXT NOT NULL,
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio, nr_zona, nr_secao)
) WITHOUT ROWID;

CREATE TABLE bu_local (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    nr_zona INTEGER NOT NULL,
    nr_local_votacao INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    {METRIC_COLS_DDL},
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio, nr_zona, nr_local_votacao)
) WITHOUT ROWID;

CREATE TABLE bu_zona (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    nr_zona INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    {METRIC_COLS_DDL},
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio, nr_zona)
) WITHOUT ROWID;

CREATE TABLE bu_municipio (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    qt_zonas INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    {METRIC_COLS_DDL},
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio)
) WITHOUT ROWID;

CREATE TABLE bu_uf (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    qt_municipios INTEGER NOT NULL,
    qt_zonas INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    {METRIC_COLS_DDL},
    PRIMARY KEY (ano, turno, sg_uf)
) WITHOUT ROWID;

CREATE TABLE bu_candidatos (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    nr_votavel INTEGER NOT NULL,
    nm_votavel TEXT NOT NULL,
    sg_partido TEXT NOT NULL,
    qt_votos INTEGER NOT NULL,
    PRIMARY KEY (ano, turno, nr_votavel)
);
"""


def export_static_fallbacks(conn: sqlite3.Connection, pub_dir: Path) -> None:
    pub_dir.mkdir(parents=True, exist_ok=True)
    conn.row_factory = sqlite3.Row

    cands_rows = conn.execute(
        "SELECT ano, turno, nr_votavel, nm_votavel, sg_partido, qt_votos "
        "FROM bu_candidatos ORDER BY ano DESC, turno ASC, qt_votos DESC"
    ).fetchall()

    rounds_rows = conn.execute("""
        SELECT ano, turno,
               SUM(qt_secoes) AS total_secoes,
               SUM(qt_municipios) AS total_municipios,
               SUM(qt_zonas) AS total_zonas,
               SUM(qt_locais) AS total_locais,
               SUM(qt_aptos) AS qt_aptos,
               SUM(qt_comparecimento) AS qt_comparecimento,
               SUM(qt_abstencoes) AS qt_abstencoes,
               SUM(qt_votos_validos) AS qt_votos_validos,
               SUM(qt_brancos) AS qt_brancos,
               SUM(qt_nulos) AS qt_nulos
        FROM bu_uf
        GROUP BY ano, turno
        ORDER BY ano DESC, turno ASC
    """).fetchall()

    cands_by_round: dict[str, list[dict]] = {}
    for r in cands_rows:
        key = f"{r['ano']}_{r['turno']}"
        cands_by_round.setdefault(key, []).append({
            "numero": r["nr_votavel"],
            "nome": r["nm_votavel"],
            "partido": r["sg_partido"],
            "votos": r["qt_votos"],
        })

    meta = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rounds": [
            {
                "key": f"{r['ano']}_{r['turno']}",
                "ano": r["ano"],
                "turno": r["turno"],
                "totalSecoes": r["total_secoes"],
                "totalMunicipios": r["total_municipios"],
                "totalZonas": r["total_zonas"],
                "totalLocais": r["total_locais"],
                "aptos": r["qt_aptos"],
                "comparecimento": r["qt_comparecimento"],
                "abstencoes": r["qt_abstencoes"],
                "validos": r["qt_votos_validos"],
                "brancos": r["qt_brancos"],
                "nulos": r["qt_nulos"],
                "candidatos": cands_by_round.get(f"{r['ano']}_{r['turno']}", []),
            }
            for r in rounds_rows
        ],
    }
    (pub_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    uf_rows = [dict(r) for r in conn.execute("SELECT * FROM bu_uf ORDER BY ano DESC, turno ASC, sg_uf ASC").fetchall()]
    (pub_dir / "uf_summary.json").write_text(json.dumps(uf_rows, ensure_ascii=False), encoding="utf-8")
    print(f"Exportados metadados e resumo UF em {pub_dir}")


PREPROCESSED_COLS = [
    ("dif_finalistas_votos", "INTEGER"),
    ("dif_finalistas_pct", "REAL"),
    ("dif_turno_comparecimento", "INTEGER"),
    ("dif_turno_pct_comparecimento", "REAL"),
    ("dif_turno_validos", "INTEGER"),
    ("dif_turno_abstencoes", "INTEGER"),
    ("dif_turno_brancos_nulos", "INTEGER"),
    ("dif_turno_cand1_votos", "INTEGER"),
    ("dif_turno_cand1_pct", "REAL"),
    ("dif_turno_cand2_votos", "INTEGER"),
    ("dif_turno_cand2_pct", "REAL"),
    ("dif_turno_saldo_finalistas", "INTEGER"),
]

FINALISTS_BY_YEAR: dict[int, tuple[int, int]] = {
    2026: (13, 22),
    2022: (13, 22),
    2018: (17, 13),
    2014: (13, 45),
}

LEVEL_KEYS: dict[str, list[str]] = {
    "bu_uf": ["sg_uf"],
    "bu_municipio": ["sg_uf", "cd_municipio"],
    "bu_zona": ["sg_uf", "cd_municipio", "nr_zona"],
    "bu_local": ["sg_uf", "cd_municipio", "nr_zona", "nr_local_votacao"],
    "bu_secao": ["sg_uf", "cd_municipio", "nr_zona", "nr_secao"],
}


def enrich_preprocessed_columns(conn: sqlite3.Connection) -> None:
    print("Calculando colunas pré-processadas (diferença entre candidatos e entre turnos)...")
    t_start = time.time()
    for table, keys in LEVEL_KEYS.items():
        existing = {r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}
        for col_name, col_type in PREPROCESSED_COLS:
            if col_name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")

        join_cond = " AND ".join(f"{table}.{k} = other.{k}" for k in keys)
        for ano, (c1, c2) in FINALISTS_BY_YEAR.items():
            with conn:
                conn.execute(
                    f"""
                    UPDATE {table}
                    SET dif_finalistas_votos = (votos_{c1} - votos_{c2}),
                        dif_finalistas_pct = ROUND(pct_{c1} - pct_{c2}, 2)
                    WHERE ano = ?
                    """,
                    (ano,),
                )
                # Para linhas do 2º turno: (self [2ºT] - other [1ºT])
                conn.execute(
                    f"""
                    UPDATE {table}
                    SET dif_turno_comparecimento = ({table}.qt_comparecimento - other.qt_comparecimento),
                        dif_turno_pct_comparecimento = ROUND({table}.pct_comparecimento - other.pct_comparecimento, 2),
                        dif_turno_validos = ({table}.qt_votos_validos - other.qt_votos_validos),
                        dif_turno_abstencoes = ({table}.qt_abstencoes - other.qt_abstencoes),
                        dif_turno_brancos_nulos = (({table}.qt_brancos + {table}.qt_nulos) - (other.qt_brancos + other.qt_nulos)),
                        dif_turno_cand1_votos = ({table}.votos_{c1} - other.votos_{c1}),
                        dif_turno_cand1_pct = ROUND({table}.pct_{c1} - other.pct_{c1}, 2),
                        dif_turno_cand2_votos = ({table}.votos_{c2} - other.votos_{c2}),
                        dif_turno_cand2_pct = ROUND({table}.pct_{c2} - other.pct_{c2}, 2),
                        dif_turno_saldo_finalistas = (({table}.votos_{c1} - {table}.votos_{c2}) - (other.votos_{c1} - other.votos_{c2}))
                    FROM {table} AS other
                    WHERE {table}.ano = ? AND {table}.turno = 2
                      AND other.ano = ? AND other.turno = 1
                      AND {join_cond}
                    """,
                    (ano, ano),
                )
                # Para linhas do 1º turno: espelha a mesma variação (other [2ºT] - self [1ºT])
                conn.execute(
                    f"""
                    UPDATE {table}
                    SET dif_turno_comparecimento = (other.qt_comparecimento - {table}.qt_comparecimento),
                        dif_turno_pct_comparecimento = ROUND(other.pct_comparecimento - {table}.pct_comparecimento, 2),
                        dif_turno_validos = (other.qt_votos_validos - {table}.qt_votos_validos),
                        dif_turno_abstencoes = (other.qt_abstencoes - {table}.qt_abstencoes),
                        dif_turno_brancos_nulos = ((other.qt_brancos + other.qt_nulos) - ({table}.qt_brancos + {table}.qt_nulos)),
                        dif_turno_cand1_votos = (other.votos_{c1} - {table}.votos_{c1}),
                        dif_turno_cand1_pct = ROUND(other.pct_{c1} - {table}.pct_{c1}, 2),
                        dif_turno_cand2_votos = (other.votos_{c2} - {table}.votos_{c2}),
                        dif_turno_cand2_pct = ROUND(other.pct_{c2} - {table}.pct_{c2}, 2),
                        dif_turno_saldo_finalistas = ((other.votos_{c1} - other.votos_{c2}) - ({table}.votos_{c1} - {table}.votos_{c2}))
                    FROM {table} AS other
                    WHERE {table}.ano = ? AND {table}.turno = 1
                      AND other.ano = ? AND other.turno = 2
                      AND {join_cond}
                    """,
                    (ano, ano),
                )
        print(f"  - {table} enriquecida ({time.time() - t_start:.1f}s)")


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    bu_root = repo_root / "dados_tse" / "boletins_urna"
    db_path = repo_root / "data" / "bu_presidente.db"
    tmp_db_path = repo_root / "data" / "bu_presidente.building.db"
    pub_bu_dir = repo_root / "public" / "data" / "bu"

    if "--enrich-only" in sys.argv:
        if not db_path.exists():
            print(f"Erro: {db_path} não encontrado.", file=sys.stderr)
            return 1
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA cache_size = -500000;")
        conn.execute("PRAGMA temp_store = MEMORY;")
        enrich_preprocessed_columns(conn)
        export_static_fallbacks(conn, pub_bu_dir)
        conn.execute("ANALYZE;")
        conn.close()
        return 0

    tasks: list[tuple[int, int, str, str]] = []
    for year_dir in sorted(bu_root.glob("*"), reverse=True):
        if not year_dir.is_dir() or not year_dir.name.isdigit():
            continue
        ano = int(year_dir.name)
        for zf in sorted(year_dir.glob("*.zip")):
            fn_low = zf.name.lower()
            turno = 1 if "_1t_" in fn_low else (2 if "_2t_" in fn_low else 0)
            m = re.search(r"_([a-z]{2})_", fn_low)
            uf = m.group(1).upper() if m else "BR"
            if turno in (1, 2):
                tasks.append((ano, turno, uf, str(zf)))

    if not tasks:
        print("Nenhum arquivo ZIP de Boletim de Urna encontrado em dados_tse/boletins_urna/.")
        return 1

    print(f"Iniciando indexação de {len(tasks)} pacotes de Boletins de Urna em paralelo...")
    t0 = time.time()

    tmp_db_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_db_path.unlink(missing_ok=True)

    conn = sqlite3.connect(str(tmp_db_path))
    conn.executescript("""
        PRAGMA journal_mode = OFF;
        PRAGMA synchronous = OFF;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -500000;
        PRAGMA page_size = 8192;
    """)
    conn.executescript(DDL_SCHEMA)

    sql_sec = f"INSERT OR REPLACE INTO bu_secao VALUES ({','.join(['?'] * 66)})"
    sql_loc = f"INSERT OR REPLACE INTO bu_local VALUES ({','.join(['?'] * 56)})"
    sql_zon = f"INSERT OR REPLACE INTO bu_zona VALUES ({','.join(['?'] * 56)})"
    sql_mun = f"INSERT OR REPLACE INTO bu_municipio VALUES ({','.join(['?'] * 56)})"
    sql_uf = f"INSERT OR REPLACE INTO bu_uf VALUES ({','.join(['?'] * 55)})"

    global_cands: dict[tuple[int, int, int], dict] = {}
    total_sections = 0

    workers = min(8, os.cpu_count() or 4)
    with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as pool:
        done = 0
        for res in pool.map(parse_zip_file, tasks, chunksize=1):
            done += 1
            ano, turno = res["ano"], res["turno"]
            with conn:
                if res["secoes"]:
                    conn.executemany(sql_sec, res["secoes"])
                if res["locais"]:
                    conn.executemany(sql_loc, res["locais"])
                if res["zonas"]:
                    conn.executemany(sql_zon, res["zonas"])
                if res["muns"]:
                    conn.executemany(sql_mun, res["muns"])
                if res["ufs"]:
                    conn.executemany(sql_uf, res["ufs"])
            total_sections += len(res["secoes"])

            for nr_vot, info in res["cands"].items():
                ckey = (ano, turno, nr_vot)
                cur = global_cands.get(ckey)
                if cur is None:
                    global_cands[ckey] = dict(info)
                else:
                    cur["votos"] += info["votos"]
                    if not cur["nome"] and info["nome"]:
                        cur["nome"] = info["nome"]
                    if not cur["partido"] and info["partido"]:
                        cur["partido"] = info["partido"]

            if done % 20 == 0 or done == len(tasks):
                elapsed = max(0.1, time.time() - t0)
                print(f"[{done}/{len(tasks)}] {total_sections:,} boletins de seção indexados ({elapsed:.1f}s)")

    cand_rows = [
        (ano, turno, nr, info["nome"], info["partido"], info["votos"])
        for (ano, turno, nr), info in global_cands.items()
    ]
    with conn:
        conn.executemany("INSERT OR REPLACE INTO bu_candidatos VALUES (?,?,?,?,?,?)", cand_rows)

    print("Criando índices secundários de busca e ordenação...")
    conn.executescript("""
        CREATE INDEX idx_bu_secao_mun ON bu_secao (ano, turno, sg_uf, nm_municipio);
        CREATE INDEX idx_bu_secao_comp ON bu_secao (ano, turno, qt_comparecimento DESC);
        CREATE INDEX idx_bu_mun_nome ON bu_municipio (ano, turno, nm_municipio);
    """)

    enrich_preprocessed_columns(conn)
    export_static_fallbacks(conn, pub_bu_dir)
    conn.execute("ANALYZE;")
    conn.close()

    conn_wal = sqlite3.connect(str(tmp_db_path))
    conn_wal.execute("PRAGMA journal_mode = WAL;")
    conn_wal.close()

    tmp_db_path.replace(db_path)
    sz_mb = db_path.stat().st_size / (1024 * 1024)
    print(f"\nBanco `data/bu_presidente.db` pronto ({sz_mb:.1f} MB, {total_sections:,} boletins de urna) em {time.time() - t0:.1f}s!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
