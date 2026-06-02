/* =======================================================================
   database.js  —  Banco de dados da plataforma WattControl
   -----------------------------------------------------------------------
   Contém:
     • Parâmetros nacionais (tarifa média, consumo médio brasileiro)
     • Catálogo de eletrodomésticos mais usados no Brasil com potências
       típicas (em Watts), categoria, ícone e horas de uso sugeridas
     • Perfil sazonal do consumo médio residencial brasileiro (12 meses)

   Fontes de referência para as potências: manuais de fabricantes,
   tabelas INMETRO/PROCEL e cartilhas de eficiência energética da ANEEL.
   Os valores são MÉDIAS de mercado e servem para estimativa educacional.
   ======================================================================= */

/* ---- Parâmetros nacionais editáveis ---------------------------------- */

// Tarifa média residencial no Brasil (R$ por kWh), incluindo tributos.
// Pode ser alterada pelo usuário na interface.
const TARIFA_PADRAO = 0.76;

// Consumo médio mensal de uma residência brasileira (kWh/mês).
// Referência aproximada de estudos da EPE/ANEEL (~160 kWh/mês).
const MEDIA_BRASIL_MENSAL = 163;

// Número de dias considerados no mês para os cálculos.
const DIAS_NO_MES = 30;

// Meses do ano (rótulos curtos para os gráficos).
const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/* Perfil sazonal do consumo médio brasileiro.
   Multiplicadores aplicados sobre MEDIA_BRASIL_MENSAL.
   O verão (Dez–Mar) puxa o consumo para cima por causa do
   ar-condicionado/ventilação; o inverno tem leve alta pelo chuveiro. */
const PERFIL_SAZONAL_BRASIL = [
  1.18, // Jan  (verão, calor)
  1.15, // Fev
  1.10, // Mar
  0.98, // Abr
  0.92, // Mai
  0.90, // Jun  (inverno ameno)
  0.92, // Jul
  0.93, // Ago
  0.95, // Set
  1.00, // Out
  1.07, // Nov
  1.14  // Dez  (verão, festas)
];

/* Fatores sazonais por categoria — usados para projetar o consumo
   ANUAL do próprio usuário de forma mais realista no gráfico de linhas.
   Climatização sobe muito no verão; Banho (chuveiro) sobe no inverno. */
const FATORES_SAZONAIS_CATEGORIA = {
  'Climatização': [1.6, 1.5, 1.3, 1.0, 0.7, 0.5, 0.5, 0.6, 0.8, 1.0, 1.3, 1.5],
  'Banho':        [0.7, 0.7, 0.8, 1.0, 1.2, 1.4, 1.4, 1.3, 1.1, 0.9, 0.8, 0.7]
  // As demais categorias usam fator 1.0 (consumo estável o ano todo).
};

/* ---- Catálogo de eletrodomésticos ------------------------------------ */
/*  id          : identificador único
    nome        : nome exibido
    potencia    : potência em Watts (W)
    categoria   : grupo para filtro e gráficos
    icone       : emoji ilustrativo
    horasPadrao : horas de uso diário sugeridas ao adicionar            */

