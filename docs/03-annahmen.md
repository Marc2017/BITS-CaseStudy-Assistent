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

*bestätigt für Chrome/Edge 2026, aber abgekündigt*

Funktioniert in allen aktuellen Browsern; ein Ersatz wäre ein lokaler Umbau in
`Editor.tsx` (Selection-API und eigene Befehle) und betrifft keine andere
Datei.

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

### O-01 — Einzelplatz oder Server für alle?

Heute: lokal, ein Nutzer, `autor` als Textfeld. Für „alle Kollegen" braucht es
einen Server, eine Anmeldung und eine Rechteprüfung — und der API-Schlüssel
gehört dann nicht mehr in die Datenbank (siehe `02-datenmodell.md`, `setting`).

Das ist die größte offene Frage und eine Entscheidung von Marc, keine
technische.

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

Der Faktenbestand enthält bei Kundenprojekten Internas. Die Datenbank liegt
unverschlüsselt im Arbeitsverzeichnis. Für den Einzelplatz auf einem
verschlüsselten Rechner vertretbar; für einen Server nicht ohne weiteres.
