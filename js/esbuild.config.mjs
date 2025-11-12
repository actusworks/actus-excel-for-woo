import * as esbuild from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';

const outfile = 'dist/actus-excel-for-woo.min.js';

await esbuild.build({
  entryPoints: ['js/actus-excel-for-woo.js'],
  bundle: true,
  minify: true,
  outfile,
});

// After build, obfuscate the final file
const code = fs.readFileSync(outfile, 'utf8');
const obfuscated = JavaScriptObfuscator.obfuscate(code, {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  
  transformObjectKeys: true,
  //identifierNamesGenerator: 'mangled', // shorter generated names than 'hexadecimal'

  reservedNames: ['^history_data$', '^filename$', '^action$', '^nonce$', '^ajaxurl$'],

});
fs.writeFileSync(outfile, obfuscated.getObfuscatedCode());

console.log('✅ Built and obfuscated:', outfile);