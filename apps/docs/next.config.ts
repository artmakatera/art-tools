import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @am/mock-data ships raw TypeScript (its exports map points at src/*.ts), so
  // Next has to compile it. @art-tools/react-gantt is deliberately NOT listed: it is
  // prebuilt ESM+CJS, and transpiling it would neither help nor — the thing
  // people reach for this flag hoping for — inject the "use client" directives
  // it lacks. Every demo owns its own client boundary instead.
  transpilePackages: ["@am/mock-data"],

  // Next 16 writes its own AGENTS.md/CLAUDE.md into the app on first dev run.
  // The repo already has a root AGENTS.md holding its actual conventions; a
  // generated stub beside it is just noise.
  agentRules: false,

  typescript: {
    // `turbo run check-types` already runs tsc over this project and caches the
    // result; Next 16 would otherwise shell out to tsc a second time during
    // build (experimental.useTypeScriptCli defaults to true).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
