-- Erstausstattung der Datenbank. Laeuft bei jedem Start, aendert aber nur
-- etwas, wenn eine Tabelle fehlt (CREATE TABLE IF NOT EXISTS).
--
-- WICHTIG: Diese Datei erreicht bestehende Datenbanken nie. Wer eine Spalte
-- hinzufuegt, tut das in db/migration.ts UND hier - sonst bekommen neue und
-- alte Datenbanken verschiedene Schemata (siehe docs/02-datenmodell.md).

-- ------------------------------------------------------------- Einstellungen
CREATE TABLE IF NOT EXISTS setting (
  schluessel   TEXT PRIMARY KEY,
  wert         TEXT,
  geaendert_am TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- Projektarten
-- Traegt das Interview-Wissen zu einer Art von Vorhaben. `hinweise` waechst
-- ueber den Lernmodus (E-07).
CREATE TABLE IF NOT EXISTS projektart (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  beschreibung TEXT,
  hinweise     TEXT,
  lernmodus    INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,
  aktiv        INTEGER NOT NULL DEFAULT 1,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------------------- Ziele
-- Eine Textsorte als Vorlage: Prompt, Abschnittsstruktur, Vertraulichkeits-
-- grenze, Lernflag (E-06). `stufe` ist die HOECHSTE Vertraulichkeit, die in
-- diese Fassung darf (I-04).
CREATE TABLE IF NOT EXISTS ziel (
  id           INTEGER PRIMARY KEY,
  schluessel   TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  beschreibung TEXT,
  prompt       TEXT NOT NULL,
  struktur     TEXT NOT NULL DEFAULT '[]',
  stufe        TEXT NOT NULL DEFAULT 'oeffentlich'
               CHECK (stufe IN ('oeffentlich','intern','vertraulich')),
  laenge       TEXT,
  lernmodus    INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,
  aktiv        INTEGER NOT NULL DEFAULT 1,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------ Faktenkatalog
-- Was eine Erfolgsgeschichte braucht - als Daten, nicht als Code (E-11).
CREATE TABLE IF NOT EXISTS faktenrubrik (
  id              INTEGER PRIMARY KEY,
  schluessel      TEXT NOT NULL UNIQUE,
  rubrik          TEXT NOT NULL,
  label           TEXT NOT NULL,
  hinweis         TEXT,
  pflicht         INTEGER NOT NULL DEFAULT 0,
  mehrfach        INTEGER NOT NULL DEFAULT 0,
  stufe_vorschlag TEXT NOT NULL DEFAULT 'intern'
                  CHECK (stufe_vorschlag IN ('oeffentlich','intern','vertraulich')),
  sort            INTEGER NOT NULL DEFAULT 0,
  aktiv           INTEGER NOT NULL DEFAULT 1
);

-- -------------------------------------------------------------------- Kunden
-- Ein Kunde ist eine eigene Achse, keine Projektart (E-14): Dieselbe
-- Projektart kommt bei vielen Kunden vor, und was man bei einem bestimmten
-- Kunden fragen muss, gilt dort fuer jede Projektart. Der Interview-Kontext
-- ist die Kombination aus beidem.
CREATE TABLE IF NOT EXISTS kunde (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  branche      TEXT,
  hinweise     TEXT,
  anonym       TEXT,          -- wie der Kunde ohne Namen beschrieben wird
  lernmodus    INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,
  aktiv        INTEGER NOT NULL DEFAULT 1,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------- Erfolgsgeschichte
-- Nur Steuerdaten. Inhalt steht als Fakt, nicht als Spalte (I-03).
CREATE TABLE IF NOT EXISTS story (
  id            INTEGER PRIMARY KEY,
  arbeitstitel  TEXT NOT NULL,
  projektart_id INTEGER REFERENCES projektart(id) ON DELETE SET NULL,
  kunde_id      INTEGER REFERENCES kunde(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'aktiv'
                CHECK (status IN ('aktiv','fertig','archiv')),
  autor         TEXT,
  herkunft      TEXT NOT NULL DEFAULT 'interview'
                CHECK (herkunft IN ('interview','import')),
  quelle        TEXT,
  -- Wer die Angabe beigetragen hat (E-23). Metadaten, kein Inhalt:
  -- geht NIE in einen Formulierungs-Prompt (I-04).
  beigetragen_von  TEXT,
  beigetragen_name TEXT,
  erstellt_am   TEXT NOT NULL DEFAULT (datetime('now')),
  geaendert_am  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------------- Fakten
-- Der Bestand (E-03). `stufe` hat die Vorgabe 'intern' - konservativ (I-01).
CREATE TABLE IF NOT EXISTS fakt (
  id           INTEGER PRIMARY KEY,
  story_id     INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  schluessel   TEXT NOT NULL,
  rubrik       TEXT,
  wert         TEXT NOT NULL,
  stufe        TEXT NOT NULL DEFAULT 'intern'
               CHECK (stufe IN ('oeffentlich','intern','vertraulich')),
  quelle       TEXT NOT NULL DEFAULT 'interview'
               CHECK (quelle IN ('interview','import','manuell')),
  beleg        TEXT,
  sicher       INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now')),
  geaendert_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS fakt_story ON fakt(story_id);
CREATE INDEX IF NOT EXISTS fakt_schluessel ON fakt(story_id, schluessel);

-- --------------------------------------------------------- Gespraechsverlauf
-- Der Verlauf IST die Sitzung, die beim Weiterarbeiten wiederhergestellt wird.
CREATE TABLE IF NOT EXISTS nachricht (
  id          INTEGER PRIMARY KEY,
  story_id    INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  rolle       TEXT NOT NULL CHECK (rolle IN ('assistent','nutzer','notiz')),
  text        TEXT NOT NULL,
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS nachricht_story ON nachricht(story_id, id);

-- ----------------------------------------------------------------- Fassungen
-- Je Geschichte und Ziel genau eine aktuelle Fassung.
CREATE TABLE IF NOT EXISTS fassung (
  id           INTEGER PRIMARY KEY,
  story_id     INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  ziel_id      INTEGER NOT NULL REFERENCES ziel(id) ON DELETE CASCADE,
  titel        TEXT,
  inhalt       TEXT NOT NULL DEFAULT '',
  handisch     INTEGER NOT NULL DEFAULT 0,
  fakten_stand INTEGER NOT NULL DEFAULT 0,
  erstellt_am  TEXT NOT NULL DEFAULT (datetime('now')),
  geaendert_am TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (story_id, ziel_id)
);

-- Abgelegte Fassungen: automatisch vor dem Ersetzen (I-02) oder von Hand als
-- benannte Version (E-17). `name` und `fertig` unterscheiden die beiden.
CREATE TABLE IF NOT EXISTS fassung_sicherung (
  id          INTEGER PRIMARY KEY,
  fassung_id  INTEGER NOT NULL REFERENCES fassung(id) ON DELETE CASCADE,
  titel       TEXT,
  inhalt      TEXT NOT NULL,
  handisch    INTEGER NOT NULL DEFAULT 0,
  grund       TEXT,
  name        TEXT,          -- von Hand gegeben; leer = automatische Sicherung
  kommentar   TEXT,
  fertig      INTEGER NOT NULL DEFAULT 0,
  stufe       TEXT,          -- Grenze des Ziels zum Zeitpunkt des Ablegens
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sicherung_fassung ON fassung_sicherung(fassung_id, id);
-- Der Index auf `fertig` steht NICHT hier, sondern nur in Migration 3: Diese
-- Datei laeuft VOR den Migrationen, und auf einer Datenbank von Stand 1 gibt
-- es die Spalte noch nicht - der Index scheiterte mit "no such column"
-- (siehe I-07 in docs/02-datenmodell.md).

-- ----------------------------------------------------------------- Lernmodus
-- Vorschlaege, keine stille Selbstveraenderung (E-07).
CREATE TABLE IF NOT EXISTS lernnotiz (
  id          INTEGER PRIMARY KEY,
  bezug       TEXT NOT NULL
              CHECK (bezug IN ('ziel','projektart','kunde','katalog')),
  bezug_id    INTEGER,
  text        TEXT NOT NULL,
  begruendung TEXT,
  story_id    INTEGER REFERENCES story(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'offen'
              CHECK (status IN ('offen','uebernommen','verworfen')),
  erstellt_am TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS lernnotiz_status ON lernnotiz(status, bezug);

-- ----------------------------------------------------------------- Sitzungen
-- Wer ist angemeldet (E-19). Serverseitig, damit Abmelden sofort wirkt und
-- die Rollen nachlesbar bleiben. Nur im Mehrbenutzerbetrieb in Gebrauch.
CREATE TABLE IF NOT EXISTS sitzung (
  id            TEXT PRIMARY KEY,
  sub           TEXT NOT NULL,          -- Kennung bei Keycloak
  name          TEXT NOT NULL,
  email         TEXT,
  benutzername  TEXT NOT NULL,
  rollen        TEXT NOT NULL DEFAULT '[]',
  erstellt_am   TEXT NOT NULL DEFAULT (datetime('now')),
  gesehen_am    TEXT NOT NULL DEFAULT (datetime('now')),
  ablauf        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sitzung_ablauf ON sitzung(ablauf);


-- ------------------------------------------------- Mehrere Personen (E-23)
--
-- Eine Anfrage bittet einen Kollegen, am Interview mitzuwirken; sie kann
-- weitergegeben werden, und mehrere koennen gleichzeitig offen sein.
-- `uebersprungen` haelt fest, was EINE Person nicht beantworten konnte -
-- die naechste wird trotzdem gefragt.
CREATE TABLE IF NOT EXISTS anfrage (
  id            INTEGER PRIMARY KEY,
  story_id      INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  an_email      TEXT NOT NULL,                  -- auch an jemanden, der die
  an_name       TEXT,                           -- Anwendung noch nie geoeffnet hat
  von_kennung   TEXT NOT NULL,
  von_name      TEXT NOT NULL,
  hinweis       TEXT,                           -- worum es geht, in eigenen Worten
  status        TEXT NOT NULL DEFAULT 'offen',  -- offen | erledigt | abgelehnt
  mail_versandt TEXT,                           -- Zeitpunkt, oder NULL
  mail_fehler   TEXT,                           -- Grund, wenn der Versand scheiterte
  erstellt_am   TEXT NOT NULL DEFAULT (datetime('now')),
  beendet_am    TEXT
);
CREATE INDEX IF NOT EXISTS anfrage_an ON anfrage(an_email, status);
CREATE INDEX IF NOT EXISTS anfrage_story ON anfrage(story_id, status);

CREATE TABLE IF NOT EXISTS uebersprungen (
  id            INTEGER PRIMARY KEY,
  story_id      INTEGER NOT NULL REFERENCES story(id) ON DELETE CASCADE,
  schluessel    TEXT NOT NULL,
  -- Je PERSON, nicht je Geschichte: Was der eine nicht weiss, weiss die
  -- naechste. Eine Frage, die fuer alle verstummt, waere das Gegenteil des
  -- Zwecks (E-23).
  person        TEXT NOT NULL,
  person_name   TEXT,
  grund         TEXT,
  erstellt_am   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (story_id, schluessel, person)
);
CREATE INDEX IF NOT EXISTS uebersprungen_story ON uebersprungen(story_id, person);
