import type { 
  ElectionCargo, 
  ElectionRoundData, 
  Candidate, 
  PartySummary, 
  UfResult, 
  MunicipalityResult 
} from '../types/election';
import { PARTY_COLORS } from '../types/election';

// Helper to calculate party shares
function createParty(
  partido: string, 
  eleitos: number, 
  totalEleitos: number, 
  votos: number, 
  totalVotos: number
): PartySummary {
  const meta = PARTY_COLORS[partido] || { nome: partido, cor: '#64748b', sigla: partido };
  return {
    partido,
    nomeCompleto: meta.nome,
    cor: meta.cor,
    eleitos,
    pctEleitos: Number(((eleitos / totalEleitos) * 100).toFixed(2)),
    votos,
    pctVotos: Number(((votos / totalVotos) * 100).toFixed(2))
  };
}

// ==========================================
// 1. GOVERNADOR (2022)
// ==========================================
const GOVERNADOR_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('UNIÃO', 4, 27, 13420000, 108500000),
  createParty('PT', 4, 27, 18560000, 108500000),
  createParty('PSDB', 3, 27, 11480000, 108500000),
  createParty('MDB', 3, 27, 9820000, 108500000),
  createParty('PSB', 3, 27, 8240000, 108500000),
  createParty('PL', 2, 27, 16950000, 108500000),
  createParty('REPUBLICANOS', 2, 27, 14210000, 108500000),
  createParty('PSD', 2, 27, 7650000, 108500000),
  createParty('PP', 2, 27, 2410000, 108500000),
  createParty('NOVO', 1, 27, 6094000, 108500000),
  createParty('SOLIDARIEDADE', 1, 27, 1890000, 108500000),
  createParty('PDT', 0, 27, 2340000, 108500000),
  createParty('PSOL', 0, 27, 1480000, 108500000)
];

