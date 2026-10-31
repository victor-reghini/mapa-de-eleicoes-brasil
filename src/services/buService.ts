export type BuAggregationLevel = 'secao' | 'local' | 'zona' | 'municipio' | 'uf';
export type BuTableMode = 'single' | 'compare';
export type SortDirection = 'asc' | 'desc';

export interface BuCandidateMeta {
  numero: number;
  nome: string;
  partido: string;
  votos: number;
}

export interface BuRoundMeta {
  key: string;
  ano: number;
  turno: number;
  totalSecoes: number;
  totalMunicipios: number;
  totalZonas?: number;
  totalLocais?: number;
  aptos: number;
  comparecimento: number;
  abstencoes: number;
  validos: number;
  brancos: number;
  nulos: number;
  candidatos: BuCandidateMeta[];
}

export interface BuMetaResponse {
  dbReady: boolean;
  generatedAt?: string;
  rounds: BuRoundMeta[];
}

export interface BuMunicipioOption {
  sg_uf: string;
  cd_municipio: number;
  nm_municipio: string;
  qt_secoes: number;
}

export type BuFilterOperator = 'lt' | 'gt' | 'eq' | 'text';

export interface BuColumnFilter {
  col: string;
  op: BuFilterOperator;
  val: string;
}

export interface BuQueryParams {
  level: BuAggregationLevel;
  mode: BuTableMode;
  anoA: number;
  turnoA: number;
  anoB: number;
  turnoB: number;
  candA: number;
  candB: number;
  extraCands: number[];
  uf?: string;
  cdMunicipio?: number;
  searchMun?: string;
  zona?: string;
  secao?: string;
  local?: string;
  urna?: string;
  minAptos?: string;
  colFilters?: BuColumnFilter[];
  sortBy: string;
  sortDir: SortDirection;
  limit: number;
  offset: number;
}

export interface BuQueryResponse {
  total: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortDir: SortDirection;
  elapsedMs: number;
  rows: Record<string, string | number | null>[];
  isStaticFallback?: boolean;
}

let cachedUfSummary: Record<string, unknown>[] | null = null;

