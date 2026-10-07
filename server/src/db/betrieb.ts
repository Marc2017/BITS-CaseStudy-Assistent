// In welcher Betriebsart laeuft die Anwendung?
//
// Es gibt zwei, und sie unterscheiden sich in genau zwei Punkten:
//
//   Einzelplatz (Vorgabe)   lokal, ein Mensch, keine Anmeldung. Der
//                           KI-Schluessel darf in der Datenbank stehen und
//                           ueber die Oberflaeche gesetzt werden.
//   Mehrbenutzer            im Cluster, hinter Keycloak. Anmeldung ist
//                           Pflicht, und der KI-Schluessel kommt NUR aus der
//                           Umgebung (I-08).
//
// Die Umschaltung ist eine Umgebungsvariable und keine Einstellung in der
// Datenbank: Eine Einstellung koennte jeder Angemeldete aendern - und damit
// die Anmeldepflicht abschalten, die ihn gerade hereingelassen hat.
const AN = new Set(['1', 'true', 'ja', 'yes']);

/**
 * Laeuft die Anwendung im Mehrbenutzerbetrieb?
 *
 * Wird bei jedem Aufruf gelesen und nicht zwischengespeichert: Die Tests
 * setzen die Variable, und ein Wert, der beim ersten Import einfriert, waere
 * in einem Test nicht mehr zu aendern.
 */
export function mehrbenutzer(): boolean {
  return AN.has((process.env.BITS_EG_MEHRBENUTZER ?? '').trim().toLowerCase());
}

/** Die Realm-Rolle, die zur Verwaltung berechtigt. */
export function verwalterRolle(): string {
  return process.env.BITS_EG_ROLLE_VERWALTER?.trim() || 'erfolgsgeschichten-verwalter';
}

/**
 * Fuer Meldungen in der Oberflaeche: Warum ist etwas nicht aenderbar?
 */
export const NUR_UMGEBUNG =
  'Im Mehrbenutzerbetrieb kommt der KI-Zugang aus der Umgebung des Servers '
  + '(Secret im Cluster) und laesst sich hier nicht aendern. Ein Schluessel in '
  + 'der Datenbank waere fuer jeden lesbar, der an die Datei kommt.';
