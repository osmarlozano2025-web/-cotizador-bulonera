const OpenAI = require('openai');
const { getOpenAIKey } = require('../utils/config');

async function interpretarImagen(imageBase64, mimeType) {
  const client = new OpenAI({ apiKey: await getOpenAIKey() });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Sos un asistente de una ferretería industrial argentina llamada "Córdoba Bulones".
Interpretá este pedido (puede ser manuscrito o una foto) y devolvé un JSON con la lista de productos.

Formato (solo JSON, sin explicación ni markdown):
[{ "descripcion": "...", "cantidad": 1, "unidad": "granel", "familia_probable": "buloneria" }]

Valores posibles de familia_probable: buloneria, tolsen, mechas, desconocido
Si no hay productos claros, devolvé: []`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  const texto = response.choices[0].message.content.trim();
  try {
    const jsonStr = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    console.error('Error parseando respuesta IA:', texto);
    return [];
  }
}

module.exports = { interpretarImagen };