const GOV_UFS_RAW: Record<string, { winner: string; party: string; cands: Candidate[] }> = {
  SP: {
    winner: 'Tarcísio de Freitas',
    party: 'REPUBLICANOS',
    cands: [
      { numero: '10', nome: 'Tarcísio de Freitas', nomeUrna: 'Tarcísio', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 13480643, pctValidos: 55.27, eleito: true },
      { numero: '13', nome: 'Fernando Haddad', nomeUrna: 'Fernando Haddad', partido: 'PT', cor: '#e11d48', votos: 10909371, pctValidos: 44.73 },
      { numero: '45', nome: 'Rodrigo Garcia', nomeUrna: 'Rodrigo Garcia', partido: 'PSDB', cor: '#0ea5e9', votos: 4296293, pctValidos: 18.40 },
      { numero: '30', nome: 'Vinicius Poit', nomeUrna: 'Vinicius Poit', partido: 'NOVO', cor: '#f97316', votos: 388966, pctValidos: 1.66 }
    ]
  },
  RJ: {
    winner: 'Cláudio Castro',
    party: 'PL',
    cands: [
      { numero: '22', nome: 'Cláudio Castro', nomeUrna: 'Cláudio Castro', partido: 'PL', cor: '#2563eb', votos: 4930288, pctValidos: 58.67, eleito: true },
      { numero: '40', nome: 'Marcelo Freixo', nomeUrna: 'Marcelo Freixo', partido: 'PSB', cor: '#dc2626', votos: 2300986, pctValidos: 27.38 },
      { numero: '12', nome: 'Rodrigo Neves', nomeUrna: 'Rodrigo Neves', partido: 'PDT', cor: '#ea580c', votos: 672041, pctValidos: 8.00 },
      { numero: '30', nome: 'Paulo Ganime', nomeUrna: 'Paulo Ganime', partido: 'NOVO', cor: '#f97316', votos: 446580, pctValidos: 5.31 }
    ]
  },
  MG: {
    winner: 'Romeu Zema',
    party: 'NOVO',
    cands: [
      { numero: '30', nome: 'Romeu Zema', nomeUrna: 'Romeu Zema', partido: 'NOVO', cor: '#f97316', votos: 6094136, pctValidos: 56.18, eleito: true },
      { numero: '55', nome: 'Alexandre Kalil', nomeUrna: 'Alexandre Kalil', partido: 'PSD', cor: '#d97706', votos: 3805182, pctValidos: 35.08 },
      { numero: '22', nome: 'Carlos Viana', nomeUrna: 'Carlos Viana', partido: 'PL', cor: '#2563eb', votos: 783801, pctValidos: 7.23 }
    ]
  },
  BA: {
    winner: 'Jerônimo Rodrigues',
    party: 'PT',
    cands: [
      { numero: '13', nome: 'Jerônimo Rodrigues', nomeUrna: 'Jerônimo', partido: 'PT', cor: '#e11d48', votos: 4484473, pctValidos: 52.79, eleito: true },
      { numero: '44', nome: 'ACM Neto', nomeUrna: 'ACM Neto', partido: 'UNIÃO', cor: '#4338ca', votos: 4007023, pctValidos: 47.21 },
      { numero: '22', nome: 'João Roma', nomeUrna: 'João Roma', partido: 'PL', cor: '#2563eb', votos: 738311, pctValidos: 9.08 }
    ]
  },
  RS: {
    winner: 'Eduardo Leite',
    party: 'PSDB',
    cands: [
      { numero: '45', nome: 'Eduardo Leite', nomeUrna: 'Eduardo Leite', partido: 'PSDB', cor: '#0ea5e9', votos: 3687126, pctValidos: 57.12, eleito: true },
      { numero: '22', nome: 'Onyx Lorenzoni', nomeUrna: 'Onyx Lorenzoni', partido: 'PL', cor: '#2563eb', votos: 2767786, pctValidos: 42.88 },
      { numero: '13', nome: 'Edegar Pretto', nomeUrna: 'Edegar Pretto', partido: 'PT', cor: '#e11d48', votos: 1700374, pctValidos: 26.77 }
    ]
  },
  PR: {
    winner: 'Ratinho Júnior',
    party: 'PSD',
    cands: [
      { numero: '55', nome: 'Carlos Massa Ratinho Júnior', nomeUrna: 'Ratinho Junior', partido: 'PSD', cor: '#d97706', votos: 4243292, pctValidos: 65.43, eleito: true },
      { numero: '13', nome: 'Roberto Requião', nomeUrna: 'Requião', partido: 'PT', cor: '#e11d48', votos: 1598204, pctValidos: 26.23 }
    ]
  },
  PE: {
    winner: 'Raquel Lyra',
    party: 'PSDB',
    cands: [
      { numero: '45', nome: 'Raquel Lyra', nomeUrna: 'Raquel Lyra', partido: 'PSDB', cor: '#0ea5e9', votos: 3113415, pctValidos: 58.70, eleito: true },
      { numero: '77', nome: 'Marília Arraes', nomeUrna: 'Marília Arraes', partido: 'SOLIDARIEDADE', cor: '#f59e0b', votos: 2190264, pctValidos: 41.30 }
    ]
  },
  CE: {
    winner: 'Elmano de Freitas',
    party: 'PT',
    cands: [
      { numero: '13', nome: 'Elmano de Freitas', nomeUrna: 'Elmano de Freitas', partido: 'PT', cor: '#e11d48', votos: 2808300, pctValidos: 54.02, eleito: true },
      { numero: '44', nome: 'Capitão Wagner', nomeUrna: 'Capitão Wagner', partido: 'UNIÃO', cor: '#4338ca', votos: 1649213, pctValidos: 31.72 },
      { numero: '12', nome: 'Roberto Cláudio', nomeUrna: 'Roberto Cláudio', partido: 'PDT', cor: '#ea580c', votos: 734552, pctValidos: 14.14 }
    ]
  },
  SC: {
    winner: 'Jorginho Mello',
    party: 'PL',
    cands: [
      { numero: '22', nome: 'Jorginho Mello', nomeUrna: 'Jorginho Mello', partido: 'PL', cor: '#2563eb', votos: 2983949, pctValidos: 70.69, eleito: true },
      { numero: '13', nome: 'Décio Lima', nomeUrna: 'Décio Lima', partido: 'PT', cor: '#e11d48', votos: 1237016, pctValidos: 29.31 }
    ]
  },
  GO: {
    winner: 'Ronaldo Caiado',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Ronaldo Caiado', nomeUrna: 'Ronaldo Caiado', partido: 'UNIÃO', cor: '#4338ca', votos: 1806892, pctValidos: 51.80, eleito: true },
      { numero: '51', nome: 'Gustavo Mendanha', nomeUrna: 'Gustavo Mendanha', partido: 'PATRIOTA', cor: '#334155', votos: 879416, pctValidos: 25.20 },
      { numero: '22', nome: 'Major Vitor Hugo', nomeUrna: 'Major Vitor Hugo', partido: 'PL', cor: '#2563eb', votos: 516579, pctValidos: 14.81 }
    ]
  },
  PA: {
    winner: 'Helder Barbalho',
    party: 'MDB',
    cands: [
      { numero: '15', nome: 'Helder Barbalho', nomeUrna: 'Helder Barbalho', partido: 'MDB', cor: '#059669', votos: 3117276, pctValidos: 70.41, eleito: true },
      { numero: '22', nome: 'Zequinha Marinho', nomeUrna: 'Zequinha Marinho', partido: 'PL', cor: '#2563eb', votos: 1201079, pctValidos: 27.13 }
    ]
  },
  MA: {
    winner: 'Carlos Brandão',
    party: 'PSB',
    cands: [
      { numero: '40', nome: 'Carlos Brandão', nomeUrna: 'Carlos Brandão', partido: 'PSB', cor: '#dc2626', votos: 1769187, pctValidos: 51.29, eleito: true },
      { numero: '20', nome: 'Lahesio Bonfim', nomeUrna: 'Dr. Lahesio Bonfim', partido: 'PSC', cor: '#16a34a', votos: 857744, pctValidos: 24.87 },
      { numero: '12', nome: 'Weverton Rocha', nomeUrna: 'Weverton', partido: 'PDT', cor: '#ea580c', votos: 714352, pctValidos: 20.71 }
    ]
  },
  PB: {
    winner: 'João Azevêdo',
    party: 'PSB',
    cands: [
      { numero: '40', nome: 'João Azevêdo', nomeUrna: 'João Azevêdo', partido: 'PSB', cor: '#dc2626', votos: 1221904, pctValidos: 52.51, eleito: true },
      { numero: '45', nome: 'Pedro Cunha Lima', nomeUrna: 'Pedro Cunha Lima', partido: 'PSDB', cor: '#0ea5e9', votos: 1104963, pctValidos: 47.49 }
    ]
  },
  ES: {
    winner: 'Renato Casagrande',
    party: 'PSB',
    cands: [
      { numero: '40', nome: 'Renato Casagrande', nomeUrna: 'Renato Casagrande', partido: 'PSB', cor: '#dc2626', votos: 1171288, pctValidos: 53.80, eleito: true },
      { numero: '22', nome: 'Carlos Manato', nomeUrna: 'Manato', partido: 'PL', cor: '#2563eb', votos: 1006021, pctValidos: 46.20 }
    ]
  },
  AM: {
    winner: 'Wilson Lima',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Wilson Lima', nomeUrna: 'Wilson Lima', partido: 'UNIÃO', cor: '#4338ca', votos: 1039192, pctValidos: 56.65, eleito: true },
      { numero: '15', nome: 'Eduardo Braga', nomeUrna: 'Eduardo Braga', partido: 'MDB', cor: '#059669', votos: 795098, pctValidos: 43.35 }
    ]
  },
  RN: {
    winner: 'Fátima Bezerra',
    party: 'PT',
    cands: [
      { numero: '13', nome: 'Fátima Bezerra', nomeUrna: 'Fátima Bezerra', partido: 'PT', cor: '#e11d48', votos: 1066496, pctValidos: 58.31, eleito: true },
      { numero: '77', nome: 'Fábio Dantas', nomeUrna: 'Fábio Dantas', partido: 'SOLIDARIEDADE', cor: '#f59e0b', votos: 406461, pctValidos: 22.22 }
    ]
  },
  AL: {
    winner: 'Paulo Dantas',
    party: 'MDB',
    cands: [
      { numero: '15', nome: 'Paulo Dantas', nomeUrna: 'Paulo Dantas', partido: 'MDB', cor: '#059669', votos: 832723, pctValidos: 52.33, eleito: true },
      { numero: '44', nome: 'Rodrigo Cunha', nomeUrna: 'Rodrigo Cunha', partido: 'UNIÃO', cor: '#4338ca', votos: 758779, pctValidos: 47.67 }
    ]
  },
  PI: {
    winner: 'Rafael Fonteles',
    party: 'PT',
    cands: [
      { numero: '13', nome: 'Rafael Fonteles', nomeUrna: 'Rafael Fonteles', partido: 'PT', cor: '#e11d48', votos: 1115139, pctValidos: 57.17, eleito: true },
      { numero: '44', nome: 'Sílvio Mendes', nomeUrna: 'Sílvio Mendes', partido: 'UNIÃO', cor: '#4338ca', votos: 811806, pctValidos: 41.62 }
    ]
  },
  MT: {
    winner: 'Mauro Mendes',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Mauro Mendes', nomeUrna: 'Mauro Mendes', partido: 'UNIÃO', cor: '#4338ca', votos: 1114549, pctValidos: 68.45, eleito: true },
      { numero: '43', nome: 'Márcia Pinheiro', nomeUrna: 'Márcia Pinheiro', partido: 'PV', cor: '#22c55e', votos: 271929, pctValidos: 16.70 }
    ]
  },
  MS: {
    winner: 'Eduardo Riedel',
    party: 'PSDB',
    cands: [
      { numero: '45', nome: 'Eduardo Riedel', nomeUrna: 'Eduardo Riedel', partido: 'PSDB', cor: '#0ea5e9', votos: 808210, pctValidos: 56.90, eleito: true },
      { numero: '28', nome: 'Renan Contar', nomeUrna: 'Capitão Contar', partido: 'PRTB', cor: '#1e40af', votos: 612113, pctValidos: 43.10 }
    ]
  },
  DF: {
    winner: 'Ibaneis Rocha',
    party: 'MDB',
    cands: [
      { numero: '15', nome: 'Ibaneis Rocha', nomeUrna: 'Ibaneis Rocha', partido: 'MDB', cor: '#059669', votos: 832638, pctValidos: 50.30, eleito: true },
      { numero: '43', nome: 'Leandro Grass', nomeUrna: 'Leandro Grass', partido: 'PV', cor: '#22c55e', votos: 434587, pctValidos: 26.25 }
    ]
  },
  SE: {
    winner: 'Fábio Mitidieri',
    party: 'PSD',
    cands: [
      { numero: '55', nome: 'Fábio Mitidieri', nomeUrna: 'Fábio', partido: 'PSD', cor: '#d97706', votos: 623851, pctValidos: 51.70, eleito: true },
      { numero: '13', nome: 'Rogério Carvalho', nomeUrna: 'Rogério Carvalho', partido: 'PT', cor: '#e11d48', votos: 582772, pctValidos: 48.30 }
    ]
  },
  RO: {
    winner: 'Marcos Rocha',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Marcos Rocha', nomeUrna: 'Coronel Marcos Rocha', partido: 'UNIÃO', cor: '#4338ca', votos: 458370, pctValidos: 52.47, eleito: true },
      { numero: '22', nome: 'Marcos Rogério', nomeUrna: 'Marcos Rogério', partido: 'PL', cor: '#2563eb', votos: 415163, pctValidos: 47.53 }
    ]
  },
  TO: {
    winner: 'Wanderlei Barbosa',
    party: 'REPUBLICANOS',
    cands: [
      { numero: '10', nome: 'Wanderlei Barbosa', nomeUrna: 'Wanderlei Barbosa', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 481496, pctValidos: 58.14, eleito: true },
      { numero: '22', nome: 'Ronaldo Dimas', nomeUrna: 'Ronaldo Dimas', partido: 'PL', cor: '#2563eb', votos: 186361, pctValidos: 22.50 }
    ]
  },
  AC: {
    winner: 'Gladson Cameli',
    party: 'PP',
    cands: [
      { numero: '11', nome: 'Gladson Cameli', nomeUrna: 'Gladson Cameli', partido: 'PP', cor: '#0891b2', votos: 242100, pctValidos: 56.75, eleito: true },
      { numero: '13', nome: 'Jorge Viana', nomeUrna: 'Jorge Viana', partido: 'PT', cor: '#e11d48', votos: 103265, pctValidos: 24.21 }
    ]
  },
  AP: {
    winner: 'Clécio Luís',
    party: 'SOLIDARIEDADE',
    cands: [
      { numero: '77', nome: 'Clécio Luís', nomeUrna: 'Clécio', partido: 'SOLIDARIEDADE', cor: '#f59e0b', votos: 222168, pctValidos: 53.69, eleito: true },
      { numero: '55', nome: 'Jaime Nunes', nomeUrna: 'Jaime Nunes', partido: 'PSD', cor: '#d97706', votos: 176208, pctValidos: 42.58 }
    ]
  },
  RR: {
    winner: 'Antonio Denarium',
    party: 'PP',
    cands: [
      { numero: '11', nome: 'Antonio Denarium', nomeUrna: 'Antonio Denarium', partido: 'PP', cor: '#0891b2', votos: 163654, pctValidos: 56.47, eleito: true },
      { numero: '15', nome: 'Teresa Surita', nomeUrna: 'Teresa Surita', partido: 'MDB', cor: '#059669', votos: 119854, pctValidos: 41.34 }
    ]
  }
};

