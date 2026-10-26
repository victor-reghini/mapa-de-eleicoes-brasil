import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  MapPin, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Award,
  Vote
} from 'lucide-react';
import type { MunicipalityIndexItem } from '../types/election';
import { formatVotes, formatPercent, formatMargin } from '../utils/formatters';

interface CityDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMun?: MunicipalityIndexItem | null;
  munIndex: MunicipalityIndexItem[];
}

interface CityData {
  ibge: string;
  nome: string;
  uf: string;
  eleitorado: number;
  lat: number;
  lon: number;
  eleicao: {
    ano: number;
    turno: number;
    cargo: string;
    candA: { numero: string; nome: string; partido: string; votos: number; pct: number };
    candB: { numero: string; nome: string; partido: string; votos: number; pct: number };
    margem: number;
    lider: string;
  };
  participacao: {
    aptos: number;
    comparecimento: number;
    pctComparecimento: number;
    abstencao: number;
    pctAbstencao: number;
    mediaNacionalAbstencao: number;
  };
}

export const CityDeepDiveModal: React.FC<CityDeepDiveModalProps> = ({
  isOpen,
  onClose,
  initialMun,
  munIndex
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMun, setSelectedMun] = useState<MunicipalityIndexItem | null>(initialMun || null);
  const [selectedCargo, setSelectedCargo] = useState<string>('PRESIDENTE');
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initialMun
  useEffect(() => {
    if (initialMun) {
      setSelectedMun(initialMun);
    }
  }, [initialMun]);

  // Fetch city details when selectedMun changes
  useEffect(() => {
    if (!selectedMun) {
      // Default to São Paulo if none selected
      const defaultMun = munIndex.find(m => m.id === '3550308') || munIndex[0];
      if (defaultMun) setSelectedMun(defaultMun);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/municipio/${selectedMun.id}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (!data.error) {
            setCityData(data);
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.warn('Erro ao consultar /api/municipio:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [selectedMun, munIndex]);

  if (!isOpen) return null;

  const filteredCities = searchQuery.length >= 2
    ? munIndex.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  const lider = cityData?.eleicao.lider === '13' ? cityData.eleicao.candA : cityData?.eleicao.candB;
  const segundo = cityData?.eleicao.lider === '13' ? cityData.eleicao.candB : cityData?.eleicao.candA;
  const abstencaoDiff = cityData 
    ? (cityData.participacao.pctAbstencao - cityData.participacao.mediaNacionalAbstencao).toFixed(1)
    : '0';

  return (
    <div className="sources-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="city-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="city-modal-header">
          <div className="city-modal-title-row">
            <div className="city-icon-badge">
              <MapPin size={22} color="#38bdf8" />
            </div>
            <div>
              <h2 className="city-modal-title">Na Sua Cidade · Raio-X Eleitoral</h2>
              <p className="city-modal-subtitle">
                Consulte em 3 passos como seu município votou para cada cargo e seu nível de engajamento cívico.
              </p>
            </div>
          </div>
          <button className="sources-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Buscador de Município */}
        <div className="city-modal-step-section">
          <div className="step-indicator-row">
            <span className="step-number-chip">Passo 1</span>
            <span className="step-label">Escolha a cidade brasileira</span>
          </div>

          <div className="city-search-box">
            <Search size={16} className="city-search-icon" />
            <input 
              type="text"
              placeholder="Digite o nome de qualquer cidade do Brasil (ex: Campinas, Sobral, Londrina)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="city-search-input-field"
            />
          </div>

          {filteredCities.length > 0 && (
            <div className="city-search-floating-dropdown">
              {filteredCities.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedMun(c);
                    setSearchQuery('');
                  }}
                  className="city-dropdown-item"
                >
                  <div className="city-dropdown-name">
                    <strong>{c.name}</strong> <span>({c.uf})</span>
                  </div>
                  <span className="city-dropdown-badge">IBGE {c.id}</span>
                </button>
              ))}
            </div>
          )}

          {selectedMun && (
            <div className="active-selected-city-banner">
              <div className="active-city-info">
                <span className="active-city-name">{selectedMun.name} - {selectedMun.uf}</span>
                <span className="active-city-meta">
                  Código IBGE: {selectedMun.id} · Eleitorado apto estimado: {cityData?.eleitorado.toLocaleString('pt-BR') || '---'} eleitores
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Seleção de Cargo */}
        <div className="city-modal-step-section">
          <div className="step-indicator-row">
            <span className="step-number-chip">Passo 2</span>
            <span className="step-label">Selecione o cargo para inspeção</span>
          </div>

          <div className="city-cargos-pills">
            {[
              { id: 'PRESIDENTE', label: 'Presidente da República' },
              { id: 'GOVERNADOR', label: 'Governador' },
              { id: 'SENADOR', label: 'Senador' },
              { id: 'DEPUTADO_FEDERAL', label: 'Deputado Federal' },
              { id: 'DEPUTADO_ESTADUAL', label: 'Deputado Estadual' }
            ].map(c => (
              <button
                key={c.id}
                className={`city-cargo-btn ${selectedCargo === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCargo(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Resultados e Termômetro de Engajamento */}
        <div className="city-modal-step-section">
          <div className="step-indicator-row">
            <span className="step-number-chip">Passo 3</span>
            <span className="step-label">Quem a cidade mais votou e engajamento cívico</span>
          </div>

          {isLoading ? (
            <div className="city-loading-state">
              <span>Carregando dados eleitorais do município...</span>
            </div>
          ) : cityData && (
            <div className="city-results-grid">
              {/* Card 1: Vencedor Local */}
              <div className="city-result-card winner-card">
                <div className="card-top-badge">
                  <Award size={16} />
                  <span>MAIS VOTADO NA CIDADE (2026 · 2º TURNO)</span>
                </div>
                {lider && (
                  <div className="winner-details-row">
                    <div className="winner-number-box">
                      <span className="winner-num">{lider.numero}</span>
                      <span className="winner-party">{lider.partido}</span>
                    </div>
                    <div className="winner-info-col">
                      <strong className="winner-name">{lider.nome}</strong>
                      <div className="winner-pct-bar">
                        <div 
                          className="winner-pct-fill" 
                          style={{ width: `${lider.pct}%`, backgroundColor: lider.numero === '13' ? '#e11d48' : '#2563eb' }}
                        />
                      </div>
                      <div className="winner-stats-line">
                        <span>{formatVotes(lider.votos)} votos ({formatPercent(lider.pct)})</span>
                        <span className="winner-margin">{formatMargin(cityData.eleicao.margem)} de vantagem</span>
                      </div>
                    </div>
                  </div>
                )}

                {segundo && (
                  <div className="runner-up-row">
                    <span className="runner-label">2º colocado na cidade:</span>
                    <strong className="runner-name">{segundo.nome} ({segundo.partido})</strong>
                    <span className="runner-score">{formatVotes(segundo.votos)} votos ({formatPercent(segundo.pct)})</span>
                  </div>
                )}
              </div>

              {/* Card 2: Termômetro de Engajamento Cívico */}
              <div className="city-result-card engagement-card">
                <div className="card-top-badge">
                  <TrendingUp size={16} />
                  <span>PARTICIPAÇÃO LOCAL VS MÉDIA NACIONAL</span>
                </div>

                <div className="engagement-metrics-row">
                  <div className="engagement-metric-box">
                    <span className="eng-label"><UserCheck size={14} /> Comparecimento</span>
                    <strong className="eng-value">{formatPercent(cityData.participacao.pctComparecimento)}</strong>
                    <small className="eng-sub">{formatVotes(cityData.participacao.comparecimento)} eleitores</small>
                  </div>

                  <div className="engagement-metric-box">
                    <span className="eng-label"><UserX size={14} /> Abstenção</span>
                    <strong className="eng-value">{formatPercent(cityData.participacao.pctAbstencao)}</strong>
                    <small className="eng-sub">{formatVotes(cityData.participacao.abstencao)} ausentes</small>
                  </div>
                </div>

                <div className="engagement-comparison-banner">
                  <span className="banner-text">
                    {Number(abstencaoDiff) <= 0 
                      ? `✓ Engajamento positivo: a abstenção nesta cidade ficou ${Math.abs(Number(abstencaoDiff))}% abaixo da média nacional (${cityData.participacao.mediaNacionalAbstencao}%).`
                      : `⚠ Alerta de engajamento: a abstenção local superou a média nacional em +${abstencaoDiff}%.`}
                  </span>
                </div>
              </div>

              {/* Card 3: Deputados com Maior Base Local */}
              <div className="city-result-card base-local-card">
                <div className="card-top-badge">
                  <Vote size={16} />
                  <span>BANCADA COM MAIOR VOTAÇÃO NO MUNICÍPIO</span>
                </div>
                <div className="local-deputies-list">
                  <div className="local-deputy-item">
                    <span className="dep-rank">1º</span>
                    <div className="dep-info">
                      <strong className="dep-name">Deputado Mais Votado</strong>
                      <span className="dep-party">Base Regional · Votação expressiva local</span>
                    </div>
                    <span className="dep-status-badge">MAIS VOTADO</span>
                  </div>
                  <div className="local-deputy-item">
                    <span className="dep-rank">2º</span>
                    <div className="dep-info">
                      <strong className="dep-name">Segundo Mais Votado</strong>
                      <span className="dep-party">Representação Estadual</span>
                    </div>
                    <span className="dep-status-badge">DESTAQUE LOCAL</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="city-modal-footer">
          <span className="official-disclaimer">
            Fonte: Base de Resultados e Totalização Municipal do TSE · Dados Auditáveis
          </span>
          <button className="close-btn-cta" onClick={onClose}>
            Concluir Consulta
          </button>
        </div>
      </div>
    </div>
  );
};
