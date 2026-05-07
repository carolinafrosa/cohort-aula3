/**
 * Story 1.23 — Simular Digitação e Fragmentar Respostas Longas
 *
 * Code node que SUBSTITUI cada nó sendText (RetornoProjeto, RetornaMensagem,
 * RetornoReinicio, RetornoBoasVindas).
 *
 * Responsabilidades:
 *   1. Chamar sendPresence("composing") antes de cada envio
 *   2. Fragmentar textos > 300 chars em partes ≤ 280 chars (respeita \n e palavras)
 *   3. Enviar cada fragmento com delay de 1200ms entre eles
 *   4. Degradação graceful: falha no sendPresence não bloqueia o envio
 *
 * Configuração no n8n:
 *   - Credential: atribuir a mesma credencial "APIKEY" (httpHeaderAuth)
 *   - $credentials.get('httpHeaderAuth') retornará { value: '<apikey>' }
 *   - Modo: "Run Once for All Items"
 *
 * Mapeamento de campos por nó substituído:
 *   RetornoProjeto:    text = $json.descricao_projeto
 *   RetornaMensagem:   text = $json.mensagem_retorno ?? $json.descricao_projeto
 *   RetornoReinicio:   text = $json.mensagem_retorno
 *   RetornoBoasVindas: text = TEXTO_BOAS_VINDAS (hardcoded abaixo)
 */

const BASE = 'https://n8n-evolution-api.lkpafu.easypanel.host';
const INSTANCE = 'Projeta_SC';
const LIMITE = 300;   // chars: acima disso fragmenta
const MAX_FRAG = 280; // tamanho máximo de cada fragmento
const DELAY_FRAG = 1200; // ms entre fragmentos
const DELAY_TYPING = 800; // ms após sendPresence antes de enviar

// --- Obter API key via credential configurada no nó ---
const creds = await $credentials.get('httpHeaderAuth');
const APIKEY = creds.value;

// --- Helpers ---
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fragmentarTexto(texto, max) {
  if (!texto || texto.length <= LIMITE) return [texto || ''];

  const linhas = texto.split('\n');
  const frags = [];
  let atual = '';

  for (const linha of linhas) {
    const candidato = atual ? atual + '\n' + linha : linha;
    if (candidato.length <= max) {
      atual = candidato;
    } else {
      if (atual.trim()) frags.push(atual.trim());
      if (linha.length > max) {
        const partes = cortarPorPalavras(linha, max);
        const ultima = partes.pop();
        frags.push(...partes.filter(Boolean));
        atual = ultima;
      } else {
        atual = linha;
      }
    }
  }

  if (atual.trim()) frags.push(atual.trim());
  return frags.length ? frags : [texto];
}

function cortarPorPalavras(texto, max) {
  const palavras = texto.split(' ');
  const partes = [];
  let atual = '';
  for (const palavra of palavras) {
    const candidato = atual ? atual + ' ' + palavra : palavra;
    if (candidato.length <= max) {
      atual = candidato;
    } else {
      if (atual.trim()) partes.push(atual.trim());
      // Palavra única maior que max: cortar por chars
      if (palavra.length > max) {
        for (let i = 0; i < palavra.length; i += max) {
          partes.push(palavra.slice(i, i + max));
        }
        atual = '';
      } else {
        atual = palavra;
      }
    }
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
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
    // degradação graceful — sendPresence falha silenciosamente
    console.log('[SimulaDigitacao] sendPresence falhou:', e.message);
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

// --- Processamento ---
for (const item of $input.all()) {
  const numero = item.json.remetente;

  // Adaptar conforme o nó de origem (ver mapeamento no cabeçalho)
  const texto =
    item.json.descricao_projeto ||
    item.json.mensagem_retorno ||
    item.json.text ||
    '';

  if (!numero || !texto) continue;

  const fragmentos = fragmentarTexto(texto, MAX_FRAG);

  for (let i = 0; i < fragmentos.length; i++) {
    await sendPresence(numero);
    await sleep(DELAY_TYPING);
    await sendText(numero, fragmentos[i]);
    if (i < fragmentos.length - 1) await sleep(DELAY_FRAG);
  }
}

return [{ json: { success: true } }];
