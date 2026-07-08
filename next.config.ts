import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/api/solve': [
      './*.jsonl',
      './*_solver_system_prompt_v0_1.md',
      './all_math_solver_system_prompt_v0_1.md',
    ],
  },
};

export default nextConfig;
