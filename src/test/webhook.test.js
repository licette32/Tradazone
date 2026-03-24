import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    isValidWebhookUrl,
    setWebhookUrl,
    getWebhookUrl,
    dispatchWebhook,
    WEBHOOK_KEY,
} from '../services/webhook';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

// ─── isValidWebhookUrl ────────────────────────────────────────────────────────

describe('isValidWebhookUrl', () => {
    it('accepts https URLs', () => {
        expect(isValidWebhookUrl('https://example.com/hook')).toBe(true);
    });

    it('accepts http URLs', () => {
        expect(isValidWebhookUrl('http://localhost:4000/hook')).toBe(true);
    });

    it('rejects non-http protocols', () => {
        expect(isValidWebhookUrl('ftp://example.com/hook')).toBe(false);
    });

    it('rejects plain strings', () => {
        expect(isValidWebhookUrl('not-a-url')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidWebhookUrl('')).toBe(false);
    });
});

// ─── setWebhookUrl / getWebhookUrl ────────────────────────────────────────────

describe('setWebhookUrl', () => {
    it('persists a valid URL to localStorage', () => {
        setWebhookUrl('https://example.com/hook');
        expect(localStorage.getItem(WEBHOOK_KEY)).toBe('https://example.com/hook');
    });

    it('throws on an invalid URL', () => {
        expect(() => setWebhookUrl('not-a-url')).toThrow('Invalid webhook URL');
    });

    it('removes the key when called with null', () => {
        setWebhookUrl('https://example.com/hook');
        setWebhookUrl(null);
        expect(localStorage.getItem(WEBHOOK_KEY)).toBeNull();
    });

    it('removes the key when called with empty string', () => {
        setWebhookUrl('https://example.com/hook');
        setWebhookUrl('');
        expect(localStorage.getItem(WEBHOOK_KEY)).toBeNull();
    });
});

describe('getWebhookUrl', () => {
    it('returns null when nothing is stored', () => {
        expect(getWebhookUrl()).toBeNull();
    });

    it('returns the stored URL', () => {
        localStorage.setItem(WEBHOOK_KEY, 'https://example.com/hook');
        expect(getWebhookUrl()).toBe('https://example.com/hook');
    });
});

// ─── dispatchWebhook ──────────────────────────────────────────────────────────

describe('dispatchWebhook', () => {
    it('returns no_url_configured when no URL is set', async () => {
        const result = await dispatchWebhook('checkout.created', { id: 'CHK-001' });
        expect(result).toEqual({ ok: false, error: 'no_url_configured' });
    });

    it('POSTs to the configured URL with correct headers', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.created', { id: 'CHK-001', amount: '100' });

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toBe('https://example.com/hook');
        expect(opts.method).toBe('POST');
        expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('sends correct event name and payload in body', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.created', { id: 'CHK-001', amount: '50' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.created');
        expect(body.payload).toEqual({ id: 'CHK-001', amount: '50' });
        expect(body.timestamp).toBeTruthy();
        expect(body.id).toMatch(/^evt_/);
    });

    it('returns ok:true on 200 response', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

        const result = await dispatchWebhook('user.signed_up', { walletAddress: '0xabc' });
        expect(result).toEqual({ ok: true, status: 200 });
    });

    it('returns ok:false on non-2xx response', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

        const result = await dispatchWebhook('checkout.created', { id: 'CHK-001' });
        expect(result).toEqual({ ok: false, status: 500 });
    });

    it('retries once on network failure and succeeds on retry', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.useFakeTimers();

        const mockFetch = vi.fn()
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        const promise = dispatchWebhook('checkout.created', { id: 'CHK-001' });
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ ok: true, status: 200 });
        vi.useRealTimers();
    });

    it('returns error after both attempts fail', async () => {
        setWebhookUrl('https://example.com/hook');
        vi.useFakeTimers();

        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', mockFetch);

        const promise = dispatchWebhook('checkout.created', { id: 'CHK-001' });
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.ok).toBe(false);
        expect(result.error).toBe('Network error');
        vi.useRealTimers();
    });

    it('dispatches user.signed_up event correctly', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('user.signed_up', { walletAddress: 'GADDR', walletType: 'stellar' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('user.signed_up');
        expect(body.payload.walletType).toBe('stellar');
    });

    it('dispatches checkout.paid event correctly', async () => {
        setWebhookUrl('https://example.com/hook');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
        vi.stubGlobal('fetch', mockFetch);

        await dispatchWebhook('checkout.paid', { id: 'CHK-001', amount: '200', currency: 'STRK' });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.event).toBe('checkout.paid');
        expect(body.payload.id).toBe('CHK-001');
    });
});
