import esbuild from 'esbuild';
import pluginObfuscator  from 'esbuild-plugin-obfuscator';

esbuild.build({
  entryPoints: ['js/actus-excel-for-woo.js'],
  bundle: true,
  minify: true,
  outfile: 'dist/actus-excel-for-woo.min.js',
  plugins: [
    pluginObfuscator.obfuscatorPlugin({
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
    }),
  ],
}); 