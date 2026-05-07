/**
 * @fileoverview Tests pour le module anti-SSRF partagé des Edge Functions.
 *
 * Verrouille la défense contre les fetch sortants vers métadonnées cloud,
 * IPs privées RFC1918, loopback IPv4/IPv6, link-local, et hors whitelist.
 *
 * @author KOREV AI
 */

import { describe, it, expect } from 'vitest';

import {
  assertSafeFetchUrl,
  SsrfBlockedError,
} from '../ssrf-guard.ts';

describe('_shared/ssrf-guard — protocoles autorisés', () => {
  it('autorise une URL HTTPS publique', () => {
    expect(() => assertSafeFetchUrl('https://example.com/foo.jpg')).not.toThrow();
  });

  it('bloque protocole non-HTTPS quand httpsOnly=true (défaut)', () => {
    expect(() => assertSafeFetchUrl('http://example.com/foo.jpg')).toThrow(
      SsrfBlockedError,
    );
  });

  it('autorise HTTP si httpsOnly=false', () => {
    expect(() =>
      assertSafeFetchUrl('http://example.com/foo.jpg', { httpsOnly: false }),
    ).not.toThrow();
  });

  it('bloque protocoles exotiques (file/ftp/gopher/javascript)', () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://example.com/foo',
      'gopher://example.com/',
      'javascript:alert(1)',
    ]) {
      expect(() => assertSafeFetchUrl(url)).toThrow(SsrfBlockedError);
    }
  });
});

describe('_shared/ssrf-guard — métadonnées cloud (defense-in-depth)', () => {
  it('bloque AWS IMDS (169.254.169.254)', () => {
    expect(() =>
      assertSafeFetchUrl('https://169.254.169.254/latest/meta-data/', {
        httpsOnly: false,
      }),
    ).toThrow(/SSRF blocked/);
  });

  it('bloque GCP metadata.google.internal', () => {
    expect(() =>
      assertSafeFetchUrl('http://metadata.google.internal/', {
        httpsOnly: false,
      }),
    ).toThrow(/SSRF blocked/);
  });
});

describe('_shared/ssrf-guard — IPs privées et loopback', () => {
  it('bloque localhost / 0.0.0.0 / 127.x.x.x', () => {
    for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '127.10.20.30']) {
      expect(() =>
        assertSafeFetchUrl(`http://${host}/foo`, { httpsOnly: false }),
      ).toThrow(SsrfBlockedError);
    }
  });

  it('bloque IPs privées RFC1918 (10/8, 172.16/12, 192.168/16)', () => {
    for (const host of ['10.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.1']) {
      expect(() =>
        assertSafeFetchUrl(`http://${host}/foo`, { httpsOnly: false }),
      ).toThrow(/private IP range/);
    }
  });

  it('autorise IPs publiques (8.8.8.8, 1.1.1.1) sans whitelist', () => {
    expect(() => assertSafeFetchUrl('https://8.8.8.8/foo')).not.toThrow();
    expect(() => assertSafeFetchUrl('https://1.1.1.1/foo')).not.toThrow();
  });

  it('bloque IPv6 loopback ::1', () => {
    expect(() =>
      assertSafeFetchUrl('http://[::1]/foo', { httpsOnly: false }),
    ).toThrow(SsrfBlockedError);
  });

  it('bloque IPv6 link-local fe80::', () => {
    expect(() =>
      assertSafeFetchUrl('http://[fe80::1]/foo', { httpsOnly: false }),
    ).toThrow(/private IP range/);
  });
});

describe('_shared/ssrf-guard — whitelist de hostnames', () => {
  it('autorise un hostname exact dans la whitelist', () => {
    expect(() =>
      assertSafeFetchUrl('https://supabase.co/foo', {
        allowedHostSuffixes: ['supabase.co'],
      }),
    ).not.toThrow();
  });

  it('autorise un sous-domaine du suffix whitelisté', () => {
    expect(() =>
      assertSafeFetchUrl('https://urkftxznsynmvkskytih.supabase.co/foo', {
        allowedHostSuffixes: ['supabase.co'],
      }),
    ).not.toThrow();
  });

  it('bloque un hostname hors whitelist', () => {
    expect(() =>
      assertSafeFetchUrl('https://attacker.com/foo', {
        allowedHostSuffixes: ['supabase.co'],
      }),
    ).toThrow(/not in allowed list/);
  });

  it('bloque une tentative de bypass via suffix partiel (evilsupabase.co.attacker.com)', () => {
    expect(() =>
      assertSafeFetchUrl('https://evilsupabase.co.attacker.com/foo', {
        allowedHostSuffixes: ['supabase.co'],
      }),
    ).toThrow(/not in allowed list/);
  });
});

describe('_shared/ssrf-guard — robustesse erreurs', () => {
  it('rejette une URL syntaxiquement invalide', () => {
    expect(() => assertSafeFetchUrl('not-a-url')).toThrow(/invalid URL syntax/);
  });

  it('SsrfBlockedError expose name et url dans le message', () => {
    try {
      assertSafeFetchUrl('http://10.0.0.1/', { httpsOnly: false });
      expect.fail('expected to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SsrfBlockedError);
      expect((e as Error).name).toBe('SsrfBlockedError');
      expect((e as Error).message).toContain('10.0.0.1');
    }
  });
});
