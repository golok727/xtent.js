import {
  CodeTransformer,
  ConfigPlugin,
  LicensePlugin,
  ShebangPlugin,
} from './lib/lib.mjs';

const plugins = [
  ConfigPlugin({ name: 'thing', outDir: './mock/dist' }),
  ConfigPlugin({
    inputs: { index: './mock/index.myjs' },
  }),
  ConfigPlugin({ inputs: { cli: './mock/cli.myjs' } }),
  LicensePlugin('MIT License\n2024 Aadi'),
  ShebangPlugin({ include: ['cli.myjs'] }),
];

const transformer = CodeTransformer(plugins);
transformer.build().forEach(f => console.log('Output: ' + f));
