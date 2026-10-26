export type GranularityMode = 'ESTADOS' | 'GRADE_CARTOGRAMA' | 'MUNICIPIOS' | 'ZONAS' | 'EXTERIOR_GLOBE';

export type ElectionCargo = 
  | 'PRESIDENTE' 
  | 'GOVERNADOR' 
  | 'SENADOR' 
  | 'DEPUTADO_FEDERAL' 
  | 'DEPUTADO_ESTADUAL' 
  | 'PREFEITO' 
  | 'VEREADOR';

export interface Candidate {
  numero: string;
  nome: string;
  nomeUrna?: string;
  partido: string;
  coligacao?: string;
  cor: string;
  votos: number;
  pctValidos: number;
  pctTotal?: number;
  foto?: string;
  eleito?: boolean;
}

export interface TurnoutMetrics {
  aptos: number;
  comparecimento: number;
  pctComparecimento: number;
  abstencoes: number;
  pctAbstencoes: number;
  votosValidos: number;
  pctValidos: number;
  votosBrancos: number;
  pctBrancos: number;
  votosNulos: number;
  pctNulos: number;
  secoesTotalizadas?: number;
  totalSecoes?: number;
  pctApuracao?: number;
}

export interface ApuracaoProgress {
  secoesTotalizadas: number;
  totalSecoes: number;
  pctSecoesTotalizadas: number;
  eleitoradoApurado: number;
  totalEleitorado: number;
  horarioUltimaAtualizacao: string;
  isTempoReal: boolean;
  origemApi?: string;
  statusTotalizacao?: 'EM_ANDAMENTO' | 'FINALIZADA' | 'NAO_INICIADA';
  statusMensagem?: string;
}

export interface PartySummary {
  partido: string;
  nomeCompleto?: string;
  cor: string;
  eleitos: number;
  pctEleitos: number;
  votos: number;
  pctVotos: number;
  coligacao?: string;
}

export const PARTY_COLORS: Record<string, { nome: string; cor: string; sigla: string }> = {
  'PT': { nome: 'Partido dos Trabalhadores', cor: '#e11d48', sigla: 'PT' },
  'PL': { nome: 'Partido Liberal', cor: '#2563eb', sigla: 'PL' },
  'UNIÃO': { nome: 'União Brasil', cor: '#4338ca', sigla: 'UNIÃO' },
  'PP': { nome: 'Progressistas', cor: '#0891b2', sigla: 'PP' },
  'PSD': { nome: 'Partido Social Democrático', cor: '#d97706', sigla: 'PSD' },
  'MDB': { nome: 'Movimento Democrático Brasileiro', cor: '#059669', sigla: 'MDB' },
  'REPUBLICANOS': { nome: 'Republicanos', cor: '#0284c7', sigla: 'REPUBLICANOS' },
  'PSDB': { nome: 'Partido da Social Democracia Brasileira', cor: '#0ea5e9', sigla: 'PSDB' },
  'PDT': { nome: 'Partido Democrático Trabalhista', cor: '#ea580c', sigla: 'PDT' },
  'PSB': { nome: 'Partido Socialista Brasileiro', cor: '#dc2626', sigla: 'PSB' },
  'PODEMOS': { nome: 'Podemos', cor: '#7c3aed', sigla: 'PODEMOS' },
  'PSOL': { nome: 'Partido Socialismo e Liberdade', cor: '#eab308', sigla: 'PSOL' },
  'AVANTE': { nome: 'Avante', cor: '#06b6d4', sigla: 'AVANTE' },
  'PCdoB': { nome: 'Partido Comunista do Brasil', cor: '#be123c', sigla: 'PCdoB' },
  'SOLIDARIEDADE': { nome: 'Solidariedade', cor: '#f59e0b', sigla: 'SOLIDARIEDADE' },
  'PATRIOTA': { nome: 'Patriota', cor: '#334155', sigla: 'PATRIOTA' },
  'PROS': { nome: 'Partido Republicano da Ordem Social', cor: '#64748b', sigla: 'PROS' },
  'NOVO': { nome: 'Partido Novo', cor: '#f97316', sigla: 'NOVO' },
  'REDE': { nome: 'Rede Sustentabilidade', cor: '#10b981', sigla: 'REDE' },
  'PTB': { nome: 'Partido Trabalhista Brasileiro', cor: '#475569', sigla: 'PTB' },
  'CIDADANIA': { nome: 'Cidadania', cor: '#ec4899', sigla: 'CIDADANIA' },
  'PSC': { nome: 'Partido Social Cristão', cor: '#16a34a', sigla: 'PSC' },
  'PV': { nome: 'Partido Verde', cor: '#22c55e', sigla: 'PV' },
  'PRTB': { nome: 'Partido Renovador Trabalhista Brasileiro', cor: '#1e40af', sigla: 'PRTB' },
  'PMB': { nome: 'Partido da Mulher Brasileira', cor: '#f43f5e', sigla: 'PMB' },
  'PRN': { nome: 'Partido da Reconstrução Nacional', cor: '#1e3a8a', sigla: 'PRN' },
  'PDS': { nome: 'Partido Democrático Social', cor: '#0f766e', sigla: 'PDS' },
  'PRONA': { nome: 'Partido de Reedificação da Ordem Nacional', cor: '#b45309', sigla: 'PRONA' }
};

