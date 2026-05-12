/**
 * Story 1.38 — Patch para AplicaFiltrosResolvidos
 *
 * PROBLEMA:
 * A função encontrarExato usa .find() e retorna o primeiro tipo que contém o
 * termo do usuário como substring. Quando há múltiplos tipos com "obra" (ex.:
 * "obra portuária", "obra hídrica", "Aporte Financeiro - Obras Federais"),
 * o primeiro da lista vira o tipo exato — e o SQL usa = em vez de LIKE.
 *
 * FIX:
 * Antes de aceitar o match como exato, contar quantos tipos do banco contêm
 * o termo normalizado. Se há mais de 1 match (ambíguo), só aceitar como exato
 * se a normalização do tipo encontrado for idêntica ao input (ex.: usuário
 * digitou o nome completo). Caso contrário, usa LIKE fuzzy.
 *
 * ─────────────────────────────────────────────────────────────────
 * ONDE APLICAR NO N8N:
 * Abrir o nó "AplicaFiltrosResolvidos" (Code node) e localizar o bloco:
 *
 *   // TIPO
 *   if (resolvido.tipo && resolvido.tipo !== null) {
 *
 * Substituir TODO o bloco TIPO (até o próximo comentário // MUNICIPIO) pelo
 * código abaixo.
 * ─────────────────────────────────────────────────────────────────
 */

// ── INÍCIO DO TRECHO A COLAR (substitui bloco // TIPO inteiro) ──────────────

// TIPO
if (resolvido.tipo && resolvido.tipo !== null) {
  const normTipo = normalizar(resolvido.tipo);

  // Conta quantos tipos do banco contêm o termo como substring
  const matchesTipo = distintos.tipos.filter(v => normalizar(v).includes(normTipo));
  const matchAmbiguo = matchesTipo.length > 1;

  const exatoSimples = encontrarExato(resolvido.tipo, distintos.tipos);

  // Só aceita exatoSimples como "exato" quando:
  //   a) há apenas 1 tipo no banco que contém o termo (match único), OU
  //   b) o valor encontrado é normalizado IGUAL ao input (usuário digitou o nome completo)
  const exatoSimplesValido = exatoSimples && (
    !matchAmbiguo || normalizar(exatoSimples) === normTipo
  );

  // Tenta match combinado tipo+nome (ex: "obra"+"rodoviaria" → "Obras Rodoviárias")
  const exatoCombo = resolvido.nome
    ? encontrarExato(resolvido.tipo + ' ' + resolvido.nome, distintos.tipos)
    : null;

  // Prefere o match mais específico (mais longo)
  const exato = (exatoCombo && (!exatoSimplesValido || exatoCombo.length > exatoSimples.length))
    ? exatoCombo
    : (exatoSimplesValido ? exatoSimples : null);

  if (exato) {
    campos.tipo = exato;
    campos_resolvidos.tipo = true;
    // Nome absorvido pelo tipo composto — descarta para evitar filtro duplo
    if (exatoCombo && exato === exatoCombo) resolvido.nome = null;
  } else if (!campos.tipo || campos.tipo === 'QUALQUER') {
    // Ambíguo ou sem match: mantém como LIKE fuzzy
    const tipoRaiz = normTipo.split(' ')[0].substring(0, 4);
    const nomeRaiz = normalizar(resolvido.nome || campos.nome || '').split(' ')[0].substring(0, 4);
    const tipoCobertoPorNome = tipoRaiz.length >= 3 && nomeRaiz.length >= 3 &&
      (tipoRaiz.startsWith(nomeRaiz) || nomeRaiz.startsWith(tipoRaiz));
    if (!tipoCobertoPorNome) {
      campos.tipo = resolvido.tipo;
      campos_resolvidos.tipo = false; // LIKE '%tipo%' no MontaBusca
    }
  }
}

// ── FIM DO TRECHO A COLAR ────────────────────────────────────────────────────

/**
 * COMPORTAMENTO APÓS O FIX:
 *
 * "obra"             → tipo="obra", resolvidos.tipo=false  → LIKE '%obra%'  (todos os tipos)
 * "obras"            → tipo="obras", resolvidos.tipo=false → LIKE '%obras%'
 * "obras rodoviárias"→ 1 match único → tipo="Obras Rodoviárias", exato=true → = 'Obras Rodoviárias'
 * "obra portuária"   → 1 match único → tipo exato → = 'Obra Portuária'
 * "Aporte Financeiro - Obras Federais" → normalização exata → exato=true
 * "convenio"         → se ambíguo (vários tipos "convênio X") → LIKE fuzzy
 */
