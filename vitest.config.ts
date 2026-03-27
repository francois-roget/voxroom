import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const alias = { '@': resolve(__dirname, '.') };

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tests/**/*.test.ts'],
          environment: 'node',
          globals: true,
        },
        resolve: { alias },
      },
      {
        plugins: [react()],
        test: {
          name: 'jsdom',
          include: ['tests/**/*.test.tsx'],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.ts'],
        },
        resolve: { alias },
      },
    ],
  },
});