// ==========================================
// 2. SENADOR (2022)
// ==========================================
const SENADOR_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('PL', 8, 27, 25200000, 99800000),
  createParty('UNIÃO', 5, 27, 14200000, 99800000),
  createParty('PT', 4, 27, 12600000, 99800000),
  createParty('PP', 3, 27, 8900000, 99800000),
  createParty('PSD', 2, 27, 11400000, 99800000),
  createParty('REPUBLICANOS', 2, 27, 7200000, 99800000),
  createParty('PSB', 1, 27, 6100000, 99800000),
  createParty('PSC', 1, 27, 4300000, 99800000),
  createParty('PODEMOS', 1, 27, 3600000, 99800000),
  createParty('MDB', 0, 27, 3200000, 99800000),
  createParty('PSDB', 0, 27, 1800000, 99800000),
  createParty('PDT', 0, 27, 1300000, 99800000)
];

const SEN_UFS_RAW: Record<string, { winner: string; party: string; cands: Candidate[] }> = {
  SP: {
    winner: 'Marcos Pontes',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Marcos Pontes', nomeUrna: 'Astronauta Marcos Pontes', partido: 'PL', cor: '#2563eb', votos: 10714913, pctValidos: 49.68, eleito: true },
      { numero: '400', nome: 'Márcio França', nomeUrna: 'Márcio França', partido: 'PSB', cor: '#dc2626', votos: 7711477, pctValidos: 35.78 },
      { numero: '155', nome: 'Edson Aparecido', nomeUrna: 'Edson Aparecido', partido: 'MDB', cor: '#059669', votos: 1655227, pctValidos: 7.67 }
    ]
  },
  RJ: {
    winner: 'Romário',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Romário de Souza Faria', nomeUrna: 'Romário', partido: 'PL', cor: '#2563eb', votos: 2384340, pctValidos: 29.19, eleito: true },
      { numero: '400', nome: 'Alessandro Molon', nomeUrna: 'Alessandro Molon', partido: 'PSB', cor: '#dc2626', votos: 1731786, pctValidos: 21.20 },
      { numero: '142', nome: 'Daniel Silveira', nomeUrna: 'Daniel Silveira', partido: 'PTB', cor: '#475569', votos: 1566352, pctValidos: 19.18 },
      { numero: '444', nome: 'Clarissa Garotinho', nomeUrna: 'Clarissa Garotinho', partido: 'UNIÃO', cor: '#4338ca', votos: 1145413, pctValidos: 14.02 }
    ]
  },
  MG: {
    winner: 'Cleitinho',
    party: 'PSC',
    cands: [
      { numero: '200', nome: 'Cleiton Gontijo', nomeUrna: 'Cleitinho', partido: 'PSC', cor: '#16a34a', votos: 4268193, pctValidos: 41.52, eleito: true },
      { numero: '555', nome: 'Alexandre Silveira', nomeUrna: 'Alexandre Silveira', partido: 'PSD', cor: '#d97706', votos: 3679392, pctValidos: 35.79 },
      { numero: '111', nome: 'Marcelo Aro', nomeUrna: 'Marcelo Aro', partido: 'PP', cor: '#0891b2', votos: 2025001, pctValidos: 19.70 }
    ]
  },
  PR: {
    winner: 'Sergio Moro',
    party: 'UNIÃO',
    cands: [
      { numero: '444', nome: 'Sergio Moro', nomeUrna: 'Sergio Moro', partido: 'UNIÃO', cor: '#4338ca', votos: 1953188, pctValidos: 33.50, eleito: true },
      { numero: '222', nome: 'Paulo Martins', nomeUrna: 'Paulo Martins', partido: 'PL', cor: '#2563eb', votos: 1697964, pctValidos: 29.12 },
      { numero: '190', nome: 'Alvaro Dias', nomeUrna: 'Alvaro Dias', partido: 'PODEMOS', cor: '#7c3aed', votos: 1396089, pctValidos: 23.94 }
    ]
  },
  RS: {
    winner: 'Hamilton Mourão',
    party: 'REPUBLICANOS',
    cands: [
      { numero: '100', nome: 'Hamilton Mourão', nomeUrna: 'General Mourão', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 2593294, pctValidos: 34.44, eleito: true },
      { numero: '133', nome: 'Olívio Dutra', nomeUrna: 'Olívio Dutra', partido: 'PT', cor: '#e11d48', votos: 2848545, pctValidos: 37.85 },
      { numero: '555', nome: 'Ana Amélia Lemos', nomeUrna: 'Ana Amélia', partido: 'PSD', cor: '#d97706', votos: 1238466, pctValidos: 16.44 }
    ]
  },
  BA: {
    winner: 'Otto Alencar',
    party: 'PSD',
    cands: [
      { numero: '555', nome: 'Otto Alencar', nomeUrna: 'Otto Alencar', partido: 'PSD', cor: '#d97706', votos: 4218333, pctValidos: 58.29, eleito: true },
      { numero: '111', nome: 'Cacá Leão', nomeUrna: 'Cacá Leão', partido: 'PP', cor: '#0891b2', votos: 1826015, pctValidos: 25.24 },
      { numero: '222', nome: 'Doutora Raissa', nomeUrna: 'Dra. Raissa Soares', partido: 'PL', cor: '#2563eb', votos: 1057911, pctValidos: 14.65 }
    ]
  },
  CE: {
    winner: 'Camilo Santana',
    party: 'PT',
    cands: [
      { numero: '131', nome: 'Camilo Santana', nomeUrna: 'Camilo Santana', partido: 'PT', cor: '#e11d48', votos: 3388874, pctValidos: 69.80, eleito: true },
      { numero: '700', nome: 'Kamila Cardoso', nomeUrna: 'Kamila Cardoso', partido: 'AVANTE', cor: '#06b6d4', votos: 933052, pctValidos: 19.23 }
    ]
  },
  MA: {
    winner: 'Flávio Dino',
    party: 'PSB',
    cands: [
      { numero: '400', nome: 'Flávio Dino', nomeUrna: 'Flávio Dino', partido: 'PSB', cor: '#dc2626', votos: 2125834, pctValidos: 62.41, eleito: true },
      { numero: '141', nome: 'Roberto Rocha', nomeUrna: 'Roberto Rocha', partido: 'PTB', cor: '#475569', votos: 1200234, pctValidos: 35.25 }
    ]
  },
  DF: {
    winner: 'Damares Alves',
    party: 'REPUBLICANOS',
    cands: [
      { numero: '100', nome: 'Damares Alves', nomeUrna: 'Damares Alves', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 714552, pctValidos: 44.98, eleito: true },
      { numero: '222', nome: 'Flávia Arruda', nomeUrna: 'Flávia Arruda', partido: 'PL', cor: '#2563eb', votos: 429996, pctValidos: 27.05 },
      { numero: '400', nome: 'Rosilene Corrêa', nomeUrna: 'Professora Rosilene', partido: 'PT', cor: '#e11d48', votos: 356198, pctValidos: 22.42 }
    ]
  },
  SC: {
    winner: 'Jorge Seif',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Jorge Seif', nomeUrna: 'Jorge Seif', partido: 'PL', cor: '#2563eb', votos: 1484110, pctValidos: 39.79, eleito: true },
      { numero: '555', nome: 'Raimundo Colombo', nomeUrna: 'Raimundo Colombo', partido: 'PSD', cor: '#d97706', votos: 608691, pctValidos: 16.30 }
    ]
  },
  PE: {
    winner: 'Teresa Leitão',
    party: 'PT',
    cands: [
      { numero: '130', nome: 'Teresa Leitão', nomeUrna: 'Teresa Leitão', partido: 'PT', cor: '#e11d48', votos: 2061276, pctValidos: 46.12, eleito: true },
      { numero: '222', nome: 'Gilson Machado', nomeUrna: 'Gilson Machado', partido: 'PL', cor: '#2563eb', votos: 1520390, pctValidos: 34.00 }
    ]
  },
  MS: {
    winner: 'Tereza Cristina',
    party: 'PP',
    cands: [
      { numero: '111', nome: 'Tereza Cristina', nomeUrna: 'Tereza Cristina', partido: 'PP', cor: '#0891b2', votos: 829149, pctValidos: 60.85, eleito: true },
      { numero: '444', nome: 'Mandetta', nomeUrna: 'Luiz Henrique Mandetta', partido: 'UNIÃO', cor: '#4338ca', votos: 206093, pctValidos: 15.12 }
    ]
  },
  MT: {
    winner: 'Wellington Fagundes',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Wellington Fagundes', nomeUrna: 'Wellington Fagundes', partido: 'PL', cor: '#2563eb', votos: 825229, pctValidos: 63.54, eleito: true }
    ]
  },
  GO: {
    winner: 'Wilder Morais',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Wilder Morais', nomeUrna: 'Wilder Morais', partido: 'PL', cor: '#2563eb', votos: 799022, pctValidos: 25.21, eleito: true },
      { numero: '444', nome: 'Delegado Waldir', nomeUrna: 'Delegado Waldir', partido: 'UNIÃO', cor: '#4338ca', votos: 539610, pctValidos: 17.04 }
    ]
  },
  PA: {
    winner: 'Beto Faro',
    party: 'PT',
    cands: [
      { numero: '133', nome: 'Beto Faro', nomeUrna: 'Beto Faro', partido: 'PT', cor: '#e11d48', votos: 1781194, pctValidos: 42.24, eleito: true },
      { numero: '222', nome: 'Mario Couto', nomeUrna: 'Mario Couto', partido: 'PL', cor: '#2563eb', votos: 1485453, pctValidos: 35.47 }
    ]
  },
  ES: {
    winner: 'Magno Malta',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Magno Malta', nomeUrna: 'Magno Malta', partido: 'PL', cor: '#2563eb', votos: 821172, pctValidos: 41.95, eleito: true },
      { numero: '155', nome: 'Rose de Freitas', nomeUrna: 'Rose de Freitas', partido: 'MDB', cor: '#059669', votos: 747104, pctValidos: 38.17 }
    ]
  },
  PI: {
    winner: 'Wellington Dias',
    party: 'PT',
    cands: [
      { numero: '131', nome: 'Wellington Dias', nomeUrna: 'Wellington Dias', partido: 'PT', cor: '#e11d48', votos: 962194, pctValidos: 51.34, eleito: true },
      { numero: '111', nome: 'Joel Rodrigues', nomeUrna: 'Joel Rodrigues', partido: 'PP', cor: '#0891b2', votos: 892011, pctValidos: 47.60 }
    ]
  },
  RN: {
    winner: 'Rogério Marinho',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Rogério Marinho', nomeUrna: 'Rogério Marinho', partido: 'PL', cor: '#2563eb', votos: 708351, pctValidos: 41.85, eleito: true },
      { numero: '123', nome: 'Carlos Eduardo', nomeUrna: 'Carlos Eduardo', partido: 'PDT', cor: '#ea580c', votos: 565232, pctValidos: 33.40 }
    ]
  },
  PB: {
    winner: 'Efraim Filho',
    party: 'UNIÃO',
    cands: [
      { numero: '444', nome: 'Efraim Filho', nomeUrna: 'Efraim Filho', partido: 'UNIÃO', cor: '#4338ca', votos: 617477, pctValidos: 30.82, eleito: true },
      { numero: '400', nome: 'Pollyanna Dutra', nomeUrna: 'Pollyanna', partido: 'PSB', cor: '#dc2626', votos: 576916, pctValidos: 28.79 }
    ]
  },
  AL: {
    winner: 'Renan Filho',
    party: 'MDB',
    cands: [
      { numero: '151', nome: 'Renan Filho', nomeUrna: 'Renan Filho', partido: 'MDB', cor: '#059669', votos: 845988, pctValidos: 56.92, eleito: true },
      { numero: '111', nome: 'Davi Davino Filho', nomeUrna: 'Davi Davino Filho', partido: 'PP', cor: '#0891b2', votos: 627394, pctValidos: 42.22 }
    ]
  },
  AM: {
    winner: 'Omar Aziz',
    party: 'PSD',
    cands: [
      { numero: '555', nome: 'Omar Aziz', nomeUrna: 'Omar Aziz', partido: 'PSD', cor: '#d97706', votos: 784007, pctValidos: 41.42, eleito: true },
      { numero: '222', nome: 'Coronel Menezes', nomeUrna: 'Coronel Menezes', partido: 'PL', cor: '#2563eb', votos: 737875, pctValidos: 38.98 }
    ]
  },
  SE: {
    winner: 'Laércio Oliveira',
    party: 'PP',
    cands: [
      { numero: '111', nome: 'Laércio Oliveira', nomeUrna: 'Laércio Oliveira', partido: 'PP', cor: '#0891b2', votos: 310300, pctValidos: 28.57, eleito: true },
      { numero: '222', nome: 'Valmir de Franciscano', nomeUrna: 'Valmir de Franciscano', partido: 'PL', cor: '#2563eb', votos: 271500, pctValidos: 25.00 }
    ]
  },
  RO: {
    winner: 'Jaime Bagattoli',
    party: 'PL',
    cands: [
      { numero: '222', nome: 'Jaime Bagattoli', nomeUrna: 'Jaime Bagattoli', partido: 'PL', cor: '#2563eb', votos: 293488, pctValidos: 35.80, eleito: true },
      { numero: '100', nome: 'Mariana Carvalho', nomeUrna: 'Mariana Carvalho', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 263559, pctValidos: 32.14 }
    ]
  },
  TO: {
    winner: 'Professora Dorinha',
    party: 'UNIÃO',
    cands: [
      { numero: '444', nome: 'Professora Dorinha', nomeUrna: 'Professora Dorinha', partido: 'UNIÃO', cor: '#4338ca', votos: 395408, pctValidos: 50.42, eleito: true },
      { numero: '111', nome: 'Kátia Abreu', nomeUrna: 'Kátia Abreu', partido: 'PP', cor: '#0891b2', votos: 145104, pctValidos: 18.50 }
    ]
  },
  AC: {
    winner: 'Alan Rick',
    party: 'UNIÃO',
    cands: [
      { numero: '444', nome: 'Alan Rick', nomeUrna: 'Alan Rick', partido: 'UNIÃO', cor: '#4338ca', votos: 154199, pctValidos: 37.46, eleito: true },
      { numero: '190', nome: 'Ney Amorim', nomeUrna: 'Ney Amorim', partido: 'PODEMOS', cor: '#7c3aed', votos: 83567, pctValidos: 20.30 }
    ]
  },
  AP: {
    winner: 'Davi Alcolumbre',
    party: 'UNIÃO',
    cands: [
      { numero: '444', nome: 'Davi Alcolumbre', nomeUrna: 'Davi Alcolumbre', partido: 'UNIÃO', cor: '#4338ca', votos: 196743, pctValidos: 47.88, eleito: true },
      { numero: '155', nome: 'Rayssa Furlan', nomeUrna: 'Rayssa Furlan', partido: 'MDB', cor: '#059669', votos: 174611, pctValidos: 42.52 }
    ]
  },
  RR: {
    winner: 'Hiran Gonçalves',
    party: 'PP',
    cands: [
      { numero: '111', nome: 'Hiran Gonçalves', nomeUrna: 'Dr. Hiran', partido: 'PP', cor: '#0891b2', votos: 118856, pctValidos: 46.43, eleito: true },
      { numero: '155', nome: 'Romero Jucá', nomeUrna: 'Romero Jucá', partido: 'MDB', cor: '#059669', votos: 91464, pctValidos: 35.75 }
    ]
  }
};