const ELETRODOMESTICOS = [
  /* ---------------------- COZINHA ----------------------
     Obs.: geladeira/freezer ficam ligados 24h, mas o compressor
     trabalha em ciclos. Por isso usamos a POTÊNCIA MÉDIA EFETIVA
     (≈40% do nominal), o que reflete o consumo real (~40–60 kWh/mês). */
  { id: 'geladeira',     nome: 'Geladeira / Refrigerador',  potencia: 60,   categoria: 'Cozinha',       icone: '🧊', horasPadrao: 24 },
  { id: 'freezer',       nome: 'Freezer Horizontal',        potencia: 80,   categoria: 'Cozinha',       icone: '❄️', horasPadrao: 24 },
  { id: 'fogao-eletrico',nome: 'Fogão Elétrico (cooktop)',  potencia: 1500, categoria: 'Cozinha',       icone: '🍳', horasPadrao: 1  },
  { id: 'forno-eletrico',nome: 'Forno Elétrico',            potencia: 1500, categoria: 'Cozinha',       icone: '🔥', horasPadrao: 0.5},
  { id: 'microondas',    nome: 'Micro-ondas',               potencia: 1400, categoria: 'Cozinha',       icone: '📡', horasPadrao: 0.3},
  { id: 'cafeteira',     nome: 'Cafeteira Elétrica',        potencia: 800,  categoria: 'Cozinha',       icone: '☕', horasPadrao: 0.3},
  { id: 'liquidificador',nome: 'Liquidificador',            potencia: 300,  categoria: 'Cozinha',       icone: '🥤', horasPadrao: 0.1},
  { id: 'sanduicheira',  nome: 'Sanduicheira / Grill',      potencia: 800,  categoria: 'Cozinha',       icone: '🥪', horasPadrao: 0.2},
  { id: 'torradeira',    nome: 'Torradeira',                potencia: 800,  categoria: 'Cozinha',       icone: '🍞', horasPadrao: 0.1},
  { id: 'air-fryer',     nome: 'Air Fryer (Fritadeira)',    potencia: 1500, categoria: 'Cozinha',       icone: '🍟', horasPadrao: 0.4},
  { id: 'purificador',   nome: 'Purificador de Água',       potencia: 30,   categoria: 'Cozinha',       icone: '💧', horasPadrao: 24 },

  /* ------------------- CLIMATIZAÇÃO ------------------- */
  { id: 'ar-7500',       nome: 'Ar-condicionado 7.500 BTU', potencia: 1000, categoria: 'Climatização',  icone: '🌬️', horasPadrao: 6  },
  { id: 'ar-9000',       nome: 'Ar-condicionado 9.000 BTU', potencia: 1400, categoria: 'Climatização',  icone: '🌬️', horasPadrao: 6  },
  { id: 'ar-12000',      nome: 'Ar-condicionado 12.000 BTU',potencia: 1500, categoria: 'Climatização',  icone: '🌬️', horasPadrao: 6  },
  { id: 'ventilador',    nome: 'Ventilador',                potencia: 100,  categoria: 'Climatização',  icone: '🍃', horasPadrao: 8  },
  { id: 'aquecedor',     nome: 'Aquecedor a Óleo',          potencia: 1500, categoria: 'Climatização',  icone: '🌡️', horasPadrao: 4  },

  /* ----------------------- BANHO ---------------------- */
  { id: 'chuveiro',      nome: 'Chuveiro Elétrico',         potencia: 5500, categoria: 'Banho',         icone: '🚿', horasPadrao: 0.66},
  { id: 'chuveiro-inv',  nome: 'Chuveiro Elétrico (Inverno)',potencia: 7500,categoria: 'Banho',         icone: '🚿', horasPadrao: 0.66},
  { id: 'secador',       nome: 'Secador de Cabelo',         potencia: 1800, categoria: 'Banho',         icone: '💨', horasPadrao: 0.2},
  { id: 'chapinha',      nome: 'Chapinha / Prancha',        potencia: 200,  categoria: 'Banho',         icone: '💇', horasPadrao: 0.2},

  /* --------------------- LAVANDERIA -------------------- */
  { id: 'lavadora',      nome: 'Máquina de Lavar Roupa',    potencia: 500,  categoria: 'Lavanderia',    icone: '🧺', horasPadrao: 1  },
  { id: 'secadora',      nome: 'Secadora de Roupa',         potencia: 3500, categoria: 'Lavanderia',    icone: '🌀', horasPadrao: 0.7},
  { id: 'ferro',         nome: 'Ferro de Passar',           potencia: 1000, categoria: 'Lavanderia',    icone: '👕', horasPadrao: 0.5},
  { id: 'lava-loucas',   nome: 'Lava-louças',               potencia: 1500, categoria: 'Lavanderia',    icone: '🍽️', horasPadrao: 1  },
  { id: 'aspirador',     nome: 'Aspirador de Pó',           potencia: 1200, categoria: 'Lavanderia',    icone: '🧹', horasPadrao: 0.3},

  /* ------------------- ENTRETENIMENTO ------------------ */
  { id: 'tv-32',         nome: 'TV LED 32"',                potencia: 50,   categoria: 'Entretenimento',icone: '📺', horasPadrao: 5  },
  { id: 'tv-43',         nome: 'TV LED 43"',                potencia: 80,   categoria: 'Entretenimento',icone: '📺', horasPadrao: 5  },
  { id: 'tv-50',         nome: 'TV LED 50"',                potencia: 110,  categoria: 'Entretenimento',icone: '📺', horasPadrao: 5  },
  { id: 'tv-55',         nome: 'TV LED 55"',                potencia: 130,  categoria: 'Entretenimento',icone: '📺', horasPadrao: 5  },
  { id: 'videogame',     nome: 'Videogame (Console)',       potencia: 150,  categoria: 'Entretenimento',icone: '🎮', horasPadrao: 3  },
  { id: 'home-theater',  nome: 'Home Theater / Soundbar',   potencia: 90,   categoria: 'Entretenimento',icone: '🔊', horasPadrao: 3  },

  /* --------------------- ESCRITÓRIO -------------------- */
  { id: 'desktop',       nome: 'Computador Desktop',        potencia: 250,  categoria: 'Escritório',    icone: '🖥️', horasPadrao: 6  },
  { id: 'notebook',      nome: 'Notebook',                  potencia: 65,   categoria: 'Escritório',    icone: '💻', horasPadrao: 6  },
  { id: 'monitor',       nome: 'Monitor',                   potencia: 40,   categoria: 'Escritório',    icone: '🖼️', horasPadrao: 6  },
  { id: 'roteador',      nome: 'Roteador / Modem Wi-Fi',    potencia: 12,   categoria: 'Escritório',    icone: '📶', horasPadrao: 24 },
  { id: 'carregador',    nome: 'Carregador de Celular',     potencia: 10,   categoria: 'Escritório',    icone: '🔌', horasPadrao: 3  },

  /* -------------------- ILUMINAÇÃO --------------------- */
  { id: 'lamp-led',      nome: 'Lâmpada LED',               potencia: 10,   categoria: 'Iluminação',    icone: '💡', horasPadrao: 6  },
  { id: 'lamp-fluor',    nome: 'Lâmpada Fluorescente',      potencia: 25,   categoria: 'Iluminação',    icone: '💡', horasPadrao: 6  },
  { id: 'lamp-incand',   nome: 'Lâmpada Incandescente',     potencia: 60,   categoria: 'Iluminação',    icone: '💡', horasPadrao: 6  },

  /* ----------------------- OUTROS ---------------------- */
  { id: 'bomba-agua',    nome: "Bomba d'Água",              potencia: 370,  categoria: 'Outros',        icone: '⚙️', horasPadrao: 1  },
  { id: 'aquario',       nome: 'Aquário (bomba+luz)',       potencia: 35,   categoria: 'Outros',        icone: '🐠', horasPadrao: 24 }
];

/* Lista de categorias derivada do catálogo (ordem de exibição). */
const CATEGORIAS = [
  'Cozinha', 'Climatização', 'Banho', 'Lavanderia',
  'Entretenimento', 'Escritório', 'Iluminação', 'Outros'
];

/* Cor associada a cada categoria — usada nos gráficos. */
const CORES_CATEGORIA = {
  'Cozinha':        '#E8543F',
  'Climatização':   '#1FA67A',
  'Banho':          '#3D7DD8',
  'Lavanderia':     '#9B5DE5',
  'Entretenimento': '#F5A623',
  'Escritório':     '#00B8A9',
  'Iluminação':     '#F4C430',
  'Outros':         '#8C8C7A'
};
