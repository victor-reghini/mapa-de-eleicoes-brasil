#!/usr/bin/env python3
"""
Seed Test Data Script
=====================
Popula o banco de dados (PostgreSQL em Docker ou SQLite local) com dados de teste
estruturados a partir dos arquivos JSON já existentes em public/data/elections/
sem necessidade de baixar gigabytes de datasets brutos do TSE.
"""

import json
import os
import sys
from pathlib import Path
from db_connector import get_connection, is_postgres, init_schema

ELECTIONS_DIR = Path("public/data/elections")


def seed_election_from_json(json_path: Path, conn):
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    ano = data.get("ano")
    cargo = data.get("cargo", "PRESIDENTE")
    turno = data.get("turno", 1)
    eleicao_id = f"{ano}_{cargo}"
    titulo = data.get("titulo", f"Eleição {cargo} {ano}")
    data_eleicao = data.get("data")
    is_pg = is_postgres()
    param = "%s" if is_pg else "?"

    cursor = conn.cursor()

    # 1. Inserir eleicao
    sql_eleicao = f"""
    INSERT INTO eleicoes (id, ano, cargo, titulo, data_1t, tem_segundo_turno, status)
    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})
    ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo;
    """
    cursor.execute(sql_eleicao, (eleicao_id, ano, cargo, titulo, data_eleicao, 1 if turno == 2 else 0, "OFICIAL"))

    # 2. Inserir totalizacao nacional se presente
    br = data.get("brasil")
    if br:
        cands = br.get("candidatos", [])
        sql_totais = f"""
        INSERT INTO totalizacao_nacional (
            eleicao_id, turno, aptos, comparecimento, pct_comparecimento,
            abstencoes, pct_abstencoes, votos_validos, pct_validos,
            votos_brancos, pct_brancos, votos_nulos, pct_nulos, pct_secoes_apuradas
        ) VALUES (
            {param}, {param}, {param}, {param}, {param},
            {param}, {param}, {param}, {param},
            {param}, {param}, {param}, {param}, {param}
        ) ON CONFLICT (eleicao_id, turno) DO UPDATE SET
            votos_validos = EXCLUDED.votos_validos,
            pct_validos = EXCLUDED.pct_validos;
        """
        cursor.execute(sql_totais, (
            eleicao_id, turno,
            br.get("aptos", 0),
            br.get("comparecimento", 0),
            br.get("pctComparecimento", 0.0),
            br.get("abstencoes", 0),
            br.get("pctAbstencoes", 0.0),
            br.get("votosValidos", 0),
            br.get("pctValidos", 0.0),
            br.get("votosBrancos", 0),
            br.get("pctBrancos", 0.0),
            br.get("votosNulos", 0),
            br.get("pctNulos", 0.0),
            br.get("pctApuracao", 100.0)
        ))

        # 3. Inserir candidatos
        for c in cands:
            sql_cand = f"""
            INSERT INTO candidatos (
                eleicao_id, turno, numero, nome, nome_urna, partido, sigla_partido, coligacao, cor_hex, situacao
            ) VALUES (
                {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}
            ) ON CONFLICT (eleicao_id, turno, numero) DO UPDATE SET
                nome_urna = EXCLUDED.nome_urna,
                cor_hex = EXCLUDED.cor_hex;
            """
            cursor.execute(sql_cand, (
                eleicao_id, turno,
                str(c.get("numero")),
                c.get("nome", c.get("nomeUrna")),
                c.get("nomeUrna", c.get("nome")),
                c.get("partido", ""),
                c.get("partido", ""),
                c.get("coligacao", ""),
                c.get("cor", "#6b7280"),
                "ELEITO" if c.get("eleito") else "REGISTRADO"
            ))

    # 4. Inserir estados
    estados = data.get("estados", {})
    for uf, est_data in estados.items():
        sql_est = f"""
        INSERT INTO totalizacao_estados (
            eleicao_id, turno, sg_uf, aptos, comparecimento, pct_comparecimento,
            abstencoes, votos_validos, votos_brancos, votos_nulos
        ) VALUES (
            {param}, {param}, {param}, {param}, {param}, {param},
            {param}, {param}, {param}, {param}
        ) ON CONFLICT (eleicao_id, turno, sg_uf) DO UPDATE SET
            votos_validos = EXCLUDED.votos_validos;
        """
        cursor.execute(sql_est, (
            eleicao_id, turno, uf,
            est_data.get("aptos", 0),
            est_data.get("comparecimento", 0),
            est_data.get("pctComparecimento", 0.0),
            est_data.get("abstencoes", 0),
            est_data.get("votosValidos", 0),
            est_data.get("votosBrancos", 0),
            est_data.get("votosNulos", 0)
        ))

    conn.commit()


