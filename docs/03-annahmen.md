# Annahmen und offene Punkte

Annahmen (`A-…`) werden bestätigt oder fallen — aber nicht gelöscht, sondern
umgeschrieben. Offene Punkte (`O-…`) brauchen eine Entscheidung.

---

## Annahmen

### A-01 — Ein Interview von 15 bis 25 Minuten ist zumutbar, ein Formular nicht

*offen — zu messen am ersten echten Durchlauf mit einem Kollegen*

Die ganze Bauart hängt daran. Wenn die Kollegen nach fünf Fragen aussteigen,
muss der Katalog kürzer werden (weniger Pflichtfakten) oder das Interview in
zwei Sitzungen zerfallen.

### A-02 — Die Kollegen liefern brauchbare Antworten in Stichpunkten

*offen*

Der Assistent ist darauf ausgelegt, aus knappen Antworten Fakten zu ziehen und
nachzufragen. Sollte sich zeigen, dass Antworten regelmäßig ausweichen
(„lief gut"), braucht der Interview-Prompt härtere Nachfragen — nicht mehr
Fragen.

### A-03 — `document.execCommand` trägt den WYSIWYG-Editor noch

*teilweise bestätigt, 17.09.2026 — abgekündigt, aber funktionsfähig*

Funktioniert in allen aktuellen Browsern; ein Ersatz wäre ein lokaler Umbau in
`Blatt.tsx` (Selection-API und eigene Befehle) und betrifft keine andere
Datei.

Was am 17.09.2026 gemessen wurde: Der Editor nimmt Fokus an, eine Eingabe löst
`onInput` aus, die Fassung wird gespeichert und trägt `handisch = 1`. Was
**nicht** gemessen ist: die Werkzeugleiste (fett, Überschrift, Liste, Lücke)
und eine längere Tastatureingabe — die Browsersteuerung erreicht ein
`contenteditable` nicht zuverlässig. Erster Handgriff beim nächsten Durchlauf.

Ein Nebenbefund, der bleibt: Ein leerer `contenteditable` braucht einen
Absatz als Startinhalt und eine Mindesthöhe, sonst kann niemand den Cursor
hineinsetzen (siehe `04-aenderungen.md`).

### A-04 — Die kanonische Abschnittsfolge der Website ist stabil

*bestätigt am 17.09.2026 gegen `mybits-core/acf-json/group_mybits_cs_*.json`*

Kopf · Kennzahlen · Ausgangssituation · Herausforderung · Realisierung ·
Werkzeuge · Projektrollen · Kundenstimme · Fazit. Ändert sich die Website,
ändert sich die `struktur` des Ziels „Website" — eine Eingabe, kein Release
(E-06).

### A-05 — Ein Modellaufruf je Antwort ist schnell genug

*offen — zu messen*

Gemessen werden muss die Zeit zwischen Absenden einer Antwort und Erscheinen
der nächsten Frage. Über etwa acht Sekunden wird das Gespräch zäh; dann wird
die Faktenextraktion von der Fragestellung getrennt und parallel gefahren,
oder die Effort-Stufe sinkt.

---

## Offene Punkte

### O-01 — Einzelplatz oder Server für alle? → **entschieden am 07.10.2026**

*Beides.* `BITS_EG_MEHRBENUTZER` schaltet um: ohne Flag der Einzelplatz wie
bisher, mit Flag Anmeldung über Keycloak und Rollen (E-19), Betrieb im Cluster
(E-18), KI-Zugang nur aus der Umgebung (I-08).

Die Umschaltung ist eine Umgebungsvariable und keine Einstellung in der
Datenbank: Eine Einstellung könnte jeder Angemeldete ändern — und damit die
Anmeldepflicht abschalten, die ihn gerade hereingelassen hat.

Offen bleibt davon nur der erste echte Lauf gegen `id.mybits.dev`; die
Handgriffe dafür stehen in `docs/07-betrieb.md`.

### O-02 — Wohin geht der fertige Text?

Heute: kopieren. Denkbar: DOCX-Export, Markdown, direktes Schreiben in die
WordPress-Felder von `mybits-core` (die Feldnamen liegen vor, siehe
`06-referenz-website.md`).

### O-03 — Wie kommen Kundenstimmen und Fotos hinein?

Eine Erfolgsgeschichte auf der Website hat ein Kundenzitat mit Person und Foto.
Das Werkzeug kann das Zitat als Fakt aufnehmen, aber nicht die Freigabe
einholen. Vermutlich ein eigener Schritt („Zitat anfragen") mit Textvorschlag.

### O-04 — Azure OpenAI: welches Deployment, welche Region?

Die Anbindung ist gebaut und konfigurierbar, aber **ungetestet** — es gibt
noch keinen Endpunkt. Sobald einer existiert, ist der erste Lauf eine Messung,
kein Vertrauen.

### O-05 — Dürfen vertrauliche Fakten überhaupt in der Datei liegen?

*Jetzt eine Frage an Florian, keine theoretische mehr.*

Der Faktenbestand enthält bei Kundenprojekten Internas und auf der Stufe
`vertraulich` auch Preise und Personalthemen. Im Cluster liegt die Datei auf
einem `PersistentVolumeClaim`. Zu klären:

- Ist der Cluster-Storage verschlüsselt (at rest)?
- Wer kommt an ein PVC — nur `cluster-admin`, oder jeder mit
  `kubectl exec` im Namespace?

Für den Einzelplatz auf einem verschlüsselten Rechner war die Frage
vertretbar offen. Für einen Server, auf dem die Fakten mehrerer Kunden
liegen, ist sie es nicht.

### O-06 — Es gibt noch keine Sicherung

Die Datenbank liegt auf einem Datenträger im Cluster und wird nirgends
hinkopiert. Ein versehentliches `kubectl delete pvc` ist der ganze Verlust.

Der Handgriff für heute ist ein `kubectl cp` der Datei aus dem Pod; der
nächste Schritt ein `CronJob`, der sie auf ein Objektlager legt. Solange das
fehlt, ist der Bestand nur so sicher wie das Volume.

### O-07 — Das Repository liegt im falschen Account

`runs-on: [generic, on-prem]` verlangt die selbst gehosteten Runner der
Organisation `BITS-GmbH`. Ein Repository unter `Marc2017` sieht sie nicht —
der Workflow schlägt mit „No runner matching the specified labels" fehl.

Entweder umziehen (Settings → Transfer ownership) oder Florian gibt die
Runner für dieses Repository frei. Das Umziehen ist ohnehin das Richtige: Ein
Werkzeug für alle Kollegen gehört nicht in einen privaten Account.

### O-08 — Zwei Personen, eine Einzelrubrik, zwei Angaben

Bei einer Rubrik ohne `mehrfach` gilt die **letzte** Angabe; die vorherige
ist weg, und nur `beigetragen_von` wechselt mit. Wenn Anna „Die Disposition
lief über Excel" schreibt und Bert es anders sieht, überschreibt er sie
stillschweigend.

Für den Zweck, den Marc beschrieben hat — verschiedene Leute beantworten
verschiedene Fragen —, trägt das. Für „zwei Blickwinkel auf dieselbe Frage"
sind Mehrfach-Rubriken der Weg, und die gibt es dort, wo es darauf ankommt
(Herausforderung, Schritt, Technologie, Rolle, Wirkung, Kennzahl).

Was fehlen würde, wenn es doch weh tut: eine Historie je Fakt (wer wann was)
und eine sichtbare Markierung „hier gibt es zwei Meinungen". Beides ist eine
eigene Entscheidung, keine Zeile — deshalb hier und nicht im Code.

### O-09 — Wie erfährt jemand von einer Anfrage, der die Anwendung nicht offen hat?

Heute: über die Mail (wenn ein Server eingetragen ist) oder weil ihm jemand
den Link schickt. Ohne beides sieht er die Bitte erst beim nächsten Besuch.

Ein Teams-Webhook wäre der naheliegende dritte Weg — BITS arbeitet in Teams,
nicht in der Mail. Das ist nicht gebaut und auch nicht entschieden.
