// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify JWT and get User ID
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) throw new Error('Invalid token')

    const { itemName, dropPercent, price, itemId } = await req.json()

    // 1. Fetch user's webhook from their profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('discord_webhook')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.discord_webhook) {
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Send to Discord
    const discordResponse = await fetch(profile.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "FlipTo5B Terminal",
        embeds: [{
          title: `🚨 Panic Wick Detected: ${itemName}`,
          color: 0xe11d48, // Rose-600
          fields: [
            { name: "Drop Magnitude", value: `-${dropPercent.toFixed(1)}%`, inline: true },
            { name: "Current Price", value: new Intl.NumberFormat().format(price) + ' gp', inline: true },
            { name: "Market Link", value: `[View on Wiki](https://prices.runescape.wiki/osrs/item/${itemId})` }
          ],
          footer: { text: "FlipTo5B Real-Time Monitoring" },
          timestamp: new Date().toISOString()
        }]
      })
    })

    if (!discordResponse.ok) {
      throw new Error(`Discord API error: ${discordResponse.status}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Notification error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})