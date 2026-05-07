/**
 * Story 1.28 — Patch para AplicaClassificacao
 *
 * ONDE APLICAR NO N8N:
 * Abrir o nó "AplicaClassificacao" (Code node) e:
 *   1. Alterar o bloco de parse do JSON (linha ~14) conforme abaixo
 *   2. Adicionar campos confidence e alternatives nos returns de busca
 *
 * ─────────────────────────────────────────────────────────────────
 * SUBSTITUIR o bloco:
 *
 *   let classificacao = { tipo: 'busca' };
 *   try {
 *     const texto = groqResp.choices[0].message.content.trim();
 *     classificacao = JSON.parse(texto.replace(/```json|```/g, '').trim());
 *   } catch(e) {}
 *
 * POR:
 */

// ── INÍCIO DO TRECHO A COLAR NO AplicaClassificacao ──────────────

let classificacao = { tipo: 'busca', confidence: 1.0, alternatives: [] };
try {
  const texto = groqResp.choices[0].message.content.trim();
  const parsed = JSON.parse(texto.replace(/```json|```/g, '').trim());
  classificacao = {
    tipo:         parsed.tipo         || 'busca',
    campos:       parsed.campos       || {},
    confidence:   typeof parsed.confidence === 'number' ? parsed.confidence : 1.0,
    alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
  };
} catch (e) {
  // Parse defensivo: JSON inválido → trata como certeza total (sem confirmação)
  // Tenta extrair tipo como string simples (formato legado)
  try {
    const textoSimples = groqResp.choices[0].message.content.trim();
    if (['saudacao','reinicio','busca','pular_campo','pergunta_livre',
         'submenu_entregas','submenu_valores','submenu_contratos'].includes(textoSimples)) {
      classificacao.tipo = textoSimples;
    }
  } catch (_) {}
}

const confidence  = classificacao.confidence;
const alternatives = classificacao.alternatives;

// ── FIM DO TRECHO A COLAR ─────────────────────────────────────────

/**
 * TAMBÉM: em cada return do bloco BUSCA (final do arquivo), adicionar confidence e alternatives:
 *
 * Substituir:
 *   return [{ tipo: 'busca', busca_limpa: busca_limpa_completa, campos_acumulados: campos,
 *             campos_faltantes, remetente, mensagem_retorno: '' }];
 *
 * Por:
 *   return [{ tipo: 'busca', busca_limpa: busca_limpa_completa, campos_acumulados: campos,
 *             campos_faltantes, remetente, mensagem_retorno: '',
 *             confidence, alternatives }];
 *
 * E no return de pular_campo, adicionar também:
 *   ..., confidence: 1.0, alternatives: []
 */