def seed_municipalities_and_comparison(conn):
    mun_path = Path("public/geo/municipalities_index.json")
    if not mun_path.exists():
        print("[AVISO] Arquivo de municípios não encontrado.")
        return

    with open(mun_path, "r", encoding="utf-8") as f:
        muns = json.load(f)

    print(f"-> Populando {len(muns)} municípios e gerando dados comparativos A vs B...")
    cursor = conn.cursor()
    is_pg = is_postgres()
    param = "%s" if is_pg else "?"

    # 1. Inserir municípios
    sql_mun = f"""
    INSERT INTO municipios (cd_municipio_tse, cd_ibge, nm_municipio, sg_uf, latitude, longitude, total_eleitores)
    VALUES ({param}, {param}, {param}, {param}, {param}, {param}, {param})
    ON CONFLICT (cd_municipio_tse) DO UPDATE SET
        nm_municipio = EXCLUDED.nm_municipio,
        sg_uf = EXCLUDED.sg_uf;
    """
    mun_rows = [
        (m["id"], m["id"], m["name"], m["uf"], m.get("lat"), m.get("lon"), 25000)
        for m in muns
    ]
    cursor.executemany(sql_mun, mun_rows)

    # 2. Gerar votacao_municipio_comparada para 2026 Turno 2 (13 Lula vs 22 Flávio Bolsonaro)
    # Tendências históricas regionais reais para simulação calibrada
    norte_nordeste = {"MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA", "PA", "AM", "AP", "TO"}
    sul_centro_oeste = {"PR", "SC", "RS", "MS", "MT", "GO", "DF", "RO", "AC", "RR"}

    import random
    random.seed(2026)

    comp_rows = []
    vot_rows = []

    for m in muns:
        ibge = m["id"]
        uf = m["uf"]
        eleitores = 5000 + (hash(ibge) % 80000)
        comparecimento = int(eleitores * 0.81)

        # Determinar percentuais de voto com base na região
        if uf in norte_nordeste:
            pct_a = 58.0 + (hash(ibge) % 2500) / 100.0  # Lula 58% a 83%
        elif uf in sul_centro_oeste:
            pct_a = 32.0 + (hash(ibge) % 2000) / 100.0  # Lula 32% a 52%
        else: # Sudeste (SP, RJ, MG, ES)
            pct_a = 46.0 + (hash(ibge) % 1100) / 100.0  # Disputa acirrada 46% a 57%

        pct_a = max(20.0, min(88.0, round(pct_a, 2)))
        pct_b = round(100.0 - pct_a, 2)
        votos_a = int(comparecimento * (pct_a / 100.0))
        votos_b = comparecimento - votos_a
        margem = round(pct_a - pct_b, 2)
        lider = "13" if margem >= 0 else "22"

        comp_rows.append((
            "2026_PRESIDENTE", 2, ibge, ibge, uf,
            "13", "22", votos_a, votos_b, pct_a, pct_b, margem, lider
        ))

        vot_rows.append(("2026_PRESIDENTE", 2, ibge, "13", votos_a, pct_a))
        vot_rows.append(("2026_PRESIDENTE", 2, ibge, "22", votos_b, pct_b))

    sql_comp = f"""
    INSERT INTO votacao_municipio_comparada (
        eleicao_id, turno, cd_municipio_tse, cd_ibge, sg_uf,
        nr_cand_a, nr_cand_b, votos_cand_a, votos_cand_b,
        pct_cand_a, pct_cand_b, margem_pct, lider_numero
    ) VALUES (
        {param}, {param}, {param}, {param}, {param},
        {param}, {param}, {param}, {param},
        {param}, {param}, {param}, {param}
    ) ON CONFLICT (eleicao_id, turno, cd_municipio_tse, nr_cand_a, nr_cand_b) DO UPDATE SET
        margem_pct = EXCLUDED.margem_pct,
        lider_numero = EXCLUDED.lider_numero;
    """
    cursor.executemany(sql_comp, comp_rows)

    sql_vot = f"""
    INSERT INTO votacao_municipio (
        eleicao_id, turno, cd_municipio_tse, numero_candidato, votos, pct_votos
    ) VALUES ({param}, {param}, {param}, {param}, {param}, {param})
    ON CONFLICT (eleicao_id, turno, cd_municipio_tse, numero_candidato) DO UPDATE SET
        votos = EXCLUDED.votos,
        pct_votos = EXCLUDED.pct_votos;
    """
    cursor.executemany(sql_vot, vot_rows)

    conn.commit()
    print(f"[OK] {len(muns)} municípios e {len(comp_rows)} comparativos A vs B inseridos com sucesso!")


def main():
    print("=" * 60)
    print(" SEED TEST DATA - MAPA ELEITORAL BRASIL")
    print("=" * 60)

    init_schema(fresh=True)
    conn = get_connection()

    priority_files = [
        ELECTIONS_DIR / "2026_2.json",
        ELECTIONS_DIR / "2026_1.json",
        ELECTIONS_DIR / "2024_PREFEITO_2.json",
        ELECTIONS_DIR / "2024_PREFEITO_1.json",
        ELECTIONS_DIR / "2022_2.json",
        ELECTIONS_DIR / "2022_1.json",
    ]

    count = 0
    for p in priority_files:
        if p.exists():
            print(f"-> Populando a partir de: {p.name}")
            seed_election_from_json(p, conn)
            count += 1

    seed_municipalities_and_comparison(conn)

    conn.close()
    print(f"\n[OK] Seed de testes concluído com sucesso! ({count} eleições sincronizadas)")


if __name__ == "__main__":
    main()

