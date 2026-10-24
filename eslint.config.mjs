import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      '.wrangler/**',
      '.legacy/**',
      'cloudflare-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
