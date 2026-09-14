// Real browser wallet-connect integration (independent-audit finding: the product had NO browser
// connect-wallet flow at all, so reporterAddress was never actually obtainable in the browser -
// buildIncidentReport/buildRecoveryReport require it and would simply throw. This module is the
// missing runtime piece: it talks to whatever EIP-1193-style provider the browser actually exposes
// (`window.ethereum`, or `window.genlayer` if a GenLayer-specific provider injects one under that
// name) to obtain a real connected account address and chain ID.
//
// Scope, stated honestly: this module obtains the account and chain identity through EIP-1193.
// The normal production entry point then binds the account/provider to its GenLayerJS writer and
// Transaction Kit review; Reclose never holds or proxies a private key.

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

/**
 * Requests the connected wallet switch to Studio-dev (chain 61997) via the standard EIP-3326
 * `wallet_switchEthereumChain` request - the supported browser-wallet network-switching mechanism
 * underneath genlayer-js's own chain verification (`assertChainMatch`), not an invented flow. If
 * the wallet has no Studio-dev chain registered (error code 4902 - MetaMask and most EIP-1193
 * wallets signal this exact code, regardless of the human-readable message text they attach to
 * it), fall back to the standard EIP-3085 `wallet_addEthereumChain` request, built entirely from
 * genlayer-js's own pinned `studioDevnet` chain descriptor (`genlayer-js/chains`) - never
 * hand-typed chain metadata - then retries the switch once the chain is registered.
 */
export async function switchToStudioDev(provider, studioDevnetChain) {
  if (!provider) throw new Error("No wallet provider is connected.");
  const target = { method: "wallet_switchEthereumChain", params: [{ chainId: "0xF22D" }] };
  try {
    await provider.request(target);
    return;
  } catch (error) {
    if (error?.code !== 4902) {
      throw new Error(`Network switch was not completed: ${error?.message ?? String(error)}`);
    }
  }
  if (!studioDevnetChain) {
    throw new Error("The connected wallet has no Studio-dev (chain 61997) network registered, and no chain descriptor was supplied to register it automatically. Add it in your wallet, then try again.");
  }
  const rpcUrl = studioDevnetChain.rpcUrls?.default?.http?.[0];
  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0xF22D",
        chainName: studioDevnetChain.name,
        rpcUrls: rpcUrl ? [rpcUrl] : [],
        nativeCurrency: studioDevnetChain.nativeCurrency,
      }],
    });
  } catch (error) {
    throw new Error(`Network switch was not completed: the wallet rejected adding Studio-dev automatically (${error?.message ?? String(error)}). Add chain 61997 manually, then try again.`);
  }
  try {
    await provider.request(target);
  } catch (error) {
    throw new Error(`Studio-dev was added but the wallet did not switch to it: ${error?.message ?? String(error)}`);
  }
}
