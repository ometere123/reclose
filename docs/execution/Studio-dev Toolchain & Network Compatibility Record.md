# Studio-dev Toolchain & Network Compatibility Record

**Status:** G0 VERIFIED EXECUTION BASELINE (all verification targets proven with real evidence; see Section 25.1)  
**Product:** **Reclose**  
**Record class:** implementation-era compatibility and runtime record  
**Canonical R1 network:** GenLayer Studio-dev, chain ID **61997**  
**Last externally reviewed:** 9 September 2026  
**Normative scope:** network identity, compatible RC release family, install/runtime verification, runner identity, Studio limitations, fee/lifecycle implications, and compatibility findings  
**Not a governance document:** this record does not redefine Reclose architecture, product requirements, security invariants, or release scope

---

# 1. Purpose

This document records the exact GenLayer environment against which Reclose R1 is built, tested, deployed and demonstrated.

The six Reclose governance documents define **what Reclose is and how it must behave**. This record defines **which current GenLayer release-candidate environment is being used to execute that design and what has actually been verified about it**.

It exists because Studio-dev is a release-candidate environment. Package versions, runner hashes, network presets, fee behaviour and transaction APIs may change faster than the locked Reclose architecture should.

This record therefore separates three kinds of truth:

```text
governance truth
    architecture / product / invariants
        |
        v
compatibility truth
    current network / RC family / runtime surface
        |
        v
machine locks + G0 evidence
    exact versions / hashes / commands / transactions
```

A change to the RC stack does not automatically reopen Reclose architecture.

A verified runtime behaviour that materially invalidates a locked Reclose invariant **does** trigger the architecture-deviation process in the Repository Build Master Plan.

---

# 2. Relationship to other Reclose documents

This document is an execution record under:

```text
docs/execution/
```

It is governed by:

- `Repository Build Master Plan.md`
- `CLAUDE.md`

It consumes the six locked documents under:

```text
docs/governance/
```

It MUST NOT silently modify or weaken those documents.

## 2.1 Authority rule

For toolchain and runtime facts:

> **Verified live Studio-dev / chain 61997 behaviour with the exact pinned compatible RC stack outranks stale examples, remembered package versions and unverified notes.**

For architecture and product behaviour:

> **The locked governance documents remain authoritative.**

If the two conflict materially, record the conflict and follow the `C2` stop/escalation process. Do not silently redesign Reclose.

---

# 3. Record status model

Every compatibility item in this record SHOULD use one of these states:

```text
CANDIDATE
EXTERNALLY VERIFIED
G0 VERIFIED
SUPERSEDED
BLOCKED
CONTRADICTED
```

Definitions:

| State | Meaning |
|---|---|
| `CANDIDATE` | Expected for the current release train but not yet proven in the Reclose environment |
| `EXTERNALLY VERIFIED` | Confirmed from a current primary source, release record or package publication |
| `G0 VERIFIED` | Installed/executed against Reclose's actual environment and evidenced under `release-evidence/r1/g0/` |
| `SUPERSEDED` | Replaced by a newer accepted compatible item |
| `BLOCKED` | Verification could not be completed because of an external prerequisite |
| `CONTRADICTED` | Observed runtime/source evidence disproves the candidate assumption |

A version MUST NOT be written to the machine lock files as the accepted Reclose baseline merely because it is listed in this document as `CANDIDATE`.

---

# 4. Canonical Reclose R1 network

| Item | Reclose R1 value | Current record status |
|---|---|---|
| Environment | GenLayer Studio development preview | EXTERNALLY VERIFIED |
| Canonical network name | Studio-dev | EXTERNALLY VERIFIED |
| Canonical RPC | `https://studio-dev.genlayer.com/api` | EXTERNALLY VERIFIED |
| Chain ID | `61997` | EXTERNALLY VERIFIED; G0 must runtime-verify |
| Native currency | `GEN` | EXTERNALLY VERIFIED |
| Explorer | `https://explorer-studio-dev.genlayer.com/` | EXTERNALLY VERIFIED |
| CLI network alias | `studio-dev` | EXTERNALLY VERIFIED |
| JavaScript chain object | `studioDevnet` | EXTERNALLY VERIFIED |
| Python chain object | `studio_devnet` | EXTERNALLY VERIFIED |
| Expected gltest network | `studio_devnet` | CANDIDATE; G0 verify exact test API |
| Faucet | Studio built-in faucet/account selector | EXTERNALLY VERIFIED |
| Persistence guarantee | none | EXTERNALLY VERIFIED |
| Consensus family | v0.6 RC | EXTERNALLY VERIFIED |
| Studio family | v0.123 RC | EXTERNALLY VERIFIED |

## 4.1 Canonical RPC rule

Reclose integrations MUST use:

```text
https://studio-dev.genlayer.com/api
```

as the canonical Studio-dev RPC unless a later verified GenLayer release explicitly changes the canonical endpoint.

`studio-next.genlayer.com` may expose the same preview environment as a browser alias, but it MUST NOT replace the canonical RPC in Reclose lock files merely because the browser UI is available there.

## 4.2 Chain identity rule

Do not relabel or repoint the stable `studionet` configuration to Studio-dev.

The stable and preview environments are separate identities.

For R1:

```text
studio-dev -> 61997
studionet  -> 61999
```

Reclose MUST NOT silently fall back from `61997` to `61999`.

## 4.3 Persistence rule

Studio-dev state and availability are not guaranteed across deployments.

Operational statements such as “a reset is not currently planned” do not become a persistence guarantee.

Reclose therefore MUST retain:

- one-command or reproducible redeployment;
- deployment manifests;
- source commit references;
- constructor arguments;
- policy artifacts;
- addresses;
- transaction IDs;
- toolchain locks;
- verification procedures.

---

# 5. Studio Next and Studio-dev

Studio Next is relevant because the current v0.123 RC Studio release is deployed to both Studio-dev and Studio-next.

For Reclose:

```text
Studio Next
    useful browser entry / preview UI

Studio-dev
    canonical integration environment
    canonical RPC
    canonical chain identity for R1
```

Do not encode separate protocol identities for Studio Next and Studio-dev unless GenLayer officially separates them in a later release.

G0 MUST verify the network actually returned by the configured RPC rather than infer identity from the browser hostname.

---

# 6. Candidate compatible RC release family

The current candidate release family for Reclose R1 is:

| Component | Candidate version / family | Current evidence state |
|---|---|---|
| GenLayer Studio | `v0.123.0-rc.6` | EXTERNALLY VERIFIED |
| Consensus / Node | `v0.6 RC family` | EXTERNALLY VERIFIED family; exact hosted node build must be runtime-observed where possible |
| GenLayer CLI | `v0.40.0-rc.3` | EXTERNALLY VERIFIED |
| `genlayer-js` | `v2.0.0-rc.1` | EXTERNALLY VERIFIED |
| `genlayer-py` | `v0.19.0rc2` | EXTERNALLY VERIFIED |
| `genlayer-test` / gltest | `v0.30.0rc2` | EXTERNALLY VERIFIED package publication; G0 must prove expected workflow |
| `genvm-linter` | `v0.11.1rc2` | SOURCE-TRAIN EVIDENCE; G0 MUST verify install source and compatibility |
| Python intelligent-contract runner | current `py-genlayer` runner hash from GenLayer SDK runner registry | EXTERNALLY VERIFIED registry; G0 must pin exact hash used |
| GenLayer standard-library runner dependency | current `py-lib-genlayer-std` hash from runner registry | EXTERNALLY VERIFIED registry; G0 must pin exact hash used |

