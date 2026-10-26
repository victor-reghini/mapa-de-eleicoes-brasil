import React, { useState } from 'react';
import type { ElectionCargo } from '../types/election';
import { Download, Share2, Search, CheckCircle2 } from 'lucide-react';

export type ExportFormat = 'feed' | 'quadrado' | 'stories';

interface CandidateInfo {
  numero: string;
  nomeUrna: string;
  partido: string;
  pctValidos: number;
  votos: number;
  cor: string;
  eleito?: boolean;
}

interface MapControlPanelProps {
  selectedAno: number;
  selectedTurno: number;
  selectedCargo: ElectionCargo;
  selectedUf: string | null;
  candidatos: CandidateInfo[];
  onSelectAno: (ano: number) => void;
  onSelectTurno: (turno: number) => void;
  onSelectCargo: (cargo: ElectionCargo) => void;
  onSelectUf: (uf: string | null) => void;
  onExportMap: (format: ExportFormat) => void;
  onShare: () => void;
}

export const MapControlPanel: React.FC<MapControlPanelProps> = ({
  selectedAno,
  selectedTurno,
  selectedCargo,
  selectedUf,
  candidatos,
  onSelectAno,
  onSelectTurno,
  onSelectCargo,
  onSelectUf,
  onExportMap,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState<'mapa' | 'perfil'>('mapa');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('quadrado');
  const [searchCand, setSearchCand] = useState('');

  const filteredCandidates = candidatos.filter(c => 
    c.nomeUrna.toLowerCase().includes(searchCand.toLowerCase()) ||
    c.partido.toLowerCase().includes(searchCand.toLowerCase()) ||
    c.numero.includes(searchCand)
  );

  return (
    <div className="map-control-panel">
      {/* Top Tabs */}
      <div className="panel-tab-headers">
        <button 
          className={`panel-tab ${activeTab === 'mapa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mapa')}
        >
          Mapa
        </button>
        <button 
          className={`panel-tab ${activeTab === 'perfil' ? 'active' : ''}`}
          onClick={() => setActiveTab('perfil')}
        >
          Perfil do candidato
        </button>
      </div>

      <div className="panel-scroll-content">
        {/* Dropdowns Row */}
        <div className="control-field-group">
          <div className="control-field">
            <label className="field-label">Eleição</label>
            <select 
              value={selectedAno} 
              onChange={(e) => onSelectAno(Number(e.target.value))}
              className="styled-select"
            >
              <option value={2026}>2026 (Geral)</option>
              <option value={2024}>2024 (Municipal)</option>
              <option value={2022}>2022 (Geral)</option>
              <option value={2020}>2020 (Municipal)</option>
              <option value={2018}>2018 (Geral)</option>
              <option value={2014}>2014 (Geral)</option>
            </select>
          </div>

          <div className="control-field">
            <label className="field-label">Brasil, estado ou exterior</label>
            <select 
              value={selectedUf || 'BR'} 
              onChange={(e) => onSelectUf(e.target.value === 'BR' ? null : e.target.value)}
              className="styled-select"
            >
              <option value="BR">Brasil (Totalização Nacional)</option>
              {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cargo Pills */}
        <div className="cargo-pills-section">
          <label className="field-label">Cargo</label>
          <div className="cargo-chips-wrap">
            <button 
              className={`cargo-pill ${selectedCargo === 'PRESIDENTE' && selectedTurno === 1 ? 'active' : ''}`}
              onClick={() => { onSelectCargo('PRESIDENTE'); onSelectTurno(1); }}
            >
              Presidente · 1º turno
            </button>
            <button 
              className={`cargo-pill ${selectedCargo === 'PRESIDENTE' && selectedTurno === 2 ? 'active' : ''}`}
              onClick={() => { onSelectCargo('PRESIDENTE'); onSelectTurno(2); }}
            >
              Presidente · 2º turno
            </button>
            <button 
              className={`cargo-pill ${selectedCargo === 'GOVERNADOR' ? 'active' : ''}`}
              onClick={() => onSelectCargo('GOVERNADOR')}
            >
              Governador
            </button>
            <button 
              className={`cargo-pill ${selectedCargo === 'SENADOR' ? 'active' : ''}`}
              onClick={() => onSelectCargo('SENADOR')}
            >
              Senador
            </button>
            <button 
              className={`cargo-pill ${selectedCargo === 'DEPUTADO_FEDERAL' ? 'active' : ''}`}
              onClick={() => onSelectCargo('DEPUTADO_FEDERAL')}
            >
              Dep. federal
            </button>
            <button 
              className={`cargo-pill ${selectedCargo === 'DEPUTADO_ESTADUAL' ? 'active' : ''}`}
              onClick={() => onSelectCargo('DEPUTADO_ESTADUAL')}
            >
              Dep. estadual
            </button>
          </div>
        </div>

        {/* Turnos Toggles */}
        <div className="turno-selector-row">
          <button 
            className={`turno-btn ${selectedTurno === 1 ? 'active' : ''}`}
            onClick={() => onSelectTurno(1)}
          >
            1º turno
          </button>
          <button 
            className={`turno-btn ${selectedTurno === 2 ? 'active' : ''}`}
            onClick={() => onSelectTurno(2)}
          >
            2º turno
          </button>
        </div>

        {/* Baixar este Mapa (Social Export Widget) */}
        <div className="export-map-card">
          <span className="export-card-title">Baixar este mapa</span>
          <p className="export-card-subtitle">
            Baixe o mapa em alta resolução calibrado para redes sociais.
          </p>

          <div className="format-pills-row">
            <button 
              className={`format-pill ${exportFormat === 'feed' ? 'active' : ''}`}
              onClick={() => setExportFormat('feed')}
            >
              Feed <strong>4:5</strong>
            </button>
            <button 
              className={`format-pill ${exportFormat === 'quadrado' ? 'active' : ''}`}
              onClick={() => setExportFormat('quadrado')}
            >
              Quadrado <strong>1:1</strong>
            </button>
            <button 
              className={`format-pill ${exportFormat === 'stories' ? 'active' : ''}`}
              onClick={() => setExportFormat('stories')}
            >
              Stories <strong>9:16</strong>
            </button>
          </div>

          <button 
            className="download-png-btn"
            onClick={() => onExportMap(exportFormat)}
          >
            <Download size={16} />
            <span>Baixar imagem (PNG)</span>
          </button>

          <button 
            className="share-outline-btn"
            onClick={onShare}
          >
            <Share2 size={15} />
            <span>Compartilhar este mapa</span>
          </button>

          <span className="export-legal-note">
            ✓ Pode postar e compartilhar a imagem à vontade; os créditos já constam na legenda.
          </span>
        </div>

        {/* Candidatos List */}
        <div className="candidates-list-section">
          <label className="field-label">Candidatos</label>
          <div className="candidate-search-input-wrap">
            <Search size={14} className="search-icon" />
            <input 
              type="text"
              placeholder="Buscar candidato..."
              value={searchCand}
              onChange={(e) => setSearchCand(e.target.value)}
              className="candidate-search-input"
            />
          </div>

          <div className="candidates-cards-list">
            {filteredCandidates.map(cand => (
              <div key={cand.numero} className="candidate-summary-card">
                <div 
                  className="candidate-color-bar" 
                  style={{ backgroundColor: cand.cor }}
                />
                <div className="candidate-card-info">
                  <div className="name-status-row">
                    <strong className="cand-name">{cand.nomeUrna}</strong>
                    {cand.eleito && (
                      <span className="eleito-chip">
                        <CheckCircle2 size={11} /> ELEITO
                      </span>
                    )}
                  </div>
                  <span className="cand-party">{cand.partido} · nº {cand.numero}</span>
                </div>
                <div className="candidate-card-stats">
                  <strong className="cand-pct">{cand.pctValidos.toFixed(1)}%</strong>
                  <span className="cand-votes">{cand.votos.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
