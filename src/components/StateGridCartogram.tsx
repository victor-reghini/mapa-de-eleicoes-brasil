import React, { useState } from 'react';
import type { ElectionRoundData } from '../types/election';

interface StateGridCartogramProps {
  electionData: ElectionRoundData | null;
  selectedUf: string | null;
  onSelectUf: (uf: string) => void;
}

// 7-column cartogram grid representing approximate Brazilian state positions
const GRID_LAYOUT: (string | null)[][] = [
  [null, null, 'RR', 'AP', null, null, null],
  ['AC', 'AM', 'PA', 'MA', 'CE', 'RN', null],
  ['RO', 'MT', 'TO', 'PI', 'PB', null, null],
  ['MS', 'GO', 'DF', 'BA', 'PE', 'AL', null],
  ['PR', 'SP', 'MG', 'ES', 'SE', null, null],
  ['SC', null, 'RJ', null, null, null, null],
  ['RS', null, null, null, null, null, null],
  [null, null, 'ZZ', null, null, null, null]
];

const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins', ZZ: 'Exterior Consular'
};

export const StateGridCartogram: React.FC<StateGridCartogramProps> = ({
  electionData,
  selectedUf,
  onSelectUf
}) => {
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);

  if (!electionData) return null;

  return (
    <div className="cartogram-container">
      <div className="cartogram-header">
        <div className="cartogram-title-group">
          <h3 className="cartogram-title">Quem lidera em cada estado</h3>
          <p className="cartogram-subtitle">
            Cartograma em grade territorial. A cor do candidato líder sobe conforme o percentual apurado no estado.
          </p>
        </div>
        <div className="cartogram-legend-pills">
          {electionData.cargo === 'PRESIDENTE' ? (
            electionData.brasil.candidatos.slice(0, 2).map((c) => (
              <div key={c.numero} className="cartogram-pill">
                <span className="cartogram-pill-dot" style={{ background: c.cor }} />
                <span>{c.nomeUrna || c.nome} ({c.partido})</span>
              </div>
            ))
          ) : (
            (electionData.brasil.partidos || []).slice(0, 3).map((p) => (
              <div key={p.partido} className="cartogram-pill">
                <span className="cartogram-pill-dot" style={{ background: p.cor }} />
                <span>{p.partido}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="cartogram-grid-wrapper">
        <div className="cartogram-grid">
          {GRID_LAYOUT.map((row, rIdx) => (
            <div key={rIdx} className="cartogram-row">
              {row.map((sigla, cIdx) => {
                if (!sigla) {
                  return <div key={cIdx} className="cartogram-cell-empty" />;
                }

                const ufResult = electionData.ufs[sigla];
                const isSelected = selectedUf === sigla;
                const isHovered = hoveredUf === sigla;
                const ufName = UF_NAMES[sigla] || sigla;

                // Apuração percentage and leader color
                const pct = ufResult?.pctApuracao ?? (electionData.isTempoReal ? 0 : 100);
                const isAwaiting = electionData.isTempoReal && (!ufResult?.pctApuracao || ufResult?.votosValidos === 0);
                const leader = ufResult?.candidatos?.[0];
                const leaderColor = ufResult?.vencedorCor || leader?.cor || '#3b82f6';
                const fillHeight = isAwaiting ? 0 : Math.min(100, Math.max(0, pct));

                return (
                  <button
                    key={sigla}
                    type="button"
                    className={`cartogram-tile ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                    onClick={() => onSelectUf(sigla)}
                    onMouseEnter={() => setHoveredUf(sigla)}
                    onMouseLeave={() => setHoveredUf(null)}
                    title={`${ufName} (${sigla}): ${isAwaiting ? 'Aguardando apuração às 17h' : `${pct.toFixed(1)}% apurado • Líder: ${leader?.nomeUrna || ufResult?.vencedor || 'N/A'}`}`}
                    aria-label={`${ufName} (${sigla})`}
                  >
                    {/* Bottom-to-top filling bar */}
                    <span
                      className="cartogram-fill"
                      style={{
                        height: `${fillHeight}%`,
                        backgroundColor: leaderColor
                      }}
                    />

                    {/* Tile Label */}
                    <span className="cartogram-sigla">{sigla}</span>
                    <span className="cartogram-pct">
                      {isAwaiting ? '17h' : `${Math.round(pct)}%`}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover detail preview if hovered */}
        {hoveredUf && electionData.ufs[hoveredUf] && (
          <div className="cartogram-hover-card">
            <div className="cartogram-hover-header">
              <strong>{UF_NAMES[hoveredUf] || hoveredUf} ({hoveredUf})</strong>
              <span className="cartogram-hover-tag">
                {electionData.ufs[hoveredUf].pctApuracao === 0
                  ? 'Inicia às 17h'
                  : `${(electionData.ufs[hoveredUf].pctApuracao || 100).toFixed(1)}% apurado`}
              </span>
            </div>
            <div className="cartogram-hover-cands">
              {(electionData.ufs[hoveredUf].candidatos || []).slice(0, 2).map((c) => (
                <div key={c.numero} className="cartogram-hover-cand-row">
                  <span className="cand-dot" style={{ background: c.cor }} />
                  <span className="cand-name">{c.nomeUrna || c.nome} ({c.partido})</span>
                  <span className="cand-score">{c.votos > 0 ? `${c.pctValidos.toFixed(1)}%` : '0 votos'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
