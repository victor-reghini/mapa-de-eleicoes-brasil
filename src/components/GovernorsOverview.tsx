import React from 'react';
import { ExternalLink, Award } from 'lucide-react';
import type { ElectionRoundData } from '../types/election';

interface GovernorRaceSummary {
  uf: string;
  ufNome: string;
  status: 'Eleito' | '2º Turno' | 'Aguardando' | 'Em Apuração';
  pctApuracao: number;
  candidato1: {
    nome: string;
    partido: string;
    cor: string;
    pctValidos: number;
    eleito?: boolean;
  };
  candidato2: {
    nome: string;
    partido: string;
    cor: string;
    pctValidos: number;
  };
}

// Key governor races for 2026 / 2022
const GOVERNOR_RACES_2026: GovernorRaceSummary[] = [
  {
    uf: 'SP',
    ufNome: 'São Paulo',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Tarcísio', partido: 'REPUBLICANOS', cor: '#0284c7', pctValidos: 62.65, eleito: true },
    candidato2: { nome: 'Fernando Haddad', partido: 'PT', cor: '#e11d48', pctValidos: 36.42 }
  },
  {
    uf: 'RJ',
    ufNome: 'Rio de Janeiro',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Douglas Ruas', partido: 'PL', cor: '#2563eb', pctValidos: 50.88, eleito: true },
    candidato2: { nome: 'Eduardo Paes', partido: 'PSD', cor: '#0284c7', pctValidos: 44.16 }
  },
  {
    uf: 'MG',
    ufNome: 'Minas Gerais',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Cleitinho Azevedo', partido: 'REPUBLICANOS', cor: '#0284c7', pctValidos: 55.40, eleito: true },
    candidato2: { nome: 'Patrus Ananias', partido: 'PT', cor: '#e11d48', pctValidos: 26.34 }
  },
  {
    uf: 'BA',
    ufNome: 'Bahia',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Jerônimo Rodrigues', partido: 'PT', cor: '#e11d48', pctValidos: 55.80, eleito: true },
    candidato2: { nome: 'ACM Neto', partido: 'UNIÃO', cor: '#0284c7', pctValidos: 43.72 }
  },
  {
    uf: 'RS',
    ufNome: 'Rio Grande do Sul',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Zucco', partido: 'PL', cor: '#2563eb', pctValidos: 58.05, eleito: true },
    candidato2: { nome: 'Juliana Brizola', partido: 'PDT', cor: '#ea580c', pctValidos: 31.65 }
  },
  {
    uf: 'PR',
    ufNome: 'Paraná',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Sergio Moro', partido: 'PL', cor: '#2563eb', pctValidos: 50.10, eleito: true },
    candidato2: { nome: 'Sandro Alex', partido: 'PSD', cor: '#0284c7', pctValidos: 25.37 }
  },
  {
    uf: 'PE',
    ufNome: 'Pernambuco',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Raquel Lyra', partido: 'PSD', cor: '#0284c7', pctValidos: 53.27, eleito: true },
    candidato2: { nome: 'João Campos', partido: 'PSB', cor: '#e11d48', pctValidos: 44.82 }
  },
  {
    uf: 'CE',
    ufNome: 'Ceará',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Elmano de Freitas', partido: 'PT', cor: '#e11d48', pctValidos: 53.19, eleito: true },
    candidato2: { nome: 'Ciro Gomes', partido: 'PSDB', cor: '#0284c7', pctValidos: 46.22 }
  },
  {
    uf: 'GO',
    ufNome: 'Goiás',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Daniel Vilela', partido: 'MDB', cor: '#10b981', pctValidos: 59.17, eleito: true },
    candidato2: { nome: 'Wilder Morais', partido: 'PL', cor: '#2563eb', pctValidos: 21.96 }
  },
  {
    uf: 'SC',
    ufNome: 'Santa Catarina',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Jorginho Mello', partido: 'PL', cor: '#2563eb', pctValidos: 68.98, eleito: true },
    candidato2: { nome: 'Gelson Merísio', partido: 'PSB', cor: '#e11d48', pctValidos: 15.66 }
  },
  {
    uf: 'MA',
    ufNome: 'Maranhão',
    status: 'Eleito',
    pctApuracao: 100.0,
    candidato1: { nome: 'Eduardo Braide', partido: 'PSD', cor: '#0284c7', pctValidos: 54.02, eleito: true },
    candidato2: { nome: 'Orleans Brandão', partido: 'MDB', cor: '#10b981', pctValidos: 34.76 }
  },
  {
    uf: 'ES',
    ufNome: 'Espírito Santo',
    status: 'Aguardando',
    pctApuracao: 0.0,
    candidato1: { nome: 'Lorenzo Pazolini', partido: 'REPUBLICANOS', cor: '#0284c7', pctValidos: 0.0 },
    candidato2: { nome: 'Ricardo Ferraço', partido: 'MDB', cor: '#10b981', pctValidos: 0.0 }
  }
];

