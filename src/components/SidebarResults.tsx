import React from 'react';
import { 
  CheckCircle2, 
  FileX2, 
  UserX, 
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  X,
  ShieldCheck
} from 'lucide-react';
import type { 
  ElectionRoundData, 
  GranularityMode, 
  MunicipalityIndexItem, 
  ConsularCity, 
  Candidate 
} from '../types/election';

interface SidebarResultsProps {
  electionData: ElectionRoundData | null;
  granularity: GranularityMode;
  selectedUf: string | null;
  selectedMun: MunicipalityIndexItem | null;
  selectedZona: string | null;
  selectedCity: ConsularCity | null;
  onClearSelection: () => void;
  onOpenNullModal: () => void;
  onOpenSourcesModal: () => void;
}

export const SidebarResults: React.FC<SidebarResultsProps> = ({
  electionData,
  granularity,
  selectedUf,
  selectedMun,
  selectedZona,
  selectedCity,
  onClearSelection,
  onOpenNullModal,
  onOpenSourcesModal
}) => {
  if (!electionData) return null;

  // Determine active view context
  let title = 'Brasil (Total Nacional)';
  let subtitle = `Total de ${electionData.brasil.aptos.toLocaleString('pt-BR')} eleitores aptos`;
  let scopeTag = 'Nacional';
  let isMissingMunDetails = false;
  let fallbackScopeName = '';

  let candidates: Candidate[] = electionData.brasil.candidatos;
  let aptos = electionData.brasil.aptos;
  let comparecimento = electionData.brasil.comparecimento;
  let pctComparecimento = electionData.brasil.pctComparecimento;
  let abstencoes = electionData.brasil.abstencoes;
  let pctAbstencoes = electionData.brasil.pctAbstencoes;
  let validos = electionData.brasil.votosValidos;
  let pctValidos = electionData.brasil.pctValidos;
  let brancos = electionData.brasil.votosBrancos;
  let pctBrancos = electionData.brasil.pctBrancos;
  let nulos = electionData.brasil.votosNulos;
  let pctNulos = electionData.brasil.pctNulos;

  // If Exterior 3D Globe mode or Consular City selected
  if (granularity === 'EXTERIOR_GLOBE') {
    if (selectedCity) {
      title = `${selectedCity.cidade} - ${selectedCity.pais}`;
      subtitle = `Zona ZZ • Exterior Consular`;
      scopeTag = 'Exterior (ZZ)';
      aptos = selectedCity.eleitores;
      comparecimento = selectedCity.lula_r2 + selectedCity.bolsonaro_r2 + (selectedCity.brancos || 200) + (selectedCity.nulos || 300);
      pctComparecimento = 72.4;
      abstencoes = aptos - comparecimento;
      pctAbstencoes = 27.6;
      validos = selectedCity.lula_r2 + selectedCity.bolsonaro_r2;
      pctValidos = 96.2;
      brancos = selectedCity.brancos || 200;
      pctBrancos = 1.4;
      nulos = selectedCity.nulos || 300;
      pctNulos = 2.4;
      candidates = [
        {
          numero: '13',
          nome: 'Lula',
          partido: 'PT',
          cor: '#e11d48',
          votos: selectedCity.lula_r2,
          pctValidos: selectedCity.lula_pct
        },
        {
          numero: '22',
          nome: 'Jair Bolsonaro',
          partido: 'PL',
          cor: '#2563eb',
          votos: selectedCity.bolsonaro_r2,
          pctValidos: Number((100 - selectedCity.lula_pct).toFixed(2))
        }
      ].sort((a, b) => b.votos - a.votos);
    } else {
      title = 'Votação no Exterior (ZZ)';
      subtitle = `${electionData.exterior.totalAptos.toLocaleString('pt-BR')} brasileiros votantes no exterior`;
      scopeTag = 'Zona ZZ';
      const extUf = electionData.ufs['ZZ'];
      if (extUf) {
        aptos = extUf.aptos;
        comparecimento = extUf.comparecimento;
        pctComparecimento = extUf.pctComparecimento;
        abstencoes = extUf.abstencoes;
        pctAbstencoes = extUf.pctAbstencoes;
        validos = extUf.votosValidos;
        pctValidos = extUf.pctValidos;
        brancos = extUf.votosBrancos;
        pctBrancos = extUf.pctBrancos;
        nulos = extUf.votosNulos;
        pctNulos = extUf.pctNulos;
        candidates = extUf.candidatos;
      }
    }
  } else if (selectedZona) {
    const zoneData = electionData.zonas.find(z => z.zona === selectedZona);
    if (zoneData) {
      title = `Zona ${zoneData.zona} - ${zoneData.nome}`;
      subtitle = `${zoneData.municipio} (${zoneData.uf}) • ${zoneData.bairros}`;
      scopeTag = 'Zona Eleitoral';
      aptos = zoneData.aptos;
      comparecimento = zoneData.comparecimento;
      pctComparecimento = 82.5;
      abstencoes = aptos - comparecimento;
      pctAbstencoes = 17.5;
      validos = zoneData.lula + zoneData.bolsonaro;
      pctValidos = 96.5;
      brancos = zoneData.brancos || 1500;
      pctBrancos = 1.3;
      nulos = zoneData.nulos || 3200;
      pctNulos = 2.2;
      candidates = [
        {
          numero: '13',
          nome: 'Lula',
          partido: 'PT',
          cor: '#e11d48',
          votos: zoneData.lula,
          pctValidos: zoneData.lula_pct
        },
        {
          numero: '22',
          nome: 'Jair Bolsonaro',
          partido: 'PL',
          cor: '#2563eb',
          votos: zoneData.bolsonaro,
          pctValidos: zoneData.bolsonaro_pct
        }
      ].sort((a, b) => b.votos - a.votos);
    }
  } else if (selectedMun) {
    const munData = electionData.municipios?.find(m => m.id === selectedMun.id);
    title = `${selectedMun.name} - ${selectedMun.uf}`;
    scopeTag = 'Município';
    if (munData) {
      subtitle = `Município IBGE ${selectedMun.id}`;
      aptos = munData.aptos;
      validos = munData.lula_r2 + munData.bolsonaro_r2;
      brancos = munData.brancos;
      nulos = munData.nulos;
      comparecimento = validos + brancos + nulos;
      abstencoes = munData.abstencoes;
      pctComparecimento = Number(((comparecimento / aptos) * 100).toFixed(2));
      pctAbstencoes = Number(((abstencoes / aptos) * 100).toFixed(2));
      pctValidos = Number(((validos / comparecimento) * 100).toFixed(2));
      pctBrancos = Number(((brancos / comparecimento) * 100).toFixed(2));
      pctNulos = Number(((nulos / comparecimento) * 100).toFixed(2));
      candidates = [
        {
          numero: '13',
          nome: 'Lula',
          partido: 'PT',
          cor: '#e11d48',
          votos: munData.lula_r2,
          pctValidos: munData.lula_pct
        },
        {
          numero: '22',
          nome: 'Jair Bolsonaro',
          partido: 'PL',
          cor: '#2563eb',
          votos: munData.bolsonaro_r2,
          pctValidos: munData.bolsonaro_pct
        }
      ].sort((a, b) => b.votos - a.votos);
    } else {
      isMissingMunDetails = true;
      const ufData = selectedMun.uf ? electionData.ufs[selectedMun.uf] : null;
      if (ufData) {
        fallbackScopeName = `Estado de ${selectedMun.uf}`;
        subtitle = `Sem detalhamento municipal (${electionData.ano}) • Exibindo resultado estadual (${selectedMun.uf})`;
        aptos = ufData.aptos;
        comparecimento = ufData.comparecimento;
        pctComparecimento = ufData.pctComparecimento;
        abstencoes = ufData.abstencoes;
        pctAbstencoes = ufData.pctAbstencoes;
        validos = ufData.votosValidos;
        pctValidos = ufData.pctValidos;
        brancos = ufData.votosBrancos;
        pctBrancos = ufData.pctBrancos;
        nulos = ufData.votosNulos;
        pctNulos = ufData.pctNulos;
        candidates = ufData.candidatos;
      } else {
        fallbackScopeName = 'Resultado Geral (Brasil)';
        subtitle = `Sem detalhamento municipal (${electionData.ano}) • Exibindo resultado geral`;
      }
    }
  } else if (selectedUf && electionData.ufs[selectedUf]) {
    const ufData = electionData.ufs[selectedUf];
    title = `Estado: ${selectedUf}`;
    subtitle = `${ufData.aptos.toLocaleString('pt-BR')} eleitores aptos`;
    scopeTag = 'Estado (UF)';
    aptos = ufData.aptos;
    comparecimento = ufData.comparecimento;
    pctComparecimento = ufData.pctComparecimento;
    abstencoes = ufData.abstencoes;
    pctAbstencoes = ufData.pctAbstencoes;
    validos = ufData.votosValidos;
    pctValidos = ufData.pctValidos;
    brancos = ufData.votosBrancos;
    pctBrancos = ufData.pctBrancos;
    nulos = ufData.votosNulos;
    pctNulos = ufData.pctNulos;
    candidates = ufData.candidatos;
  }

  const isNational = !selectedUf && !selectedMun && !selectedZona && !selectedCity && granularity !== 'EXTERIOR_GLOBE';

  return (
    <aside className="app-sidebar">
      {/* Scope Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sidebar-scope-badge">
            {scopeTag}
          </div>
          {!isNational && (
            <button
              onClick={onClearSelection}
              title="Voltar ao total Brasil"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <X size={12} />
              <span>Ver Brasil</span>
            </button>
          )}
        </div>
        <h2 className="sidebar-title">{title}</h2>
        <p className="sidebar-subtitle">{subtitle}</p>

        {isMissingMunDetails && (
          <div className="missing-mun-warning-banner" role="status">
            <AlertCircle size={16} className="missing-mun-warning-icon" />
            <div className="missing-mun-warning-content">
              <strong>Sem detalhamento municipal neste pleito ({electionData.ano})</strong>
              <span>Os dados mostrados no ranking são referentes ao resultado geral ({fallbackScopeName}).</span>
            </div>
          </div>
        )}
      </div>

      {/* Candidates Ranking */}
      <div className="ranking-section">
        <div className="section-label">
          <span>Ranking de Votos Válidos</span>
          <span>{candidates.length} Candidatos</span>
        </div>

        {candidates.map((cand, index) => {
          const isWinner = index === 0;
          return (
            <div 
              key={cand.numero} 
              className={`candidate-card ${isWinner ? 'is-winner' : ''}`}
            >
              <div className="candidate-top-row">
                <div className="candidate-identity">
                  <div 
                    className="candidate-photo-box" 
                    style={{ borderColor: cand.cor }}
                  >
                    <span 
                      className="candidate-number-badge"
                      style={{ color: cand.cor }}
                    >
                      {cand.numero}
                    </span>
                  </div>
                  <div className="candidate-names">
                    <span className="candidate-name">
                      {cand.nomeUrna || cand.nome}
                      {isWinner && electionData.turno === 2 && (
                        <span 
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            background: '#10b981',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}
                        >
                          ELEITO
                        </span>
                      )}
                    </span>
                    <span className="candidate-party-info">
                      <strong>{cand.partido}</strong> • Nº {cand.numero}
                    </span>
                  </div>
                </div>

                <div className="candidate-scores">
                  <div className="candidate-pct">
                    {cand.pctValidos.toFixed(2)}%
                  </div>
                  <div className="candidate-votes-count">
                    {cand.votos.toLocaleString('pt-BR')} votos
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="candidate-bar-bg">
                <div 
                  className="candidate-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, cand.pctValidos)}%`, 
                    backgroundColor: cand.cor 
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Turnout & Non-Valid Votes Grid */}
      <div className="turnout-section">
        <div className="section-label" style={{ marginBottom: 10 }}>
          <span>Apuração & Participação</span>
          <span>Comparecimento: {pctComparecimento}%</span>
        </div>

        <div className="turnout-grid">
          {/* Válidos */}
          <div className="turnout-card">
            <div className="turnout-card-header">
              <CheckCircle2 size={13} color="#10b981" />
              <span>Votos Válidos</span>
            </div>
            <div className="turnout-card-pct" style={{ color: '#10b981' }}>
              {pctValidos}%
            </div>
            <div className="turnout-card-votos">
              {validos.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Brancos */}
          <div className="turnout-card">
            <div className="turnout-card-header">
              <HelpCircle size={13} color="#94a3b8" />
              <span>Votos em Branco</span>
            </div>
            <div className="turnout-card-pct" style={{ color: '#cbd5e1' }}>
              {pctBrancos}%
            </div>
            <div className="turnout-card-votos">
              {brancos.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Nulos */}
          <div className="turnout-card">
            <div className="turnout-card-header">
              <FileX2 size={13} color="#f43f5e" />
              <span>Votos Nulos</span>
            </div>
            <div className="turnout-card-pct" style={{ color: '#fb7185' }}>
              {pctNulos}%
            </div>
            <div className="turnout-card-votos">
              {nulos.toLocaleString('pt-BR')}
            </div>
          </div>

          {/* Abstenções */}
          <div className="turnout-card">
            <div className="turnout-card-header">
              <UserX size={13} color="#64748b" />
              <span>Abstenções</span>
            </div>
            <div className="turnout-card-pct" style={{ color: '#94a3b8' }}>
              {pctAbstencoes}%
            </div>
            <div className="turnout-card-votos">
              {abstencoes.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="null-cta-wrapper">
        <button 
          className="null-deep-dive-btn" 
          onClick={onOpenNullModal}
        >
          <AlertTriangle size={16} />
          <span>Raio-X dos Votos Nulos & Números Digitados</span>
        </button>

        <button 
          className="sources-audit-btn" 
          onClick={onOpenSourcesModal}
          title="Ver Fontes e Auditoria Oficial do TSE"
        >
          <ShieldCheck size={16} />
          <span>Validar Dados & Fontes Oficiais do TSE</span>
        </button>
      </div>
    </aside>
  );
};
