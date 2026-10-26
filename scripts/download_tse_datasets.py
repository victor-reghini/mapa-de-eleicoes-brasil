#!/usr/bin/env python3
"""
TSE Open Data Batch Downloader & Cataloger
==========================================
Script automatizado para catalogar e baixar em lote os conjuntos de dados
do Portal de Dados Abertos do TSE (dadosabertos.tse.jus.br).

Requisitos Atendidos:
1. Alvo (5 categorias principais):
   - Resultados e Votação Nominal por Seção Eleitoral (Presidente, Gov, Sen, Dep, Pref, Ver)
   - Boletins de Urna (BUs) consolidados
   - Detalhe da Apuração por Seção Eleitoral (comparecimento, abstenção, brancos e nulos)
   - Perfil do Eleitorado e Locais de Votação
   - Candidaturas e Declaração de Bens
2. Escopo Temporal:
   - Eleições Gerais Recentes: 2026, 2022, 2018, 2014
   - Eleições Municipais Recentes: 2024, 2020
3. Armazenamento:
   - Arquivos brutos compactados salvos em 'dados_tse/' categorizados
   - Catálogo estruturado em JSON, CSV e README.md
   - Proteção de disco (trava de segurança de espaço livre)
   - Suporte a download resumível e streaming em blocos
"""

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple

TSE_API_BASE = "https://dadosabertos.tse.jus.br/api/3/action"
USER_AGENT = "MapaEleicoesBrasil-Downloader/1.0 (+https://dadosabertos.tse.jus.br)"

TARGET_YEARS = [2026, 2024, 2022, 2020, 2018, 2014]

CATEGORIAS = {
    "candidaturas_bens": "Candidaturas e Declaração de Bens",
    "perfil_eleitorado_locais": "Perfil do Eleitorado e Locais de Votação",
    "detalhe_apuracao_secao": "Detalhe da Apuração por Seção Eleitoral",
    "votacao_nominal_secao": "Resultados e Votação Nominal por Seção",
    "boletins_urna": "Boletins de Urna (BUs) Consolidados",
}

ESTADOS_BR = [
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
    "RO", "RR", "RS", "SC", "SE", "SP", "TO", "ZZ", "BR"
]


def classify_resource(pkg_name: str, resource_name: str, url: str) -> Tuple[str, str, Optional[str], Optional[str]]:
    """
    Classifica um recurso em: (categoria, escopo, uf, turno)
    """
    pkg_lower = pkg_name.lower()
    res_lower = resource_name.lower()
    url_lower = url.lower()

    # 1. UF detection
    uf = None
    uf_match = re.search(r"[_ -]([a-z]{2})(?:[_ \.\-]|\.zip|\.csv|$)", url_lower)
    if uf_match and uf_match.group(1).upper() in ESTADOS_BR:
        uf = uf_match.group(1).upper()
    else:
        # Check in name
        uf_name_match = re.search(r"\b([A-Z]{2})\b", resource_name)
        if uf_name_match and uf_name_match.group(1) in ESTADOS_BR:
            uf = uf_name_match.group(1)

    # 2. Turno detection
    turno = None
    if "1t" in url_lower or "1_turno" in url_lower or "1º turno" in res_lower or "primeiro turno" in res_lower:
        turno = "1"
    elif "2t" in url_lower or "2_turno" in url_lower or "2º turno" in res_lower or "segundo turno" in res_lower:
        turno = "2"

    # 3. Category classification
    if "boletim" in pkg_lower or "buweb" in url_lower or "bweb" in url_lower or "boletim" in res_lower:
        categoria = "boletins_urna"
    elif any(k in url_lower for k in ["consulta_cand", "bem_candidato", "coligacao", "vagas", "motivo_cassacao", "historico_candidatura"]) or "candidatos" in pkg_lower:
        categoria = "candidaturas_bens"
    elif any(k in url_lower for k in ["perfil_eleitor", "local_votacao", "locais_votacao", "eleitorado_local"]) or "eleitorado" in pkg_lower:
        categoria = "perfil_eleitorado_locais"
    elif any(k in url_lower for k in ["detalhe_votacao", "comparecimento_abstencao", "comparecimento-e-abstencao"]) or "comparecimento" in pkg_lower:
        categoria = "detalhe_apuracao_secao"
    elif any(k in url_lower for k in ["votacao_secao", "votacao_candidato", "votacao_partido", "historico_totalizacao", "relatorio_resultado_totalizacao"]) or "resultados" in pkg_lower:
        categoria = "votacao_nominal_secao"
    else:
        categoria = "outros"

    # 4. Scope detection
    is_consolidated = (
        uf == "BR" or
        "munzona" in url_lower or
        "consulta_cand_" in url_lower or
        "bem_candidato_" in url_lower or
        "detalhe_votacao_secao_" in url_lower or
        "perfil_eleitorado_" in url_lower or
        "eleitorado_local_votacao_" in url_lower or
        ("votacao_secao_" in url_lower and "_br.zip" in url_lower)
    )
    escopo = "nacional_consolidado" if is_consolidated else "estadual"

    return categoria, escopo, uf, turno


