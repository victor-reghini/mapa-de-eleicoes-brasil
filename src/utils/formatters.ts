/**
 * Utilitários centralizados de formatação numérica e textual eleitoral (Clean Code / DRY)
 */

/**
 * Formata quantidade de votos no padrão brasileiro com separador de milhar por ponto.
 * Exemplo: 60345999 -> "60.345.999"
 */
export function formatVotes(votos?: number | null): string {
  if (votos === undefined || votos === null || isNaN(votos)) return '0';
  return votos.toLocaleString('pt-BR');
}

/**
 * Formata percentual eleitoral com vírgula e casas decimais definidas (padrão: 1).
 * Exemplo: 50.93 -> "50,9%"
 */
export function formatPercent(pct?: number | null, decimals: number = 1): string {
  if (pct === undefined || pct === null || isNaN(pct)) return '0,0%';
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
}

/**
 * Formata a margem de vitória com sinal positivo explícito.
 * Exemplo: 8.42 -> "+8,4%"
 */
export function formatMargin(margem?: number | null, decimals: number = 1): string {
  if (margem === undefined || margem === null || isNaN(margem)) return '+0,0%';
  const abs = Math.abs(margem);
  return `+${abs.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}%`;
}

/**
 * Formata código IBGE ou identificador numérico garantindo string limpa.
 */
export function cleanIbgeCode(code?: string | number | null): string {
  if (!code) return '';
  return String(code).trim();
}
