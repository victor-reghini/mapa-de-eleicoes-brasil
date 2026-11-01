import { createClient, type Client } from '@libsql/client/web';
import type { BuQueryParams, BuQueryResponse, BuMunicipioOption } from './buService';
import { buildBuSqlQuery } from './buQueryBuilder';

const tursoUrl = import.meta.env.VITE_TURSO_DATABASE_URL?.trim();
const tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN?.trim();

let clientInstance: Client | null = null;

export function isTursoConfigured(): boolean {
  return Boolean(tursoUrl);
}

function getTursoClient(): Client {
  if (!tursoUrl) {
    throw new Error('VITE_TURSO_DATABASE_URL não configurado.');
  }
  if (!clientInstance) {
    clientInstance = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken || undefined,
    });
  }
  return clientInstance;
}

export async function queryTurso(params: BuQueryParams): Promise<BuQueryResponse> {
  const t0 = performance.now();
  const client = getTursoClient();
  const query = buildBuSqlQuery(params);

  // Executa contagem e busca em paralelo no Turso Edge
  const [countRes, dataRes] = await Promise.all([
    client.execute({
      sql: query.countSql,
      args: query.countParams,
    }),
    client.execute({
      sql: query.dataSql,
      args: query.dataParams,
    }),
  ]);

  let total = 0;
  if (countRes.rows.length > 0) {
    const firstRow = countRes.rows[0];
    const val = firstRow.total ?? Object.values(firstRow)[0];
    total = Number(val || 0);
  }

  // dataRes.rows contém os objetos com chaves iguais aos aliases SQL
  const rows: Record<string, string | number | null>[] = dataRes.rows.map((r) => {
    const obj: Record<string, string | number | null> = {};
    for (const key of dataRes.columns) {
      const val = r[key];
      obj[key] = val !== undefined && val !== null ? (val as string | number) : null;
    }
    return obj;
  });

  const elapsedMs = Math.round((performance.now() - t0) * 10) / 10;

  return {
    total,
    limit: query.limit,
    offset: query.offset,
    sortBy: query.sortKey,
    sortDir: query.sortDir,
    elapsedMs,
    rows,
    isStaticFallback: false,
  };
}

export async function getTursoMunicipios(ano: number, turno: number, uf?: string): Promise<BuMunicipioOption[]> {
  const client = getTursoClient();
  const upperUf = (uf || '').trim().toUpperCase();

  const res = upperUf
    ? await client.execute({
        sql: `SELECT sg_uf, cd_municipio, nm_municipio, qt_secoes
              FROM bu_municipio
              WHERE ano = ? AND turno = ? AND sg_uf = ?
              ORDER BY nm_municipio ASC`,
        args: [ano, turno, upperUf],
      })
    : await client.execute({
        sql: `SELECT sg_uf, cd_municipio, nm_municipio, qt_secoes
              FROM bu_municipio
              WHERE ano = ? AND turno = ?
              ORDER BY nm_municipio ASC
              LIMIT 6000`,
        args: [ano, turno],
      });

  return res.rows.map((r) => ({
    sg_uf: String(r.sg_uf || ''),
    cd_municipio: Number(r.cd_municipio || 0),
    nm_municipio: String(r.nm_municipio || ''),
    qt_secoes: Number(r.qt_secoes || 1),
  }));
}

