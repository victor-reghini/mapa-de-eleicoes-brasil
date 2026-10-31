# Repositório Local de Dados Abertos do TSE

Data de atualização do catálogo: 2026-10-31

Total de datasets catalogados: **1372** (incluindo os 224 pacotes de Boletins de Urna de 1º e 2º turnos para Presidente de 2014, 2018, 2022 e 2026 baixados integralmente em `dados_tse/boletins_urna/` e indexados em `data/bu_presidente.db` com **3.709.071** boletins por seção eleitoral).

## Distribuição por Categoria

| Categoria | Total Datasets |
| :--- | :---: |
| Boletins de Urna (BUs) Consolidados | 330 |
| Candidaturas e Declaração de Bens | 586 |
| Detalhe da Apuração por Seção Eleitoral | 30 |
| Perfil do Eleitorado e Locais de Votação | 193 |
| Resultados e Votação Nominal por Seção | 233 |

## Distribuição por Ano Eleitoral

| Ano | Tipo de Eleição | Datasets |
| :---: | :--- | :---: |
| 2026 | Geral | 217 |
| 2024 | Municipal | 202 |
| 2022 | Geral | 271 |
| 2020 | Municipal | 203 |
| 2018 | Geral | 242 |
| 2014 | Geral | 209 |

## Estrutura de Pastas

```
dados_tse/
├── catalogo_tse.json              # Metadados completos de todos os recursos
├── catalogo_tse.csv               # Versão tabular para análise em planilha
├── README.md                      # Relatório sintético de inventário
├── candidaturas_bens/             # Candidaturas, bens, coligações, vagas
├── perfil_eleitorado_locais/      # Perfil sociodemográfico e locais de votação
├── detalhe_apuracao_secao/        # Comparecimento, abstenção, brancos, nulos
├── votacao_nominal_secao/         # Votos nominais por seção eleitoral (BR e UFs)
└── boletins_urna/                 # Arquivos brutos de Boletim de Urna (BUs)
```
