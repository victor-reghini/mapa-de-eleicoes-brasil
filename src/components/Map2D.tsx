import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Home } from 'lucide-react';
import type { 
  ElectionRoundData, 
  GranularityMode, 
  MunicipalityIndexItem, 
  ElectoralZone 
} from '../types/election';
import { electionService } from '../services/electionService';

interface Map2DProps {
  electionData: ElectionRoundData | null;
  granularity: GranularityMode;
  selectedUf: string | null;
  selectedMun: MunicipalityIndexItem | null;
  selectedZona: string | null;
  onSelectUf: (uf: string) => void;
  onSelectMun: (mun: MunicipalityIndexItem) => void;
  onSelectZona: (zona: string) => void;
}

interface TooltipData {
  title: string;
  subtitle?: string;
  cands: Array<{ nome: string; partido?: string; votos?: number; pctValidos?: number; cor?: string }>;
  comparecimento?: number;
  abstencoes?: number;
  x: number;
  y: number;
}

export const Map2D: React.FC<Map2DProps> = ({
  electionData,
  granularity,
  selectedUf,
  selectedMun,
  selectedZona,
  onSelectUf,
  onSelectMun,
  onSelectZona
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [statesGeo, setStatesGeo] = useState<any>(null);
  const [munGeo, setMunGeo] = useState<any>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Load States GeoJSON on mount
  useEffect(() => {
    electionService.getBrazilStatesGeo().then(setStatesGeo).catch(console.error);
  }, []);

  // When selectedUf changes or granularity is MUNICIPIOS, fetch state municipalities
  useEffect(() => {
    if (selectedUf) {
      electionService.getMunicipalityGeoForUf(selectedUf)
        .then((geo) => {
          setMunGeo(geo);
        })
        .catch(() => {
          setMunGeo(null);
        });
    } else {
      setMunGeo(null);
    }
  }, [selectedUf]);

  // Main D3 Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !statesGeo || !electionData) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'map-root-group');

    // Setup Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Define Projection
    const projection = d3.geoMercator();

    // If granularity is MUNICIPIOS and a state is selected and we have municipality geometry for it, fit projection to that state
    const isMunView = granularity === 'MUNICIPIOS' && Boolean(selectedUf && munGeo && munGeo.features && munGeo.features.length > 0);
    if (isMunView) {
      projection.fitSize([width, height], munGeo);
    } else {
      projection.fitSize([width, height], statesGeo);
    }

    const pathGenerator = d3.geoPath().projection(projection);

    // 1. Render States Layer
    const statesGroup = g.append('g').attr('class', 'states-layer');

    statesGroup.selectAll('path')
      .data(statesGeo.features)
      .enter()
      .append('path')
      .attr('d', pathGenerator as any)
      .attr('class', 'state-feature')
      .attr('fill', (d: any) => {
        const sigla = d.properties.sigla;
        const ufResult = electionData.ufs[sigla];
        if (!ufResult || !ufResult.candidatos || ufResult.candidatos.length === 0) {
          return '#1e293b';
        }
        const winner = ufResult.candidatos[0];
        // If state is selected, keep bright; if another state selected in Mun mode, slightly dim
        const isSelected = selectedUf === sigla;
        if (selectedUf && !isSelected) {
          return '#172033';
        }
        return winner.cor || '#3b82f6';
      })
      .attr('fill-opacity', (d: any) => {
        const sigla = d.properties.sigla;
        if (selectedUf && selectedUf !== sigla) return 0.25;
        const ufResult = electionData.ufs[sigla];
        if (!ufResult) return 0.4;
        // Opacity reflects margin of victory
        const top = ufResult.candidatos[0]?.pctValidos || 50;
        return Math.min(0.9, Math.max(0.55, (top - 35) / 45));
      })
      .attr('stroke', (d: any) => {
        return selectedUf === d.properties.sigla ? '#38bdf8' : 'rgba(255, 255, 255, 0.18)';
      })
      .attr('stroke-width', (d: any) => {
        return selectedUf === d.properties.sigla ? 2.5 : 0.8;
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d: any) => {
        const sigla = d.properties.sigla;
        const ufResult = electionData.ufs[sigla];
        if (!ufResult) return;

        const bounds = containerRef.current?.getBoundingClientRect();
        const clientX = event.clientX - (bounds?.left || 0);
        const clientY = event.clientY - (bounds?.top || 0);

        setTooltip({
          title: `${d.properties.nome} (${sigla})`,
          subtitle: `Comparecimento: ${ufResult.pctComparecimento}% • Abstenção: ${ufResult.pctAbstencoes}%`,
          cands: ufResult.candidatos.slice(0, 3).map(c => ({
            nome: c.nome,
            partido: c.partido,
            votos: c.votos,
            pctValidos: c.pctValidos,
            cor: c.cor
          })),
          x: clientX,
          y: clientY
        });

        d3.select(event.currentTarget as SVGPathElement)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      })
      .on('mousemove', (event) => {
        const bounds = containerRef.current?.getBoundingClientRect();
        if (bounds) {
          setTooltip(prev => prev ? {
            ...prev,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
          } : null);
        }
      })
      .on('mouseleave', (event, d: any) => {
        setTooltip(null);
        d3.select(event.currentTarget as SVGPathElement)
          .attr('stroke', selectedUf === d.properties.sigla ? '#38bdf8' : 'rgba(255, 255, 255, 0.18)')
          .attr('stroke-width', selectedUf === d.properties.sigla ? 2.5 : 0.8);
      })
      .on('click', (_, d: any) => {
        onSelectUf(d.properties.sigla);
      });

    // 2. Render Municipalities Layer (ONLY in MUNICIPIOS mode)
    if (isMunView && munGeo && munGeo.features) {
      const munGroup = g.append('g').attr('class', 'mun-layer');

      munGroup.selectAll('path')
        .data(munGeo.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator as any)
        .attr('class', 'municipality-feature')
        .attr('fill', (d: any) => {
          const munId = d.properties.id;
          const munData = electionData.municipios?.find(m => m.id === munId);
          if (munData) {
            return munData.lula_pct > munData.bolsonaro_pct ? '#e11d48' : '#2563eb';
          }
          // Default state dominant color with varied brightness
          const ufRes = selectedUf ? electionData.ufs[selectedUf] : null;
          return ufRes?.vencedorCor || '#3b82f6';
        })
        .attr('fill-opacity', (d: any) => {
          const isSelected = selectedMun?.id === d.properties.id;
          if (isSelected) return 1.0;
          return 0.75;
        })
        .attr('stroke', (d: any) => {
          return selectedMun?.id === d.properties.id ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
        })
        .attr('stroke-width', (d: any) => {
          return selectedMun?.id === d.properties.id ? 2 : 0.4;
        })
        .style('cursor', 'pointer')
        .on('mouseenter', (event, d: any) => {
          const munId = d.properties.id;
          const munData = electionData.municipios?.find(m => m.id === munId);
          const bounds = containerRef.current?.getBoundingClientRect();

          const cands = munData ? [
            { nome: 'Lula', partido: 'PT', pctValidos: munData.lula_pct, cor: '#e11d48', votos: munData.lula_r2 },
            { nome: 'Jair Bolsonaro', partido: 'PL', pctValidos: munData.bolsonaro_pct, cor: '#2563eb', votos: munData.bolsonaro_r2 }
          ].sort((a, b) => (b.pctValidos || 0) - (a.pctValidos || 0)) : [];

          setTooltip({
            title: `${d.properties.name} - ${selectedUf}`,
            subtitle: munData ? `Aptos: ${munData.aptos.toLocaleString('pt-BR')}` : 'Dados municipais TSE consolidados',
            cands,
            x: event.clientX - (bounds?.left || 0),
            y: event.clientY - (bounds?.top || 0)
          });

          d3.select(event.currentTarget as SVGPathElement)
            .attr('stroke', '#38bdf8')
            .attr('stroke-width', 1.5);
        })
        .on('mousemove', (event) => {
          const bounds = containerRef.current?.getBoundingClientRect();
          if (bounds) {
            setTooltip(prev => prev ? {
              ...prev,
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top
            } : null);
          }
        })
        .on('mouseleave', (event, d: any) => {
          setTooltip(null);
          d3.select(event.currentTarget as SVGPathElement)
            .attr('stroke', selectedMun?.id === d.properties.id ? '#ffffff' : 'rgba(255, 255, 255, 0.25)')
            .attr('stroke-width', selectedMun?.id === d.properties.id ? 2 : 0.4);
        })
        .on('click', (_, d: any) => {
          onSelectMun({
            id: d.properties.id,
            name: d.properties.name,
            uf: selectedUf || '',
            lon: d.properties.lon || 0,
            lat: d.properties.lat || 0
          });
        });
    }

    // 3. Render Electoral Zones Markers (if ZONAS mode is active)
    if (granularity === 'ZONAS' && electionData.zonas && electionData.zonas.length > 0) {
      const zonesGroup = g.append('g').attr('class', 'zones-layer');
      
      // Filter zones for selected UF if one is chosen
      const activeZones = selectedUf 
        ? electionData.zonas.filter(z => z.uf === selectedUf)
        : electionData.zonas;

      // Coordinate mapping for zones based on capital centroid
      const zoneCoords: Record<string, [number, number]> = {
        'SP_São Paulo': [-46.6333, -23.5505],
        'RJ_Rio de Janeiro': [-43.1729, -22.9068],
        'DF_Brasília': [-47.9292, -15.7801],
        'MG_Belo Horizonte': [-43.9378, -19.9208],
        'BA_Salvador': [-38.5108, -12.9714]
      };

      activeZones.forEach((z: ElectoralZone, idx: number) => {
        const baseCoord = zoneCoords[`${z.uf}_${z.municipio}`] || [-47.9, -15.7];
        // Jitter zone points around city center for distinct visual inspection
        const angle = (idx * 37) * (Math.PI / 180);
        const radius = 0.08 + (idx % 4) * 0.04;
        const lon = baseCoord[0] + Math.cos(angle) * radius;
        const lat = baseCoord[1] + Math.sin(angle) * radius;

        const projected = projection([lon, lat]);
        if (!projected) return;

        const isWinnerLula = z.lula > z.bolsonaro;
        const isSelected = selectedZona === z.zona;

        const zoneCircle = zonesGroup.append('circle')
          .attr('cx', projected[0])
          .attr('cy', projected[1])
          .attr('r', isSelected ? 8 : 5.5)
          .attr('fill', isWinnerLula ? '#e11d48' : '#2563eb')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', isSelected ? 2.5 : 1.2)
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))');

        zoneCircle.on('mouseenter', (event) => {
          const bounds = containerRef.current?.getBoundingClientRect();
          setTooltip({
            title: `Zona ${z.zona} - ${z.nome}`,
            subtitle: `${z.municipio} (${z.uf}) • ${z.bairros}`,
            cands: [
              { nome: 'Lula', partido: 'PT', pctValidos: z.lula_pct, cor: '#e11d48', votos: z.lula },
              { nome: 'Jair Bolsonaro', partido: 'PL', pctValidos: z.bolsonaro_pct, cor: '#2563eb', votos: z.bolsonaro }
            ],
            x: event.clientX - (bounds?.left || 0),
            y: event.clientY - (bounds?.top || 0)
          });
        })
        .on('mouseleave', () => setTooltip(null))
        .on('click', () => {
          onSelectZona(z.zona);
        });
      });
    }

  }, [statesGeo, munGeo, electionData, granularity, selectedUf, selectedMun, selectedZona]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.4);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div className="map-viewport" ref={containerRef}>
      {/* Floating Zoom Controls */}
      <div className="map-floating-controls">
        <button 
          className="map-control-btn" 
          onClick={handleZoomIn} 
          title="Aproximar Zoom (+)"
          aria-label="Aproximar Zoom"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="map-control-btn" 
          onClick={handleZoomOut} 
          title="Afastar Zoom (-)"
          aria-label="Afastar Zoom"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          className="map-control-btn" 
          onClick={handleResetZoom} 
          title="Resetar Visualização"
          aria-label="Resetar Visualização"
        >
          <RotateCcw size={16} />
        </button>
        {selectedUf && (
          <button 
            className="map-control-btn" 
            onClick={() => {
              onSelectUf('');
              handleResetZoom();
            }} 
            title="Voltar à Visão Nacional (Brasil Todo)"
            aria-label="Voltar ao Brasil Todo"
            style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
          >
            <Home size={17} />
          </button>
        )}
      </div>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-title">Candidatos Líderes</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color-dot" style={{ background: '#e11d48' }} />
            <span>Lula (PT)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-dot" style={{ background: '#2563eb' }} />
            <span>Bolsonaro (PL/PSL)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-dot" style={{ background: '#059669' }} />
            <span>Tebet (MDB)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color-dot" style={{ background: '#ea580c' }} />
            <span>Ciro (PDT)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas for D3 Map */}
      <svg 
        ref={svgRef} 
        style={{ width: '100%', height: '100%', display: 'block' }} 
      />

      {/* Floating Hover Tooltip */}
      {tooltip && (
        <div 
          className="map-tooltip"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px` 
          }}
        >
          <div className="tooltip-title">
            <span>{tooltip.title}</span>
          </div>
          {tooltip.subtitle && (
            <div className="tooltip-subtitle">{tooltip.subtitle}</div>
          )}
          {tooltip.cands.map((c, idx) => (
            <div key={idx} className="tooltip-cand-row">
              <div className="tooltip-cand-name">
                <div 
                  style={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    background: c.cor || '#3b82f6' 
                  }} 
                />
                <span>{c.nome}</span>
              </div>
              <div className="tooltip-cand-score">
                {c.pctValidos ? `${c.pctValidos}%` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
