// E-Mail-Versand - optional, und optional heisst hier wirklich optional.
//
// Die Anwendung funktioniert ohne Mailserver vollstaendig: Eine Anfrage
// erscheint beim Gefragten in der Liste „Für mich angefragt", und der Link
// zur Geschichte laesst sich von Hand weitergeben. Ist ein SMTP-Server
// eingetragen, kommt eine Haken-Option dazu, die zusaetzlich eine Mail
// schickt (E-24).
//
// **Ein fehlgeschlagener Versand darf die Anfrage nicht verlieren.** Die
// Anfrage wird zuerst gespeichert, dann versucht die Mail zu gehen; scheitert
// sie, steht der Grund an der Anfrage (`mail_fehler`) und die Anfrage bleibt
// bestehen. Der umgekehrte Weg - erst senden, dann speichern - verliert bei
// jedem Netzproblem die Bitte, und der Gefragte sieht nie, dass er gefragt war.
import nodemailer from 'nodemailer';
import { lesen, SCHLUESSEL } from './db/einstellung.ts';

export interface MailZugang {
  host: string;
  port: number;
  sicher: boolean;
  benutzer: string | null;
  passwort: string | null;
  absender: string;
}

/**
 * Den Zugang zusammensuchen - oder `null`, wenn keiner eingetragen ist.
 *
 * Das Passwort kommt im Mehrbenutzerbetrieb NUR aus der Umgebung (I-08);
 * dafuer sorgt `lesen()` ueber `NUR_UMGEBUNG_SCHLUESSEL`, nicht diese Datei.
 */
export function mailZugang(): MailZugang | null {
  const host = lesen(SCHLUESSEL.mailHost)?.trim();
  if (!host) return null;
  const absender = lesen(SCHLUESSEL.mailAbsender)?.trim();
  if (!absender) return null;

  const port = Number(lesen(SCHLUESSEL.mailPort)?.trim() || '587');
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    // Port 465 spricht TLS von der ersten Zeile an, 587 handelt es mit
    // STARTTLS aus. Wer das vertauscht, bekommt einen Zeitüberlauf ohne
    // Fehlermeldung - deshalb die Vorgabe aus dem Port und nicht aus einem
    // weiteren Feld.
    sicher: (lesen(SCHLUESSEL.mailSicher)?.trim() || (port === 465 ? '1' : '0')) === '1',
    benutzer: lesen(SCHLUESSEL.mailBenutzer)?.trim() || null,
    passwort: lesen(SCHLUESSEL.mailPasswort) || null,
    absender,
  };
}

/** Kann überhaupt gemailt werden? Entscheidet, ob die Oberfläche den Haken zeigt. */
export function mailMoeglich(): boolean {
  return mailZugang() !== null;
}

export interface MailAuftrag {
  an: string;
  betreff: string;
  text: string;
}

/**
 * Senden. Gibt `null` zurueck, wenn es geklappt hat, sonst den Grund.
 *
 * Kein `throw`: Der Aufrufer soll die Anfrage behalten und den Grund
 * vermerken, nicht abbrechen.
 */
export async function senden(auftrag: MailAuftrag): Promise<string | null> {
  const z = mailZugang();
  if (!z) return 'Es ist kein Mailserver eingetragen.';

  try {
    const post = nodemailer.createTransport({
      host: z.host,
      port: z.port,
      secure: z.sicher,
      auth: z.benutzer ? { user: z.benutzer, pass: z.passwort ?? '' } : undefined,
    });
    await post.sendMail({
      from: z.absender,
      to: auftrag.an,
      subject: auftrag.betreff,
      text: auftrag.text,
    });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Der Text der Anfrage.
 *
 * Bewusst nur Arbeitstitel und Hinweis - **kein Inhalt der Geschichte**. Eine
 * Mail verlaesst die Anwendung und landet in einem Postfach, das wir nicht
 * kennen; Fakten koennen intern oder vertraulich sein (I-04). Wer mitarbeiten
 * soll, klickt den Link und ist dann angemeldet.
 */
export function anfrageText(e: {
  vonName: string;
  arbeitstitel: string;
  hinweis: string | null;
  link: string;
}): MailAuftrag & { an: string } {
  const zeilen = [
    `${e.vonName} bittet dich um Mithilfe an einer Erfolgsgeschichte.`,
    '',
    `Arbeitstitel: ${e.arbeitstitel}`,
  ];
  if (e.hinweis) zeilen.push('', e.hinweis);
  zeilen.push(
    '',
    `Hier geht es weiter: ${e.link}`,
    '',
    'Du musst nicht alles wissen. Fragen, die du nicht beantworten kannst,',
    'lassen sich überspringen — sie bleiben dann für die nächste Person offen.',
    '',
    '— BITS Erfolgsgeschichte-Assistent',
  );
  return {
    an: '',
    betreff: `Erfolgsgeschichte: ${e.arbeitstitel}`,
    text: zeilen.join('\n'),
  };
}
