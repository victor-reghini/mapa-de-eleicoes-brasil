import React, { useState } from 'react';
import type { ElectionRoundData, MunicipalityIndexItem } from '../types/election';
import { CheckCircle2, UserCheck, UserX, FileX } from 'lucide-react';
import { formatVotes, formatPercent } from '../utils/formatters';

interface TotalizationPanelProps {
  electionData: ElectionRoundData | null;
  selectedAno: number;
  selectedTurno: number;
  munIndex: MunicipalityIndexItem[];
  onSelectMunicipality: (mun: MunicipalityIndexItem) => void;
  onSelectUf: (uf: string) => void;
  onOpenNullModal?: () => void;
}

export const TotalizationPanel: React.FC<TotalizationPanelProps> = ({
  electionData,
  selectedAno,
  selectedTurno,
  munIndex,
  onSelectMunicipality,
  onSelectUf,
  onOpenNullModal
}) => {
  const [searchState, setSearchState] = useState('');
  const [searchCity, setSearchCity] = useState('');

  const br = electionData?.brasil;
  const apuracao = electionData?.apuracao;

  // Filter for state search
  const states = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
  ].filter(s => 
    s.name.toLowerCase().includes(searchState.toLowerCase()) || 
    s.uf.toLowerCase().includes(searchState.toLowerCase())
  );

  // Filter for city search
  const filteredCities = searchCity.length >= 2 
    ? munIndex.filter(m => m.name.toLowerCase().includes(searchCity.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="totalization-panel">
      <div className="panel-header-title">
        <span>TOTALIZAÇÃO · ESTADO OU CIDADE</span>
      </div>

      <div className="panel-inputs-wrap">
        {/* Search State */}
        <div className="search-field-box">
          <input 
            type="text"
            placeholder="Buscar estado..."
            value={searchState}
            onChange={(e) => setSearchState(e.target.value)}
            className="panel-search-input"
          />
          {searchState.length >= 2 && (
            <div className="search-dropdown-results">
              {states.slice(0, 6).map(s => (
                <button 
                  key={s.uf}
                  onClick={() => { onSelectUf(s.uf); setSearchState(''); }}
                  className="dropdown-result-item"
                >
                  <strong>{s.uf}</strong> — {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search City */}
        <div className="search-field-box">
          <input 
            type="text"
            placeholder="Buscar cidade..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="panel-search-input"
          />
          {filteredCities.length > 0 && (
            <div className="search-dropdown-results">
              {filteredCities.map(c => (
                <button 
                  key={c.id}
                  onClick={() => { onSelectMunicipality(c); setSearchCity(''); }}
                  className="dropdown-result-item"
                >
                  <span>{c.name}</span> <small>({c.uf})</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Totalization Card */}
      <div className="totalization-main-card">
        <div className="totalization-badge-row">
          <strong className="badge-scope">Brasil · totalização nacional</strong>
        </div>
        <div className="totalization-meta-line">
          <span>Presidente · {selectedAno} · {selectedTurno}º turno</span>
          <span>{formatVotes(br?.votosValidos)} votos · {apuracao?.pctSecoesTotalizadas ? `${formatPercent(apuracao.pctSecoesTotalizadas, 2)} apurado` : '100% apurado'}</span>
        </div>

        {/* Candidates Bars */}
        <div className="totalization-cands-bars">
          {br?.candidatos.map((cand) => (
            <div key={cand.numero} className="cand-progress-block">
              <div className="cand-progress-labels">
                <div className="cand-name-tag">
                  <span className="cand-color-indicator" style={{ backgroundColor: cand.cor }}></span>
                  <strong className="cand-label-name">{cand.nomeUrna}</strong>
                  {cand.eleito && <span className="cand-elected-flag"><CheckCircle2 size={11} /> ELEITO</span>}
                </div>
                <div className="cand-score-tag">
                  <span className="cand-votes-count">{formatVotes(cand.votos)} votos</span>
                  <strong className="cand-pct-val">{formatPercent(cand.pctValidos)}</strong>
                </div>
              </div>
              <div className="progress-track">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min(100, Math.max(0, cand.pctValidos))}%`,
                    backgroundColor: cand.cor
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participação Section */}
      <div className="participation-summary-card">
        <span className="participation-title">PARTICIPAÇÃO</span>
        <div className="participation-metrics-table">
          <div className="metric-row">
            <span className="metric-label"><UserCheck size={14} /> Comparecimento</span>
            <strong className="metric-value">{formatPercent(br?.pctComparecimento ?? 80.8)}</strong>
          </div>
          <div className="metric-row">
            <span className="metric-label"><UserX size={14} /> Abstenção</span>
            <strong className="metric-value">{formatPercent(br?.pctAbstencoes ?? 19.2)}</strong>
          </div>
          <div className="metric-row clickable-metric" onClick={onOpenNullModal} title="Clique para ver detalhes">
            <span className="metric-label"><FileX size={14} /> Brancos</span>
            <strong className="metric-value">{formatVotes(br?.votosBrancos ?? 1430496)}</strong>
          </div>
          <div className="metric-row clickable-metric" onClick={onOpenNullModal} title="Clique para ver detalhes">
            <span className="metric-label"><FileX size={14} /> Nulos</span>
            <strong className="metric-value">{formatVotes(br?.votosNulos ?? 2723305)}</strong>
          </div>
          <div className="metric-row highlight-aptos">
            <span className="metric-label">Aptos nas seções apuradas</span>
            <strong className="metric-value">{formatVotes(br?.aptos ?? 158745502)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
