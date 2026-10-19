/**
 * Cloudflare Scheduled Worker: Supabase Keepalive
 *
 * Keeps the Supabase project active by making a lightweight REST API query
 * every 3 days to prevent automatic project pausing on the free tier.
 */

export default {
  // HTTP Fetch Handler
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Optional manual trigger endpoint for testing (e.g. /trigger)
    if (url.pathname === '/trigger') {
      const result = await performKeepalive(env);
      return new Response(JSON.stringify(result, null, 2), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Supabase Keepalive Worker Running', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  },

  // Cron Scheduled Handler (runs on cron triggers)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(performKeepalive(env));
  }
};

/**
 * Performs a lightweight REST request against the Supabase database.
 */
async function performKeepalive(env) {
  const supabaseUrl = env.SUPABASE_URL || 'https://ehmqlfawothhtqprdjfl.supabase.co';
  const supabaseKey = env.SUPABASE_ANON_KEY || 'sb_publishable_lqiO9FcD5ZdE3EbScS1HcA_uuWwVdmD';
  const timestamp = new Date().toISOString();

  // Query 1 row from the settings table via Supabase PostgREST API
  const pingUrl = `${supabaseUrl}/rest/v1/settings?select=id&limit=1`;

  try {
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMsg = `HTTP ${response.status} ${response.statusText}: ${errorText}`;
      console.error(`[${timestamp}] ❌ Supabase keepalive ping failed: ${errorMsg}`);
      return { success: false, timestamp, status: response.status, error: errorMsg };
    }

    console.log(`[${timestamp}] ✅ Supabase keepalive ping successful. Response status: ${response.status}`);
    return { success: true, timestamp, status: response.status };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${timestamp}] ❌ Supabase keepalive ping exception: ${errorMsg}`);
    return { success: false, timestamp, status: 0, error: errorMsg };
  }
}