## 6.1 Current runner registry snapshot

At external review on 9 September 2026, the GenLayer SDK AI API registry reported:

```text
py-genlayer
9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0

py-genlayer-multi
mgqted4jvgzwawnd7sp7kjhfwwpr83a7wxhhdxcs4yk07jzt9c9g

py-lib-genlayer-std
dgvs4q4v3k1ac3vw6xq9h5d5gsttxe8semg9c6txcbn4r5e4b4f0
```

These values are a **snapshot**, not a timeless architecture constant.

G0 MUST query/verify the intended runner registry and write the accepted values to:

```text
toolchain/runner.lock
```

before product implementation proceeds.

---

# 7. Candidate installation commands

These commands are candidate commands for the current RC train.

They MUST be executed and evidenced during G0 before being promoted from candidate to accepted Reclose baseline.

## 7.1 CLI

```bash
npm install -g genlayer@0.40.0-rc.3
```

G0 SHOULD additionally record:

```bash
genlayer --version
genlayer network set studio-dev
genlayer network info
```

or the exact equivalent supported by the installed RC.

## 7.2 JavaScript SDK

```bash
npm install genlayer-js@2.0.0-rc.1
```

The dependency lock file MUST record the exact resolved package.

## 7.3 Python stack

```bash
pip install genlayer-py==0.19.0rc2
pip install genlayer-test==0.30.0rc2
```

or the project's chosen lock-managed equivalent.

The accepted environment MUST record:

```text
Python version
package version
resolved dependency lock
installation source
```

## 7.4 GenVM linter

Candidate expected version:

```text
0.11.1rc2
```

The source repository contains release-train evidence for `0.11.1rc2`.

However, Reclose MUST NOT assume the following command works until G0 proves it from the intended package source:

```bash
pip install genvm-linter==0.11.1rc2
```

G0 MUST determine and record one of:

```text
A. public package install succeeds at 0.11.1rc2
B. an official Git/tag/source install is required
C. another officially supported RC version is the correct compatible linter
D. the expected linter version is unavailable -> BLOCKED/CONTRADICTED
```

Do not silently substitute another linter and still claim the candidate stack was verified.

---

# 8. v0.6 release-family compatibility rule

Reclose MUST treat these as one compatibility family:

```text
Studio
Consensus / Node
CLI
genlayer-js
genlayer-py
genlayer-test
genvm-linter
runner / standard-library hashes
fee tooling
```

Do not mix stable Studionet packages with preview Studio-dev packages merely because individual APIs appear similar.

A dependency update that changes one compatibility-sensitive component triggers the change procedure in Section 20.

---

# 9. Consensus v0.6 behavioural implications for Reclose

The current migration material makes the following areas release-sensitive.

## 9.1 Fee-funded deployments

Contract deployments on the fee-charging v0.6 stack require the appropriate fee distribution and protocol-fee value.

Reclose deployment tooling MUST NOT assume deployment is fee-free simply because the outer Studio EVM-compatible wallet layer reports zero gas price.

## 9.2 Fee-funded writes

Writes require compatible fee estimation/submission.

Reclose MUST use the supported SDK/transaction tooling rather than hand-deriving protocol fees.

## 9.3 `FeesDistribution`

Where required by the RC, write/deploy flows must submit the SDK-produced compatible `FeesDistribution` and fee value.

Do not mutate the returned quote casually.

## 9.4 Live fee estimates

Frontend, CLI and deployment tooling must represent live estimates as estimates, not hard-coded constants.

## 9.5 Fee profiles

Reclose MUST exercise representative transaction branches and produce/commit:

```text
fee-profile.json
```

using the matching test tooling or its verified current equivalent.

The fee profile is an execution artefact, not a substitute for current network estimation.

## 9.6 Message fees

Internal messages may require child budget.

The following path matters directly to Reclose:

```text
Judge
  -> Kernel
      -> Target
```

The parent must reserve sufficient budget for required child execution according to the verified v0.6 behaviour.

Tests MUST cover insufficient-child-budget failure.

## 9.7 Refund behaviour

Where the RC exposes fee refunds or unused-budget returns, Reclose MUST display/account for them according to actual SDK/receipt semantics.

Do not infer refund success merely from a transaction's final status.

## 9.8 Appeals

Appeal behaviour is release-sensitive.

Reclose MUST use the exact current SDK/consensus appeal surface where appeal functionality is exposed in R1 product flows.

The UI MUST NOT present stale appeal windows or old consensus assumptions.

## 9.9 Transaction lifecycle

Reclose MUST treat lifecycle state and execution result separately.

A transaction can reach a consensus-final lifecycle state while execution has failed.

## 9.10 Execution-result validation

For actions that require state change:

```text
finality alone != success
```

Reclose must inspect the execution result and, where required, verify expected target post-state.

## 9.11 Triggered / child transactions

The JS RC includes support relevant to resolving triggered transaction IDs.

Reclose transaction tracking MUST preserve parent/child causality where the actual RC exposes it.

---

# 10. JavaScript RC compatibility notes

`genlayer-js v2.0.0-rc.1` includes compatibility-sensitive changes for the v0.6 train.

Current release notes include:

- breaking method-call calldata encoding change;
- v0.6 fee integration;
- fee-estimation correctness updates;
- v0.6 enum completeness;
- Studio-dev preview channel;
- triggered transaction-ID resolution from decision receipts.

Therefore:

1. Reclose MUST NOT use an older stable JS SDK against the Studio-dev v0.123/v0.6 preview.
2. Reclose MUST NOT reproduce calldata encoding independently in the frontend.
3. Reclose SHOULD centralize transaction construction through the canonical Reclose SDK layer.
4. G0/F1 tests MUST detect accidental use of incompatible chain objects or calldata semantics.

---

# 11. Python RC compatibility notes

`genlayer-py v0.19.0rc2` publicly exposes the Studio-dev preview chain definition:

```python
studio_devnet
```

targeting:

```text
https://studio-dev.genlayer.com/api
chain ID 61997
```

The current Python SDK documentation also reinforces that transaction finalization must not be treated as execution success without checking the execution result.

Reclose Python tooling and deployment scripts MUST preserve this distinction.

---

# 12. Testing stack

Candidate R1 testing stack:

```text
genlayer-test / gltest 0.30.0rc2
genvm-linter candidate 0.11.1rc2
Reclose repository tests
live Studio-dev smoke/E2E
```

Testing is layered:

```text
static/linter validation
    |
    v
direct/local deterministic tests
    |
    v
schema/interface tests
    |
    v
live 61997 smoke
    |
    v
live 61997 canonical E2E
```

No layer replaces another.

A contract that passes direct tests but fails the live preview is not release-ready.

A contract that deploys live but fails linter/schema requirements is not release-ready.

---

# 13. GenVM linter and contract-discovery rules