def fetch_ckan_package(pkg_name: str, retries: int = 3, delay: float = 1.0) -> Optional[dict]:
    """Recupera metadados do pacote via API CKAN."""
    url = f"{TSE_API_BASE}/package_show?id={pkg_name}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    if payload.get("success"):
                        return payload.get("result")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == retries:
                print(f"[WARN] Falha ao consultar pacote '{pkg_name}': {e}", file=sys.stderr)
            time.sleep(delay * attempt)
        except Exception as e:
            if attempt == retries:
                print(f"[WARN] Falha ao consultar pacote '{pkg_name}': {e}", file=sys.stderr)
            time.sleep(delay * attempt)
    return None


def get_remote_file_size(url: str, timeout: float = 6.0) -> int:
    """Obtém o tamanho do arquivo via cabeçalho HTTP HEAD."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content_length = resp.headers.get("Content-Length")
            if content_length:
                return int(content_length)
    except Exception:
        pass
    return 0


def format_bytes(num_bytes: int) -> str:
    """Converte bytes para string legível (B, KB, MB, GB)."""
    if num_bytes <= 0:
        return "N/D"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if num_bytes < 1024.0:
            return f"{num_bytes:.2f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.2f} PB"


def check_disk_space(path: Path, min_free_gb: float = 1.0) -> Tuple[bool, float, float]:
    """Verifica se há espaço livre suficiente no disco em GB."""
    total, used, free = shutil.disk_usage(path if path.exists() else path.parent)
    free_gb = free / (1024 ** 3)
    total_gb = total / (1024 ** 3)
    return (free_gb >= min_free_gb), free_gb, total_gb


def download_file_stream(url: str, dest_path: Path, min_disk_free_gb: float = 1.0) -> bool:
    """
    Baixa um arquivo via streaming com escrita atômica (.part -> final).
    Verifica integridade e limite de espaço em disco.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(dest_path.suffix + ".part")

    has_space, free_gb, _ = check_disk_space(dest_path.parent, min_disk_free_gb)
    if not has_space:
        print(f"[ERRO-DISCO] Espaço livre ({free_gb:.2f} GB) abaixo da margem de segurança ({min_disk_free_gb:.2f} GB). Download abortado.")
        return False

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            total_size = int(resp.headers.get("Content-Length", 0))

            # Verifica se arquivo já existente está completo
            if dest_path.exists():
                local_size = dest_path.stat().st_size
                if total_size > 0 and local_size == total_size:
                    print(f"  [JÁ EXISTE] {dest_path.name} ({format_bytes(local_size)}) já baixado.")
                    return True

            downloaded = 0
            start_time = time.time()
            chunk_size = 128 * 1024  # 128 KB

            with open(temp_path, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)

                    # Atualiza progresso no terminal
                    elapsed = time.time() - start_time
                    speed = (downloaded / (1024 * 1024)) / elapsed if elapsed > 0 else 0
                    if total_size > 0:
                        pct = (downloaded / total_size) * 100
                        print(f"\r  [BAIXANDO] {dest_path.name}: {pct:5.1f}% | {format_bytes(downloaded)}/{format_bytes(total_size)} @ {speed:.2f} MB/s", end="", flush=True)
                    else:
                        print(f"\r  [BAIXANDO] {dest_path.name}: {format_bytes(downloaded)} @ {speed:.2f} MB/s", end="", flush=True)

            print()  # Quebra de linha após concluir
            temp_path.replace(dest_path)
            return True

    except Exception as e:
        print(f"\n  [FALHA] Erro ao baixar {url}: {e}", file=sys.stderr)
        if temp_path.exists():
            temp_path.unlink()
        return False


