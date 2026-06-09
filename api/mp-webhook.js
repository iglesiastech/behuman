// Vercel Serverless Function — webhook de Mercado Pago.
// Cuando un pago se aprueba: marca la orden pagada y crea la membresía (acceso automático).
// Variables de entorno: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE
module.exports = async (req, res) => {
  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  const SB_URL   = process.env.SUPABASE_URL;
  const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE;
  // Siempre respondemos 200 para que Mercado Pago no reintente infinitamente.
  if (!MP_TOKEN || !SB_URL || !SB_KEY) return res.status(200).json({ error: 'env vars faltantes' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const type      = body.type || body.topic || req.query.type || req.query.topic;
    const paymentId = (body.data && body.data.id) || req.query['data.id'] || req.query.id;
    if (type !== 'payment' || !paymentId) return res.status(200).json({ ignored: true });

    // 1) Traer el pago desde Mercado Pago
    const pr = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const payment = await pr.json();
    if (payment.status !== 'approved') return res.status(200).json({ status: payment.status });

    const orderId = payment.external_reference;
    if (!orderId) return res.status(200).json({ noRef: true });

    const sb = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

    // 2) Traer la orden
    const or = await fetch(`${SB_URL}/rest/v1/orders?id=eq.${orderId}&select=*&limit=1`, { headers: sb });
    const order = (await or.json())[0];
    if (!order) return res.status(200).json({ orderNotFound: true });
    if (order.status === 'paid') return res.status(200).json({ alreadyPaid: true }); // idempotencia

    const items      = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : (order.items || []);
    const program_id = items[0] && items[0].program_id;
    const user_id    = order.user_id;

    // 3) Marcar la orden como pagada
    await fetch(`${SB_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH', headers: { ...sb, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'paid', payment_method: 'mercadopago', updated_at: new Date().toISOString() })
    });

    // 4) Dar acceso: crear (o reactivar) la membresía
    if (user_id && program_id) {
      const ex = await fetch(`${SB_URL}/rest/v1/memberships?user_id=eq.${user_id}&program_id=eq.${program_id}&select=id&limit=1`, { headers: sb });
      const exist = await ex.json();
      if (Array.isArray(exist) && exist.length) {
        await fetch(`${SB_URL}/rest/v1/memberships?user_id=eq.${user_id}&program_id=eq.${program_id}`, {
          method: 'PATCH', headers: { ...sb, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'active' })
        });
      } else {
        await fetch(`${SB_URL}/rest/v1/memberships`, {
          method: 'POST', headers: { ...sb, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id, program_id, status: 'active', access_type: 'purchased',
            notes: 'Pago Mercado Pago · Orden ' + orderId, created_at: new Date().toISOString()
          })
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
};
