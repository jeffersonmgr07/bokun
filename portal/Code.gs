/**
 * MY CUSCO TRIP · Acceso privado por correo + teléfono asociado + OTP.
 * Ejecutar como el propietario de la aplicación. Configuración en Script Properties:
 * AUTHORIZED_USERS_JSON = [{"email":"...","country":"PE","phone":"+519...","active":true}, ...]
 * Máximo cinco cuentas. No publicar ni almacenar contraseñas en el HTML.
 * Los registros privados deben vivir en el proyecto de Apps Script o una base de datos protegida.
 */
const OTP_TTL_SECONDS = 300;       // 5 minutos
const SESSION_TTL_SECONDS = 7200;  // 2 horas
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_WINDOW_SECONDS = 900;
const OTP_SEND_MAX = 3;

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('My Cusco Trip · Acceso')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Envío solicitado por el usuario; el correo y el teléfono DEBEN coincidir en la lista privada. */
function requestLoginCode(payload) {
  const generic = {ok:true, message:'Si los datos están autorizados, recibirás un código en tu correo.'};
  const identity = normalizeIdentity_(payload);
  if (!identity) return generic;
  const allowed = findAuthorized_(identity);
  if (!allowed) return generic;
  const key = hash_(identity.email + '|' + identity.country + '|' + identity.phone);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) return generic;
  let code = '';
  try {
    const sendKey = 'send:' + key;
    const state = JSON.parse(cache.get(sendKey) || '{"count":0}');
    if (state.count >= OTP_SEND_MAX) return generic;
    cache.put(sendKey, JSON.stringify({count:state.count+1}), OTP_SEND_WINDOW_SECONDS);
    code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const digest = hash_([key,code,getSecret_()].join(':'));
    cache.put('otp:' + key, JSON.stringify({digest:digest, attempts:0, expire:Date.now()+(OTP_TTL_SECONDS*1000)}), OTP_TTL_SECONDS);
  } finally {
    lock.releaseLock();
  }
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#173b33">'
    +'<h2>My Cusco Trip</h2><p>Este es tu código de acceso:</p>'
    +'<p style="font-size:32px;font-weight:bold;letter-spacing:6px">'+code+'</p>'
    +'<p>Caduca en 5 minutos. No compartas este código.</p></div>';
  MailApp.sendEmail({to:identity.email,subject:'Tu código de acceso · My Cusco Trip',htmlBody:html,body:'Código: '+code+' (vence en 5 minutos)'});
  return generic;
}

/** Código de un solo uso. Las sesiones se validan en cada lectura privada del servidor. */
function verifyLoginCode(payload) {
  const identity = normalizeIdentity_(payload);
  const code = String(payload && payload.code || '').trim();
  if (!identity || !/^\d{6}$/.test(code) || !findAuthorized_(identity)) {
    return {ok:false,message:'No fue posible validar el acceso.'};
  }
  const key = hash_(identity.email + '|' + identity.country + '|' + identity.phone);
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(4000)) return {ok:false,message:'Inténtalo nuevamente.'};
  try {
    const cacheKey = 'otp:' + key;
    const saved = cache.get(cacheKey);
    if (!saved) return {ok:false,message:'Código vencido o no válido.'};
    const state=JSON.parse(saved);
    if (Date.now()>state.expire || state.attempts>=OTP_MAX_ATTEMPTS){cache.remove(cacheKey);return {ok:false,message:'Código vencido o no válido.'};}
    const matching=hash_([key,code,getSecret_()].join(':'))===state.digest;
    if (!matching) {
      state.attempts++;
      if (state.attempts>=OTP_MAX_ATTEMPTS) cache.remove(cacheKey);
      else cache.put(cacheKey,JSON.stringify(state),Math.max(1,Math.floor((state.expire-Date.now())/1000)));
      return {ok:false,message:'Código incorrecto o vencido.'};
    }
    cache.remove(cacheKey);
    const token=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    cache.put('session:'+hash_(token),JSON.stringify({email:identity.email, country:identity.country, phone:identity.phone}),SESSION_TTL_SECONDS);
    return {ok:true,token:token,email:identity.email};
  } finally {
    lock.releaseLock();
  }
}

function validateSession(token) {
  const session=getSession_(token);
  return session ? {ok:true,email:session.email} : {ok:false};
}

/** Jamás entrega el dashboard antes de comprobar la sesión en el servidor. */
function getDashboardHtml(token) {
  if (!getSession_(token)) throw new Error('Sesión vencida. Ingresa nuevamente.');
  let html;
  try {html=HtmlService.createHtmlOutputFromFile('Dashboard').getContent();}
  catch(err){throw new Error('Falta incorporar Dashboard.html en este proyecto de Apps Script.');}
  const css=HtmlService.createHtmlOutputFromFile('Theme').getContent();
  const js=HtmlService.createHtmlOutputFromFile('UiBridge').getContent();
  // Los recursos gráficos públicos pueden seguir usando las rutas existentes. No se cargan datos públicos aquí.
  const base='<base href="https://viatorsupplier.github.io/mycuscotrip/">';
  html=html.replace(/<head([^>]*)>/i,'<head$1>'+base);
  html=html.replace(/<\/head>/i,'<style id="mct-own-theme">'+css+'</style></head>');
  html=html.replace(/<\/body>/i,'<script>'+js.replace(/<\/script/gi,'<\\/script')+'<\/script></body>');
  return html;
}

function logoutSession(token) {
  if (typeof token==='string' && /^[a-f0-9]{64}$/i.test(token)) {
    CacheService.getScriptCache().remove('session:'+hash_(token));
  }
  return {ok:true};
}

// Funciones privadas (no accesibles desde google.script.run)
function getSession_(token) {
  if (typeof token!=='string'|| !/^[a-f0-9]{64}$/i.test(token)) return null;
  const value=CacheService.getScriptCache().get('session:'+hash_(token));
  if (!value) return null;
  const session=JSON.parse(value);
  return findAuthorized_({email:session.email,country:session.country,phone:session.phone}) ? session : null;
}
function normalizeIdentity_(input) {
  if (!input || typeof input!=='object') return null;
  const email=String(input.email||'').trim().toLowerCase();
  const country=String(input.country||'').trim().toUpperCase();
  const national=String(input.nationalNumber||'').replace(/\D/g,'');
  const dial=COUNTRY_DIAL_MAP[country];
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!dial||national.length<5||national.length>14)return null;
  const phone=dial+national;
  if(phone.replace(/\D/g,'').length>15)return null;
  return {email:email,country:country,phone:phone};
}
function findAuthorized_(identity) {
  if(!identity) return null;
  const raw=PropertiesService.getScriptProperties().getProperty('AUTHORIZED_USERS_JSON')||'[]';
  let list;
  try{list=JSON.parse(raw);}catch(e){throw new Error('Configuración de usuarios inválida.');}
  if(!Array.isArray(list)||list.length>5)throw new Error('Configure entre 1 y 5 usuarios autorizados.');
  return list.find(u=>u&&u.active!==false&&String(u.email||'').trim().toLowerCase()===identity.email&&String(u.country||'').trim().toUpperCase()===identity.country&&String(u.phone||'').trim()===identity.phone)||null;
}
function getSecret_() {
  const props=PropertiesService.getScriptProperties();
  let key=props.getProperty('OTP_SIGNING_KEY');
  if (!key) {
    const lock=LockService.getScriptLock();
    // Aquí solo se llama dentro del lock principal, evitar anidamiento.
    key=Utilities.getUuid()+Utilities.getUuid();
    props.setProperty('OTP_SIGNING_KEY',key);
  }
  return key;
}
function hash_(input) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
}
