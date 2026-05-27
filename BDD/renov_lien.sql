CREATE TABLE renov_lien (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE,
    title VARCHAR(150),
    score INT CHECK (score BETWEEN 0 AND 10),
    update_date DATE,
    smart_scraping BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ
);

CREATE TABLE renov_thematique (
    id SERIAL PRIMARY KEY,
    description VARCHAR(100) UNIQUE
);

CREATE TABLE renov_sousthematique (
    id SERIAL PRIMARY KEY,
    st_id INT NOT NULL REFERENCES renov_thematique(id) ON DELETE CASCADE,
    description VARCHAR(100) UNIQUE
);

CREATE TABLE renov_categorie (
    id SERIAL PRIMARY KEY,
    description VARCHAR(100) UNIQUE
);

CREATE TABLE renov_lien_sousthematique (
    lien_id INT NOT NULL REFERENCES renov_lien(id) ON DELETE CASCADE,
    target_id INT NOT NULL REFERENCES renov_sousthematique(id) ON DELETE CASCADE,
    PRIMARY KEY (lien_id, target_id)
);

CREATE TABLE renov_lien_categorie (
    lien_id INT NOT NULL REFERENCES renov_lien(id) ON DELETE CASCADE,
    target_id INT NOT NULL REFERENCES renov_categorie(id) ON DELETE CASCADE,
    PRIMARY KEY (lien_id, target_id)
);
