import type { 
  ElectionManifest, 
  ElectionRoundData, 
  MunicipalityIndexItem 
} from '../types/election';

class ElectionService {
  private cacheManifest: ElectionManifest | null = null;
  private cacheElectionData: Map<string, ElectionRoundData> = new Map();
  private cacheMunIndex: MunicipalityIndexItem[] | null = null;
  private cacheBrStates: any = null;
  private cacheMunGeo: Map<string, any> = new Map();
  private cacheWorldAtlas: any = null;

  async getManifest(): Promise<ElectionManifest> {
    if (this.cacheManifest) return this.cacheManifest;
    const res = await fetch(`/data/elections/manifest.json?v=${Date.now()}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Falha ao carregar manifesto de eleições');
    this.cacheManifest = await res.json();
    return this.cacheManifest!;
  }

  async getElectionData(ano: number, turno: number): Promise<ElectionRoundData> {
    const key = `${ano}_${turno}`;
    if (this.cacheElectionData.has(key)) {
      return this.cacheElectionData.get(key)!;
    }
    const res = await fetch(`/data/elections/${ano}_${turno}.json?v=${Date.now()}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Falha ao carregar dados da eleição ${ano} turno ${turno}`);
    const data: ElectionRoundData = await res.json();
    this.cacheElectionData.set(key, data);
    return data;
  }

  async getMunicipalitiesIndex(): Promise<MunicipalityIndexItem[]> {
    if (this.cacheMunIndex) return this.cacheMunIndex;
    const res = await fetch('/geo/municipalities_index.json');
    if (!res.ok) throw new Error('Falha ao carregar índice de municípios');
    this.cacheMunIndex = await res.json();
    return this.cacheMunIndex!;
  }

  async getBrazilStatesGeo(): Promise<any> {
    if (this.cacheBrStates) return this.cacheBrStates;
    const res = await fetch('/geo/br-states.json');
    if (!res.ok) throw new Error('Falha ao carregar malha de estados');
    this.cacheBrStates = await res.json();
    return this.cacheBrStates;
  }

  async getMunicipalityGeoForUf(uf: string): Promise<any> {
    const ufUpper = uf.toUpperCase();
    if (this.cacheMunGeo.has(ufUpper)) {
      return this.cacheMunGeo.get(ufUpper);
    }
    const res = await fetch(`/geo/mun/${ufUpper}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    this.cacheMunGeo.set(ufUpper, data);
    return data;
  }

  async getWorldAtlas(): Promise<any> {
    if (this.cacheWorldAtlas) return this.cacheWorldAtlas;
    const res = await fetch('/geo/world-110m.json');
    if (!res.ok) throw new Error('Falha ao carregar mapa mundi');
    this.cacheWorldAtlas = await res.json();
    return this.cacheWorldAtlas;
  }
}

export const electionService = new ElectionService();