def build_catalog(years: List[int], fetch_remote_sizes: bool = False) -> List[dict]:
    """
    Consulta o CKAN e constrói o catálogo completo de todos os pacotes e recursos.
    """
    print(f"\n[1/3] Catalogando datasets do TSE para os anos: {years}...")
    catalog = []

    for year in sorted(years, reverse=True):
        candidate_pkgs = [
            f"candidatos-{year}",
            f"candidatos-{year}-subtemas",
            f"resultados-{year}",
            f"resultados-{year}-boletim-de-urna",
            f"eleitorado-{year}",
            f"comparecimento-e-abstencao-{year}",
        ]

        for pkg_name in candidate_pkgs:
            pkg_data = fetch_ckan_package(pkg_name)
            if not pkg_data:
                continue

            pkg_title = pkg_data.get("title", pkg_name)
            resources = pkg_data.get("resources", [])

            for res in resources:
                res_url = res.get("url", "").strip()
                res_name = res.get("name", "").strip()
                res_format = res.get("format", "").upper().strip()
                res_id = res.get("id", "")

                # Foca em arquivos compactados .zip ou .csv
                if not (res_url.endswith(".zip") or res_url.endswith(".csv") or res_format in ["ZIP", "CSV"]):
                    continue

                categoria, escopo, uf, turno = classify_resource(pkg_name, res_name, res_url)

                if categoria == "outros":
                    continue

                size_bytes = res.get("size")
                if size_bytes is None:
                    size_bytes = 0
                else:
                    try:
                        size_bytes = int(size_bytes)
                    except (ValueError, TypeError):
                        size_bytes = 0

                if size_bytes == 0 and fetch_remote_sizes and res_url.endswith(".zip"):
                    size_bytes = get_remote_file_size(res_url)

                file_name = res_url.split("/")[-1]

                catalog.append({
                    "id": res_id,
                    "ano": year,
                    "categoria": categoria,
                    "categoria_desc": CATEGORIAS.get(categoria, categoria),
                    "pacote_id": pkg_name,
                    "pacote_titulo": pkg_title,
                    "recurso_nome": res_name,
                    "arquivo_nome": file_name,
                    "formato": res_format or "ZIP",
                    "escopo": escopo,
                    "uf": uf or ("BR" if escopo == "nacional_consolidado" else "TODAS"),
                    "turno": turno or "N/A",
                    "url": res_url,
                    "tamanho_bytes": size_bytes,
                    "tamanho_formatado": format_bytes(size_bytes),
                    "baixado": False,
                    "caminho_local": None
                })

    print(f"[OK] Catálogo construído: {len(catalog)} datasets indexados.")
    return catalog


