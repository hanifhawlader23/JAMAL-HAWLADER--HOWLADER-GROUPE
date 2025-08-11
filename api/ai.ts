
import { GoogleGenAI } from '@google/genai';

// IMPORTANT: Set the runtime to edge for best streaming performance
export const runtime = 'edge';

export default async function POST(req: Request) {
  try {
    // Read the prompt and data context from the request body
    const { prompt, dataContext } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const systemInstruction = `You are an expert sales analyst for a textile management company. Your name is 'Hawlder AI'. You will be given sales data in JSON format and a user's question. Analyze the data to answer the user's question concisely and accurately. Present key data points in your response. Format your response using simple markdown (bolding with **, lists with * ). If the question is unrelated to the provided data or sales analysis, politely decline to answer. Start your response with a friendly greeting. The current date is ${new Date().toLocaleDateString()}.`;
    
    const fullPrompt = `Here is the sales data context:\n\`\`\`json\n${dataContext}\n\`\`\`\n\nHere is my question:\n"${prompt}"`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // Create a new stream that we can pipe the AI response to.
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of responseStream) {
          const chunkText = chunk.text;
          // Encode the text and enqueue it to our stream.
          controller.enqueue(new TextEncoder().encode(chunkText));
        }
        controller.close();
      },
    });

    // Return the streaming response.
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('Error in AI API route:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
