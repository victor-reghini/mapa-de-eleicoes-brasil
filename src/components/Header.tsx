import React from 'react';
import { Vote, Database, ShieldCheck } from 'lucide-react';
import type { ElectionManifest } from '../types/election';

interface HeaderProps {
  manifest: ElectionManifest | null;
  selectedAno: number;
  selectedTurno: number;
  onSelectAno: (ano: number) => void;
  onSelectTurno: (turno: number) => void;
  onOpenScalabilityModal: () => void;
  onOpenSourcesModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  manifest,
  selectedAno,
  selectedTurno,
  onSelectAno,
  onSelectTurno,
  onOpenScalabilityModal,
  onOpenSourcesModal
}) => {
  const currentElection = manifest?.supportedElections.find(e => e.ano === selectedAno);
  const availableTurnos = currentElection?.turnos || [1, 2];

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
            Visualizador Geoespacial Presidencial • 1989 a 2022 (Redemocratização)
          </p>
        </div>
      </div>

      <div className="header-controls">
        {/* Cargo Selector (Minimized Select with disabled placeholders) */}
        <div className="select-group">
          <select 
            className="control-select"
            defaultValue="PRESIDENTE"
            onChange={(e) => {
              if (e.target.value !== 'PRESIDENTE') {
                onOpenScalabilityModal();
              }
            }}
            aria-label="Selecionar Cargo Eletivo"
          >
            <option value="PRESIDENTE">Presidente</option>
            <option value="GOVERNADOR" disabled>Governador (em breve)</option>
            <option value="SENADOR" disabled>Senador (em breve)</option>
            <option value="DEPUTADO_FEDERAL" disabled>Deputado Federal (em breve)</option>
            <option value="DEPUTADO_ESTADUAL" disabled>Deputado Estadual (em breve)</option>
            <option value="PREFEITO" disabled>Prefeito (em breve)</option>
            <option value="VEREADOR" disabled>Vereador (em breve)</option>
          </select>
        </div>

        {/* Year Selector (Only Year numbers: 2022, 2018, ...) */}
        <div className="select-group">
          <select 
            className="control-select"
            value={selectedAno}
            onChange={(e) => onSelectAno(Number(e.target.value))}
            aria-label="Selecionar Ano"
          >
            {manifest?.supportedElections.map((elec) => (
              <option key={elec.id} value={elec.ano}>
                {elec.ano}
              </option>
            ))}
          </select>
        </div>

        {/* Turno Selector (kept as is) */}
        <div className="turno-pill-group" role="group" aria-label="Selecionar Turno">
          {availableTurnos.map((t) => (
            <button
              key={t}
              className={`turno-btn ${selectedTurno === t ? 'active' : ''}`}
              onClick={() => onSelectTurno(t)}
            >
              {t}º Turno
            </button>
          ))}
        </div>

        {/* Minimized Database Icon Button */}
        <a 
          href="/data/eleicoes_brasil.db" 
          download="eleicoes_brasil.db"
          className="db-icon-btn"
          title="Baixar banco SQLite local (1989-2022)"
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
