// eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

    const { apiKey, type, data } = await req.json()

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API Key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Validate API Key and get User ID
    const { data: keyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('user_id')
      .eq('key_value', apiKey)
      .single()

    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API Key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = keyData.user_id

    // 2. Handle Data Types
    let result

    if (type === 'update_slot') {
      // Data expected: { slot: 0-7, state: 'EMPTY' | 'ACTIVE', item_id?, ... }

      if (data.state === 'EMPTY') {
        // Delete offer in this slot
        result = await supabaseClient
          .from('active_offers')
          .delete()
          .match({ user_id: userId, slot: data.slot })
      } else {
        // Upsert offer
        // We match on (user_id, slot) thanks to the unique index
        result = await supabaseClient
          .from('active_offers')
          .upsert({
            user_id: userId,
            slot: data.slot,
            item_id: data.itemId,
            item_name: data.itemName,
            offer_type: data.offerType, // 'buy' or 'sell'
            price: data.price,
            quantity: data.quantity,
            timestamp: Date.now()
          }, { onConflict: 'user_id, slot' })
      }
    } else if (type === 'log_trade') {
      // Insert history
      result = await supabaseClient
        .from('trades')
        .insert({
          user_id: userId,
          item_id: data.itemId,
          item_name: data.itemName,
          buy_price: data.buyPrice,
          sell_price: data.sellPrice,
          quantity: data.quantity,
          profit: data.profit,
          timestamp: Date.now()
        })
    } else {
      throw new Error("Unknown event type")
    }

    if (result.error) {
      console.error("DB Error", result.error)
      throw result.error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})