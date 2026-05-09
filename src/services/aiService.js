require('dotenv').config();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || 'sk-or-v1-de61289ce9008d4907342705869a4c5e447sk-or-v1-3c7eda27017573244f5eadcd1ca727c4bfbdf66c52c6da3af9deb47860ad777f';
';

const callAI = async (systemPrompt, userMessage, model = 'google/gemma-3-4b-it:free') => {  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5000',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenRouter error: ${err.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const detectIntent = async (userText) => {
  const systemPrompt = `You are an intent detection assistant for an inventory management system.
Classify the user's request into EXACTLY one of these intents:
- record_sale
- record_purchase
- check_stock
- get_analytics
- add_product
- unknown

Respond with ONLY a JSON object like: {"intent": "record_sale", "confidence": 0.95}`;

  const result = await callAI(systemPrompt, userText);
  try {
    return JSON.parse(result);
  } catch {
    return { intent: 'unknown', confidence: 0 };
  }
};

const extractEntities = async (userText, intent) => {
  const systemPrompt = `You are a data extraction assistant for an inventory system.
Extract key information from the user's message for the intent: "${intent}".
Respond ONLY with a JSON object like:
{"product_name": "Coke 500ml", "quantity": 3, "unit_price": null}
If information is missing, use null for that field.`;

  const result = await callAI(systemPrompt, userText);
  try {
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
};

const generateResponse = async (action, data) => {
  const systemPrompt = `You are a friendly inventory assistant.
Generate a SHORT confirmation message (1-2 sentences max) for the completed action.
Be specific about numbers. Speak naturally.`;

  const userMessage = `Action: ${action}\nData: ${JSON.stringify(data)}`;
  return await callAI(systemPrompt, userMessage);
};

module.exports = { detectIntent, extractEntities, generateResponse, callAI };