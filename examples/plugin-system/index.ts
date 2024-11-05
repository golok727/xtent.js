import {
  CodeTransformer,
  ConfigPlugin,
  IndentationRemovePlugin,
  LicensePlugin,
  type Plugin,
  ShebangPlugin,
} from './lib';

const plugins: Plugin[] = [
  ConfigPlugin({ name: 'thing' }),
  ConfigPlugin({ outDir: './mock/dist' }),
  ConfigPlugin({
    inputs: { index: './mock/index.mjs' },
  }),
  ConfigPlugin({ inputs: { cli: './mock/cli.myjs' } }),
  // ----
  IndentationRemovePlugin(),
  LicensePlugin('MIT\n2024 Aadi'),
  ShebangPlugin(),
];

const transformer = CodeTransformer(plugins);
transformer.build();
