/**
 * PaymentProvider — swappable payment rail interface (dual-rail rule:
 * no single vendor can take the platform down).
 *
 * Rail 1 (primary): RukaPay Gateway API — collections (PARTNER_COLLECT_MNO)
 *   AND payouts (PARTNER_SEND_MNO) across MTN + Airtel through one API.
 * Rail 2 (fallback): Flutterwave (cards + Airtel Money).
 * Active rail is chosen per-request via PAYMENT_PROVIDER env (default mock).
 *
 * Uganda Mobile Money reality (Hard Rule 4): every customer debit requires
 * a USSD push + the customer's MoMo PIN. There is NO auto-debit. So
 * requestToPay() is asynchronous by design: it returns 'pending', and the
 * money arrives only when getTransactionStatus()/webhook reports
 * 'successful'. Payment UX is built around that wait.
 */

export type ProviderTxStatus = 'pending' | 'successful' | 'failed';

export interface RequestToPayArgs {
  phone: string;        // E.164 (+256...) — the MoMo number being debited
  amountUgx: number;
  externalRef: string;  // our idempotency key — providers dedupe on it
  narration: string;    // shown on the customer's USSD prompt / statement
}

export interface PayoutArgs {
  phone: string;        // fundi's MoMo number (may differ from contact number)
  amountUgx: number;
  externalRef: string;
  narration: string;
}

export interface ProviderTx {
  providerRef: string;
  status: ProviderTxStatus;
  pspFee?: number;      // what the rail charged us, when known
}

export interface PaymentProvider {
  readonly name: string;
  /** Ask the customer's phone for money (USSD push + PIN). */
  requestToPay(args: RequestToPayArgs): Promise<ProviderTx>;
  /** Poll the state of a collection or payout. */
  getTransactionStatus(providerRef: string): Promise<ProviderTx>;
  /** Send money to the fundi on release. */
  payout(args: PayoutArgs): Promise<ProviderTx>;
}

// ─────────────────────────────────────────────
// MOCK — no money moves. requestToPay returns pending; the FIRST
// getTransactionStatus() call settles it as successful (simulating the
// customer entering their PIN). Payouts succeed immediately.
// Set MOCK_PAYMENT_FAIL=1 to simulate a declined debit (test path).
// ─────────────────────────────────────────────
class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async requestToPay(args: RequestToPayArgs): Promise<ProviderTx> {
    console.log(`[MockPayment] RequestToPay UGX ${args.amountUgx} from ${args.phone} (ref ${args.externalRef})`);
    if (process.env.MOCK_PAYMENT_FAIL === '1') {
      return { providerRef: `mock_fail_${args.externalRef}`, status: 'failed' };
    }
    return { providerRef: `mock_${args.externalRef}`, status: 'pending', pspFee: 0 };
  }

  async getTransactionStatus(providerRef: string): Promise<ProviderTx> {
    if (providerRef.startsWith('mock_fail_')) return { providerRef, status: 'failed' };
    return { providerRef, status: 'successful', pspFee: 0 };
  }

  async payout(args: PayoutArgs): Promise<ProviderTx> {
    console.log(`[MockPayment] Payout UGX ${args.amountUgx} to ${args.phone} (ref ${args.externalRef})`);
    return { providerRef: `mock_out_${args.externalRef}`, status: 'successful', pspFee: 0 };
  }
}

// ─────────────────────────────────────────────
// MTN MoMo Open API (collections) — sandbox skeleton.
// Fill env: MOMO_BASE_URL (https://sandbox.momodeveloper.mtn.com),
// MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY, MOMO_ENV ('sandbox').
// Docs: https://momodeveloper.mtn.com/api-documentation/api-description/
// ─────────────────────────────────────────────
class MtnMomoProvider implements PaymentProvider {
  readonly name = 'mtn_momo';

  private env() {
    const { MOMO_BASE_URL, MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY, MOMO_ENV } = process.env;
    if (!MOMO_BASE_URL || !MOMO_SUBSCRIPTION_KEY || !MOMO_API_USER || !MOMO_API_KEY) {
      throw new Error('MTN MoMo credentials not configured (MOMO_* env vars)');
    }
    return { MOMO_BASE_URL, MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, MOMO_API_KEY, MOMO_ENV: MOMO_ENV ?? 'sandbox' };
  }

