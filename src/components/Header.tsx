import React from 'react';
import { Vote, Database, ShieldCheck, Share2 } from 'lucide-react';

interface HeaderProps {
  onOpenSourcesModal: () => void;
  onShare?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSourcesModal,
  onShare,
}) => {
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
            Resultados e Boletins de Urna das últimas eleições
          </p>
        </div>
      </div>

      <div className="header-controls">
        {/* Share Button (mapaeleitoral.com.br style) */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="share-header-btn"
            title="Compartilhar esta apuração"
            aria-label="Compartilhar link da apuração"
          >
            <Share2 size={15} />
            <span className="share-btn-text">Compartilhar</span>
          </button>
        )}

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
