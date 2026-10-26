-- Schema Relacional para o Mapa Eleitoral Brasil
-- Compatível com PostgreSQL 14+ e SQLite (com pequenos ajustes de tipos)

-- 1. Tabela de Eleições
CREATE TABLE IF NOT EXISTS eleicoes (
    id TEXT PRIMARY KEY,                       -- Ex: '2026_PRESIDENTE'
    ano INTEGER NOT NULL,
    cargo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    data_1t DATE,
    data_2t DATE,
    tem_segundo_turno BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'OFICIAL'     -- 'OFICIAL', 'APURACAO', 'SIMULADO'
);

-- 2. Tabela de Municípios (Chave IBGE e TSE)
CREATE TABLE IF NOT EXISTS municipios (
    cd_municipio_tse TEXT PRIMARY KEY,
    cd_ibge TEXT NOT NULL,
    nm_municipio TEXT NOT NULL,
    sg_uf VARCHAR(2) NOT NULL,
    populacao INTEGER,
    total_eleitores INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL
);

CREATE INDEX IF NOT EXISTS idx_mun_uf ON municipios(sg_uf);
CREATE INDEX IF NOT EXISTS idx_mun_ibge ON municipios(cd_ibge);

-- 3. Tabela de Candidatos
CREATE TABLE IF NOT EXISTS candidatos (
    id SERIAL PRIMARY KEY,
    eleicao_id TEXT NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    turno INTEGER NOT NULL,
    numero TEXT NOT NULL,
    nome TEXT NOT NULL,
    nome_urna TEXT NOT NULL,
    partido TEXT NOT NULL,
    sigla_partido TEXT NOT NULL,
    coligacao TEXT,
    foto_url TEXT,
    cor_hex VARCHAR(7) DEFAULT '#6b7280',
    situacao TEXT DEFAULT 'REGISTRADO',        -- 'ELEITO', 'SEGUNDO_TURNO', 'NAO_ELEITO'
    bens_total REAL DEFAULT 0,
    CONSTRAINT unq_candidato UNIQUE (eleicao_id, turno, numero)
);

CREATE INDEX IF NOT EXISTS idx_cand_eleicao ON candidatos(eleicao_id, turno);

-- 4. Totais Nacionais e Estaduais
CREATE TABLE IF NOT EXISTS totalizacao_nacional (
    eleicao_id TEXT NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    turno INTEGER NOT NULL,
    aptos INTEGER NOT NULL,
    comparecimento INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    abstencoes INTEGER NOT NULL,
    pct_abstencoes REAL NOT NULL,
    votos_validos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    votos_brancos INTEGER NOT NULL,
    pct_brancos REAL NOT NULL,
    votos_nulos INTEGER NOT NULL,
    pct_nulos REAL NOT NULL,
    total_secoes INTEGER,
    secoes_apuradas INTEGER,
    pct_secoes_apuradas REAL DEFAULT 100.0,
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (eleicao_id, turno)
);

CREATE TABLE IF NOT EXISTS totalizacao_estados (
    eleicao_id TEXT NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    turno INTEGER NOT NULL,
    sg_uf VARCHAR(2) NOT NULL,
    aptos INTEGER NOT NULL,
    comparecimento INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    abstencoes INTEGER NOT NULL,
    votos_validos INTEGER NOT NULL,
    votos_brancos INTEGER NOT NULL,
    votos_nulos INTEGER NOT NULL,
    PRIMARY KEY (eleicao_id, turno, sg_uf)
);

-- 5. Votação Agregada por Município
CREATE TABLE IF NOT EXISTS votacao_municipio (
    eleicao_id TEXT NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    turno INTEGER NOT NULL,
    cd_municipio_tse TEXT NOT NULL REFERENCES municipios(cd_municipio_tse),
    numero_candidato TEXT NOT NULL,
    votos INTEGER NOT NULL,
    pct_votos REAL NOT NULL,
    PRIMARY KEY (eleicao_id, turno, cd_municipio_tse, numero_candidato)
);

CREATE INDEX IF NOT EXISTS idx_vot_mun_eleicao ON votacao_municipio(eleicao_id, turno, cd_municipio_tse);

-- 6. Tabela Analítica de Comparação Bivariada Municipal (Candidato A vs Candidato B)
CREATE TABLE IF NOT EXISTS votacao_municipio_comparada (
    eleicao_id TEXT NOT NULL REFERENCES eleicoes(id) ON DELETE CASCADE,
    turno INTEGER NOT NULL,
    cd_municipio_tse TEXT NOT NULL REFERENCES municipios(cd_municipio_tse),
    cd_ibge TEXT NOT NULL,
    sg_uf VARCHAR(2) NOT NULL,
    nr_cand_a TEXT NOT NULL,
    nr_cand_b TEXT NOT NULL,
    votos_cand_a INTEGER NOT NULL,
    votos_cand_b INTEGER NOT NULL,
    pct_cand_a REAL NOT NULL,
    pct_cand_b REAL NOT NULL,
    margem_pct REAL NOT NULL,                   -- (pct_a - pct_b)
    lider_numero TEXT NOT NULL,
    PRIMARY KEY (eleicao_id, turno, cd_municipio_tse, nr_cand_a, nr_cand_b)
);

CREATE INDEX IF NOT EXISTS idx_comp_mun_lookup 
ON votacao_municipio_comparada (eleicao_id, turno, nr_cand_a, nr_cand_b);

-- 7. Locais de Votação (Bairros e Escolas / Colégios Eleitorais)
CREATE TABLE IF NOT EXISTS locais_votacao (
    id TEXT PRIMARY KEY,                       -- {sg_uf}_{nr_zona}_{nr_local}
    sg_uf VARCHAR(2) NOT NULL,
    cd_municipio_tse TEXT NOT NULL REFERENCES municipios(cd_municipio_tse),
    nr_zona INTEGER NOT NULL,
    nr_local_votacao INTEGER NOT NULL,
    nm_local_votacao TEXT NOT NULL,
    ds_endereco TEXT,
    nm_bairro TEXT,
    latitude REAL,
    longitude REAL,
    total_secoes INTEGER DEFAULT 0,
    total_eleitores INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_locais_mun ON locais_votacao(cd_municipio_tse, nr_zona);
