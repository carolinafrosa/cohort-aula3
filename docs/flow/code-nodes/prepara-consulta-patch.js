/**
 * PATCH: PreparaConsulta
 * Story: 1.43 — Cobertura completa de campos de busca avançada
 *
 * SUBSTITUIR o bloco completo do nó PreparaConsulta por este código.
 *
 * Mudanças em relação ao original:
 * - Adiciona prioridades[], setores[], associacoes[] ao parse do ConsultaDistintos
 * - Inclui os três arrays no cache filtrosDistintos
 */

const remetente = $('ProcessaMensagem').first().json.remetente;
const buscaOriginal = $('ProcessaMensagem').first().json.busca_limpa;
const staticData = $getWorkflowStaticData('global');
if (!staticData.contextos) staticData.contextos = {};
const agora = Date.now();

// Processar resultados do Oracle (ConsultaDistintos)
const todosRows = $input.all();
const orgaos = [], tipos = [], municipios = [], regioes = [], situacoes = [], programas = [];
const prioridades = [], setores = [], associacoes = [];  // NOVO

todosRows.forEach(row => {
  const tipo  = (row.json.TIPO_CAMPO || '').trim();
  const valor = (row.json.VALOR || '').trim();
  if (!valor) return;
  if      (tipo === 'ORGAO')      orgaos.push(valor);
  else if (tipo === 'TIPO')       tipos.push(valor);
  else if (tipo === 'MUNICIPIO')  municipios.push(valor);
  else if (tipo === 'REGIAO')     regioes.push(valor);
  else if (tipo === 'SITUACAO')   situacoes.push(valor);
  else if (tipo === 'PROGRAMA')   programas.push(valor);
  else if (tipo === 'PRIORIDADE') prioridades.push(valor);  // NOVO
  else if (tipo === 'SETOR')      setores.push(valor);      // NOVO
  else if (tipo === 'ASSOCIACAO') associacoes.push(valor);  // NOVO
});

// Cachear distintos com TTL de 1h
const CACHE_TTL = 60 * 60 * 1000;
const cacheOk = staticData.filtrosDistintos &&
  staticData.filtrosDistintos._ts &&
  (agora - staticData.filtrosDistintos._ts) < CACHE_TTL;

if (!cacheOk) {
  staticData.filtrosDistintos = {
    orgaos, tipos, municipios, regioes, situacoes, programas,
    prioridades, setores, associacoes,  // NOVO
    _ts: agora
  };
}

// Campos do contexto atual
const contexto = staticData.contextos[remetente] || {};
const campos    = contexto.campos_acumulados || {};
const faltantes = contexto.campos_faltantes || [];

const preenchidos = Object.entries(campos)
  .filter(([k, v]) => v && v !== 'QUALQUER')
  .map(([k, v]) => k + ': ' + v)
  .join(', ');

const temCamposPreenchidos = preenchidos.length > 0;
const proximo = temCamposPreenchidos ? (faltantes[0] || '') : '';

let contextoTexto;
if (temCamposPreenchidos) {
  contextoTexto = 'Campos ja preenchidos: ' + preenchidos +
    '. Proximo campo esperado: ' + (proximo || 'qualquer') +
    '. Texto do usuario: ' + buscaOriginal;
} else {
  contextoTexto = buscaOriginal;
}

return [{
  busca_limpa:       contextoTexto,
  busca_original:    buscaOriginal,
  campos_acumulados: campos,
  campos_faltantes:  faltantes,
  remetente
}];
