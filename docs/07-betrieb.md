# Betrieb: Container, Harbor, Cluster, Anmeldung

Stand: 07.10.2026 · Vorlage: `BITS-GmbH/bits-burn` (Rat von Florian Wenzel)

Diese Datei sagt, wie das Werkzeug aus dem Einzelplatz in den Cluster kommt —
und was dafür **nicht** in diesem Repository passieren kann.

| | |
|---|---|
| Adresse | `https://stories.mybits.dev` |
| Namespace | `stories` |
| Image | `harbor.mybits.dev/erfolgsgeschichten/app` |
| Anmeldung | Keycloak, Realm `master` unter `https://id.mybits.dev/auth` |

Adresse und Namespace sind kurz, die übrigen Namen tragen den vollen
Gattungsnamen — die Begründung samt Liste dessen, was bewusst *nicht*
umbenannt wurde, steht in `01-entscheidungen.md`, E-20.

---

## Was wo liegt

| Datei | Was sie tut |
|---|---|
| `Dockerfile` | baut ein Image: Frontend bauen, Backend mit dem gebauten Frontend ausliefern |
| `.dockerignore` | hält `server/data` (den echten Bestand) und `node_modules` aus dem Image |
| `.github/workflows/build-and-push.yml` | baut bei jedem Push auf `main` und schiebt nach Harbor |
| `k8s/namespace.yml` | der Namespace `stories` samt Istio-Label |
| `k8s/app.yml` | Deployment, Service, Datenträger |
| `k8s/config.yml` | nicht-geheime Konfiguration (URLs, Realm, Rollenname) |
| `k8s/secrets.example.yml` | Vorlage für die Geheimnisse — **wird nicht ausgerollt** |
| `k8s/gateway.yml` | Istio-Gateway, Zertifikat, Routing |
| `k8s/kustomization.yml` | was zusammen ausgerollt wird, und mit welchem Bildstand |

## Die drei Abweichungen von bits-burn

bits-burn ist die Vorlage, nicht die Schablone. Drei Dinge sind hier anders,
jedes mit einem Grund:

**1. Ein Image statt zwei.** Dort stehen `web` (nginx) und `api` (NestJS)
getrennt. Hier liefert der Node-Server das gebaute Frontend selbst aus — ein
zweites Image wäre ein zweites Deployment, ein zweiter Service und eine zweite
Route für dieselbe Sache. Wer später trennen will, braucht einen nginx davor
und eine Pfadregel im `VirtualService`; der Code bleibt unberührt.

**2. Node 24, nicht 22.** Kein Geschmack: Das Backend führt TypeScript direkt
aus und benutzt `node:sqlite`. Unter Node 22 startet es nicht.

**3. SQLite auf einem Datenträger statt Postgres.** Das ist die
folgenreichste Abweichung — siehe unten.

## Warum SQLite bleibt (und wann nicht mehr)

bits-burn fährt Postgres als eigenen Dienst. Hier ist die Datenbank eine
Datei auf einem `PersistentVolumeClaim`. Das hat Konsequenzen, die im
Deployment stehen und die man nicht wegkonfigurieren kann:

- `replicas: 1` — zwei Pods auf derselben Datei sind der Weg, einen Bestand zu
  verlieren.
- `strategy: Recreate` — bei `RollingUpdate` läuft der neue Pod kurz parallel
  zum alten. Mit `ReadWriteOnce` hängt er dann in `Pending`; mit
  `ReadWriteMany` schreiben zwei Prozesse gleichzeitig. `Recreate` kostet ein
  paar Sekunden Ausfall und ist dafür sicher.
- `fsGroup: 1000` — der Container läuft als `node` und darf sein Volume sonst
  nicht beschreiben.

