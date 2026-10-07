# Ein Image, nicht zwei.
#
# bits-burn baut `web` (nginx) und `api` (node) getrennt, weil dort ein
# eigenstaendiges Frontend vor einer NestJS-API steht. Hier liefert der
# Node-Server das gebaute Frontend selbst aus (`statisch()` in
# server/src/api/server.ts) - ein zweites Image waere ein zweites Deployment,
# ein zweiter Service und eine zweite Route fuer dieselbe Sache.
#
# Node 24 ist Pflicht und nicht Geschmack: Das Backend fuehrt TypeScript direkt
# aus und nutzt `node:sqlite`. Unter Node 22 (wie bits-burn) startet es nicht.
#
# glibc statt Alpine, aus demselben Grund wie in bits-burn: musl verwirft grosse
# DNS-Antworten und faellt nicht auf TCP zurueck. Das trifft jeden Aufruf an
# einen Anbieter mit vielen A-Records - hier also die KI-API.

# ----------------------------------------------------------------- Bauen
FROM node:24-slim AS build

WORKDIR /app

# Erst die Manifeste, dann der Code: So bleibt die Schicht mit den
# Abhaengigkeiten im Cache, solange sich nur Quelldateien aendern.
COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/
RUN npm ci && npm --prefix web ci

COPY . .

# Beide Typpruefungen im Build. Im Backend gibt es keinen Build-Schritt, der
# einen Typfehler bemerken wuerde - ein Image soll nicht mit einem Fehler
# ausgeliefert werden, den `npm run typen` in zwei Sekunden findet.
RUN npm run typen
RUN npm --prefix web run build

# ----------------------------------------------------------------- Laufen
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/web/dist ./web/dist

# Die Datenbank liegt im Volume, nicht im Image. Ohne eingehaengtes Volume
# laeuft die Anwendung auch - der Bestand ist dann aber mit dem Pod weg.
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
VOLUME ["/app/server/data"]

# Nicht als root. Das Volume braucht dafuer `fsGroup: 1000` im Pod (siehe
# k8s/app.yml) - sonst darf der Prozess seine eigene Datenbank nicht schreiben.
USER node

EXPOSE 4700

# Der Health-Endpunkt liest die Datenbank, nicht nur den Port: Ein Prozess, der
# horcht, aber kein Schema hat, ist nicht gesund.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4700/api/gesund').then(r=>r.json()).then(d=>process.exit(d.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "server/src/api/server.ts"]