// ==========================================
// 3. DEPUTADO FEDERAL (2022)
// ==========================================
const DEP_FED_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('PL', 99, 513, 18232000, 109100000),
  createParty('PT', 80, 513, 15340000, 109100000),
  createParty('UNIÃO', 59, 513, 10280000, 109100000),
  createParty('PP', 47, 513, 8790000, 109100000),
  createParty('MDB', 42, 513, 7910000, 109100000),
  createParty('PSD', 42, 513, 8300000, 109100000),
  createParty('REPUBLICANOS', 41, 513, 7610000, 109100000),
  createParty('PSDB', 18, 513, 4900000, 109100000),
  createParty('PDT', 17, 513, 3820000, 109100000),
  createParty('PSB', 14, 513, 4200000, 109100000),
  createParty('PSOL', 14, 513, 4650000, 109100000),
  createParty('PODEMOS', 12, 513, 3610000, 109100000),
  createParty('AVANTE', 7, 513, 2190000, 109100000),
  createParty('PSC', 6, 513, 1940000, 109100000),
  createParty('SOLIDARIEDADE', 4, 513, 1700000, 109100000),
  createParty('PATRIOTA', 4, 513, 1520000, 109100000),
  createParty('PROS', 3, 513, 1050000, 109100000),
  createParty('NOVO', 3, 513, 1350000, 109100000),
  createParty('PTB', 1, 513, 1420000, 109100000)
];

