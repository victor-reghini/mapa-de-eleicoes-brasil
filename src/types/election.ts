export type GranularityMode = 'ESTADOS' | 'MUNICIPIOS' | 'ZONAS' | 'EXTERIOR_GLOBE';

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
}

export interface UfResult extends TurnoutMetrics {
  sigla: string;
  vencedor: string;
  vencedorCor: string;
  candidatos: Candidate[];
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
  brasil: {
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
    candidatos: Candidate[];
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