async function queryStaticUfFallback(params: BuQueryParams): Promise<BuQueryResponse> {
  if (!cachedUfSummary) {
    const res = await fetch('/data/bu/uf_summary.json');
    if (!res.ok) {
      throw new Error('Dados estáticos de resumo UF não encontrados.');
    }
    cachedUfSummary = (await res.json()) as Record<string, unknown>[];
  }

  const getCandVotes = (row: Record<string, unknown>, nr: number): number => {
    const direct = row[`votos_${nr}`];
    if (typeof direct === 'number') return direct;
    try {
      const parsed = JSON.parse(String(row.votos_json || '{}')) as Record<string, number>;
      return parsed[String(nr)] || 0;
    } catch {
      return 0;
    }
  };

  const getCandPct = (row: Record<string, unknown>, nr: number): number => {
    const direct = row[`pct_${nr}`];
    if (typeof direct === 'number') return direct;
    const val = Number(row.qt_votos_validos || 0);
    return val > 0 ? Math.round((getCandVotes(row, nr) * 10000) / val) / 100 : 0;
  };

  const rowsA = cachedUfSummary.filter(
    (r) =>
      Number(r.ano) === params.anoA &&
      Number(r.turno) === params.turnoA &&
      (!params.uf || String(r.sg_uf) === params.uf)
  );

  let built: Record<string, string | number | null>[] = [];

  if (params.mode === 'single') {
    built = rowsA.map((a) => {
      const out: Record<string, string | number | null> = { ...(a as Record<string, string | number>) };
      delete out.votos_json;
      for (const nr of params.extraCands) {
        out[`cand_${nr}_votos`] = getCandVotes(a, nr);
        out[`cand_${nr}_pct`] = getCandPct(a, nr);
      }
      if (params.extraCands.length >= 2) {
        const [ec1, ec2] = params.extraCands;
        out.dif_par_cands_votos = getCandVotes(a, ec1) - getCandVotes(a, ec2);
        out.dif_par_cands_pct = Math.round((getCandPct(a, ec1) - getCandPct(a, ec2)) * 100) / 100;
      }
      return out;
    });
  } else {
    const mapB = new Map<string, Record<string, unknown>>();
    for (const r of cachedUfSummary) {
      if (Number(r.ano) === params.anoB && Number(r.turno) === params.turnoB) {
        mapB.set(String(r.sg_uf), r);
      }
    }
    for (const a of rowsA) {
      const b = mapB.get(String(a.sg_uf));
      if (!b) continue;
      const vA = getCandVotes(a, params.candA);
      const pA = getCandPct(a, params.candA);
      const vB = getCandVotes(b, params.candB);
      const pB = getCandPct(b, params.candB);
      const item: Record<string, string | number | null> = {
        sg_uf: String(a.sg_uf),
        qt_secoes_a: Number(a.qt_secoes),
        qt_secoes_b: Number(b.qt_secoes),
        qt_aptos_a: Number(a.qt_aptos),
        qt_aptos_b: Number(b.qt_aptos),
        delta_aptos: Number(a.qt_aptos) - Number(b.qt_aptos),
        qt_comparecimento_a: Number(a.qt_comparecimento),
        qt_comparecimento_b: Number(b.qt_comparecimento),
        delta_comparecimento: Number(a.qt_comparecimento) - Number(b.qt_comparecimento),
        pct_comparecimento_a: Number(a.pct_comparecimento),
        pct_comparecimento_b: Number(b.pct_comparecimento),
        delta_pct_comparecimento: Math.round((Number(a.pct_comparecimento) - Number(b.pct_comparecimento)) * 100) / 100,
        qt_abstencoes_a: Number(a.qt_abstencoes),
        qt_abstencoes_b: Number(b.qt_abstencoes),
        delta_abstencoes: Number(a.qt_abstencoes) - Number(b.qt_abstencoes),
        pct_abstencoes_a: Number(a.pct_abstencoes),
        pct_abstencoes_b: Number(b.pct_abstencoes),
        delta_pct_abstencoes: Math.round((Number(a.pct_abstencoes) - Number(b.pct_abstencoes)) * 100) / 100,
        qt_votos_validos_a: Number(a.qt_votos_validos),
        qt_votos_validos_b: Number(b.qt_votos_validos),
        delta_votos_validos: Number(a.qt_votos_validos) - Number(b.qt_votos_validos),
        qt_brancos_a: Number(a.qt_brancos),
        qt_brancos_b: Number(b.qt_brancos),
        delta_brancos: Number(a.qt_brancos) - Number(b.qt_brancos),
        pct_brancos_a: Number(a.pct_brancos),
        pct_brancos_b: Number(b.pct_brancos),
        delta_pct_brancos: Math.round((Number(a.pct_brancos) - Number(b.pct_brancos)) * 100) / 100,
        qt_nulos_a: Number(a.qt_nulos),
        qt_nulos_b: Number(b.qt_nulos),
        delta_nulos: Number(a.qt_nulos) - Number(b.qt_nulos),
        pct_nulos_a: Number(a.pct_nulos),
        pct_nulos_b: Number(b.pct_nulos),
        delta_pct_nulos: Math.round((Number(a.pct_nulos) - Number(b.pct_nulos)) * 100) / 100,
        vencedor_nome_a: String(a.vencedor_nome),
        vencedor_partido_a: String(a.vencedor_partido),
        vencedor_pct_a: Number(a.vencedor_pct),
        vencedor_nome_b: String(b.vencedor_nome),
        vencedor_partido_b: String(b.vencedor_partido),
        vencedor_pct_b: Number(b.vencedor_pct),
        margem_votos_a: Number(a.margem_votos),
        margem_votos_b: Number(b.margem_votos),
        delta_margem_votos: Number(a.margem_votos) - Number(b.margem_votos),
        margem_pct_a: Number(a.margem_pct),
        margem_pct_b: Number(b.margem_pct),
        delta_margem_pct: Math.round((Number(a.margem_pct) - Number(b.margem_pct)) * 100) / 100,
        dif_finalistas_votos_a: Number(a.dif_finalistas_votos ?? 0),
        dif_finalistas_votos_b: Number(b.dif_finalistas_votos ?? 0),
        delta_dif_finalistas_votos: Number(a.dif_finalistas_votos ?? 0) - Number(b.dif_finalistas_votos ?? 0),
        dif_finalistas_pct_a: Number(a.dif_finalistas_pct ?? 0),
        dif_finalistas_pct_b: Number(b.dif_finalistas_pct ?? 0),
        delta_dif_finalistas_pct: Math.round((Number(a.dif_finalistas_pct ?? 0) - Number(b.dif_finalistas_pct ?? 0)) * 100) / 100,
        foco_votos_a: vA,
        foco_pct_a: pA,
        foco_votos_b: vB,
        foco_pct_b: pB,
        delta_foco_votos: vA - vB,
        delta_foco_pct: Math.round((pA - pB) * 100) / 100,
      };
      for (const nr of params.extraCands) {
        const evA = getCandVotes(a, nr);
        const epA = getCandPct(a, nr);
        const evB = getCandVotes(b, nr);
        const epB = getCandPct(b, nr);
        item[`cand_${nr}_votos_a`] = evA;
        item[`cand_${nr}_pct_a`] = epA;
        item[`cand_${nr}_votos_b`] = evB;
        item[`cand_${nr}_pct_b`] = epB;
        item[`delta_cand_${nr}_votos`] = evA - evB;
        item[`delta_cand_${nr}_pct`] = Math.round((epA - epB) * 100) / 100;
      }
      built.push(item);
    }
  }

  if (params.colFilters && params.colFilters.length > 0) {
    built = built.filter((row) =>
      params.colFilters!.every((flt) => {
        const raw = row[flt.col];
        const needle = flt.val.trim();
        if (!needle) return true;
        if (flt.op === 'text') {
          return String(raw ?? '').toUpperCase().includes(needle.toUpperCase());
        }
        const numFilter = Number(needle.replace(',', '.'));
        const numCell = Number(raw);
        if (!Number.isFinite(numFilter) || !Number.isFinite(numCell)) return false;
        if (flt.op === 'lt') return numCell < numFilter;
        if (flt.op === 'gt') return numCell > numFilter;
        return Math.round(numCell * 100) === Math.round(numFilter * 100);
      })
    );
  }

  const dir = params.sortDir === 'asc' ? 1 : -1;
  built.sort((x, y) => {
    const vx = x[params.sortBy];
    const vy = y[params.sortBy];
    if (typeof vx === 'number' && typeof vy === 'number') return (vx - vy) * dir;
    return String(vx ?? '').localeCompare(String(vy ?? ''), 'pt-BR') * dir;
  });

  return {
    total: built.length,
    limit: params.limit,
    offset: params.offset,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    elapsedMs: 1,
    rows: built.slice(params.offset, params.offset + params.limit),
    isStaticFallback: true,
  };
}

