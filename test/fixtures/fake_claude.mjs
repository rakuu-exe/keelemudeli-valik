// Stand-in for `claude` in the judge tests: reports what the child process got (environment,
// working folder, arguments, stdin) instead of calling a model. It never makes a network request.
import fs from 'node:fs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  if (process.argv.includes('--hang')) return setTimeout(() => {}, 60_000);
  const report = {
    cwd: process.cwd(),
    cwdEntries: fs.readdirSync(process.cwd()),
    envKeys: Object.keys(process.env),
    args: process.argv.slice(2),
    input,
  };
  process.stdout.write(JSON.stringify(report));
});