**Der Wechsel auf Postgres wird fällig,** sobald eines davon gilt: mehrere
Pods (Last oder Verfügbarkeit), ein punktgenaues Zurückspielen („Stand von
Dienstag 14 Uhr"), oder mehr als eine Handvoll gleichzeitiger Interviews. Der
Umbau betrifft `server/src/db/` vollständig — jede Abfrage, jede Migration —
und ist ein eigenes Vorhaben, kein Nachmittag.

**Sicherung:** Es gibt noch keine. Ein `kubectl cp` der Datei aus dem Pod ist
der Handgriff für heute; ein `CronJob`, der die Datei auf ein Objektlager
legt, der nächste Schritt. Das gehört zu O-06.

---

## Was Marc tun muss

### 1. Das Repository gehört nach `BITS-GmbH`

**Der Workflow läuft so nicht.** `runs-on: [generic, on-prem]` verlangt die
selbst gehosteten Runner — und die sind an die Organisation `BITS-GmbH`
gebunden. Ein Repository unter `Marc2017` sieht sie nicht.

Zwei Wege:

- **Umziehen** (empfohlen): Settings → Transfer ownership → `BITS-GmbH`.
  Damit stimmt auch die Rechtelage: Ein Werkzeug für alle Kollegen gehört
  nicht in einen privaten Account.
- **Oder** Florian gibt die Runner für dieses Repository frei (Organisation →
  Actions → Runner groups → Repository access).

Bis dahin schlägt der Workflow mit „No runner matching the specified labels"
fehl. Das Image lässt sich in der Zwischenzeit von Hand bauen und schieben:

```bash
docker build -t harbor.mybits.dev/erfolgsgeschichten/app:dev .
docker push harbor.mybits.dev/erfolgsgeschichten/app:dev
```

### 2. Zwei Geheimnisse im Repository hinterlegen

Settings → Secrets and variables → Actions:

| Name | Woher |
|---|---|
| `HARBOR_USER` | Robot-Konto aus Harbor (`robot$erfolgsgeschichten+ci`) |
| `HARBOR_SECRET` | das Token dazu |

### 3. Den Anthropic-Schlüssel versiegeln

Er darf **nicht** mehr über die Oberfläche gesetzt werden (I-08):

```bash
echo -n 'sk-ant-…' | kubeseal --raw --name erfolgsgeschichten \
  --namespace stories --cert public-key.pem
```

Das Ergebnis nach `k8s/sealed-secret.yml` unter `spec.encryptedData`. Dasselbe
für `SESSION_SECRET` (`openssl rand -base64 48`) und
`KEYCLOAK_CLIENT_SECRET`.

`k8s/secrets.example.yml` ist die Vorlage und wird nicht ausgerollt.

---

## Was Florian tun muss

1. **Harbor-Projekt** `erfolgsgeschichten` anlegen, dazu ein Robot-Konto mit
   Push-Recht.
2. **Namespace `stories`** anlegen — oder Marc das Recht dazu geben, dann
   bringt `k8s/namespace.yml` ihn beim Ausrollen mit. Die Frage, was ein
   eigener Namespace gegenüber `hackathon-vibe` neu braucht, ist beantwortet
   (Florian, 07.10.2026): **Istio-Selector derselbe, ClusterIssuer
   clusterweit, Harbor-Pull-Secret wird in alle Namespaces übertragen.**
   Offen bleibt eine Kleinigkeit: Welches Injection-Label trägt
   `hackathon-vibe` — `istio-injection: enabled` oder `istio.io/rev`? Die
   Manifeste setzen das erste.
3. **DNS** für `stories.mybits.dev` auf das Ingress-Gateway.
4. **Keycloak-Client** im Realm `master` unter `https://id.mybits.dev/auth`:

   | Feld | Wert |
   |---|---|
   | Client ID | `erfolgsgeschichten` |
   | Client authentication | ein (confidential) |
   | Valid redirect URIs | `https://stories.mybits.dev/auth/callback` |
   | Valid post logout redirect URIs | `https://stories.mybits.dev/` |
   | Web origins | `https://stories.mybits.dev` |

5. **Realm-Rolle** `erfolgsgeschichten-verwalter` anlegen und den Personen
   geben, die Vorlagen, Kunden und den Faktenkatalog pflegen dürfen. Wer
   angemeldet ist und diese Rolle **nicht** hat, darf Erfolgsgeschichten
   schreiben, aber die Verwaltung nicht ändern.

---

## Die Betriebsart ist eine Umgebungsvariable

`BITS_EG_MEHRBENUTZER=1` schaltet zwei Dinge gleichzeitig um:

- **Anmeldung ist Pflicht.** Ohne Sitzung antwortet jeder API-Aufruf mit 401
  (Ausnahme: `/api/gesund` und die Anmeldewege selbst).
- **Der KI-Zugang kommt nur aus der Umgebung** (I-08). Ein Schlüssel, der in
  der Datenbank liegt — etwa aus der Zeit als Einzelplatz —, wird nicht
  benutzt, und die Oberfläche weist einen Versuch, ihn zu setzen, **sichtbar
  ab** statt ihn stillschweigend zu verwerfen.

Ohne das Flag läuft alles wie bisher: lokal, ohne Anmeldung, Schlüssel in der
Verwaltung. Das ist die Vorgabe, damit ein ausgechecktes Repository nicht
plötzlich eine Keycloak-Instanz braucht.

Gemessen am 07.10.2026 an einer Kopie des echten Bestands: Mit Flag und einem
Schlüssel in der Datenbank meldet `/api/start` `zugang: false`; ein
`PUT /api/einstellungen` mit `ki.api_key` kommt als
`abgewiesen: ["ki.api_key"]` zurück, während `ki.modell` im selben Aufruf
gesetzt wird.

---

## Lokal entwickeln, mit Anmeldung

`docker-compose.yaml` startet die Anwendung zusammen mit einer
Keycloak-Instanz und einem fertigen Realm (`docker/keycloak/realm-import`),
damit der Anmeldeweg ohne Zugang zu `id.mybits.dev` prüfbar ist:

```bash
docker compose up --build
```

Dann `http://localhost:4700`, Anmeldung mit `test` / `test`.

**Unter WSL2 eine Falle mit dem Port.** WSL2 arbeitet im NAT-Modus: Ein
Container auf 4700 kollidiert **nicht** mit einem Node-Server auf
Windows-Port 4700 — beide starten, und der Windows-Browser sieht den lokalen
Server. Wer den Anmeldeweg im Browser prüfen will, beendet also zuerst
`npm run dev`. Einen anderen Port zu nehmen hilft nicht: Der mitgelieferte
Realm erlaubt Rücksprünge nur auf `localhost:4700` und `:5273`.

**Die Erstausstattung muss niemand einspielen.** Der Server tut es beim
Start, wenn die Datenbank leer ist (I-09). Ein frisches Volume ist damit
sofort gesund; `npm run seed` braucht es nur noch für `--ersetzen`.

Ohne Docker bleibt der Weg von bisher:

```bash
npm run dev          # Einzelplatz, keine Anmeldung
```

---

## Was gemessen ist — und was nicht

**Gemessen am 07.10.2026** (Docker Engine 29.8.2, Compose v5.6.0, WSL2 mit
Ubuntu 24.04, kein Docker Desktop):

- `docker build` läuft durch — einschließlich `npm run typen` und des
  Vite-Builds im Bauabschnitt.
- `docker compose up -d` startet Anwendung und Keycloak; die Anwendung
  meldet `healthy`.
- Ein **frisches Volume** ist ohne Zutun gesund: `/api/gesund` antwortet
  `{"ok":true,"schema":4,"erstausstattung":true}`, der Docker-Healthcheck
  steht nach einem Versuch auf `healthy` (I-09).
- Der Anmeldeweg bis zum Formular: `/auth/login` leitet mit PKCE auf
  Keycloak, mit `redirect_uri=http://localhost:4700/auth/callback`.
- Ohne Sitzung antwortet `/api/start` mit
  `{"fehler":"Nicht angemeldet.","anmelden":"/auth/login"}` — der
  Mehrbenutzerbetrieb greift im Container.

**Weiterhin ungemessen:**

- **Der Token-Tausch mit Keycloak.** Eine Anmeldung einzutippen ist
  Zugangsdatenarbeit; das bleibt bei Marc. Geprüft ist alles davor und die
  Abwehr danach (falscher `state`, gefälschtes Cookie).
- **Die Manifeste wurden nie angewandt.** YAML-Syntax und die Verweise
  untereinander sind geprüft (16 Prüfungen, E-20), ein
  `kubectl apply --dry-run=server` braucht einen Cluster.
- **Harbor.** Das Image wurde lokal gebaut, nie geschoben — dafür fehlt das
  Projekt auf `harbor.mybits.dev`.
