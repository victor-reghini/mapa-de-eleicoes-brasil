import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Database, 
  FileSpreadsheet, 
  Globe2, 
  FileCode,
  Scale
} from 'lucide-react';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAno?: number;
}

interface ElectionSource {
  ano: number;
  titulo: string;
  periodo: string;
  tseAppUrl: string;
  tseDadosAbertosUrl: string;
  tseHistoricoUrl: string;
  arquivosCsv: string[];
  descricao: string;
  eleitores: string;
  vencedor: string;
}

const FONTES_ELEICOES: ElectionSource[] = [
  {
    ano: 2022,
    titulo: "Eleição Presidencial 2022 (2º Turno)",
    periodo: "02/10/2022 (1ºT) • 30/10/2022 (2ºT)",
    tseAppUrl: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/545/uf/br/cargo/1/vis/nominal/resultados",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2022",
    tseHistoricoUrl: "https://sig.tse.jus.br/ords/dwtse/f?p=2001:101:::NO:::",
    arquivosCsv: [
      "votacao_candidato_munzona_2022_BRASIL.csv",
      "detalhe_votacao_munzona_2022_BRASIL.csv",
      "consulta_cand_2022_BRASIL.csv"
    ],
    descricao: "Apuração oficial do 2º turno entre Lula (50,90%) e Jair Bolsonaro (49,10%). Dados por município e zona eleitoral.",
    eleitores: "156.454.011 eleitores aptos",
    vencedor: "Lula (PT)"
  },
  {
    ano: 2018,
    titulo: "Eleição Presidencial 2018",
    periodo: "07/10/2018 (1ºT) • 28/10/2018 (2ºT)",
    tseAppUrl: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/296/uf/br/cargo/1/vis/nominal/resultados",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2018",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-2018",
    arquivosCsv: [
      "votacao_candidato_munzona_2018_BRASIL.csv",
      "detalhe_votacao_munzona_2018_BRASIL.csv"
    ],
    descricao: "Vitória de Jair Bolsonaro (55,13%) contra Fernando Haddad (44,87%) no 2º turno. Microdados das urnas eletrônicas.",
    eleitores: "147.306.294 eleitores aptos",
    vencedor: "Jair Bolsonaro (PSL)"
  },
  {
    ano: 2014,
    titulo: "Eleição Presidencial 2014",
    periodo: "05/10/2014 (1ºT) • 26/10/2014 (2ºT)",
    tseAppUrl: "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/144/uf/br/cargo/1/vis/nominal/resultados",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2014",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-2014",
    arquivosCsv: [
      "votacao_candidato_munzona_2014_BRASIL.csv",
      "detalhe_votacao_munzona_2014_BRASIL.csv"
    ],
    descricao: "Eleição acirrada entre Dilma Rousseff (51,64%) e Aécio Neves (48,36%). Série consolidada do TSE.",
    eleitores: "142.822.046 eleitores aptos",
    vencedor: "Dilma Rousseff (PT)"
  },
  {
    ano: 2010,
    titulo: "Eleição Presidencial 2010",
    periodo: "03/10/2010 (1ºT) • 31/10/2010 (2ºT)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2010",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2010",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-2010",
    arquivosCsv: [
      "votacao_candidato_munzona_2010_BRASIL.csv",
      "detalhe_votacao_munzona_2010_BRASIL.csv"
    ],
    descricao: "Eleição de Dilma Rousseff (56,05%) contra José Serra (43,95%). Primeira mulher eleita presidente do Brasil.",
    eleitores: "135.804.433 eleitores aptos",
    vencedor: "Dilma Rousseff (PT)"
  },
  {
    ano: 2006,
    titulo: "Eleição Presidencial 2006",
    periodo: "01/10/2006 (1ºT) • 29/10/2006 (2ºT)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2006",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2006",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-2006",
    arquivosCsv: [
      "votacao_candidato_munzona_2006_BRASIL.csv",
      "detalhe_votacao_munzona_2006_BRASIL.csv"
    ],
    descricao: "Reeleição de Luiz Inácio Lula da Silva (60,83%) contra Geraldo Alckmin (39,17%).",
    eleitores: "125.913.481 eleitores aptos",
    vencedor: "Lula (PT)"
  },
  {
    ano: 2002,
    titulo: "Eleição Presidencial 2002",
    periodo: "06/10/2002 (1ºT) • 27/10/2002 (2ºT)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2002",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-2002",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-2002",
    arquivosCsv: [
      "votacao_candidato_munzona_2002_BRASIL.csv",
      "detalhe_votacao_munzona_2002_BRASIL.csv"
    ],
    descricao: "Primeira eleição 100% eletrônica nacional com urnas em todas as seções. Vitória de Lula (61,27%) contra José Serra (38,73%).",
    eleitores: "115.277.456 eleitores aptos",
    vencedor: "Lula (PT)"
  },
  {
    ano: 1998,
    titulo: "Eleição Presidencial 1998",
    periodo: "04/10/1998 (Turno Único)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1998",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1998",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-1998",
    arquivosCsv: [
      "votacao_candidato_munzona_1998_BRASIL.csv"
    ],
    descricao: "Primeira eleição com reeleição presidencial permitida no Brasil. Vitória de FHC no 1º turno com 53,06%.",
    eleitores: "106.101.067 eleitores aptos",
    vencedor: "Fernando Henrique Cardoso (PSDB)"
  },
  {
    ano: 1994,
    titulo: "Eleição Presidencial 1994",
    periodo: "03/10/1994 (Turno Único)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1994",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1994",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-1994",
    arquivosCsv: [
      "votacao_candidato_munzona_1994_BRASIL.csv"
    ],
    descricao: "Eleição realizada sob o Plano Real. FHC vence no primeiro turno com 54,28% dos votos válidos contra Lula (27,07%).",
    eleitores: "94.743.043 eleitores aptos",
    vencedor: "Fernando Henrique Cardoso (PSDB)"
  },
  {
    ano: 1989,
    titulo: "Eleição Presidencial 1989 (Redemocratização)",
    periodo: "15/11/1989 (1ºT) • 17/12/1989 (2ºT)",
    tseAppUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1989",
    tseDadosAbertosUrl: "https://dadosabertos.tse.jus.br/dataset/resultados-1989",
    tseHistoricoUrl: "https://www.tse.jus.br/eleicoes/eleicoes-anteriores/eleicoes-1989",
    arquivosCsv: [
      "votacao_candidato_munzona_1989_BRASIL.csv"
    ],
    descricao: "Primeira eleição presidencial direta após o fim da ditadura militar, com 22 candidatos no 1º turno e Collor (53,03%) vencedor no 2º turno.",
    eleitores: "82.074.718 eleitores aptos",
    vencedor: "Fernando Collor (PRN)"
  }
];

