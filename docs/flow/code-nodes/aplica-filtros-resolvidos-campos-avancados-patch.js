/**
 * PATCH: AplicaFiltrosResolvidos — campos avançados
 * Story: 1.43 — Cobertura completa de campos de busca avançada
 *
 * APLICAR as 4 substituições abaixo no nó AplicaFiltrosResolvidos.
 * Cada bloco está marcado com "ANTES" e "DEPOIS".
 *
 * Não substituir o nó inteiro — apenas as seções indicadas.
 */

// ─────────────────────────────────────────────────────────────
// SUBSTITUIÇÃO 1: fallback de distintos (linha ~12)
//
// ANTES:
//   const distintos = staticData.filtrosDistintos || { orgaos: [], tipos: [], municipios: [], regioes: [], situacoes: [], programas: [] };
//
// DEPOIS:
const distintos = staticData.filtrosDistintos || {
  orgaos: [], tipos: [], municipios: [], regioes: [], situacoes: [], programas: [],
  prioridades: [], setores: [], associacoes: []
};

// ─────────────────────────────────────────────────────────────
// SUBSTITUIÇÃO 2: PRIORIDADE — trocar pass-through por fuzzy resolution
//
// ANTES:
//   if (resolvido.prioridade && resolvido.prioridade !== null) campos.prioridade = resolvido.prioridade;
//
// DEPOIS:
if (resolvido.prioridade && resolvido.prioridade !== null) {
  const exatoPri = encontrarExato(resolvido.prioridade, distintos.prioridades || []);
  if (exatoPri) {
    campos.prioridade = exatoPri;
    campos_resolvidos.prioridade = true;
  } else {
    campos.prioridade = resolvido.prioridade;  // fallback: passa direto para MontaBusca usar = trNorm
    campos_resolvidos.prioridade = false;
  }
}

// ─────────────────────────────────────────────────────────────
// SUBSTITUIÇÃO 3: SETOR — trocar pass-through por fuzzy resolution
//
// ANTES:
//   if (resolvido.setor && resolvido.setor !== null && !campos.setor) campos.setor = resolvido.setor;
//
// DEPOIS:
if (resolvido.setor && resolvido.setor !== null && !campos.setor) {
  const exatoSetor = encontrarExato(resolvido.setor, distintos.setores || []);
  if (exatoSetor) {
    campos.setor = exatoSetor;
    campos_resolvidos.setor = true;
  } else {
    campos.setor = resolvido.setor;  // fallback: MontaBusca usa LIKE
    campos_resolvidos.setor = false;
  }
}

// ─────────────────────────────────────────────────────────────
// SUBSTITUIÇÃO 4: ASSOCIACAO — trocar pass-through por fuzzy resolution
//
// ANTES:
//   if (resolvido.associacao && resolvido.associacao !== null && !campos.associacao) campos.associacao = resolvido.associacao;
//
// DEPOIS:
if (resolvido.associacao && resolvido.associacao !== null && !campos.associacao) {
  const exatoAssoc = encontrarExato(resolvido.associacao, distintos.associacoes || []);
  if (exatoAssoc) {
    campos.associacao = exatoAssoc;
    campos_resolvidos.associacao = true;
  } else {
    campos.associacao = resolvido.associacao;  // fallback: MontaBusca usa LIKE
    campos_resolvidos.associacao = false;
  }
}
