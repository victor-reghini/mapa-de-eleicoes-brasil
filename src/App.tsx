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
import { realtimeTseService } from './services/realtimeTseService';
import { Header } from './components/Header';
import { AppSidebarNav, type NavSection } from './components/AppSidebarNav';
import { MapControlPanel, type ExportFormat } from './components/MapControlPanel';
import { TotalizationPanel } from './components/TotalizationPanel';
import { Map2D } from './components/Map2D';
import { Globe3D } from './components/Globe3D';
import { NullDetailModal } from './components/NullDetailModal';
import { CargoScalabilityModal } from './components/CargoScalabilityModal';
import { SourcesModal } from './components/SourcesModal';
import { CityDeepDiveModal } from './components/CityDeepDiveModal';
import { ShareToast } from './components/ShareToast';
import { exportMapImage } from './utils/exportMapImage';
import { DEFAULT_CANDIDATE_A, DEFAULT_CANDIDATE_B } from './utils/colorScales';
import { Loader2, MapPin } from 'lucide-react';

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
  const validModos: GranularityMode[] = ['ESTADOS', 'MUNICIPIOS', 'ZONAS', 'EXTERIOR_GLOBE', 'GRADE_CARTOGRAMA'];
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
  const [granularity, setGranularity] = useState<GranularityMode>(initialParams.modo || 'ESTADOS');
  const [selectedUf, setSelectedUf] = useState<string | null>(initialParams.uf || null);
  const [selectedMun, setSelectedMun] = useState<MunicipalityIndexItem | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<ConsularCity | null>(null);

  // 4-Column Workspace Navigation & Panels
  const [activeNavSection, setActiveNavSection] = useState<NavSection>('mapa');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Comparison A vs B State
  const [comparisonMode, setComparisonMode] = useState<boolean>(true);
  const [candANumero, setCandANumero] = useState<string>('13');
  const [candBNumero, setCandBNumero] = useState<string>('22');
  const [comparativoData, setComparativoData] = useState<Record<string, any> | null>(null);
  const [mapSvgElement, setMapSvgElement] = useState<SVGSVGElement | null>(null);

  // Modals & Feedback
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isNullModalOpen, setIsNullModalOpen] = useState(false);
  const [isScalabilityModalOpen, setIsScalabilityModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Load (Manifest & Municipality Index)
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

  // Fetch Election Data on Year, Turno, or Cargo Change
  useEffect(() => {
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
  }, [selectedAno, selectedTurno, selectedCargo]);

  // Fetch Bivariate Comparison Matrix (from SQLite / PostgreSQL / API)
  useEffect(() => {
    if (comparisonMode && candANumero && candBNumero) {
      electionService.getComparativo(selectedAno, selectedTurno, candANumero, candBNumero)
        .then(res => {
          if (res && res.municipios) {
            setComparativoData(res.municipios);
          }
        })
        .catch(console.error);
    }
  }, [comparisonMode, selectedAno, selectedTurno, candANumero, candBNumero]);

  // Polling for live apuração when 2026 2º Turno is selected
  useEffect(() => {
    if (selectedAno === 2026 && selectedTurno === 2 && selectedCargo === 'PRESIDENTE') {
      const cancelPolling = realtimeTseService.startPolling(
        2026, 
        2, 
        (liveData) => {
          setElectionData(liveData);
        }, 
        15000
      );
      return () => cancelPolling();
    }
  }, [selectedAno, selectedTurno, selectedCargo]);

  // URL synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (selectedCargo && selectedCargo !== 'PRESIDENTE') params.set('cargo', selectedCargo);
    if (selectedAno) params.set('ano', selectedAno.toString());
    if (selectedTurno && selectedTurno !== 2) params.set('turno', selectedTurno.toString());
    if (selectedUf) params.set('uf', selectedUf);
    if (granularity && granularity !== 'ESTADOS') params.set('modo', granularity);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedCargo, selectedAno, selectedTurno, selectedUf, granularity]);

  const candidatesList = electionData?.brasil?.candidatos?.map(c => ({
    numero: c.numero,
    nomeUrna: c.nomeUrna || c.nome,
    partido: c.partido,
    pctValidos: c.pctValidos || 0,
    votos: c.votos || 0,
    cor: c.cor || '#3b82f6',
    eleito: c.eleito
  })) || [
    { ...DEFAULT_CANDIDATE_A, pctValidos: 50.9, votos: 60345999, eleito: true },
    { ...DEFAULT_CANDIDATE_B, pctValidos: 49.1, votos: 58206354, eleito: false }
  ];

  const candidateA = candidatesList.find(c => c.numero === candANumero) || candidatesList[0];
  const candidateB = candidatesList.find(c => c.numero === candBNumero) || (candidatesList[1] || candidatesList[0]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = `Radar do Voto · ${selectedCargo} ${selectedAno} - ${selectedTurno}º Turno`;
    const shareText = `Confira a apuração e mapa oficial no Radar do Voto: ${selectedCargo} ${selectedAno}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setToastMessage('Link compartilhado com sucesso!');
        setTimeout(() => setToastMessage(null), 3200);
        return;
      } catch {
        // Fallback below
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('Link copiado para a área de transferência!');
    } catch {
      setToastMessage('Link pronto na barra de endereços!');
    }
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleExportMap = async (format: ExportFormat) => {
    if (!mapSvgElement) {
      setToastMessage('Aguarde o mapa carregar completamente para exportar.');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    try {
      await exportMapImage(mapSvgElement, format, {
        ano: selectedAno,
        turno: selectedTurno,
        cargo: selectedCargo,
        candA: comparisonMode && candidateA ? { nome: candidateA.nomeUrna, partido: candidateA.partido, cor: candidateA.cor } : undefined,
        candB: comparisonMode && candidateB ? { nome: candidateB.nomeUrna, partido: candidateB.partido, cor: candidateB.cor } : undefined,
        pctApuracao: electionData?.apuracao?.pctSecoesTotalizadas
      });
      setToastMessage(`Mapa em alta resolução exportado com sucesso (${format.toUpperCase()})!`);
    } catch (err) {
      console.error('Falha ao exportar imagem do mapa:', err);
      setToastMessage('Não foi possível gerar a imagem.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectCargo = (cargo: ElectionCargo) => {
    setSelectedCargo(cargo);
    if (cargo !== 'PRESIDENTE' && granularity === 'EXTERIOR_GLOBE') {
      setGranularity('ESTADOS');
    }
    const isSingleRound = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(cargo);
    if (isSingleRound && selectedTurno !== 1) {
      setSelectedTurno(1);
    }
  };

  const handleSelectAno = (ano: number) => {
    setSelectedAno(ano);
    const isSingleRound = ['SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'VEREADOR'].includes(selectedCargo);
    if (isSingleRound) {
      setSelectedTurno(1);
    }
    setSelectedCity(null);
  };

  const handleSelectUf = (uf: string | null) => {
    setSelectedUf(uf);
    setSelectedMun(null);
    setSelectedZona(null);
    if (uf && granularity === 'ESTADOS') {
      setGranularity('MUNICIPIOS');
    }
  };

  const handleSelectMun = (mun: MunicipalityIndexItem) => {
    setSelectedMun(mun);
    setSelectedUf(mun.uf);
    setSelectedZona(null);
    setGranularity('MUNICIPIOS');
  };

  const handleSelectZona = (zona: string) => {
    setSelectedZona(zona);
  };

  const handleSelectConsularCity = (city: ConsularCity) => {
    setSelectedCity(city);
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <Header
        manifest={manifest}
        selectedAno={selectedAno}
        selectedTurno={selectedTurno}
        selectedCargo={selectedCargo}
        onSelectAno={handleSelectAno}
        onSelectTurno={setSelectedTurno}
        onSelectCargo={handleSelectCargo}
        onOpenScalabilityModal={() => setIsScalabilityModalOpen(true)}
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        onShare={handleShare}
      />

      {/* 4-Column Workspace Layout (Radar do Voto Reference Architecture) */}
      <div className="radar-workspace-layout">
        {/* COLUMN 1: Left Navigation Rail */}
        <AppSidebarNav
          activeSection={activeNavSection}
          onSelectSection={(sec) => {
            setActiveNavSection(sec);
            if (sec === 'comparativo') setComparisonMode(true);
            if (sec === 'mapa') setComparisonMode(false);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* COLUMN 2: Map Controls & Social Export */}
        <MapControlPanel
          selectedAno={selectedAno}
          selectedTurno={selectedTurno}
          selectedCargo={selectedCargo}
          selectedUf={selectedUf}
          candidatos={candidatesList}
          onSelectAno={handleSelectAno}
          onSelectTurno={setSelectedTurno}
          onSelectCargo={handleSelectCargo}
          onSelectUf={handleSelectUf}
          onExportMap={handleExportMap}
          onShare={handleShare}
        />

        {/* COLUMN 3: Center Map Stage */}
        <div className="radar-map-center-stage">
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
              onSelectUf={(uf) => handleSelectUf(uf || null)}
              onSelectMun={handleSelectMun}
              onSelectZona={handleSelectZona}
              comparisonMode={comparisonMode}
              onToggleComparisonMode={setComparisonMode}
              candidateA={candidateA}
              candidateB={candidateB}
              availableCandidates={candidatesList}
              onSelectCandidateA={setCandANumero}
              onSelectCandidateB={setCandBNumero}
              comparativoData={comparativoData}
              onSvgReady={setMapSvgElement}
            />
          )}

          <div className="center-stage-actions">
            <button 
              className="city-spotlight-btn"
              onClick={() => setIsCityModalOpen(true)}
              title="Abrir Raio-X Eleitoral na sua Cidade"
            >
              <MapPin size={15} />
              <span>Na sua Cidade · Raio-X</span>
            </button>
          </div>

          <div className="map-watermark-stamp">
            <span className="watermark-brand">RADAR DO VOTO</span>
            <span className="watermark-handle">Dados oficiais TSE · Atualização contínua</span>
          </div>
        </div>

        {/* COLUMN 4: Right Totalization & Participation Panel */}
        <TotalizationPanel
          electionData={electionData}
          selectedAno={selectedAno}
          selectedTurno={selectedTurno}
          munIndex={munIndex}
          onSelectMunicipality={(mun) => {
            handleSelectMun(mun);
            setIsCityModalOpen(true);
          }}
          onSelectUf={(uf) => handleSelectUf(uf)}
          onOpenNullModal={() => setIsNullModalOpen(true)}
        />
      </div>

      {/* Widget "Na sua Cidade" - Raio-X Eleitoral (Atividade 5.1) */}
      <CityDeepDiveModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        initialMun={selectedMun}
        munIndex={munIndex}
      />

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
