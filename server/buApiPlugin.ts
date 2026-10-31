import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const require = createRequire(import.meta.url);

let DatabaseSyncClass: any = null;
try {
  // node:sqlite is available in Node.js 22.5+
  const sqlite = require('node:sqlite');
  DatabaseSyncClass = sqlite?.DatabaseSync ?? null;
} catch {
  DatabaseSyncClass = null;
}

const TRACKED_NUMBERS = new Set([13, 22, 17, 45, 12, 15, 40, 30, 55, 70, 14]);
const VALID_LEVELS = new Set(['secao', 'local', 'zona', 'municipio', 'uf']);

const TABLE_BY_LEVEL: Record<string, string> = {
  secao: 'bu_secao',
  local: 'bu_local',
  zona: 'bu_zona',
  municipio: 'bu_municipio',
  uf: 'bu_uf',
};

const JOIN_KEYS_BY_LEVEL: Record<string, string[]> = {
  secao: ['sg_uf', 'cd_municipio', 'nr_zona', 'nr_secao'],
  local: ['sg_uf', 'cd_municipio', 'nr_zona', 'nr_local_votacao'],
  zona: ['sg_uf', 'cd_municipio', 'nr_zona'],
  municipio: ['sg_uf', 'cd_municipio'],
  uf: ['sg_uf'],
};

function candVotesSql(alias: string, nr: number): string {
  if (TRACKED_NUMBERS.has(nr)) {
    return `${alias}.votos_${nr}`;
  }
  return `COALESCE(CAST(json_extract(${alias}.votos_json, '$."${nr}"') AS INTEGER), 0)`;
}

function candPctSql(alias: string, nr: number): string {
  if (TRACKED_NUMBERS.has(nr)) {
    return `${alias}.pct_${nr}`;
  }
  const v = candVotesSql(alias, nr);
  return `ROUND(CASE WHEN ${alias}.qt_votos_validos > 0 THEN (${v}) * 100.0 / ${alias}.qt_votos_validos ELSE 0 END, 2)`;
}

function parseExtraCands(raw: string | null): number[] {
  if (!raw) return [];
  const nums: number[] = [];
  for (const part of raw.split(',')) {
    const n = parseInt(part.trim(), 10);
    if (Number.isInteger(n) && n >= 10 && n <= 99 && !nums.includes(n)) {
      nums.push(n);
    }
  }
  return nums.slice(0, 12);
}

