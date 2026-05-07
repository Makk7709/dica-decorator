/**
 * @fileoverview Tests TDD pour le logger conditionnel partagé des Edge Functions
 *
 * Verrouille la décision de design : verbose désactivé par défaut en
 * production, opt-in via DICA_VERBOSE_LOGS=1 ou NODE_ENV={development|test}.
 *
 * @author KOREV AI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Le module utilise Deno.env.get(...) — on simule l'API Deno pour vitest
type DenoEnvOverride = Record<string, string | undefined>;

function mockDenoEnv(env: DenoEnvOverride): void {
  // @ts-expect-error : injection runtime du global Deno pour les tests
  globalThis.Deno = {
    env: {
      get: (key: string): string | undefined => env[key],
    },
  };
}

function clearDenoEnv(): void {
  // @ts-expect-error : nettoyage du global Deno après le test
  delete globalThis.Deno;
}

describe('_shared/logger — comportement conditionnel', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    clearDenoEnv();
    vi.resetModules();
  });

  it('logDebug est SILENCIEUX par défaut (production Edge sans NODE_ENV)', async () => {
    mockDenoEnv({}); // pas de NODE_ENV, pas de DICA_VERBOSE_LOGS
    const { logDebug } = await import('../logger.ts');

    logDebug('payload sensible');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('logDebug émet quand DICA_VERBOSE_LOGS="1"', async () => {
    mockDenoEnv({ DICA_VERBOSE_LOGS: '1' });
    const { logDebug } = await import('../logger.ts');

    logDebug('debug active');
    expect(consoleLogSpy).toHaveBeenCalledWith('debug active');
  });

  it('logDebug émet quand NODE_ENV="development"', async () => {
    mockDenoEnv({ NODE_ENV: 'development' });
    const { logDebug } = await import('../logger.ts');

    logDebug('dev mode');
    expect(consoleLogSpy).toHaveBeenCalledWith('dev mode');
  });

  it('logDebug émet quand NODE_ENV="test"', async () => {
    mockDenoEnv({ NODE_ENV: 'test' });
    const { logDebug } = await import('../logger.ts');

    logDebug('test mode');
    expect(consoleLogSpy).toHaveBeenCalledWith('test mode');
  });

  it('logDebug est SILENCIEUX quand NODE_ENV="production"', async () => {
    mockDenoEnv({ NODE_ENV: 'production' });
    const { logDebug } = await import('../logger.ts');

    logDebug('should not appear');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('logInfo émet TOUJOURS (même en prod)', async () => {
    mockDenoEnv({ NODE_ENV: 'production' });
    const { logInfo } = await import('../logger.ts');

    logInfo('info en prod');
    expect(consoleLogSpy).toHaveBeenCalledWith('info en prod');
  });

  it('logWarn émet TOUJOURS (même en prod)', async () => {
    mockDenoEnv({ NODE_ENV: 'production' });
    const { logWarn } = await import('../logger.ts');

    logWarn('warning en prod');
    expect(consoleWarnSpy).toHaveBeenCalledWith('warning en prod');
  });

  it('logError émet TOUJOURS (même en prod)', async () => {
    mockDenoEnv({ NODE_ENV: 'production' });
    const { logError } = await import('../logger.ts');

    logError('error en prod');
    expect(consoleErrorSpy).toHaveBeenCalledWith('error en prod');
  });

  it('isVerboseLogsEnabled reflète l\'état effectif', async () => {
    mockDenoEnv({});
    let mod = await import('../logger.ts');
    expect(mod.isVerboseLogsEnabled()).toBe(false);

    vi.resetModules();
    mockDenoEnv({ DICA_VERBOSE_LOGS: '1' });
    mod = await import('../logger.ts');
    expect(mod.isVerboseLogsEnabled()).toBe(true);
  });
});

describe('_shared/logger — getErrorMessage', () => {
  beforeEach(() => mockDenoEnv({}));
  afterEach(() => clearDenoEnv());

  it('extrait le message d\'une instance Error', async () => {
    const { getErrorMessage } = await import('../logger.ts');

    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('retourne la chaîne brute pour un string', async () => {
    const { getErrorMessage } = await import('../logger.ts');

    expect(getErrorMessage('plain string error')).toBe('plain string error');
  });

  it('sérialise en JSON pour un objet', async () => {
    const { getErrorMessage } = await import('../logger.ts');

    expect(getErrorMessage({ code: 'E_FOO', detail: 'x' })).toBe('{"code":"E_FOO","detail":"x"}');
  });

  it('fallback sur String() pour les valeurs non-sérialisables', async () => {
    const { getErrorMessage } = await import('../logger.ts');
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(getErrorMessage(circular)).toBe(String(circular));
  });

  it('retourne une chaîne pour null/undefined', async () => {
    const { getErrorMessage } = await import('../logger.ts');

    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe(String(undefined));
  });
});
