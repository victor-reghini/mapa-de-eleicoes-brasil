import React, { useState } from 'react';
import { 
  Vote, 
  MapPin, 
  GitCompare, 
  TrendingUp, 
  Coins, 
  Landmark, 
  Star, 
  Bell, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft
} from 'lucide-react';

export type NavSection = 'eleicoes' | 'mapa' | 'comparativo' | 'pesquisas' | 'campanhas' | 'emendas';

interface AppSidebarNavProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AppSidebarNav: React.FC<AppSidebarNavProps> = ({
  activeSection,
  onSelectSection,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('mapa');

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(prev => prev === menu ? null : menu);
  };

  return (
    <aside className={`app-sidebar-nav ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand & Collapse Header */}
      <div className="sidebar-brand-row">
        <div className="brand-badge">
          <Vote className="brand-icon" size={22} />
          {!isCollapsed && (
            <span className="brand-title">
              RADAR <strong>DO VOTO</strong>
            </span>
          )}
        </div>
        {onToggleCollapse && (
          <button 
            className="collapse-toggle-btn" 
            onClick={onToggleCollapse} 
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label="Alternar menu lateral"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav-scroll" aria-label="Navegação Principal">
        {/* GRUPO: O VOTO */}
        <div className="nav-group">
          {!isCollapsed && <span className="nav-group-title">O VOTO</span>}
          
          <button 
            className={`nav-item ${activeSection === 'eleicoes' ? 'active' : ''}`}
            onClick={() => onSelectSection('eleicoes')}
            title="Eleições (De 1933 a 2026)"
          >
            <Vote size={18} />
            {!isCollapsed && (
              <div className="nav-text">
                <span className="nav-label">Eleições</span>
                <span className="nav-sub">De 1933 a 2026</span>
              </div>
            )}
          </button>

          {/* Submenu Mapa do Voto */}
          <div className="nav-item-expandable">
            <button 
              className={`nav-item ${activeSection === 'mapa' ? 'active' : ''}`}
              onClick={() => {
                onSelectSection('mapa');
                toggleSubmenu('mapa');
              }}
              title="Radar Mapa do Voto"
            >
              <MapPin size={18} />
              {!isCollapsed && (
                <>
                  <div className="nav-text">
                    <span className="nav-label">Radar Mapa do Voto</span>
                    <span className="nav-sub">Painel Presidencial</span>
                  </div>
                  {openSubmenu === 'mapa' ? <ChevronDown size={14} className="chevron" /> : <ChevronRight size={14} className="chevron" />}
                </>
              )}
            </button>

            {!isCollapsed && openSubmenu === 'mapa' && (
              <div className="nav-submenu">
                <button className="submenu-item active" onClick={() => onSelectSection('mapa')}>
                  <span className="bullet"></span>
                  <span>Brasil (Nacional)</span>
                </button>
                <button className="submenu-item" onClick={() => onSelectSection('mapa')}>
                  <span className="bullet"></span>
                  <span>Escolher estado</span>
                </button>
                <button className="submenu-item" onClick={() => onSelectSection('mapa')}>
                  <span className="bullet"></span>
                  <span>Escolher cidade</span>
                </button>
              </div>
            )}
          </div>

          <button 
            className={`nav-item ${activeSection === 'comparativo' ? 'active' : ''}`}
            onClick={() => onSelectSection('comparativo')}
            title="Comparativo (Candidatos lado a lado)"
          >
            <GitCompare size={18} />
            {!isCollapsed && (
              <div className="nav-text">
                <span className="nav-label">Comparativo</span>
                <span className="nav-sub">Candidatos lado a lado</span>
              </div>
            )}
          </button>

          <button 
            className={`nav-item ${activeSection === 'pesquisas' ? 'active' : ''}`}
            onClick={() => onSelectSection('pesquisas')}
            title="Pesquisas (O 2º turno, com a média)"
          >
            <TrendingUp size={18} />
            {!isCollapsed && (
              <div className="nav-text">
                <span className="nav-label">Pesquisas</span>
                <span className="nav-sub">O 2º turno com média</span>
              </div>
            )}
          </button>
        </div>

        {/* GRUPO: A CAMPANHA */}
        <div className="nav-group">
          {!isCollapsed && <span className="nav-group-title">A CAMPANHA</span>}
          <button 
            className={`nav-item ${activeSection === 'campanhas' ? 'active' : ''}`}
            onClick={() => onSelectSection('campanhas')}
            title="Radar das Campanhas"
          >
            <Coins size={18} />
            {!isCollapsed && (
              <div className="nav-text">
                <span className="nav-label">Campanhas</span>
                <span className="nav-sub">Receitas e despesas</span>
              </div>
            )}
          </button>
        </div>

        {/* GRUPO: O MANDATO */}
        <div className="nav-group">
          {!isCollapsed && <span className="nav-group-title">O MANDATO</span>}
          <button 
            className={`nav-item ${activeSection === 'emendas' ? 'active' : ''}`}
            onClick={() => onSelectSection('emendas')}
            title="Radar das Emendas"
          >
            <Landmark size={18} />
            {!isCollapsed && (
              <div className="nav-text">
                <span className="nav-label">Emendas</span>
                <span className="nav-sub">Recursos para sua cidade</span>
              </div>
            )}
          </button>
        </div>

        {/* SHORTCUTS / ACESSO RÁPIDO */}
        {!isCollapsed && (
          <div className="nav-group shortcuts-group">
            <span className="nav-group-title">ATALHOS</span>
            <button className="shortcut-btn"><Star size={15} /> Acesso rápido</button>
            <button className="shortcut-btn"><Bell size={15} /> Alertas de apuração</button>
            <button className="shortcut-btn"><FileText size={15} /> Relatórios do Radar</button>
          </div>
        )}
      </nav>

      {/* Footer Pill Status */}
      {!isCollapsed && (
        <div className="sidebar-footer">
          <div className="live-status-chip">
            <span className="pulsing-dot"></span>
            <span>Apuração ao vivo ativa</span>
          </div>
        </div>
      )}
    </aside>
  );
};
