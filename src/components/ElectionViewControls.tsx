import React from 'react';
import type { ElectionCargo, ElectionManifest } from '../types/election';

interface ElectionViewControlsProps {
  manifest: ElectionManifest | null;
  selectedAno: number;
  selectedTurno: number;
  selectedCargo: ElectionCargo;
  onSelectAno: (ano: number) => void;
  onSelectTurno: (turno: number) => void;
  onSelectCargo: (cargo: ElectionCargo) => void;
}

export const ElectionViewControls: React.FC<ElectionViewControlsProps> = ({
  manifest,
  selectedAno,
  selectedTurno,
  selectedCargo,
  onSelectAno,
  onSelectTurno,
  onSelectCargo,
}) => {
  const isMunicipalCargo = selectedCargo === 'PREFEITO' || selectedCargo === 'VEREADOR';

  const filteredElections = (manifest?.supportedElections || []).filter((e) => {
    const isMun = e.cargo === 'PREFEITO' || e.cargo === 'VEREADOR';
    return isMunicipalCargo ? isMun : !isMun;
  });

  const availableYears = Array.from(new Set(filteredElections.map((e) => e.ano))).sort((a, b) => b - a);

  const displayYears =
    availableYears.length > 0
      ? availableYears
      : isMunicipalCargo
        ? [2024, 2020, 2016, 2012]
        : [2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1989];

  const isSingleRoundCargo = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(selectedCargo);
  const currentElection = filteredElections.find(
    (e) => e.ano === selectedAno && (e.cargo === selectedCargo || selectedCargo === 'PRESIDENTE')
  );
  const availableTurnos = isSingleRoundCargo ? [1] : currentElection?.turnos || [1, 2];

  return (
    <div className="election-view-bar" role="region" aria-label="Filtros da apuração no mapa e contagem de votos">
      <div className="election-view-controls-group">
        <label className="election-ctrl-field">
          <span className="election-ctrl-label">Cargo</span>
          <select
            id="map-cargo-select"
            className="election-ctrl-select"
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
        </label>

        <label className="election-ctrl-field">
          <span className="election-ctrl-label">Ano</span>
          <select
            id="map-ano-select"
            className="election-ctrl-select"
            value={selectedAno}
            onChange={(e) => onSelectAno(Number(e.target.value))}
            aria-label="Selecionar Ano da Eleição"
          >
            {displayYears.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>

        <div className="election-ctrl-field">
          <span className="election-ctrl-label">Turno</span>
          <div className="turno-pill-group election-turno-group" role="group" aria-label="Selecionar Turno">
            {availableTurnos.map((t) => (
              <button
                key={t}
                type="button"
                className={`turno-btn ${selectedTurno === t ? 'active' : ''}`}
                onClick={() => onSelectTurno(t)}
                title={`${t}º Turno`}
              >
                {t}º Turno
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

