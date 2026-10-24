"""
TSE Bulk Ingester & Scalability Pipeline (Python)
------------------------------------------------
Este script demonstra a arquitetura para processamento e ingestão dos dados brutos
do Repositório de Dados Abertos do TSE (https://dadosabertos.tse.jus.br/)
para todos os cargos e eleições:
- Presidente
- Governador
- Senador
- Deputado Federal
- Deputado Estadual / Distrital
- Prefeito
- Vereador

Estrutura de dados gerada compatível com o frontend do Mapa de Eleições Brasil.
"""

import csv
import json
import os
import sys

CARGOS_SUPORTADOS = {
    "1": "PRESIDENTE",
    "3": "GOVERNADOR",
    "5": "SENADOR",
    "6": "DEPUTADO_FEDERAL",
    "7": "DEPUTADO_ESTADUAL",
    "8": "DEPUTADO_DISTRITAL",
    "11": "PREFEITO",
    "13": "VEREADOR"
}

def parse_tse_munzona(csv_filepath, ano, turno, cargo_alvo="1"):
    """
    Lê o arquivo 'votacao_candidato_munzona_{ano}_{uf}.csv' do TSE
    e gera a árvore hierárquica (Brasil -> UF -> Município -> Zona).
    """
    print(f"Processando TSE MunZona: {csv_filepath} | Ano: {ano} | Turno: {turno} | Cargo: {CARGOS_SUPORTADOS.get(cargo_alvo)}")
    
    agregado_uf = {}
    agregado_mun = {}
    agregado_zona = {}
    
    if not os.path.exists(csv_filepath):
        print(f"Arquivo {csv_filepath} não encontrado para processamento local.")
        return None

    with open(csv_filepath, mode='r', encoding='latin-1') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            if row.get('CD_CARGO') != cargo_alvo or row.get('NR_TURNO') != str(turno):
                continue
            
            uf = row.get('SG_UF')
            cod_mun = row.get('CD_MUNICIPIO')
            nome_mun = row.get('NM_MUNICIPIO')
            num_zona = row.get('NR_ZONA')
            num_cand = row.get('NR_CANDIDATO')
            nome_cand = row.get('NM_URNA_CANDIDATO')
            sigla_partido = row.get('SG_PARTIDO')
            votos = int(row.get('QT_VOTOS_NOMINAIS_VALIDOS', 0))

            # Chave de agregação hierárquica
            # 1. UF
            if uf not in agregado_uf:
                agregado_uf[uf] = {"votos_candidatos": {}, "total_validos": 0}
            agregado_uf[uf]["votos_candidatos"][num_cand] = agregado_uf[uf]["votos_candidatos"].get(num_cand, 0) + votos
            agregado_uf[uf]["total_validos"] += votos
            
            # 2. Município
            mun_key = f"{uf}_{cod_mun}"
            if mun_key not in agregado_mun:
                agregado_mun[mun_key] = {"nome": nome_mun, "uf": uf, "votos": {}, "total": 0}
            agregado_mun[mun_key]["votos"][num_cand] = agregado_mun[mun_key]["votos"].get(num_cand, 0) + votos
            agregado_mun[mun_key]["total"] += votos

            # 3. Zona
            zona_key = f"{uf}_{num_zona}"
            if zona_key not in agregado_zona:
                agregado_zona[zona_key] = {"zona": num_zona, "uf": uf, "votos": {}, "total": 0}
            agregado_zona[zona_key]["votos"][num_cand] = agregado_zona[zona_key]["votos"].get(num_cand, 0) + votos
            agregado_zona[zona_key]["total"] += votos

    print(f"Processamento concluído: {len(agregado_uf)} UFs, {len(agregado_mun)} Municípios, {len(agregado_zona)} Zonas.")
    return {
        "ufs": agregado_uf,
        "municipios": agregado_mun,
        "zonas": agregado_zona
    }

if __name__ == "__main__":
    print("Script modelo de ingestão em lote do TSE pronto para uso.")
