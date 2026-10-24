import React from 'react';
import { X, AlertCircle, FileX2, Scale, Info } from 'lucide-react';
import type { NullDetail } from '../types/election';

interface NullDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  detalhesNulos: NullDetail | undefined;
  ano: number;
  turno: number;
}

export const NullDetailModal: React.FC<NullDetailModalProps> = ({
  isOpen,
  onClose,
  detalhesNulos,
  ano,
  turno
}) => {
  if (!isOpen || !detalhesNulos) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FileX2 size={22} color="#fb7185" />
            <span>Raio-X dos Votos Nulos & Números Digitados ({ano} - {turno}º Turno)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Summary Strip */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.03)',
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Total de Votos Nulos
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#fb7185' }}>
                {detalhesNulos.totalNulos.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {detalhesNulos.pctNulos}% do comparecimento
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Votos em Branco
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#cbd5e1' }}>
                {detalhesNulos.totalBrancos.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {detalhesNulos.pctBrancos}% do comparecimento
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Abstenções Totais
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8' }}>
                {detalhesNulos.totalAbstencoes.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {detalhesNulos.pctAbstencoes}% dos aptos
              </div>
            </div>
          </div>

          {/* TSE Legal Notice */}
          <div className="tse-notice-box">
            <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Regulamentação Oficial do TSE:</strong> {detalhesNulos.notaTSE}
            </div>
          </div>

          {/* Numbers Typed Table */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="#fb7185" />
              <span>Dígitos Inexistentes Mais Digitados nas Urnas Eletrônicas</span>
            </h3>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              <table className="null-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Classificação / Motivo TSE</th>
                    <th>Votos Registrados</th>
                    <th>% dos Votos Nulos</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhesNulos.numerosDigitados.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="null-number-pill">{item.numero}</span>
                      </td>
                      <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                        {item.descricao}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {item.votos.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb7185' }}>
                        {item.pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub Judice Anulados (if any) */}
          {detalhesNulos.subJudice && detalhesNulos.subJudice.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={16} color="#f59e0b" />
                <span>Votos Anulados Sub Judice (Candidaturas Impugnadas)</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detalhesNulos.subJudice.map((sub, idx) => (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="null-number-pill" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                          Nº {sub.numero}
                        </span>
                        <span>{sub.nomeCandidato}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#fde68a', marginTop: 4 }}>
                        {sub.motivo}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fef3c7' }}>
                        {sub.votos.toLocaleString('pt-BR')} votos
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase' }}>
                        {sub.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