export interface UfResult extends TurnoutMetrics {
  sigla: string;
  vencedor: string;
  vencedorCor: string;
  vencedorPartido?: string;
  candidatos: Candidate[];
  partidos?: PartySummary[];
}

export interface ConsularCity {
  pais: string;
  codigoIso: string;
  cidade: string;
  lat: number;
  lon: number;
  eleitores: number;
  lula_r2: number;
  bolsonaro_r2: number;
  brancos?: number;
  nulos?: number;
  lula_pct: number;
}

export interface ElectoralZone {
  uf: string;
  municipio: string;
  zona: string;
  nome: string;
  bairros: string;
  aptos: number;
  comparecimento: number;
  lula: number;
  bolsonaro: number;
  lula_pct: number;
  bolsonaro_pct: number;
  brancos?: number;
  nulos?: number;
}

export interface MunicipalityResult {
  id: string;
  nome: string;
  uf: string;
  aptos: number;
  lula_r2: number;
  bolsonaro_r2: number;
  lula_pct: number;
  bolsonaro_pct: number;
  brancos: number;
  nulos: number;
  abstencoes: number;
  vencedorNome?: string;
  vencedorPartido?: string;
  vencedorCor?: string;
  candidatos?: Candidate[];
}

export interface TypedNullNumber {
  numero: string;
  descricao: string;
  votos: number;
  pct: number;
}

export interface SubJudiceVote {
  numero: string;
  nomeCandidato: string;
  motivo: string;
  votos: number;
  status: string;
}

export interface NullDetail {
  totalNulos: number;
  pctNulos: number;
  totalBrancos: number;
  pctBrancos: number;
  totalAbstencoes: number;
  pctAbstencoes: number;
  numerosDigitados: TypedNullNumber[];
  subJudice: SubJudiceVote[];
  notaTSE: string;
}

export interface ElectionRoundData {
  ano: number;
  cargo: ElectionCargo;
  turno: number;
  data: string;
  titulo?: string;
  fonte?: string;
  isTempoReal?: boolean;
  apuracao?: ApuracaoProgress;
  brasil: TurnoutMetrics & {
    candidatos: Candidate[];
    partidos?: PartySummary[];
  };
  ufs: Record<string, UfResult>;
  exterior: {
    totalAptos: number;
    comparecimento: number;
    abstencoes: number;
    cidades: ConsularCity[];
  };
  zonas: ElectoralZone[];
  municipios: MunicipalityResult[];
  detalhesNulos: NullDetail;
}

export interface ElectionManifestItem {
  id: string;
  ano: number;
  cargo: ElectionCargo;
  titulo: string;
  turnos: number[];
  data1Turno: string;
  data2Turno?: string;
  status: string;
  isTempoReal?: boolean;
}

export interface ElectionManifest {
  supportedElections: ElectionManifestItem[];
  futureCargoScalability: { cargo: ElectionCargo; descricao: string }[];
}

export interface MunicipalityIndexItem {
  id: string;
  name: string;
  uf: string;
  lon: number;
  lat: number;
}
