// Vercel Serverless Function — crea el pago de Mercado Pago (Checkout Pro)
// Variables de entorno necesarias: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  const SB_URL   = process.env.SUPABASE_URL;
  const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE;
  if (!MP_TOKEN || !SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Faltan variables de entorno en Vercel (MP_ACCESS_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE)' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { program_id, user_id, email, name } = body;
    if (!program_id || !user_id || !email) {
      return res.status(400).json({ error: 'Faltan datos: program_id, user_id, email' });
    }

    const sb = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };

    // 1) Precio REAL del programa desde la base (nunca confiar en el cliente)
    const pr = await fetch(`${SB_URL}/rest/v1/programs?id=eq.${program_id}&select=id,name,price&limit=1`, { headers: sb });
    const prog = (await pr.json())[0];
    if (!prog) return res.status(404).json({ error: 'Programa no encontrado' });
    const price = Number(prog.price) || 0;
    if (price <= 0) return res.status(400).json({ error: 'El programa no tiene un precio válido' });

    // 2) Crear la orden (pendiente)
    const orderBody = {
      user_id,
      customer_name:  name || email,
      customer_email: email,
      total:          price,
      payment_method: 'mercadopago',
      status:         'pending',
      items:          JSON.stringify([{ program_id: prog.id, programa: prog.name, precio: price }]),
      created_at:     new Date().toISOString()
    };
    const or = await fetch(`${SB_URL}/rest/v1/orders`, {
      method: 'POST', headers: { ...sb, 'Prefer': 'return=representation' }, body: JSON.stringify(orderBody)
    });
    const order = (await or.json())[0];
    if (!order || !order.id) return res.status(500).json({ error: 'No se pudo crear la orden' });

    // 3) Crear la preferencia en Mercado Pago
    const site = (process.env.SITE_URL || ('https://' + req.headers.host)).replace(/\/+$/, '');
    const pref = {
      items: [{ title: prog.name, quantity: 1, unit_price: price, currency_id: 'ARS' }],
      payer: { email },
      external_reference: String(order.id),
      back_urls: {
        success: site + '/?mp=success',
        pending: site + '/?mp=pending',
        failure: site + '/?mp=failure'
      },
      auto_return: 'approved',
      notification_url: site + '/api/mp-webhook',
      statement_descriptor: 'BE HUMAN'
    };
    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref)
    });
    const mpData = await mp.json();
    if (!mp.ok || !mpData.init_point) {
      return res.status(502).json({ error: 'Error de Mercado Pago', detail: mpData });
    }

    return res.status(200).json({ init_point: mpData.init_point, order_id: order.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
