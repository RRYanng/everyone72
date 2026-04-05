// ============================================================
// Supabase Edge Function: analyze-round
// 代理 Claude API 调用，保护 API key 不暴露给客户端
//
// 部署命令：
//   supabase functions deploy analyze-round
//
// 设置密钥（在 Supabase Dashboard > Functions > Secrets）：
//   ANTHROPIC_API_KEY = sk-ant-...
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// CORS headers — allow calls from Expo app (native + web preview)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // 1. Validate that request comes from an authenticated Supabase user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse the request body
    const body = await req.json();
    const { prompt } = body as { prompt: string };

    if (!prompt || typeof prompt !== 'string' || prompt.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Retrieve API key from Deno environment (set via Supabase secrets)
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('[analyze-round] ANTHROPIC_API_KEY secret not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Call Claude API
    const claudeRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text();
      console.error('[analyze-round] Claude API error:', claudeRes.status, errorText);
      return new Response(
        JSON.stringify({ error: `Claude API error: ${claudeRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await claudeRes.json();
    const analysisText: string = data.content[0].text;

    // 5. Return the analysis text
    return new Response(
      JSON.stringify({ analysis: analysisText }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[analyze-round] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
