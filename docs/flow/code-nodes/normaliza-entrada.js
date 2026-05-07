/**
 * Story 1.27 — Skill de Normalização Geográfica e Monetária de SC
 *
 * Code node "NormalizaEntrada" inserido entre PreparaConsulta e InterpretaConsulta.
 * Modifica $json.busca_limpa antes que o LLM receba o texto.
 *
 * Responsabilidades:
 *   1. Substituir apelidos de municípios SC pelo nome oficial (case-insensitive)
 *   2. Expandir apelidos de regiões para lista de municípios
 *   3. Converter expressões monetárias coloquiais para valor numérico explícito
 *   4. Passar o item sem modificação se nenhuma normalização for aplicada
 *
 * Posicionamento no n8n:
 *   PreparaConsulta → [NormalizaEntrada] → InterpretaConsulta
 *
 * O campo modificado é: $json.busca_limpa
 * Os demais campos do item passam sem alteração.
 */

// ────────────────────────────────────────────────────
// 1. DICIONÁRIO DE APELIDOS DE MUNICÍPIOS SC
// ────────────────────────────────────────────────────
// Chave: regex pattern (case-insensitive)
// Valor: nome oficial conforme Oracle

const MUNICIPIOS = {
  // Florianópolis
  'floripa':            'Florianópolis',
  'ilha da magia':      'Florianópolis',
  'ilha de florianópolis': 'Florianópolis',
  'ilha de florianopolis': 'Florianópolis',
  'fpolis':             'Florianópolis',
  'florianópoli(?:s)?': 'Florianópolis',

  // Blumenau
  'blumenal':           'Blumenau',
  'blumenau?':          'Blumenau',

  // Joinville
  'joinvile':           'Joinville',
  'joinvill(?:e)?':     'Joinville',

  // Chapecó
  'chapeco':            'Chapecó',
  'xapeco':             'Chapecó',

  // Itajaí
  'itajai':             'Itajaí',
  'itajái':             'Itajaí',

  // Balneário Camboriú
  'bc':                 'Balneário Camboriú',
  'balneario camboriu': 'Balneário Camboriú',
  'balneário camboriu': 'Balneário Camboriú',
  'balneario camboriú': 'Balneário Camboriú',

  // Criciúma
  'criciuma':           'Criciúma',
  'criciúma':           'Criciúma',

  // Tubarão
  'tubarao':            'Tubarão',

  // Jaraguá do Sul
  'jaragua do sul':     'Jaraguá do Sul',
  'jaraguá do sul':     'Jaraguá do Sul',

  // Lages
  'lages':              'Lages',
  'serrana':            'Lages',  // sinônimo informal

  // São José
  'sao jose':           'São José',
  'são jose':           'São José',

  // Palhoça
  'palhoca':            'Palhoça',
  'palhosa':            'Palhoça',

  // Biguaçu
  'biguacu':            'Biguaçu',

  // Rio do Sul
  'rio do sul':         'Rio do Sul',

  // Caçador
  'cacador':            'Caçador',

  // Brusque
  'brusque':            'Brusque',

  // Concórdia
  'concordia':          'Concórdia',

  // Imbituba
  'imbituba':           'Imbituba',

  // Laguna
  'laguna':             'Laguna',

  // Camboriú
  'camboriu':           'Camboriú',

  // Tijucas
  'tijucas':            'Tijucas',

  // Içara
  'icara':              'Içara',

  // Araranguá
  'ararangua':          'Araranguá',
};

// ────────────────────────────────────────────────────
// 2. APELIDOS DE REGIÕES → LISTA DE MUNICÍPIOS
// ────────────────────────────────────────────────────