export const SourcesModal: React.FC<SourcesModalProps> = ({
  isOpen,
  onClose,
  initialAno = 2022
}) => {
  const [activeTab, setActiveTab] = useState<'eleicoes' | 'portais' | 'auditoria'>('eleicoes');
  const [selectedAno, setSelectedAno] = useState<number>(initialAno);

  if (!isOpen) return null;

  const selectedElection = FONTES_ELEICOES.find(e => e.ano === selectedAno) || FONTES_ELEICOES[0];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-content" 
        style={{ maxWidth: 840, maxHeight: '88vh' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <ShieldCheck size={22} color="#06b6d4" />
            <span>Fontes Oficiais & Auditoria dos Dados (TSE & IBGE)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="sources-tab-nav">
          <button 
            className={`sources-tab-btn ${activeTab === 'eleicoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('eleicoes')}
          >
            <FileSpreadsheet size={15} />
            <span>Eleições por Pleito (1989 a 2022)</span>
          </button>
          <button 
            className={`sources-tab-btn ${activeTab === 'portais' ? 'active' : ''}`}
            onClick={() => setActiveTab('portais')}
          >
            <Globe2 size={15} />
            <span>Portais Oficiais Centrais</span>
          </button>
          <button 
            className={`sources-tab-btn ${activeTab === 'auditoria' ? 'active' : ''}`}
            onClick={() => setActiveTab('auditoria')}
          >
            <FileCode size={15} />
            <span>Como Auditar os Dados</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* TAB 1: ELEIÇÕES POR PLEITO */}
          {activeTab === 'eleicoes' && (
            <div>
              {/* Year Selector Pills */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Selecione o ano para auditar as fontes oficiais:
                </div>
                <div className="sources-years-pills">
                  {FONTES_ELEICOES.map((e) => (
                    <button
                      key={e.ano}
                      className={`sources-year-pill ${selectedAno === e.ano ? 'active' : ''}`}
                      onClick={() => setSelectedAno(e.ano)}
                    >
                      {e.ano}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Election Detail Card */}
              <div className="sources-detail-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                      {selectedElection.titulo}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {selectedElection.periodo} • {selectedElection.eleitores}
                    </p>
                  </div>
                  <span className="source-winner-badge">
                    Vencedor: {selectedElection.vencedor}
                  </span>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, margin: '14px 0' }}>
                  {selectedElection.descricao}
                </p>

                {/* Primary Official Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  
                  {/* Link 1: TSE Resultados Oficial App (Requested pattern) */}
                  <a 
                    href={selectedElection.tseAppUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-action-link primary"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Globe2 size={18} color="#38bdf8" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                          TSE Resultados Oficiais Web (App Oficial)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                          {selectedElection.tseAppUrl}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={16} />
                  </a>

                  {/* Link 2: TSE Portal de Dados Abertos */}
                  <a 
                    href={selectedElection.tseDadosAbertosUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-action-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Database size={18} color="#10b981" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                          Portal de Dados Abertos do TSE (Dataset Completo)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                          {selectedElection.tseDadosAbertosUrl}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={16} />
                  </a>

                  {/* Link 3: Repositório Histórico SIG DW */}
                  <a 
                    href={selectedElection.tseHistoricoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="source-action-link"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileSpreadsheet size={18} color="#f59e0b" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                          TSE Estatísticas Eleitorais (Série Histórica e DW)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                          {selectedElection.tseHistoricoUrl}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* CSV Files Ingested */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Arquivos brutos originais do repositório TSE processados:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedElection.arquivosCsv.map((file, i) => (
                      <span key={i} className="source-file-chip">
                        <FileCode size={13} color="#94a3b8" />
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTAIS CENTRAIS */}
          {activeTab === 'portais' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Todos os dados exibidos nesta aplicação derivam estritamente de fontes governamentais e científicas oficiais da República Federativa do Brasil:
              </div>

              {/* Portal 1 */}
              <div className="portal-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="portal-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                      <Globe2 size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>
                        TSE Resultados Oficiais (Divulgação em Tempo Real & Histórica)
                      </h4>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Plataforma oficial do Tribunal Superior Eleitoral para consulta da apuração consolidada, boletins de urna (BU), registro de comparecimento, votos brancos e nulos por seção.
                      </p>
                      <a 
                        href="https://resultados.tse.jus.br/oficial/app/index.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portal-external-link"
                      >
                        https://resultados.tse.jus.br/oficial/app/index.html
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal 2 */}
              <div className="portal-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="portal-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Database size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>
                        Portal de Dados Abertos do TSE
                      </h4>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Repositório aberto contendo os microdados brutos de votação por município e zona (CSVs), prestação de contas dos candidatos e histórico de partidos políticos.
                      </p>
                      <a 
                        href="https://dadosabertos.tse.jus.br/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portal-external-link"
                      >
                        https://dadosabertos.tse.jus.br/
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal 3 */}
              <div className="portal-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="portal-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <FileSpreadsheet size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>
                        SIG DW TSE (Série Histórica desde 1945)
                      </h4>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Banco de dados estatísticos consolidado do TSE com relatórios oficiais das eleições presidenciais de 1989 a 2022.
                      </p>
                      <a 
                        href="https://sig.tse.jus.br/ords/dwtse/f?p=2001:101:::NO:::" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portal-external-link"
                      >
                        https://sig.tse.jus.br/ (Estatísticas Eleitorais)
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal 4 */}
              <div className="portal-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="portal-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                      <Globe2 size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>
                        IBGE - Malhas Territoriais e Geociências
                      </h4>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Polígonos vetoriais e limites geodésicos oficiais dos 5.564 municípios brasileiros e das 27 Unidades Federativas (SIRGAS 2000).
                      </p>
                      <a 
                        href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portal-external-link"
                      >
                        https://www.ibge.gov.br/geociencias/malhas-territoriais/
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Portal 5 */}
              <div className="portal-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="portal-icon-box" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
                      <Scale size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff' }}>
                        Legislação Eleitoral (Código Eleitoral - Lei nº 4.737/1965)
                      </h4>
                      <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        Base legal do cálculo de votos válidos, votos em branco, anulação de votos e candidaturas sub judice (Art. 175).
                      </p>
                      <a 
                        href="http://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="portal-external-link"
                      >
                        http://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: COMO AUDITAR OS DADOS */}
          {activeTab === 'auditoria' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                background: 'rgba(6, 182, 212, 0.1)', 
                border: '1px solid rgba(6, 182, 212, 0.3)', 
                borderRadius: 10, 
                padding: 14,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <ShieldCheck size={22} color="#06b6d4" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                  <strong>Compromisso de Transparência & Dados Verificáveis:</strong> Qualquer usuário pode baixar a base completa desta aplicação em formato SQLite local e confrontar os resultados diretamente com os arquivos brutos fornecidos pelo TSE.
                </div>
              </div>

              {/* Step 1 */}
              <div className="audit-step-card">
                <div className="audit-step-badge">Passo 1</div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#ffffff' }}>
                    Baixar o Banco SQLite Local da Aplicação
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Clique no ícone de banco de dados no cabeçalho ou faça o download direto do arquivo consolidado:
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <a 
                      href="/data/eleicoes_brasil.db" 
                      download="eleicoes_brasil.db"
                      className="audit-download-link"
                    >
                      <Database size={15} />
                      Baixar eleicoes_brasil.db (SQLite)
                    </a>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="audit-step-card">
                <div className="audit-step-badge">Passo 2</div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#ffffff' }}>
                    Verificar a Conciliação Matemática dos Votos
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Em qualquer pleito, o sistema obedece rigorosamente às equações canônicas do Código Eleitoral:
                  </p>
                  <div style={{ 
                    background: '#090d16', 
                    padding: '10px 14px', 
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: '#38bdf8'
                  }}>
                    Comparecimento = Votos Válidos + Votos Brancos + Votos Nulos<br/>
                    Eleitores Aptos = Comparecimento + Abstenções
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="audit-step-card">
                <div className="audit-step-badge">Passo 3</div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#ffffff' }}>
                    Consultar o Banco via SQL ou Python
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Abra o banco no terminal ou em ferramentas como DBeaver / DB Browser for SQLite:
                  </p>
                  <pre style={{ 
                    background: '#090d16', 
                    padding: '12px 14px', 
                    borderRadius: 8, 
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    margin: 0
                  }}>
{`-- Exemplo: Consultar votação de 1989 em Minas Gerais
SELECT uf, vencedor, pct_validos, candidatos_json 
FROM resultados_uf 
WHERE eleicao_id = '1989_PRESIDENTE' AND turno = 1 AND uf = 'MG';`}
                  </pre>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ 
          padding: '14px 24px', 
          borderTop: '1px solid var(--border-subtle)', 
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Tribunal Superior Eleitoral (TSE) • Dados sob licença pública oficial de dados abertos
          </div>
          <button 
            onClick={onClose}
            className="control-select"
            style={{ padding: '6px 18px', background: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
