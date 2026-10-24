import { X, Layers, Code, Database } from 'lucide-react';
import type { ElectionManifest } from '../types/election';

interface CargoScalabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  manifest: ElectionManifest | null;
}

export const CargoScalabilityModal: React.FC<CargoScalabilityModalProps> = ({
  isOpen,
  onClose,
  manifest
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Layers size={22} color="#38bdf8" />
            <span>Arquitetura de Escalabilidade para Outros Cargos</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            A base técnica do <strong>Mapa Eleitoral Brasil</strong> foi projetada de forma modular e hierárquica. O modelo de dados desacopla o nível geográfico (Brasil &rarr; UF &rarr; Município &rarr; Zona &rarr; Exterior) do cargo eletivo, permitindo suportar eleições majoritárias e proporcionais sem reescrever a renderização do mapa ou do globo.
          </p>

          {/* Matrix of Scalability */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={16} color="#38bdf8" />
              <span>Matriz de Compatibilidade dos Cargos Eleitorais</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {manifest?.futureCargoScalability.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                      {item.cargo}
                    </span>
                    <span 
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)'
                      }}
                    >
                      SCHEMA PRONTO
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    {item.descricao}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TSE Pipeline Script Banner */}
          <div 
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
              <Code size={18} />
              <span>Pipeline de Ingestão do TSE Incluso no Repositório</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#a7f3d0', lineHeight: 1.5 }}>
              O script Python localizado em <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>scripts/tse_bulk_ingester_template.py</code> lê os arquivos CSV oficiais de votação por seção e munzona do TSE e gera automaticamente as fatias JSON otimizadas para qualquer eleição municipal, estadual ou federal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