// Plurality parties for Federal Deputies per state
const DEP_FED_UFS_MAP: Record<string, { winnerParty: string; topCands: Candidate[] }> = {
  SP: {
    winnerParty: 'PL',
    topCands: [
      { numero: '5010', nome: 'Guilherme Boulos', nomeUrna: 'Guilherme Boulos', partido: 'PSOL', cor: '#eab308', votos: 1001472, pctValidos: 4.22, eleito: true },
      { numero: '2222', nome: 'Carla Zambelli', nomeUrna: 'Carla Zambelli', partido: 'PL', cor: '#2563eb', votos: 946244, pctValidos: 3.99, eleito: true },
      { numero: '2200', nome: 'Eduardo Bolsonaro', nomeUrna: 'Eduardo Bolsonaro', partido: 'PL', cor: '#2563eb', votos: 741701, pctValidos: 3.13, eleito: true },
      { numero: '2211', nome: 'Ricardo Salles', nomeUrna: 'Ricardo Salles', partido: 'PL', cor: '#2563eb', votos: 640918, pctValidos: 2.70, eleito: true },
      { numero: '1111', nome: 'Delegado Bruno Lima', nomeUrna: 'Delegado Bruno Lima', partido: 'PP', cor: '#0891b2', votos: 461217, pctValidos: 1.94, eleito: true },
      { numero: '4040', nome: 'Tabata Amaral', nomeUrna: 'Tabata Amaral', partido: 'PSB', cor: '#dc2626', votos: 337873, pctValidos: 1.42, eleito: true },
      { numero: '1010', nome: 'Celso Russomanno', nomeUrna: 'Celso Russomanno', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 305520, pctValidos: 1.29, eleito: true },
      { numero: '4444', nome: 'Kim Kataguiri', nomeUrna: 'Kim Kataguiri', partido: 'UNIÃO', cor: '#4338ca', votos: 295460, pctValidos: 1.25, eleito: true }
    ]
  },
  MG: {
    winnerParty: 'PL',
    topCands: [
      { numero: '2222', nome: 'Nikolas Ferreira', nomeUrna: 'Nikolas Ferreira', partido: 'PL', cor: '#2563eb', votos: 1492497, pctValidos: 13.32, eleito: true },
      { numero: '7070', nome: 'André Janones', nomeUrna: 'André Janones', partido: 'AVANTE', cor: '#06b6d4', votos: 238967, pctValidos: 2.13, eleito: true },
      { numero: '1212', nome: 'Duda Salabert', nomeUrna: 'Duda Salabert', partido: 'PDT', cor: '#ea580c', votos: 208332, pctValidos: 1.86, eleito: true },
      { numero: '1313', nome: 'Reginaldo Lopes', nomeUrna: 'Reginaldo Lopes', partido: 'PT', cor: '#e11d48', votos: 207675, pctValidos: 1.85, eleito: true }
    ]
  },
  RJ: {
    winnerParty: 'PL',
    topCands: [
      { numero: '4444', nome: 'Daniela do Waguinho', nomeUrna: 'Daniela do Waguinho', partido: 'UNIÃO', cor: '#4338ca', votos: 213706, pctValidos: 2.47, eleito: true },
      { numero: '2222', nome: 'General Pazuello', nomeUrna: 'General Pazuello', partido: 'PL', cor: '#2563eb', votos: 205324, pctValidos: 2.37, eleito: true },
      { numero: '5050', nome: 'Talíria Petrone', nomeUrna: 'Talíria Petrone', partido: 'PSOL', cor: '#eab308', votos: 198548, pctValidos: 2.29, eleito: true },
      { numero: '1111', nome: 'Doutor Luizinho', nomeUrna: 'Dr. Luizinho', partido: 'PP', cor: '#0891b2', votos: 190071, pctValidos: 2.20, eleito: true }
    ]
  },
  BA: {
    winnerParty: 'PT',
    topCands: [
      { numero: '5555', nome: 'Otto Alencar Filho', nomeUrna: 'Otto Filho', partido: 'PSD', cor: '#d97706', votos: 200909, pctValidos: 2.52, eleito: true },
      { numero: '4444', nome: 'Elmar Nascimento', nomeUrna: 'Elmar Nascimento', partido: 'UNIÃO', cor: '#4338ca', votos: 175439, pctValidos: 2.20, eleito: true },
      { numero: '1313', nome: 'Jorge Solla', nomeUrna: 'Jorge Solla', partido: 'PT', cor: '#e11d48', votos: 128960, pctValidos: 1.62, eleito: true }
    ]
  },
  RS: {
    winnerParty: 'PL',
    topCands: [
      { numero: '1010', nome: 'Luciano Zucco', nomeUrna: 'Tenente Coronel Zucco', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 259023, pctValidos: 4.18, eleito: true },
      { numero: '3030', nome: 'Marcel van Hattem', nomeUrna: 'Marcel van Hattem', partido: 'NOVO', cor: '#f97316', votos: 256913, pctValidos: 4.15, eleito: true },
      { numero: '1313', nome: 'Paulo Pimenta', nomeUrna: 'Paulo Pimenta', partido: 'PT', cor: '#e11d48', votos: 204093, pctValidos: 3.30, eleito: true }
    ]
  },
  PR: {
    winnerParty: 'PSD',
    topCands: [
      { numero: '1111', nome: 'Pedro Lupion', nomeUrna: 'Pedro Lupion', partido: 'PP', cor: '#0891b2', votos: 294000, pctValidos: 4.80, eleito: true },
      { numero: '1313', nome: 'Gleisi Hoffmann', nomeUrna: 'Gleisi Hoffmann', partido: 'PT', cor: '#e11d48', votos: 261247, pctValidos: 4.26, eleito: true },
      { numero: '2222', nome: 'Filipe Barros', nomeUrna: 'Filipe Barros', partido: 'PL', cor: '#2563eb', votos: 249507, pctValidos: 4.07, eleito: true }
    ]
  },
  PE: {
    winnerParty: 'PSB',
    topCands: [
      { numero: '2222', nome: 'André Ferreira', nomeUrna: 'André Ferreira', partido: 'PL', cor: '#2563eb', votos: 273267, pctValidos: 5.48, eleito: true },
      { numero: '1111', nome: 'Clarissa Tércio', nomeUrna: 'Clarissa Tércio', partido: 'PP', cor: '#0891b2', votos: 240511, pctValidos: 4.82, eleito: true },
      { numero: '4040', nome: 'Pedro Campos', nomeUrna: 'Pedro Campos', partido: 'PSB', cor: '#dc2626', votos: 172526, pctValidos: 3.46, eleito: true }
    ]
  },
  CE: {
    winnerParty: 'PT',
    topCands: [
      { numero: '2222', nome: 'André Fernandes', nomeUrna: 'André Fernandes', partido: 'PL', cor: '#2563eb', votos: 229509, pctValidos: 4.47, eleito: true },
      { numero: '4040', nome: 'Fernanda Pessoa', nomeUrna: 'Fernanda Pessoa', partido: 'UNIÃO', cor: '#4338ca', votos: 121469, pctValidos: 2.37, eleito: true },
      { numero: '1313', nome: 'José Guimarães', nomeUrna: 'José Guimarães', partido: 'PT', cor: '#e11d48', votos: 212236, pctValidos: 4.14, eleito: true }
    ]
  },
  SC: {
    winnerParty: 'PL',
    topCands: [
      { numero: '2222', nome: 'Carol De Toni', nomeUrna: 'Carol De Toni', partido: 'PL', cor: '#2563eb', votos: 227632, pctValidos: 5.72, eleito: true },
      { numero: '2211', nome: 'Professor Zé Trovão', nomeUrna: 'Zé Trovão', partido: 'PL', cor: '#2563eb', votos: 130583, pctValidos: 3.28, eleito: true },
      { numero: '1313', nome: 'Ana Paula Lima', nomeUrna: 'Ana Paula Lima', partido: 'PT', cor: '#e11d48', votos: 148781, pctValidos: 3.74, eleito: true }
    ]
  },
  GO: {
    winnerParty: 'UNIÃO',
    topCands: [
      { numero: '1010', nome: 'Silvye Alves', nomeUrna: 'Silvye Alves', partido: 'UNIÃO', cor: '#4338ca', votos: 254653, pctValidos: 7.39, eleito: true },
      { numero: '2222', nome: 'Gustavo Gayer', nomeUrna: 'Gustavo Gayer', partido: 'PL', cor: '#2563eb', votos: 200586, pctValidos: 5.82, eleito: true }
    ]
  }
};

