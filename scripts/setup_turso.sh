#!/usr/bin/env bash
set -e

export PATH="$HOME/.turso:$PATH"

echo "=== Configuração Automatizada do Turso para o Mapa Eleitoral ==="

# 1. Verifica/Instala a CLI do Turso
if ! command -v turso &> /dev/null; then
  echo ">>> Turso CLI não encontrada. Instalando via Homebrew..."
  if command -v brew &> /dev/null; then
    brew install tursodatabase/tap/turso
  else
    curl -sSfL https://get.tur.so/install.sh | bash
    export PATH="$HOME/.turso:$PATH"
  fi
fi

echo ">>> Turso CLI versão: $(turso --version)"

# 2. Verifica se o usuário está logado
if turso auth whoami | grep -qi "not logged in"; then
  echo ""
  echo ">>> Você precisa fazer login na sua conta do Turso (gratuita via GitHub)."
  echo ">>> Abrindo navegador para login..."
  turso auth login
fi

USER_LOGGED=$(turso auth whoami 2>/dev/null || echo "ok")
echo ">>> Logado como: $USER_LOGGED"

DB_NAME="mapa-eleicoes"
DB_FILE="data/bu_presidente.db"

# 3. Cria o banco caso não exista
if turso db list | grep -q "$DB_NAME"; then
  echo ">>> Banco '$DB_NAME' já existe no Turso."
else
  if [ ! -f "$DB_FILE" ]; then
    echo "ERRO: Arquivo $DB_FILE não encontrado."
    exit 1
  fi
  echo ">>> Criando banco '$DB_NAME' no Turso a partir de $DB_FILE (localização: São Paulo / aws-sa-east-1)..."
  echo ">>> Aguarde o upload (2.2 GB)..."
  turso db create "$DB_NAME" --from-file "$DB_FILE" --location aws-sa-east-1
fi

# 4. Obtém URL e Token Read-Only
echo ">>> Obtendo URL do banco..."
TURSO_URL=$(turso db show "$DB_NAME" --url)

echo ">>> Gerando Token somente leitura (Read-Only)..."
TURSO_TOKEN=$(turso db tokens create "$DB_NAME" --read-only)

# 5. Salva no .env local
ENV_FILE=".env"
touch "$ENV_FILE"

# Remove entradas antigas se existirem
grep -v "^VITE_TURSO_DATABASE_URL=" "$ENV_FILE" | grep -v "^VITE_TURSO_AUTH_TOKEN=" > "${ENV_FILE}.tmp" || true
mv "${ENV_FILE}.tmp" "$ENV_FILE"

echo "VITE_TURSO_DATABASE_URL=$TURSO_URL" >> "$ENV_FILE"
echo "VITE_TURSO_AUTH_TOKEN=$TURSO_TOKEN" >> "$ENV_FILE"

echo ""
echo "=========================================================="
echo "  CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=========================================================="
echo "As variáveis foram salvas automaticamente em seu arquivo .env:"
echo ""
echo "VITE_TURSO_DATABASE_URL=$TURSO_URL"
echo "VITE_TURSO_AUTH_TOKEN=$TURSO_TOKEN"
echo ""
echo "Copie e cole essas duas variáveis no Netlify:"
echo "Site configuration > Environment variables"
echo "Depois dispare um novo deploy (Trigger deploy)."
echo "=========================================================="

