// Callback route per OAuth Patreon
// Questo file gestisce il redirect da Patreon dopo l'autorizzazione

export default async function handler(req, res) {
  // Solo metodo GET per callback OAuth
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { code, state, error } = req.query;
    
    // Gestisci errori da Patreon
    if (error) {
      return res.redirect(`/?patreon_error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      return res.redirect('/?patreon_error=no_code');
    }
    
    // Configurazione Patreon
    const PATREON_CLIENT_ID = process.env.PATREON_CLIENT_ID || 'NF2MmLVExjXVv4ZpcgijfosjlJIYQuPBblK7vE1PpSPRawgFbKhiVbzq0Nbl1YAf';
    const PATREON_CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET || '8JZGmekMz0KcEs-20TV1mVFZUb4VpPny6vA_XXM_OFm4GwTTrbv7wTkQSzHgjiEm';
    
    // Determina redirect URI
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const redirectUri = `${protocol}://${host}/api/patreon/callback`;
    
    // Scambia code con access token
    const tokenResponse = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: PATREON_CLIENT_ID,
        client_secret: PATREON_CLIENT_SECRET,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Errore scambio token Patreon:', errorText);
      return res.redirect('/?patreon_error=token_exchange_failed');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return res.redirect('/?patreon_error=no_access_token');
    }
    
    // Ottieni informazioni utente da Patreon
    const userResponse = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userResponse.ok) {
      return res.redirect('/?patreon_error=user_info_failed');
    }
    
    const userData = await userResponse.json();
    const patreonUserId = userData.data?.id;
    
    if (!patreonUserId) {
      return res.redirect('/?patreon_error=no_user_id');
    }
    
    // Reindirizza alla pagina principale con i dati
    // In produzione, questi dati verranno salvati dopo che l'utente fa login
    // Per ora, li passiamo come parametri URL (in produzione usa session o token)
    return res.redirect(`/?patreon_linked=true&patreon_user_id=${patreonUserId}&patreon_token=${encodeURIComponent(accessToken)}`);
    
  } catch (error) {
    console.error('Errore callback Patreon:', error);
    return res.redirect(`/?patreon_error=${encodeURIComponent(error.message)}`);
  }
}

