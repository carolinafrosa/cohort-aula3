/**
 * Story 1.25 — Fallback Inteligente em Buscas sem Resultado
 *
 * Code node "FormataFallback" — formata a resposta do Groq em mensagem
 * empática com sugestões numeradas.
 *
 * Posicionamento no n8n:
 *   RoteiaResultado (output "sem_resultado") → SugestaoFallback (HTTP Groq)
 *     → [FormataFallback] → RetornaMensagem
 *
 * Input esperado ($json):
 *   - choices[0].message.content: resposta do Groq (array de sugestões)
 *   - remetente: número WhatsApp do usuário
 *   - busca_original: texto original da busca (passado pelo nó anterior)
 *
 * Output ($json):
 *   - mensagem_retorno: mensagem formatada para envio WhatsApp
 *   - remetente: repassado
 *   - tipo: "sem_resultado" (para compatibilidade com EnviaComDigitacao)
 */

const EMOJIS_OPCAO = ['1️⃣', '2️⃣', '3️⃣'];

function extrairSugestoes(groqContent) {
  if (!groqContent) return [];

  // Groq retorna JSON array ["sugestão 1", "sugestão 2", "sugestão 3"]
  try {
    const parsed = JSON.parse(groqContent);
    if (Array.isArray(parsed)) return parsed.slice(0, 3).filter(Boolean);
  } catch (_) {
    // Fallback: extrair linhas numeradas "1. sugestão"
    const linhas = groqContent.split('\n').filter(l => /^\d+[\.\)]\s+/.test(l.trim()));
    if (linhas.length > 0) {
      return linhas.slice(0, 3).map(l => l.replace(/^\d+[\.\)]\s+/, '').trim());
    }
    // Último fallback: split por vírgula
    const por_virgula = groqContent.split(',').map(s => s.trim()).filter(Boolean);
    if (por_virgula.length >= 2) return por_virgula.slice(0, 3);
  }
  return [];
}

const resultado = [];

for (const item of $input.all()) {
  const remetente    = item.json.remetente;
  const buscaUsada   = item.json.busca_original || '';
  const groqContent  = item.json.choices?.[0]?.message?.content || '';
  const sugestoes    = extrairSugestoes(groqContent);

  let mensagem;

  if (sugestoes.length > 0) {
    const sugsFormatadas = sugestoes
      .map((s, i) => `${EMOJIS_OPCAO[i] || `${i + 1}.`} ${s}`)
      .join('\n');

    mensagem =
      `Não encontrei nada com *"${buscaUsada}"*. 🤔\n\n` +
      `Que tal tentar de outro jeito? Veja algumas sugestões:\n\n` +
      sugsFormatadas +
      '\n\n0️⃣ Fazer uma nova busca livre';
  } else {
    // Degradação graceful: sem sugestões (Groq falhou ou não retornou nada útil)
    mensagem =
      `Não encontrei nada com *"${buscaUsada}"*. 😕\n\n` +
      `Tente usar outros termos, como o nome da cidade, categoria da obra, ` +
      `número do projeto ou nome da empresa.\n\n` +
      `0️⃣ Nova busca`;
  }

  resultado.push({
    json: {
      tipo: 'sem_resultado',
      mensagem_retorno: mensagem,
      remetente,
    },
  });
}

return resultado;
