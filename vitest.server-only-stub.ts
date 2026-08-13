// Stand-in for the "server-only" package under Vitest. Next.js resolves the
// real "server-only" import via its own bundler as a build-time guard
// against importing server code from a client component; it isn't a real
// npm dependency, so it doesn't resolve under plain Node/Vite. Aliased in
// vitest.config.ts — this file intentionally does nothing.
export {};
