#!/usr/bin/env python3
"""
Download paralelo de todos os Boletins de Urna (bweb) por seção eleitoral
das últimas eleições presidenciais no TSE Dados Abertos (2014, 2018, 2022 e 2026,
1º e 2º turnos, todas as 27 UFs + Exterior ZZ = 224 pacotes ZIP oficiais).
"""

import concurrent.futures
import csv
import json
import os
import re
import shutil
import sys
import threading
import time
import urllib.request
import zipfile
from pathlib import Path

TSE_API_BASE = "https://dadosabertos.tse.jus.br/api/3/action"
USER_AGENT = "MapaEleicoesBrasil-BU-Downloader/1.0 (+https://dadosabertos.tse.jus.br)"
PRESIDENTIAL_YEARS = [2026, 2022, 2018, 2014]
MIN_FREE_GB = 5.0

ESTADOS_BR = {
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
    "RO", "RR", "RS", "SC", "SE", "SP", "TO", "ZZ"
}

print_lock = threading.Lock()


def format_bytes(size: int) -> str:
    val = float(size)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if val < 1024.0:
            return f"{val:.2f} {unit}"
        val /= 1024.0
    return f"{val:.2f} PB"


def free_disk_gb(path: Path) -> float:
    target = path if path.exists() else path.parent
    return shutil.disk_usage(target).free / (1024 ** 3)


def fetch_2026_bu_resources() -> list[dict]:
    url = f"{TSE_API_BASE}/package_show?id=resultados-2026-boletim-de-urna"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        pkg = json.loads(resp.read().decode("utf-8"))["result"]

    items = []
    for res in pkg.get("resources", []):
        name = res.get("name", "")
        raw_url = (res.get("url") or "").strip()
        if "hash" in name.lower():
            continue
        # TSE CKAN cadastrou RR 2º turno com sufixo .sha512 indevido no recurso do ZIP
        if raw_url.endswith(".zip.sha512"):
            raw_url = raw_url[:-7]
        if not raw_url.lower().endswith(".zip"):
            continue

        fname = raw_url.split("/")[-1]
        uf_match = re.search(r"_([A-Za-z]{2})_", fname)
        uf = uf_match.group(1).upper() if uf_match else None
        turno = "1" if "_1t_" in fname.lower() else ("2" if "_2t_" in fname.lower() else "N/A")
        if uf not in ESTADOS_BR:
            continue

        items.append({
            "id": res.get("id", f"2026_{turno}_{uf}"),
            "ano": 2026,
            "categoria": "boletins_urna",
            "categoria_desc": "Boletins de Urna (BUs) Consolidados",
            "pacote_id": "resultados-2026-boletim-de-urna",
            "pacote_titulo": pkg.get("title", "Resultados - 2026 - Boletim de Urna"),
            "recurso_nome": name,
            "arquivo_nome": fname,
            "formato": "CSV",
            "escopo": "estadual",
            "uf": uf,
            "turno": turno,
            "url": raw_url,
            "tamanho_bytes": 0,
            "tamanho_formatado": "N/D",
            "baixado": False,
            "caminho_local": None,
        })
    return items


def build_bu_manifest(catalog_path: Path) -> tuple[list[dict], list[dict]]:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else []
    fresh_2026 = fetch_2026_bu_resources()

    # Substitui entradas antigas de boletins_urna 2026 pelo pacote atualizado (1T + 2T)
    kept = [
        item for item in catalog
        if not (item.get("ano") == 2026 and item.get("categoria") == "boletins_urna")
    ]
    merged_catalog = fresh_2026 + kept

    bu_targets = [
        item for item in merged_catalog
        if item.get("categoria") == "boletins_urna"
        and item.get("ano") in PRESIDENTIAL_YEARS
        and str(item.get("url", "")).lower().endswith(".zip")
    ]
    bu_targets.sort(key=lambda x: (-int(x["ano"]), str(x["turno"]), str(x["uf"])))
    return merged_catalog, bu_targets


