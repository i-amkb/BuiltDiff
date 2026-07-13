module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, system, max_tokens } = req.body || {};

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: max_tokens || 1024 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    // Convert Gemini response format to Anthropic format so HTML code doesn't need changing
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}