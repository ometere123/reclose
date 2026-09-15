// Shared Studio-dev RPC guard for the read-only preflight and GenLayer CLI subprocesses.
// One FIFO queue per process, >= 2.6s between RPC starts, bounded transient retries, and
// exponential spacing for transaction receipt/status polling.

const DEFAULT_RPC = "https://studio-next.genlayer.com/api";
const MIN_INTERVAL_MS = 2600; // at most 23.1 starts/minute, below Studio-dev's 30/minute limit
const MAX_TRANSIENT_RETRIES = 5;
const TRANSIENT_BACKOFF_MS = [3000, 6000, 12000, 24000, 30000];
const POLL_BACKOFF_MS = [4000, 8000, 16000, 30000];

let installed = false;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function transientResponse(status, body) {
  if ([408, 425, 429, 502, 503, 504].includes(status)) return true;
  return /rate limit exceeded|too many requests|server busy|all\s+\d+\s+execution slots occupied|temporarily unavailable/i.test(body);
}

function rpcMethod(request) {
  try {
    const text = request.clone().text();
    return text.then((body) => {
      try {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed) ? parsed.map((item) => item?.method ?? "").join(" ") : String(parsed?.method ?? "");
      } catch {
        return "";
      }
    });
  } catch {
    return Promise.resolve("");
  }
}

export function installStudioDevRpcThrottle({
  rpcUrl = process.env.RECLOSE_STUDIO_RPC_URL || DEFAULT_RPC,
  minIntervalMs = Number(process.env.RECLOSE_STUDIO_RPC_MIN_INTERVAL_MS || MIN_INTERVAL_MS),
  maxTransientRetries = MAX_TRANSIENT_RETRIES,
  logger = console.error,
} = {}) {
  if (installed) return;
  installed = true;

  const originalFetch = globalThis.fetch.bind(globalThis);
  const rpcEndpoint = new URL(rpcUrl).href.replace(/\/$/, "");
  let queue = Promise.resolve();
  let lastStart = 0;
  let lastWasPoll = false;
  let pollCount = 0;

  const serialized = (operation) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  };

  globalThis.fetch = (input, init) => {
    let request;
    try {
      request = new Request(input, init);
    } catch (error) {
      return Promise.reject(error);
    }
    const requestUrl = new URL(request.url).href.replace(/\/$/, "");
    if (requestUrl !== rpcEndpoint) return originalFetch(request);

    return serialized(async () => {
      const method = await rpcMethod(request);
      const isPoll = /receipt|transactionstatus|transaction_status|tx_status|gettransaction/i.test(method);
      if (isPoll) {
        pollCount = lastWasPoll ? pollCount + 1 : 0;
      } else {
        pollCount = 0;
      }
      const pollDelay = isPoll ? POLL_BACKOFF_MS[Math.min(pollCount, POLL_BACKOFF_MS.length - 1)] : 0;
      lastWasPoll = isPoll;

      for (let attempt = 0; ; attempt += 1) {
        const now = Date.now();
        const spacing = Math.max(minIntervalMs, pollDelay);
        const waitMs = Math.max(0, lastStart + spacing - now);
        if (waitMs > 0) await delay(waitMs);
        lastStart = Date.now();

        let response;
        try {
          response = await originalFetch(request.clone());
        } catch (error) {
          if (attempt >= maxTransientRetries) throw error;
          const backoff = TRANSIENT_BACKOFF_MS[Math.min(attempt, TRANSIENT_BACKOFF_MS.length - 1)];
          logger(`[studio-dev rpc throttle] network error for ${method || "RPC"}; retry ${attempt + 1}/${maxTransientRetries} after ${backoff}ms`);
          await delay(backoff);
          continue;
        }

        const body = await response.text();
        if (!transientResponse(response.status, body) || attempt >= maxTransientRetries) {
          return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

        const retryAfter = Number(response.headers.get("retry-after"));
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.max(retryAfter * 1000, TRANSIENT_BACKOFF_MS[Math.min(attempt, TRANSIENT_BACKOFF_MS.length - 1)])
          : TRANSIENT_BACKOFF_MS[Math.min(attempt, TRANSIENT_BACKOFF_MS.length - 1)];
        logger(`[studio-dev rpc throttle] transient response ${response.status} for ${method || "RPC"}; retry ${attempt + 1}/${maxTransientRetries} after ${backoff}ms`);
        await delay(backoff);
      }
    });
  };
}

if (process.env.RECLOSE_STUDIO_RPC_THROTTLE === "1") {
  installStudioDevRpcThrottle();
}