function buildAllowedColumnsSingle(level: string, extraCands: number[]): Record<string, string> {
  const cols: Record<string, string> = {
    sg_uf: 'a.sg_uf',
    qt_aptos: 'a.qt_aptos',
    qt_comparecimento: 'a.qt_comparecimento',
    pct_comparecimento: 'a.pct_comparecimento',
    qt_abstencoes: 'a.qt_abstencoes',
    pct_abstencoes: 'a.pct_abstencoes',
    qt_biometria_nh: 'a.qt_biometria_nh',
    qt_votos_validos: 'a.qt_votos_validos',
    qt_brancos: 'a.qt_brancos',
    qt_nulos: 'a.qt_nulos',
    qt_total_votos: 'a.qt_total_votos',
    pct_validos: 'a.pct_validos',
    pct_brancos: 'a.pct_brancos',
    pct_nulos: 'a.pct_nulos',
    vencedor_nr: 'a.vencedor_nr',
    vencedor_nome: 'a.vencedor_nome',
    vencedor_partido: 'a.vencedor_partido',
    vencedor_votos: 'a.vencedor_votos',
    vencedor_pct: 'a.vencedor_pct',
    segundo_nr: 'a.segundo_nr',
    segundo_nome: 'a.segundo_nome',
    segundo_partido: 'a.segundo_partido',
    segundo_votos: 'a.segundo_votos',
    segundo_pct: 'a.segundo_pct',
    margem_votos: 'a.margem_votos',
    margem_pct: 'a.margem_pct',
    dif_finalistas_votos: 'a.dif_finalistas_votos',
    dif_finalistas_pct: 'a.dif_finalistas_pct',
    dif_turno_comparecimento: 'a.dif_turno_comparecimento',
    dif_turno_pct_comparecimento: 'a.dif_turno_pct_comparecimento',
    dif_turno_validos: 'a.dif_turno_validos',
    dif_turno_abstencoes: 'a.dif_turno_abstencoes',
    dif_turno_brancos_nulos: 'a.dif_turno_brancos_nulos',
    dif_turno_cand1_votos: 'a.dif_turno_cand1_votos',
    dif_turno_cand1_pct: 'a.dif_turno_cand1_pct',
    dif_turno_cand2_votos: 'a.dif_turno_cand2_votos',
    dif_turno_cand2_pct: 'a.dif_turno_cand2_pct',
    dif_turno_saldo_finalistas: 'a.dif_turno_saldo_finalistas',
  };

  if (level !== 'uf') {
    cols.cd_municipio = 'a.cd_municipio';
    cols.nm_municipio = 'a.nm_municipio';
  }
  if (level === 'uf') {
    cols.qt_municipios = 'a.qt_municipios';
    cols.qt_zonas = 'a.qt_zonas';
    cols.qt_locais = 'a.qt_locais';
    cols.qt_secoes = 'a.qt_secoes';
  } else if (level === 'municipio') {
    cols.qt_zonas = 'a.qt_zonas';
    cols.qt_locais = 'a.qt_locais';
    cols.qt_secoes = 'a.qt_secoes';
  } else if (level === 'zona') {
    cols.nr_zona = 'a.nr_zona';
    cols.qt_locais = 'a.qt_locais';
    cols.qt_secoes = 'a.qt_secoes';
  } else if (level === 'local') {
    cols.nr_zona = 'a.nr_zona';
    cols.nr_local_votacao = 'a.nr_local_votacao';
    cols.qt_secoes = 'a.qt_secoes';
  } else if (level === 'secao') {
    cols.nr_zona = 'a.nr_zona';
    cols.nr_secao = 'a.nr_secao';
    cols.nr_local_votacao = 'a.nr_local_votacao';
    cols.ds_secoes_agregadas = 'a.ds_secoes_agregadas';
    cols.nr_urna_efetivada = 'a.nr_urna_efetivada';
    cols.ds_tipo_urna = 'a.ds_tipo_urna';
    cols.cd_flashcard = 'a.cd_flashcard';
    cols.cd_carga_1 = 'a.cd_carga_1';
    cols.dt_carga_urna = 'a.dt_carga_urna';
    cols.dt_abertura = 'a.dt_abertura';
    cols.dt_encerramento = 'a.dt_encerramento';
    cols.dt_emissao_bu = 'a.dt_emissao_bu';
    cols.dt_bu_recebido = 'a.dt_bu_recebido';
  }

  for (const nr of extraCands) {
    cols[`cand_${nr}_votos`] = candVotesSql('a', nr);
    cols[`cand_${nr}_pct`] = candPctSql('a', nr);
  }
  if (extraCands.length >= 2) {
    const [ec1, ec2] = extraCands;
    cols.dif_par_cands_votos = `((${candVotesSql('a', ec1)}) - (${candVotesSql('a', ec2)}))`;
    cols.dif_par_cands_pct = `ROUND((${candPctSql('a', ec1)}) - (${candPctSql('a', ec2)}), 2)`;
  }

  return cols;
}

