"""
Database Connector Module
=========================
Gerenciador de conexões agnóstico que suporta:
1. PostgreSQL (via DATABASE_URL ou container Docker local)
2. SQLite (fallback leve embutido para testes locais sem Docker)
"""

import os
import sqlite3
from pathlib import Path
from typing import Any, List, Optional, Tuple

DATABASE_URL = os.environ.get("DATABASE_URL")
DEFAULT_SQLITE_PATH = Path("data/eleicoes_brasil.db")


def is_postgres() -> bool:
    """Verifica se a conexão atual é PostgreSQL."""
    return bool(DATABASE_URL and DATABASE_URL.startswith("postgres"))


def get_connection():
    """Retorna uma conexão ativa (PostgreSQL ou SQLite)."""
    if is_postgres():
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(DATABASE_URL)
            return conn
        except ImportError:
            print("[AVISO] psycopg2 não instalado. Recorrendo ao SQLite local.")
        except Exception as e:
            print(f"[AVISO] Falha ao conectar ao PostgreSQL ({e}). Recorrendo ao SQLite local.")

    # Fallback SQLite
    DEFAULT_SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DEFAULT_SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_schema(schema_file: Optional[Path] = None, fresh: bool = False):
    """Aplica o schema DDL inicial ao banco ativo."""
    if not schema_file:
        schema_file = Path("scripts/schema/001_initial_schema.sql")

    if not schema_file.exists():
        raise FileNotFoundError(f"Arquivo de schema {schema_file} não encontrado.")

    conn = get_connection()
    cursor = conn.cursor()

    if fresh:
        tables = [
            "votacao_municipio_comparada", "votacao_municipio", "locais_votacao",
            "totalizacao_estados", "totalizacao_nacional", "candidatos",
            "municipios", "eleicoes"
        ]
        for tbl in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {tbl};")
        conn.commit()
        print("[INFO] Tabelas anteriores removidas (--fresh).")

    sql_script = schema_file.read_text(encoding="utf-8")

    if not is_postgres():
        # Ajustes de tipos para SQLite
        sql_script = sql_script.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
        sql_script = sql_script.replace("BOOLEAN NOT NULL DEFAULT FALSE", "INTEGER NOT NULL DEFAULT 0")
        sql_script = sql_script.replace("TIMESTAMP DEFAULT CURRENT_TIMESTAMP", "DATETIME DEFAULT CURRENT_TIMESTAMP")
        sql_script = sql_script.replace("DATE", "TEXT")
        cursor.executescript(sql_script)
    else:
        cursor.execute(sql_script)

    conn.commit()
    conn.close()
    print(f"[OK] Schema inicial aplicado com sucesso via {schema_file.name}")


if __name__ == "__main__":
    conn = get_connection()
    tipo = "PostgreSQL" if is_postgres() else "SQLite"
    print(f"[INFO] Conexão bem-sucedida! Tipo de banco ativo: {tipo}")
    init_schema()