def export_catalog(catalog: List[dict], output_dir: Path):
    """Exporta o catálogo para JSON, CSV e README.md."""
    output_dir.mkdir(parents=True, exist_ok=True)

    json_path = output_dir / "catalogo_tse.json"
    csv_path = output_dir / "catalogo_tse.csv"
    readme_path = output_dir / "README.md"

    # 1. JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(f"  -> Catálogo JSON: {json_path}")

    # 2. CSV
    if catalog:
        fieldnames = list(catalog[0].keys())
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
            writer.writeheader()
            writer.writerows(catalog)
        print(f"  -> Catálogo CSV:  {csv_path}")

    # 3. README.md
    total_datasets = len(catalog)
    by_category = {}
    by_year = {}

    for item in catalog:
        cat = item["categoria_desc"]
        yr = item["ano"]
        by_category[cat] = by_category.get(cat, 0) + 1
        by_year[yr] = by_year.get(yr, 0) + 1

    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("# Repositório Local de Dados Abertos do TSE\n\n")
        f.write(f"Data de atualização do catálogo: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"Total de datasets catalogados: **{total_datasets}**\n\n")

        f.write("## Distribuição por Categoria\n\n")
        f.write("| Categoria | Total Datasets |\n")
        f.write("| :--- | :---: |\n")
        for cat, cnt in sorted(by_category.items()):
            f.write(f"| {cat} | {cnt} |\n")
        f.write("\n")

        f.write("## Distribuição por Ano Eleitoral\n\n")
        f.write("| Ano | Tipo de Eleição | Datasets |\n")
        f.write("| :---: | :--- | :---: |\n")
        for yr, cnt in sorted(by_year.items(), reverse=True):
            tipo = "Geral" if yr in [2026, 2022, 2018, 2014] else "Municipal"
            f.write(f"| {yr} | {tipo} | {cnt} |\n")
        f.write("\n")

        f.write("## Estrutura de Pastas\n\n")
        f.write("```\n")
        f.write("dados_tse/\n")
        f.write("├── catalogo_tse.json              # Metadados completos de todos os recursos\n")
        f.write("├── catalogo_tse.csv               # Versão tabular para análise em planilha\n")
        f.write("├── README.md                      # Relatório sintético de inventário\n")
        f.write("├── candidaturas_bens/             # Candidaturas, bens, coligações, vagas\n")
        f.write("├── perfil_eleitorado_locais/      # Perfil sociodemográfico e locais de votação\n")
        f.write("├── detalhe_apuracao_secao/        # Comparecimento, abstenção, brancos, nulos\n")
        f.write("├── votacao_nominal_secao/         # Votos nominais por seção eleitoral (BR e UFs)\n")
        f.write("└── boletins_urna/                 # Arquivos brutos de Boletim de Urna (BUs)\n")
        f.write("```\n")

    print(f"  -> Relatório README: {readme_path}")


def execute_downloads(
    catalog: List[dict],
    output_dir: Path,
    scope: str = "consolidated",
    target_ufs: Optional[List[str]] = None,
    target_categories: Optional[List[str]] = None,
    max_mb: Optional[float] = None,
    min_disk_free_gb: float = 1.0
):
    """
    Executa os downloads prioritários respeitando restrições de disco e escopo.
    """
    print(f"\n[2/3] Iniciando fila de downloads (Escopo: {scope})...")
    total_downloaded_bytes = 0
    success_count = 0
    skip_count = 0
    fail_count = 0

    target_ufs_set = set([u.upper() for u in target_ufs]) if target_ufs else None
    target_cats_set = set(target_categories) if target_categories else None

    # Ordenação de prioridade:
    # 1. Nacionais consolidados primeiro (BR / Todos)
    # 2. UFs prioritárias
    # 3. Anos mais recentes primeiro (2026 -> 2024 -> 2022 -> ...)
    def sort_key(item):
        is_cons = 0 if item["escopo"] == "nacional_consolidado" else 1
        year_order = -item["ano"]
        return (is_cons, year_order)

    sorted_catalog = sorted(catalog, key=sort_key)

    for item in sorted_catalog:
        cat = item["categoria"]
        uf = item["uf"]
        escopo = item["escopo"]

        # Filtro de categoria
        if target_cats_set and cat not in target_cats_set:
            continue

        # Filtro de escopo
        if scope == "consolidated" and escopo != "nacional_consolidado":
            # Em modo consolidado, inclui apenas nacionais consolidados + UFs explicitamente selecionadas se houver
            if not target_ufs_set or uf not in target_ufs_set:
                continue

        # Filtro de UF para arquivos estaduais
        if target_ufs_set and uf != "BR" and uf != "TODAS" and uf not in target_ufs_set:
            continue

        # Limite máximo de download em MB configurado
        if max_mb and (total_downloaded_bytes / (1024 * 1024)) >= max_mb:
            print(f"\n[AVISO] Limite máximo de download atingido ({max_mb} MB). Finalizando downloads.")
            break

        # Define diretório local estruturado
        subfolder = output_dir / cat / str(item["ano"])
        dest_file = subfolder / item["arquivo_nome"]

        # Verifica se já existe
        if dest_file.exists():
            item["baixado"] = True
            item["caminho_local"] = str(dest_file.relative_to(output_dir.parent))
            skip_count += 1
            continue

        # Verificação preventiva de espaço em disco
        has_space, free_gb, _ = check_disk_space(output_dir, min_disk_free_gb)
        if not has_space:
            print(f"\n[ALERTA-DISCO] Espaço livre em disco ({free_gb:.2f} GB) atingiu o limite de segurança ({min_disk_free_gb:.2f} GB).")
            print("Interrompendo downloads para preservar a estabilidade do sistema.")
            break

        print(f"\n-> [{item['ano']} | {item['categoria_desc']}] {item['recurso_nome']}")
        print(f"   URL: {item['url']}")

        ok = download_file_stream(item["url"], dest_file, min_disk_free_gb)
        if ok:
            item["baixado"] = True
            item["caminho_local"] = str(dest_file.relative_to(output_dir.parent))
            file_sz = dest_file.stat().st_size
            item["tamanho_bytes"] = file_sz
            item["tamanho_formatado"] = format_bytes(file_sz)
            total_downloaded_bytes += file_sz
            success_count += 1
        else:
            fail_count += 1

    print(f"\n[3/3] Resumo dos downloads:")
    print(f"  Novos arquivos baixados: {success_count} ({format_bytes(total_downloaded_bytes)})")
    print(f"  Arquivos já existentes:  {skip_count}")
    print(f"  Falhas/Ignorados:       {fail_count}")

    # Re-exporta catálogo com os status de download atualizados
    export_catalog(catalog, output_dir)


def main():
    parser = argparse.ArgumentParser(description="TSE Open Data Batch Downloader & Cataloger")
    parser.add_argument("--anos", type=str, default="2026,2024,2022,2020,2018,2014", help="Anos das eleições separados por vírgula")
    parser.add_argument("--categorias", type=str, default="", help="Categorias separadas por vírgula (candidaturas_bens, perfil_eleitorado_locais, detalhe_apuracao_secao, votacao_nominal_secao, boletins_urna)")
    parser.add_argument("--scope", type=str, choices=["consolidated", "all"], default="consolidated", help="Escopo dos downloads: 'consolidated' (pacotes nacionais consolidados) ou 'all' (inclui todas UFs)")
    parser.add_argument("--ufs", type=str, default="BR,AC", help="UFs específicas para download (ex: 'BR,AC,SP' ou 'all')")
    parser.add_argument("--output-dir", type=str, default="dados_tse", help="Diretório de destino")
    parser.add_argument("--catalog-only", action="store_true", help="Apenas gera o catálogo de metadados sem baixar arquivos")
    parser.add_argument("--fetch-sizes", action="store_true", help="Faz requisições HEAD para obter tamanhos remotos não informados pelo CKAN")
    parser.add_argument("--max-mb", type=float, default=None, help="Limite máximo de MB para baixar nesta execução")
    parser.add_argument("--min-disk-free-gb", type=float, default=1.0, help="Margem de segurança de espaço livre no disco em GB")

    args = parser.parse_args()

    years = [int(y.strip()) for y in args.anos.split(",") if y.strip().isdigit()]
    output_dir = Path(args.output_dir).resolve()

    target_cats = [c.strip() for c in args.categorias.split(",") if c.strip()] if args.categorias else None
    target_ufs = [u.strip().upper() for u in args.ufs.split(",") if u.strip()] if args.ufs and args.ufs.lower() != "all" else None

    print("=" * 70)
    print(" INGESTÃO E CATALOGAÇÃO EM LOTE - DADOS ABERTOS TSE")
    print("=" * 70)
    print(f"Diretório de Armazenamento: {output_dir}")
    print(f"Anos Eleitorais:            {years}")
    print(f"Escopo de Download:         {args.scope}")
    print(f"UFs Selecionadas:           {target_ufs if target_ufs else 'TODAS'}")
    print(f"Trava de Segurança Disco:   {args.min_disk_free_gb:.1f} GB livres")
    print("=" * 70)

    # 1. Catalogação
    catalog = build_catalog(years, fetch_remote_sizes=args.fetch_sizes)
    export_catalog(catalog, output_dir)

    # 2. Execução dos Downloads
    if not args.catalog_only:
        execute_downloads(
            catalog=catalog,
            output_dir=output_dir,
            scope=args.scope,
            target_ufs=target_ufs,
            target_categories=target_cats,
            max_mb=args.max_mb,
            min_disk_free_gb=args.min_disk_free_gb
        )

    print("\n[CONCLUÍDO] Processo de catalogação e ingestão concluído com sucesso!")


if __name__ == "__main__":
    main()
