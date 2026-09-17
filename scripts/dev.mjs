// Entwicklungsbetrieb in einem Terminal: API mit Auto-Neustart und Vite.
//
// Wichtig: Der API-Prozess laeuft mit `--watch`, weil eine Migration NUR beim
// Start laeuft. Wer den Server ohne `--watch` betreibt, bemerkt weder eine
// neue Migration noch eine Codeaenderung.
import { spawn } from 'node:child_process';
import process from 'node:process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const teile = [
  { name: 'api', befehl: process.execPath,
    argumente: ['--disable-warning=ExperimentalWarning', '--watch', 'server/src/api/server.ts'] },
  { name: 'web', befehl: npm, argumente: ['--prefix', 'web', 'run', 'dev'] },
];

const laufend = [];
let beendet = false;

/** Alle Teilprozesse beenden - sonst bleibt Vite als Waise zurueck. */
const alleBeenden = (code) => {
  if (beendet) return;
  beendet = true;
  for (const kind of laufend) {
    if (kind.exitCode === null) kind.kill();
  }
  process.exit(code);
};

for (const teil of teile) {
  const kind = spawn(teil.befehl, teil.argumente, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  kind.on('exit', (code) => {
    // Stirbt ein Teil, ist der Entwicklungsbetrieb kaputt - dann nicht die
    // Haelfte weiterlaufen lassen, das taeuscht einen laufenden Stand vor.
    console.error(`\n[dev] ${teil.name} beendet (Code ${code ?? 0}) - ich stoppe den Rest.`);
    alleBeenden(code ?? 0);
  });
  laufend.push(kind);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => alleBeenden(0));
}

console.log('[dev] API auf http://localhost:4700 (mit --watch), Vite auf http://localhost:5273');
console.log('[dev] Strg+C beendet beide.');
