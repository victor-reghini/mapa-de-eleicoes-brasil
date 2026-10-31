import { useState, useEffect } from 'react';
import type { 
  ElectionCargo,
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
import { ShareToast } from './components/ShareToast';
import { BoletinsUrnaView } from './components/BoletinsUrnaView';
import { ElectionViewControls } from './components/ElectionViewControls';
import { Loader2, Map as MapIcon, BarChart3 } from 'lucide-react';

const getInitialUrlParams = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const cargoParam = params.get('cargo')?.toUpperCase() as ElectionCargo | undefined;
  const validCargos: ElectionCargo[] = ['PRESIDENTE', 'GOVERNADOR', 'SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'PREFEITO', 'VEREADOR'];
  const cargo = validCargos.includes(cargoParam as any) ? cargoParam : undefined;

  const anoParam = params.get('ano');
  const ano = anoParam ? parseInt(anoParam, 10) : undefined;

  const turnoParam = params.get('turno');
  const turno = turnoParam ? parseInt(turnoParam, 10) : undefined;

  const uf = params.get('uf')?.toUpperCase() || undefined;

  const modoParam = params.get('modo')?.toUpperCase() as GranularityMode | undefined;
  const validModos: GranularityMode[] = ['ESTADOS', 'MUNICIPIOS', 'ZONAS', 'EXTERIOR_GLOBE', 'GRADE_CARTOGRAMA', 'BOLETINS_URNA'];
  const modo = validModos.includes(modoParam as any) ? modoParam : undefined;

  return { cargo, ano, turno, uf, modo };
};

export function App() {
  const initialParams = getInitialUrlParams();
  const [manifest, setManifest] = useState<ElectionManifest | null>(null);
  const [selectedAno, setSelectedAno] = useState<number>(initialParams.ano || 2026);
  const [selectedTurno, setSelectedTurno] = useState<number>(initialParams.turno || 2);
  const [selectedCargo, setSelectedCargo] = useState<ElectionCargo>(initialParams.cargo || 'PRESIDENTE');
  const [electionData, setElectionData] = useState<ElectionRoundData | null>(null);
  const [munIndex, setMunIndex] = useState<MunicipalityIndexItem[]>([]);

  // Navigation State
  const [granularity, setGranularity] = useState<GranularityMode>(initialParams.modo || 'BOLETINS_URNA');
  const [selectedUf, setSelectedUf] = useState<string | null>(initialParams.uf || null);
  const [selectedMun, setSelectedMun] = useState<MunicipalityIndexItem | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<ConsularCity | null>(null);

  // Mobile View Toggle: 'map' vs 'results'
  const [mobileTab, setMobileTab] = useState<'map' | 'results'>('map');

  // Modals & Feedback
  const [isNullModalOpen, setIsNullModalOpen] = useState(false);
  const [isScalabilityModalOpen, setIsScalabilityModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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

  // Fetch Election Data on Year, Turno, or Cargo Change (when map/globe view is active)
  useEffect(() => {
    if (granularity === 'BOLETINS_URNA') return;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await electionService.getElectionData(selectedAno, selectedTurno, selectedCargo);
        setElectionData(data);
      } catch (err) {
        console.error('Erro ao carregar dados da eleição:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedAno, selectedTurno, selectedCargo, granularity]);

  const [liveRefreshInterval, setLiveRefreshInterval] = useState<number>(0);

  const handleRefreshLive = async () => {
    try {
      setIsLoading(true);
      const data = await electionService.getElectionData(selectedAno, selectedTurno, selectedCargo);
      setElectionData(data);
    } catch (err) {
      console.error('Falha ao recarregar apuração:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Keep URL search query synchronized for shareability & bookmarking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (selectedCargo && selectedCargo !== 'PRESIDENTE') params.set('cargo', selectedCargo);
    if (selectedAno) params.set('ano', selectedAno.toString());
    if (selectedTurno && selectedTurno !== 2) params.set('turno', selectedTurno.toString());
    if (selectedUf) params.set('uf', selectedUf);
    if (granularity) params.set('modo', granularity);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedCargo, selectedAno, selectedTurno, selectedUf, granularity]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `Apuração ${selectedCargo} ${selectedAno} - ${selectedTurno}º Turno`;
    const shareText = `Confira a apuração oficial no Mapa Eleitoral Brasil: ${selectedCargo} ${selectedAno}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        setToastMessage('Link compartilhado com sucesso!');
        setTimeout(() => setToastMessage(null), 3200);
        return;
      } catch (err) {
        // User cancelled or share unallowed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Link copiado para a área de transferência!');
    } catch {
      setToastMessage('Link da apuração pronto na barra de endereços!');
    }
    setTimeout(() => setToastMessage(null), 3200);
  };

  const isMunicipalCargo = (cargo: ElectionCargo) => cargo === 'PREFEITO' || cargo === 'VEREADOR';

  // Handler when cargo changes
  const handleSelectCargo = (cargo: ElectionCargo) => {
    setSelectedCargo(cargo);
    if (cargo !== 'PRESIDENTE' && (granularity === 'EXTERIOR_GLOBE' || granularity === 'BOLETINS_URNA')) {
      setGranularity('ESTADOS');
    }

    const wasMunicipal = isMunicipalCargo(selectedCargo);
    const nowMunicipal = isMunicipalCargo(cargo);

    if (nowMunicipal && !wasMunicipal) {
      // Switching from general to municipal: switch to latest municipal election (2024)
      setSelectedAno(2024);
      setSelectedTurno(cargo === 'VEREADOR' ? 1 : 2);
    } else if (!nowMunicipal && wasMunicipal) {
      // Switching from municipal to general: switch to latest general election (2026)
      setSelectedAno(2026);
      const isSingleRound = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL'].includes(cargo);
      setSelectedTurno(isSingleRound ? 1 : 2);
    } else {
      const isSingleRound = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(cargo);
      if (isSingleRound && selectedTurno !== 1) {
        setSelectedTurno(1);
      }
    }
  };

  // Handler when year changes
  const handleSelectAno = (ano: number) => {
    setSelectedAno(ano);
    const isSingleRound = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(selectedCargo);
    if (isSingleRound) {
      setSelectedTurno(1);
    } else {
      const election = manifest?.supportedElections.find(
        e => e.ano === ano && (e.cargo === selectedCargo || (!e.cargo && selectedCargo === 'PRESIDENTE'))
      );
      if (election && !election.turnos.includes(selectedTurno)) {
        setSelectedTurno(election.turnos[0]);
      }
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
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        onShare={handleShare}
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
      {granularity !== 'BOLETINS_URNA' && (
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
      )}

      {/* Main View Area */}
      <main className={`app-main mobile-tab-${mobileTab} ${granularity === 'BOLETINS_URNA' ? 'app-main-bu' : 'app-main-map'}`}>
        {granularity === 'BOLETINS_URNA' ? (
          <BoletinsUrnaView
            initialAno={selectedAno}
            initialTurno={selectedTurno}
            selectedUf={selectedUf}
            onSelectUf={handleSelectUf}
          />
        ) : (
          <div className="map-results-workspace">
            <ElectionViewControls
              manifest={manifest}
              selectedAno={selectedAno}
              selectedTurno={selectedTurno}
              selectedCargo={selectedCargo}
              onSelectAno={handleSelectAno}
              onSelectTurno={setSelectedTurno}
              onSelectCargo={handleSelectCargo}
            />

            <div className="map-results-body">
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
                onRefreshLive={handleRefreshLive}
                refreshInterval={liveRefreshInterval}
                onChangeRefreshInterval={setLiveRefreshInterval}
                onSelectUf={handleSelectUf}
                onSwitchToGovernorCargo={(uf) => {
                  handleSelectCargo('GOVERNADOR');
                  handleSelectUf(uf);
                }}
                onShare={handleShare}
              />
            </div>
          </div>
        )}
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

      {/* Floating Share Feedback Toast */}
      <ShareToast message={toastMessage} />
    </div>
  );
}

export default App;
