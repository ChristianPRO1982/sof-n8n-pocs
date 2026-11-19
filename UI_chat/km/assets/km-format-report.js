// The workflow writes JSON even when the filename ends in .rapport.md.
export function parseReport(payload) {
  const report = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload;
  const q = report?.quality;
  const counts = ['sections_expected', 'fields_expected', 'fields_present', 'fields_filled'];
  const lists = ['sections_missing', 'fields_missing', 'fields_unfilled'];
  if (!report || typeof report.template?.text !== 'string' || typeof report.doc?.text !== 'string' || !q ||
      !['structure_score', 'completeness_score'].every(key => Number.isFinite(q[key]) && q[key] >= 0 && q[key] <= 100) ||
      !counts.every(key => Number.isSafeInteger(q[key]) && q[key] >= 0) ||
      !lists.every(key => Array.isArray(q[key]) && q[key].every(value => typeof value === 'string')) ||
      q.fields_filled > q.fields_present || q.fields_present > q.fields_expected ||
      q.sections_missing.length > q.sections_expected ||
      q.fields_missing.length !== q.fields_expected - q.fields_present ||
      q.fields_unfilled.length !== q.fields_present - q.fields_filled) {
    throw new Error('Rapport JSON invalide ou incomplet.');
  }
  return report;
}
