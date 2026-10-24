import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { ZoomIn, ZoomOut, Play, Pause, RotateCcw } from 'lucide-react';
import type { ElectionRoundData, ConsularCity } from '../types/election';
import { electionService } from '../services/electionService';

interface Globe3DProps {
  electionData: ElectionRoundData | null;
  onSelectConsularCity: (city: ConsularCity) => void;
  selectedCity: ConsularCity | null;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  electionData,
  onSelectConsularCity,
  selectedCity
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [worldData, setWorldData] = useState<any>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [rotation, setRotation] = useState<[number, number, number]>([-10, -20, 0]);
  const [scale, setScale] = useState(280);
  const [hoveredCity, setHoveredCity] = useState<ConsularCity | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Fetch World TopoJSON
  useEffect(() => {
    electionService.getWorldAtlas().then(setWorldData).catch(console.error);
  }, []);

  // Animation Loop for Auto-Rotation
  useEffect(() => {
    if (!isRotating) return;
    let animId: number;
    const step = () => {
      setRotation(prev => [(prev[0] + 0.35) % 360, prev[1], prev[2]]);
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isRotating]);

  // Canvas Render
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !worldData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Retina support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(ctx);

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Space background glow
    const radialGlow = ctx.createRadialGradient(width / 2, height / 2, scale * 0.7, width / 2, height / 2, scale * 1.3);
    radialGlow.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
    radialGlow.addColorStop(0.7, 'rgba(59, 130, 246, 0.03)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Globe Sphere (Ocean with subtle radial gradient)
    const oceanGradient = ctx.createRadialGradient(
      width / 2 - scale * 0.3,
      height / 2 - scale * 0.3,
      scale * 0.1,
      width / 2,
      height / 2,
      scale
    );
    oceanGradient.addColorStop(0, '#12233f');
    oceanGradient.addColorStop(0.8, '#0b1324');
    oceanGradient.addColorStop(1, '#050a14');

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, scale, 0, 2 * Math.PI);
    ctx.fillStyle = oceanGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Draw Graticule (Lat/Lon grid)
    const graticule = d3.geoGraticule();
    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 4. Draw Landmasses
    const land = topojson.feature(worldData, worldData.objects.land);
    ctx.beginPath();
    path(land);
    ctx.fillStyle = '#1c2841';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // 5. Highlight Brazil on the Globe
    const countries = topojson.feature(worldData, worldData.objects.countries) as any;
    // ISO numeric code for Brazil is 076
    const brazilFeature = countries.features?.find((f: any) => f.id === '076' || f.id === 76);
    if (brazilFeature) {
      ctx.beginPath();
      path(brazilFeature);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 6. Draw Consular Voting Beacons (ZZ)
    const cities = electionData?.exterior?.cidades || [];
    cities.forEach((city) => {
      const coords = projection([city.lon, city.lat]);
      if (!coords) return; // Point is on the back side of the globe

      const isHovered = hoveredCity?.cidade === city.cidade;
      const isSelected = selectedCity?.cidade === city.cidade;
      const isLula = city.lula_pct >= 50;
      const beaconColor = isLula ? '#e11d48' : '#2563eb';

      // Pulse ring
      ctx.beginPath();
      ctx.arc(coords[0], coords[1], isHovered || isSelected ? 12 : 7, 0, 2 * Math.PI);
      ctx.strokeStyle = beaconColor;
      ctx.lineWidth = isHovered || isSelected ? 2 : 1;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(coords[0], coords[1], isHovered || isSelected ? 5 : 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // City Label on Hover or Selected
      if (isHovered || isSelected) {
        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${city.cidade} (${city.lula_pct}%)`, coords[0], coords[1] - 14);
        ctx.shadowBlur = 0;
      }
    });

  }, [worldData, rotation, scale, electionData, hoveredCity, selectedCity]);

  // Drag Interactions
  const isDragging = useRef(false);
  const dragStartPos = useRef<[number, number]>([0, 0]);
  const dragStartRot = useRef<[number, number, number]>([0, 0, 0]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    dragStartPos.current = [e.clientX, e.clientY];
    dragStartRot.current = [...rotation];
    setIsRotating(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return;

    if (isDragging.current) {
      const dx = e.clientX - dragStartPos.current[0];
      const dy = e.clientY - dragStartPos.current[1];
      const sensitivity = 0.35;
      setRotation([
        dragStartRot.current[0] + dx * sensitivity,
        Math.max(-80, Math.min(80, dragStartRot.current[1] - dy * sensitivity)),
        dragStartRot.current[2]
      ]);
      return;
    }

    // Check hover over consular cities
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);

    const cities = electionData?.exterior?.cidades || [];
    let foundCity: ConsularCity | null = null;

    for (const city of cities) {
      const coords = projection([city.lon, city.lat]);
      if (coords) {
        const dist = Math.hypot(coords[0] - mouseX, coords[1] - mouseY);
        if (dist <= 12) {
          foundCity = city;
          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          break;
        }
      }
    }

    setHoveredCity(foundCity);
    if (!foundCity) setTooltipPos(null);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleClick = () => {
    if (hoveredCity) {
      onSelectConsularCity(hoveredCity);
    }
  };

  return (
    <div className="map-viewport" ref={containerRef}>
      {/* Floating Globe Controls */}
      <div className="map-floating-controls">
        <button 
          className="map-control-btn" 
          onClick={() => setScale(s => Math.min(s * 1.25, 700))} 
          title="Aproximar Zoom (+)"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="map-control-btn" 
          onClick={() => setScale(s => Math.max(s * 0.8, 160))} 
          title="Afastar Zoom (-)"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          className="map-control-btn" 
          onClick={() => setIsRotating(r => !r)} 
          title={isRotating ? "Pausar Rotação" : "Auto-Rotacionar"}
        >
          {isRotating ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button 
          className="map-control-btn" 
          onClick={() => { setRotation([-10, -20, 0]); setScale(280); }} 
          title="Resetar Posição"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Globe Header Badge */}
      <div 
        style={{
          position: 'absolute',
          top: 20,
          left: 70,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          padding: '8px 14px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          Votação no Exterior (Zona ZZ) • {electionData?.exterior?.cidades?.length || 0} Cidades Consulares
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDragging.current = false; setHoveredCity(null); }}
        onClick={handleClick}
      />

      {/* Consular City Hover Tooltip */}
      {hoveredCity && tooltipPos && (
        <div 
          className="map-tooltip"
          style={{ 
            left: `${tooltipPos.x}px`, 
            top: `${tooltipPos.y}px` 
          }}
        >
          <div className="tooltip-title">
            <span>{hoveredCity.cidade}</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{hoveredCity.pais}</span>
          </div>
          <div className="tooltip-subtitle">
            Eleitores Aptos: {hoveredCity.eleitores.toLocaleString('pt-BR')}
          </div>
          <div className="tooltip-cand-row">
            <div className="tooltip-cand-name">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e11d48' }} />
              <span>Lula (PT)</span>
            </div>
            <div className="tooltip-cand-score">
              {hoveredCity.lula_pct}% ({hoveredCity.lula_r2.toLocaleString('pt-BR')})
            </div>
          </div>
          <div className="tooltip-cand-row">
            <div className="tooltip-cand-name">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
              <span>Bolsonaro (PL)</span>
            </div>
            <div className="tooltip-cand-score">
              {(100 - hoveredCity.lula_pct).toFixed(1)}% ({hoveredCity.bolsonaro_r2.toLocaleString('pt-BR')})
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
