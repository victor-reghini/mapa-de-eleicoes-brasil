import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Filter,
  GitCompare,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react';
import {
  buService,
  type BuAggregationLevel,
  type BuCandidateMeta,
  type BuColumnFilter,
  type BuFilterOperator,
  type BuMetaResponse,
  type BuMunicipioOption,
  type BuRoundMeta,
  type BuTableMode,
  type SortDirection,
} from '../services/buService';

interface BoletinsUrnaViewProps {
  initialAno: number;
  initialTurno: number;
  selectedUf: string | null;
  onSelectUf: (uf: string) => void;
  onSelectAno?: (ano: number) => void;
  onSelectTurno?: (turno: number) => void;
}

type ColFormat = 'text' | 'int' | 'pct' | 'delta_int' | 'delta_pct' | 'code' | 'num_code';

interface ColumnDef {
  id: string;
  label: string;
  group: 'identificacao' | 'participacao' | 'votacao' | 'preprocessados' | 'auditoria' | 'candidatos';
  format: ColFormat;
  align: 'left' | 'right';
  levels?: BuAggregationLevel[];
}

function isNumericFilterFormat(format: ColFormat): boolean {
  return (
    format === 'int' ||
    format === 'pct' ||
    format === 'delta_int' ||
    format === 'delta_pct' ||
    format === 'num_code'
  );
}

const FINALIST_LABELS_BY_YEAR: Record<number, { c1: string; c2: string; nr1: number; nr2: number }> = {
  2026: { c1: 'Lula (13)', c2: 'Flávio B. (22)', nr1: 13, nr2: 22 },
  2022: { c1: 'Lula (13)', c2: 'Bolsonaro (22)', nr1: 13, nr2: 22 },
  2018: { c1: 'Bolsonaro (17)', c2: 'Haddad (13)', nr1: 17, nr2: 13 },
  2014: { c1: 'Dilma (13)', c2: 'Aécio (45)', nr1: 13, nr2: 45 },
};

const UFS_LIST = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO', 'ZZ',
];

const LEVEL_LABELS: Record<BuAggregationLevel, string> = {
  secao: 'Seção Eleitoral (BU)',
  local: 'Local de Votação',
  zona: 'Zona Eleitoral',
  municipio: 'Município / Exterior',
  uf: 'Estado (UF + ZZ)',
};

