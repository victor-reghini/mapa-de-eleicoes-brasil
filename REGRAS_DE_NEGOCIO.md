# Regras de Negócio do Sistema — Mapa de Eleições Brasil (Radar do Voto)

> **Finalidade deste documento**: Centralizar e formalizar todas as regras eleitorais, fórmulas matemáticas de apuração, critérios de visualização de mapas, diretrizes de persistência e contratos de dados para orientar novas implementações, testes e manutenções com base nos princípios de **Clean Code** e **SOLID**.

---

## 1. Regras do Sistema Eleitoral Brasileiro (TSE)

### 1.1. Categorias de Pleito e Escopo Temporal
O sistema contempla dois grandes ciclos constitucionais de 4 em 4 anos:
1. **Eleições Gerais** (anos: `2026`, `2022`, `2018`, `2014`, `...`):
   - **Presidente da República**: Circunscrição nacional (Brasil + exterior em seções consulares).
   - **Governador de Estado / DF**: Circunscrição estadual / distrital.
   - **Senador**: Renovação alternada de 1/3 (1 vaga) e 2/3 (2 vagas) a cada 4 anos.
   - **Deputado Federal**: Proporcional estadual (de 8 a 70 vagas por estado conforme população).
   - **Deputado Estadual / Distrital**: Proporcional estadual / distrital.
2. **Eleições Municipais** (anos: `2024`, `2020`, `2016`, `...`):
   - **Prefeito**: Circunscrição municipal.
   - **Vereador**: Proporcional municipal.

---

### 1.2. Regra da Maioria Absoluta vs Maioria Simples

#### Sistema Majoritário com 2º Turno (Dois Turnos):
- **Cargos aplicáveis**: Presidente, Governadores e Prefeitos de municípios com **mais de 200.000 eleitores aptos**.
- **Condição de vitória em 1º Turno**:
  $$\text{Votos Válidos do Candidato} > 50\% \text{ dos Votos Válidos Totais}$$
- **Disputa de 2º Turno**: Se nenhum candidato ultrapassar $50\%$ dos votos válidos, os 2 candidatos mais votados no 1º turno disputam o 2º turno no último domingo de outubro. Vence quem obtiver a maioria simples dos votos válidos no 2º turno.

#### Sistema Majoritário em Turno Único:
- **Cargos aplicáveis**: Senador da República e Prefeitos de municípios com **até 200.000 eleitores aptos**.
- O candidato mais votado em turno único é declarado eleito, independentemente do percentual alcançado.

#### Sistema Proporcional (Turno Único):
- **Cargos aplicáveis**: Deputados Federais, Deputados Estaduais/Distritais e Vereadores.
- Não há 2º turno. As vagas são distribuídas pelo Quociente Eleitoral ($QE = \text{Votos Válidos} / \text{Vagas}$) e Quociente Partidário ($QP$), com distribuição de sobras pelo método D'Hondt e cláusula de votação nominal individual mínima ($10\%$ do $QE$).

---

## 2. Matemática de Apuração e Contabilidade dos Votos

### 2.1. Equações Fundamentais de Participação

```
[ Eleitorado Apto Total ] = [ Comparecimento ] + [ Abstenção ]
```

```
[ Total de Votos na Urna ] = [ Votos Válidos ] + [ Votos Brancos ] + [ Votos Nulos ]
```

```
[ Votos Válidos ] = [ Votos Nominais a Candidatos ] + [ Votos de Legenda ]
```

---

### 2.2. Cálculo dos Percentuais Oficiais

#### Percentual Oficial de Votação do Candidato ($pctValidos$):
> **Regra Constitucional (Art. 77, § 2º da CF/88)**: Os votos em branco e os votos nulos **NÃO** entram no cálculo do percentual dos candidatos.

$$\% \text{ Votos Válidos do Candidato } i = \left(\frac{\text{Votos Nominais}_i}{\text{Total de Votos Válidos}}\right) \times 100$$

#### Indicadores Cívicos e de Engajamento:
- **Taxa de Comparecimento**:
  $$\% \text{ Comparecimento} = \left(\frac{\text{Total de Eleitores que Votaram}}{\text{Eleitorado Apto}}\right) \times 100$$
- **Taxa de Abstenção**:
  $$\% \text{ Abstenção} = \left(\frac{\text{Total de Eleitores Ausentes}}{\text{Eleitorado Apto}}\right) \times 100$$
