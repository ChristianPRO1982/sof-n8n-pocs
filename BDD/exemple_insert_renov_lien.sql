Si tu veux éviter les doublons sur lien (champ UNIQUE) :

INSERT INTO renov_lien (lien, note, date_maj, smart_scraping, updated_at)
VALUES (
  'https://www.anah.gouv.fr/sites/default/files/2026-02/Anah-FR-Guide_des_aides_Fev2026_WEB_20260224.pdf',
  10,
  DATE '2026-02-01',
  false,
  NOW()
)
ON CONFLICT (lien) DO UPDATE
SET
  note = EXCLUDED.note,
  date_maj = EXCLUDED.date_maj,
  smart_scraping = EXCLUDED.smart_scraping,
  updated_at = NOW();