  private async token(): Promise<{ base: string; subKey: string; env: string; accessToken: string }> {
    const e = this.env();
    const res = await fetch(`${e.MOMO_BASE_URL}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${e.MOMO_API_USER}:${e.MOMO_API_KEY}`).toString('base64'),
        'Ocp-Apim-Subscription-Key': e.MOMO_SUBSCRIPTION_KEY,
      },
    });
    if (!res.ok) throw new Error(`MoMo token request failed: ${res.status}`);
    const { access_token } = await res.json();
    return { base: e.MOMO_BASE_URL, subKey: e.MOMO_SUBSCRIPTION_KEY, env: e.MOMO_ENV, accessToken: access_token };
  }

  async requestToPay(args: RequestToPayArgs): Promise<ProviderTx> {
    const t = await this.token();
    const ref = args.externalRef; // X-Reference-Id doubles as our idempotency key
    const res = await fetch(`${t.base}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${t.accessToken}`,
        'X-Reference-Id': ref,
        'X-Target-Environment': t.env,
        'Ocp-Apim-Subscription-Key': t.subKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(args.amountUgx),
        currency: 'UGX',
        externalId: args.externalRef,
        payer: { partyIdType: 'MSISDN', partyId: args.phone.replace('+', '') },
        payerMessage: args.narration,
        payeeNote: 'Tukola job payment',
      }),
    });
    if (res.status !== 202) throw new Error(`MoMo requestToPay failed: ${res.status}`);
    return { providerRef: ref, status: 'pending' };
  }

  async getTransactionStatus(providerRef: string): Promise<ProviderTx> {
    const t = await this.token();
    const res = await fetch(`${t.base}/collection/v1_0/requesttopay/${providerRef}`, {
      headers: {
        Authorization: `Bearer ${t.accessToken}`,
        'X-Target-Environment': t.env,
        'Ocp-Apim-Subscription-Key': t.subKey,
      },
    });
    if (!res.ok) throw new Error(`MoMo status check failed: ${res.status}`);
    const body = await res.json();
    const status = body.status === 'SUCCESSFUL' ? 'successful'
      : body.status === 'FAILED' ? 'failed' : 'pending';
    return { providerRef, status };
  }

  async payout(args: PayoutArgs): Promise<ProviderTx> {
    // MTN disbursement API — separate product/credentials; activate at launch.
    throw new Error('MTN disbursement not yet configured — payouts are manual in sandbox');
  }
}

// ─────────────────────────────────────────────
// Flutterwave (cards + Airtel Money) — second rail skeleton.
// Fill env: FLW_SECRET_KEY. Docs: https://developer.flutterwave.com
// ─────────────────────────────────────────────
class FlutterwaveProvider implements PaymentProvider {
  readonly name = 'flutterwave';

  private key(): string {
    const k = process.env.FLW_SECRET_KEY;
    if (!k) throw new Error('FLW_SECRET_KEY not configured');
    return k;
  }

  async requestToPay(args: RequestToPayArgs): Promise<ProviderTx> {
    // Flutterwave collects via a hosted charge; integration completed when
    // the second rail is activated. Kept behind the same interface.
    throw new Error('Flutterwave rail not yet activated — use MTN MoMo');
  }

  async getTransactionStatus(providerRef: string): Promise<ProviderTx> {
    throw new Error('Flutterwave rail not yet activated');
  }

  async payout(args: PayoutArgs): Promise<ProviderTx> {
    throw new Error('Flutterwave rail not yet activated');
  }
}

// ─────────────────────────────────────────────
// RukaPay Gateway API — PRIMARY RAIL.
// Collections (PARTNER_COLLECT_MNO) + payouts (PARTNER_SEND_MNO) across
// MTN + Airtel through one x-api-key integration.
// Docs: https://developer.rukapay.co.ug (Gateway API, /api/v1/gateway)
//
// Env:
//   RUKAPAY_API_KEY      — required (32–64 chars, from partner dashboard;
//                          never logged, never included in errors)
//   RUKAPAY_BASE_URL     — optional. Default https://dev-api.rukapay.net
//                          (sandbox). Production: https://api.rukapay.net
//   RUKAPAY_CALLBACK_URL — required for collections (RukaPay validates its
//                          presence). e.g. https://tukolaapp.com/api/webhooks/rukapay
//
// Sandbox note: on dev-api.rukapay.net the transfer endpoint is
// process-transfer-SANDBOX (simulated responses, no real money). The
// status endpoint's sandbox path is not documented, so getTransactionStatus
// tries the plain path first, then the -sandbox suffix on 404.
//
// Our reconciliation loop (/api/cron/reconcile) polls getTransactionStatus,
// so the integration works even before a public webhook URL exists.
// ─────────────────────────────────────────────
class RukaPayProvider implements PaymentProvider {
  readonly name = 'rukapay';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;
  private readonly callbackUrl?: string;