// ==========================================
// 4. DEPUTADO ESTADUAL (2022)
// ==========================================
const DEP_EST_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('PL', 149, 1059, 15820000, 107400000),
  createParty('PT', 133, 1059, 14200000, 107400000),
  createParty('UNIÃO', 102, 1059, 10450000, 107400000),
  createParty('MDB', 96, 1059, 9820000, 107400000),
  createParty('PP', 90, 1059, 9210000, 107400000),
  createParty('PSD', 87, 1059, 9150000, 107400000),
  createParty('REPUBLICANOS', 76, 1059, 7920000, 107400000),
  createParty('PSDB', 54, 1059, 5840000, 107400000),
  createParty('PSB', 54, 1059, 5620000, 107400000),
  createParty('PDT', 43, 1059, 4480000, 107400000),
  createParty('PODEMOS', 36, 1059, 3810000, 107400000),
  createParty('PSOL', 22, 1059, 3120000, 107400000),
  createParty('AVANTE', 20, 1059, 2180000, 107400000),
  createParty('SOLIDARIEDADE', 19, 1059, 1980000, 107400000),
  createParty('PSC', 18, 1059, 1850000, 107400000)
];

// ==========================================
// 5. PREFEITO (Eleições Municipais Gerais)
// ==========================================
const PREFEITO_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('MDB', 784, 5568, 10980000, 88500000),
  createParty('PP', 685, 5568, 9150000, 88500000),
  createParty('PSD', 654, 5568, 10620000, 88500000),
  createParty('PSDB', 520, 5568, 8450000, 88500000),
  createParty('UNIÃO', 560, 5568, 9800000, 88500000),
  createParty('PL', 345, 5568, 5620000, 88500000),
  createParty('PDT', 314, 5568, 4750000, 88500000),
  createParty('PSB', 252, 5568, 4310000, 88500000),
  createParty('REPUBLICANOS', 211, 5568, 4890000, 88500000),
  createParty('PT', 183, 5568, 6950000, 88500000),
  createParty('CIDADANIA', 140, 5568, 2300000, 88500000),
  createParty('PODEMOS', 102, 5568, 2150000, 88500000),
  createParty('AVANTE', 82, 5568, 1650000, 88500000),
  createParty('SOLIDARIEDADE', 94, 5568, 1720000, 88500000),
  createParty('PATRIOTA', 49, 5568, 1420000, 88500000),
  createParty('NOVO', 1, 5568, 380000, 88500000),
  createParty('PSOL', 5, 5568, 1480000, 88500000)
];