The linter/validator path is security and deployability infrastructure.

G0/F0 MUST establish:

- exact installed linter version/source;
- exact contract header / runner compatibility behaviour;
- lint command;
- semantic validation command;
- schema extraction command;
- typecheck command where supported;
- contract discovery boundaries.

Repository tests/helpers MUST remain outside paths interpreted as deployable Intelligent Contracts.

Do not repeat the known failure mode where `tests/conftest.py` or similar helper files are scanned as contract candidates.

---

# 14. Contract SDK / runner source of truth

For Intelligent Contract Python API compatibility, use the current GenLayer runner/SDK API registry and the exact runner/version selected by G0.

Do not blindly port syntax from:

- old stable Studionet contracts;
- unrelated older boilerplates;
- memory of pre-v0.6 APIs.

G0 MUST validate at least:

- contract base class syntax;
- storage namespaces/types;
- primitive/address/u256 types;
- `gl.vm` return/error surface;
- nondeterministic calls;
- decorators;
- events/messages;
- accepted/finalized hooks where used;
- web request surface;
- schema extraction;
- cross-contract messaging surface.

Material syntax changes that preserve Reclose behaviour are compatibility updates, not architecture changes.

---

# 15. Studio-specific limitations relevant to Reclose

Studio is not a full reproduction of every live-network layer.

## 15.1 EVM-compatible outer gas is not protocol fee truth

Studio may expose zero or compatibility gas values at the EVM-compatible wallet layer.

Reclose MUST use GenLayer protocol fee estimates/receipts for Intelligent Contract transaction fees.

## 15.2 EVM contract parity is incomplete

Studio does not fully model arbitrary external EVM-contract execution.

Therefore Reclose R1 MUST NOT fake a production external EVM integration in the canonical demo.

The canonical R1 path remains GenLayer-native IC-to-IC where required by the locked architecture.

## 15.3 Native value transfer

Studio can support native GEN value-transfer testing sufficient for the Reclose reference economic scenario, subject to current runtime verification.

## 15.4 Web access

Web access depends on the Studio environment and available browser/WebDriver/network conditions.

Reclose Judge evidence tests MUST cover source unavailability and MUST NOT treat temporary web-read success in Studio as a universal production guarantee.

## 15.5 Reset/redeployment

The preview can be reset/redeployed without preserving state.

Reclose must remain reproducibly deployable.

---

# 16. Canonical R1 Studio-dev verification targets

G0 MUST verify or explicitly mark blocked:

```text
G0-NET-01 canonical RPC reachable
G0-NET-02 returned chain identity = 61997
G0-NET-03 CLI studio-dev preset exists
G0-NET-04 JS studioDevnet resolves correctly
G0-NET-05 Python studio_devnet resolves correctly

G0-TOOL-01 CLI exact version
G0-TOOL-02 genlayer-js exact version
G0-TOOL-03 genlayer-py exact version
G0-TOOL-04 genlayer-test exact version
G0-TOOL-05 genvm-linter exact install source/version
G0-TOOL-06 Python version
G0-TOOL-07 Node/npm/pnpm versions used by repository

G0-RUN-01 py-genlayer runner hash
G0-RUN-02 standard-library dependency hash
G0-RUN-03 smoke contract validates against runner/SDK surface

G0-LINT-01 lint succeeds
G0-LINT-02 semantic validation succeeds
G0-LINT-03 schema extraction succeeds
G0-LINT-04 typecheck path established where supported

G0-TEST-01 direct/local smoke test succeeds
G0-DEP-01 smoke deploy submitted to 61997
G0-DEP-02 tx id persisted
G0-DEP-03 lifecycle observed
G0-DEP-04 execution result verified
G0-DEP-05 deployed state/read verified
G0-FEE-01 deploy fee path proven
G0-FEE-02 representative write fee path proven
```

A check not run is not a pass.

---

# 17. Machine-readable lock files

After G0 acceptance, these files become the machine-readable accepted baseline:

```text
toolchain/versions.lock
toolchain/runner.lock
toolchain/network.lock.json
```

## 17.1 `versions.lock`

Must include at least:

```text
studio_family
consensus_family
cli
genlayer_js
genlayer_py
genlayer_test
genvm_linter
python
node
package_manager
verification_timestamp
source_commit
```

## 17.2 `runner.lock`

Must include at least:

```text
runner_name
runner_hash
multi_runner_hash_if_used
stdlib_runner_name
stdlib_hash
registry_source
verified_at
```

## 17.3 `network.lock.json`

Must include at least:

```json
{
  "network": "studio-dev",
  "chainId": 61997,
  "rpc": "https://studio-dev.genlayer.com/api",
  "currency": "GEN",
  "explorer": "https://explorer-studio-dev.genlayer.com/",
  "cliAlias": "studio-dev",
  "jsChainObject": "studioDevnet",
  "pythonChainObject": "studio_devnet",
  "verifiedAt": "<timestamp>"
}
```

If the real verified values differ, write the verified values and create a compatibility finding.

---

# 18. G0 evidence pack

G0 MUST create:

```text
release-evidence/r1/g0/
├── preflight.md
├── install-log.txt or equivalent
├── version-report.txt
├── network-verification.json or equivalent
├── smoke-contract.py
├── smoke-schema.json
├── smoke-test-report.*
├── smoke-deployment.json             # if deployment access exists
├── smoke-receipt.json                # if deployment occurs
└── compatibility-evidence-index.md
```

Secrets MUST NOT be stored in these files.

`preflight.md` must summarize pass/fail/blocked status for every G0 verification target.

---

# 19. Compatibility findings register

This document replaces the former standalone:

```text
docs/execution/Compatibility Findings.md
```

All runtime/toolchain findings are recorded in this file under this format:

```text
Finding ID:
Date:
Status:
Expected:
Observed:
Source/evidence:
Affected component:
Affected Reclose files/requirements:
Classification: C0 / C1 / C2
Resolution:
Lock-file change:
Retest required:
External review required:
```

## 19.1 Classification

### C0 - documentation/example drift

The current RC uses a newer equivalent API/syntax while preserving Reclose behaviour and invariants.

Record the change and update implementation-facing code.

### C1 - implementation refinement

A technical implementation detail changes without changing product behaviour, authority boundary or locked invariant.

Record it, test it, update locks/interfaces as needed.

### C2 - material architecture contradiction

Verified runtime behaviour prevents or invalidates a locked architecture property.

**STOP the affected critical path.**

Do not hide the problem behind an adapter or frontend workaround.

Escalate through the Master Plan's architecture-deviation process.

---

# 20. Change triggers

Re-run compatibility conformance when any of the following changes:

- Studio preview release;
- Consensus/node release family;
- canonical RPC or chain ID;
- CLI version;
- `genlayer-js`;
- `genlayer-py`;
- `genlayer-test`;
- `genvm-linter`;
- runner hash;
- standard-library runner hash;
- fee-profile format;
- transaction lifecycle enum/receipt semantics;
- message/child-fee behaviour;
- appeal semantics;
- web-request behaviour relevant to Judge evidence;
- contract schema/linter rules.

At minimum rerun:

