CREATE TABLE renov_lien (
    id SERIAL PRIMARY KEY,
    lien VARCHAR(500) UNIQUE,
    note INT CHECK (note BETWEEN 0 AND 100),
    date_maj DATE,
    smart_scraping BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ
);

CREATE TABLE renov_thematique (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(100) UNIQUE
);

CREATE TABLE renov_sousthematique (
    id SERIAL PRIMARY KEY,
    st_id INT NOT NULL REFERENCES renov_thematique(id) ON DELETE CASCADE,
    libelle VARCHAR(100) UNIQUE
);

CREATE TABLE renov_categorie (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(100) UNIQUE
);

CREATE TABLE renov_lien_sousthematique (
    lien_id INT NOT NULL REFERENCES renov_lien(id) ON DELETE CASCADE,
    sousthematique_id INT NOT NULL REFERENCES renov_sousthematique(id) ON DELETE CASCADE,
    PRIMARY KEY (lien_id, sousthematique_id)
);

CREATE TABLE renov_lien_categorie (
    lien_id INT NOT NULL REFERENCES renov_lien(id) ON DELETE CASCADE,
    categorie_id INT NOT NULL REFERENCES renov_categorie(id) ON DELETE CASCADE,
    PRIMARY KEY (lien_id, categorie_id)
);
