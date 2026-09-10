// Foundation-level wrong-network preflight guard (A0-T4 / NFR-CMP-001).
// This is a compatibility safety primitive, not C1 business logic: it exists so
// NFR-CMP-001 ("network preflight fails if chain ID != 61997") is actually enforced by
// code, not merely true by coincidence because G0 happened to run against 61997.

export const RECLOSE_CANONICAL_CHAIN_ID = 61997;

export class WrongNetworkError extends Error {
  constructor(public readonly observedChainId: number) {
    super(
      `Wrong network: Reclose R1's canonical chain is GenLayer Studio-dev (chain ID ${RECLOSE_CANONICAL_CHAIN_ID}), but observed chain ID ${observedChainId}. Refusing to proceed (CLAUDE.md Section 10; NFR-CMP-001; TM-INF-001).`
    );
    this.name = "WrongNetworkError";
  }
}

/**
 * Throws WrongNetworkError unless chainId is exactly the canonical Reclose R1 chain (61997).
 * Never substitutes stable 61999 or any other chain (CLAUDE.md Section 10 rule 2).
 */
export function assertCanonicalChainId(chainId: number): asserts chainId is 61997 {
  if (chainId !== RECLOSE_CANONICAL_CHAIN_ID) {
    throw new WrongNetworkError(chainId);
  }
}

/** Non-throwing form for UI/preflight display use. */
export function isCanonicalChainId(chainId: number): boolean {
  return chainId === RECLOSE_CANONICAL_CHAIN_ID;
}