```text
network preflight
lint/schema
direct tests
smoke deploy/write
fee checks
transaction lifecycle check
affected interface tests
affected Reclose test suites
```

A release-sensitive update is not accepted simply because package installation succeeds.

---

# 21. Source registry

The following are primary references for the current baseline.

| ID | Source | Purpose |
|---|---|---|
| S01 | https://studio-next.genlayer.com/ | Studio Next browser preview |
| S02 | https://explorer-studio-dev.genlayer.com/ | Studio-dev Explorer |
| S03 | https://docs.genlayer.com/developers/networks | canonical network identity/RPC |
| S04 | https://docs.genlayer.com/developers/consensus-v06-migration | v0.6 migration and compatible release-family guidance |
| S05 | https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio | Studio environment behaviour |
| S06 | https://docs.genlayer.com/api-references/genlayer-js | JS SDK current API guidance |
| S07 | https://docs.genlayer.com/api-references/genlayer-py | Python SDK current API guidance |
| S08 | https://github.com/genlayerlabs/genlayer-testing-suite | testing-suite source |
| S09 | https://github.com/genlayerlabs/genvm-linter | linter source |
| S10 | https://sdk.genlayer.com/main/_static/ai/api.txt | current Intelligent Contract runner/SDK API registry |
| S11 | https://github.com/genlayerlabs/genlayer-studio/releases/tag/v0.123.0-rc.6 | Studio RC release evidence |
| S12 | https://github.com/genlayerlabs/genlayer-cli/releases/tag/v0.40.0-rc.3 | CLI RC release evidence |
| S13 | https://github.com/genlayerlabs/genlayer-js/releases/tag/v2.0.0-rc.1 | JS RC release evidence |
| S14 | https://pypi.org/project/genlayer-py/0.19.0rc2/ | Python RC package publication |
| S15 | https://pypi.org/project/genlayer-test/0.30.0rc2/ | testing RC package publication |
| S16 | https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio/limitations | Studio limitations |

G0 SHOULD record exact source commit/tag/package hashes where practical.

---

# 22. Externally verified snapshot as of 9 September 2026

The following facts were externally checked before repository G0:

1. Studio-dev is documented as chain `61997` with canonical RPC `https://studio-dev.genlayer.com/api`.
2. Stable Studionet remains a separate environment at chain `61999`.
3. Studio `v0.123.0-rc.6` is an official prerelease and its release record states deployment to Studio-dev and Studio-next.
4. CLI `v0.40.0-rc.3` is an official prerelease and its release notes add the Studio-dev preview network.
5. `genlayer-js v2.0.0-rc.1` is an official prerelease with v0.6 fee/calldata/preview-network changes.
6. `genlayer-py v0.19.0rc2` is publicly published and exposes `studio_devnet` for the Studio-dev preview.
7. `genlayer-test v0.30.0rc2` is publicly published.
8. the `genvm-linter` source train contains `0.11.1rc2` version evidence, but Reclose G0 still must prove the intended install source/version.
9. the current SDK runner registry publishes concrete runner hashes, which G0 must pin rather than hard-code forever.
10. Studio limitations explicitly require care around protocol fees, EVM parity and web-access assumptions.

These checks establish a strong candidate baseline.

They do **not** replace G0.

---

# 23. Initial compatibility findings

## CF-001 - Canonical RPC must remain Studio-dev

**Date:** 9 September 2026  
**Status:** OPEN UNTIL G0 VERIFIED  
**Expected:** Reclose uses Studio-dev preview chain 61997.  
**Observed:** Current docs identify `https://studio-dev.genlayer.com/api` as canonical even when Studio Next is available as a browser alias.  
**Classification:** C0 clarification.  
**Resolution:** use Studio-dev RPC in `network.lock.json`; treat Studio Next as browser alias unless later official documentation separates it.  
**Retest:** G0-NET-01 through G0-NET-05.

## CF-002 - Preview persistence is not guaranteed

**Date:** 9 September 2026  
**Status:** OPEN / PERMANENT OPERATIONAL ASSUMPTION  
**Expected:** team may not plan a near-term reset.  
**Observed:** official preview documentation does not guarantee state persistence.  
**Classification:** C1 operational refinement.  
**Resolution:** keep reproducible redeployment and manifests mandatory.  
**Retest:** deployment rebuild rehearsal before release.

## CF-003 - GenVM linter RC installation path must be proven

**Date:** 9 September 2026  
**Status:** OPEN UNTIL G0 VERIFIED  
**Expected:** `genvm-linter 0.11.1rc2` belongs to the current RC train.  
**Observed:** source repository contains `0.11.1rc2` version evidence; exact intended package-install path still requires Reclose G0 verification.  
**Classification:** C0/C1 pending G0 observation.  
**Resolution:** verify official install source and exact version; write accepted result to `versions.lock`.  
**Retest:** G0-TOOL-05 plus lint/schema/typecheck checks.

## CF-004 - Studio outer gas must not be confused with GenLayer protocol fees

**Date:** 9 September 2026  
**Status:** ACCEPTED EXECUTION RULE  
**Expected:** v0.6 writes/deployments are fee funded.  
**Observed:** Studio's EVM-compatible layer may expose zero/compatibility gas values while GenLayer protocol fees remain relevant.  
**Classification:** C0 documentation clarification.  
**Resolution:** all Reclose fee logic uses GenLayer fee APIs/profile/receipts, never `eth_gasPrice` as protocol-fee truth.

## CF-005 - Finalized transaction is not sufficient success proof

**Date:** 9 September 2026  
**Status:** ACCEPTED EXECUTION RULE  
**Expected:** Reclose already separates lifecycle and execution result.  
**Observed:** current Python SDK guidance explicitly warns that finalized transactions may still have failed execution.  
**Classification:** C0 corroboration of existing architecture.  
**Resolution:** preserve separate lifecycle/execution/post-state verification throughout SDK, frontend and E2E.

## CF-006 - genvm-lint CLI crashes on Windows cp1252 console encoding

**Date:** 10 September 2026
**Status:** G0 VERIFIED / WORKAROUND CONFIRMED
**Expected:** `genvm-lint check` prints a human-readable pass/fail report.
**Observed:** on this Windows host, `genvm-lint check` raised `UnicodeEncodeError: 'charmap' codec can't encode
character '\u2713'` because the default console codepage (cp1252) cannot render the checkmark glyph the tool emits.
Setting `PYTHONUTF8=1` and `PYTHONIOENCODING=utf-8` before invocation resolves it cleanly; the underlying lint run
itself was not affected (exit code before the print crash indicated success).
**Source/evidence:** `release-evidence/r1/g0/install-log.txt`, direct command execution.
**Affected component:** `genvm-linter` 0.11.1rc2 console output on Windows.
**Affected Reclose files/requirements:** any Windows-hosted CI/dev workflow invoking `genvm-lint` directly.
**Classification:** C0 - documentation/example drift (host console encoding, not an architecture or SDK defect).
**Resolution:** Reclose tooling/scripts/CI on Windows MUST set `PYTHONUTF8=1` (or invoke via a UTF-8 console) before
calling `genvm-lint`.
**Lock-file change:** none.
**Retest required:** none.
**External review required:** no.

## CF-007 - Pyright false positives on `gl.u256`-style Annotated type aliases

