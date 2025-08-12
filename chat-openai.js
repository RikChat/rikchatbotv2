import OpenAI from 'openai';

export default async function handler(request, response) {
  // Pastikan metode permintaan adalah POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // Dapatkan kunci API dari Vercel Environment Variables
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    return response.status(500).json({ error: 'OPENAI_API_KEY not configured.' });
  }

  try {
    const { message } = request.body;

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "gpt-3.5-turbo",
    });

    response.status(200).json({ text: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Failed to communicate with the OpenAI API.' });
  }
}
