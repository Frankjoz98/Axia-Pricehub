// Proxy server-side hacia Gemini. La API key vive SOLO en variables de entorno de Netlify
// (GEMINI_API_KEY), nunca en el bundle del cliente. Solo usuarios autenticados en Supabase pueden invocarlo.
//
// Variables requeridas en Netlify: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

interface AiRequestBody {
  prompt: string;
  temperature?: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

const GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_PROMPT_LENGTH = 20000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Valida el JWT contra el endpoint de usuario de Supabase (sin dependencias extra)
async function isValidSupabaseUser(authHeader: string | null): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!authHeader?.startsWith('Bearer ') || !supabaseUrl || !anonKey) return false;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: anonKey }
  });
  return res.ok;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY no configurada en el servidor' });

  if (!(await isValidSupabaseUser(req.headers.get('authorization')))) {
    return json(401, { error: 'No autorizado' });
  }

  let body: AiRequestBody;
  try {
    body = (await req.json()) as AiRequestBody;
  } catch {
    return json(400, { error: 'JSON inválido' });
  }
  if (typeof body.prompt !== 'string' || body.prompt.length === 0 || body.prompt.length > MAX_PROMPT_LENGTH) {
    return json(400, { error: 'prompt inválido' });
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: body.prompt }] }],
        generationConfig: {
          temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!geminiRes.ok) {
    return json(502, { error: `Gemini respondió ${geminiRes.status}` });
  }

  const aiData = (await geminiRes.json()) as GeminiResponse;
  const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return json(502, { error: 'Gemini no devolvió candidatos' });

  return json(200, { text });
};

export const config = { path: '/api/ai' };
