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

function parseTabular(data: { cols: string[]; rows: (string | number | null)[][] }): Record<string, unknown>[] {
  const { cols, rows } = data;
  const colCount = cols.length;
  const out: Record<string, unknown>[] = new Array(rows.length);
  for (let r = 0; r < rows.length; r++) {
    const rowVals = rows[r];
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < colCount; c++) {
      obj[cols[c]] = rowVals[c];
    }
    out[r] = obj;
  }
  return out;
}

const staticDataCache = new Map<string, Record<string, unknown>[]>();

async function fetchStaticRound(
  level: BuAggregationLevel,
  ano: number,
  turno: number,
  uf?: string
): Promise<Record<string, unknown>[]> {
  if (level === 'uf') {
    const cacheKey = 'uf_summary';
    if (!staticDataCache.has(cacheKey)) {
      const res = await fetch('/data/bu/uf_summary.json');
      if (!res.ok) throw new Error('Resumo de UFs estático não encontrado.');
      const data = (await res.json()) as Record<string, unknown>[];
      staticDataCache.set(cacheKey, data);
    }
    const all = staticDataCache.get(cacheKey)!;
    return all.filter((r) => Number(r.ano) === ano && Number(r.turno) === turno);
  }

  if (level === 'municipio') {
    const cacheKey = `mun_${ano}_${turno}`;
    if (!staticDataCache.has(cacheKey)) {
      const res = await fetch(`/data/bu/municipios/${ano}_${turno}.json`);
      if (!res.ok) throw new Error(`Dados municipais para ${ano} (${turno}ºT) não encontrados.`);
      const raw = (await res.json()) as { cols: string[]; rows: (string | number | null)[][] };
      staticDataCache.set(cacheKey, parseTabular(raw));
    }
    return staticDataCache.get(cacheKey)!;
  }

  if (level === 'zona') {
    const cacheKey = `zona_${ano}_${turno}`;
    if (!staticDataCache.has(cacheKey)) {
      const res = await fetch(`/data/bu/zonas/${ano}_${turno}.json`);
      if (!res.ok) throw new Error(`Dados de zonas para ${ano} (${turno}ºT) não encontrados.`);
      const raw = (await res.json()) as { cols: string[]; rows: (string | number | null)[][] };
      staticDataCache.set(cacheKey, parseTabular(raw));
    }
    return staticDataCache.get(cacheKey)!;
  }

  // level === 'secao' or 'local'
  const stateUf = (uf || 'SP').toUpperCase();
  const cacheKey = `secao_${ano}_${turno}_${stateUf}`;
  if (!staticDataCache.has(cacheKey)) {
    const res = await fetch(`/data/bu/secoes/${ano}_${turno}_${stateUf}.json`);
    if (!res.ok) {
      throw new Error(`Dados de seções eleitorais para ${stateUf} em ${ano} (${turno}ºT) não encontrados.`);
    }
    const raw = (await res.json()) as { cols: string[]; rows: (string | number | null)[][] };
    staticDataCache.set(cacheKey, parseTabular(raw));
  }
  return staticDataCache.get(cacheKey)!;
}

async function queryStaticData(params: BuQueryParams): Promise<BuQueryResponse> {
  const t0 = performance.now();
  const effectiveUf = params.uf || (params.level === 'secao' || params.level === 'local' ? 'SP' : undefined);

  let rawA: Record<string, unknown>[] = [];
  try {
    rawA = await fetchStaticRound(params.level, params.anoA, params.turnoA, effectiveUf);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Falha ao carregar dados estáticos.');
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

  const rowsA = rawA.filter((r) => {
    if (params.uf && String(r.sg_uf) !== params.uf) return false;
    if (params.cdMunicipio && Number(r.cd_municipio) !== params.cdMunicipio) return false;
    if (params.searchMun && !String(r.nm_municipio || '').toUpperCase().includes(params.searchMun.toUpperCase())) return false;
    if (params.zona && Number(r.nr_zona) !== Number(params.zona)) return false;
    if (params.secao && Number(r.nr_secao) !== Number(params.secao)) return false;
    if (params.local && Number(r.nr_local_votacao) !== Number(params.local)) return false;
    if (params.urna && Number(r.nr_urna_efetivada) !== Number(params.urna)) return false;
    if (params.minAptos && Number(r.qt_aptos) < Number(params.minAptos)) return false;
    return true;
  });

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
    let rawB: Record<string, unknown>[] = [];
    try {
      rawB = await fetchStaticRound(params.level, params.anoB, params.turnoB, effectiveUf);
    } catch {
      rawB = [];
    }

    const getJoinKey = (r: Record<string, unknown>): string => {
      if (params.level === 'uf') return String(r.sg_uf);
      if (params.level === 'municipio') return `${r.sg_uf}_${r.cd_municipio}`;
      if (params.level === 'zona') return `${r.sg_uf}_${r.cd_municipio}_${r.nr_zona}`;
      return `${r.sg_uf}_${r.cd_municipio}_${r.nr_zona}_${r.nr_secao}`;
    };

    const mapB = new Map<string, Record<string, unknown>>();
    for (const r of rawB) {
      mapB.set(getJoinKey(r), r);
    }

    for (const a of rowsA) {
      const b = mapB.get(getJoinKey(a));
      if (!b) continue;
      const vA = getCandVotes(a, params.candA);
      const pA = getCandPct(a, params.candA);
      const vB = getCandVotes(b, params.candB);
      const pB = getCandPct(b, params.candB);
      const item: Record<string, string | number | null> = {
        sg_uf: String(a.sg_uf),
        cd_municipio: a.cd_municipio !== undefined ? Number(a.cd_municipio) : null,
        nm_municipio: a.nm_municipio !== undefined ? String(a.nm_municipio) : null,
        nr_zona: a.nr_zona !== undefined ? Number(a.nr_zona) : null,
        nr_secao: a.nr_secao !== undefined ? Number(a.nr_secao) : null,
        nr_local_votacao: a.nr_local_votacao !== undefined ? Number(a.nr_local_votacao) : null,
        nr_urna_efetivada_a: a.nr_urna_efetivada !== undefined ? Number(a.nr_urna_efetivada) : null,
        nr_urna_efetivada_b: b.nr_urna_efetivada !== undefined ? Number(b.nr_urna_efetivada) : null,
        qt_secoes_a: Number(a.qt_secoes ?? 1),
        qt_secoes_b: Number(b.qt_secoes ?? 1),
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

  const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
  return {
    total: built.length,
    limit: params.limit,
    offset: params.offset,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    elapsedMs,
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
        if (data.municipios && data.municipios.length > 0) {
          return data.municipios;
        }
      }
    } catch {
      // Fallback para dataset estático municipal
    }

    try {
      const muns = await fetchStaticRound('municipio', ano, turno);
      const filtered = uf ? muns.filter((m) => String(m.sg_uf) === uf) : muns;
      return filtered.map((m) => ({
        sg_uf: String(m.sg_uf),
        cd_municipio: Number(m.cd_municipio),
        nm_municipio: String(m.nm_municipio),
        qt_secoes: Number(m.qt_secoes || 1),
      }));
    } catch {
      return [];
    }
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
      return queryStaticData(params);
    } catch {
      return queryStaticData(params);
    }
  },
};

