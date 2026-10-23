// Relative asset base resolved by the caller against this module location.
export const imageBaseURL = "./";

// Contract for the KM deposit screen. No endpoint or success is fabricated.
export function parseConfig(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
}

export function endpoint(config, operation, test = false) {
  const base = new URL(config.KM_WEBHOOK_BASE_URL);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      base.search || base.hash || !base.pathname.endsWith('/webhook/')) {
    throw new Error('Base de connexion n8n invalide.');
  }
  if (test) base.pathname = base.pathname.replace(/\/webhook\/$/, '/webhook-test/');
  const path = config[`KM_FILES_${operation.toUpperCase()}_WEBHOOK_PATH`]?.trim();
  if (!path) throw new Error('Service non raccordé : configuration n8n à compléter.');
  // Only relative path segments, including UUIDs. Reject encoded traversal too.
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) {
    throw new Error('Chemin de connexion n8n invalide.');
  }
  return new URL(path, base).href;
}

export class ServiceError extends Error {
  constructor(message, uncertain = false) {
    super(message);
    this.uncertain = uncertain;
  }
}

export function validFile(file) {
  return file && typeof file.name === 'string' && file.name.length > 0 &&
    Number.isSafeInteger(file.size) && file.size >= 0 &&
    typeof file.revision === 'string' && file.revision.length > 0;
}

export async function request(url, options = {}, validate = () => true, timeout = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, cache: 'no-store',
      headers: { Accept: 'application/json', ...options.headers }, signal: controller.signal });
    let payload;
    try { payload = await response.json(); } catch {
      throw new ServiceError(`Réponse inexploitable (HTTP ${response.status}). Vérifiez l’état serveur.`, true);
    }
    if (!response.ok || payload?.ok !== true) {
      const detail = typeof payload?.message === 'string' ? payload.message : `Erreur HTTP ${response.status}.`;
      throw new ServiceError(response.status === 409 ? `Conflit : ${detail} Un nouvel accord est nécessaire.` : detail,
        response.status >= 500 || (response.ok && payload?.ok !== false));
    }
    if (!validate(payload)) throw new ServiceError('Confirmation invalide. Vérifiez l’état serveur.', true);
    return payload;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(controller.signal.aborted ?
      'Délai dépassé. Résultat incertain : vérifiez l’état serveur.' :
      'Connexion interrompue. Résultat incertain : vérifiez l’état serveur.', true);
  } finally { clearTimeout(timer); }
}

export function iconName(name) {
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (['doc', 'docx', 'docm'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'xlsm', 'csv'].includes(ext)) return 'excel';
  if (['ppt', 'pptx', 'pptm'].includes(ext)) return 'powerpoint';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tif', 'tiff', 'avif', 'ico'].includes(ext)) return 'image';
  return 'file';
}
