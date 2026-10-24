# Mapa Eleitoral Interativo do Brasil (1989 a 2022)

Aplicação web geoespacial interativa para visualização e auditoria dos resultados oficiais das eleições presidenciais brasileiras desde a redemocratização (1989 a 2022), construída sobre dados públicos abertos do **Tribunal Superior Eleitoral (TSE)** e malhas territoriais do **IBGE**.

Inclui suporte multi-escala: visão por **Estados (UF)**, **5.564 Municípios**, **Zonas Eleitorais** e **Globo 3D Interativo** para a votação de brasileiros no exterior (Zona ZZ).

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- **Node.js** (versão 18.x ou superior recomendada)
- Gerenciador de pacotes **npm** (ou `pnpm` / `yarn`)
- *(Opcional)* **Python 3.9+** caso deseje reconstruir o banco SQLite ou reprocessar malhas geoespaciais.

---

### Passo a Passo

1. **Clonar ou acessar o diretório do projeto**:
   ```bash
   cd mapa-de-eleicoes-brasil
   ```

2. **Instalar as dependências**:
   ```bash
   npm install
   ```

3. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Acessar no navegador**:
   Abra seu navegador no endereço indicado no terminal:
   ```
   http://localhost:5173/
   ```

---

## 📦 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor Vite local com Hot Module Replacement (HMR). |
| `npm run build` | Valida TypeScript (`tsc -b`) e compila o bundle otimizado de produção em `dist/`. |
| `npm run preview` | Pré-visualiza localmente a versão compilada em `dist/`. |
| `npm run lint` | Executa a verificação estática de código com o Oxlint. |

---

## 🛠️ Scripts de Dados & Banco SQLite (Python)

A aplicação já vem com o banco SQLite gerado e todas as fatias de dados sincronizadas em `data/` e `public/`. Se você desejar reprocessar, estender ou alimentar novos dados do TSE:

1. **Reconstruir o Banco SQLite e as Fatias JSON (1989–2022)**:
   ```bash
   python3 scripts/build_database.py
   ```
   *Gera o arquivo `data/eleicoes_brasil.db`, espelha em `public/data/eleicoes_brasil.db` e cria as fatias JSON em `public/data/elections/`.*

2. **Reparticionar os 5.564 Municípios por UF**:
   ```bash
   python3 scripts/partition_municipalities.py
   ```
   *Particiona o GeoJSON do IBGE em arquivos leves sob demanda em `public/geo/mun/{UF}.json` e gera o índice de busca instantânea.*

3. **Template de Ingestão em Lote do Repositório de Dados Abertos do TSE**:
   ```bash
   python3 scripts/tse_bulk_ingester_template.py
   ```
   *Pipeline demonstrativo para importação massiva dos arquivos brutos `votacao_candidato_munzona_*.csv` do TSE para outros cargos (Governador, Senador, Prefeito, Deputados e Vereadores).*

---

## 🗂️ Estrutura do Repositório

```
mapa-de-eleicoes-brasil/
├── data/
│   └── eleicoes_brasil.db           # Banco de dados relacional SQLite local
├── public/
│   ├── data/
│   │   ├── eleicoes_brasil.db       # Cópia pública para download direto no navegador
│   │   └── elections/               # Fatias JSON normalizadas de cada pleito (1989 a 2022)
│   │       ├── manifest.json        # Manifesto com todos os pleitos suportados
│   │       └── [ANO]_[TURNO].json   # Resultados detalhados por estado, exterior, nulos
│   └── geo/
│       ├── br-states.json           # Malha vetorial das 27 UFs do Brasil (IBGE)
│       ├── countries-110m.json      # TopoJSON do mapa-múndi para o Globo 3D
│       ├── municipalities_index.json# Índice de busca rápida dos 5.564 municípios
│       └── mun/[UF].json            # Polígonos municipais particionados sob demanda
├── scripts/
│   ├── build_database.py            # Construtor do banco SQLite e exportador JSON
│   ├── partition_municipalities.py  # Particionador dos municípios por UF
│   ├── fetch_geo_assets.py          # Otimizador de malhas geográficas
│   └── tse_bulk_ingester_template.py# Ingestor modelo para CSVs brutos do TSE
├── src/
│   ├── components/
│   │   ├── Map2D.tsx                # Mapa coroplético D3 interativo com zoom e pan
│   │   ├── Globe3D.tsx              # Globo 3D ortográfico para votos no exterior (ZZ)
│   │   ├── Header.tsx               # Controles de ano, turno, cargo e atalhos
│   │   ├── Subbar.tsx               # Abas de granularidade, busca e breadcrumbs
│   │   ├── SidebarResults.tsx       # Ranking, votos válidos, brancos, nulos e abstenções
│   │   ├── NullDetailModal.tsx      # Raio-x dos votos nulos e números mais digitados
│   │   ├── SourcesModal.tsx         # Modal com todas as fontes oficiais do TSE e IBGE
│   │   └── CargoScalabilityModal.tsx# Especificação para extensão a demais cargos
│   ├── services/
│   │   └── electionService.ts       # Camada de cache e carregamento de dados
│   ├── types/
│   │   └── election.ts              # Tipagens TypeScript completas do domínio eleitoral
│   ├── App.tsx                      # Componente raiz da aplicação
│   └── index.css                    # Design system em CSS Vanilla com suporte a dark mode
├── index.html                       # Documento HTML principal
├── package.json                     # Metadados e dependências do projeto
└── vite.config.ts                   # Configuração do Vite
```

---

## 🏛️ Fontes dos Dados Oficiais

- **TSE Resultados Oficiais**: [resultados.tse.jus.br](https://resultados.tse.jus.br/oficial/app/index.html)
- **Portal de Dados Abertos do TSE**: [dadosabertos.tse.jus.br](https://dadosabertos.tse.jus.br/)
- **Série Histórica e Estatísticas Eleitorais (SIG DW)**: [sig.tse.jus.br](https://sig.tse.jus.br/ords/dwtse/f?p=2001:101:::NO:::)
- **IBGE Geociências (Malhas Territoriais Municipais)**: [ibge.gov.br/geociencias](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/)
- **Código Eleitoral**: [Lei nº 4.737/1965 (Art. 175)](http://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm)
