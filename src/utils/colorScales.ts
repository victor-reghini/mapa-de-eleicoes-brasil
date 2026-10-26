/**
 * Escalas e cálculos cromáticos eleitorais (Clean Code / Single Responsibility)
 */

export interface CandidateColorProfile {
  numero: string;
  nomeUrna: string;
  partido: string;
  cor: string;
}

export const DEFAULT_CANDIDATE_A: CandidateColorProfile = {
  numero: '13',
  nomeUrna: 'Lula',
  partido: 'PT',
  cor: '#e11d48'
};

export const DEFAULT_CANDIDATE_B: CandidateColorProfile = {
  numero: '22',
  nomeUrna: 'Flávio Bolsonaro',
  partido: 'PL',
  cor: '#2563eb'
};

export interface MarginTier {
  min: number;
  max: number;
  label: string;
  colorA: string;
  colorB: string;
}

export const BIVARIATE_TIERS: MarginTier[] = [
  { min: 40, max: Infinity, label: '+40%+', colorA: '#881337', colorB: '#1e3a8a' },
  { min: 25, max: 40, label: '+25-40%', colorA: '#be123c', colorB: '#1d4ed8' },
  { min: 15, max: 25, label: '+15-25%', colorA: '#e11d48', colorB: '#2563eb' },
  { min: 5, max: 15, label: '+5-15%', colorA: '#f43f5e', colorB: '#60a5fa' },
  { min: 0, max: 5, label: '+0-5%', colorA: '#fda4af', colorB: '#93c5fd' }
];

/**
 * Calcula a tonalidade divergente baseada na margem percentual (|%A - %B|)
 * @param isA - True se candidato A lidera na localidade
 * @param absMargem - Margem absoluta de vitória (|%A - %B|)
 * @param corA - Cor personalizada do candidato A (fallback: #e11d48)
 * @param corB - Cor personalizada do candidato B (fallback: #2563eb)
 */
export function getBivariateTierColor(
  isA: boolean,
  absMargem: number,
  corA: string = '#e11d48',
  corB: string = '#2563eb'
): string {
  if (isA) {
    if (absMargem >= 40) return '#881337';
    if (absMargem >= 25) return '#be123c';
    if (absMargem >= 15) return corA;
    if (absMargem >= 5) return '#f43f5e';
    return '#fda4af';
  } else {
    if (absMargem >= 40) return '#1e3a8a';
    if (absMargem >= 25) return '#1d4ed8';
    if (absMargem >= 15) return corB;
    if (absMargem >= 5) return '#60a5fa';
    return '#93c5fd';
  }
}
