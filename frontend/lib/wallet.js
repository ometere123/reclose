// Real browser wallet-connect integration (independent-audit finding: the product had NO browser
// connect-wallet flow at all, so reporterAddress was never actually obtainable in the browser -
// buildIncidentReport/buildRecoveryReport require it and would simply throw. This module is the
// missing runtime piece: it talks to whatever EIP-1193-style provider the browser actually exposes
// (`window.ethereum`, or `window.genlayer` if a GenLayer-specific provider injects one under that
// name) to obtain a real connected account address and chain ID.
//
// Scope, stated honestly: this proves address + chain ID - the two fields the product's preview/
// signing-boundary checks (reporterAddress binding, wrong-network blocking) actually need. It does
// NOT itself implement GenLayer contract-call signing; an actual `submitIncident`/`submitRecovery`
// etc. writer capable of signing real GenLayer transactions remains a host-injected concern
// (`globalThis.__RECLOSE_PRODUCT_RUNTIME__.writer`), consistent with CLAUDE.md Section 21 ("Write
// helpers build/sign through the user's wallet boundary. Do not custody private keys.") - Reclose
// itself must never hold or proxy a private key.

function detectProvider() {
  if (typeof window === "undefined") return null;
  if (window.genlayer && typeof window.genlayer.request === "function") return window.genlayer;
  if (window.ethereum && typeof window.ethereum.request === "function") return window.ethereum;
  return null;
}

/**
 * Requests real account access from whatever provider is present. Throws with an actionable
 * message (never fabricates a connected address) when no provider is installed, when the user
 * rejects the request, or when the provider returns no accounts.
 */
export async function connectBrowserWallet() {
  const provider = detectProvider();
  if (!provider) {
    throw new Error("No browser wallet provider was found (checked window.genlayer and window.ethereum). Install a GenLayer-aware wallet extension and reload.");
  }
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || !accounts[0]) {
    throw new Error("The connected wallet provider returned no account. Connection was not established.");
  }
  const chainIdHex = await provider.request({ method: "eth_chainId" });
  const chainId = Number(chainIdHex);
  if (!Number.isFinite(chainId)) {
    throw new Error(`The connected wallet provider returned a non-numeric chain ID (${String(chainIdHex)}). Network safety cannot be verified.`);
  }
  return {
    address: accounts[0],
    chainId,
    provider,
    async getConnectedChainId() {
      const current = await provider.request({ method: "eth_chainId" });
      return Number(current);
    },
  };
}

/** True only when a provider is actually present - used to decide whether to offer the "Connect
 * wallet" control at all, rather than always rendering a button that can never succeed. */
export function walletProviderAvailable() {
  return detectProvider() !== null;
}