**Date:** 10 September 2026
**Status:** OPEN / ACCEPTED KNOWN LIMITATION
**Expected:** `genvm-lint typecheck` reports zero errors for a contract that lints and validates cleanly.
**Observed:** Pyright (via `genvm-lint typecheck --json`) reports `reportCallIssue: Object of type "Annotated" is
not callable` for `gl.u256(0)` construction and for `-> gl.u256` return annotations, because the GenLayer SDK
exposes its sized-integer types as `typing.Annotated` aliases that Pyright's static call-resolution does not treat
as constructible, even though they are valid and required at GenVM runtime (confirmed working via lint, semantic
validation and schema extraction).
**Source/evidence:** `release-evidence/r1/g0/smoke-test-report.txt`, `typecheck.json` capture.
**Affected component:** `genvm-linter` 0.11.1rc2 `typecheck` command / GenLayer Python SDK type stubs.
**Affected Reclose files/requirements:** any CI gate that treats `genvm-lint typecheck` as a hard pass/fail without
an SDK-aware suppression list; do not block merges on these two specific diagnostics until upstream stubs fix it.
**Classification:** C1 - implementation refinement (typecheck path is established and usable per G0-LINT-04; the
false positives are a known SDK-stub limitation, not a Reclose architecture or invariant issue).
**Resolution:** treat `reportCallIssue` on `Annotated` numeric-type constructors/returns as an accepted suppression
in Reclose CI type-check configuration; re-open if a future SDK release changes this behaviour.
**Lock-file change:** none.
**Retest required:** re-run `genvm-lint typecheck` whenever `genvm-linter` or `genlayer-py`/runner is upgraded.
**External review required:** no.

## CF-008 - Windows long-path limitation breaks pip install inside the default scratch/session path

**Date:** 10 September 2026
**Status:** G0 VERIFIED / WORKAROUND CONFIRMED
**Expected:** `pip install genvm-linter==0.11.1rc2` (which transitively installs `pyright`) succeeds in any writable
directory.
**Observed:** installing into the session's default temp scratchpad path failed with
`OSError: [Errno 2] No such file or directory` on a `pyright`-bundled typeshed stub file, because the full path
exceeded Windows' default 260-character `MAX_PATH` and this host does not have Windows long-path support enabled.
Installing into a short path (`C:\g0\venv`) succeeded without modification.
**Source/evidence:** `release-evidence/r1/g0/install-log.txt`.
**Affected component:** host OS / Windows filesystem limitation, not a GenLayer package defect.
**Affected Reclose files/requirements:** any Reclose install/CI script running on Windows with a long default
working-directory path.
**Classification:** C0 - documentation/example drift (environmental, not architectural).
**Resolution:** Reclose Windows setup documentation MUST recommend either enabling Windows long-path support
(`HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled`) or installing the Python toolchain under a
short root path.
**Lock-file change:** none.
**Retest required:** none.
**External review required:** no.

## CF-009 - Live smoke deployment reverts with `FeesDistributionMissing` absent a funded/fee-configured account

**Date:** 10 September 2026
**Status:** OPEN / EXTERNAL BLOCKER (credentials)
**Expected:** a smoke contract deploy via `gltest`/`genlayer-js`/`genlayer-py` against `studio_devnet` either
succeeds or fails for an account-balance/gas reason.
**Observed:** `gltest` correctly built and submitted a real deployment transaction
(`0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a`) to consensus contract
`0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575` on chain `61997`. The EVM-compatible transaction reverted with
`FeesDistributionMissing`. No wallet/private key/funded account was configured for this session; the active
Studio-dev account observed via the in-app browser showed a `0 GEN` balance. This corroborates
Section 9.1/9.3 of this record (fee-funded deployments require a valid `FeesDistribution` value) and confirms the
SDK/tooling wiring itself (calldata construction, account resolution, transaction submission, receipt polling) is
functioning correctly up to that boundary.
**Source/evidence:** `release-evidence/r1/g0/smoke-test-report.txt`, in-app browser screenshot of Studio-dev
showing account `0x96...3BE6` at `0 GEN`.
**Affected component:** deployment/fee tooling (G0-DEP-01 through G0-FEE-02).
**Affected Reclose files/requirements:** blocks full completion of G0-DEP-01..05 and G0-FEE-01..02; must be
retested once a funded Studio-dev account/faucet credential is provided by the repository owner.
**Classification:** C1 pending retest - the transaction path itself is proven; only the funded-credential
prerequisite is missing. Not classified C2: nothing here contradicts a locked invariant.
**Resolution:** repository owner must supply (or authorize creation and faucet-funding of) a dedicated Reclose
Studio-dev deployer account. G0 deliberately did not use unrelated pre-existing local CLI keystore accounts found
on this machine (e.g. `deployer`, `test_sponsor`, etc.) that appear to belong to other, unrelated projects, since
their provenance and authorization for Reclose spending/use could not be established in-session.
**Lock-file change:** none.
**Retest required:** G0-DEP-01 through G0-DEP-05, G0-FEE-01, G0-FEE-02 once a funded account is available.
**External review required:** yes - repository owner must supply funded credentials or explicitly accept this as a
residual G0 blocker at A0.

## CF-010 - Studio-dev browser IDE templates pin a different `py-genlayer` runner hash than the S10 registry snapshot [RESOLVED 2026-09-10]

**Date opened:** 10 September 2026
**Date resolved:** 10 September 2026 (same G0 phase, external-review follow-up)
**Status:** RESOLVED - `toolchain/runner.lock` corrected; exact pinned hash proven and deployed
**Expected (original):** the `py-genlayer` runner hash used by contracts in the Studio-dev environment matches the
"current" hash published by the SDK runner registry (S10), which this record originally pinned in
`toolchain/runner.lock` as `9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0`.
**Observed (original):** opening a built-in example (`storage.py`) in the live Studio-dev browser IDE showed a
`# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }` header - a different hash.
The session's own smoke contract used the floating tag `# { "Depends": "py-genlayer:test" }` and deployed
successfully, which only proved a floating tag currently resolves - not which exact hash is the correct pin.

**Investigation and resolution:**

