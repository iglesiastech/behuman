// Supabase Edge Function — webhook de Mercado Pago.
// Al aprobarse el pago: marca la orden pagada y crea la membresía (acceso automático).
// Desplegar con --no-verify-jwt (Mercado Pago no envía JWT).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function ok(obj: unknown) {
  return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  const MP_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const SB_URL = Deno.env.get("SUPABASE_URL");
  const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Siempre 200 para que Mercado Pago no reintente infinitamente.
  if (!MP_TOKEN || !SB_URL || !SB_KEY) return ok({ error: "env faltante" });

  try {
    const url = new URL(req.url);
    let body: any = {};
    try { body = await req.json(); } catch { /* puede venir vacío */ }
    const type = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const paymentId = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    if (type !== "payment" || !paymentId) return ok({ ignored: true });

    // Traer el pago desde Mercado Pago
    const payment = await (await fetch("https://api.mercadopago.com/v1/payments/" + paymentId, { headers: { Authorization: "Bearer " + MP_TOKEN } })).json();
    if (payment.status !== "approved") return ok({ status: payment.status });

    const orderId = payment.external_reference;
    if (!orderId) return ok({ noRef: true });

    const sb = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" };
    const order = (await (await fetch(`${SB_URL}/rest/v1/orders?id=eq.${orderId}&select=*&limit=1`, { headers: sb })).json())[0];
    if (!order) return ok({ orderNotFound: true });
    if (order.status === "paid") return ok({ alreadyPaid: true }); // idempotencia

    const items = typeof order.items === "string" ? JSON.parse(order.items || "[]") : (order.items || []);
    const program_id = items[0]?.program_id;
    const user_id = order.user_id;

    // Marcar la orden como pagada
    await fetch(`${SB_URL}/rest/v1/orders?id=eq.${orderId}`, { method: "PATCH", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify({ status: "paid", payment_method: "mercadopago", updated_at: new Date().toISOString() }) });

    // Dar acceso: crear (o reactivar) la membresía
    if (user_id && program_id) {
      const exist = await (await fetch(`${SB_URL}/rest/v1/memberships?user_id=eq.${user_id}&program_id=eq.${program_id}&select=id&limit=1`, { headers: sb })).json();
      if (Array.isArray(exist) && exist.length) {
        await fetch(`${SB_URL}/rest/v1/memberships?user_id=eq.${user_id}&program_id=eq.${program_id}`, { method: "PATCH", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify({ status: "active" }) });
      } else {
        await fetch(`${SB_URL}/rest/v1/memberships`, { method: "POST", headers: { ...sb, Prefer: "return=minimal" }, body: JSON.stringify({ user_id, program_id, status: "active", access_type: "purchased", notes: "Pago Mercado Pago · Orden " + orderId, created_at: new Date().toISOString() }) });
      }
    }
    return ok({ ok: true });
  } catch (e) {
    return ok({ error: String((e as Error)?.message || e) });
  }
});
