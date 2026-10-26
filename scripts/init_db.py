#!/usr/bin/env python3
"""
Database Initialization & Healthcheck Script
============================================
Verifica a conectividade com o banco (PostgreSQL via Docker/URL ou SQLite local),
aplica as migrações SQL e exibe o status de integridade das tabelas.
"""

import argparse
import sys
from pathlib import Path
from db_connector import get_connection, is_postgres, init_schema


def check_database_status(conn) -> dict:
    """Retorna contagem de registros em cada tabela."""
    cursor = conn.cursor()
    tables = [
        "eleicoes",
        "municipios",
        "candidatos",
        "totalizacao_nacional",
        "totalizacao_estados",
        "votacao_municipio",
        "votacao_municipio_comparada",
        "locais_votacao"
    ]
    status = {}
    for tbl in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
            count = cursor.fetchone()[0]
            status[tbl] = count
        except Exception:
            status[tbl] = "TABELA INEXISTENTE"
    return status


def main():
    parser = argparse.ArgumentParser(description="Inicializador e Auditor de Banco de Dados")
    parser.add_argument("--check", action="store_true", help="Apenas verifica status sem alterar schema")
    parser.add_argument("--fresh", action="store_true", help="Recria todas as tabelas do zero")
    args = parser.parse_args()

    tipo_banco = "PostgreSQL" if is_postgres() else "SQLite"

    print("=" * 65)
    print(f" AUDITORIA E INICIALIZAÇÃO DE BANCO DE DADOS [{tipo_banco}]")
    print("=" * 65)

    if not args.check:
        print("[1/2] Aplicando schemas e índices...")
        init_schema(fresh=args.fresh)
    else:
        print("[INFO] Modo somente leitura (--check).")

    print("[2/2] Verificando integridade das tabelas...")
    try:
        conn = get_connection()
        status = check_database_status(conn)
        conn.close()

        print("\nStatus das tabelas:")
        for tbl, count in status.items():
            print(f"  • {tbl:<28}: {count} registros")
        print("\n[OK] Banco de dados operacional e pronto para consultas!")
    except Exception as e:
        print(f"\n[ERRO] Falha ao comunicar com o banco: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