function buildAllowedColumnsCompare(
  level: string,
  candA: number,
  candB: number,
  extraCands: number[]
): Record<string, string> {
  const vA = candVotesSql('a', candA);
  const pA = candPctSql('a', candA);
  const vB = candVotesSql('b', candB);
  const pB = candPctSql('b', candB);

  const cols: Record<string, string> = {
    sg_uf: 'a.sg_uf',

    qt_aptos_a: 'a.qt_aptos',
    qt_aptos_b: 'b.qt_aptos',
    delta_aptos: '(a.qt_aptos - b.qt_aptos)',

    qt_comparecimento_a: 'a.qt_comparecimento',
    qt_comparecimento_b: 'b.qt_comparecimento',
    delta_comparecimento: '(a.qt_comparecimento - b.qt_comparecimento)',

    pct_comparecimento_a: 'a.pct_comparecimento',
    pct_comparecimento_b: 'b.pct_comparecimento',
    delta_pct_comparecimento: 'ROUND(a.pct_comparecimento - b.pct_comparecimento, 2)',

    qt_abstencoes_a: 'a.qt_abstencoes',
    qt_abstencoes_b: 'b.qt_abstencoes',
    delta_abstencoes: '(a.qt_abstencoes - b.qt_abstencoes)',

    pct_abstencoes_a: 'a.pct_abstencoes',
    pct_abstencoes_b: 'b.pct_abstencoes',
    delta_pct_abstencoes: 'ROUND(a.pct_abstencoes - b.pct_abstencoes, 2)',

    qt_votos_validos_a: 'a.qt_votos_validos',
    qt_votos_validos_b: 'b.qt_votos_validos',
    delta_votos_validos: '(a.qt_votos_validos - b.qt_votos_validos)',

    qt_brancos_a: 'a.qt_brancos',
    qt_brancos_b: 'b.qt_brancos',
    delta_brancos: '(a.qt_brancos - b.qt_brancos)',
    pct_brancos_a: 'a.pct_brancos',
    pct_brancos_b: 'b.pct_brancos',
    delta_pct_brancos: 'ROUND(a.pct_brancos - b.pct_brancos, 2)',

    qt_nulos_a: 'a.qt_nulos',
    qt_nulos_b: 'b.qt_nulos',
    delta_nulos: '(a.qt_nulos - b.qt_nulos)',
    pct_nulos_a: 'a.pct_nulos',
    pct_nulos_b: 'b.pct_nulos',
    delta_pct_nulos: 'ROUND(a.pct_nulos - b.pct_nulos, 2)',

    vencedor_nome_a: 'a.vencedor_nome',
    vencedor_partido_a: 'a.vencedor_partido',
    vencedor_pct_a: 'a.vencedor_pct',
    vencedor_nome_b: 'b.vencedor_nome',
    vencedor_partido_b: 'b.vencedor_partido',
    vencedor_pct_b: 'b.vencedor_pct',

    margem_votos_a: 'a.margem_votos',
    margem_votos_b: 'b.margem_votos',
    delta_margem_votos: '(a.margem_votos - b.margem_votos)',
    margem_pct_a: 'a.margem_pct',
    margem_pct_b: 'b.margem_pct',
    delta_margem_pct: 'ROUND(a.margem_pct - b.margem_pct, 2)',

    dif_finalistas_votos_a: 'a.dif_finalistas_votos',
    dif_finalistas_votos_b: 'b.dif_finalistas_votos',
    delta_dif_finalistas_votos: '(a.dif_finalistas_votos - b.dif_finalistas_votos)',
    dif_finalistas_pct_a: 'a.dif_finalistas_pct',
    dif_finalistas_pct_b: 'b.dif_finalistas_pct',
    delta_dif_finalistas_pct: 'ROUND(a.dif_finalistas_pct - b.dif_finalistas_pct, 2)',

    foco_votos_a: vA,
    foco_pct_a: pA,
    foco_votos_b: vB,
    foco_pct_b: pB,
    delta_foco_votos: `((${vA}) - (${vB}))`,
    delta_foco_pct: `ROUND((${pA}) - (${pB}), 2)`,
  };

  if (level !== 'uf') {
    cols.cd_municipio = 'a.cd_municipio';
    cols.nm_municipio = 'a.nm_municipio';
  }
  if (level === 'uf') {
    cols.qt_secoes_a = 'a.qt_secoes';
    cols.qt_secoes_b = 'b.qt_secoes';
  } else if (level === 'municipio') {
    cols.qt_secoes_a = 'a.qt_secoes';
    cols.qt_secoes_b = 'b.qt_secoes';
  } else if (level === 'zona') {
    cols.nr_zona = 'a.nr_zona';
    cols.qt_secoes_a = 'a.qt_secoes';
    cols.qt_secoes_b = 'b.qt_secoes';
  } else if (level === 'local') {
    cols.nr_zona = 'a.nr_zona';
    cols.nr_local_votacao = 'a.nr_local_votacao';
    cols.qt_secoes_a = 'a.qt_secoes';
    cols.qt_secoes_b = 'b.qt_secoes';
  } else if (level === 'secao') {
    cols.nr_zona = 'a.nr_zona';
    cols.nr_secao = 'a.nr_secao';
    cols.nr_local_votacao = 'a.nr_local_votacao';
    cols.nr_urna_efetivada_a = 'a.nr_urna_efetivada';
    cols.nr_urna_efetivada_b = 'b.nr_urna_efetivada';
  }

  for (const nr of extraCands) {
    const evA = candVotesSql('a', nr);
    const epA = candPctSql('a', nr);
    const evB = candVotesSql('b', nr);
    const epB = candPctSql('b', nr);
    cols[`cand_${nr}_votos_a`] = evA;
    cols[`cand_${nr}_pct_a`] = epA;
    cols[`cand_${nr}_votos_b`] = evB;
    cols[`cand_${nr}_pct_b`] = epB;
    cols[`delta_cand_${nr}_votos`] = `((${evA}) - (${evB}))`;
    cols[`delta_cand_${nr}_pct`] = `ROUND((${epA}) - (${epB}), 2)`;
  }

  return cols;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function buApiPlugin(): Plugin {
  const dbPath = path.resolve(process.cwd(), 'data/bu_presidente.db');
  const metaJsonPath = path.resolve(process.cwd(), 'public/data/bu/meta.json');
  let db: any = null;
  let dbMtimeMs = 0;

  function getDb(): any {
    if (!DatabaseSyncClass || !fs.existsSync(dbPath)) {
      db = null;
      return null;
    }
    const stat = fs.statSync(dbPath);
    if (!db || stat.mtimeMs !== dbMtimeMs) {
      if (db) {
        try {
          db.close();
        } catch {
          // ignore close error on hot reload
        }
      }
      db = new DatabaseSyncClass(dbPath, { readOnly: true });
      dbMtimeMs = stat.mtimeMs;
    }
    return db;
  }

  function handleRequest(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    if (!req.url || !req.url.startsWith('/api/bu/')) {
      next();
      return;
    }

    const parsed = new URL(req.url, 'http://localhost');
    const pathname = parsed.pathname;
    const sp = parsed.searchParams;

    try {
      const conn = getDb();

      if (pathname === '/api/bu/meta') {
        if (fs.existsSync(metaJsonPath)) {
          const metaRaw = JSON.parse(fs.readFileSync(metaJsonPath, 'utf-8'));
          sendJson(res, 200, { dbReady: Boolean(conn), ...metaRaw });
          return;
        }
        sendJson(res, 200, { dbReady: false, rounds: [] });
        return;
      }

      if (!conn) {
        sendJson(res, 503, {
          error: 'Banco SQLite de Boletins de Urna ainda não disponível em data/bu_presidente.db.',
          dbReady: false,
        });
        return;
      }

      if (pathname === '/api/bu/municipios') {
        const ano = parseInt(sp.get('ano') || '2026', 10);
        const turno = parseInt(sp.get('turno') || '2', 10);
        const uf = (sp.get('uf') || '').trim().toUpperCase();

        const rows = uf
          ? conn
              .prepare(
                `SELECT sg_uf, cd_municipio, nm_municipio, qt_secoes
                 FROM bu_municipio
                 WHERE ano = ? AND turno = ? AND sg_uf = ?
                 ORDER BY nm_municipio ASC`
              )
              .all(ano, turno, uf)
          : conn
              .prepare(
                `SELECT sg_uf, cd_municipio, nm_municipio, qt_secoes
                 FROM bu_municipio
                 WHERE ano = ? AND turno = ?
                 ORDER BY nm_municipio ASC
                 LIMIT 6000`
              )
              .all(ano, turno);

        sendJson(res, 200, { municipios: rows });
        return;
      }

      if (pathname === '/api/bu/query') {
        const t0 = performance.now();
        const rawLevel = (sp.get('level') || 'secao').toLowerCase();
        const level = VALID_LEVELS.has(rawLevel) ? rawLevel : 'secao';
        const mode = sp.get('mode') === 'compare' ? 'compare' : 'single';

        const anoA = parseInt(sp.get('anoA') || '2026', 10);
        const turnoA = parseInt(sp.get('turnoA') || '2', 10);
        const anoB = parseInt(sp.get('anoB') || '2026', 10);
        const turnoB = parseInt(sp.get('turnoB') || '1', 10);
        const candA = Math.min(99, Math.max(10, parseInt(sp.get('candA') || '13', 10) || 13));
        const candB = Math.min(99, Math.max(10, parseInt(sp.get('candB') || '13', 10) || 13));
        const extraCands = parseExtraCands(sp.get('extraCands'));

        const uf = (sp.get('uf') || '').trim().toUpperCase();
        const cdMun = parseInt(sp.get('cdMunicipio') || '0', 10);
        const searchMun = (sp.get('searchMun') || '').trim().toUpperCase();
        const zona = parseInt(sp.get('zona') || '0', 10);
        const secao = parseInt(sp.get('secao') || '0', 10);
        const local = parseInt(sp.get('local') || '0', 10);
        const urna = parseInt(sp.get('urna') || '0', 10);
        const minAptos = parseInt(sp.get('minAptos') || '0', 10);

        const limit = Math.min(5000, Math.max(1, parseInt(sp.get('limit') || '100', 10) || 100));
        const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0);
        const sortDir = (sp.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const tableName = TABLE_BY_LEVEL[level];
        const colMap =
          mode === 'compare'
            ? buildAllowedColumnsCompare(level, candA, candB, extraCands)
            : buildAllowedColumnsSingle(level, extraCands);

        const reqSort = sp.get('sortBy') || '';
        const defaultSort = mode === 'compare' ? 'delta_foco_pct' : 'qt_comparecimento';
        const sortKey = colMap[reqSort] ? reqSort : colMap[defaultSort] ? defaultSort : 'sg_uf';
        const sortExpr = colMap[sortKey];

        const whereClauses: string[] = [];
        const params: (string | number)[] = [];

        if (mode === 'compare') {
          whereClauses.push('a.ano = ? AND a.turno = ? AND b.ano = ? AND b.turno = ?');
          params.push(anoA, turnoA, anoB, turnoB);
        } else {
          whereClauses.push('a.ano = ? AND a.turno = ?');
          params.push(anoA, turnoA);
        }

        if (uf) {
          whereClauses.push(mode === 'compare' ? 'a.sg_uf = ? AND b.sg_uf = ?' : 'a.sg_uf = ?');
          if (mode === 'compare') params.push(uf, uf);
          else params.push(uf);
        }
        if (cdMun > 0 && level !== 'uf') {
          whereClauses.push(
            mode === 'compare'
              ? 'a.cd_municipio = ? AND b.cd_municipio = ?'
              : 'a.cd_municipio = ?'
          );
          if (mode === 'compare') params.push(cdMun, cdMun);
          else params.push(cdMun);
        }
        if (searchMun && level !== 'uf') {
          whereClauses.push('a.nm_municipio LIKE ?');
          params.push(`%${searchMun}%`);
        }
        if (zona > 0 && (level === 'secao' || level === 'local' || level === 'zona')) {
          whereClauses.push('a.nr_zona = ?');
          params.push(zona);
        }
        if (local > 0 && (level === 'secao' || level === 'local')) {
          whereClauses.push('a.nr_local_votacao = ?');
          params.push(local);
        }
        if (secao > 0 && level === 'secao') {
          whereClauses.push('a.nr_secao = ?');
          params.push(secao);
        }
        if (urna > 0 && level === 'secao') {
          whereClauses.push('a.nr_urna_efetivada = ?');
          params.push(urna);
        }
        if (minAptos > 0) {
          whereClauses.push('a.qt_aptos >= ?');
          params.push(minAptos);
        }

        let appliedColFilters = 0;
        const rawColFilters = sp.get('colFilters');
        if (rawColFilters) {
          try {
            const parsedFilters = JSON.parse(rawColFilters) as Array<{
              col?: string;
              op?: string;
              val?: string;
            }>;
            if (Array.isArray(parsedFilters)) {
              for (const flt of parsedFilters.slice(0, 30)) {
                const colId = String(flt?.col || '');
                const expr = colMap[colId];
                const rawVal = String(flt?.val ?? '').trim();
                const op = String(flt?.op || '');
                if (!expr || !rawVal) continue;

                if (op === 'text') {
                  whereClauses.push(`UPPER(CAST(${expr} AS TEXT)) LIKE UPPER(?)`);
                  params.push(`%${rawVal}%`);
                  appliedColFilters++;
                } else if (op === 'lt' || op === 'gt' || op === 'eq') {
                  const numVal = Number(rawVal.replace(',', '.'));
                  if (!Number.isFinite(numVal)) continue;
                  if (op === 'lt') {
                    whereClauses.push(`(${expr}) < ?`);
                    params.push(numVal);
                  } else if (op === 'gt') {
                    whereClauses.push(`(${expr}) > ?`);
                    params.push(numVal);
                  } else if (Number.isInteger(numVal)) {
                    whereClauses.push(`(${expr}) = ?`);
                    params.push(numVal);
                  } else {
                    whereClauses.push(`ROUND(${expr}, 2) = ROUND(?, 2)`);
                    params.push(numVal);
                  }
                  appliedColFilters++;
                }
              }
            }
          } catch {
            // ignore malformed colFilters JSON
          }
        }

        const selectList = Object.entries(colMap)
          .map(([alias, expr]) => `${expr} AS ${alias}`)
          .join(', ');

        let fromSql = `${tableName} a`;
        if (mode === 'compare') {
          const joinCond = JOIN_KEYS_BY_LEVEL[level]
            .map((k) => `a.${k} = b.${k}`)
            .join(' AND ');
          fromSql = `${tableName} a INNER JOIN ${tableName} b ON ${joinCond}`;
        }

        const whereSql = whereClauses.join(' AND ');
        const tieBreaker = JOIN_KEYS_BY_LEVEL[level].map((k) => `a.${k} ASC`).join(', ');

        let total = 0;
        const isUnfilteredSingle =
          mode === 'single' &&
          appliedColFilters === 0 &&
          !searchMun &&
          zona <= 0 &&
          local <= 0 &&
          secao <= 0 &&
          urna <= 0 &&
          minAptos <= 0 &&
          cdMun <= 0;

        if (isUnfilteredSingle && level === 'secao') {
          const fastRow = uf
            ? (conn
                .prepare('SELECT qt_secoes AS total FROM bu_uf WHERE ano = ? AND turno = ? AND sg_uf = ?')
                .get(anoA, turnoA, uf) as { total: number } | undefined)
            : (conn
                .prepare('SELECT SUM(qt_secoes) AS total FROM bu_uf WHERE ano = ? AND turno = ?')
                .get(anoA, turnoA) as { total: number } | undefined);
          total = fastRow?.total ?? 0;
        } else {
          const countRow = conn
            .prepare(`SELECT COUNT(*) AS total FROM ${fromSql} WHERE ${whereSql}`)
            .get(...params) as { total: number } | undefined;
          total = countRow?.total ?? 0;
        }

        const dataRows = conn
          .prepare(
            `SELECT ${selectList}
             FROM ${fromSql}
             WHERE ${whereSql}
             ORDER BY ${sortExpr} ${sortDir}, ${tieBreaker}
             LIMIT ? OFFSET ?`
          )
          .all(...params, limit, offset);

        const elapsedMs = Math.round((performance.now() - t0) * 10) / 10;
        sendJson(res, 200, {
          total,
          limit,
          offset,
          sortBy: sortKey,
          sortDir: sortDir.toLowerCase(),
          elapsedMs,
          rows: dataRows,
        });
        return;
      }

      sendJson(res, 404, { error: 'Rota de Boletins de Urna não encontrada.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 500, { error: msg });
    }
  }

  return {
    name: 'bu-sqlite-api',
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}