// Major cities for Prefeito
const CIDADES_PREFEITOS: Record<string, { winner: string; party: string; cands: Candidate[] }> = {
  '3550308': { // São Paulo - SP
    winner: 'Ricardo Nunes (Bruno Covas)',
    party: 'MDB',
    cands: [
      { numero: '45', nome: 'Bruno Covas / Ricardo Nunes', nomeUrna: 'Bruno Covas', partido: 'PSDB', coligacao: 'PSDB/MDB', cor: '#0ea5e9', votos: 3169121, pctValidos: 59.38, eleito: true },
      { numero: '50', nome: 'Guilherme Boulos', nomeUrna: 'Guilherme Boulos', partido: 'PSOL', cor: '#eab308', votos: 2168109, pctValidos: 40.62 },
      { numero: '40', nome: 'Márcio França', nomeUrna: 'Márcio França', partido: 'PSB', cor: '#dc2626', votos: 728441, pctValidos: 13.64 },
      { numero: '10', nome: 'Celso Russomanno', nomeUrna: 'Celso Russomanno', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 560666, pctValidos: 10.50 }
    ]
  },
  '3304557': { // Rio de Janeiro - RJ
    winner: 'Eduardo Paes',
    party: 'PSD',
    cands: [
      { numero: '55', nome: 'Eduardo Paes', nomeUrna: 'Eduardo Paes', partido: 'PSD', cor: '#d97706', votos: 1629319, pctValidos: 64.07, eleito: true },
      { numero: '10', nome: 'Marcelo Crivella', nomeUrna: 'Marcelo Crivella', partido: 'REPUBLICANOS', cor: '#0284c7', votos: 913700, pctValidos: 35.93 },
      { numero: '12', nome: 'Martha Rocha', nomeUrna: 'Delegada Martha Rocha', partido: 'PDT', cor: '#ea580c', votos: 297753, pctValidos: 11.30 },
      { numero: '13', nome: 'Benedita da Silva', nomeUrna: 'Benedita da Silva', partido: 'PT', cor: '#e11d48', votos: 296847, pctValidos: 11.27 }
    ]
  },
  '3106200': { // Belo Horizonte - MG
    winner: 'Alexandre Kalil',
    party: 'PSD',
    cands: [
      { numero: '55', nome: 'Alexandre Kalil', nomeUrna: 'Alexandre Kalil', partido: 'PSD', cor: '#d97706', votos: 671844, pctValidos: 63.36, eleito: true },
      { numero: '28', nome: 'Bruno Engler', nomeUrna: 'Bruno Engler', partido: 'PRTB', cor: '#1e40af', votos: 105490, pctValidos: 9.95 },
      { numero: '23', nome: 'João Vítor Xavier', nomeUrna: 'João Vítor Xavier', partido: 'CIDADANIA', cor: '#ec4899', votos: 97576, pctValidos: 9.20 }
    ]
  },
  '2927408': { // Salvador - BA
    winner: 'Bruno Reis',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Bruno Reis', nomeUrna: 'Bruno Reis', partido: 'UNIÃO', cor: '#4338ca', votos: 779408, pctValidos: 64.20, eleito: true },
      { numero: '13', nome: 'Major Denice', nomeUrna: 'Major Denice', partido: 'PT', cor: '#e11d48', votos: 228942, pctValidos: 18.86 }
    ]
  },
  '4106902': { // Curitiba - PR
    winner: 'Rafael Greca',
    party: 'UNIÃO',
    cands: [
      { numero: '44', nome: 'Rafael Greca', nomeUrna: 'Rafael Greca', partido: 'UNIÃO', cor: '#4338ca', votos: 499821, pctValidos: 59.74, eleito: true },
      { numero: '12', nome: 'Goura', nomeUrna: 'Goura', partido: 'PDT', cor: '#ea580c', votos: 110977, pctValidos: 13.26 }
    ]
  },
  '4314902': { // Porto Alegre - RS
    winner: 'Sebastião Melo',
    party: 'MDB',
    cands: [
      { numero: '15', nome: 'Sebastião Melo', nomeUrna: 'Sebastião Melo', partido: 'MDB', cor: '#059669', votos: 370550, pctValidos: 54.63, eleito: true },
      { numero: '65', nome: 'Manuela d Ávila', nomeUrna: 'Manuela', partido: 'PCdoB', cor: '#be123c', votos: 307745, pctValidos: 45.37 }
    ]
  },
  '2611606': { // Recife - PE
    winner: 'João Campos',
    party: 'PSB',
    cands: [
      { numero: '40', nome: 'João Campos', nomeUrna: 'João Campos', partido: 'PSB', cor: '#dc2626', votos: 447913, pctValidos: 56.27, eleito: true },
      { numero: '13', nome: 'Marília Arraes', nomeUrna: 'Marília Arraes', partido: 'PT', cor: '#e11d48', votos: 348126, pctValidos: 43.73 }
    ]
  },
  '2304400': { // Fortaleza - CE
    winner: 'José Sarto',
    party: 'PDT',
    cands: [
      { numero: '12', nome: 'José Sarto', nomeUrna: 'Sarto', partido: 'PDT', cor: '#ea580c', votos: 668815, pctValidos: 51.69, eleito: true },
      { numero: '90', nome: 'Capitão Wagner', nomeUrna: 'Capitão Wagner', partido: 'PROS', cor: '#64748b', votos: 624892, pctValidos: 48.31 }
    ]
  },
  '5208707': { // Goiânia - GO
    winner: 'Maguito Vilela',
    party: 'MDB',
    cands: [
      { numero: '15', nome: 'Maguito Vilela', nomeUrna: 'Maguito Vilela', partido: 'MDB', cor: '#059669', votos: 277497, pctValidos: 52.60, eleito: true },
      { numero: '55', nome: 'Vanderlan Cardoso', nomeUrna: 'Vanderlan Cardoso', partido: 'PSD', cor: '#d97706', votos: 250036, pctValidos: 47.40 }
    ]
  },
  '1302603': { // Manaus - AM
    winner: 'David Almeida',
    party: 'AVANTE',
    cands: [
      { numero: '70', nome: 'David Almeida', nomeUrna: 'David Almeida', partido: 'AVANTE', cor: '#06b6d4', votos: 466970, pctValidos: 51.27, eleito: true },
      { numero: '19', nome: 'Amazonino Mendes', nomeUrna: 'Amazonino Mendes', partido: 'PODEMOS', cor: '#7c3aed', votos: 443747, pctValidos: 48.73 }
    ]
  },
  '1501402': { // Belém - PA
    winner: 'Edmilson Rodrigues',
    party: 'PSOL',
    cands: [
      { numero: '50', nome: 'Edmilson Rodrigues', nomeUrna: 'Edmilson Rodrigues', partido: 'PSOL', cor: '#eab308', votos: 390723, pctValidos: 51.76, eleito: true },
      { numero: '51', nome: 'Delegado Eguchi', nomeUrna: 'Delegado Federal Eguchi', partido: 'PATRIOTA', cor: '#334155', votos: 364025, pctValidos: 48.24 }
    ]
  }
};

// ==========================================
// 6. VEREADOR (Eleições Municipais Gerais)
// ==========================================
const VEREADOR_PARTIDOS_NACIONAL: PartySummary[] = [
  createParty('MDB', 7335, 58208, 10210000, 87400000),
  createParty('PP', 6829, 58208, 9340000, 87400000),
  createParty('PSD', 5694, 58208, 8910000, 87400000),
  createParty('UNIÃO', 5430, 58208, 8650000, 87400000),
  createParty('PSDB', 4377, 58208, 7120000, 87400000),
  createParty('PL', 3467, 58208, 6210000, 87400000),
  createParty('PDT', 3441, 58208, 5100000, 87400000),
  createParty('PSB', 3029, 58208, 4820000, 87400000),
  createParty('PT', 2665, 58208, 5940000, 87400000),
  createParty('REPUBLICANOS', 2601, 58208, 4610000, 87400000),
  createParty('CIDADANIA', 1585, 58208, 2410000, 87400000),
  createParty('PODEMOS', 1524, 58208, 2300000, 87400000),
  createParty('SOLIDARIEDADE', 1348, 58208, 1890000, 87400000),
  createParty('AVANTE', 1054, 58208, 1620000, 87400000),
  createParty('PATRIOTA', 823, 58208, 1310000, 87400000),
  createParty('PSOL', 89, 58208, 1420000, 87400000),
  createParty('NOVO', 29, 58208, 420000, 87400000)
];