const SINGLE_BASE_COLUMNS: ColumnDef[] = [
  { id: 'sg_uf', label: 'UF', group: 'identificacao', format: 'code', align: 'left' },
  { id: 'cd_municipio', label: 'Cód. TSE Mun.', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local', 'zona', 'municipio'] },
  { id: 'nm_municipio', label: 'Município', group: 'identificacao', format: 'text', align: 'left', levels: ['secao', 'local', 'zona', 'municipio'] },
  { id: 'nr_zona', label: 'Zona', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local', 'zona'] },
  { id: 'nr_local_votacao', label: 'Local Votação', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local'] },
  { id: 'nr_secao', label: 'Seção', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao'] },
  { id: 'ds_secoes_agregadas', label: 'Seções Agregadas', group: 'identificacao', format: 'text', align: 'left', levels: ['secao'] },
  { id: 'qt_municipios', label: 'Municípios', group: 'identificacao', format: 'int', align: 'right', levels: ['uf'] },
  { id: 'qt_zonas', label: 'Zonas', group: 'identificacao', format: 'int', align: 'right', levels: ['uf', 'municipio'] },
  { id: 'qt_locais', label: 'Locais', group: 'identificacao', format: 'int', align: 'right', levels: ['uf', 'municipio', 'zona'] },
  { id: 'qt_secoes', label: 'Seções (BUs)', group: 'identificacao', format: 'int', align: 'right', levels: ['uf', 'municipio', 'zona', 'local'] },

  { id: 'qt_aptos', label: 'Aptos', group: 'participacao', format: 'int', align: 'right' },
  { id: 'qt_comparecimento', label: 'Comparecimento', group: 'participacao', format: 'int', align: 'right' },
  { id: 'pct_comparecimento', label: '% Comparec.', group: 'participacao', format: 'pct', align: 'right' },
  { id: 'qt_abstencoes', label: 'Abstenções', group: 'participacao', format: 'int', align: 'right' },
  { id: 'pct_abstencoes', label: '% Abstenção', group: 'participacao', format: 'pct', align: 'right' },
  { id: 'qt_biometria_nh', label: 'Biometria s/ Hab.', group: 'participacao', format: 'int', align: 'right' },

  { id: 'qt_votos_validos', label: 'Votos Válidos', group: 'votacao', format: 'int', align: 'right' },
  { id: 'pct_validos', label: '% Válidos', group: 'votacao', format: 'pct', align: 'right' },
  { id: 'qt_brancos', label: 'Brancos', group: 'votacao', format: 'int', align: 'right' },
  { id: 'pct_brancos', label: '% Brancos', group: 'votacao', format: 'pct', align: 'right' },
  { id: 'qt_nulos', label: 'Nulos', group: 'votacao', format: 'int', align: 'right' },
  { id: 'pct_nulos', label: '% Nulos', group: 'votacao', format: 'pct', align: 'right' },
  { id: 'qt_total_votos', label: 'Total Votos', group: 'votacao', format: 'int', align: 'right' },
  { id: 'vencedor_nome', label: '1º Colocado', group: 'votacao', format: 'text', align: 'left' },
  { id: 'vencedor_partido', label: 'Partido 1º', group: 'votacao', format: 'code', align: 'left' },
  { id: 'vencedor_votos', label: 'Votos 1º', group: 'votacao', format: 'int', align: 'right' },
  { id: 'vencedor_pct', label: '% 1º (Válidos)', group: 'votacao', format: 'pct', align: 'right' },
  { id: 'segundo_nome', label: '2º Colocado', group: 'votacao', format: 'text', align: 'left' },
  { id: 'segundo_votos', label: 'Votos 2º', group: 'votacao', format: 'int', align: 'right' },
  { id: 'segundo_pct', label: '% 2º (Válidos)', group: 'votacao', format: 'pct', align: 'right' },

  { id: 'nr_urna_efetivada', label: 'Nº Urna', group: 'auditoria', format: 'num_code', align: 'right', levels: ['secao'] },
  { id: 'ds_tipo_urna', label: 'Status Urna', group: 'auditoria', format: 'text', align: 'left', levels: ['secao'] },
  { id: 'cd_flashcard', label: 'Flashcard', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'cd_carga_1', label: 'Código Carga 1', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'dt_carga_urna', label: 'Data Carga', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'dt_abertura', label: 'Abertura Urna', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'dt_encerramento', label: 'Encerramento', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'dt_emissao_bu', label: 'Emissão BU', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
  { id: 'dt_bu_recebido', label: 'Recebimento TSE', group: 'auditoria', format: 'code', align: 'left', levels: ['secao'] },
];

const DEFAULT_SINGLE_SELECTED = [
  'sg_uf',
  'nm_municipio',
  'nr_zona',
  'nr_secao',
  'qt_secoes',
  'qt_aptos',
  'qt_comparecimento',
  'pct_comparecimento',
  'qt_votos_validos',
  'vencedor_nome',
  'margem_votos',
  'margem_pct',
  'dif_finalistas_votos',
  'dif_turno_comparecimento',
  'dif_turno_cand1_votos',
  'dif_turno_cand2_votos',
  'nr_urna_efetivada',
];

const DEFAULT_COMPARE_SELECTED = [
  'sg_uf',
  'nm_municipio',
  'nr_zona',
  'nr_secao',
  'qt_secoes_a',
  'foco_votos_a',
  'foco_pct_a',
  'foco_votos_b',
  'foco_pct_b',
  'delta_foco_votos',
  'delta_foco_pct',
  'margem_votos_a',
  'margem_votos_b',
  'delta_margem_votos',
  'delta_comparecimento',
  'delta_pct_comparecimento',
  'vencedor_nome_a',
  'vencedor_nome_b',
];

const intFmt = new Intl.NumberFormat('pt-BR');
const pctFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatCellValue(val: string | number | null | undefined, format: ColFormat): string {
  if (val === null || val === undefined || val === '') return 'N/D';
  if (format === 'text' || format === 'code' || format === 'num_code') {
    if (typeof val === 'number' && val === 0) return 'N/D';
    return String(val);
  }
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  if (format === 'int') return intFmt.format(num);
  if (format === 'pct') return `${pctFmt.format(num)}%`;
  if (format === 'delta_int') {
    const prefix = num > 0 ? '+' : '';
    return `${prefix}${intFmt.format(num)}`;
  }
  if (format === 'delta_pct') {
    const prefix = num > 0 ? '+' : '';
    return `${prefix}${pctFmt.format(num)} p.p.`;
  }
  return String(val);
}

export const BoletinsUrnaView: React.FC<BoletinsUrnaViewProps> = ({
  initialAno,
  initialTurno,
  selectedUf,
  onSelectUf,
  onSelectAno,
  onSelectTurno,
}) => {
  const normalizedInitialAno = [2026, 2022, 2018, 2014].includes(initialAno) ? initialAno : 2026;

  const [meta, setMeta] = useState<BuMetaResponse | null>(null);
  const [level, setLevel] = useState<BuAggregationLevel>('secao');
  const [mode, setMode] = useState<BuTableMode>('single');

  const [roundKeyA, setRoundKeyA] = useState<string>(`${normalizedInitialAno}_${initialTurno}`);
  const [roundKeyB, setRoundKeyB] = useState<string>(
    initialTurno === 2 ? `${normalizedInitialAno}_1` : '2022_1'
  );

  const [candA, setCandA] = useState<number>(13);
  const [candB, setCandB] = useState<number>(13);
  const [extraCands, setExtraCands] = useState<number[]>([13, 22]);

  const [ufFilter, setUfFilter] = useState<string>(selectedUf || '');
  const [municipiosList, setMunicipiosList] = useState<BuMunicipioOption[]>([]);
  const [cdMunicipio, setCdMunicipio] = useState<number>(0);
  const [searchMun, setSearchMun] = useState<string>('');
  const [zonaInput, setZonaInput] = useState<string>('');
  const [secaoInput, setSecaoInput] = useState<string>('');
  const [localInput, setLocalInput] = useState<string>('');
  const [urnaInput, setUrnaInput] = useState<string>('');
  const [minAptosInput, setMinAptosInput] = useState<string>('');
  const [colFilterDraft, setColFilterDraft] = useState<Record<string, { op: BuFilterOperator; val: string }>>({});

  const [selectedSingleCols, setSelectedSingleCols] = useState<string[]>(DEFAULT_SINGLE_SELECTED);
  const [selectedCompareCols, setSelectedCompareCols] = useState<string[]>(DEFAULT_COMPARE_SELECTED);
  const [isColModalOpen, setIsColModalOpen] = useState<boolean>(false);
  const [activeFilterColId, setActiveFilterColId] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(true);

  const [sortBy, setSortBy] = useState<string>('qt_comparecimento');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState<number>(100);
  const [pageIndex, setPageIndex] = useState<number>(0);

  const [rows, setRows] = useState<Record<string, string | number | null>[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isStaticFallback, setIsStaticFallback] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState<number>(0);

  // Sync UF when parent breadcrumb changes
  useEffect(() => {
    setUfFilter(selectedUf || '');
    setCdMunicipio(0);
    setPageIndex(0);
  }, [selectedUf]);

  // Close column drawer on Escape
  useEffect(() => {
    if (!isColModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsColModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isColModalOpen]);

  // Close active column filter popup on click outside or Escape
  useEffect(() => {
    if (!activeFilterColId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.bu-filter-popover') && !target?.closest('.bu-th-filter-trigger')) {
        setActiveFilterColId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveFilterColId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFilterColId]);

  // Load BU metadata
  useEffect(() => {
    let active = true;
    buService
      .getMeta()
      .then((res) => {
        if (!active) return;
        setMeta(res);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Falha ao carregar metadados dos Boletins de Urna.');
      });
    return () => {
      active = false;
    };
  }, []);

  const [anoA, turnoA] = useMemo(() => {
    const [y, t] = roundKeyA.split('_').map(Number);
    return [y || 2026, t || 2];
  }, [roundKeyA]);

  const [anoB, turnoB] = useMemo(() => {
    const [y, t] = roundKeyB.split('_').map(Number);
    return [y || 2026, t || 1];
  }, [roundKeyB]);

  const roundMetaA: BuRoundMeta | undefined = useMemo(
    () => meta?.rounds.find((r) => r.ano === anoA && r.turno === turnoA),
    [meta, anoA, turnoA]
  );

  const roundMetaB: BuRoundMeta | undefined = useMemo(
    () => meta?.rounds.find((r) => r.ano === anoB && r.turno === turnoB),
    [meta, anoB, turnoB]
  );

  // Adjust default candidate numbers when rounds change so selected numbers exist in that round
  useEffect(() => {
    if (roundMetaA && roundMetaA.candidatos.length > 0) {
      const existsA = roundMetaA.candidatos.some((c) => c.numero === candA);
      if (!existsA) {
        setCandA(roundMetaA.candidatos[0].numero);
      }
      const topTwo = roundMetaA.candidatos.slice(0, 2).map((c) => c.numero);
      setExtraCands((prev) => {
        const validPrev = prev.filter((n) => roundMetaA.candidatos.some((c) => c.numero === n));
        if (validPrev.length === prev.length && prev.length > 0) return prev;
        return validPrev.length > 0 ? validPrev : topTwo;
      });
    }
  }, [roundMetaA, candA]);

  useEffect(() => {
    if (roundMetaB && roundMetaB.candidatos.length > 0) {
      const sameNum = roundMetaB.candidatos.find((c) => c.numero === candA);
      const existsB = roundMetaB.candidatos.some((c) => c.numero === candB);
      if (!existsB) {
        setCandB(sameNum ? sameNum.numero : roundMetaB.candidatos[0].numero);
      }
    }
  }, [roundMetaB, candA, candB]);

  // Load municipality dropdown when UF changes
  useEffect(() => {
    if (!ufFilter) {
      setMunicipiosList([]);
      return;
    }
    let active = true;
    buService.getMunicipios(anoA, turnoA, ufFilter).then((list) => {
      if (active) setMunicipiosList(list);
    });
    return () => {
      active = false;
    };
  }, [anoA, turnoA, ufFilter]);

  const candLabelA = useMemo(() => {
    const found = roundMetaA?.candidatos.find((c) => c.numero === candA);
    return found ? `${found.nome} (${found.numero})` : `Nº ${candA}`;
  }, [roundMetaA, candA]);

  const candLabelB = useMemo(() => {
    const found = roundMetaB?.candidatos.find((c) => c.numero === candB);
    return found ? `${found.nome} (${found.numero})` : `Nº ${candB}`;
  }, [roundMetaB, candB]);

  const labelA = `${anoA} ${turnoA}ºT`;
  const labelB = `${anoB} ${turnoB}ºT`;

  // Build full catalog of available columns for current mode + level + selected candidates
  const allAvailableColumns: ColumnDef[] = useMemo(() => {
    const fin = FINALIST_LABELS_BY_YEAR[anoA] || FINALIST_LABELS_BY_YEAR[2026];

    if (mode === 'single') {
      const base = SINGLE_BASE_COLUMNS.filter((c) => !c.levels || c.levels.includes(level));
      const preCols: ColumnDef[] = [
        { id: 'margem_votos', label: 'Dif. Votos (1º - 2º)', group: 'preprocessados', format: 'int', align: 'right' },
        { id: 'margem_pct', label: 'Dif. p.p. (1º - 2º)', group: 'preprocessados', format: 'pct', align: 'right' },
        { id: 'dif_finalistas_votos', label: `Dif. Votos (${fin.c1} - ${fin.c2})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_finalistas_pct', label: `Dif. p.p. (${fin.c1} - ${fin.c2})`, group: 'preprocessados', format: 'delta_pct', align: 'right' },
        { id: 'dif_turno_comparecimento', label: 'Dif. Comparec. (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_pct_comparecimento', label: 'Dif. p.p. Comparec. (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_pct', align: 'right' },
        { id: 'dif_turno_validos', label: 'Dif. Votos Válidos (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_abstencoes', label: 'Dif. Abstenções (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_brancos_nulos', label: 'Dif. Brancos+Nulos (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_cand1_votos', label: `Dif. Votos ${fin.c1} (2ºT - 1ºT)`, group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_cand1_pct', label: `Dif. p.p. ${fin.c1} (2ºT - 1ºT)`, group: 'preprocessados', format: 'delta_pct', align: 'right' },
        { id: 'dif_turno_cand2_votos', label: `Dif. Votos ${fin.c2} (2ºT - 1ºT)`, group: 'preprocessados', format: 'delta_int', align: 'right' },
        { id: 'dif_turno_cand2_pct', label: `Dif. p.p. ${fin.c2} (2ºT - 1ºT)`, group: 'preprocessados', format: 'delta_pct', align: 'right' },
        { id: 'dif_turno_saldo_finalistas', label: 'Dif. Saldo Finalistas (2ºT - 1ºT)', group: 'preprocessados', format: 'delta_int', align: 'right' },
      ];
      const candCols: ColumnDef[] = [];
      const candsSource: BuCandidateMeta[] = roundMetaA?.candidatos || [];
      for (const nr of extraCands) {
        const metaCand = candsSource.find((c) => c.numero === nr);
        const shortName = metaCand ? `${metaCand.nome} (${nr})` : `Cand. ${nr}`;
        candCols.push(
          { id: `cand_${nr}_votos`, label: `Votos ${shortName}`, group: 'candidatos', format: 'int', align: 'right' },
          { id: `cand_${nr}_pct`, label: `% ${shortName}`, group: 'candidatos', format: 'pct', align: 'right' }
        );
      }
      if (extraCands.length >= 2) {
        const [ec1, ec2] = extraCands;
        if (!(ec1 === fin.nr1 && ec2 === fin.nr2)) {
          preCols.push(
            { id: 'dif_par_cands_votos', label: `Dif. Votos (Nº ${ec1} - Nº ${ec2})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
            { id: 'dif_par_cands_pct', label: `Dif. p.p. (Nº ${ec1} - Nº ${ec2})`, group: 'preprocessados', format: 'delta_pct', align: 'right' }
          );
        }
      }
      return [...base, ...candCols, ...preCols];
    }

    const compareCols: ColumnDef[] = [
      { id: 'sg_uf', label: 'UF', group: 'identificacao', format: 'code', align: 'left' },
      { id: 'cd_municipio', label: 'Cód. TSE Mun.', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local', 'zona', 'municipio'] },
      { id: 'nm_municipio', label: 'Município', group: 'identificacao', format: 'text', align: 'left', levels: ['secao', 'local', 'zona', 'municipio'] },
      { id: 'nr_zona', label: 'Zona', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local', 'zona'] },
      { id: 'nr_local_votacao', label: 'Local Votação', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao', 'local'] },
      { id: 'nr_secao', label: 'Seção', group: 'identificacao', format: 'num_code', align: 'right', levels: ['secao'] },
      { id: 'qt_secoes_a', label: `Seções (${labelA})`, group: 'identificacao', format: 'int', align: 'right', levels: ['uf', 'municipio', 'zona', 'local'] },
      { id: 'qt_secoes_b', label: `Seções (${labelB})`, group: 'identificacao', format: 'int', align: 'right', levels: ['uf', 'municipio', 'zona', 'local'] },

      { id: 'foco_votos_a', label: `Votos ${candLabelA} [${labelA}]`, group: 'candidatos', format: 'int', align: 'right' },
      { id: 'foco_pct_a', label: `% ${candLabelA} [${labelA}]`, group: 'candidatos', format: 'pct', align: 'right' },
      { id: 'foco_votos_b', label: `Votos ${candLabelB} [${labelB}]`, group: 'candidatos', format: 'int', align: 'right' },
      { id: 'foco_pct_b', label: `% ${candLabelB} [${labelB}]`, group: 'candidatos', format: 'pct', align: 'right' },
      { id: 'delta_foco_votos', label: `Dif. Votos (${labelA} - ${labelB})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'delta_foco_pct', label: `Dif. p.p. (${labelA} - ${labelB})`, group: 'preprocessados', format: 'delta_pct', align: 'right' },

      { id: 'margem_votos_a', label: `Dif. Votos 1º-2º (${labelA})`, group: 'preprocessados', format: 'int', align: 'right' },
      { id: 'margem_votos_b', label: `Dif. Votos 1º-2º (${labelB})`, group: 'preprocessados', format: 'int', align: 'right' },
      { id: 'delta_margem_votos', label: `Dif. Margem Votos (${labelA} - ${labelB})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'margem_pct_a', label: `Margem p.p. (${labelA})`, group: 'preprocessados', format: 'pct', align: 'right' },
      { id: 'margem_pct_b', label: `Margem p.p. (${labelB})`, group: 'preprocessados', format: 'pct', align: 'right' },
      { id: 'delta_margem_pct', label: `Dif. Margem p.p.`, group: 'preprocessados', format: 'delta_pct', align: 'right' },
      { id: 'dif_finalistas_votos_a', label: `Dif. Finalistas (${labelA})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'dif_finalistas_votos_b', label: `Dif. Finalistas (${labelB})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'delta_dif_finalistas_votos', label: `Dif. Saldo Finalistas (${labelA} - ${labelB})`, group: 'preprocessados', format: 'delta_int', align: 'right' },

      { id: 'qt_aptos_a', label: `Aptos (${labelA})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'qt_aptos_b', label: `Aptos (${labelB})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'delta_aptos', label: `Dif. Aptos`, group: 'preprocessados', format: 'delta_int', align: 'right' },

      { id: 'qt_comparecimento_a', label: `Comparec. (${labelA})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'qt_comparecimento_b', label: `Comparec. (${labelB})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'delta_comparecimento', label: `Dif. Comparec. (${labelA} - ${labelB})`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'pct_comparecimento_a', label: `% Comparec. (${labelA})`, group: 'participacao', format: 'pct', align: 'right' },
      { id: 'pct_comparecimento_b', label: `% Comparec. (${labelB})`, group: 'participacao', format: 'pct', align: 'right' },
      { id: 'delta_pct_comparecimento', label: `Dif. p.p. Comparec.`, group: 'preprocessados', format: 'delta_pct', align: 'right' },

      { id: 'qt_abstencoes_a', label: `Abstenções (${labelA})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'qt_abstencoes_b', label: `Abstenções (${labelB})`, group: 'participacao', format: 'int', align: 'right' },
      { id: 'delta_abstencoes', label: `Dif. Abstenções`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'pct_abstencoes_a', label: `% Abstenção (${labelA})`, group: 'participacao', format: 'pct', align: 'right' },
      { id: 'pct_abstencoes_b', label: `% Abstenção (${labelB})`, group: 'participacao', format: 'pct', align: 'right' },
      { id: 'delta_pct_abstencoes', label: `Dif. p.p. Abstenção`, group: 'preprocessados', format: 'delta_pct', align: 'right' },

      { id: 'qt_votos_validos_a', label: `Válidos (${labelA})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'qt_votos_validos_b', label: `Válidos (${labelB})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'delta_votos_validos', label: `Dif. Votos Válidos`, group: 'preprocessados', format: 'delta_int', align: 'right' },

      { id: 'qt_brancos_a', label: `Brancos (${labelA})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'qt_brancos_b', label: `Brancos (${labelB})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'delta_brancos', label: `Dif. Votos Brancos`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'pct_brancos_a', label: `% Brancos (${labelA})`, group: 'votacao', format: 'pct', align: 'right' },
      { id: 'pct_brancos_b', label: `% Brancos (${labelB})`, group: 'votacao', format: 'pct', align: 'right' },
      { id: 'delta_pct_brancos', label: `Dif. p.p. Brancos`, group: 'preprocessados', format: 'delta_pct', align: 'right' },

      { id: 'qt_nulos_a', label: `Nulos (${labelA})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'qt_nulos_b', label: `Nulos (${labelB})`, group: 'votacao', format: 'int', align: 'right' },
      { id: 'delta_nulos', label: `Dif. Votos Nulos`, group: 'preprocessados', format: 'delta_int', align: 'right' },
      { id: 'pct_nulos_a', label: `% Nulos (${labelA})`, group: 'votacao', format: 'pct', align: 'right' },
      { id: 'pct_nulos_b', label: `% Nulos (${labelB})`, group: 'votacao', format: 'pct', align: 'right' },
      { id: 'delta_pct_nulos', label: `Dif. p.p. Nulos`, group: 'preprocessados', format: 'delta_pct', align: 'right' },

      { id: 'vencedor_nome_a', label: `1º Colocado (${labelA})`, group: 'votacao', format: 'text', align: 'left' },
      { id: 'vencedor_pct_a', label: `% 1º (${labelA})`, group: 'votacao', format: 'pct', align: 'right' },
      { id: 'vencedor_nome_b', label: `1º Colocado (${labelB})`, group: 'votacao', format: 'text', align: 'left' },
      { id: 'vencedor_pct_b', label: `% 1º (${labelB})`, group: 'votacao', format: 'pct', align: 'right' },

      { id: 'nr_urna_efetivada_a', label: `Urna (${labelA})`, group: 'auditoria', format: 'num_code', align: 'right', levels: ['secao'] },
      { id: 'nr_urna_efetivada_b', label: `Urna (${labelB})`, group: 'auditoria', format: 'num_code', align: 'right', levels: ['secao'] },
    ];

    return compareCols.filter((c) => !c.levels || c.levels.includes(level));
  }, [mode, level, anoA, extraCands, roundMetaA, candLabelA, candLabelB, labelA, labelB]);

  const visibleColumns: ColumnDef[] = useMemo(() => {
    const activeSet = new Set(mode === 'single' ? selectedSingleCols : selectedCompareCols);
    const filtered = allAvailableColumns.filter(
      (c) => activeSet.has(c.id) || (mode === 'single' && c.group === 'candidatos')
    );
    return filtered.length > 0 ? filtered : allAvailableColumns.slice(0, 8);
  }, [allAvailableColumns, mode, selectedSingleCols, selectedCompareCols]);

  // Ensure sortBy stays valid when switching modes/levels
  useEffect(() => {
    if (!allAvailableColumns.some((c) => c.id === sortBy)) {
      const nextSort = mode === 'compare' ? 'delta_foco_pct' : 'qt_comparecimento';
      setSortBy(allAvailableColumns.some((c) => c.id === nextSort) ? nextSort : allAvailableColumns[0]?.id || 'sg_uf');
    }
  }, [allAvailableColumns, mode, sortBy]);

  const activeColFilters: BuColumnFilter[] = useMemo(() => {
    const validIds = new Set(allAvailableColumns.map((c) => c.id));
    const list: BuColumnFilter[] = [];
    for (const [colId, item] of Object.entries(colFilterDraft)) {
      const trimmed = item.val.trim();
      if (!trimmed || !validIds.has(colId)) continue;
      if (item.op !== 'text') {
        const parsed = Number(trimmed.replace(',', '.'));
        if (!Number.isFinite(parsed)) continue;
      }
      list.push({ col: colId, op: item.op, val: trimmed });
    }
    return list;
  }, [colFilterDraft, allAvailableColumns]);

  const updateColFilter = useCallback((col: ColumnDef, nextOp?: BuFilterOperator, nextVal?: string) => {
    setPageIndex(0);
    const defaultOp: BuFilterOperator = isNumericFilterFormat(col.format) ? 'gt' : 'text';
    setColFilterDraft((prev) => {
      const cur = prev[col.id] || { op: defaultOp, val: '' };
      return {
        ...prev,
        [col.id]: {
          op: nextOp ?? cur.op,
          val: nextVal !== undefined ? nextVal : cur.val,
        },
      };
    });
  }, []);

  // Execute debounced table query
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setErrorMsg(null);

      buService
        .queryTable({
          level,
          mode,
          anoA,
          turnoA,
          anoB,
          turnoB,
          candA,
          candB,
          extraCands,
          uf: ufFilter || undefined,
          cdMunicipio: cdMunicipio || undefined,
          searchMun: searchMun.trim() || undefined,
          zona: zonaInput.trim() || undefined,
          secao: secaoInput.trim() || undefined,
          local: localInput.trim() || undefined,
          urna: urnaInput.trim() || undefined,
          minAptos: minAptosInput.trim() || undefined,
          colFilters: activeColFilters.length > 0 ? activeColFilters : undefined,
          sortBy,
          sortDir,
          limit: pageSize,
          offset: pageIndex * pageSize,
        })
        .then((res) => {
          if (!active) return;
          setRows(res.rows);
          setTotalRows(res.total);
          setElapsedMs(res.elapsedMs);
          setIsStaticFallback(Boolean(res.isStaticFallback));
          setIsLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setErrorMsg(err instanceof Error ? err.message : 'Erro ao executar consulta de Boletins de Urna.');
          setRows([]);
          setTotalRows(0);
          setIsLoading(false);
        });
    }, 140);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    level,
    mode,
    anoA,
    turnoA,
    anoB,
    turnoB,
    candA,
    candB,
    extraCands,
    ufFilter,
    cdMunicipio,
    searchMun,
    zonaInput,
    secaoInput,
    localInput,
    urnaInput,
    minAptosInput,
    activeColFilters,
    sortBy,
    sortDir,
    pageSize,
    pageIndex,
    reloadTick,
  ]);

  const handleSortColumn = useCallback(
    (col: ColumnDef) => {
      setPageIndex(0);
      if (sortBy === col.id) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(col.id);
        setSortDir(col.format === 'text' || col.id === 'sg_uf' ? 'asc' : 'desc');
      }
    },
    [sortBy]
  );

  const toggleColumnSelection = (colId: string) => {
    if (mode === 'single') {
      setSelectedSingleCols((prev) =>
        prev.includes(colId) ? (prev.length > 1 ? prev.filter((x) => x !== colId) : prev) : [...prev, colId]
      );
    } else {
      setSelectedCompareCols((prev) =>
        prev.includes(colId) ? (prev.length > 1 ? prev.filter((x) => x !== colId) : prev) : [...prev, colId]
      );
    }
  };

  const toggleExtraCandidate = (nr: number) => {
    setExtraCands((prev) => (prev.includes(nr) ? prev.filter((n) => n !== nr) : [...prev, nr]));
  };

  const applyPreset = (
    preset: 'geral' | 'diferencas' | 'participacao' | 'auditoria' | 'turno_vs_turno' | 'eleicao_vs_eleicao'
  ) => {
    setPageIndex(0);
    if (preset === 'geral') {
      setMode('single');
      setSelectedSingleCols(DEFAULT_SINGLE_SELECTED);
    } else if (preset === 'diferencas') {
      setMode('single');
      setSelectedSingleCols([
        'sg_uf',
        'nm_municipio',
        'nr_zona',
        'nr_secao',
        'qt_secoes',
        'vencedor_nome',
        'margem_votos',
        'margem_pct',
        'dif_finalistas_votos',
        'dif_finalistas_pct',
        'dif_turno_comparecimento',
        'dif_turno_pct_comparecimento',
        'dif_turno_cand1_votos',
        'dif_turno_cand2_votos',
        'dif_turno_saldo_finalistas',
      ]);
      setSortBy('dif_turno_saldo_finalistas');
      setSortDir('desc');
    } else if (preset === 'participacao') {
      setMode('single');
      setSelectedSingleCols([
        'sg_uf',
        'nm_municipio',
        'nr_zona',
        'nr_secao',
        'qt_secoes',
        'qt_aptos',
        'qt_comparecimento',
        'pct_comparecimento',
        'qt_abstencoes',
        'pct_abstencoes',
        'qt_biometria_nh',
        'qt_brancos',
        'pct_brancos',
        'qt_nulos',
        'pct_nulos',
      ]);
      setSortBy('pct_abstencoes');
      setSortDir('desc');
    } else if (preset === 'auditoria') {
      setMode('single');
      setLevel('secao');
      setSelectedSingleCols([
        'sg_uf',
        'nm_municipio',
        'nr_zona',
        'nr_secao',
        'nr_local_votacao',
        'nr_urna_efetivada',
        'ds_tipo_urna',
        'cd_flashcard',
        'cd_carga_1',
        'dt_carga_urna',
        'dt_abertura',
        'dt_encerramento',
        'dt_emissao_bu',
        'dt_bu_recebido',
        'qt_comparecimento',
        'vencedor_nome',
      ]);
      setSortBy('nr_urna_efetivada');
      setSortDir('asc');
    } else if (preset === 'turno_vs_turno') {
      setMode('compare');
      setRoundKeyA(`${anoA}_2`);
      setRoundKeyB(`${anoA}_1`);
      onSelectTurno?.(2);
      setSelectedCompareCols(DEFAULT_COMPARE_SELECTED);
      setSortBy('delta_foco_pct');
      setSortDir('desc');
    } else if (preset === 'eleicao_vs_eleicao') {
      setMode('compare');
      setRoundKeyA('2026_2');
      setRoundKeyB('2022_2');
      onSelectAno?.(2026);
      onSelectTurno?.(2);
      setCandA(13);
      setCandB(13);
      setSelectedCompareCols(DEFAULT_COMPARE_SELECTED);
      setSortBy('delta_foco_pct');
      setSortDir('desc');
    }
  };

  const handleClearFilters = () => {
    setUfFilter('');
    onSelectUf('');
    setCdMunicipio(0);
    setSearchMun('');
    setZonaInput('');
    setSecaoInput('');
    setLocalInput('');
    setUrnaInput('');
    setMinAptosInput('');
    setColFilterDraft({});
    setPageIndex(0);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await buService.queryTable({
        level,
        mode,
        anoA,
        turnoA,
        anoB,
        turnoB,
        candA,
        candB,
        extraCands,
        uf: ufFilter || undefined,
        cdMunicipio: cdMunicipio || undefined,
        searchMun: searchMun.trim() || undefined,
        zona: zonaInput.trim() || undefined,
        secao: secaoInput.trim() || undefined,
        local: localInput.trim() || undefined,
        urna: urnaInput.trim() || undefined,
        minAptos: minAptosInput.trim() || undefined,
        colFilters: activeColFilters.length > 0 ? activeColFilters : undefined,
        sortBy,
        sortDir,
        limit: 5000,
        offset: 0,
      });

      const headerLine = visibleColumns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(';');
      const dataLines = res.rows.map((r) =>
        visibleColumns
          .map((c) => {
            const raw = r[c.id];
            if (raw === null || raw === undefined) return '""';
            return typeof raw === 'number' ? String(raw) : `"${String(raw).replace(/"/g, '""')}"`;
          })
          .join(';')
      );
      const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const suffix = mode === 'compare' ? `${roundKeyA}_vs_${roundKeyB}` : roundKeyA;
      link.download = `boletins_urna_${level}_${suffix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao exportar CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const activeFilterCount =
    [
      ufFilter,
      cdMunicipio,
      searchMun,
      zonaInput,
      secaoInput,
      localInput,
      urnaInput,
      minAptosInput,
    ].filter(Boolean).length + activeColFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <section className="bu-workspace" aria-label="Explorador Tabular de Boletins de Urna">
      {/* Barra Superior de Modo, Pleitos e Presets */}
      <div className={`bu-top-panel ${!isFiltersOpen ? 'is-collapsed' : ''}`}>
        <div className="bu-top-header-row">
          <div className="bu-title-block">
            <h2>
              <Table2 size={18} />
              <span>Boletins de Urna por Seção Eleitoral (Presidente: 2014 a 2026)</span>
            </h2>
            {isFiltersOpen && (
              <p className="bu-subtitle">
                Monte tabelas customizadas a partir dos 3.709.071 boletins oficiais do TSE, compare turnos ou eleições e ordene qualquer coluna.
              </p>
            )}
          </div>

          <div className="bu-mode-actions">
            <div className="bu-segmented" role="group" aria-label="Modo da tabela">
              <button
                type="button"
                className={`bu-seg-btn ${mode === 'single' ? 'active' : ''}`}
                onClick={() => {
                  setMode('single');
                  setPageIndex(0);
                }}
              >
                <Table2 size={15} />
                <span>Pleito Único</span>
              </button>
              <button
                type="button"
                className={`bu-seg-btn ${mode === 'compare' ? 'active' : ''}`}
                onClick={() => {
                  setMode('compare');
                  setPageIndex(0);
                }}
              >
                <GitCompare size={15} />
                <span>Comparar Turnos / Eleições</span>
              </button>
            </div>

            <button
              type="button"
              id="bu-toggle-filters-btn"
              className={`bu-action-btn ${!isFiltersOpen && hasActiveFilters ? 'bu-filter-active-btn' : ''}`}
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              aria-expanded={isFiltersOpen}
              aria-controls="bu-collapsible-filters"
              title={
                isFiltersOpen
                  ? 'Minimizar painel de filtros e modelos rápidos para ampliar a tabela'
                  : 'Expandir painel de filtros e modelos rápidos'
              }
            >
              {isFiltersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>
                {isFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                {hasActiveFilters ? ` (${activeFilterCount})` : ''}
              </span>
            </button>

            <button
              type="button"
              className="bu-action-btn"
              onClick={() => setIsColModalOpen(true)}
              aria-expanded={isColModalOpen}
              aria-controls="bu-column-drawer"
            >
              <SlidersHorizontal size={15} />
              <span>Colunas ({visibleColumns.length})</span>
            </button>

            <button
              type="button"
              className="bu-action-btn bu-export-btn"
              onClick={handleExportCsv}
              disabled={isExporting || rows.length === 0}
              title="Exportar até 5.000 registros ordenados para CSV"
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {isFiltersOpen && (
          <div id="bu-collapsible-filters" className="bu-collapsible-filters">
            {/* Presets rápidos de análise */}
            <div className="bu-presets-row" role="group" aria-label="Modelos rápidos de tabela">
          <span className="bu-presets-label">Modelos rápidos:</span>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('geral')}>
            Visão Geral do BU
          </button>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('diferencas')}>
            Diferenças (Candidatos e Turnos)
          </button>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('participacao')}>
            Comparecimento e Abstenção
          </button>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('auditoria')}>
            Auditoria Física da Urna
          </button>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('turno_vs_turno')}>
            2º Turno vs 1º Turno ({anoA})
          </button>
          <button type="button" className="bu-preset-chip" onClick={() => applyPreset('eleicao_vs_eleicao')}>
            Eleição 2026 (2ºT) vs 2022 (2ºT)
          </button>
        </div>

        {/* Seleção de Granularidade, Pleitos (A vs B) e Filtros Territoriais */}
        <div className="bu-controls-grid">
          <div className="bu-field">
            <label htmlFor="bu-level-select">Agrupar linhas por</label>
            <select
              id="bu-level-select"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as BuAggregationLevel);
                setPageIndex(0);
              }}
            >
              {(Object.keys(LEVEL_LABELS) as BuAggregationLevel[]).map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_LABELS[lv]}
                </option>
              ))}
            </select>
          </div>

          <div className="bu-field">
            <label htmlFor="bu-round-a">{mode === 'compare' ? 'Pleito Base (A)' : 'Eleição e Turno'}</label>
            <select
              id="bu-round-a"
              value={roundKeyA}
              onChange={(e) => {
                const val = e.target.value;
                setRoundKeyA(val);
                const [y, t] = val.split('_').map(Number);
                if (y) onSelectAno?.(y);
                if (t) onSelectTurno?.(t);
                setPageIndex(0);
              }}
            >
              {(meta?.rounds || []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.ano} - {r.turno}º Turno ({intFmt.format(r.totalSecoes)} seções)
                </option>
              ))}
            </select>
          </div>

          {mode === 'compare' && (
            <>
              <div className="bu-field">
                <label htmlFor="bu-round-b">Comparar com Pleito (B)</label>
                <select
                  id="bu-round-b"
                  value={roundKeyB}
                  onChange={(e) => {
                    setRoundKeyB(e.target.value);
                    setPageIndex(0);
                  }}
                >
                  {(meta?.rounds || []).map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.ano} - {r.turno}º Turno ({intFmt.format(r.totalSecoes)} seções)
                    </option>
                  ))}
                </select>
              </div>

              <div className="bu-field">
                <label htmlFor="bu-cand-a">Candidato em A ({labelA})</label>
                <select
                  id="bu-cand-a"
                  value={candA}
                  onChange={(e) => {
                    setCandA(Number(e.target.value));
                    setPageIndex(0);
                  }}
                >
                  {(roundMetaA?.candidatos || []).map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} - {c.nome} ({c.partido})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bu-field">
                <label htmlFor="bu-cand-b">Candidato em B ({labelB})</label>
                <select
                  id="bu-cand-b"
                  value={candB}
                  onChange={(e) => {
                    setCandB(Number(e.target.value));
                    setPageIndex(0);
                  }}
                >
                  {(roundMetaB?.candidatos || []).map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} - {c.nome} ({c.partido})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="bu-field">
            <label htmlFor="bu-uf-select">UF / Exterior</label>
            <select
              id="bu-uf-select"
              value={ufFilter}
              onChange={(e) => {
                const nextUf = e.target.value;
                setUfFilter(nextUf);
                onSelectUf(nextUf);
                setCdMunicipio(0);
                setPageIndex(0);
              }}
            >
              <option value="">Brasil + Exterior (Todas)</option>
              {UFS_LIST.map((uf) => (
                <option key={uf} value={uf}>
                  {uf === 'ZZ' ? 'ZZ (Exterior)' : uf}
                </option>
              ))}
            </select>
          </div>

          {level !== 'uf' && ufFilter && municipiosList.length > 0 && (
            <div className="bu-field">
              <label htmlFor="bu-mun-select">Município ({ufFilter})</label>
              <select
                id="bu-mun-select"
                value={cdMunicipio}
                onChange={(e) => {
                  setCdMunicipio(Number(e.target.value));
                  setPageIndex(0);
                }}
              >
                <option value={0}>Todos ({municipiosList.length})</option>
                {municipiosList.map((m) => (
                  <option key={m.cd_municipio} value={m.cd_municipio}>
                    {m.nm_municipio} ({m.qt_secoes} seções)
                  </option>
                ))}
              </select>
            </div>
          )}

          {level !== 'uf' && !cdMunicipio && (
            <div className="bu-field">
              <label htmlFor="bu-mun-search">Filtrar nome de município</label>
              <input
                id="bu-mun-search"
                type="text"
                placeholder="Ex: SAO PAULO, RECIFE"
                value={searchMun}
                onChange={(e) => {
                  setSearchMun(e.target.value);
                  setPageIndex(0);
                }}
              />
            </div>
          )}

          {(level === 'secao' || level === 'local' || level === 'zona') && (
            <div className="bu-field bu-field-compact">
              <label htmlFor="bu-zona-input">Zona</label>
              <input
                id="bu-zona-input"
                type="number"
                min={1}
                placeholder="Ex: 1"
                value={zonaInput}
                onChange={(e) => {
                  setZonaInput(e.target.value);
                  setPageIndex(0);
                }}
              />
            </div>
          )}

          {level === 'secao' && (
            <>
              <div className="bu-field bu-field-compact">
                <label htmlFor="bu-secao-input">Seção</label>
                <input
                  id="bu-secao-input"
                  type="number"
                  min={1}
                  placeholder="Ex: 102"
                  value={secaoInput}
                  onChange={(e) => {
                    setSecaoInput(e.target.value);
                    setPageIndex(0);
                  }}
                />
              </div>

              <div className="bu-field bu-field-compact">
                <label htmlFor="bu-urna-input">Nº Urna</label>
                <input
                  id="bu-urna-input"
                  type="number"
                  min={1}
                  placeholder="Ex: 2045664"
                  value={urnaInput}
                  onChange={(e) => {
                    setUrnaInput(e.target.value);
                    setPageIndex(0);
                  }}
                />
              </div>
            </>
          )}

          {(level === 'secao' || level === 'local') && (
            <div className="bu-field bu-field-compact">
              <label htmlFor="bu-local-input">Local Vot.</label>
              <input
                id="bu-local-input"
                type="number"
                min={1}
                placeholder="Ex: 1015"
                value={localInput}
                onChange={(e) => {
                  setLocalInput(e.target.value);
                  setPageIndex(0);
                }}
              />
            </div>
          )}

          <div className="bu-field bu-field-compact">
            <label htmlFor="bu-min-aptos">Aptos mín.</label>
            <input
              id="bu-min-aptos"
              type="number"
              min={0}
              placeholder="Ex: 50"
              value={minAptosInput}
              onChange={(e) => {
                setMinAptosInput(e.target.value);
                setPageIndex(0);
              }}
            />
          </div>

          <div className="bu-field">
            <label htmlFor="bu-sort-select">Ordenar coluna por</label>
            <div className="bu-sort-inline">
              <select
                id="bu-sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPageIndex(0);
                }}
              >
                {allAvailableColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="bu-sort-dir-btn"
                onClick={() => {
                  setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                  setPageIndex(0);
                }}
                aria-label={
                  sortDir === 'asc'
                    ? 'Ordem crescente ativa. Alternar para ordem decrescente'
                    : 'Ordem decrescente ativa. Alternar para ordem crescente'
                }
                title={sortDir === 'asc' ? 'Crescente (A-Z / menor para maior)' : 'Decrescente (Z-A / maior para menor)'}
              >
                {sortDir === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                <span>{sortDir === 'asc' ? 'Cresc.' : 'Decresc.'}</span>
              </button>
            </div>
          </div>
          </div>
          </div>
        )}
      </div>

      {/* Faixa de Status Real da Consulta */}
      <div className="bu-status-strip">
        <div className="bu-status-metrics">
          {!isFiltersOpen && (
            <>
              <span>
                Pleito: <strong>{mode === 'compare' ? `${labelA} vs ${labelB}` : labelA}</strong>
              </span>
              <span className="bu-dot-sep" aria-hidden="true">|</span>
            </>
          )}
          <span>
            Registros encontrados: <strong>{intFmt.format(totalRows)}</strong>
          </span>
          <span className="bu-dot-sep" aria-hidden="true">|</span>
          <span>
            Nível: <strong>{LEVEL_LABELS[level]}</strong>
          </span>
          <span className="bu-dot-sep" aria-hidden="true">|</span>
          <span>
            Tempo SQL: <strong>{elapsedMs} ms</strong>
          </span>
          {isStaticFallback && (
            <span className="bu-fallback-tag">
              Modo estático UF ativo (rode npm run dev para consultar as 3,7M seções no SQLite)
            </span>
          )}
        </div>

        <div className="bu-pagination-controls">
          {hasActiveFilters && (
            <button type="button" className="bu-reset-btn" onClick={handleClearFilters}>
              <RotateCcw size={14} />
              <span>Limpar filtros</span>
            </button>
          )}

          <label htmlFor="bu-pagesize" className="bu-pagesize-label">
            Linhas:
            <select
              id="bu-pagesize"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </label>

          <button
            type="button"
            className="bu-page-btn"
            disabled={pageIndex === 0 || isLoading}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="bu-page-indicator">
            Pág. {Math.min(pageIndex + 1, totalPages)} de {intFmt.format(totalPages)}
          </span>
          <button
            type="button"
            className="bu-page-btn"
            disabled={pageIndex + 1 >= totalPages || isLoading}
            onClick={() => setPageIndex((p) => p + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Área Principal da Tabela com Estados de Loading, Erro e Vazio */}
      <div className="bu-table-container">
        {isLoading && (
          <div className="bu-loading-overlay" role="status" aria-live="polite">
            <Loader2 size={22} className="animate-spin" />
            <span>Consultando Boletins de Urna oficiais do TSE...</span>
          </div>
        )}

        {errorMsg ? (
          <div className="bu-state-card bu-error-state" role="alert">
            <h3>Falha ao consultar Boletins de Urna</h3>
            <p>{errorMsg}</p>
            <div className="bu-state-actions">
              <button
                type="button"
                className="bu-action-btn"
                onClick={() => setReloadTick((t) => t + 1)}
              >
                Tentar novamente
              </button>
              {level !== 'uf' && (
                <button
                  type="button"
                  className="bu-action-btn"
                  onClick={() => setLevel('uf')}
                >
                  Alternar para resumo por UF
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeColFilters.length > 0 && (
              <div className="bu-active-filters-bar">
                <span className="bu-active-filters-label">
                  <Filter size={13} />
                  <span>Filtros ativos ({activeColFilters.length}):</span>
                </span>
                <div className="bu-active-filters-chips">
                  {activeColFilters.map((flt) => {
                    const colDef = allAvailableColumns.find((c) => c.id === flt.col);
                    const opSymbol = flt.op === 'gt' ? '>' : flt.op === 'lt' ? '<' : flt.op === 'eq' ? '=' : 'contém';
                    return (
                      <span key={flt.col} className="bu-filter-chip">
                        <span className="bu-chip-text">
                          <strong>{colDef?.label || flt.col}:</strong> {opSymbol} {flt.val}
                        </span>
                        <button
                          type="button"
                          className="bu-chip-remove"
                          onClick={() => {
                            if (colDef) updateColFilter(colDef, undefined, '');
                            else setColFilterDraft((p) => ({ ...p, [flt.col]: { op: 'text', val: '' } }));
                          }}
                          title={`Remover filtro de ${colDef?.label || flt.col}`}
                          aria-label={`Remover filtro de ${colDef?.label || flt.col}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    className="bu-clear-all-chips-btn"
                    onClick={() => setColFilterDraft({})}
                  >
                    Limpar filtros
                  </button>
                </div>
              </div>
            )}

            <div className="bu-table-scroll">
              <table className="bu-data-table">
                <thead>
                  <tr>
                    {visibleColumns.map((col) => {
                      const isSorted = sortBy === col.id;
                      const isNum = isNumericFilterFormat(col.format);
                      const draft = colFilterDraft[col.id] || {
                        op: isNum ? 'gt' : 'text',
                        val: '',
                      };
                      const hasFilterActive = draft.val.trim().length > 0;
                      const isFilterOpen = activeFilterColId === col.id;
                      const ariaSort: 'ascending' | 'descending' | 'none' = isSorted
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none';

                      return (
                        <th
                          key={col.id}
                          scope="col"
                          aria-sort={ariaSort}
                          className={`bu-th align-${col.align} ${isSorted ? 'sorted' : ''} ${hasFilterActive ? 'has-filter' : ''} ${isFilterOpen ? 'filter-open' : ''}`}
                        >
                          <div className="bu-th-inner">
                            <button
                              type="button"
                              className="bu-th-btn"
                              onClick={() => handleSortColumn(col)}
                              title={`Ordenar por ${col.label} (${isSorted && sortDir === 'desc' ? 'crescente' : 'decrescente'})`}
                            >
                              <span className="bu-th-label">{col.label}</span>
                              <span className="bu-sort-icon" aria-hidden="true">
                                {isSorted ? (
                                  sortDir === 'asc' ? (
                                    <ArrowUp size={13} />
                                  ) : (
                                    <ArrowDown size={13} />
                                  )
                                ) : (
                                  <ArrowUpDown size={12} className="muted-sort-icon" />
                                )}
                              </span>
                            </button>

                            <button
                              type="button"
                              className={`bu-th-filter-trigger ${hasFilterActive ? 'active' : ''} ${isFilterOpen ? 'open' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilterColId((cur) => (cur === col.id ? null : col.id));
                              }}
                              title={`Filtrar ${col.label}${hasFilterActive ? ` (${draft.op === 'text' ? 'contém' : draft.op} ${draft.val})` : ''}`}
                              aria-label={`Filtrar ${col.label}`}
                              aria-expanded={isFilterOpen}
                            >
                              <Filter size={12} />
                              {hasFilterActive && <span className="bu-th-filter-dot" />}
                            </button>
                          </div>

                          {/* Popup do filtro de coluna */}
                          {isFilterOpen && (
                            <div
                              className={`bu-filter-popover align-${col.align}`}
                              onClick={(e) => e.stopPropagation()}
                              role="dialog"
                              aria-label={`Filtro da coluna ${col.label}`}
                            >
                              <div className="bu-popover-header">
                                <span className="bu-popover-title">Filtrar: {col.label}</span>
                                <button
                                  type="button"
                                  className="bu-popover-close-btn"
                                  onClick={() => setActiveFilterColId(null)}
                                  aria-label="Fechar filtro"
                                >
                                  <X size={13} />
                                </button>
                              </div>

                              <div className="bu-popover-body">
                                {isNum ? (
                                  <div className="bu-col-filter-num">
                                    <select
                                      className="bu-col-op-select"
                                      aria-label={`Operador de filtro para ${col.label}`}
                                      value={draft.op === 'text' ? 'gt' : draft.op}
                                      onChange={(e) =>
                                        updateColFilter(col, e.target.value as BuFilterOperator, undefined)
                                      }
                                    >
                                      <option value="gt">&gt;</option>
                                      <option value="lt">&lt;</option>
                                      <option value="eq">=</option>
                                    </select>
                                    <input
                                      type="text"
                                      autoFocus
                                      inputMode="decimal"
                                      className="bu-col-val-input"
                                      placeholder={
                                        col.format === 'pct' || col.format === 'delta_pct'
                                          ? 'Ex: 50,5'
                                          : 'Valor...'
                                      }
                                      aria-label={`Valor de filtro para ${col.label}`}
                                      value={draft.val}
                                      onChange={(e) => updateColFilter(col, undefined, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') setActiveFilterColId(null);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="bu-col-filter-text">
                                    <input
                                      type="text"
                                      autoFocus
                                      className="bu-col-text-input"
                                      placeholder="Filtrar texto..."
                                      aria-label={`Filtrar texto em ${col.label}`}
                                      value={draft.val}
                                      onChange={(e) => updateColFilter(col, 'text', e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') setActiveFilterColId(null);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="bu-popover-footer">
                                {hasFilterActive && (
                                  <button
                                    type="button"
                                    className="bu-popover-clear-btn"
                                    onClick={() => updateColFilter(col, undefined, '')}
                                  >
                                    Limpar
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="bu-popover-apply-btn"
                                  onClick={() => setActiveFilterColId(null)}
                                >
                                  Fechar
                                </button>
                              </div>
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                {!isLoading && rows.length === 0 ? (
                  <tr className="bu-empty-row">
                    <td colSpan={visibleColumns.length} className="bu-empty-cell">
                      <div className="bu-state-card bu-empty-state">
                        <h3>Nenhum Boletim de Urna corresponde aos filtros aplicados</h3>
                        <p>
                          {mode === 'compare'
                            ? `Não há interseção exata de ${LEVEL_LABELS[level]} entre ${labelA} e ${labelB} para o filtro atual.`
                            : 'Ajuste os operadores (<, >, =) ou filtros de texto das colunas, ou limpe os filtros ativos.'}
                        </p>
                        <button type="button" className="bu-action-btn" onClick={handleClearFilters}>
                          <RotateCcw size={15} />
                          <span>Limpar todos os filtros</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rIdx) => {
                    const rowKey = `${row.sg_uf || ''}_${row.cd_municipio || ''}_${row.nr_zona || ''}_${row.nr_secao || ''}_${row.nr_local_votacao || ''}_${rIdx}`;
                    return (
                      <tr key={rowKey} className="bu-data-row">
                        {visibleColumns.map((col) => {
                          const rawVal = row[col.id];
                          const isDelta = col.format === 'delta_int' || col.format === 'delta_pct';
                          const numVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
                          let deltaClass = '';
                          if (isDelta && !Number.isNaN(numVal)) {
                            if (numVal > 0) deltaClass = 'bu-delta-pos';
                            else if (numVal < 0) deltaClass = 'bu-delta-neg';
                          }
                          const isMono = col.format !== 'text';
                          return (
                            <td
                              key={col.id}
                              className={`bu-td align-${col.align} ${isMono ? 'bu-mono' : ''} ${deltaClass}`}
                            >
                              {formatCellValue(rawVal, col.format)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Painel Modal de Personalização de Colunas & Candidatos */}
      {isColModalOpen && (
        <div
          className="bu-drawer-backdrop"
          onClick={() => setIsColModalOpen(false)}
          role="presentation"
        >
          <div
            id="bu-column-drawer"
            className="bu-column-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bu-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bu-drawer-header">
              <div>
                <h3 id="bu-drawer-title">Personalizar Colunas da Tabela</h3>
                <p>Marque os campos do Boletim de Urna e os candidatos que deseja exibir e ordenar.</p>
              </div>
              <button
                type="button"
                className="bu-drawer-close"
                onClick={() => setIsColModalOpen(false)}
                aria-label="Fechar painel de colunas"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bu-drawer-body">
              {(['preprocessados', 'identificacao', 'participacao', 'votacao', 'auditoria'] as const).map((grp) => {
                const groupCols = allAvailableColumns.filter((c) => c.group === grp);
                if (groupCols.length === 0) return null;
                const grpTitles: Record<string, string> = {
                  preprocessados: 'Dados Pré-processados: Diferenças entre Candidatos e entre Turnos',
                  identificacao: 'Identificação Territorial e Eleitoral',
                  participacao: 'Eleitorado, Comparecimento e Abstenção',
                  votacao: 'Votos Válidos, Brancos, Nulos e Liderança',
                  auditoria: 'Auditoria Física da Urna e Horários do BU',
                };
                const activeList = mode === 'single' ? selectedSingleCols : selectedCompareCols;
                return (
                  <div key={grp} className="bu-col-group">
                    <h4>{grpTitles[grp]}</h4>
                    <div className="bu-col-checks">
                      {groupCols.map((col) => (
                        <label key={col.id} className="bu-check-item">
                          <input
                            type="checkbox"
                            checked={activeList.includes(col.id)}
                            onChange={() => toggleColumnSelection(col.id)}
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              {mode === 'compare' && (
                <div className="bu-col-group">
                  <h4>Colunas do Candidato em Foco ({candLabelA} vs {candLabelB})</h4>
                  <div className="bu-col-checks">
                    {allAvailableColumns
                      .filter((c) => c.group === 'candidatos')
                      .map((col) => (
                        <label key={col.id} className="bu-check-item">
                          <input
                            type="checkbox"
                            checked={selectedCompareCols.includes(col.id)}
                            onChange={() => toggleColumnSelection(col.id)}
                          />
                          <span>{col.label}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {mode === 'single' && roundMetaA && (
                <div className="bu-col-group">
                  <h4>Colunas Nominais por Candidato ({anoA} - {turnoA}º Turno)</h4>
                  <div className="bu-col-checks">
                    {roundMetaA.candidatos.map((cand) => (
                      <label key={cand.numero} className="bu-check-item">
                        <input
                          type="checkbox"
                          checked={extraCands.includes(cand.numero)}
                          onChange={() => toggleExtraCandidate(cand.numero)}
                        />
                        <span>
                          {cand.numero} - {cand.nome} ({cand.partido})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bu-drawer-footer">
              <button
                type="button"
                className="bu-reset-btn"
                onClick={() => {
                  if (mode === 'single') setSelectedSingleCols(DEFAULT_SINGLE_SELECTED);
                  else setSelectedCompareCols(DEFAULT_COMPARE_SELECTED);
                }}
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                className="bu-action-btn bu-primary-btn"
                onClick={() => setIsColModalOpen(false)}
              >
                Concluir ({visibleColumns.length} colunas)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

