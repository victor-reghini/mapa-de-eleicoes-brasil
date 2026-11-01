import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';

// 1. Carrega variáveis de .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envVars = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        envVars[key] = val;
      }
    }
  }
  return envVars;
}

const env = loadEnv();
const tursoUrl = env.TURSO_DATABASE_URL || env.VITE_TURSO_DATABASE_URL;
const writeToken = env.TURSO_WRITE_TOKEN || env.VITE_TURSO_AUTH_TOKEN;

if (!tursoUrl) {
  console.error('\n❌ ERRO: VITE_TURSO_DATABASE_URL não encontrada no arquivo .env');
  process.exit(1);
}

if (!writeToken) {
  console.error('\n❌ ERRO: Token de autenticação não encontrado no arquivo .env');
  process.exit(1);
}

const localDbPath = path.resolve(process.cwd(), 'data/bu_presidente.db');
if (!fs.existsSync(localDbPath)) {
  console.error(`\n❌ ERRO: Arquivo local ${localDbPath} não encontrado.`);
  process.exit(1);
}

console.log('====================================================');
console.log('🚀 SINCRONIZADOR DE DADOS: LOCAL -> TURSO EDGE');
console.log(`URL do Turso: ${tursoUrl}`);
console.log(`Banco local:  ${localDbPath}`);
console.log('====================================================\n');

const localDb = new DatabaseSync(localDbPath, { readOnly: true });
const turso = createClient({ url: tursoUrl, authToken: writeToken });

// 2. Testa permissão de escrita
async function verifyWritePermission() {
  process.stdout.write('🔍 Verificando permissão de escrita no Turso... ');
  try {
    await turso.execute('CREATE TABLE IF NOT EXISTS _turso_healthcheck (id INT PRIMARY KEY);');
    await turso.execute('DROP TABLE IF EXISTS _turso_healthcheck;');
    console.log('✅ Permissão de ESCRITA confirmada!\n');
    return true;
  } catch (err) {
    console.log('❌ FALHA!\n');
    if (err.message && err.message.includes('SQL write operations are forbidden')) {
      console.error('⚠️  ATENÇÃO: O token configurado no .env é SOMENTE LEITURA (Read-Only).');
      console.error('Para criar as tabelas e enviar os dados, você precisa de um token de ESCRITA (Full Access / Read-Write).\n');
      console.error('Como obter o token de escrita:');
      console.error('1. Acesse https://app.turso.tech e entre no banco "mapa-eleicoes"');
      console.error('2. Vá na aba "Tokens" (ou "Generate Token")');
      console.error('3. Gere um token com permissão "Full Access" (ou Read/Write - NÃO marque Read-only)');
      console.error('4. Adicione no seu arquivo .env:');
      console.error('   TURSO_WRITE_TOKEN=<cole_aqui_o_token_gerado>\n');
    } else {
      console.error('Erro:', err.message);
    }
    return false;
  }
}