// Plurality party in each state for Prefeito (by most city halls won in that UF)
const PREFEITO_ESTADO_MAIORIA: Record<string, string> = {
  SP: 'PSDB', MG: 'PSD', RJ: 'MDB', BA: 'PSD', RS: 'MDB', PR: 'PSD',
  PE: 'PSB', CE: 'PDT', SC: 'MDB', GO: 'UNIÃO', MA: 'PL', PA: 'MDB',
  PB: 'CIDADANIA', ES: 'PSB', AM: 'MDB', RN: 'MDB', AL: 'MDB', PI: 'PP',
  MT: 'UNIÃO', MS: 'PSDB', DF: 'MDB', SE: 'PSD', RO: 'UNIÃO', TO: 'MDB',
  AC: 'PP', AP: 'UNIÃO', RR: 'PP'
};

// ==========================================
// Main Factory Function
// ==========================================
export function getElectionDataForCargo(
  ano: number,
  _turno: number,
  cargo: ElectionCargo,
  basePresidentialData: ElectionRoundData
): ElectionRoundData {
  if (cargo === 'PRESIDENTE') {
    return basePresidentialData;
  }

  const baseUfs = basePresidentialData.ufs;
  const resultUfs: Record<string, UfResult> = {};

  // Build UFs mapping according to cargo
  Object.keys(baseUfs).forEach((sigla) => {
    const origUf = baseUfs[sigla];
    let vencedorNome = origUf.vencedor;
    let vencedorPartido = 'PT';
    let vencedorCor = origUf.vencedorCor;
    let candidatos: Candidate[] = origUf.candidatos;

    if (cargo === 'GOVERNADOR') {
      const g = GOV_UFS_RAW[sigla];
      if (g) {
        vencedorNome = g.winner;
        vencedorPartido = g.party;
        vencedorCor = PARTY_COLORS[g.party]?.cor || '#3b82f6';
        candidatos = g.cands;
      }
    } else if (cargo === 'SENADOR') {
      const s = SEN_UFS_RAW[sigla];
      if (s) {
        vencedorNome = s.winner;
        vencedorPartido = s.party;
        vencedorCor = PARTY_COLORS[s.party]?.cor || '#3b82f6';
        candidatos = s.cands;
      }
    } else if (cargo === 'DEPUTADO_FEDERAL') {
      const d = DEP_FED_UFS_MAP[sigla];
      vencedorPartido = d?.winnerParty || (['SP', 'RJ', 'SC', 'MT', 'RO'].includes(sigla) ? 'PL' : (['BA', 'PI', 'CE'].includes(sigla) ? 'PT' : 'UNIÃO'));
      vencedorNome = `Bancada ${vencedorPartido}`;
      vencedorCor = PARTY_COLORS[vencedorPartido]?.cor || '#2563eb';
      candidatos = d?.topCands || [
        { numero: '22', nome: `Deputados ${vencedorPartido}`, partido: vencedorPartido, cor: vencedorCor, votos: origUf.votosValidos * 0.35, pctValidos: 35.0, eleito: true },
        { numero: '13', nome: 'Deputados PT/FE', partido: 'PT', cor: '#e11d48', votos: origUf.votosValidos * 0.28, pctValidos: 28.0, eleito: true },
        { numero: '44', nome: 'Deputados UNIÃO', partido: 'UNIÃO', cor: '#4338ca', votos: origUf.votosValidos * 0.18, pctValidos: 18.0, eleito: true }
      ];
    } else if (cargo === 'DEPUTADO_ESTADUAL') {
      vencedorPartido = ['SP', 'RJ', 'SC', 'MT', 'RO'].includes(sigla) ? 'PL' : (['BA', 'PI', 'CE', 'RN'].includes(sigla) ? 'PT' : (['PR', 'SE', 'MG'].includes(sigla) ? 'PSD' : 'MDB'));
      vencedorNome = `Bancada ${vencedorPartido}`;
      vencedorCor = PARTY_COLORS[vencedorPartido]?.cor || '#d97706';
      candidatos = [
        { numero: '1', nome: `Deputados Estaduais ${vencedorPartido}`, partido: vencedorPartido, cor: vencedorCor, votos: origUf.votosValidos * 0.32, pctValidos: 32.0, eleito: true },
        { numero: '2', nome: 'Deputados Estaduais PT/Oposição', partido: 'PT', cor: '#e11d48', votos: origUf.votosValidos * 0.26, pctValidos: 26.0, eleito: true },
        { numero: '3', nome: 'Deputados Estaduais Centro/Aliança', partido: 'PP', cor: '#0891b2', votos: origUf.votosValidos * 0.20, pctValidos: 20.0, eleito: true }
      ];
    } else if (cargo === 'PREFEITO' || cargo === 'VEREADOR') {
      vencedorPartido = PREFEITO_ESTADO_MAIORIA[sigla] || 'MDB';
      vencedorNome = `Maioria ${vencedorPartido}`;
      vencedorCor = PARTY_COLORS[vencedorPartido]?.cor || '#059669';
      candidatos = [
        { numero: '15', nome: `Prefeituras ${vencedorPartido}`, partido: vencedorPartido, cor: vencedorCor, votos: origUf.votosValidos * 0.38, pctValidos: 38.0, eleito: true },
        { numero: '55', nome: 'Prefeituras PSD', partido: 'PSD', cor: '#d97706', votos: origUf.votosValidos * 0.25, pctValidos: 25.0, eleito: true },
        { numero: '11', nome: 'Prefeituras PP', partido: 'PP', cor: '#0891b2', votos: origUf.votosValidos * 0.22, pctValidos: 22.0, eleito: true }
      ];
    }

    resultUfs[sigla] = {
      ...origUf,
      vencedor: vencedorNome,
      vencedorPartido,
      vencedorCor,
      candidatos
    };
  });

  // Pick national party breakdown according to cargo
  let nationalParties: PartySummary[] = GOVERNADOR_PARTIDOS_NACIONAL;
  let tituloCargo = `Eleição para Governador (${ano})`;

  if (cargo === 'SENADOR') {
    nationalParties = SENADOR_PARTIDOS_NACIONAL;
    tituloCargo = `Eleição para o Senado Federal (${ano})`;
  } else if (cargo === 'DEPUTADO_FEDERAL') {
    nationalParties = DEP_FED_PARTIDOS_NACIONAL;
    tituloCargo = `Eleição para a Câmara dos Deputados (${ano})`;
  } else if (cargo === 'DEPUTADO_ESTADUAL') {
    nationalParties = DEP_EST_PARTIDOS_NACIONAL;
    tituloCargo = `Eleição para Assembleias Legislativas (${ano})`;
  } else if (cargo === 'PREFEITO') {
    nationalParties = PREFEITO_PARTIDOS_NACIONAL;
    tituloCargo = `Eleições Municipais • Prefeitos (${ano})`;
  } else if (cargo === 'VEREADOR') {
    nationalParties = VEREADOR_PARTIDOS_NACIONAL;
    tituloCargo = `Eleições Municipais • Vereadores (${ano})`;
  }

  // Update municipalities with city-level winners and candidate data
  const updatedMunicipios: MunicipalityResult[] = (basePresidentialData.municipios || []).map(m => {
    const cityOverride = CIDADES_PREFEITOS[m.id];
    if (cityOverride) {
      return {
        ...m,
        vencedorNome: cityOverride.winner,
        vencedorPartido: cityOverride.party,
        vencedorCor: PARTY_COLORS[cityOverride.party]?.cor || '#0ea5e9',
        candidatos: cityOverride.cands
      };
    }
    const stateParty = PREFEITO_ESTADO_MAIORIA[m.uf] || 'MDB';
    return {
      ...m,
      vencedorNome: `Prefeitura ${stateParty}`,
      vencedorPartido: stateParty,
      vencedorCor: PARTY_COLORS[stateParty]?.cor || '#059669'
    };
  });

  return {
    ...basePresidentialData,
    cargo,
    titulo: tituloCargo,
    brasil: {
      ...basePresidentialData.brasil,
      candidatos: [],
      partidos: nationalParties
    },
    ufs: resultUfs,
    municipios: updatedMunicipios
  };
}
