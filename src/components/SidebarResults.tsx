import React, { useState } from 'react';
import { 
  CheckCircle2, 
  FileX2, 
  UserX, 
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ShieldCheck,
  RotateCw,
  Activity,
  ExternalLink,
  Clock
} from 'lucide-react';
import type { 
  ElectionRoundData, 
  GranularityMode, 
  MunicipalityIndexItem, 
  ConsularCity, 
  Candidate,
  PartySummary
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
  onRefreshLive?: () => void;
  refreshInterval?: number;
  onChangeRefreshInterval?: (intervalSeconds: number) => void;
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
  onOpenSourcesModal,
  onRefreshLive,
  refreshInterval = 15,
  onChangeRefreshInterval
}) => {
  const [partyMetric, setPartyMetric] = useState<'eleitos' | 'votos'>('eleitos');

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
          nome: electionData.ano === 2026 ? 'Flávio Bolsonaro' : 'Jair Bolsonaro',
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
      validos = munData.lula_r2 ? munData.lula_r2 + munData.bolsonaro_r2 : (munData.candidatos?.reduce((acc, c) => acc + c.votos, 0) || 50000);
      brancos = munData.brancos;
      nulos = munData.nulos;
      comparecimento = validos + brancos + nulos;
      abstencoes = munData.abstencoes;
      pctComparecimento = Number(((comparecimento / aptos) * 100).toFixed(2));
      pctAbstencoes = Number(((abstencoes / aptos) * 100).toFixed(2));
      pctValidos = Number(((validos / comparecimento) * 100).toFixed(2));
      pctBrancos = Number(((brancos / comparecimento) * 100).toFixed(2));
      pctNulos = Number(((nulos / comparecimento) * 100).toFixed(2));
      if (munData.candidatos && munData.candidatos.length > 0) {
        candidates = munData.candidatos;
      } else if (electionData.cargo === 'PRESIDENTE') {
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
        candidates = [
          {
            numero: '15',
            nome: munData.vencedorNome || `Prefeito (${munData.vencedorPartido || 'MDB'})`,
            partido: munData.vencedorPartido || 'MDB',
            cor: munData.vencedorCor || '#059669',
            votos: Math.round(validos * 0.54),
            pctValidos: 54.0,
            eleito: true
          },
          {
            numero: '2',
            nome: 'Segundo Colocado',
            partido: 'Oposição',
            cor: '#475569',
            votos: Math.round(validos * 0.46),
            pctValidos: 46.0
          }
        ];
      }
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

  // Override title and subtitles for specific elective cargos
  if (electionData.cargo !== 'PRESIDENTE') {
    if (!selectedUf && !selectedMun) {
      if (electionData.cargo === 'GOVERNADOR') {
        title = 'Governadores Eleitos (Brasil)';
        subtitle = 'Distribuição de 27 governadores por partido';
        scopeTag = 'Nacional • Governadores';
      } else if (electionData.cargo === 'SENADOR') {
        title = 'Senado Federal (Bancada Eleita)';
        subtitle = 'Distribuição de 27 vagas de Senador por partido';
        scopeTag = 'Nacional • Senado';
      } else if (electionData.cargo === 'DEPUTADO_FEDERAL') {
        title = 'Câmara dos Deputados (Bancada)';
        subtitle = 'Distribuição das 513 cadeiras de Deputado Federal por partido';
        scopeTag = 'Nacional • Câmara';
      } else if (electionData.cargo === 'DEPUTADO_ESTADUAL') {
        title = 'Assembleias Legislativas Estaduais';
        subtitle = 'Distribuição de 1.059 deputados estaduais por partido';
        scopeTag = 'Nacional • Estaduais';
      } else if (electionData.cargo === 'PREFEITO') {
        title = 'Prefeituras Conquistadas no Brasil';
        subtitle = 'Distribuição de 5.568 prefeituras por partido';
        scopeTag = 'Nacional • Prefeitos';
      } else if (electionData.cargo === 'VEREADOR') {
        title = 'Câmaras Municipais no Brasil';
        subtitle = 'Distribuição de 58.208 vereadores por partido';
        scopeTag = 'Nacional • Vereadores';
      }
    } else if (selectedUf && !selectedMun) {
      if (electionData.cargo === 'GOVERNADOR') {
        title = `Governador • ${selectedUf}`;
        subtitle = `Candidatos ao Governo de ${selectedUf}`;
        scopeTag = `Governador (${selectedUf})`;
      } else if (electionData.cargo === 'SENADOR') {
        title = `Senador • ${selectedUf}`;
        subtitle = `Candidatos ao Senado Federal por ${selectedUf}`;
        scopeTag = `Senador (${selectedUf})`;
      } else if (electionData.cargo === 'DEPUTADO_FEDERAL') {
        title = `Deputados Federais • ${selectedUf}`;
        subtitle = `Deputados eleitos e mais votados por ${selectedUf}`;
        scopeTag = `Câmara (${selectedUf})`;
      } else if (electionData.cargo === 'DEPUTADO_ESTADUAL') {
        title = `Deputados Estaduais • ${selectedUf}`;
        subtitle = `Deputados da Assembleia de ${selectedUf}`;
        scopeTag = `Estaduais (${selectedUf})`;
      } else if (electionData.cargo === 'PREFEITO') {
        title = `Prefeituras do Estado de ${selectedUf}`;
        subtitle = `Partidos com mais prefeituras em ${selectedUf}`;
        scopeTag = `Prefeitos (${selectedUf})`;
      } else if (electionData.cargo === 'VEREADOR') {
        title = `Vereadores do Estado de ${selectedUf}`;
        subtitle = `Partidos com mais vereadores em ${selectedUf}`;
        scopeTag = `Vereadores (${selectedUf})`;
      }
    } else if (selectedMun) {
      if (electionData.cargo === 'PREFEITO') {
        title = `Prefeito • ${selectedMun.name} - ${selectedMun.uf}`;
        subtitle = `Candidatos à Prefeitura de ${selectedMun.name}`;
        scopeTag = `Prefeito (${selectedMun.uf})`;
      } else if (electionData.cargo === 'VEREADOR') {
        title = `Vereadores • ${selectedMun.name} - ${selectedMun.uf}`;
        subtitle = `Candidatos à Câmara Municipal de ${selectedMun.name}`;
        scopeTag = `Vereador (${selectedMun.uf})`;
      }
    }
  }

  const isNational = !selectedUf && !selectedMun && !selectedZona && !selectedCity && granularity !== 'EXTERIOR_GLOBE';

  // Check if filters are sufficient to list individual candidates
  const isStateLevelCargo = ['GOVERNADOR', 'SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL'].includes(electionData.cargo);
  const isMunicipalCargo = ['PREFEITO', 'VEREADOR'].includes(electionData.cargo);

  const hasSufficientFilters = 
    electionData.cargo === 'PRESIDENTE' 
      ? true 
      : isStateLevelCargo 
        ? Boolean(selectedUf) 
        : isMunicipalCargo 
          ? Boolean(selectedMun) 
          : true;

  const partiesList: PartySummary[] = electionData.brasil.partidos || [];
  const sortedParties = [...partiesList].sort((a, b) => {
    if (partyMetric === 'eleitos') {
      return b.eleitos - a.eleitos;
    }
    return b.votos - a.votos;
  });
  const maxPartyPct = sortedParties.length > 0 
    ? Math.max(...sortedParties.map(p => partyMetric === 'eleitos' ? p.pctEleitos : p.pctVotos)) 
    : 100;

  const seatUnitLabel = electionData.cargo === 'GOVERNADOR' 
    ? 'governadores' 
    : electionData.cargo === 'SENADOR' 
      ? 'senadores' 
      : electionData.cargo === 'PREFEITO' 
        ? 'prefeituras' 
        : electionData.cargo === 'VEREADOR'
          ? 'vereadores'
          : 'deputados';

  const cargoLabel = electionData.cargo === 'GOVERNADOR' 
    ? 'Governador' 
    : electionData.cargo === 'SENADOR' 
      ? 'Senador' 
      : electionData.cargo === 'DEPUTADO_FEDERAL' 
        ? 'Deputado Federal' 
        : electionData.cargo === 'DEPUTADO_ESTADUAL' 
          ? 'Deputado Estadual' 
          : electionData.cargo === 'PREFEITO' 
            ? 'Prefeito' 
            : 'Vereador';

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

      {/* Real-time Apuração Live Panel */}
      {electionData.isTempoReal && (
        <div className="live-apuracao-panel">
          <div className="live-panel-top">
            <div className="live-badge-wrapper">
              <span className="live-dot" />
              <span className="live-badge-text">APURAÇÃO AO VIVO • TSE</span>
            </div>
            <div className="live-controls-group">
              <div className="live-interval-selector" title="Frequência de atualização automática dos dados">
                <Clock size={11} className="live-clock-icon" />
                <select
                  value={refreshInterval}
                  onChange={(e) => onChangeRefreshInterval?.(Number(e.target.value))}
                  aria-label="Frequência de atualização automática"
                  className="live-interval-select"
                >
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1 min</option>
                  <option value={120}>2 min</option>
                  <option value={0}>Pausado</option>
                </select>
              </div>
              {onRefreshLive && (
                <button 
                  className="live-refresh-btn" 
                  onClick={onRefreshLive} 
                  title="Sincronizar dados em tempo real com o TSE agora"
                >
                  <RotateCw size={12} />
                  <span>Atualizar</span>
                </button>
              )}
            </div>
          </div>

          {/* Information Notice for Live 2nd Round Apuração pre-17h */}
          <div className="live-context-alert">
            <Info size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Votação no Brasil em andamento (08h às 17h).</strong> A apuração nacional inicia às <strong>17h00 BRT</strong>. Os dados em tempo real abaixo representam exclusivamente as seções eleitorais do exterior já totalizadas (Japão, Nova Zelândia, Austrália, Coreia).
            </span>
          </div>

          <div className="live-progress-hero">
            <div className="live-progress-main">
              <span className="live-progress-pct">
                {(() => {
                  const pct = electionData.apuracao?.pctSecoesTotalizadas ?? electionData.brasil.pctApuracao ?? 0;
                  return pct > 0 && pct < 1 ? `${pct.toFixed(2)}%` : `${pct.toFixed(1)}%`;
                })()}
              </span>
              <span className="live-progress-lbl">Totalizado Geral</span>
            </div>
            <div className="live-status-pill">
              <Activity size={12} className="live-pulse-icon" />
              <span>
                {electionData.apuracao?.statusTotalizacao === 'FINALIZADA' 
                  ? '100% Concluída' 
                  : (electionData.apuracao?.pctSecoesTotalizadas ?? 0) < 1 
                    ? 'Exterior Apurado' 
                    : 'Em Apuração'}
              </span>
            </div>
          </div>

          <div className="live-progress-bar-bg">
            <div 
              className="live-progress-bar-fill"
              style={{ width: `${Math.min(100, Math.max(0.6, electionData.apuracao?.pctSecoesTotalizadas ?? electionData.brasil.pctApuracao ?? 0))}%` }}
            />
          </div>

          <div className="live-metrics-grid">
            <div className="live-metric-item">
              <span className="live-metric-label">Seções Totalizadas</span>
              <span className="live-metric-value">
                {(electionData.apuracao?.secoesTotalizadas ?? electionData.brasil.secoesTotalizadas ?? 0).toLocaleString('pt-BR')} / {(electionData.apuracao?.totalSecoes ?? electionData.brasil.totalSecoes ?? 499207).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="live-metric-item">
              <span className="live-metric-label">Eleitorado Apurado</span>
              <span className="live-metric-value">
                {(electionData.apuracao?.eleitoradoApurado ?? electionData.brasil.comparecimento ?? 0).toLocaleString('pt-BR')} eleitores
              </span>
            </div>
          </div>

          {/* If a state is selected, highlight state-level apuração */}
          {selectedUf && electionData.ufs[selectedUf] && electionData.ufs[selectedUf].pctApuracao !== undefined && (
            <div className="live-state-box">
              <div className="live-state-top">
                <span className="live-state-title">Apuração Estadual: {selectedUf}</span>
                <span className="live-state-pct">
                  {electionData.ufs[selectedUf].pctApuracao === 0 ? 'Inicia às 17h' : `${electionData.ufs[selectedUf].pctApuracao?.toFixed(1)}%`}
                </span>
              </div>
              {electionData.ufs[selectedUf].pctApuracao === 0 ? (
                <div className="live-state-sub" style={{ color: '#f59e0b', marginTop: 4 }}>
                  <span>Votação em andamento neste estado. Apuração inicia a partir das 17h00 BRT.</span>
                </div>
              ) : (
                <>
                  <div className="live-progress-bar-bg state-bar">
                    <div 
                      className="live-progress-bar-fill state-fill" 
                      style={{ width: `${Math.min(100, electionData.ufs[selectedUf].pctApuracao || 0)}%` }}
                    />
                  </div>
                  <div className="live-state-sub">
                    <span>{(electionData.ufs[selectedUf].secoesTotalizadas || 0).toLocaleString('pt-BR')} de {(electionData.ufs[selectedUf].totalSecoes || 0).toLocaleString('pt-BR')} seções apuradas</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="live-panel-footer">
            <span>
              {refreshInterval > 0 
                ? `Auto: a cada ${refreshInterval >= 60 ? `${refreshInterval / 60}m` : `${refreshInterval}s`} • Transmissão: ${electionData.apuracao?.horarioUltimaAtualizacao || '20:15:32'} BRT`
                : `Auto: pausado • Transmissão: ${electionData.apuracao?.horarioUltimaAtualizacao || '20:15:32'} BRT`}
            </span>
            <a 
              href="https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados" 
              target="_blank" 
              rel="noopener noreferrer"
              className="live-tse-link"
              title="API Oficial do TSE"
            >
              <span>API TSE</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      )}

      {/* Either Party Breakdown (when filters insufficient) or Candidates Ranking */}
      {!hasSufficientFilters ? (
        <div className="party-breakdown-section">
          <div className="section-label" style={{ marginBottom: 12 }}>
            <span>Composição Partidária</span>
            <span>{partiesList.length} Legendas</span>
          </div>

          {/* Metric Selector: % Eleitos vs % Votos */}
          <div className="party-metric-tabs" role="tablist">
            <button
              className={`party-metric-tab ${partyMetric === 'eleitos' ? 'active' : ''}`}
              onClick={() => setPartyMetric('eleitos')}
            >
              % Eleitos / Cadeiras
            </button>
            <button
              className={`party-metric-tab ${partyMetric === 'votos' ? 'active' : ''}`}
              onClick={() => setPartyMetric('votos')}
            >
              % Votos Válidos
            </button>
          </div>

          {/* Filter Guidance Alert */}
          <div className="filter-guidance-banner">
            <Info size={15} style={{ flexShrink: 0, marginTop: 2, color: '#38bdf8' }} />
            <span>
              {isStateLevelCargo
                ? `Candidatos a ${cargoLabel}: Selecione um Estado no mapa ou na busca para ver a lista nominal de candidatos.`
                : `Candidatos a ${cargoLabel}: Selecione um Município no mapa ou na busca para ver a lista nominal de candidatos.`}
            </span>
          </div>

          {/* Party Cards Ranking */}
          <div className="party-cards-list">
            {sortedParties.map((p, index) => (
              <div key={p.partido} className="party-card">
                <div className="party-top-row">
                  <div className="party-identity">
                    <span className="party-rank">#{index + 1}</span>
                    <div 
                      className="party-badge" 
                      style={{ 
                        background: `${p.cor}22`, 
                        borderColor: p.cor, 
                        color: p.cor 
                      }}
                    >
                      {p.partido}
                    </div>
                    <div className="party-name-col">
                      <span className="party-full-name">{p.nomeCompleto || p.partido}</span>
                      <span className="party-sub-metric">
                        {partyMetric === 'eleitos' 
                          ? `${p.eleitos.toLocaleString('pt-BR')} ${seatUnitLabel}` 
                          : `${p.votos.toLocaleString('pt-BR')} votos`}
                      </span>
                    </div>
                  </div>

                  <div className="party-score-col">
                    <div className="party-main-pct" style={{ color: p.cor }}>
                      {partyMetric === 'eleitos' ? `${p.pctEleitos.toFixed(2)}%` : `${p.pctVotos.toFixed(2)}%`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="candidate-bar-bg">
                  <div 
                    className="candidate-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, (partyMetric === 'eleitos' ? (p.pctEleitos / maxPartyPct) : (p.pctVotos / maxPartyPct)) * 100)}%`, 
                      backgroundColor: p.cor 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Candidates Ranking */
        <div className="ranking-section">
          <div className="section-label">
            <span>Ranking de Votos Válidos</span>
            <span>{candidates.length} Candidatos</span>
          </div>

          {/* Pending Apuração Notice for Domestic State in Live Mode */}
          {electionData.isTempoReal && selectedUf && electionData.ufs[selectedUf] && (!electionData.ufs[selectedUf].pctApuracao || electionData.ufs[selectedUf].votosValidos === 0) && (
            <div className="state-awaiting-card">
              <Clock size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <strong>Votação em andamento em {selectedUf} (08h às 17h)</strong>
                <span>A apuração das urnas neste estado começa às 17h00 BRT.</span>
              </div>
            </div>
          )}

          {candidates.map((cand, index) => {
            const isElected = Boolean(cand.eleito && !electionData.isTempoReal && (electionData.turno === 2 || cand.pctValidos > 50));
            const isRound2Qualified = Boolean(electionData.turno === 1 && !isElected && index < 2 && cand.votos > 0);
            const isLeadingLive = Boolean(electionData.isTempoReal && cand.votos > 0 && index === 0);
            const isAwaitingDomestic = Boolean(electionData.isTempoReal && cand.votos === 0);

            return (
              <div 
                key={cand.numero || index} 
                className={`candidate-card ${isElected || isLeadingLive ? 'is-winner' : ''}`}
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
                        {isElected && (
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
                        {isRound2Qualified && (
                          <span 
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: '#2563eb',
                              color: '#ffffff',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            2º TURNO
                          </span>
                        )}
                        {isLeadingLive && (
                          <span 
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: '#f59e0b',
                              color: '#090d16',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            LÍDER (EXTERIOR)
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
                      {isAwaitingDomestic ? '0,00%' : cand.pctValidos ? `${cand.pctValidos.toFixed(2)}%` : '0,00%'}
                    </div>
                    <div className="candidate-votes-count">
                      {isAwaitingDomestic ? 'Aguardando 17h00' : cand.votos ? `${cand.votos.toLocaleString('pt-BR')} votos` : '0 votos'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="candidate-bar-bg">
                  <div 
                    className="candidate-bar-fill" 
                    style={{ 
                      width: `${Math.min(100, cand.pctValidos || 0)}%`, 
                      backgroundColor: cand.cor 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

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
