import React, { useState, useRef, useEffect } from 'react';
import { 
  Map, 
  Building, 
  Grid3X3, 
  Globe2, 
  Search, 
  ChevronRight, 
  X,
  Compass
} from 'lucide-react';
import type { GranularityMode, MunicipalityIndexItem } from '../types/election';

interface SubbarProps {
  granularity: GranularityMode;
  onSelectGranularity: (mode: GranularityMode) => void;
  selectedUf: string | null;
  selectedMun: MunicipalityIndexItem | null;
  selectedZona: string | null;
  onClearUf: () => void;
  onClearMun: () => void;
  onClearZona: () => void;
  munIndex: MunicipalityIndexItem[];
  onSelectMunicipalityFromSearch: (mun: MunicipalityIndexItem) => void;
  onSelectUfFromSearch: (uf: string) => void;
}

export const Subbar: React.FC<SubbarProps> = ({
  granularity,
  onSelectGranularity,
  selectedUf,
  selectedMun,
  selectedZona,
  onClearUf,
  onClearMun,
  onClearZona,
  munIndex,
  onSelectMunicipalityFromSearch,
  onSelectUfFromSearch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchTerm.trim().length > 1 
    ? munIndex
        .filter(m => 
          m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          m.uf.toLowerCase() === searchTerm.toLowerCase()
        )
        .slice(0, 15)
    : [];

  return (
    <div className="app-subbar">
      {/* Granularity Tabs */}
      <div className="granularity-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={granularity === 'ESTADOS'}
          className={`granularity-tab ${granularity === 'ESTADOS' ? 'active' : ''}`}
          onClick={() => {
            onSelectGranularity('ESTADOS');
            onClearUf();
            onClearMun();
            onClearZona();
          }}
        >
          <Map size={15} />
          <span>Estados (UF)</span>
        </button>

        <button
          role="tab"
          aria-selected={granularity === 'MUNICIPIOS'}
          className={`granularity-tab ${granularity === 'MUNICIPIOS' ? 'active' : ''}`}
          onClick={() => onSelectGranularity('MUNICIPIOS')}
        >
          <Building size={15} />
          <span>Municípios</span>
        </button>

        <button
          role="tab"
          aria-selected={granularity === 'ZONAS'}
          className={`granularity-tab ${granularity === 'ZONAS' ? 'active' : ''}`}
          onClick={() => onSelectGranularity('ZONAS')}
        >
          <Grid3X3 size={15} />
          <span>Zonas Eleitorais</span>
        </button>

        <button
          role="tab"
          aria-selected={granularity === 'EXTERIOR_GLOBE'}
          className={`granularity-tab globe-tab ${granularity === 'EXTERIOR_GLOBE' ? 'active' : ''}`}
          onClick={() => onSelectGranularity('EXTERIOR_GLOBE')}
        >
          <Globe2 size={15} />
          <span>Globo 3D Exterior (ZZ)</span>
        </button>
      </div>

      {/* Breadcrumb Trail */}
      <div className="breadcrumb-container" aria-label="Navegação da visualização">
        <Compass size={14} color="#94a3b8" />
        <span 
          className={`breadcrumb-crumb ${!selectedUf ? 'active' : ''}`}
          onClick={() => {
            onClearUf();
            onClearMun();
            onClearZona();
          }}
        >
          Brasil
        </span>

        {selectedUf && (
          <>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <span 
              className={`breadcrumb-crumb ${!selectedMun ? 'active' : ''}`}
              onClick={() => {
                onClearMun();
                onClearZona();
              }}
            >
              {selectedUf}
            </span>
          </>
        )}

        {selectedMun && (
          <>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <span 
              className={`breadcrumb-crumb ${!selectedZona ? 'active' : ''}`}
              onClick={onClearZona}
            >
              {selectedMun.name}
            </span>
          </>
        )}

        {selectedZona && (
          <>
            <ChevronRight size={13} className="breadcrumb-sep" />
            <span className="breadcrumb-crumb active">
              Zona {selectedZona}
            </span>
          </>
        )}
      </div>

      {/* Municipality Search Bar with Autocomplete */}
      <div className="search-wrapper" ref={searchRef}>
        <div className="search-input-box">
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar cidade ou estado..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(''); setIsOpen(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isOpen && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className="search-item"
                onClick={() => {
                  onSelectMunicipalityFromSearch(item);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
              >
                <span>{item.name}</span>
                <span 
                  className="search-item-uf"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectUfFromSearch(item.uf);
                    setSearchTerm('');
                    setIsOpen(false);
                  }}
                  title={`Filtrar apenas estado ${item.uf}`}
                >
                  {item.uf}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