export const buService = {
  async getMeta(): Promise<BuMetaResponse> {
    try {
      const res = await fetch('/api/bu/meta');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return (await res.json()) as BuMetaResponse;
      }
    } catch {
      // Fallback para arquivo estático em builds sem middleware Node
    }
    const fallback = await fetch('/data/bu/meta.json');
    if (!fallback.ok) {
      throw new Error('Metadados dos Boletins de Urna indisponíveis.');
    }
    const json = (await fallback.json()) as Omit<BuMetaResponse, 'dbReady'>;
    return { dbReady: false, ...json };
  },

  async getMunicipios(ano: number, turno: number, uf: string): Promise<BuMunicipioOption[]> {
    try {
      const qs = new URLSearchParams({
        ano: String(ano),
        turno: String(turno),
        uf,
      });
      const res = await fetch(`/api/bu/municipios?${qs.toString()}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = (await res.json()) as { municipios: BuMunicipioOption[] };
        return data.municipios || [];
      }
    } catch {
      // Sem lista municipal quando rodando apenas estático
    }
    return [];
  },

  async queryTable(params: BuQueryParams): Promise<BuQueryResponse> {
    const qs = new URLSearchParams({
      level: params.level,
      mode: params.mode,
      anoA: String(params.anoA),
      turnoA: String(params.turnoA),
      anoB: String(params.anoB),
      turnoB: String(params.turnoB),
      candA: String(params.candA),
      candB: String(params.candB),
      sortBy: params.sortBy,
      sortDir: params.sortDir,
      limit: String(params.limit),
      offset: String(params.offset),
    });
    if (params.extraCands.length > 0) qs.set('extraCands', params.extraCands.join(','));
    if (params.uf) qs.set('uf', params.uf);
    if (params.cdMunicipio) qs.set('cdMunicipio', String(params.cdMunicipio));
    if (params.searchMun) qs.set('searchMun', params.searchMun);
    if (params.zona) qs.set('zona', params.zona);
    if (params.secao) qs.set('secao', params.secao);
    if (params.local) qs.set('local', params.local);
    if (params.urna) qs.set('urna', params.urna);
    if (params.minAptos) qs.set('minAptos', params.minAptos);
    if (params.colFilters && params.colFilters.length > 0) {
      qs.set('colFilters', JSON.stringify(params.colFilters));
    }

    try {
      const res = await fetch(`/api/bu/query?${qs.toString()}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        return (await res.json()) as BuQueryResponse;
      }
      if (res.status === 503 && params.level === 'uf') {
        return queryStaticUfFallback(params);
      }
      const errBody = await res.json().catch(() => ({ error: 'Falha ao consultar Boletins de Urna.' }));
      throw new Error(errBody.error || `Erro HTTP ${res.status}`);
    } catch (err) {
      if (params.level === 'uf') {
        return queryStaticUfFallback(params);
      }
      throw err;
    }
  },
};

