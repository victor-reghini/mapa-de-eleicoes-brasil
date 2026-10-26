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

    conn.close()
    print(f"\n[OK] Seed de testes concluído com sucesso! ({count} eleições sincronizadas)")


if __name__ == "__main__":
    main()
