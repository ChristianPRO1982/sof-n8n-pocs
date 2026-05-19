CREATE TABLE renov_liens (
    id SERIAL PRIMARY KEY,
    thematique VARCHAR(255),
    sousthematique VARCHAR(255),
    lien VARCHAR(500) UNIQUE,
    categorie VARCHAR(255),
    note INT CHECK (note BETWEEN 0 AND 100),
    date_maj DATE,
    smart_scraping BOOLEAN DEFAULT FALSE,
    scraped_at TIMESTAMPTZ
);

-- Index unique sur thematique + sousthematique
CREATE UNIQUE INDEX idx_renov_liens_thematique_sousthematique
ON renov_liens (thematique, sousthematique);