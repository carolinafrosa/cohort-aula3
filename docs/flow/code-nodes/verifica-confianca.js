/**
 * Story 1.28 — Confidence Score e Confirmação Conversacional de Intenção
 *
 * Code node "VerificaConfianca" inserido entre AplicaClassificacao e RoteiaClassificacao.
 *
 * Responsabilidades:
 *   1. Se confidence >= THRESHOLD ou sem alternatives → passa para RoteiaClassificacao normalmente
 *   2. Se confidence < THRESHOLD E tem alternatives → envia confirmação WhatsApp,
 *      salva estado pendente no staticData e retorna tipo "aguardando_confirmacao"
 *
 * Posicionamento no n8n:
 *   AplicaClassificacao → [VerificaConfianca] → RoteiaClassificacao
 *                                             ↘ (aguardando_confirmacao termina aqui)
 *
 * PRÉ-REQUISITO: AplicaClassificacao deve incluir `confidence` e `alternatives`
 * no objeto retornado. Ver: aplica-classificacao-patch.js
 *
 * PRÉ-REQUISITO: ProcessaMensagem deve incluir o bloco de confirmação.
 * Ver: processa-mensagem-patch.js
 */

const THRESHOLD = 0.70;
const BASE_URL   = 'https://n8n-evolution-api.lkpafu.easypanel.host';
const INSTANCE   = 'Projeta_SC';

const LABEL_INTENT = {
  busca:              'Buscar um projeto',
  saudacao:           'Saudação / início',
  reinicio:           'Começar nova busca',
  submenu_entregas:   'Ver entregas do projeto',
  submenu_valores:    'Ver valores do projeto',
  submenu_contratos:  'Ver contratos do projeto',
  pergunta_livre:     'Fazer uma pergunta sobre o projeto',
  pular_campo:        'Pular / qualquer opção',
};

function nomeIntent(tipo) {
  return LABEL_INTENT[tipo] || tipo;
}

const creds = await $credentials.get('httpHeaderAuth');
const APIKEY = creds.value;

const staticData = $getWorkflowStaticData('global');
if (!staticData.contextos) staticData.contextos = {};

const resultado = [];

for (const item of $input.all()) {
  const confidence  = typeof item.json.confidence === 'number' ? item.json.confidence : 1.0;
  const alternatives = Array.isArray(item.json.alternatives) ? item.json.alternatives : [];
  const remetente   = item.json.remetente;
  const tipoAtual   = item.json.tipo;

  // Alta confiança ou sem alternativas → passa sem confirmação
  if (confidence >= THRESHOLD || alternatives.length === 0) {
    resultado.push(item);
    continue;
  }

  // Baixa confiança com alternativas → confirmar com o usuário
  const opcao1 = tipoAtual;
  const opcao2 = alternatives[0];

  // Salvar estado pendente para ProcessaMensagem resolver na próxima mensagem
  if (!staticData.contextos[remetente]) {
    staticData.contextos[remetente] = {};
  }
  staticData.contextos[remetente].aguardando_confirmacao = {
    opcao1,
    opcao2,
    busca_original: item.json.busca_limpa || '',
    campos_opcao1: item.json.campos_acumulados || {},
    expira_em: Date.now() + 3 * 60 * 1000, // 3 minutos de validade
  };

  // Enviar pergunta de confirmação via WhatsApp
  const mensagem =
    `Hm, não tenho certeza do que você quer. 🤔\n\n` +
    `1️⃣ ${nomeIntent(opcao1)}\n` +
    `2️⃣ ${nomeIntent(opcao2)}\n\n` +
    `Qual é a sua intenção?`;

  try {
    await $http.request({
      method: 'POST',
      url: `${BASE_URL}/message/sendText/${INSTANCE}`,
      headers: { apikey: APIKEY, 'Content-Type': 'application/json' },
      body: { number: remetente, text: mensagem },
    });
  } catch (e) {
    // Se falhar ao enviar confirmação, passa com intenção original (degradação graceful)
    console.log('[VerificaConfianca] Falha ao enviar confirmação:', e.message);
    resultado.push(item);
    continue;
  }

  // Retornar item com tipo "aguardando_confirmacao" — RoteiaClassificacao vai deixar passar
  // sem processar (RoteadorPrincipal precisa ignorar este tipo ou devolvê-lo ao idle)
  resultado.push({
    json: {
      tipo: 'aguardando_confirmacao',
      remetente,
      mensagem_retorno: '',
    },
  });
}

return resultado;