// 3. Criação de tabelas
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS bu_uf (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    qt_municipios INTEGER NOT NULL,
    qt_zonas INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    qt_aptos INTEGER NOT NULL,
    qt_comparecimento INTEGER NOT NULL,
    qt_abstencoes INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    pct_abstencoes REAL NOT NULL,
    qt_biometria_nh INTEGER NOT NULL,
    qt_votos_validos INTEGER NOT NULL,
    qt_brancos INTEGER NOT NULL,
    qt_nulos INTEGER NOT NULL,
    qt_total_votos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    pct_brancos REAL NOT NULL,
    pct_nulos REAL NOT NULL,
    vencedor_nr INTEGER NOT NULL,
    vencedor_nome TEXT NOT NULL,
    vencedor_partido TEXT NOT NULL,
    vencedor_votos INTEGER NOT NULL,
    vencedor_pct REAL NOT NULL,
    segundo_nr INTEGER NOT NULL,
    segundo_nome TEXT NOT NULL,
    segundo_partido TEXT NOT NULL,
    segundo_votos INTEGER NOT NULL,
    segundo_pct REAL NOT NULL,
    margem_votos INTEGER NOT NULL,
    margem_pct REAL NOT NULL,
    votos_13 INTEGER NOT NULL, pct_13 REAL NOT NULL,
    votos_22 INTEGER NOT NULL, pct_22 REAL NOT NULL,
    votos_17 INTEGER NOT NULL, pct_17 REAL NOT NULL,
    votos_45 INTEGER NOT NULL, pct_45 REAL NOT NULL,
    votos_12 INTEGER NOT NULL, pct_12 REAL NOT NULL,
    votos_15 INTEGER NOT NULL, pct_15 REAL NOT NULL,
    votos_40 INTEGER NOT NULL, pct_40 REAL NOT NULL,
    votos_30 INTEGER NOT NULL, pct_30 REAL NOT NULL,
    votos_55 INTEGER NOT NULL, pct_55 REAL NOT NULL,
    votos_70 INTEGER NOT NULL, pct_70 REAL NOT NULL,
    votos_14 INTEGER NOT NULL, pct_14 REAL NOT NULL,
    votos_json TEXT NOT NULL,
    dif_finalistas_votos INTEGER, dif_finalistas_pct REAL,
    dif_turno_comparecimento INTEGER, dif_turno_pct_comparecimento REAL,
    dif_turno_validos INTEGER, dif_turno_abstencoes INTEGER,
    dif_turno_brancos_nulos INTEGER, dif_turno_cand1_votos INTEGER,
    dif_turno_cand1_pct REAL, dif_turno_cand2_votos INTEGER,
    dif_turno_cand2_pct REAL, dif_turno_saldo_finalistas INTEGER,
    PRIMARY KEY (ano, turno, sg_uf)
  );`,

  `CREATE TABLE IF NOT EXISTS bu_municipio (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    qt_zonas INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    qt_aptos INTEGER NOT NULL,
    qt_comparecimento INTEGER NOT NULL,
    qt_abstencoes INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    pct_abstencoes REAL NOT NULL,
    qt_biometria_nh INTEGER NOT NULL,
    qt_votos_validos INTEGER NOT NULL,
    qt_brancos INTEGER NOT NULL,
    qt_nulos INTEGER NOT NULL,
    qt_total_votos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    pct_brancos REAL NOT NULL,
    pct_nulos REAL NOT NULL,
    vencedor_nr INTEGER NOT NULL,
    vencedor_nome TEXT NOT NULL,
    vencedor_partido TEXT NOT NULL,
    vencedor_votos INTEGER NOT NULL,
    vencedor_pct REAL NOT NULL,
    segundo_nr INTEGER NOT NULL,
    segundo_nome TEXT NOT NULL,
    segundo_partido TEXT NOT NULL,
    segundo_votos INTEGER NOT NULL,
    segundo_pct REAL NOT NULL,
    margem_votos INTEGER NOT NULL,
    margem_pct REAL NOT NULL,
    votos_13 INTEGER NOT NULL, pct_13 REAL NOT NULL,
    votos_22 INTEGER NOT NULL, pct_22 REAL NOT NULL,
    votos_17 INTEGER NOT NULL, pct_17 REAL NOT NULL,
    votos_45 INTEGER NOT NULL, pct_45 REAL NOT NULL,
    votos_12 INTEGER NOT NULL, pct_12 REAL NOT NULL,
    votos_15 INTEGER NOT NULL, pct_15 REAL NOT NULL,
    votos_40 INTEGER NOT NULL, pct_40 REAL NOT NULL,
    votos_30 INTEGER NOT NULL, pct_30 REAL NOT NULL,
    votos_55 INTEGER NOT NULL, pct_55 REAL NOT NULL,
    votos_70 INTEGER NOT NULL, pct_70 REAL NOT NULL,
    votos_14 INTEGER NOT NULL, pct_14 REAL NOT NULL,
    votos_json TEXT NOT NULL,
    dif_finalistas_votos INTEGER, dif_finalistas_pct REAL,
    dif_turno_comparecimento INTEGER, dif_turno_pct_comparecimento REAL,
    dif_turno_validos INTEGER, dif_turno_abstencoes INTEGER,
    dif_turno_brancos_nulos INTEGER, dif_turno_cand1_votos INTEGER,
    dif_turno_cand1_pct REAL, dif_turno_cand2_votos INTEGER,
    dif_turno_cand2_pct REAL, dif_turno_saldo_finalistas INTEGER,
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio)
  );`,

  `CREATE TABLE IF NOT EXISTS bu_zona (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    nr_zona INTEGER NOT NULL,
    qt_locais INTEGER NOT NULL,
    qt_secoes INTEGER NOT NULL,
    qt_aptos INTEGER NOT NULL,
    qt_comparecimento INTEGER NOT NULL,
    qt_abstencoes INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    pct_abstencoes REAL NOT NULL,
    qt_biometria_nh INTEGER NOT NULL,
    qt_votos_validos INTEGER NOT NULL,
    qt_brancos INTEGER NOT NULL,
    qt_nulos INTEGER NOT NULL,
    qt_total_votos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    pct_brancos REAL NOT NULL,
    pct_nulos REAL NOT NULL,
    vencedor_nr INTEGER NOT NULL,
    vencedor_nome TEXT NOT NULL,
    vencedor_partido TEXT NOT NULL,
    vencedor_votos INTEGER NOT NULL,
    vencedor_pct REAL NOT NULL,
    segundo_nr INTEGER NOT NULL,
    segundo_nome TEXT NOT NULL,
    segundo_partido TEXT NOT NULL,
    segundo_votos INTEGER NOT NULL,
    segundo_pct REAL NOT NULL,
    margem_votos INTEGER NOT NULL,
    margem_pct REAL NOT NULL,
    votos_13 INTEGER NOT NULL, pct_13 REAL NOT NULL,
    votos_22 INTEGER NOT NULL, pct_22 REAL NOT NULL,
    votos_17 INTEGER NOT NULL, pct_17 REAL NOT NULL,
    votos_45 INTEGER NOT NULL, pct_45 REAL NOT NULL,
    votos_12 INTEGER NOT NULL, pct_12 REAL NOT NULL,
    votos_15 INTEGER NOT NULL, pct_15 REAL NOT NULL,
    votos_40 INTEGER NOT NULL, pct_40 REAL NOT NULL,
    votos_30 INTEGER NOT NULL, pct_30 REAL NOT NULL,
    votos_55 INTEGER NOT NULL, pct_55 REAL NOT NULL,
    votos_70 INTEGER NOT NULL, pct_70 REAL NOT NULL,
    votos_14 INTEGER NOT NULL, pct_14 REAL NOT NULL,
    votos_json TEXT NOT NULL,
    dif_finalistas_votos INTEGER, dif_finalistas_pct REAL,
    dif_turno_comparecimento INTEGER, dif_turno_pct_comparecimento REAL,
    dif_turno_validos INTEGER, dif_turno_abstencoes INTEGER,
    dif_turno_brancos_nulos INTEGER, dif_turno_cand1_votos INTEGER,
    dif_turno_cand1_pct REAL, dif_turno_cand2_votos INTEGER,
    dif_turno_cand2_pct REAL, dif_turno_saldo_finalistas INTEGER,
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio, nr_zona)
  );`,

  `CREATE TABLE IF NOT EXISTS bu_secao (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    sg_uf TEXT NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio TEXT NOT NULL,
    nr_zona INTEGER NOT NULL,
    nr_secao INTEGER NOT NULL,
    nr_local_votacao INTEGER NOT NULL,
    ds_secoes_agregadas TEXT NOT NULL,
    qt_aptos INTEGER NOT NULL,
    qt_comparecimento INTEGER NOT NULL,
    qt_abstencoes INTEGER NOT NULL,
    pct_comparecimento REAL NOT NULL,
    pct_abstencoes REAL NOT NULL,
    qt_biometria_nh INTEGER NOT NULL,
    qt_votos_validos INTEGER NOT NULL,
    qt_brancos INTEGER NOT NULL,
    qt_nulos INTEGER NOT NULL,
    qt_total_votos INTEGER NOT NULL,
    pct_validos REAL NOT NULL,
    pct_brancos REAL NOT NULL,
    pct_nulos REAL NOT NULL,
    vencedor_nr INTEGER NOT NULL,
    vencedor_nome TEXT NOT NULL,
    vencedor_partido TEXT NOT NULL,
    vencedor_votos INTEGER NOT NULL,
    vencedor_pct REAL NOT NULL,
    segundo_nr INTEGER NOT NULL,
    segundo_nome TEXT NOT NULL,
    segundo_partido TEXT NOT NULL,
    segundo_votos INTEGER NOT NULL,
    segundo_pct REAL NOT NULL,
    margem_votos INTEGER NOT NULL,
    margem_pct REAL NOT NULL,
    votos_13 INTEGER NOT NULL, pct_13 REAL NOT NULL,
    votos_22 INTEGER NOT NULL, pct_22 REAL NOT NULL,
    votos_17 INTEGER NOT NULL, pct_17 REAL NOT NULL,
    votos_45 INTEGER NOT NULL, pct_45 REAL NOT NULL,
    votos_12 INTEGER NOT NULL, pct_12 REAL NOT NULL,
    votos_15 INTEGER NOT NULL, pct_15 REAL NOT NULL,
    votos_40 INTEGER NOT NULL, pct_40 REAL NOT NULL,
    votos_30 INTEGER NOT NULL, pct_30 REAL NOT NULL,
    votos_55 INTEGER NOT NULL, pct_55 REAL NOT NULL,
    votos_70 INTEGER NOT NULL, pct_70 REAL NOT NULL,
    votos_14 INTEGER NOT NULL, pct_14 REAL NOT NULL,
    votos_json TEXT NOT NULL,
    nr_urna_efetivada INTEGER NOT NULL,
    ds_tipo_urna TEXT NOT NULL,
    cd_flashcard TEXT NOT NULL,
    cd_carga_1 TEXT NOT NULL,
    dt_carga_urna TEXT NOT NULL,
    dt_abertura TEXT NOT NULL,
    dt_encerramento TEXT NOT NULL,
    dt_emissao_bu TEXT NOT NULL,
    dt_bu_recebido TEXT NOT NULL,
    dif_finalistas_votos INTEGER, dif_finalistas_pct REAL,
    dif_turno_comparecimento INTEGER, dif_turno_pct_comparecimento REAL,
    dif_turno_validos INTEGER, dif_turno_abstencoes INTEGER,
    dif_turno_brancos_nulos INTEGER, dif_turno_cand1_votos INTEGER,
    dif_turno_cand1_pct REAL, dif_turno_cand2_votos INTEGER,
    dif_turno_cand2_pct REAL, dif_turno_saldo_finalistas INTEGER,
    PRIMARY KEY (ano, turno, sg_uf, cd_municipio, nr_zona, nr_secao)
  );`,

  `CREATE TABLE IF NOT EXISTS bu_candidatos (
    ano INTEGER NOT NULL,
    turno INTEGER NOT NULL,
    nr_votavel INTEGER NOT NULL,
    nm_votavel TEXT NOT NULL,
    sg_partido TEXT NOT NULL,
    qt_votos INTEGER NOT NULL,
    PRIMARY KEY (ano, turno, nr_votavel)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_bu_secao_mun ON bu_secao (ano, turno, sg_uf, nm_municipio);`,
  `CREATE INDEX IF NOT EXISTS idx_bu_mun_nome ON bu_municipio (ano, turno, nm_municipio);`,
  `CREATE INDEX IF NOT EXISTS idx_bu_secao_comp ON bu_secao (ano, turno, qt_comparecimento DESC);`,
];

async function createSchema() {
  console.log('📦 Criando tabelas e índices no Turso...');
  for (const sql of SCHEMA_STATEMENTS) {
    await turso.execute(sql);
  }
  console.log('✅ Tabelas criadas com sucesso!\n');
}

// 4. Utilitário de envio em batch
async function syncTable(tableName, selectSql, countSql, batchSize = 300) {
  const totalCount = localDb.prepare(countSql).get().total;
  console.log(`➡️  Sincronizando ${tableName.toUpperCase()} (${totalCount.toLocaleString('pt-BR')} registros)...`);
  if (totalCount === 0) return;

  const stmt = localDb.prepare(selectSql);
  const rowsIter = stmt.iterate();

  let batch = [];
  let inserted = 0;
  const t0 = Date.now();

  for (const row of rowsIter) {
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders})`;
    batch.push({ sql, args: Object.values(row) });

    if (batch.length >= batchSize) {
      await turso.batch(batch, 'write');
      inserted += batch.length;
      const rate = Math.round((inserted / ((Date.now() - t0) / 1000)));
      process.stdout.write(`\r   Progresso: ${inserted.toLocaleString('pt-BR')}/${totalCount.toLocaleString('pt-BR')} (${Math.round((inserted / totalCount) * 100)}%) | ~${rate} reg/s`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await turso.batch(batch, 'write');
    inserted += batch.length;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\r   ✅ ${tableName.toUpperCase()} concluído: ${inserted.toLocaleString('pt-BR')} registros em ${elapsed}s\n`);
}

// 5. Execução principal
async function main() {
  const ok = await verifyWritePermission();
  if (!ok) process.exit(1);

  await createSchema();

  // 1. Tabelas leves primeiro (Instantâneas)
  await syncTable(
    'bu_candidatos',
    'SELECT * FROM bu_candidatos',
    'SELECT count(*) as total FROM bu_candidatos',
    100
  );

  await syncTable(
    'bu_uf',
    'SELECT * FROM bu_uf',
    'SELECT count(*) as total FROM bu_uf',
    100
  );

  await syncTable(
    'bu_municipio',
    'SELECT * FROM bu_municipio ORDER BY ano DESC, turno DESC',
    'SELECT count(*) as total FROM bu_municipio',
    300
  );

  await syncTable(
    'bu_zona',
    'SELECT * FROM bu_zona ORDER BY ano DESC, turno DESC',
    'SELECT count(*) as total FROM bu_zona',
    300
  );

  // 2. Seções Eleitorais: PRIORIZAÇÃO DOS MAIS RECENTES (2026_2 -> 2026_1 -> 2022_2 -> ...)
  const rounds = [
    { ano: 2026, turno: 2, label: 'Eleição 2026 - 2º Turno (Oficial)' },
    { ano: 2026, turno: 1, label: 'Eleição 2026 - 1º Turno' },
    { ano: 2022, turno: 2, label: 'Eleição 2022 - 2º Turno' },
    { ano: 2022, turno: 1, label: 'Eleição 2022 - 1º Turno' },
    { ano: 2018, turno: 2, label: 'Eleição 2018 - 2º Turno' },
    { ano: 2018, turno: 1, label: 'Eleição 2018 - 1º Turno' },
    { ano: 2014, turno: 2, label: 'Eleição 2014 - 2º Turno' },
    { ano: 2014, turno: 1, label: 'Eleição 2014 - 1º Turno' },
  ];

  console.log('🗳️  Iniciando sincronização de Seções Eleitorais (bu_secao) por ordem de relevância:');
  for (const r of rounds) {
    console.log(`\n📌 [${r.label}]`);
    await syncTable(
      'bu_secao',
      `SELECT * FROM bu_secao WHERE ano = ${r.ano} AND turno = ${r.turno}`,
      `SELECT count(*) as total FROM bu_secao WHERE ano = ${r.ano} AND turno = ${r.turno}`,
      400
    );
  }

  console.log('🎉 TODA A BASE DE BOLETINS DE URNA FOI SINCRONIZADA COM SUCESSO NO TURSO!');
}

main().catch((err) => {
  console.error('\n❌ Erro durante a sincronização:', err);
  process.exit(1);
});

