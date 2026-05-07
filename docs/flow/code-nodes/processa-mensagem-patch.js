/**
 * Story 1.28 — Patch para ProcessaMensagem
 *
 * ONDE APLICAR NO N8N:
 * Abrir o nó "ProcessaMensagem" (Code node).
 * INSERIR o bloco abaixo IMEDIATAMENTE APÓS a inicialização do staticData e contexto,
 * ou seja, após a linha:
 *
 *   const contexto = staticData.contextos[remetente] || { ... };
 *
 * (mas ANTES de qualquer outro processamento de estado)
 */

// ── INÍCIO DO TRECHO A INSERIR ────────────────────────────────────

// Verificar confirmação pendente de intent (Story 1.28)
const confirmaçãoPendente = contexto.aguardando_confirmacao;
if (confirmaçãoPendente) {
  const agora = Date.now();

  // Confirmação expirada (> 3 min) → limpar e tratar como nova mensagem
  if (confirmaçãoPendente.expira_em && agora > confirmaçãoPendente.expira_em) {
    delete contexto.aguardando_confirmacao;
    staticData.contextos[remetente] = contexto;
  } else {
    const escolha = textoLimpo.trim();

    if (escolha === '1' || escolha === '2') {
      const tipoEscolhido = escolha === '1'
        ? confirmaçãoPendente.opcao1
        : confirmaçãoPendente.opcao2;
      const buscaOriginal = confirmaçãoPendente.busca_original || textoLimpo;
      const camposOpcao1  = confirmaçãoPendente.campos_opcao1 || {};

      // Limpar estado de confirmação pendente
      delete contexto.aguardando_confirmacao;
      staticData.contextos[remetente] = contexto;

      // Retornar como se a classificação já tivesse sido feita com o tipo escolhido
      // O ProcessaMensagem deve retornar para o fluxo normal usando este tipo
      return [{
        tipo: 'classificar',              // força reclassificação pelo GroqClassificador?
        // OU: tipo: tipoEscolhido        // pula classificação e usa diretamente
        // Recomendado: tipo: 'classificar' com busca_limpa = buscaOriginal
        // Assim o Groq reclassifica com alta certeza a mensagem original já contextualizada.
        busca_limpa:       buscaOriginal,
        remetente,
        contexto_tem_projeto:  contexto.projeto_atual != null,
        contexto_tem_lista:    contexto.lista != null && contexto.lista.length > 0,
        campos_acumulados:     tipoEscolhido === confirmaçãoPendente.opcao1 ? camposOpcao1 : {},
        projeto_atual:         contexto.projeto_atual,
        mensagem_retorno:      '',
      }];
    }

    // Usuário digitou algo diferente de 1 ou 2 → tratar como nova mensagem
    // (limpa o estado de confirmação e processa normalmente)
    delete contexto.aguardando_confirmacao;
    staticData.contextos[remetente] = contexto;
  }
}

// ── FIM DO TRECHO A INSERIR ───────────────────────────────────────