  constructor() {
    const apiKey = process.env.RUKAPAY_API_KEY;
    if (!apiKey) throw new Error('RukaPay not configured (RUKAPAY_API_KEY required)');
    this.apiKey = apiKey;
    this.baseUrl = (process.env.RUKAPAY_BASE_URL ?? 'https://dev-api.rukapay.net').replace(/\/$/, '');
    this.sandbox = this.baseUrl.includes('dev-api');
    this.callbackUrl = process.env.RUKAPAY_CALLBACK_URL || undefined;
  }

  private endpoint(path: string): string {
    // Sandbox uses -sandbox suffixed endpoints for transfers/validation
    const suffix = this.sandbox ? '-sandbox' : '';
    return `${this.baseUrl}/api/v1/gateway/${path}${suffix}`;
  }

  private mapStatus(s: unknown): ProviderTxStatus {
    if (s === 'SUCCESS') return 'successful';
    if (s === 'FAILED') return 'failed';
    return 'pending'; // PENDING, PROCESSING, anything else
  }

  private async processTransfer(body: Record<string, unknown>): Promise<any> {
    let res: Response;
    try {
      res = await fetch(this.endpoint('process-transfer'), {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('RukaPay request failed (network error)');
    }
    const data: any = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
      // RukaPay's `message` is their own sanitized text (no secrets).
      throw new Error(`RukaPay transfer rejected (HTTP ${res.status}): ${data?.message ?? 'unknown error'}`);
    }
    return data;
  }

  async requestToPay(args: RequestToPayArgs): Promise<ProviderTx> {
    if (!this.callbackUrl) {
      throw new Error('RUKAPAY_CALLBACK_URL required — RukaPay rejects collections without callbackUrl');
    }
    const data = await this.processTransfer({
      transactionMode: 'PARTNER_COLLECT_MNO',
      amount: args.amountUgx,
      currency: 'UGX',
      narration: args.narration,
      partnerReference: args.externalRef,     // idempotency + status polling key
      phoneNumber: args.phone.replace(/^\+/, ''),
      // mnoProvider omitted — RukaPay auto-detects MTN/Airtel from the number
      callbackUrl: this.callbackUrl,
    });
    const tx = data?.transaction ?? {};
    return {
      providerRef: args.externalRef,
      status: this.mapStatus(tx.status),
      pspFee: typeof tx.fee === 'number' ? tx.fee : undefined,
    };
  }

  async getTransactionStatus(providerRef: string): Promise<ProviderTx> {
    const paths = [
      `${this.baseUrl}/api/v1/gateway/transactions/${encodeURIComponent(providerRef)}/status`,
      // Fallback: undocumented but consistent with the -sandbox convention
      ...(this.sandbox ? [`${this.baseUrl}/api/v1/gateway/transactions/${encodeURIComponent(providerRef)}/status-sandbox`] : []),
    ];
    let lastErr: Error | null = null;
    for (const url of paths) {
      let res: Response;
      try {
        res = await fetch(url, { headers: { 'x-api-key': this.apiKey } });
      } catch {
        throw new Error('RukaPay status check failed (network error)');
      }
      if (res.status === 404 && url !== paths[paths.length - 1]) continue; // try next path shape
      const data: any = await res.json().catch(() => null);
      if (!res.ok) { lastErr = new Error(`RukaPay status check failed (HTTP ${res.status})`); continue; }
      const tx = data?.transaction ?? {};
      return {
        providerRef,
        status: this.mapStatus(tx.status),
        pspFee: typeof tx.fee === 'number' ? tx.fee : undefined,
      };
    }
    throw lastErr ?? new Error('RukaPay status check failed');
  }

  async payout(args: PayoutArgs): Promise<ProviderTx> {
    const data = await this.processTransfer({
      transactionMode: 'PARTNER_SEND_MNO',
      amount: args.amountUgx,
      currency: 'UGX',
      narration: args.narration,
      partnerReference: args.externalRef,
      phoneNumber: args.phone.replace(/^\+/, ''),
    });
    const tx = data?.transaction ?? {};
    return {
      providerRef: args.externalRef,
      status: this.mapStatus(tx.status),
      pspFee: typeof tx.fee === 'number' ? tx.fee : undefined,
    };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER ?? 'mock') {
    case 'rukapay':
      return new RukaPayProvider();
    case 'mtn_momo':
      return new MtnMomoProvider();
    case 'flutterwave':
      return new FlutterwaveProvider();
    case 'mock':
    default:
      return new MockPaymentProvider();
  }
}
