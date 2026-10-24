import { useState, useEffect } from 'react';
import type { 
  ElectionManifest, 
  ElectionRoundData, 
  GranularityMode, 
  MunicipalityIndexItem, 
  ConsularCity 
} from './types/election';
import { electionService } from './services/electionService';
import { Header } from './components/Header';
import { Subbar } from './components/Subbar';
import { Map2D } from './components/Map2D';
import { Globe3D } from './components/Globe3D';
import { SidebarResults } from './components/SidebarResults';
import { NullDetailModal } from './components/NullDetailModal';
import { CargoScalabilityModal } from './components/CargoScalabilityModal';
import { SourcesModal } from './components/SourcesModal';
import { Loader2, Map as MapIcon, BarChart3 } from 'lucide-react';

export function App() {
  const [manifest, setManifest] = useState<ElectionManifest | null>(null);
  const [selectedAno, setSelectedAno] = useState<number>(2022);
  const [selectedTurno, setSelectedTurno] = useState<number>(2);
  const [electionData, setElectionData] = useState<ElectionRoundData | null>(null);
  const [munIndex, setMunIndex] = useState<MunicipalityIndexItem[]>([]);

  // Navigation State
  const [granularity, setGranularity] = useState<GranularityMode>('ESTADOS');
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [selectedMun, setSelectedMun] = useState<MunicipalityIndexItem | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<ConsularCity | null>(null);

  // Mobile View Toggle: 'map' vs 'results'
  const [mobileTab, setMobileTab] = useState<'map' | 'results'>('map');

  // Modals
  const [isNullModalOpen, setIsNullModalOpen] = useState(false);
  const [isScalabilityModalOpen, setIsScalabilityModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    async function init() {
      try {
        const [man, index] = await Promise.all([
          electionService.getManifest(),
          electionService.getMunicipalitiesIndex()
        ]);
        setManifest(man);
        setMunIndex(index);
      } catch (err) {
        console.error('Erro na inicialização:', err);
      }
    }
    init();
  }, []);

  // Fetch Election Data on Year or Turno Change
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await electionService.getElectionData(selectedAno, selectedTurno);
        setElectionData(data);
      } catch (err) {
        console.error('Erro ao carregar dados da eleição:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedAno, selectedTurno]);

  // Handler when year changes
  const handleSelectAno = (ano: number) => {
    setSelectedAno(ano);
    const election = manifest?.supportedElections.find(e => e.ano === ano);
    if (election && !election.turnos.includes(selectedTurno)) {
      setSelectedTurno(election.turnos[0]);
    }
    setSelectedCity(null);
  };

  // Handler when state is selected on map or search
  const handleSelectUf = (uf: string) => {
    if (!uf) {
      setSelectedUf(null);
      setSelectedMun(null);
      setSelectedZona(null);
      return;
    }
    setSelectedUf(uf);
    setSelectedMun(null);
    setSelectedZona(null);
  };

  // Handler when municipality is selected
  const handleSelectMun = (mun: MunicipalityIndexItem) => {
    setSelectedMun(mun);
    setSelectedUf(mun.uf);
    setSelectedZona(null);
    if (granularity !== 'MUNICIPIOS' && granularity !== 'ZONAS') {
      setGranularity('MUNICIPIOS');
    }
  };

  // Handler when electoral zone is selected
  const handleSelectZona = (zona: string) => {
    setSelectedZona(zona);
  };

  // Handler when consular city is selected on 3D Globe
  const handleSelectConsularCity = (city: ConsularCity) => {
    setSelectedCity(city);
  };

  const handleClearSelection = () => {
    setSelectedUf(null);
    setSelectedMun(null);
    setSelectedZona(null);
    setSelectedCity(null);
    setGranularity('ESTADOS');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        manifest={manifest}
        selectedAno={selectedAno}
        selectedTurno={selectedTurno}
        onSelectAno={handleSelectAno}
        onSelectTurno={setSelectedTurno}
        onOpenScalabilityModal={() => setIsScalabilityModalOpen(true)}
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
      />

      {/* Subbar with Granularity Tabs, Breadcrumbs, and Search */}
      <Subbar
        granularity={granularity}
        onSelectGranularity={(mode) => {
          setGranularity(mode);
          if (mode === 'ESTADOS') {
            setSelectedUf(null);
            setSelectedMun(null);
            setSelectedZona(null);
            setSelectedCity(null);
          } else if (mode === 'EXTERIOR_GLOBE') {
            setSelectedUf(null);
            setSelectedMun(null);
            setSelectedZona(null);
          } else {
            setSelectedCity(null);
          }
        }}
        selectedUf={selectedUf}
        selectedMun={selectedMun}
        selectedZona={selectedZona}
        onClearUf={() => setSelectedUf(null)}
        onClearMun={() => setSelectedMun(null)}
        onClearZona={() => setSelectedZona(null)}
        munIndex={munIndex}
        onSelectMunicipalityFromSearch={handleSelectMun}
        onSelectUfFromSearch={handleSelectUf}
      />

      {/* Mobile Segmented Toggle between Map and Results */}
      <div className="mobile-view-toggle">
        <button 
          className={`mobile-tab-btn ${mobileTab === 'map' ? 'active' : ''}`}
          onClick={() => setMobileTab('map')}
          aria-label="Exibir mapa"
        >
          <MapIcon size={16} />
          <span>Ver Mapa / Globo</span>
        </button>
        <button 
          className={`mobile-tab-btn ${mobileTab === 'results' ? 'active' : ''}`}
          onClick={() => setMobileTab('results')}
          aria-label="Exibir ranking e resultados"
        >
          <BarChart3 size={16} />
          <span>Ranking & Votos</span>
        </button>
      </div>

      {/* Main View Area */}
      <main className={`app-main mobile-tab-${mobileTab}`}>
        {isLoading && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(9, 13, 22, 0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 35,
              gap: 10,
              fontSize: '0.9rem',
              color: '#38bdf8'
            }}
          >
            <Loader2 className="animate-spin" size={24} />
            <span>Carregando dados oficiais do TSE...</span>
          </div>
        )}

        {/* View Switcher: 2D Brazil Map vs 3D Interactive Globe */}
        {granularity === 'EXTERIOR_GLOBE' ? (
          <Globe3D
            electionData={electionData}
            onSelectConsularCity={handleSelectConsularCity}
            selectedCity={selectedCity}
          />
        ) : (
          <Map2D
            electionData={electionData}
            granularity={granularity}
            selectedUf={selectedUf}
            selectedMun={selectedMun}
            selectedZona={selectedZona}
            onSelectUf={handleSelectUf}
            onSelectMun={handleSelectMun}
            onSelectZona={handleSelectZona}
          />
        )}

        {/* Sticky Results & Turnout Sidebar */}
        <SidebarResults
          electionData={electionData}
          granularity={granularity}
          selectedUf={selectedUf}
          selectedMun={selectedMun}
          selectedZona={selectedZona}
          selectedCity={selectedCity}
          onClearSelection={handleClearSelection}
          onOpenNullModal={() => setIsNullModalOpen(true)}
          onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        />
      </main>

      {/* Deep Dive Modal: Null and Annulled Votes */}
      <NullDetailModal
        isOpen={isNullModalOpen}
        onClose={() => setIsNullModalOpen(false)}
        detalhesNulos={electionData?.detalhesNulos}
        ano={selectedAno}
        turno={selectedTurno}
      />

      {/* Scalability Architecture Modal */}
      <CargoScalabilityModal
        isOpen={isScalabilityModalOpen}
        onClose={() => setIsScalabilityModalOpen(false)}
        manifest={manifest}
      />

      {/* Official TSE & IBGE Sources / Audit Modal */}
      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        initialAno={selectedAno}
      />
    </div>
  );
}

export default App;
