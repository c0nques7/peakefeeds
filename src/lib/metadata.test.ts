// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import http from 'node:http';
import { fetchLinkMetadata, fetchPublicHtml, isPublicAddress } from './metadata';

afterEach(() => vi.restoreAllMocks());

describe('isPublicAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', 'not-an-ip'])(
    'blocks %s', ip => expect(isPublicAddress(ip)).toBe(false));

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('allows %s', ip => expect(isPublicAddress(ip)).toBe(true));
});

describe('fetchLinkMetadata', () => {
  it.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://[::ffff:7f00:1]/',
    'http://example.com:6379/',
    'http://user:pass@example.com/',
  ])('returns empty metadata for %s without making a request', async url => {
    const get = vi.spyOn(http, 'get');
    const meta = await fetchLinkMetadata(`look at ${url}`);
    expect(meta).toMatchObject({ title: null, description: null, image: null });
    expect(get).not.toHaveBeenCalled();
  });

  it('refuses hostnames that resolve to private addresses', async () => {
    await expect(fetchPublicHtml('http://localhost/')).rejects.toThrow(/Blocked address/);
  });

  it('refuses non-http schemes', async () => {
    expect(await fetchPublicHtml('file:///etc/passwd')).toBeNull();
  });
});
