// Supabase Edge Function — crea el pago de Mercado Pago (Checkout Pro)
// Secreto necesario: MP_ACCESS_TOKEN. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son automáticos.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SITE = (Deno.env.get("SITE_URL") || "https://behuman-m68d.vercel.app").replace(/\/+$/, "");
  if (!MP_TOKEN || !SB_URL || !SB_KEY) return json({ error: "Falta el secreto MP_ACCESS_TOKEN" }, 500);

  try {
    const { program_id, user_id, email, name } = await req.json();
    if (!program_id || !user_id || !email) return json({ error: "Faltan datos: program_id, user_id, email" }, 400);

    const sb = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" };

    // Precio REAL desde la base (nunca confiar en el cliente)
    const prog = (await (await fetch(`${SB_URL}/rest/v1/programs?id=eq.${program_id}&select=id,name,price&limit=1`, { headers: sb })).json())[0];
    if (!prog) return json({ error: "Programa no encontrado" }, 404);
    const price = Number(prog.price) || 0;
    if (price <= 0) return json({ error: "El programa no tiene un precio válido" }, 400);

    // Crear la orden (pendiente)
    const orderBody = {
      user_id, customer_name: name || email, customer_email: email,
      total: price, payment_method: "mercadopago", status: "pending",
      items: JSON.stringify([{ program_id: prog.id, programa: prog.name, precio: price }]),
      created_at: new Date().toISOString(),
    };
    const order = (await (await fetch(`${SB_URL}/rest/v1/orders`, { method: "POST", headers: { ...sb, Prefer: "return=representation" }, body: JSON.stringify(orderBody) })).json())[0];
    if (!order?.id) return json({ error: "No se pudo crear la orden" }, 500);

    // Crear la preferencia en Mercado Pago
    const pref = {
      items: [{ title: prog.name, quantity: 1, unit_price: price, currency_id: "ARS" }],
      payer: { email },
      external_reference: String(order.id),
      back_urls: { success: SITE + "/?mp=success", pending: SITE + "/?mp=pending", failure: SITE + "/?mp=failure" },
      auto_return: "approved",
      notification_url: `${SB_URL}/functions/v1/mp-webhook`,
      statement_descriptor: "BE HUMAN",
    };
    const mp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { Authorization: "Bearer " + MP_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(pref),
    });
    const mpData = await mp.json();
    if (!mp.ok || !mpData.init_point) return json({ error: "Error de Mercado Pago", detail: mpData }, 502);

    return json({ init_point: mpData.init_point, order_id: order.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
