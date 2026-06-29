"use strict";

(function attachUIChatSimpleAuth(window, document) {
  const COOKIE_NAME = "ui_chat_admin_auth";
  const COOKIE_PATH = "/";
  const COOKIE_MAX_AGE_DAYS = 30;
  const CONFIG_CANDIDATES = ["./config.ini", "config.ini", "../config.ini", "../../config.ini", "/UI_chat/config.ini"];
  const BODY_PENDING_VALUE = "pending";
  const ACCESS_PAGE_BASENAME = "access.html";

  let configPromise = null;

  function parseIni(content) {
    const config = {};
    const lines = String(content || "").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || line.startsWith(";")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key) config[key] = value;
    }
    return config;
  }

  async function loadConfig() {
    if (!configPromise) {
      configPromise = (async () => {
        let lastError = null;
        for (const path of CONFIG_CANDIDATES) {
          try {
            const response = await fetch(path, { cache: "no-store" });
            if (!response.ok) throw new Error(`CONFIG_HTTP_${response.status}`);
            const parsed = parseIni(await response.text());
            if (!Object.keys(parsed).length) throw new Error(`CONFIG_INVALID_${path}`);
            if (!normalizeConfigKey(parsed.ADMIN_ACCESS_KEY)) throw new Error(`CONFIG_MISSING_ADMIN_ACCESS_KEY_${path}`);
            return parsed;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error("CONFIG_NOT_FOUND");
      })();
    }
    return configPromise;
  }

  function readCookie(name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function writeCookie(name, value, days) {
    const expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiresAt.toUTCString()}; path=${COOKIE_PATH}; SameSite=Lax`;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${COOKIE_PATH}; SameSite=Lax`;
  }

  function revealBody() {
    if (!document.body) return;
    document.body.setAttribute("data-auth-state", "ready");
  }

  function normalizeConfigKey(value) {
    return String(value || "").trim();
  }

  function buildNextValue() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function normalizeRedirectTarget(rawTarget, fallbackTarget) {
    const fallbackUrl = new URL(fallbackTarget, window.location.href);
    if (!rawTarget) return fallbackUrl.href;

    try {
      const candidate = new URL(rawTarget, window.location.href);
      if (candidate.origin !== window.location.origin) return fallbackUrl.href;
      if (candidate.pathname.endsWith(`/${ACCESS_PAGE_BASENAME}`) || candidate.pathname.endsWith(ACCESS_PAGE_BASENAME)) {
        return fallbackUrl.href;
      }
      return candidate.href;
    } catch {
      return fallbackUrl.href;
    }
  }

  function redirectToAccess(accessPage) {
    const accessUrl = new URL(accessPage, window.location.href);
    accessUrl.searchParams.set("next", buildNextValue());
    window.location.replace(accessUrl.href);
  }

  function getNextTarget(defaultRedirect) {
    const params = new URLSearchParams(window.location.search);
    return normalizeRedirectTarget(params.get("next"), defaultRedirect);
  }

  async function md5(input) {
    return md5Hex(normalizeConfigKey(input));
  }

  async function getExpectedHash() {
    const config = await loadConfig();
    const storedHash = normalizeConfigKey(config.ADMIN_ACCESS_KEY).toLowerCase();
    if (!storedHash) throw new Error("ADMIN_ACCESS_KEY_MISSING");
    if (!/^[a-f0-9]{32}$/.test(storedHash)) throw new Error("ADMIN_ACCESS_KEY_INVALID_MD5");
    return storedHash;
  }

  async function hasValidCookie() {
    const current = normalizeConfigKey(readCookie(COOKIE_NAME));
    if (!current) return false;
    const expected = await getExpectedHash();
    return current === expected;
  }

  async function refreshCookieIfValid() {
    const expected = await getExpectedHash();
    writeCookie(COOKIE_NAME, expected, COOKIE_MAX_AGE_DAYS);
    return expected;
  }

  async function guardPage(options = {}) {
    const accessPage = options.accessPage || "./access.html";
    try {
      const isValid = await hasValidCookie();
      if (!isValid) {
        deleteCookie(COOKIE_NAME);
        redirectToAccess(accessPage);
        return new Promise(() => {});
      }
      await refreshCookieIfValid();
      revealBody();
      return true;
    } catch (error) {
      revealBody();
      throw error;
    }
  }

  function renderFatalError(message) {
    if (!document.body) return;
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(145deg,#f6f9ff,#ecf2ff);font-family:'IBM Plex Sans','Avenir Next','Segoe UI',sans-serif;color:#0d223d;">
        <section style="max-width:560px;width:100%;background:#ffffff;border:1px solid #d5e2f5;border-radius:18px;box-shadow:0 18px 40px rgba(8,44,92,0.12);padding:24px;">
          <h1 style="margin:0 0 10px;font-size:1.2rem;">Accès indisponible</h1>
          <p style="margin:0;color:#4f6585;line-height:1.45;">${escapeHtml(message)}</p>
        </section>
      </main>
    `;
    revealBody();
  }

  async function initAccessPage(options = {}) {
    const defaultRedirect = options.defaultRedirect || "./admin.html";
    const form = document.getElementById(options.formId || "accessForm");
    const input = document.getElementById(options.inputId || "accessKey");
    const errorEl = document.getElementById(options.errorId || "accessError");
    const statusEl = document.getElementById(options.statusId || "accessStatus");

    if (!form || !input) throw new Error("ACCESS_PAGE_MISCONFIGURED");

    try {
      if (await hasValidCookie()) {
        await refreshCookieIfValid();
        window.location.replace(getNextTarget(defaultRedirect));
        return;
      }

      deleteCookie(COOKIE_NAME);
      if (statusEl) statusEl.textContent = "Saisissez la clé d'accès pour continuer.";
      revealBody();
      input.focus();
    } catch (error) {
      if (statusEl) statusEl.textContent = "Impossible de charger la configuration d'accès.";
      revealBody();
      throw error;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (errorEl) errorEl.textContent = "";
      if (statusEl) statusEl.textContent = "Vérification de la clé...";

      try {
        const enteredHash = await md5(input.value);
        const expectedHash = await getExpectedHash();
        if (enteredHash !== expectedHash) {
          deleteCookie(COOKIE_NAME);
          if (errorEl) errorEl.textContent = "Clé invalide.";
          if (statusEl) statusEl.textContent = "Accès refusé.";
          input.select();
          return;
        }

        writeCookie(COOKIE_NAME, expectedHash, COOKIE_MAX_AGE_DAYS);
        if (statusEl) statusEl.textContent = "Accès validé. Redirection...";
        window.location.replace(getNextTarget(defaultRedirect));
      } catch (error) {
        deleteCookie(COOKIE_NAME);
        if (errorEl) errorEl.textContent = "Impossible de vérifier la clé.";
        if (statusEl) statusEl.textContent = "Erreur de configuration.";
        throw error;
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function md5Hex(input) {
    return hex(md51(input));
  }

  function md51(string) {
    const text = unescape(encodeURIComponent(string));
    const blocks = [];
    for (let i = 0; i < text.length; i += 64) {
      blocks.push(text.substring(i, i + 64));
    }

    let state = [1732584193, -271733879, -1732584194, 271733878];
    let tail = [];
    let length = text.length;

    for (let i = 0; i < blocks.length - 1; i += 1) {
      state = md5cycle(state, md5blk(blocks[i]));
    }

    const last = blocks.length ? blocks[blocks.length - 1] : "";
    tail = md5blk(last);
    const index = length % 64;
    tail[index >> 2] |= 0x80 << ((index % 4) << 3);
    if (index > 55) {
      state = md5cycle(state, tail);
      tail = new Array(16).fill(0);
    }
    tail[14] = length * 8;
    state = md5cycle(state, tail);
    return state;
  }

  function md5blk(string) {
    const blocks = new Array(16).fill(0);
    for (let i = 0; i < 64; i += 1) {
      blocks[i >> 2] |= (string.charCodeAt(i) || 0) << ((i % 4) << 3);
    }
    return blocks;
  }

  function md5cycle(x, k) {
    let [a, b, c, d] = x;

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
    return x;
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function hex(x) {
    const alphabet = "0123456789abcdef";
    let output = "";
    for (let i = 0; i < x.length; i += 1) {
      for (let j = 0; j < 4; j += 1) {
        const value = (x[i] >> (j * 8)) & 0xff;
        output += alphabet[(value >>> 4) & 0x0f] + alphabet[value & 0x0f];
      }
    }
    return output;
  }

  function add32(a, b) {
    return (a + b) & 0xffffffff;
  }

  window.UIChatSimpleAuth = {
    guardPage,
    initAccessPage,
    renderFatalError,
    revealBody,
    md5,
    loadConfig
  };
})(window, document);
