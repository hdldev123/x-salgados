/**
 * Vitest setup file — runs before every test file.
 * Sets env variables required by modules with module-level IIFEs
 * (e.g. auth.service.ts validates JWT_KEY on load).
 */
process.env.JWT_KEY = process.env.JWT_KEY ?? 'test-secret-key-for-vitest-at-least-32chars!!';
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'XSalgadosApi';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'XSalgadosApp';
process.env.JWT_EXPIRES_HOURS = process.env.JWT_EXPIRES_HOURS ?? '8';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
