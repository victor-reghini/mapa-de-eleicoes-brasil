# Escopo de Implementação Incremental (Referência: Radar do Voto)

Documento de planejamento e divisão de atividades para guiar o desenvolvimento incremental da plataforma, priorizando a configuração do banco de dados (Docker/Produção) e ingestão eficiente antes de qualquer download massivo de dados.

---

## Sumário das Fases

- [Fase 1: Infraestrutura de Banco de Dados (Docker & Produção)](#fase-1-infraestrutura-de-banco-de-dados-docker--produção)
- [Fase 2: Script de População e Ingestão Efêmera em Lote](#fase-2-script-de-população-e-ingestão-efêmera-em-lote)
- [Fase 3: Camada de API e Serviços de Consulta](#fase-3-camada-de-api-e-serviços-de-consulta)
- [Fase 4: Frontend - Layout em 4 Colunas e Comparação A vs B](#fase-4-frontend---layout-em-4-colunas-e-comparação-a-vs-b)
- [Fase 5: Módulos Complementares de Transparência e Responsabilização](#fase-5-módulos-complementares-de-transparência-e-responsabilização)

---

## Fase 1: Infraestrutura de Banco de Dados (Docker & Produção)
> **Objetivo**: Configurar o ambiente de banco de dados relacional para testes locais via Docker e suporte configurável via variáveis de ambiente (`DATABASE_URL`) para instâncias de produção (PostgreSQL gerenciado, Supabase, Neon ou RDS), além de suporte a SQLite local leve.

- [x] **Atividade 1.1: Docker Compose para Ambiente de Desenvolvimento/Testes**
  - Criar `docker-compose.yml` na raiz configurando o serviço `db` (PostgreSQL 16 Alpine com extensões úteis).
  - Definir volumes nomeados para persistência (`postgres_data`), portas (`5432:5432`), credenciais padrão de dev e healthcheck.
  - Criar `.env.example` com `DATABASE_URL=postgresql://eleicoes_user:eleicoes_pass@localhost:5432/eleicoes_brasil`.

- [x] **Atividade 1.2: DDL e Modelagem Relacional dos Dados Eleitorais**
  - Criar arquivo de migração SQL inicial (`scripts/schema/001_initial_schema.sql`):
    - `eleicoes`: Metadados do pleito (ano, turno, cargo, data, status).
    - `municipios`: Dados cadastrais TSE e código IBGE, UF, população e eleitorado apto.
    - `candidatos`: Perfil, nome de urna, partido, número, foto, situação de eleição.
    - `votacao_municipio`: Votação nominal agregada por município e candidato.
    - `votacao_secao`: Votos por seção eleitoral e local de votação.
    - `participacao_secao`: Comparecimento, abstenção, brancos e nulos por município/seção.
    - `locais_votacao`: Escolas, prédios, zonas, seções e geocoordenadas (latitude/longitude).
    - `votacao_comparada`: Tabela analítica pré-calculada de margens municipais entre candidatos $A$ e $B$ ($$\Delta\% = \%_A - \%_B$$).

- [x] **Atividade 1.3: Conector de Banco de Dados Agnóstico (`scripts/db_connector.py`)**
  - Criar módulo Python de conexão centralizada que detecta automaticamente `DATABASE_URL` (PostgreSQL via `psycopg2` ou `asyncpg`) ou faz fallback para SQLite local (`data/eleicoes_brasil.db`).
  - Implementar pool de conexões e gerenciamento de transações para inserções em lote (`batch_size=5000`).

- [x] **Atividade 1.4: Script de Inicialização e Verificação de Schemas (`scripts/init_db.py`)**
  - Script para rodar as migrações, aplicar chaves primárias, chaves estrangeiras e índices compostos essenciais (`idx_votacao_mun`, `idx_candidatos_eleicao`).
  - Teste de conectividade automático com comando CLI: `python3 scripts/init_db.py --check`.

---

## Fase 2: Script de População e Ingestão Efêmera em Lote
> **Regra**: Não manter dezenas de gigabytes de arquivos `.zip` ou `.csv` ocupando o disco da máquina. O processo deve baixar, processar em stream e descartar os arquivos brutos temporários.

- [x] **Atividade 2.1: Script Gerador de Dados de Teste (`scripts/seed_test_data.py`)**
  - Popular o banco local (Docker ou SQLite) com um conjunto mock/sintético consistente das eleições de 2026, 2024 e 2022 para permitir o desenvolvimento da interface antes de baixar os dados reais completos do TSE.
  - Inserir candidatos simulados de 2026 (ex: Lula vs Flávio Bolsonaro, Tarcísio, etc.), dados de participação e malha municipal sintética.

- [x] **Atividade 2.2: Pipeline de Ingestão em Stream Efêmero (`scripts/populate_database.py`)**
  - Consumir o catálogo gerado (`dados_tse/catalogo_tse.json`).
  - Para cada pacote selecionado (por ano, cargo ou categoria):
    1. Baixar o `.zip` diretamente para um arquivo temporário (`/tmp` ou pasta temporária descartável).
    2. Ler os CSVs diretamente da memória via `zipfile.ZipFile` com codificação `latin-1`.
    3. Tratar e normalizar tipos (inteiros, strings nulas, decimais).
    4. Executar inserção em lote (`INSERT INTO ... ON CONFLICT DO UPDATE`) via `copy_expert` ou `executemany`.
    5. Excluir imediatamente o arquivo temporário baixado, garantindo espaço em disco sempre livre.
  - Suporte a filtros via CLI: `--anos 2026,2022`, `--cargos PRESIDENTE,GOVERNADOR`, `--ufs BR,SP,RJ`.

- [x] **Atividade 2.3: Pré-Cálculo de Margens e Vencedores Municipais**
  - Criar rotina SQL pós-ingestão que calcula e popula a tabela de liderança municipal e margens de vitória entre os dois candidatos mais votados em cada município.

---

## Fase 3: Camada de API e Serviços de Consulta
> **Objetivo**: Disponibilizar endpoints de alta velocidade com queries otimizadas em SQL para consumo do frontend.

- [x] **Atividade 3.1: Serviço de Consulta / API Local (`server/api.py`)**
  - Endpoint `/api/eleicoes`: Lista de anos, cargos e turnos suportados.
  - Endpoint `/api/totalizacao`: Totais nacionais/estaduais, votos válidos, comparecimento, abstenções, brancos e nulos.
  - Endpoint `/api/comparativo`: Retorna a matriz municipal de votação entre o Candidato $A$ e Candidato $B$ com margem percentual calculada para coloração do mapa.
  - Endpoint `/api/municipio/:cd_ibge`: Votação detalhada de todos os cargos em uma cidade específica (Widget "Na sua Cidade").

- [x] **Atividade 3.2: Busca Global Unificada (`/api/busca?q=...`)**
  - Indexar nomes de municípios, siglas de estados e nomes de candidatos com busca rápida por prefixo/fonética.
  - Retornar resultados categorizados (Eleições, Estados, Cidades, Candidatos).

---

## Fase 4: Frontend - Layout em 4 Colunas e Comparação A vs B
> **Objetivo**: Replicar a arquitetura visual e os controles vistos no dashboard de referência sem cópia de código, usando componentes React Vanilla CSS modernos.

- [x] **Atividade 4.1: Menu Lateral Esquerdo de Navegação (`src/components/AppSidebarNav.tsx`)**
  - Barra lateral colapsável com ícones e rótulos:
    - *O Voto*: Eleições, Radar Mapa do Voto, Comparativo, Pesquisas.
    - *A Campanha*: Prestação de contas e doadores.
    - *O Mandato*: Emendas parlamentares por cidade.
    - *Rodapé*: Status de plano, favoritos/acesso rápido e alternador de tema claro/escuro.

- [x] **Atividade 4.2: Coluna de Controles e Filtros do Mapa (`src/components/MapControlPanel.tsx`)**
  - Abas: `[Mapa]` e `[Perfil do candidato]`.
  - Dropdowns: Seleção de Ano (`2026`) e Escopo Geográfico (`Brasil / Estados`).
  - Pílulas interativas de cargo: `Presidente 1ºT`, `Presidente 2ºT`, `Governador`, `Senador`, `Dep. Federal`, etc.
  - Alternador de Turno (`1º Turno` / `2º Turno`).
  - Lista de candidatos do pleito com fotos, números de urna, percentual e votos nominais.

- [x] **Atividade 4.3: Ferramenta de Exportação Visual ("Baixar este mapa")**
  - Botões seletores de proporção para redes sociais:
    - `Feed (4:5)`
    - `Quadrado (1:1)`
    - `Stories (9:16)`
  - Ações: `Baixar imagem (PNG)` com geração via Canvas (`src/utils/exportMapImage.ts`) e `Compartilhar este mapa` (link único com parâmetros na URL).
  - Inclusão automática de legenda, marca d'água e data de apuração na imagem exportada.

- [x] **Atividade 4.4: Modo Comparativo Bivariado no `Map2D.tsx`**
  - Topbar do mapa com seletor de visualização:
    - `Ver no mapa: [Comparação entre candidatos ▾]` $\rightarrow$ `A: [Lula ▾] vs B: [Flávio Bolsonaro ▾]`.
  - Escala cromática divergente:
    - Tons de cor do Candidato A para municípios onde A venceu (graduados por 5 faixas de margem: +0-5%, +5-15%, +15-25%, +25-40%, +40%+).
    - Tons de cor do Candidato B para municípios onde B venceu.
  - Tooltip interativo com percentual de cada um e número de votos na cidade ao passar o mouse.

- [x] **Atividade 4.5: Painel Direito de Totalização e Participação (`src/components/TotalizationPanel.tsx`)**
  - Campo de busca rápida de Estado ou Cidade.
  - Card de totalização oficial: votos nominais, percentual e barras de progresso.
  - Seção detalhada de **Participação**:
    - Comparecimento (%) e total de eleitores presentes.
    - Abstenção (%) e eleitores ausentes.
    - Votos brancos e votos nulos.
    - Total de aptos nas seções apuradas.

---

## Fase 5: Módulos Complementares de Transparência e Responsabilização

- [x] **Atividade 5.1: Módulo "Na sua Cidade" (Fluxo em 3 Passos)**
  - Campo de busca municipal $\rightarrow$ Seleção de cargo $\rightarrow$ Exibição de:
    1. Quem a cidade mais votou para cada cargo.
    2. A lista de deputados federais e estaduais eleitos com maior base local.
    3. Indicadores de engajamento (abstenção local vs média nacional com comparativo percentual).
  - Implementado em `src/components/CityDeepDiveModal.tsx` integrado com a API `/api/municipio/:cd_ibge`.

- [ ] **Atividade 5.2: Módulo "Radar Comparativo" (Multicandidatos)**
  - Comparação lado a lado de até 4 candidatos em tabela dinâmica e mapas comparativos.

- [ ] **Atividade 5.3: Módulo "Financiamento de Campanha"**
  - Visualização de receitas, gastos declarados e distribuição de fontes (FEFC x Doações) consumindo dados de prestação de contas do TSE.

- [ ] **Atividade 5.4: Módulo "Emendas Parlamentares"**
  - Rastreamento de repasses de emendas parlamentares federais para cada município brasileiro.

---

## Ordem de Execução Recomendada (Próximos Passos)

1. **Configuração da Infraestrutura de Banco**:
   - Subir o container Docker (`docker-compose.yml`) com PostgreSQL e inicializar o schema (`scripts/init_db.py`).
2. **Criação do Script de Seed**:
   - Rodar `scripts/seed_test_data.py` para termos dados imediatos de teste sem gastar largura de banda ou espaço em disco.
3. **Criação do Script de Ingestão em Streaming**:
   - Desenvolver `scripts/populate_database.py` para popular o banco sob demanda a partir do catálogo já existente.
4. **Implementação do Layout no Frontend**:
   - Montar o layout em 4 colunas e o mapa comparativo $A$ vs $B$.
