import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, RotateCcw, Home, Activity } from 'lucide-react';
import type { 
  ElectionRoundData, 
  GranularityMode, 
  MunicipalityIndexItem, 
  ElectoralZone 
} from '../types/election';
import { PARTY_COLORS } from '../types/election';
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
  const [showApuracaoOverlay, setShowApuracaoOverlay] = useState<boolean>(true);

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

    // Setup Zoom (permite afastar até 0.18x para visualização ampla do país)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.18, 30])
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
      projection.fitExtent([[width * 0.04, height * 0.04], [width * 0.96, height * 0.96]], munGeo);
    } else {
      projection.fitExtent([[width * 0.04, height * 0.04], [width * 0.96, height * 0.96]], statesGeo);
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
        if (!ufResult) {
          return '#1e293b';
        }
        // If state is selected, keep bright; if another state selected in Mun mode, slightly dim
        const isSelected = selectedUf === sigla;
        if (selectedUf && !isSelected) {
          return '#172033';
        }
        // In real-time live mode before 17:00, domestic states have 0 votes and are awaiting apuração
        if (electionData.isTempoReal && (!ufResult.pctApuracao || ufResult.votosValidos === 0)) {
          return '#1e293b';
        }
        return ufResult.vencedorCor || (ufResult.vencedorPartido && PARTY_COLORS[ufResult.vencedorPartido]?.cor) || ufResult.candidatos?.[0]?.cor || '#3b82f6';
      })
      .attr('fill-opacity', (d: any) => {
        const sigla = d.properties.sigla;
        if (selectedUf && selectedUf !== sigla) return 0.25;
        const ufResult = electionData.ufs[sigla];
        if (!ufResult) return 0.4;
        if (electionData.isTempoReal && (!ufResult.pctApuracao || ufResult.votosValidos === 0)) {
          return 0.6;
        }
        // Opacity reflects margin of victory
        const top = ufResult.candidatos?.[0]?.pctValidos || 50;
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

        const isAwaitingApuracao = electionData.isTempoReal && (!ufResult.pctApuracao || ufResult.votosValidos === 0);
        const sub = isAwaitingApuracao
          ? '⏳ Votação em andamento (08h às 17h) • Apuração inicia às 17h00 BRT'
          : electionData.isTempoReal && ufResult.pctApuracao !== undefined
            ? `⚡ Apuração: ${ufResult.pctApuracao.toFixed(1)}% (${(ufResult.secoesTotalizadas || 0).toLocaleString('pt-BR')}/${(ufResult.totalSecoes || 0).toLocaleString('pt-BR')} seções)`
            : electionData.cargo === 'PRESIDENTE'
              ? `Comparecimento: ${ufResult.pctComparecimento}% • Abstenção: ${ufResult.pctAbstencoes}%`
              : `Partido Maioritário: ${ufResult.vencedorPartido || 'Líder'} • Vencedor: ${ufResult.vencedor}`;

        setTooltip({
          title: `${d.properties.nome} (${sigla})`,
          subtitle: sub,
          cands: isAwaitingApuracao ? [] : (ufResult.candidatos || []).slice(0, 3).map(c => ({
            nome: c.nomeUrna || c.nome,
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

    // 1.5. Render Real-time Apuração Badges on State Centroids (indicador visual no mapa)
    if (electionData.isTempoReal && !isMunView && showApuracaoOverlay) {
      const apurGroup = g.append('g').attr('class', 'apuracao-badges-layer');

      statesGeo.features.forEach((d: any) => {
        const sigla = d.properties.sigla;
        const ufResult = electionData.ufs[sigla];
        const pct = ufResult?.pctApuracao ?? electionData.apuracao?.pctSecoesTotalizadas;
        if (pct === undefined) return;

        const centroid = pathGenerator.centroid(d);
        if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

        // Custom manual nudge for small or irregular states so labels remain centered
        let [cx, cy] = centroid;
        if (sigla === 'RN') { cx += 5; cy -= 3; }
        else if (sigla === 'PB') { cx += 7; }
        else if (sigla === 'PE') { cx += 8; cy += 2; }
        else if (sigla === 'AL') { cx += 7; cy += 2; }
        else if (sigla === 'SE') { cx += 5; cy += 2; }
        else if (sigla === 'DF') { cx += 4; }

        const isZero = pct === 0;
        const isComplete = pct >= 99.0;
        const isNearComplete = pct >= 95.0 && pct < 99.0;
        const statusColor = isZero ? '#64748b' : isComplete ? '#10b981' : isNearComplete ? '#38bdf8' : '#f59e0b';
        const isSelected = selectedUf === sigla;

        const badgeGroup = apurGroup.append('g')
          .attr('class', `state-apur-badge ${isSelected ? 'active-badge' : ''}`)
          .attr('transform', `translate(${cx}, ${cy})`)
          .style('cursor', 'pointer');

        // Badge Background Pill
        const badgeWidth = 48;
        const badgeHeight = 20;

        badgeGroup.append('rect')
          .attr('x', -badgeWidth / 2)
          .attr('y', -badgeHeight / 2)
          .attr('width', badgeWidth)
          .attr('height', badgeHeight)
          .attr('rx', 10)
          .attr('ry', 10)
          .attr('fill', '#090d16')
          .attr('fill-opacity', 0.88)
          .attr('stroke', isSelected ? '#ffffff' : statusColor)
          .attr('stroke-width', isSelected ? 1.8 : 1)
          .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))');

        // Status Indicator Dot
        badgeGroup.append('circle')
          .attr('cx', -badgeWidth / 2 + 7)
          .attr('cy', 0)
          .attr('r', 2.8)
          .attr('fill', statusColor);

        // State Sigla Text
        badgeGroup.append('text')
          .attr('x', -badgeWidth / 2 + 13)
          .attr('y', 3.5)
          .attr('fill', '#e2e8f0')
          .attr('font-size', '8px')
          .attr('font-weight', '700')
          .attr('font-family', 'sans-serif')
          .text(sigla);

        // Percentage Text (or 17h when awaiting)
        badgeGroup.append('text')
          .attr('x', badgeWidth / 2 - 4)
          .attr('y', 3.5)
          .attr('text-anchor', 'end')
          .attr('fill', statusColor)
          .attr('font-size', isZero ? '7.5px' : '8.5px')
          .attr('font-weight', '700')
          .attr('font-family', 'sans-serif')
          .text(isZero ? '17h' : `${Math.round(pct)}%`);

        // Tooltip and Click events on the badge
        badgeGroup
          .on('mouseenter', (event) => {
            const bounds = containerRef.current?.getBoundingClientRect();
            const clientX = event.clientX - (bounds?.left || 0);
            const clientY = event.clientY - (bounds?.top || 0);

            const isAwaitingApuracao = isZero || (!ufResult?.pctApuracao && ufResult?.votosValidos === 0);
            const apurDetail = isAwaitingApuracao
              ? '⏳ Votação em andamento (08h às 17h) • Apuração no estado inicia às 17h00 BRT'
              : `⚡ Apuração: ${ufResult?.pctApuracao?.toFixed(1) ?? pct}% (${(ufResult?.secoesTotalizadas || 0).toLocaleString('pt-BR')}/${(ufResult?.totalSecoes || 0).toLocaleString('pt-BR')} seções)`;

            setTooltip({
              title: `${d.properties.nome} (${sigla})`,
              subtitle: apurDetail,
              cands: isAwaitingApuracao ? [] : (ufResult?.candidatos || []).slice(0, 3).map(c => ({
                nome: c.nomeUrna || c.nome,
                partido: c.partido,
                votos: c.votos,
                pctValidos: c.pctValidos,
                cor: c.cor
              })),
              x: clientX,
              y: clientY
            });
          })
          .on('mouseleave', () => setTooltip(null))
          .on('click', (event) => {
            event.stopPropagation();
            onSelectUf(sigla);
          });
      });
    }

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
            if (munData.vencedorCor) return munData.vencedorCor;
            if (munData.vencedorPartido && PARTY_COLORS[munData.vencedorPartido]) {
              return PARTY_COLORS[munData.vencedorPartido].cor;
            }
            if (munData.lula_pct !== undefined && munData.bolsonaro_pct !== undefined) {
              return munData.lula_pct > munData.bolsonaro_pct ? '#e11d48' : '#2563eb';
            }
          }
          // Default state dominant color
          const ufRes = selectedUf ? electionData.ufs[selectedUf] : null;
          return ufRes?.vencedorCor || (ufRes?.vencedorPartido && PARTY_COLORS[ufRes.vencedorPartido]?.cor) || '#3b82f6';
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

          let cands: Array<{ nome: string; partido?: string; votos?: number; pctValidos?: number; cor?: string }> = [];
          if (munData?.candidatos && munData.candidatos.length > 0) {
            cands = munData.candidatos.slice(0, 3);
          } else if (munData && electionData.cargo === 'PRESIDENTE') {
            cands = [
              { nome: 'Lula', partido: 'PT', pctValidos: munData.lula_pct, cor: '#e11d48', votos: munData.lula_r2 },
              { nome: 'Jair Bolsonaro', partido: 'PL', pctValidos: munData.bolsonaro_pct, cor: '#2563eb', votos: munData.bolsonaro_r2 }
            ].sort((a, b) => (b.pctValidos || 0) - (a.pctValidos || 0));
          } else if (selectedUf && electionData.ufs[selectedUf]) {
            cands = electionData.ufs[selectedUf].candidatos.slice(0, 3);
          }

          let sub = '';
          if (munData?.vencedorNome) {
            sub = `Vencedor: ${munData.vencedorNome} (${munData.vencedorPartido || ''})`;
          } else if (munData?.aptos) {
            sub = `Aptos: ${munData.aptos.toLocaleString('pt-BR')}`;
          } else {
            sub = `Sem detalhamento municipal (${electionData.ano}) • Exibindo geral`;
          }

          setTooltip({
            title: `${d.properties.name} - ${selectedUf}`,
            subtitle: sub,
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

  }, [statesGeo, munGeo, electionData, granularity, selectedUf, selectedMun, selectedZona, showApuracaoOverlay]);

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
        {electionData?.isTempoReal && (
          <button 
            className={`map-control-btn ${showApuracaoOverlay ? 'active-indicator-btn' : ''}`} 
            onClick={() => setShowApuracaoOverlay(!showApuracaoOverlay)} 
            title={showApuracaoOverlay ? "Ocultar Porcentagens de Apuração no Mapa" : "Exibir Porcentagens de Apuração no Mapa"}
            aria-label="Alternar Indicadores de Apuração"
            style={{ color: showApuracaoOverlay ? '#10b981' : '#64748b' }}
          >
            <Activity size={17} />
          </button>
        )}
      </div>

      {/* Map Legend */}
      {electionData && (
        <div className="map-legend">
          <div className="legend-title">
            {electionData.cargo === 'PRESIDENTE' ? 'Candidatos Líderes' : 'Partidos / Maiorias'}
          </div>
          <div className="legend-items">
            {electionData.cargo === 'PRESIDENTE' ? (
              electionData.brasil.candidatos.slice(0, 4).map((c, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-color-dot" style={{ background: c.cor || '#3b82f6' }} />
                  <span>{c.nomeUrna || c.nome} ({c.partido})</span>
                </div>
              ))
            ) : (
              (electionData.brasil.partidos || []).slice(0, 5).map((p, i) => (
                <div key={i} className="legend-item">
                  <div className="legend-color-dot" style={{ background: p.cor }} />
                  <span>{p.partido} ({p.pctEleitos}%)</span>
                </div>
              ))
            )}
          </div>

          {electionData.isTempoReal && (
            <div className="legend-apuracao-section" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                <span>Apuração por Estado:</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.68rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                  <span>≥ 99% Concluída</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8' }} />
                  <span>95% – 99% Reta Final</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                  <span>&lt; 95% Em Andamento</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
