import React from 'react';
import { Vote, Database, ShieldCheck } from 'lucide-react';
import type { ElectionCargo, ElectionManifest } from '../types/election';

interface HeaderProps {
  manifest: ElectionManifest | null;
  selectedAno: number;
  selectedTurno: number;
  selectedCargo: ElectionCargo;
  onSelectAno: (ano: number) => void;
  onSelectTurno: (turno: number) => void;
  onSelectCargo: (cargo: ElectionCargo) => void;
  onOpenScalabilityModal?: () => void;
  onOpenSourcesModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  manifest,
  selectedAno,
  selectedTurno,
  selectedCargo,
  onSelectAno,
  onSelectTurno,
  onSelectCargo,
  onOpenScalabilityModal: _onOpenScalabilityModal,
  onOpenSourcesModal
}) => {
  const isMunicipalCargo = selectedCargo === 'PREFEITO' || selectedCargo === 'VEREADOR';

  // Filter supported elections by whether they are municipal or general
  const filteredElections = (manifest?.supportedElections || []).filter(e => {
    const isMun = e.cargo === 'PREFEITO' || e.cargo === 'VEREADOR';
    return isMunicipalCargo ? isMun : !isMun;
  });

  // Extract unique sorted years for this category
  const availableYears = Array.from(
    new Set(filteredElections.map(e => e.ano))
  ).sort((a, b) => b - a);

  // Fallback to standard cycles if manifest is loading
  const displayYears = availableYears.length > 0 
    ? availableYears 
    : (isMunicipalCargo ? [2024, 2020, 2016, 2012] : [2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1989]);

  const isSingleRoundCargo = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(selectedCargo);
  const currentElection = filteredElections.find(
    e => e.ano === selectedAno && (e.cargo === selectedCargo || selectedCargo === 'PRESIDENTE')
  );
  const availableTurnos = isSingleRoundCargo ? [1] : (currentElection?.turnos || [1, 2]);

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-badge">
          <Vote size={22} color="#ffffff" strokeWidth={2.2} />
        </div>
        <div className="brand-titles">
          <h1>
            Mapa Eleitoral Brasil
            <span
              className="brand-tag clickable"
              onClick={onOpenSourcesModal}
              title="Abrir Fontes Oficiais & Auditoria dos Dados (TSE & IBGE)"
              role="button"
              tabIndex={0}
            >
              TSE Dados Abertos
            </span>
          </h1>
          <p className="brand-subtitle">
            Resultados das últimas eleições
          </p>
        </div>
      </div>

      <div className="header-controls">
        {/* Cargo Selector */}
        <div className="select-group">
          <select
            className="control-select"
            value={selectedCargo}
            onChange={(e) => onSelectCargo(e.target.value as ElectionCargo)}
            aria-label="Selecionar Cargo Eletivo"
          >
            <option value="PRESIDENTE">Presidente</option>
            <option value="GOVERNADOR">Governador</option>
            <option value="SENADOR">Senador</option>
            <option value="DEPUTADO_FEDERAL">Deputado Federal</option>
            <option value="DEPUTADO_ESTADUAL">Deputado Estadual</option>
            <option value="PREFEITO">Prefeito</option>
            <option value="VEREADOR">Vereador</option>
          </select>
        </div>

        {/* Year Selector */}
        <div className="select-group">
          <select
            className="control-select"
            value={selectedAno}
            onChange={(e) => onSelectAno(Number(e.target.value))}
            aria-label="Selecionar Ano"
          >
            {displayYears.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        {/* Turno Selector */}
        <div className="turno-pill-group" role="group" aria-label="Selecionar Turno">
          {availableTurnos.map((t) => {
            const isLive = selectedAno === 2026 && t === 2;
            return (
              <button
                key={t}
                className={`turno-btn ${selectedTurno === t ? 'active' : ''} ${isLive ? 'live-turno' : ''}`}
                onClick={() => onSelectTurno(t)}
                title={isLive ? 'Apuração em tempo real oficial do TSE' : `${t}º Turno`}
              >
                {isLive && <span className="live-dot" />}
                {t}º Turno {isLive ? '(Ao Vivo)' : ''}
              </button>
            );
          })}
        </div>

        {/* Minimized Database Icon Button */}
        <a
          href="/data/eleicoes_brasil.db"
          download="eleicoes_brasil.db"
          className="db-icon-btn"
          title="Baixar banco SQLite local (1989-2026)"
          aria-label="Baixar banco SQLite"
        >
          <Database size={16} />
        </a>

        {/* Official Sources & Audit Modal Button */}
        <button
          type="button"
          onClick={onOpenSourcesModal}
          className="sources-icon-btn"
          title="Validar dados & Fontes Oficiais do TSE"
          aria-label="Fontes e Auditoria Oficial do TSE"
        >
          <ShieldCheck size={16} />
        </button>
      </div>
    </header>
  );
};
