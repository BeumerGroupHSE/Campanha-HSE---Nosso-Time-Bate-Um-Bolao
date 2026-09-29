/*
 * Login do modo administrador — compartilhado por index.html (placar), ros.html e analise.html.
 *
 * Como funciona:
 *  - Quem quer entrar como admin clica em "Acesso admin" no rodapé (ou abre o link com ?admin=1).
 *  - Abre uma janelinha pedindo a senha. A senha é conferida no Apps Script (que guarda a
 *    senha verdadeira nas "Propriedades do script" — ela não aparece em lugar nenhum do site).
 *  - Se estiver certa, o navegador lembra do login por 7 dias. Toda gravação (pontos, ROS,
 *    comentários, data do contador) envia essa senha junto, e o Apps Script recusa qualquer
 *    gravação sem ela.
 *
 * Este arquivo precisa ser carregado ANTES do <script> principal de cada página.
 */
(function(){
  const API_URL = 'https://script.google.com/macros/s/AKfycby7orhf31seXoADvA2JWeVBRhwsZzbsaaMZ-orXeCgE0r5hAaEB2fsvB0sOn10BVgsveA/exec';
  const STORAGE_KEY = 'hseAdminSession';
  const SESSION_DAYS = 7;

  // Limpa o sinalizador antigo (antes do login bastava ?admin=1) pra ninguém continuar "admin" sem senha.
  try{ localStorage.removeItem('hseAdminMode'); }catch(e){}

  const TXT = {
    pt: {
      open:'Acesso admin', title:'Acesso do administrador',
      sub:'Digite a senha de administrador para liberar a edição e a análise.',
      placeholder:'Senha', enter:'Entrar', cancel:'Cancelar', checking:'Verificando...',
      wrong:'Senha incorreta.', locked:'Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.',
      notset:'A senha de administrador ainda não foi configurada no Apps Script.',
      conn:'Não foi possível conectar. Verifique a internet e tente de novo.',
      expired:'Sua sessão de administrador expirou ou a senha mudou. Entre novamente.',
      show:'Mostrar senha', hide:'Ocultar senha'
    },
    en: {
      open:'Admin access', title:'Administrator access',
      sub:'Enter the administrator password to unlock editing and analytics.',
      placeholder:'Password', enter:'Sign in', cancel:'Cancel', checking:'Checking...',
      wrong:'Wrong password.', locked:'Too many wrong attempts. Please wait a few minutes and try again.',
      notset:'The administrator password has not been set up in Apps Script yet.',
      conn:'Could not connect. Check your internet connection and try again.',
      expired:'Your admin session expired or the password changed. Please sign in again.',
      show:'Show password', hide:'Hide password'
    },
    de: {
      open:'Admin-Zugang', title:'Administrator-Zugang',
      sub:'Geben Sie das Administratorpasswort ein, um Bearbeitung und Analyse freizuschalten.',
      placeholder:'Passwort', enter:'Anmelden', cancel:'Abbrechen', checking:'Wird geprüft...',
      wrong:'Falsches Passwort.', locked:'Zu viele Fehlversuche. Bitte warten Sie einige Minuten.',
      notset:'Das Administratorpasswort wurde im Apps Script noch nicht eingerichtet.',
      conn:'Keine Verbindung möglich. Bitte Internetverbindung prüfen.',
      expired:'Ihre Admin-Sitzung ist abgelaufen oder das Passwort wurde geändert. Bitte erneut anmelden.',
      show:'Passwort anzeigen', hide:'Passwort verbergen'
    }
  };
  function tx(key){
    let lang = 'pt';
    try{ lang = localStorage.getItem('campanhaLang') || 'pt'; }catch(e){}
    return (TXT[lang] || TXT.pt)[key] || TXT.pt[key];
  }

  function readSession(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      const s = JSON.parse(raw);
      if(!s || !s.k || !s.exp || Date.now() > s.exp){ localStorage.removeItem(STORAGE_KEY); return null; }
      return s;
    }catch(e){ return null; }
  }
  function writeSession(key){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ k: key, exp: Date.now() + SESSION_DAYS*24*60*60*1000 }));
    }catch(e){}
  }
  function clearSession(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
  }

  /* ---------------- Visual da janelinha de login ---------------- */
  const css = `
  .hse-auth-overlay{position:fixed; inset:0; z-index:9999; display:none; align-items:center; justify-content:center;
    padding:16px; background:rgba(0,12,18,0.72); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);}
  .hse-auth-overlay.show{display:flex; animation:hseAuthFade .18s ease-out;}
  @keyframes hseAuthFade{from{opacity:0}to{opacity:1}}
  .hse-auth-box{width:100%; max-width:380px; background:#00303E; border:1px solid rgba(255,255,255,0.09);
    border-radius:14px; padding:26px 24px 22px; box-shadow:0 10px 26px rgba(0,0,0,0.36); color:#EAF7FC;
    font-family:'Inter',sans-serif; text-align:left;}
  .hse-auth-icon{width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center;
    background:rgba(0,159,227,0.14); border:1px solid rgba(0,159,227,0.4); color:#6BD0F7; margin-bottom:14px;}
  .hse-auth-box h2{font-family:'Oswald',sans-serif; font-size:20px; font-weight:600; margin:0 0 6px; letter-spacing:.3px;}
  .hse-auth-box p.hse-auth-sub{margin:0 0 18px; font-size:13px; line-height:1.5; color:#7FAFC2;}
  .hse-auth-field{position:relative;}
  .hse-auth-field input{width:100%; box-sizing:border-box; padding:12px 44px 12px 14px; border-radius:10px;
    background:rgba(0,24,33,0.7); border:1px solid rgba(255,255,255,0.14); color:#EAF7FC; font-size:15px;
    font-family:'Inter',sans-serif; outline:none; transition:border-color .15s, box-shadow .15s;}
  .hse-auth-field input:focus{border-color:#009FE3; box-shadow:0 0 0 3px rgba(0,159,227,0.22);}
  .hse-auth-field input.err{border-color:#EF4444;}
  .hse-auth-eye{position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:0;
    color:#7FAFC2; cursor:pointer; padding:6px; display:flex; border-radius:6px;}
  .hse-auth-eye:hover{color:#6BD0F7;}
  .hse-auth-msg{min-height:18px; margin:10px 0 0; font-size:12.5px; color:#FCA5A5; line-height:1.4;}
  .hse-auth-msg.info{color:#7FAFC2;}
  .hse-auth-actions{display:flex; gap:10px; margin-top:14px;}
  .hse-auth-actions button{flex:1; padding:11px 14px; border-radius:10px; font-family:'Oswald',sans-serif;
    font-size:14px; font-weight:600; letter-spacing:.4px; cursor:pointer; border:1px solid transparent;}
  .hse-auth-cancel{background:transparent; border-color:rgba(255,255,255,0.16) !important; color:#CBD9DF;}
  .hse-auth-cancel:hover{background:rgba(255,255,255,0.06);}
  .hse-auth-submit{background:#009FE3; color:#031A22;}
  .hse-auth-submit:hover{background:#22B2EE;}
  .hse-auth-submit:disabled{opacity:.6; cursor:wait;}
  .hse-auth-shake{animation:hseAuthShake .32s;}
  @keyframes hseAuthShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
  @media print{.hse-auth-overlay, #adminLoginBtn{display:none !important;}}
  `;

  const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  let overlay = null, onSuccessTarget = null;

  function build(){
    if(overlay) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    overlay = document.createElement('div');
    overlay.className = 'hse-auth-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <form class="hse-auth-box" autocomplete="on" novalidate>
        <div class="hse-auth-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 data-hse-auth="title"></h2>
        <p class="hse-auth-sub" data-hse-auth="sub"></p>
        <input type="text" name="username" value="admin" autocomplete="username" style="display:none" aria-hidden="true" tabindex="-1">
        <div class="hse-auth-field">
          <input type="password" name="password" autocomplete="current-password" required>
          <button type="button" class="hse-auth-eye"></button>
        </div>
        <div class="hse-auth-msg" aria-live="polite"></div>
        <div class="hse-auth-actions">
          <button type="button" class="hse-auth-cancel" data-hse-auth="cancel"></button>
          <button type="submit" class="hse-auth-submit" data-hse-auth="enter"></button>
        </div>
      </form>`;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('form');
    const input = overlay.querySelector('input[type="password"], input[name="password"]');
    const eye = overlay.querySelector('.hse-auth-eye');
    const msg = overlay.querySelector('.hse-auth-msg');
    const submit = overlay.querySelector('.hse-auth-submit');

    eye.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      eye.innerHTML = showing ? EYE : EYE_OFF;
      eye.setAttribute('aria-label', showing ? tx('show') : tx('hide'));
      input.focus();
    });
    overlay.querySelector('.hse-auth-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && overlay.classList.contains('show')) close(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const senha = input.value;
      if(!senha){ input.focus(); return; }
      submit.disabled = true;
      msg.className = 'hse-auth-msg info';
      msg.textContent = tx('checking');
      input.classList.remove('err');
      try{
        const res = await fetch(API_URL, {
          method:'POST',
          headers:{ 'Content-Type':'text/plain;charset=utf-8' },
          body: JSON.stringify({ type:'auth', senha: senha })
        });
        const json = await res.json();
        if(json.ok){
          writeSession(senha);
          const target = onSuccessTarget || cleanUrl();
          window.location.href = target;
          return;
        }
        msg.className = 'hse-auth-msg';
        msg.textContent = json.error === 'bloqueado' ? tx('locked')
                        : json.error === 'senha_nao_configurada' ? tx('notset')
                        : tx('wrong');
        input.classList.add('err');
        form.classList.remove('hse-auth-shake'); void form.offsetWidth; form.classList.add('hse-auth-shake');
        input.select();
      }catch(err){
        msg.className = 'hse-auth-msg';
        msg.textContent = tx('conn');
      }finally{
        submit.disabled = false;
      }
    });
  }

  function refreshTexts(){
    overlay.querySelectorAll('[data-hse-auth]').forEach(el => { el.textContent = tx(el.dataset.hseAuth); });
    const input = overlay.querySelector('input[name="password"]');
    input.placeholder = tx('placeholder');
    const eye = overlay.querySelector('.hse-auth-eye');
    eye.innerHTML = EYE;
    eye.setAttribute('aria-label', tx('show'));
    input.type = 'password';
  }

  function open(opts){
    opts = opts || {};
    build();
    refreshTexts();
    onSuccessTarget = opts.redirectTo || null;
    const input = overlay.querySelector('input[name="password"]');
    const msg = overlay.querySelector('.hse-auth-msg');
    input.value = '';
    input.classList.remove('err');
    msg.className = 'hse-auth-msg' + (opts.message ? '' : ' info');
    msg.textContent = opts.message || '';
    overlay.classList.add('show');
    setTimeout(() => input.focus(), 60);
  }
  function close(){
    if(overlay) overlay.classList.remove('show');
  }

  // URL atual sem o ?admin=1 (pra não ficar "sujando" o link depois de entrar)
  function cleanUrl(){
    const u = new URL(window.location.href);
    u.searchParams.delete('admin');
    return u.pathname + (u.search ? u.search : '') + u.hash;
  }

  function logout(redirectTo){
    clearSession();
    window.location.href = redirectTo || cleanUrl();
  }

  // Chamado pelas páginas quando o Apps Script responde "nao_autorizado" numa gravação
  function handleUnauthorized(){
    clearSession();
    open({ message: tx('expired') });
  }

  // Botão discreto "Acesso admin" no rodapé (ao lado de onde aparece o "Sair do modo admin")
  function mountFooterButton(){
    if(readSession()) return;
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if(!logoutBtn || document.getElementById('adminLoginBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'adminLoginBtn';
    btn.className = logoutBtn.className;
    btn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px; margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span></span>';
    btn.querySelector('span').textContent = tx('open');
    btn.addEventListener('click', () => open());
    logoutBtn.parentNode.insertBefore(btn, logoutBtn);
    // acompanha a troca de idioma da página
    document.querySelectorAll('.lang-btn').forEach(b => b.addEventListener('click', () => {
      setTimeout(() => { btn.querySelector('span').textContent = tx('open'); }, 0);
    }));
  }

  function init(){
    mountFooterButton();
    const wantsAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
    if(wantsAdmin){
      if(readSession()){
        // já está logado: só limpa o ?admin=1 do endereço
        try{ history.replaceState(null, '', cleanUrl()); }catch(e){}
      } else {
        open();
      }
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.HSE_AUTH = {
    isLoggedIn: () => !!readSession(),
    getKey: () => { const s = readSession(); return s ? s.k : ''; },
    open: open,
    logout: logout,
    handleUnauthorized: handleUnauthorized
  };
})();
