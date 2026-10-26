/**
 * Utilitário de exportação de mapas para redes sociais em alta resolução (PNG)
 * Suporta formatos: Feed (4:5), Quadrado (1:1) e Stories (9:16)
 * Inclui cabeçalho visual, legenda de apuração, marca d'água e crédito TSE.
 */

export type ExportFormat = 'feed' | 'quadrado' | 'stories';

interface ExportMetadata {
  ano: number;
  turno: number;
  cargo: string;
  subtitulo?: string;
  candA?: { nome: string; partido: string; cor: string };
  candB?: { nome: string; partido: string; cor: string };
  vencedor?: string;
  pctApuracao?: number;
}

export async function exportMapImage(
  svgElement: SVGSVGElement,
  format: ExportFormat,
  meta: ExportMetadata
): Promise<void> {
  const dimensions = {
    quadrado: { width: 1080, height: 1080 },
    feed: { width: 1080, height: 1350 },
    stories: { width: 1080, height: 1920 }
  }[format];

  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Fundo Gradiente Premium Escuro
  const bgGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height);
  bgGrad.addColorStop(0, '#0a0e1a');
  bgGrad.addColorStop(0.5, '#070b14');
  bgGrad.addColorStop(1, '#04070d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);

  // Efeito sutil de vinheta/grid de radar
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < dimensions.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, dimensions.height);
    ctx.stroke();
  }
  for (let y = 0; y < dimensions.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(dimensions.width, y);
    ctx.stroke();
  }

  // 2. Cabeçalho Visual
  const headerTop = format === 'stories' ? 120 : 60;
  
  // Tag do Radar do Voto
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(60, headerTop, 8, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Inter", sans-serif';
  ctx.fillText('RADAR DO VOTO', 80, headerTop + 32);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px "Inter", sans-serif';
  ctx.fillText('• MAPA ELEITORAL DO BRASIL', 380, headerTop + 30);

  // Título do Pleito
  const cargoLabel = meta.cargo.replace('_', ' ');
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 32px "Inter", sans-serif';
  ctx.fillText(`${cargoLabel} · ${meta.ano} · ${meta.turno}º TURNO`, 60, headerTop + 80);

  // Subtítulo descritivo
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 20px "Inter", sans-serif';
  const sub = meta.subtitulo || (meta.candA && meta.candB 
    ? `Comparação direta entre ${meta.candA.nome} (${meta.candA.partido}) e ${meta.candB.nome} (${meta.candB.partido})` 
    : 'Distribuição geográfica da votação por município');
  ctx.fillText(sub, 60, headerTop + 115);

  // 3. Renderização do SVG do Mapa
  const svgBounds = svgElement.getBoundingClientRect();
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const URL = window.URL || window.webkitURL || window;
  const blobUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = blobUrl;
  });

  // Espaço reservado para o mapa dentro do canvas
  const mapMarginTop = headerTop + 140;
  const footerHeight = format === 'stories' ? 240 : 160;
  const availableMapHeight = dimensions.height - mapMarginTop - footerHeight;
  const availableMapWidth = dimensions.width - 120;

  const svgAspect = (svgBounds.width || 800) / (svgBounds.height || 600);
  let renderWidth = availableMapWidth;
  let renderHeight = renderWidth / svgAspect;

  if (renderHeight > availableMapHeight) {
    renderHeight = availableMapHeight;
    renderWidth = renderHeight * svgAspect;
  }

  const renderX = 60 + (availableMapWidth - renderWidth) / 2;
  const renderY = mapMarginTop + (availableMapHeight - renderHeight) / 2;

  ctx.drawImage(img, renderX, renderY, renderWidth, renderHeight);
  URL.revokeObjectURL(blobUrl);

  // 4. Legenda Comparativa / Rodapé
  const footerY = dimensions.height - footerHeight + 20;

  if (meta.candA && meta.candB) {
    // Card da legenda bivariada
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(60, footerY - 30, dimensions.width - 120, 68, 12);
    ctx.fill();
    ctx.stroke();

    // Rótulo Cand A
    ctx.fillStyle = meta.candA.cor;
    ctx.beginPath();
    ctx.arc(85, footerY + 4, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText(`${meta.candA.nome} (${meta.candA.partido})`, 105, footerY + 10);

    // Barra de gradiente divergente
    const barX = 380;
    const barY = footerY - 5;
    const barWidth = 320;
    const barHeight = 18;

    const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    grad.addColorStop(0, meta.candA.cor);
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, meta.candB.cor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 6);
    ctx.fill();

    // Rótulo Cand B
    ctx.fillStyle = meta.candB.cor;
    ctx.beginPath();
    ctx.arc(barX + barWidth + 30, footerY + 4, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText(`${meta.candB.nome} (${meta.candB.partido})`, barX + barWidth + 50, footerY + 10);
  }

  // 5. Créditos Oficiais e Data
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "Inter", sans-serif';
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  ctx.fillText(`Dados oficiais: Tribunal Superior Eleitoral (TSE) · Gerado em ${dataHoje}`, 60, dimensions.height - 35);
  ctx.fillText('Radar do Voto · Compartilhamento aberto', dimensions.width - 340, dimensions.height - 35);

  // 6. Download Automático da Imagem
  canvas.toBlob((blob) => {
    if (!blob) return;
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `mapa-eleicoes-${meta.ano}-${meta.cargo.toLowerCase()}-${format}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, 'image/png');
}