1. `genvm-lint check` was run twice, once per candidate hash, against the identical local `genlayerlabs/genvm-manager`
   release bundles already cached from this session (`v0.6.0-rc3` and `v0.6.0-rc4` - the exact "Consensus v0.6 RC
   family" this record already identifies as matching Studio `v0.123.0-rc.6`):
   - `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` (Studio-dev template hash) -> **PASS**
     (lint + validation both succeed).
   - `py-genlayer:9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0` (S10 "current" snapshot hash) -> **FAILS**:
     `Failed to load SDK: runner py-genlayer:9b8k... not found; tried runners/py-genlayer/9b/8k....zip,
     runners/py-genlayer/9b/8k....tar, executor/*/legacy-runners/py-genlayer/9b/8k....tar`.
2. Inspecting the cached bundle indexes directly confirmed the S10 hash does not exist anywhere in either
   `genvm-manager` release (`v0.6.0-rc3` or `v0.6.0-rc4`); the Studio-dev template hash is the *only*
   current-layout (`runners/`) `py-genlayer` entry present, identically, in both.
3. The identical Studio-dev template hash was independently found a third time in `gltest`'s own separate Direct
   Mode runner cache (`gltest-direct/trees-v2/v0.6.0-rc4/runners/py-genlayer/`), confirming it is not an artifact
   of one tool's cache but the actual runner shipped with this RC family across every tool that resolves it.
4. The `py-genlayer:5jycge...` runner's own `runner.json` manifest was read to recover its exact
   dependency hashes: `py-lib-genlayer-std:kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0`,
   `py-lib-cloudpickle:9kem275vsxfhtjf6q49xjw051ybdvzmpmtmsd52aby20g1359sqg`,
   `cpython:3t4hs1eyrs8rb0qf538cbc227jskqeke9pfys0vaftapv91xn9v0` - all likewise verified present in both cached
   `genvm-manager` bundles, and all different from the S10 snapshot's corresponding hashes.
5. The smoke contract's dependency header was changed from the floating `:test` tag to the exact pinned hash
   `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`, re-linted/validated/schema-checked (all
   PASS, identical schema output to the floating-tag version), run through GenLayer Test **Direct Mode**
   (`pytest`, `direct_deploy` fixture, in-memory, no Docker/simulator/network - see CF-013 for a Windows-host
   caveat and `release-evidence/r1/g0/direct-mode-report.md`), and then deployed live to Studio-dev chain `61997`:
   deploy tx `0x83338017fd8376805c722b16a91128abe2a150ccdb9fb812c5023c32942b1c30`, contract
   `0x03ABA5917a9522A051f7bF522F266DCeF70f072D`, write tx
   `0xa8e409b05e2304b8dfb9491abb169029b99ca3dade84bb6483470906fd4dcef0`. Both finalized, both
   `FINISHED_WITH_RETURN`; `get_counter()` read `0` before the write and `1` after. See
   `release-evidence/r1/g0/deploy-success-pinned/`.
**Source/evidence:** `toolchain/runner.lock` (updated); `release-evidence/r1/g0/deploy-success-pinned/*`;
`release-evidence/r1/g0/direct-mode-report.md`; local cache inspection of
`C:\Users\USER\.cache\genvm-linter\extracted\genlayerlabs-genvm-manager-v0.6.0-rc{3,4}\py-genlayer\...\runner.json`
and `C:\Users\USER\.cache\gltest-direct\trees-v2\v0.6.0-rc4\runners\py-genlayer\`.
**Affected component:** `py-genlayer`/stdlib/cpython/cloudpickle runner dependency pins across Studio-dev,
`genvm-linter`, `gltest`, and `toolchain/runner.lock`.
**Root cause:** `sdk.genlayer.com/main` (S10) documents the runner registry for the `main`/HEAD SDK branch, which
is ahead of (or otherwise divergent from) the specific `genvm-manager` release train (`v0.6.0-rc3`/`v0.6.0-rc4`)
that Studio `v0.123.0-rc.6` actually ships and that Studio-dev chain `61997` actually executes against. S10 is not
wrong about "main" - it is simply not describing the exact pinned RC family Reclose targets.
**Classification:** C1 - implementation refinement. This does not change any Reclose architecture, product
behaviour, or locked invariant; it corrects an execution-record pin to match verified live/local RC-family
evidence instead of a doc-site snapshot that turned out to be for a different, unreleased-to-this-RC-family
runner set. It is not C0 (this was not cosmetic - the wrong hash was provably unresolvable and would have failed
to build) and not C2 (no architecture contradiction; Reclose's contract-dependency pinning mechanism itself works
exactly as designed once the correct hash is used).
**Resolution:** `toolchain/runner.lock` rewritten with the Studio-dev/`genvm-manager` v0.6.0-rc3/rc4 hash family
(`py-genlayer:5jycge...`, plus corrected stdlib/cpython/cloudpickle/protobuf/softfloat/multi-runner hashes) and
full sourcing/rationale. The R1 pinned executable baseline uses this hash family, not the S10 "current" snapshot.
The prior floating-tag deployment (`0xe1a7f8afb21a543bab63ad6432912f9f8c4329c194320e8270e42380106d4ff5`) is
preserved as historical evidence, not deleted - it happened to resolve to the same hash locally (since `:test`
resolves to "latest in the local bundle," which was this same hash), but the pinned-hash redeployment above is
what makes that pin explicit and reproducible rather than implicit and floating.
**Lock-file change:** `toolchain/runner.lock` fully rewritten (all six dependency hashes corrected).
**Retest required:** re-verify if GenLayer publishes a newer `genvm-manager` release that Studio-dev migrates to;
re-run the same `genvm-lint check` cross-verification against the new bundle before repinning.
**External review required:** no - this is resolved with reproducible, evidenced local+live verification, but the
repository owner may wish to independently confirm using the checklist in this entry.

## CF-011 - Deploy without `--fees`/`--fee-profile` reverts `FeeValueMustBeNonZero`, distinct from the unfunded account's `FeesDistributionMissing`

**Date:** 10 September 2026
**Status:** G0 VERIFIED
**Expected:** once an account is funded, `genlayer deploy --contract <path>` (with no fee flags) either succeeds or
fails for an account-balance reason.
**Observed:** with a funded (100 GEN) account but no `--fees`/`--fee-profile`/`--fee-value` flag, `genlayer deploy`
submitted a transaction with an implicit zero fee value, which reverted `FeeValueMustBeNonZero(1)`
(tx `0x9163c00e1a21d7eb8f0a5c79e2d9fb2f403f4cad6bd3e8cf7694d5741bb8cc48`). Supplying only a hand-written `--fees`
distribution (no fee value) produced a different revert, `FeeValueMustBeNonZero(3)`
(tx `0xe53348a68b86790d1477ff104402b5c84122661b2ae80532a44ac040c24483b4`). Both are distinct from the earlier
unfunded-account revert `FeesDistributionMissing` (CF-009), which occurs when no `fees` object is attached at all.
This confirms studio-dev's v0.6 consensus contract validates `FeesDistribution` presence and `feeValue`
non-zeroness as two separate checks. Studio-dev's chain object reports `feeManagerContract` as not set, so
genlayer-js cannot auto-derive a fee value from a FeeManager contract on this network; a `--fee-profile` (which
triggers `client.estimateTransactionFees()` against Studio's own `sim_getFeeConfig` policy) is required instead.
**Source/evidence:** `release-evidence/r1/g0/smoke-test-report.txt` Session 2, item 6.
**Affected component:** CLI 0.40.0-rc.3 `deploy`/`write` fee resolution (`resolveTransactionFees` in
`genlayer` package source).
**Affected Reclose files/requirements:** Reclose's own deploy/write tooling (SDK/CLI wrappers, C3 fee tooling) MUST
always resolve fees via `estimateTransactionFees`/an equivalent SDK-simulation path when targeting Studio-dev,
never via a bare `--fees` distribution with no value, and never assume FeeManager-based auto-derivation is
available on this chain.
**Classification:** C1 - implementation refinement. Confirms and sharpens the existing rule in Section 9.1-9.4 of
this record; does not contradict it.
**Resolution:** documented above; Reclose deployment/fee tooling built at C3 must use the fee-profile/
`estimateTransactionFees` path by default for Studio-dev.
**Lock-file change:** none.
**Retest required:** re-verify if Studio-dev ever exposes a `feeManagerContract` address.
**External review required:** no.

## CF-012 - Fee deposits are conservative and mostly refunded on finalization

**Date:** 10 September 2026
**Status:** G0 VERIFIED
**Expected:** per Section 9.7 of this record, refunds/unused-budget returns must be read from the receipt, not
inferred from final status.
**Observed:** the successful `increment` write deposited `225000000000063129` wei but the receipt's
`fee_accounting.total_refunded` shows `224921371750062306` wei refunded on finalization (reason: `finalized`),
i.e. the real net cost was approximately `78628300807` wei (~0.0000000786 GEN) - about 0.035% of the deposit. This
was independently corroborated by the deployer account's GEN balance before/after (100 -> 99.774999999999936871
pre-finalization -> 99.999842738999998354 GEN after both the deploy and write transactions finalized).
**Source/evidence:** `release-evidence/r1/g0/deploy-success/smoke-write-receipt.txt`;
`release-evidence/r1/g0/smoke-receipt.json`.
**Affected component:** v0.6 fee/refund accounting.
**Affected Reclose files/requirements:** Reclose frontend/SDK MUST display fee deposits as a conservative
worst-case budget, not the real charge, and MUST read the refund fields from the receipt (per Section 9.7,
already an accepted execution rule; this is corroborating evidence, not a new rule).
**Classification:** C0 - corroboration of an existing architecture rule (Section 9.7 / CF-005), not a new finding
requiring any change.
**Resolution:** none needed; existing rule already covers this.
**Lock-file change:** none.
**Retest required:** none.
**External review required:** no.

## CF-013 - GenLayer Test Direct Mode fails on native Windows due to an unlink-while-open temp-file bug; passes on WSL/Linux

**Date:** 10 September 2026
**Status:** G0 VERIFIED (root cause identified; worked around at the environment level, not patched inside Reclose)
**Expected:** per current GenLayer testing-suite documentation, Direct Mode requires only Python and runs fully
in-memory - no Docker, simulator, or network - and should work on any supported host OS.
**Observed:** running `pytest` with the `direct_deploy` fixture (from `genlayer-test==0.30.0rc2`) natively on
Windows failed with `PermissionError: [WinError 32] The process cannot access the file because it is being used by
another process`, raised from `gltest/direct/loader.py::_inject_message_to_fd0`, which `os.dup2`s a temp file onto
stdin and then calls `os.unlink()` on it while the duplicated handle is still open - valid POSIX semantics, invalid
on Windows (a file cannot be unlinked while any handle to it is open). Running the identical pinned package/
contract under WSL (Ubuntu, Python 3.12.3) succeeded: `test_direct_smoke_deploy_and_increment PASSED`.
**Source/evidence:** `release-evidence/r1/g0/direct-mode-report.md`;
`release-evidence/r1/g0/direct-mode-test-output.txt`.
**Affected component:** `gltest.direct.loader` (part of `genlayer-test==0.30.0rc2`), Windows-native execution only.
**Affected Reclose files/requirements:** any Reclose CI or contributor workflow that runs `genlayer-test` Direct
Mode tests on native Windows must either run them under WSL/Linux/macOS, or wait for an upstream fix to
`gltest/direct/loader.py`'s temp-file handling on Windows. This does not affect live Studio-dev/61997 usage, which
does not go through this code path.
**Classification:** C1 - implementation refinement / host-platform compatibility note. Not a Reclose architecture
issue; not worked around by modifying GenLayer's package or by silently skipping the check - a real passing run
was obtained on a supported POSIX environment instead.
**Resolution:** document that Reclose's own CI (built later, at C3/D-phase) must run `genlayer-test` Direct Mode
suites on a POSIX runner (Linux CI images, WSL for local Windows contributors, or macOS), not native Windows,
until this upstream bug is fixed.
**Lock-file change:** none.
**Retest required:** re-verify if a newer `genlayer-test` patch release changes `_inject_message_to_fd0`.
**External review required:** no.

---

# 24. G0 promotion procedure

At the end of G0, Claude MUST update this document.

For every candidate version/network/runner item:

1. mark `G0 VERIFIED`, `BLOCKED`, or `CONTRADICTED`;
2. add the exact command or verification evidence reference;
3. write accepted values to the machine lock files;
4. append any new compatibility finding;
5. update `Last G0 verification`;
6. identify whether any retest is required before A0.

The document header then changes from:

```text
CANDIDATE BASELINE FOR G0 VERIFICATION
```

to:

```text
G0 VERIFIED EXECUTION BASELINE
```

only if all release-blocking compatibility checks are proven or formally accepted as external-only blockers under the Master Plan.

---

# 25. Last G0 verification

```text
Status: G0 VERIFIED EXECUTION BASELINE - all release-blocking verification targets proven with real evidence
Date: 2026-09-10 (external-review follow-up session, same G0 phase)
Commit: (no git repository initialized yet)
Claude session/report: G0 Toolchain Conformance - initial session, funded-deployment follow-up, and
  external-review closure session, all 2026-09-10
A0 audit packet: not yet prepared (A0 occurs after F0/F1, not after G0)
Accepted toolchain hash/reference: see toolchain/versions.lock, toolchain/runner.lock, toolchain/network.lock.json
Open blockers:
  1. RESOLVED - the repository owner funded a dedicated `reclose-deployer` Studio-dev account (100 GEN). A
     successful fee-funded deploy and write were completed and evidenced (see 25.1, CF-011, CF-012). The earlier
     unfunded revert (CF-009) is preserved as historical evidence, not deleted.
  2. RESOLVED - GenLayer Test Direct Mode (in-memory, Python-only, no Docker/simulator/network per current
     testing-suite documentation) was run and PASSED against the exact pinned smoke contract using
     genlayer-test==0.30.0rc2 (see 25.1, CF-013, release-evidence/r1/g0/direct-mode-report.md). The original
     framing of this item as blocked on "no Docker" was itself a misclassification - Direct Mode never required
     Docker; only Studio Mode does. Docker/localnet remains unexercised, but is not required for G0-TEST-01.
  3. RESOLVED - the runner-hash discrepancy (CF-010) was investigated and closed: the exact accepted
     `py-genlayer` hash is `5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` (not the S10 registry snapshot
     hash, which was proven unresolvable in the actual pinned RC family). `toolchain/runner.lock` corrected;
     the exact pinned contract was linted, Direct-Mode-tested, and deployed live to 61997 with a full
     read/write/post-state cycle (see 25.1, CF-010, release-evidence/r1/g0/deploy-success-pinned/).
  4. OPEN - repository has no git history yet (source_commit field in versions.lock is empty); to be resolved at F0.
```

## 25.1 Per-target G0 status (verification targets from Section 16)

```text
G0-NET-01 canonical RPC reachable                    PASS   (raw JSON-RPC POST, HTTP 200/JSON response)
G0-NET-02 returned chain identity = 61997             PASS   (eth_chainId 0xf22d = 61997; corroborated by CLI/JS/PY)
G0-NET-03 CLI studio-dev preset exists                PASS   (genlayer network list / info)
G0-NET-04 JS studioDevnet resolves correctly          PASS   (genlayer-js 2.0.0-rc.1 chains.studioDevnet)
G0-NET-05 Python studio_devnet resolves correctly     PASS   (genlayer-py 0.19.0rc2 chains.studio_devnet)

G0-TOOL-01 CLI exact version                          PASS   (0.40.0-rc.3)
G0-TOOL-02 genlayer-js exact version                  PASS   (2.0.0-rc.1)
G0-TOOL-03 genlayer-py exact version                  PASS   (0.19.0rc2)
G0-TOOL-04 genlayer-test exact version                PASS   (0.30.0rc2)
G0-TOOL-05 genvm-linter exact install source/version  PASS   (PyPI, 0.11.1rc2; resolves CF-003 as option A)
G0-TOOL-06 Python version                             PASS   (3.14.4, host tool runtime; in-VM runner is separate
                                                                WASM CPython 3.13 per runner registry)
G0-TOOL-07 Node/npm/pnpm versions                     PASS   (Node v24.16.0, npm 11.13.0)

G0-RUN-01 py-genlayer runner hash                     PASS   (5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng;
                                                                proven the correct pin for the genvm-manager
                                                                v0.6.0-rc3/rc4 family via CF-010 investigation,
                                                                superseding the earlier S10-sourced value)
G0-RUN-02 standard-library dependency hash            PASS   (kzr02ndm9et4qkmbqpq5djjt5sme2yt76n7sz1qbzax0knt6mam0;
                                                                read from the pinned runner's own runner.json)
G0-RUN-03 smoke contract validates against runner/SDK PASS   (genvm-lint check against the exact pinned hash:
                                                                lint + validation both passed)

G0-LINT-01 lint succeeds                              PASS   (re-run against the exact pinned hash)
G0-LINT-02 semantic validation succeeds               PASS   (re-run against the exact pinned hash)
G0-LINT-03 schema extraction succeeds                 PASS   (re-run against the exact pinned hash; identical
                                                                schema output to the floating-tag version)
G0-LINT-04 typecheck path established where supported PASS   (path established; 2 accepted false positives, CF-007)

G0-TEST-01 direct/local smoke test succeeds           PASS   (GenLayer Test Direct Mode - in-memory, Python-only,
                                                                no Docker/simulator/network - PASSED via `pytest`
                                                                using the `direct_deploy` fixture from
                                                                genlayer-test==0.30.0rc2, against the exact pinned
                                                                smoke contract; see CF-013 for a Windows-host-only
                                                                caveat worked around via WSL, and
                                                                release-evidence/r1/g0/direct-mode-report.md)
G0-DEP-01 smoke deploy submitted to 61997             PASS   (pinned-hash deploy tx
                                                                0x83338017fd8376805c722b16a91128abe2a150ccdb9fb812c5023c32942b1c30,
                                                                contract 0x03ABA5917a9522A051f7bF522F266DCeF70f072D;
                                                                the earlier floating-tag deploy
                                                                0xe1a7f8afb21a543bab63ad6432912f9f8c4329c194320e8270e42380106d4ff5
                                                                and the original reverted attempt
                                                                0x90140b97d71bd1904ad263085399c6b494fae259680a22f4f054dd59a33b9d2a
                                                                both remain preserved as historical evidence, CF-009/CF-010)
G0-DEP-02 tx id persisted                             PASS   (all tx hashes recorded immediately in
                                                                release-evidence/r1/g0/smoke-deployment.json,
                                                                deploy-success-pinned/, and smoke-test-report.txt)
G0-DEP-03 lifecycle observed                          PASS   (Finalized . Accepted, via `genlayer receipt`, for
                                                                the pinned deploy tx
                                                                0x83338017fd8376805c722b16a91128abe2a150ccdb9fb812c5023c32942b1c30
                                                                and pinned write tx
                                                                0xa8e409b05e2304b8dfb9491abb169029b99ca3dade84bb6483470906fd4dcef0)
G0-DEP-04 execution result verified                   PASS   (txExecutionResult=1 / FINISHED_WITH_RETURN checked
                                                                as a field distinct from lifecycle status, for both
                                                                pinned transactions - consistent with CF-005)
G0-DEP-05 deployed state/read verified                PASS   (`get_counter` on the pinned contract
                                                                0x03ABA5917a9522A051f7bF522F266DCeF70f072D read 0
                                                                immediately after deploy, then 1 after the write)
G0-FEE-01 deploy fee path proven                      PASS   (SDK-derived via --fee-profile ->
                                                                genlayer-js estimateTransactionFees() against
                                                                Studio-dev's live sim_getFeeConfig policy; fee
                                                                deposit 225000000000063129 wei; no hand-derived
                                                                FeesDistribution; see CF-011)
G0-FEE-02 representative write fee path proven        PASS   (pinned-contract increment write, same SDK-derived
                                                                fee path; receipt shows paid_fee_value and
                                                                total_refunded fields, independently corroborated
                                                                by account balance deltas; see CF-012)
```

## 25.2 Correction: G0-TEST-01 resolution (external review, 2026-09-10)

The prior version of this section reasoned that the absence of a Docker-based `localnet` simulator left
`G0-TEST-01` formally unprovable and proposed treating that as a non-blocking residual item pending repository-owner
ratification. External review correctly identified that this reasoning rested on a wrong premise: the *Master
Plan's* `G0-TEST-01` requirement is to run "available direct/local tests," and GenLayer's own current
testing-suite documentation defines two distinct testing modes:

```text
Direct Mode   - Python only, in-memory, no Docker/simulator/network
Studio Mode   - requires a Docker-based local Studio simulator
```

Docker/localnet is a *Studio Mode* requirement, not a *Direct Mode* requirement. `genlayer-test==0.30.0rc2` (the
exact pinned package) ships Direct Mode as `gltest.direct` (fixtures `direct_vm`/`direct_deploy`, auto-registered
pytest plugin `gltest_direct`). This session's earlier attempt to satisfy `G0-TEST-01` only tried `gltest`'s
network-mode CLI runner (which does require a network target) and never tried Direct Mode - that was the actual
gap, not the absence of Docker.

Direct Mode was subsequently run against the exact pinned smoke contract via `pytest` (see CF-013 for a
Windows-host-only bug that was worked around via WSL, not by modifying Reclose or GenLayer code) and **PASSED**,
proving in-memory: deployment, initial `get_counter()==0`, `increment()` execution, and post-state
`get_counter()==1` - all without Docker, a simulator, or a network call. Full evidence:
`release-evidence/r1/g0/direct-mode-report.md` and `direct-mode-test-output.txt`.

**Conclusion: `G0-TEST-01` is `PASS`**, not `PARTIAL / EXTERNAL BLOCKER`. Docker/`localnet` absence never blocked
this target; it blocks a different, Studio-Mode-specific testing path that G0-TEST-01 does not require. `OB-002`
is closed accordingly (see `docs/execution/Open Blockers.md`).

---

# 26. Permanent compatibility rule

> **Pin what Reclose actually runs, prove what Reclose actually deploys, and never turn a release-candidate assumption into architecture truth.**
