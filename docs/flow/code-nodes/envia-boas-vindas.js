/**
 * Story 1.23 — Simular Digitação (RetornoBoasVindas)
 *
 * Versão específica para o nó de boas-vindas (texto estático).
 * A mensagem de boas-vindas tem ~440 chars → será fragmentada em 2 partes.
 *
 * Substitui: RetornoBoasVindas
 */

const BASE = 'https://n8n-evolution-api.lkpafu.easypanel.host';
const INSTANCE = 'Projeta_SC';
const DELAY_FRAG = 1200;
const DELAY_TYPING = 800;

const creds = await $credentials.get('httpHeaderAuth');
const APIKEY = creds.value;

const BOAS_VINDAS_PARTE1 =
  'Olá! Sou o Projeta SC 🏛️, o assistente de projetos do Governo de Santa Catarina.\n\n' +
  'Posso te ajudar a consultar obras, investimentos e contratos do estado.';

const BOAS_VINDAS_PARTE2 =
  'É só me dizer o que você quer saber, por exemplo:\n\n' +
  '📍 *escolas em Joinville*\n' +
  '🏗️ *Ponte Hercílio Luz*\n' +
  '🏥 *Hospital Regional de Lages*\n' +
  '🔢 *32/2025*\n\n' +
  'O que você quer consultar?';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendPresence(numero) {
  try {
    await $http.request({
      method: 'POST',
      url: `${BASE}/chat/sendPresence/${INSTANCE}`,
      headers: { apikey: APIKEY, 'Content-Type': 'application/json' },
      body: { number: numero, presence: 'composing' },
    });
  } catch (e) {
    console.log('[BoasVindas] sendPresence falhou:', e.message);
  }
}

async function sendText(numero, texto) {
  await $http.request({
    method: 'POST',
    url: `${BASE}/message/sendText/${INSTANCE}`,
    headers: { apikey: APIKEY, 'Content-Type': 'application/json' },
    body: { number: numero, text: texto },
  });
}

for (const item of $input.all()) {
  const numero = item.json.remetente;
  if (!numero) continue;

  for (const parte of [BOAS_VINDAS_PARTE1, BOAS_VINDAS_PARTE2]) {
    await sendPresence(numero);
    await sleep(DELAY_TYPING);
    await sendText(numero, parte);
    await sleep(DELAY_FRAG);
  }
}

return [{ json: { success: true } }];