- **Taxa de Votos Brancos**:
  $$\% \text{ Brancos} = \left(\frac{\text{Total de Votos Brancos}}{\text{Total de Votos na Urna}}\right) \times 100$$
- **Taxa de Votos Nulos**:
  $$\% \text{ Nulos} = \left(\frac{\text{Total de Votos Nulos}}{\text{Total de Votos na Urna}}\right) \times 100$$

---

## 3. Regras do Modo Comparativo Bivariado ($A$ vs $B$)

O sistema permite a comparação direta e bivariada entre dois candidatos do mesmo pleito (ex: *Lula #13* vs *Flávio Bolsonaro #22* no 2º Turno de 2026), colorindo a malha geográfica conforme a margem local de vitória.

### 3.1. Cálculo da Margem de Vitória Municipal ($\Delta\%$)
Para cada município $m$, a margem percentual é calculada como:

$$\Delta\% = \%_A - \%_B$$

Onde:
- $\%_A$: Percentual de votos válidos obtidos pelo Candidato $A$ no município.
- $\%_B$: Percentual de votos válidos obtidos pelo Candidato $B$ no município.

### 3.2. Faixas de Vantagem e Paleta Divergente (5 Tiers por Candidato)

| Faixa de Margem ($|\Delta\%|$) | Grau de Vantagem | Comportamento Cromático |
| :--- | :--- | :--- |
| **$\ge 40\%$** | Hegemonia Eleitoral | Tom mais escuro e saturado (Tier 5) |
| **$25\% \text{ a } 39,9\%$** | Vantagem Muito Ampla | Tom forte intermediário (Tier 4) |
| **$15\% \text{ a } 24,9\%$** | Vantagem Sólida | Cor primária oficial do candidato (Tier 3) |
| **$5\% \text{ a } 14,9\%$** | Vantagem Moderada | Tom mais claro (Tier 2) |
| **$0\% \text{ a } 4,9\%$** | Disputa Acirrada / Margem Estreita | Tom pastel/suave próximo ao centro neutro (Tier 1) |

- **Determinação do Vencedor Local**:
  - Se $\Delta\% > 0$: Município colorido com a escala do Candidato $A$.
  - Se $\Delta\% < 0$: Município colorido com a escala do Candidato $B$.
  - Se $\Delta\% = 0$: Empate matemático (cor neutra cinza-ardósia `#64748b`).

---

## 4. Regras do Módulo "Na sua Cidade" (Fluxo em 3 Passos)

O módulo oferece ao cidadão um raio-X municipal em 3 etapas sequenciais:

1. **Passo 1 — Identificação Geográfica**:
   - O usuário busca pelo nome da cidade ou código IBGE (7 dígitos).
   - O sistema recupera a malha, população e total de eleitores aptos cadastrados.
2. **Passo 2 — Seleção do Cargo**:
   - Permite alternar entre Presidente, Governador, Senador, Deputado Federal e Estadual.
3. **Passo 3 — Consolidação e Métricas de Engajamento**:
   - **Mais Votado na Cidade**: Identificação do vencedor local, votos nominais, percentual e margem sobre o 2º colocado.
   - **Termômetro de Engajamento Cívico**:
     $$\Delta \text{Abstenção} = \% \text{Abstenção Municipal} - \% \text{Média Nacional de Abstenção}$$
     - Se $\Delta \le 0$: Indicador **Positivo** (cidade teve participação superior à média do país).
     - Se $\Delta > 0$: Indicador de **Alerta Cívico** (abstenção local superou a média nacional).
   - **Bancada com Maior Base Local**: Lista dos deputados que obtiveram maior densidade eleitoral dentro do município.

---

## 5. Regras de Exportação Visual para Redes Sociais

A plataforma permite exportar qualquer visualização do mapa em imagem PNG de alta fidelidade:

| Proporção | Resolução Exata | Canal Alvo |
| :--- | :--- | :--- |
| **Feed (4:5)** | `1080 x 1350 px` | Instagram Feed vertical otimizado, LinkedIn |
| **Quadrado (1:1)** | `1080 x 1080 px` | Feed padrão, X (antigo Twitter), Facebook |
| **Stories (9:16)** | `1080 x 1920 px` | Instagram Stories, WhatsApp Status, TikTok |

### Elementos Invariantes na Imagem Exportada:
1. **Cabeçalho**: Identidade visual "Radar do Voto", título do pleito, ano e turno.
2. **Subtítulo contextual**: Especificando os candidatos comparados ou o cargo.
3. **Legenda Divergente**: Swatches de cor com indicação da margem de vitória.
4. **Rodapé e Atribuição Oficial**:
   - Menção obrigatória: *"Dados oficiais: Tribunal Superior Eleitoral (TSE)"*.
   - Data de geração da imagem.

---

## 6. Diretrizes de Ingestão de Dados e Restrição de Disco

### Invariante Crítico de Armazenamento:
> **Restrição Técnica**: O ambiente local possui espaço limitado em disco (`< 3.0 GB` disponíveis no `/home`), enquanto o acervo completo do TSE ultrapassa `40 GB`. **É PROIBIDO armazenar datasets brutos permanentes descompactados no repositório**.

### Protocolo de Ingestão Efêmera em Streaming (`scripts/populate_database.py`):
1. **Consumo pelo Catálogo**: O script lê os metadados do pacote em `dados_tse/catalogo_tse.json`.
2. **Download Temporário**: Faz download do arquivo `.zip` diretamente para um arquivo temporário no `/tmp`.
3. **Leitura e Normalização em Stream**: Utiliza `zipfile.ZipFile` para iterar e ler os arquivos CSV linha a linha em streaming com codificação `latin-1`.
4. **Inserção em Lote (Batching)**: Agrupa registros em lotes de 5.000 itens executando `INSERT INTO ... ON CONFLICT DO UPDATE`.
5. **Exclusão Imediata**: O arquivo temporário `.zip` é **excluído imediatamente** após a inserção no banco de dados, liberando o disco para a próxima requisição.

---

## 7. Contratos da Camada de API REST (`server/api.py`)

A API local roda em `http://localhost:8000` sem dependências externas (Python Standard Library), com proxy integrado no Vite para `/api`.

### 7.1. `GET /api/health`
- **Retorno**: `200 OK`
- **Payload**:
  ```json
  { "status": "ok", "db_type": "PostgreSQL" | "SQLite" }
  ```

### 7.2. `GET /api/eleicoes`
- **Retorno**: Lista de eleições cadastradas no banco relacional ordenadas por ano decrescente.

### 7.3. `GET /api/totalizacao?ano={ano}&turno={turno}&cargo={cargo}`
- **Retorno**: Estatísticas nacionais consolidadas de participação (aptos, comparecimento, abstenção, brancos, nulos) e lista de candidatos com seus percentuais oficiais sobre votos válidos.

### 7.4. `GET /api/comparativo?ano={ano}&turno={turno}&cand_a={candA}&cand_b={candB}`
- **Retorno**: Mapa com todos os 5.564 municípios brasileiros indexados pelo código IBGE com votos de A, votos de B, percentuais locais, margem e vencedor local.

### 7.5. `GET /api/municipio/:cd_ibge`
- **Retorno**: Informações completas de uma cidade específica (eleitorado, coordenadas, candidato mais votado, comparação local de 2º turno e termômetro de engajamento relativo).

### 7.6. `GET /api/busca?q={termo}`
- **Retorno**: Resultados de busca rápida indexada por cidades e candidatos.

---

## 8. Arquitetura de Código e Padrões (Clean Code & SOLID)

1. **Single Responsibility Principle (SRP)**:
   - Componentes visuais (`AppSidebarNav`, `MapControlPanel`, `Map2D`, `TotalizationPanel`) cuidam exclusivamente de sua respectiva coluna ou área funcional.
   - Formatações de dados são delegadas ao módulo centralizado `src/utils/formatters.ts`.
   - Lógica de escalas de cor e faixas de margem reside em `src/utils/colorScales.ts`.
2. **Open/Closed Principle (OCP)**:
   - Adições de novos cargos, eleições ou formatos de exportação ocorrem sem modificar a estrutura central das páginas, apenas estendendo os enums e tipos correspondentes em `src/types/election.ts`.
3. **DRY (Don't Repeat Yourself)**:
   - Proibida duplicação de lógicas de formatação de números (`.toLocaleString('pt-BR')`), percentuais ou identificadores de candidatos padrão. Utilize sempre os utilitários centralizados.
4. **Resiliência e Fallbacks**:
   - A camada de serviços (`electionService.ts`) tenta carregar dados da API local/PostgreSQL; em caso de indisponibilidade ou execução estática, recorre com segurança aos datasets estáticos em `/public/data/`.