def download_one(item: dict, base_dir: Path) -> tuple[bool, int, str]:
    ano = item["ano"]
    dest_dir = base_dir / "boletins_urna" / str(ano)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / item["arquivo_nome"]

    if dest_file.exists() and zipfile.is_zipfile(dest_file):
        sz = dest_file.stat().st_size
        item["baixado"] = True
        item["tamanho_bytes"] = sz
        item["tamanho_formatado"] = format_bytes(sz)
        item["caminho_local"] = str(dest_file.relative_to(base_dir.parent))
        return True, 0, "cached"

    if free_disk_gb(dest_dir) < MIN_FREE_GB:
        return False, 0, "disk_guard"

    part_file = dest_file.with_suffix(dest_file.suffix + ".part")
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(item["url"], headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=120) as resp, open(part_file, "wb") as out:
                while True:
                    chunk = resp.read(1024 * 512)
                    if not chunk:
                        break
                    out.write(chunk)

            if not zipfile.is_zipfile(part_file):
                part_file.unlink(missing_ok=True)
                raise ValueError("Arquivo ZIP inválido após download")

            part_file.replace(dest_file)
            sz = dest_file.stat().st_size
            item["baixado"] = True
            item["tamanho_bytes"] = sz
            item["tamanho_formatado"] = format_bytes(sz)
            item["caminho_local"] = str(dest_file.relative_to(base_dir.parent))
            return True, sz, "downloaded"
        except Exception as err:
            part_file.unlink(missing_ok=True)
            if attempt == 3:
                return False, 0, str(err)
            time.sleep(1.5 * attempt)
    return False, 0, "retry_exhausted"


def save_updated_catalog(catalog: list[dict], base_dir: Path) -> None:
    json_path = base_dir / "catalogo_tse.json"
    csv_path = base_dir / "catalogo_tse.csv"
    json_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")

    if catalog:
        fields = list(catalog[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(catalog)


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    base_dir = repo_root / "dados_tse"
    catalog_path = base_dir / "catalogo_tse.json"

    merged_catalog, targets = build_bu_manifest(catalog_path)
    total = len(targets)
    print(f"Total de pacotes de Boletins de Urna presidenciais (2014-2026): {total}")
    print(f"Espaço livre inicial: {free_disk_gb(base_dir):.2f} GB")

    t0 = time.time()
    downloaded_bytes = 0
    ok_count = 0
    cached_count = 0
    failures = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        future_map = {pool.submit(download_one, item, base_dir): item for item in targets}
        done_idx = 0
        for fut in concurrent.futures.as_completed(future_map):
            done_idx += 1
            item = future_map[fut]
            ok, sz, status = fut.result()
            if ok:
                ok_count += 1
                downloaded_bytes += sz
                if status == "cached":
                    cached_count += 1
                with print_lock:
                    if done_idx % 10 == 0 or done_idx == total or status == "downloaded":
                        elapsed = max(0.1, time.time() - t0)
                        mbps = (downloaded_bytes / (1024 * 1024)) / elapsed
                        print(
                            f"[{done_idx}/{total}] {item['ano']} {item['turno']}T {item['uf']} "
                            f"({item['tamanho_formatado']}) [{status}] | {mbps:.1f} MB/s"
                        )
            else:
                failures.append((item["ano"], item["turno"], item["uf"], status))
                with print_lock:
                    print(f"[ERRO] {item['ano']} {item['turno']}T {item['uf']}: {status}")

    save_updated_catalog(merged_catalog, base_dir)
    elapsed = time.time() - t0
    print(
        f"\nConcluído em {elapsed:.1f}s: {ok_count}/{total} pacotes prontos "
        f"(novos: {format_bytes(downloaded_bytes)}, em cache: {cached_count}, falhas: {len(failures)})"
    )
    print(f"Espaço livre final: {free_disk_gb(base_dir):.2f} GB")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

