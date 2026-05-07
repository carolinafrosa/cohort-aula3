/**
 * Story 1.28 — Patch para PreparaGroqClassificador (prompt update)
 *
 * ONDE APLICAR NO N8N:
 * Abrir o nó "PreparaGroqClassificador" (Code node) e localizar a linha:
 *   'Formato de retorno: {"tipo":"...", "campos":{...}}',
 *
 * SUBSTITUIR por estas 3 linhas:
 */

// ── NOVAS LINHAS PARA SUBSTITUIR A LINHA DE "Formato de retorno" ─────────────

'Formato de retorno: {"tipo":"...", "campos":{...}, "confidence": 0.0-1.0, "alternatives": ["tipo_alternativo"]}',
'- confidence: 0.0 = total incerteza, 1.0 = total certeza.',
'- alternatives: lista vazia [] se certeza alta. Máximo 1 alternativa.',

// ── FIM DO PATCH ──────────────────────────────────────────────────────────────

/**
 * TAMBÉM: Atualizar os exemplos no final do systemPrompt para incluir confidence.
 * SUBSTITUIR a linha:
 *   '"oi tudo bem" → {"tipo":"saudacao"}',
 * POR:
 *   '"oi tudo bem" → {"tipo":"saudacao","confidence":0.99,"alternatives":[]}',
 *
 * E adicionar exemplo de mensagem ambígua:
 *   '"me fala sobre isso" → {"tipo":"pergunta_livre","confidence":0.55,"alternatives":["busca"]}',
 *   '"aquele projeto" → {"tipo":"submenu_entregas","confidence":0.45,"alternatives":["submenu_valores"]}',
 *
 * TAMBÉM: max_tokens deve ser aumentado para 150 (confidence e alternatives adicionam ~30 tokens):
 *   Substituir: max_tokens: 120
 *   Por:        max_tokens: 150
 */