interface GovernorsOverviewProps {
  electionData: ElectionRoundData | null;
  selectedUf: string | null;
  onSelectUf: (uf: string) => void;
  onSwitchToGovernorCargo: (uf: string) => void;
}

export const GovernorsOverview: React.FC<GovernorsOverviewProps> = ({
  electionData,
  selectedUf,
  onSelectUf,
  onSwitchToGovernorCargo
}) => {
  if (!electionData || electionData.cargo !== 'PRESIDENTE') return null;

  return (
    <div className="governors-overview-section">
      <div className="governors-section-header">
        <div>
          <h3 className="governors-section-title">Governadores: quem lidera em cada estado</h3>
          <p className="governors-section-subtitle">
            Disputa para governadores estaduais. Selecione um estado para ver detalhes completos.
          </p>
        </div>
      </div>

      <div className="governors-grid">
        {GOVERNOR_RACES_2026.map((race) => {
          const isSelected = selectedUf === race.uf;
          const statusBg = race.status === 'Eleito' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)';
          const statusColor = race.status === 'Eleito' ? '#34d399' : '#94a3b8';

          return (
            <div
              key={race.uf}
              className={`governor-card ${isSelected ? 'is-selected-card' : ''}`}
              onClick={() => onSelectUf(race.uf)}
              role="button"
              tabIndex={0}
            >
              <div className="governor-card-top">
                <div className="gov-uf-badge">
                  <span className="gov-uf-sigla">{race.uf}</span>
                  <span className="gov-uf-nome">{race.ufNome}</span>
                </div>
                <span
                  className="gov-status-pill"
                  style={{ background: statusBg, color: statusColor }}
                >
                  {race.status === 'Eleito' && <Award size={10} style={{ marginRight: 2 }} />}
                  {race.status}
                </span>
              </div>

              <div className="gov-candidates-list">
                {/* 1st Place */}
                <div className="gov-cand-row">
                  <div className="gov-cand-info">
                    <span className="gov-cand-dot" style={{ background: race.candidato1.cor }} />
                    <span className="gov-cand-name">{race.candidato1.nome}</span>
                    <span className="gov-cand-party">· {race.candidato1.partido}</span>
                  </div>
                  <span className="gov-cand-pct">
                    {race.candidato1.pctValidos > 0 ? `${race.candidato1.pctValidos.toFixed(1)}%` : '0%'}
                  </span>
                </div>

                {/* 2nd Place */}
                <div className="gov-cand-row">
                  <div className="gov-cand-info">
                    <span className="gov-cand-dot" style={{ background: race.candidato2.cor }} />
                    <span className="gov-cand-name">{race.candidato2.nome}</span>
                    <span className="gov-cand-party">· {race.candidato2.partido}</span>
                  </div>
                  <span className="gov-cand-pct">
                    {race.candidato2.pctValidos > 0 ? `${race.candidato2.pctValidos.toFixed(1)}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Mini progress bar of apuração */}
              <div className="gov-progress-container">
                <div className="gov-progress-bar">
                  <div
                    className="gov-progress-fill"
                    style={{
                      width: `${race.pctApuracao}%`,
                      background: race.candidato1.cor
                    }}
                  />
                </div>
                <div className="gov-progress-text">
                  <span>{race.pctApuracao.toFixed(1)}% apurado</span>
                  <button
                    className="gov-detail-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchToGovernorCargo(race.uf);
                    }}
                    title={`Ver eleição completa de Governador em ${race.uf}`}
                  >
                    <span>Ver Governador</span>
                    <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
