// Real C3 implementation: pure transaction-lifecycle mapping (CLAUDE.md Section 31 - "display
// lifecycle and execution result separately", "never blindly resubmit because a request timed
// out"). This is the shared core behind RecloseSDK.trackTransaction/trackActionTrace and
// @reclose/transaction-tracker: translating a raw genlayer-js transaction receipt into the
// frozen GenLayerTransactionLifecycle shape (types.ts), enforcing exactly the invariants the
// type comments already declare rather than leaving them as unchecked documentation.
//
// No network calls here - this module is deliberately pure/deterministic so it can be unit
// tested without a live RPC and reused identically by the SDK, the tracker package, and the CLI.

import {
  TERMINAL_RAW_STATUSES,
  NON_TERMINAL_PROCESSING_STATUSES,
  REQUIRED_PROTOCOL_DECISION_OUTCOME,
  type RawTransactionStatus,
  type RawTransactionResult,
  type ProtocolDecisionOutcome,
  type GenLayerTransactionLifecycle,
  type DerivedLifecycleDisplay,
} from "./types";

/** Minimal shape this module needs from a genlayer-js transaction/receipt object. Callers adapt
 * the real SDK client response into this before calling mapRawTransaction - keeps this module
 * independent of genlayer-js's own type surface (which may change across its RC versions). */
export interface RawGenLayerTransaction {
  txId: string;
  status: RawTransactionStatus;
  result: RawTransactionResult | null;
  /** Optional execution/async-message data preserved by the public GenLayerJS adapter. */
  executionResult?: import("./types").ExecutionResult | null;
  messages?: unknown[] | null;
  emittedMessages?: unknown[] | null;
  postStateVerification?: "MATCH" | "MISMATCH" | "PENDING" | null;
  decidedAtBlock?: number | null;
  appealDeadline?: string | null;
}

const DISPLAY_LABELS: Record<RawTransactionStatus, string> = {
  UNINITIALIZED: "Submitting",
  PENDING: "Pending",
  PROPOSING: "Leader proposing",
  COMMITTING: "Validators committing",
  REVEALING: "Validators revealing",
  ACCEPTED: "Accepted",
  UNDETERMINED: "Undetermined",
  FINALIZED: "Finalized",
  CANCELED: "Canceled",
  APPEAL_REVEALING: "Appeal revealing",
  APPEAL_COMMITTING: "Appeal committing",
  VALIDATORS_TIMEOUT: "Validators timed out",
  LEADER_TIMEOUT: "Leader timed out",
  LEADER_REVEALING: "Leader revealing",
};

/**
 * Maps a raw genlayer-js transaction into the frozen GenLayerTransactionLifecycle shape,
 * enforcing the invariants types.ts already documents but does not itself check:
 *   - derived.isFinal is true iff rawStatus is FINALIZED or CANCELED (never set from a guess);
 *   - protocolDecisionOutcome is set ONLY for the four statuses the schema requires it for
 *     (ACCEPTED/UNDETERMINED/VALIDATORS_TIMEOUT/LEADER_TIMEOUT), and to the EXACT required value -
 *     a caller-supplied outcome that disagrees with the required mapping is a programming error,
 *     not a value to trust (CLAUDE.md Section 31 rule 5/7: never let the UI be more certain than
 *     the protocol, and never silently coerce a decided state into something it didn't decide).
 */
export function mapRawTransaction(raw: RawGenLayerTransaction): GenLayerTransactionLifecycle {
  const isFinal = (TERMINAL_RAW_STATUSES as readonly string[]).includes(raw.status);
  const isNonTerminalProcessing = (NON_TERMINAL_PROCESSING_STATUSES as readonly string[]).includes(raw.status);

  const requiredOutcome: ProtocolDecisionOutcome | undefined = REQUIRED_PROTOCOL_DECISION_OUTCOME[raw.status];
  const protocolDecisionOutcome: ProtocolDecisionOutcome | null = requiredOutcome ?? null;

  // A "mid-flight" status (no consensus round decided yet) must never claim a decided outcome -
  // this is the concrete enforcement of types.ts's NON_TERMINAL_PROCESSING_STATUSES comment.
  if (isNonTerminalProcessing && protocolDecisionOutcome !== null) {
    throw new Error(
      `Lifecycle mapping invariant violated: rawStatus ${raw.status} is non-terminal-processing but a protocolDecisionOutcome was computed - this would make the UI claim a decision the protocol has not made.`
    );
  }

  const derived: DerivedLifecycleDisplay = {
    displayLabel: DISPLAY_LABELS[raw.status],
    isFinal,
  };

  return {
    txId: raw.txId,
    rawStatus: raw.status,
    rawResult: raw.result,
    protocolDecisionOutcome,
    decidedAtBlock: raw.decidedAtBlock ?? null,
    appealDeadline: raw.appealDeadline ?? null,
    derived,
  };
}

/**
 * CLAUDE.md Section 31 rule 3: "never blindly resubmit because a request timed out." A timeout-
 * shaped raw status is NOT terminal and is NOT itself a failure signal that should trigger a
 * resubmission decision by a caller - it means poll again, not "the transaction failed." This
 * helper exists so callers have one canonical place to ask "should I stop polling and consider
 * resubmission", rather than each implementing their own ad hoc isFinal-adjacent check.
 */
export function isSafeToResubmit(lifecycle: GenLayerTransactionLifecycle): boolean {
  // Only a genuinely terminal, non-accepted outcome ever justifies considering resubmission -
  // CANCELED is the one terminal status that is not itself an accepted/undetermined decision.
  return lifecycle.derived?.isFinal === true && lifecycle.rawStatus === "CANCELED";
}
