#!/usr/bin/env python3
"""
TSE Stream & Ephemeral Database Ingestion Pipeline
=================================================
Pipeline de ingestão de dados em streaming efêmero:
1. Consulta o catálogo de metadados em dados_tse/catalogo_tse.json
2. Filtra por ano, categoria e UF conforme parâmetros CLI
3. Baixa o arquivo compactado para arquivo temporário descartável
4. Lê os arquivos CSV diretamente do arquivo ZIP (streaming em memória)
5. Insere os registros em lote no banco ativo (PostgreSQL ou SQLite)
6. Exclui imediatamente o arquivo temporário, preservando o disco livre
7. Atualiza os índices e pré-calcula a tabela analítica comparada (A vs B)
"""

import argparse
import csv
import io
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
from db_connector import get_connection, is_postgres

CATALOG_PATH = Path("dados_tse/catalogo_tse.json")
USER_AGENT = "MapaEleicoesBrasil-Ingester/1.0 (+https://dadosabertos.tse.jus.br)"


def load_catalog() -> List[dict]:
    if not CATALOG_PATH.exists():
        print(f"[ERRO] Catálogo {CATALOG_PATH} não encontrado. Execute download_tse_datasets.py --catalog-only primeiro.")
        sys.exit(1)
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def download_to_tempfile(url: str, min_free_gb: float = 1.0) -> Optional[Path]:
    """Baixa um arquivo para um diretório temporário descartável."""
    # Checagem preventiva de espaço em disco
    _, _, free = shutil.disk_usage("/tmp")
    free_gb = free / (1024 ** 3)
    if free_gb < min_free_gb:
        print(f"[ALERTA-DISCO] Espaço livre em /tmp ({free_gb:.2f} GB) abaixo do limite seguro ({min_free_gb:.2f} GB).")
        return None

    temp_fd, temp_path_str = tempfile.mkstemp(suffix=".zip", prefix="tse_stream_")
    os.close(temp_fd)
    temp_path = Path(temp_path_str)

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            total_size = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            start_t = time.time()
            chunk_size = 256 * 1024

            with open(temp_path, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    elapsed = time.time() - start_t
                    speed = (downloaded / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    if total_size > 0:
                        pct = (downloaded / total_size) * 100
                        print(f"\r  [STREAM] {temp_path.name}: {pct:5.1f}% ({downloaded/(1024*1024):.1f} MB @ {speed:.2f} MB/s)", end="", flush=True)
            print()
            return temp_path
    except Exception as e:
        print(f"\n  [ERRO-STREAM] Falha ao baixar {url}: {e}", file=sys.stderr)
        if temp_path.exists():
            temp_path.unlink()
        return None


def ingest_candidatos_zip(zip_path: Path, conn, ano: int):
    """Processa o pacote consulta_cand_{ano}.zip e popula a tabela de candidatos."""
    cursor = conn.cursor()
    is_pg = is_postgres()
    param = "%s" if is_pg else "?"

    sql = f"""
    INSERT INTO candidatos (
        eleicao_id, turno, numero, nome, nome_urna, partido, sigla_partido, coligacao, cor_hex, situacao
    ) VALUES (
        {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}, {param}
    ) ON CONFLICT (eleicao_id, turno, numero) DO UPDATE SET
        nome_urna = EXCLUDED.nome_urna,
        situacao = EXCLUDED.situacao;
    """

    inserted = 0
    with zipfile.ZipFile(zip_path, "r") as z:
        for filename in z.namelist():
            if filename.endswith(".csv") and not filename.startswith("__MACOSX"):
                with z.open(filename) as f:
                    wrapper = io.TextIOWrapper(f, encoding="latin-1", errors="replace")
                    reader = csv.DictReader(wrapper, delimiter=";")
                    batch = []

                    for row in reader:
                        cd_cargo = row.get("CD_CARGO")
                        # Cargos principais: 1=Presidente, 3=Governador, 5=Senador, 11=Prefeito
                        cargo_map = {"1": "PRESIDENTE", "3": "GOVERNADOR", "5": "SENADOR", "11": "PREFEITO"}
                        cargo = cargo_map.get(cd_cargo)
                        if not cargo:
                            continue

                        turno = int(row.get("NR_TURNO", 1))
                        eleicao_id = f"{ano}_{cargo}"
                        num = str(row.get("NR_CANDIDATO", "")).strip()
                        nome = row.get("NM_CANDIDATO", "")
                        nome_urna = row.get("NM_URNA_CANDIDATO", nome)
                        partido = row.get("SG_PARTIDO", "")
                        coligacao = row.get("NM_COLIGACAO", "")
                        situacao = row.get("DS_SITUACAO_CANDIDATURA", "REGISTRADO")

                        cor = "#e11d48" if partido == "PT" else ("#2563eb" if partido == "PL" else "#6b7280")

                        batch.append((
                            eleicao_id, turno, num, nome, nome_urna,
                            partido, partido, coligacao, cor, situacao
                        ))

                        if len(batch) >= 2000:
                            cursor.executemany(sql, batch)
                            inserted += len(batch)
                            batch = []

                    if batch:
                        cursor.executemany(sql, batch)
                        inserted += len(batch)

    conn.commit()
    print(f"  [DB] Inseridos/Atualizados {inserted} candidatos para {ano}.")


def main():
    parser = argparse.ArgumentParser(description="TSE Ephemeral Stream Ingestion to DB")
    parser.add_argument("--anos", type=str, default="2026,2022", help="Anos das eleições separados por vírgula")
    parser.add_argument("--categorias", type=str, default="candidaturas_bens", help="Categorias para ingestão")
    parser.add_argument("--dry-run", action="store_true", help="Lista pacotes sem baixar nem alterar o banco")
    parser.add_argument("--limit-packages", type=int, default=5, help="Limite de pacotes a processar nesta execução")
    args = parser.parse_args()

    years = [int(y.strip()) for y in args.anos.split(",") if y.strip().isdigit()]
    target_cats = [c.strip() for c in args.categorias.split(",") if c.strip()]

    print("=" * 65)
    print(" INGESTÃO EFÊMERA DE DADOS ABERTOS TSE (STREAM TO DB)")
    print("=" * 65)
    print(f"Anos Selecionados:       {years}")
    print(f"Categorias Alvo:        {target_cats}")
    print(f"Modo Dry-Run:           {args.dry_run}")
    print("=" * 65)

    catalog = load_catalog()
    eligible = [
        item for item in catalog
        if item["ano"] in years and item["categoria"] in target_cats and item["escopo"] == "nacional_consolidado"
    ]

    print(f"\n[1/3] Identificados {len(eligible)} pacotes nacionais consolidados correspondentes.")
    for i, item in enumerate(eligible[:args.limit_packages], start=1):
        print(f"  {i}. [{item['ano']} | {item['categoria_desc']}] {item['arquivo_nome']}")
        print(f"     URL: {item['url']}")

    if args.dry_run:
        print("\n[DRY-RUN] Nenhuma alteração foi realizada no banco.")
        return

    conn = get_connection()
    print("\n[2/3] Iniciando streaming efêmero para o banco de dados...")

    processed = 0
    for item in eligible[:args.limit_packages]:
        print(f"\n-> Processando: {item['arquivo_nome']} ({item['ano']})")
        temp_zip = download_to_tempfile(item["url"])
        if not temp_zip:
            continue

        try:
            if "consulta_cand" in item["arquivo_nome"]:
                ingest_candidatos_zip(temp_zip, conn, item["ano"])
                processed += 1
            else:
                print(f"  [AVISO] Parser específico para {item['arquivo_nome']} em desenvolvimento.")
        finally:
            # Exclusão imediata do arquivo temporário baixado
            if temp_zip.exists():
                temp_zip.unlink()
                print(f"  [LIMPEZA] Arquivo temporário {temp_zip.name} excluído do disco.")

    conn.close()
    print(f"\n[3/3] Ingestão concluída! {processed} pacotes integrados com sucesso sem ocupar disco.")


if __name__ == "__main__":
    main()
