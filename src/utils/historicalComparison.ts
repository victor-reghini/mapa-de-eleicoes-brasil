/**
 * Historical Comparison Utility
 * Computes percentage points (p.p.) difference compared to the previous election
 */

export interface HistoricalPartyShare {
  [party: string]: number; // percentage in previous election
}

// Presidential historical shares by party/coalition
export const PRESIDENTIAL_HISTORICAL_SHARES: Record<number, Record<number, Record<string, number>>> = {
  // 2026 Presidential election compared to 2022
  2026: {
    1: {
      'PL': 43.20,
      'PT': 48.43,
      'AVANTE': 1.50,
      'MISSÃO': 0.00,
      'PSD': 2.18,
      'NOVO': 0.47,
      'UP': 0.05,
      'PDT': 3.04,
      'MDB': 4.16,
    },
    2: {
      'PL': 49.10,
      'PT': 50.90,
    }
  },
  // 2022 Presidential election compared to 2018
  2022: {
    1: {
      'PT': 29.28,
      'PL': 46.03, // PSL in 2018
      'PDT': 12.47,
      'MDB': 1.20,
      'NOVO': 2.50,
      'UNIÃO': 4.76, // DEM/PSDB in 2018
    },
    2: {
      'PT': 44.87,
      'PL': 55.13, // PSL in 2018
    }
  },
  // 2018 compared to 2014
  2018: {
    1: {
      'PT': 41.59,
      'PSDB': 33.55,
      'PSL': 0.88,
      'REDE': 21.32,
    },
    2: {
      'PT': 51.64,
      'PSDB': 48.36,
    }
  }
};

export interface DiffResult {
  previousYear: number;
  previousPct: number;
  diffPp: number;
  formattedDiff: string;
  isPositive: boolean;
  isNeutral: boolean;
}

/**
 * Calculates percentage points difference vs previous election
 */
export function calculatePartyDiff(
  ano: number,
  turno: number,
  partido: string,
  currentPct: number
): DiffResult | null {
  const yearData = PRESIDENTIAL_HISTORICAL_SHARES[ano]?.[turno];
  if (!yearData) return null;

  const previousPct = yearData[partido.toUpperCase()];
  if (previousPct === undefined) return null;

  const previousYear = ano === 2026 ? 2022 : ano === 2022 ? 2018 : ano === 2018 ? 2014 : ano - 4;
  const diffPp = Number((currentPct - previousPct).toFixed(1));
  const isNeutral = Math.abs(diffPp) < 0.05;
  const isPositive = diffPp > 0;

  const formattedDiff = isNeutral 
    ? '= 0,0 p.p.' 
    : isPositive 
      ? `▲ +${diffPp.toFixed(1)} p.p.` 
      : `▼ ${diffPp.toFixed(1)} p.p.`;

  return {
    previousYear,
    previousPct,
    diffPp,
    formattedDiff,
    isPositive,
    isNeutral
  };
}
