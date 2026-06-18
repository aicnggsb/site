(function () {
  const PASSWORD_HASH = '25ae717047642f7c97823156ccda8b9f3ded9d47f292ec376f16d7db65f3815a';
  const STORAGE_KEY = 'siteAccessGranted';
  const STYLE_ID = 'private-access-style';

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.private-access-lock body > :not(.private-access-overlay) { display: none !important; }
      .private-access-overlay {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: linear-gradient(135deg, #0f172a, #2563eb);
        color: #0f172a;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .private-access-card {
        width: min(100%, 420px);
        background: #ffffff;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.35);
        text-align: center;
      }
      .private-access-card h1 { margin: 0 0 0.75rem; font-size: 1.7rem; }
      .private-access-card p { margin: 0 0 1.25rem; color: #475569; }
      .private-access-card label { display: block; margin-bottom: 0.5rem; font-weight: 700; text-align: left; }
      .private-access-card input {
        width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 0.65rem;
        padding: 0.85rem 1rem; font: inherit;
      }
      .private-access-card button {
        width: 100%; margin-top: 1rem; border: 0; border-radius: 0.65rem;
        padding: 0.9rem 1rem; font: inherit; font-weight: 700; cursor: pointer;
        color: #ffffff; background: #2563eb;
      }
      .private-access-error { min-height: 1.5rem; margin-top: 0.75rem; color: #dc2626; font-weight: 700; }
    `;
    document.head.appendChild(style);
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    return bytesToHex(await crypto.subtle.digest('SHA-256', data));
  }

  function unlock() {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    document.documentElement.classList.remove('private-access-lock');
    document.querySelector('.private-access-overlay')?.remove();
  }

  function buildOverlay() {
    const overlay = document.createElement('main');
    overlay.className = 'private-access-overlay';
    overlay.innerHTML = `
      <form class="private-access-card" autocomplete="off">
        <h1>Site privé</h1>
        <p>Veuillez saisir le mot de passe pour accéder au contenu.</p>
        <label for="private-access-password">Mot de passe</label>
        <input id="private-access-password" name="password" type="password" required autofocus>
        <button type="submit">Entrer</button>
        <div class="private-access-error" aria-live="polite"></div>
      </form>
    `;
    overlay.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const input = overlay.querySelector('input');
      const error = overlay.querySelector('.private-access-error');
      const isValid = await hashPassword(input.value) === PASSWORD_HASH;
      if (isValid) {
        unlock();
      } else {
        error.textContent = 'Mot de passe incorrect.';
        input.value = '';
        input.focus();
      }
    });
    document.body.prepend(overlay);
  }

  if (sessionStorage.getItem(STORAGE_KEY) === 'true') return;
  document.documentElement.classList.add('private-access-lock');
  addStyle();
  if (document.body) buildOverlay();
  else document.addEventListener('DOMContentLoaded', buildOverlay, { once: true });
}());