const REGIOES = {
  'grande floripa':         'Florianópolis, São José, Palhoça, Biguaçu, São Pedro de Alcântara',
  'grande fpolis':          'Florianópolis, São José, Palhoça, Biguaçu, São Pedro de Alcântara',
  'grande florianópolis':   'Florianópolis, São José, Palhoça, Biguaçu, São Pedro de Alcântara',
  'grande florianopolis':   'Florianópolis, São José, Palhoça, Biguaçu, São Pedro de Alcântara',
  'região metropolitana':   'Florianópolis, São José, Palhoça, Biguaçu, São Pedro de Alcântara',
  'litoral norte':          'Joinville, Jaraguá do Sul, São Francisco do Sul, Araquari, Garuva',
  'litoral sul':            'Criciúma, Tubarão, Laguna, Imbituba, Araranguá',
  'vale do itajai':         'Blumenau, Itajaí, Balneário Camboriú, Brusque, Camboriú',
  'vale do itajaí':         'Blumenau, Itajaí, Balneário Camboriú, Brusque, Camboriú',
  'planalto serrano':       'Lages, Curitibanos, Campos Novos, São Joaquim',
  'alto vale':              'Rio do Sul, Ibirama, Taió',
  'alto vale do itajai':    'Rio do Sul, Ibirama, Taió',
  'extremo oeste':          'Chapecó, São Miguel do Oeste, Maravilha, Pinhalzinho',
  'meio oeste':             'Caçador, Videira, Joaçaba, Herval d\'Oeste',
};

// ────────────────────────────────────────────────────
// 3. CONVERSÃO MONETÁRIA
// ────────────────────────────────────────────────────

const MOEDA_PATTERNS = [
  // "2 bilhões", "2bi", "2 bi", "2b"
  { re: /(\d+(?:[.,]\d+)?)\s*(?:bilhões?|bilhao|bilhão|bi\b|b\b)/i,
    mult: 1_000_000_000 },
  // "500 milhões", "500mi", "500 mi", "500m"
  { re: /(\d+(?:[.,]\d+)?)\s*(?:milhões?|milhao|milhão|mi\b|mi(?=\s)|(?<!\w)m\b)/i,
    mult: 1_000_000 },
  // "500 mil", "500k"
  { re: /(\d+(?:[.,]\d+)?)\s*(?:mil\b|k\b)/i,
    mult: 1_000 },
  // "meio bilhão"
  { re: /meio\s+bilh[aã]o/i,
    replacement: 'R$ 500.000.000' },
  // "meio milhão"
  { re: /meio\s+milh[aã]o/i,
    replacement: 'R$ 500.000' },
];

// ────────────────────────────────────────────────────
// 4. FUNÇÕES DE NORMALIZAÇÃO
// ────────────────────────────────────────────────────

function normalizarRegioes(texto) {
  let result = texto;
  for (const [apelido, municipios] of Object.entries(REGIOES)) {
    const re = new RegExp(apelido, 'gi');
    if (re.test(result)) {
      result = result.replace(re, municipios);
    }
  }
  return result;
}

function normalizarMunicipios(texto) {
  let result = texto;
  for (const [padrao, oficial] of Object.entries(MUNICIPIOS)) {
    // Usar word boundary para evitar substituições parciais
    const re = new RegExp(`\\b${padrao}\\b`, 'gi');
    result = result.replace(re, oficial);
  }
  return result;
}

function normalizarMonetario(texto) {
  let result = texto;
  for (const { re, mult, replacement } of MOEDA_PATTERNS) {
    if (replacement) {
      result = result.replace(re, replacement);
    } else {
      result = result.replace(re, (_, num) => {
        const n = parseFloat(num.replace(',', '.'));
        const valor = (n * mult).toLocaleString('pt-BR', {
          style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
        });
        return valor;
      });
    }
  }
  return result;
}

function normalizar(texto) {
  let result = texto;
  result = normalizarRegioes(result);
  result = normalizarMunicipios(result);
  result = normalizarMonetario(result);
  return result;
}

// ────────────────────────────────────────────────────
// 5. EXECUÇÃO — NORMALIZA busca_limpa
// ────────────────────────────────────────────────────

const itens = $input.all();
const resultado = [];

for (const item of itens) {
  const buscaOriginal = item.json.busca_limpa || '';
  const buscaNormalizada = normalizar(buscaOriginal);

  resultado.push({
    json: {
      ...item.json,
      busca_limpa: buscaNormalizada,
      busca_pre_normalizacao: buscaOriginal !== buscaNormalizada ? buscaOriginal : undefined,
    },
  });
}

return resultado;
