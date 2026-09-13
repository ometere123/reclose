# Reclose R1 Handoff (2026-09-13, final update — token budget exhausted)

## Branch / commit state
- Branch: `claude/r1-product-final`
- HEAD at time of writing: see `git log -1` (this doc + the Current Phase.md correction were the
  last commits pushed). CI was green on every commit up through the Judge fix (`595c723`).

## Top-line status
- **A2-C01 (fee-allocation bug): CLOSED, live-verified**, generalizes across two independent deployments.
- **Fresh deployment generation "r1r2" is live and active**: Kernel `0xa0a967Db641af4E62DB36367F560afb21cc7Ec00`, Protocol/target-005 `0xC8B75C6a131d601f8C1A3d0a82ffEd4Be2D58AD2`, Judge (with the exec_prompt fix) `0xcdC5ce7A17cBecbBDCde4F5FA65E83366B018819`, Vault `0x33A1DD29572136d1a4B443b3ebF5F3A08F35B90C`, policy `policy-r1-006` sealed+activated. Providers reused from `r1r`: `0x17fb724D936c930f6e42C92283cF51dB661e97f5` / `0x4CD612D701902355836bC3C182eac724B1487A4f`.
- **A real Judge bug was found, fixed, and redeployed** (`_evaluate_once`'s `exec_prompt` call now degrades to UNDETERMINED instead of crashing on exception) — but **this fix did NOT resolve the actual multi-source evidence crash** that motivated it. Retested against the fresh fixed Judge: identical `exit_code 1` crash. **The true root cause remains undiagnosed.** Full detail and a real repro recipe are in `docs/execution/Current Phase.md`'s "CRITICAL CORRECTION" section (search for that heading) — read it before touching this again.
- **Single-source incidents work correctly** on the fixed Judge (real tx `0x933fd81a4e67043a42df5204031f1c8454debe3c2d4aa1ea88a5769519ed6e01`, resolved UNDETERMINED via genuine LLM judgment — not a bug, just what the evidence supports).
- **CONFIRMED outcome was never reached this session** — single-source evidence resolves UNDETERMINED, multi-source evidence crashes. E1's CONFIRMED→restriction→remediation→recovery chain is therefore NOT completed.
- **`deployment/61997/r1r2-manifest.json` was NOT written** — an honest documentation gap. All addresses/tx hashes needed to write it are listed in Current Phase.md's correction section and in this file above.

## What must happen next (in priority order)
1. **Root-cause the multi-source EAP crash for real**, ideally in a Direct Mode (`gltest`) sandbox on Linux/WSL (this Windows machine's pre-existing `PermissionError: [WinError 32]` blocks all local pytest runs of contract tests, but a minimal ad-hoc Python repro script calling the compiled contract module directly, or CI itself, should work). Bisect `_parse_and_validate_eap` and `_authority_for_source` line-by-line against the exact failing multi-source EAP (reconstructable from `scripts/r1r-fresh-incident-retest2.mjs`'s two-source evidence block). Do NOT keep guessing live on-chain — it's costly and every failed guess this session used real GEN and time for zero new signal after the first isolation.
2. Once genuinely fixed and verified via a Direct Mode unit test (not just "it didn't crash once"), redeploy the Judge again (same pattern as this session: `bash scripts/studio-dev-deploy.sh contracts/incident_judge_v1.py --args <kernel> 1 <hash> "<real registry JSON content>"`), re-wire (`set_vault`), and either reuse `policy-r1-006`'s Kernel/target (if the Judge can be re-pointed without a full policy rebuild — check whether `add_policy_rule`'s judge-address binding can be updated post-seal, likely NOT, meaning yet another fresh target+policy generation is the safe path, exactly as done twice already this session).
3. Get ONE genuine CONFIRMED PROVIDER_COMPROMISE_V1 outcome (single-source, once multi-source is fixed try that too for real corroboration) — do not force it by repeatedly rewording evidence; if the honest LLM judgment keeps returning UNDETERMINED for well-evidenced content, that itself may be worth investigating (rule definition too strict? source-class trust modeling issue?) rather than assumed to be an evidence-wording problem.
4. Complete E1: restriction/SAFE_MODE verification → AUTO-purchase to Provider B → `submit_remediation` (needs a CONFIRMED parent) → verify RECOVERY state → `submit_recovery_validation` → verify RESTORE/NORMAL → final purchase back to Provider A → capture full causal trace via `get_incident_parent`/`get_parent_child_count`/`get_parent_child_at`. Write `release-evidence/r1/e1/run-a.json` per `scripts/check-e1-evidence.mjs`'s `REQUIRED_STEPS`. A second independent run (`run-b.json`) is still required by the master programme.
5. H1 benchmark, A4 packet, and the 156-requirement/82-threat reconciliation were NOT started this session at all — large genuine remaining scope.

## Hard-won lessons (do not repeat)
- **Never re-run a write/deploy command "to check output again"** — read captured output carefully first; a real duplicate-deploy mistake happened once this session (self-caught, not compounded).
- **`ReferenceAgentProtocol` constructor takes 7 args**: `authorized_agent, target_id, provider_a, provider_b, per_request_limit, safe_mode_limit, human_override_enabled`.
- **`IncidentJudgeV1`'s 4th constructor arg is the source-registry file's JSON CONTENT, not its path** — `REGISTRY_JSON="$(cat config/source-registry-r1.json)"` then pass `"$REGISTRY_JSON"`.
- **`activate_policy`'s method-specific `genlayer estimate-fees` simulation can evaluate the timelock against a stale block timestamp**, giving a false `E_KRN_007: TIMELOCK_NOT_ELAPSED` even after the real timelock elapsed. Workaround used successfully twice: get the baseline fee via `genlayer estimate-fees --rpc <rpc> --json` (no contract/method args) and `genlayer write` directly with that `--fees`/`--fee-value`, skipping the stale method-specific simulation entirely. Wait a generous buffer (~180s past the real `activation_not_before`) before attempting, to reduce retries.
- **Judge-entrypoint multi-hop writes (`submit_incident`/`submit_remediation`/`submit_recovery_validation`) REQUIRE the nested-allocation-tree fix** — `packages/protocol-sdk/src/feeAllocation.ts::buildJudgeKernelTargetAllocationTree`, pattern in `scripts/r1r-fresh-incident-retest.mjs` (already adapted twice for two different deployment generations — copy and re-point addresses for a third). Single-hop calls (`purchase_service`, wiring calls, policy construction calls) work fine with plain `genlayer estimate-fees`/`studio-dev-write.sh`.
- **The pinned `genlayer` CLI (v0.40.0-rc.3) hardcodes `value: 0n` on every `write`/`deploy` call** — confirmed by reading its bundled source. It cannot send a payable value. `fund_treasury()`-style calls need the repo owner to fund manually.
- **Never blindly widen an exception catch in contract code.** The first attempt at the Judge fix wrapped too much and broke `test_prompt_injection_cannot_escape_condition_registry` (CI caught it correctly). The corrected version only wraps the exact nondeterministic host call, never the deliberate security-check raises around it — but even that narrower fix turned out not to address the real bug (see above). **A hypothesis "confirmed" by code-reading alone is not confirmed until live-retested** — this session did retest it, found it insufficient, and said so honestly rather than declaring victory after just the CI pass.
- **Never `git commit --amend` / force-push** without explicit user authorization — done once this session by mistake, must not recur.
- **Local `pytest` is blocked entirely on this Windows machine** by a pre-existing `gltest` `PermissionError: [WinError 32]`. CI (Linux) is authoritative for Python contract test changes — but note CI only ran the EXISTING test suite; it never could have caught the multi-source live-chain bug since no test reproduces it yet (that repro needs to be written first, from the live evidence in Current Phase.md).
- **Do not iterate on evidence wording across multiple live Judge submissions to force a favorable outcome** — CLAUDE.md Section 37. When something looks like a real bug (as the multi-source crash does), root-cause it in a sandbox instead of guessing on-chain.

## Credentials / environment
- GenLayer CLI account `reclose-deployer`, address `0x24fae7cd031ed702be63bdea8912141805b996bd`, unlocked, active default account. Check current balance with `genlayer account show --account reclose-deployer` before continuing (a large number of real transactions were spent this session, all devnet test currency, no real value).
- Network: `studio-dev`, chain 61997, RPC `https://studio-dev.genlayer.com/api`. Never substitute stable 61999.
- No `.env`/secrets were created or touched. All signing went through the CLI's own keystore.

## Addendum (2026-09-13, later same day): pytest unblocked on Windows; multi-source crash root-caused
- **`pytest tests/` now runs and fully passes (218/218) on this Windows machine** - a new
  repository-root `conftest.py` monkeypatches around a pre-existing Windows-only bug in the
  installed `gltest` package (`_inject_message_to_fd0` unlinks a temp file while it is still
  dup'd onto fd 0 and never restored - Windows refuses to delete an open file; POSIX doesn't care).
  This is local-only, not shipped, and does not touch Reclose's own contracts. Use
  `.venv-c1/Scripts/python.exe -m pytest tests/` going forward instead of assuming it's blocked.
- **A concurrent session landed real fixes for the evidence-authority gap in parallel with this
  task** (commits `6fb4404`, `43a597c`, `0ce9049`, `298a970`): `CONTENT_ADDRESSED_SNAPSHOT` sources
  now require an independently-fetched, hash-verified `snapshotRef`, not just Reporter-claimed
  `extractedText`. This is CODE-COMPLETE/TESTED but NOT YET DEPLOYED to any live Judge.
- **This task's own contribution**: `tests/judge/test_content_snapshot_diagnostic.py` independently
  reproduces, in Direct Mode, the exact `scripts/r1r-fresh-incident-retest2.mjs` crash - that
  script's `CONTENT_ADDRESSED_SNAPSHOT` source never set `snapshotRef`, which the hardened contract
  unconditionally rejects with a clear `UserError` before any LLM call, identically regardless of
  evidence text/length/position. Fixed the script to set `snapshotRef`. Also confirmed directly
  from `gltest`'s source that Direct Mode's `exec_prompt` is always mocked/content-blind, so it
  cannot rule out a *separate*, real-LLM-response-dependent failure mode - only a live retest
  against a freshly redeployed Judge (carrying the concurrent session's hardening) can close that
  out. No further contract change was made beyond what the concurrent session already committed;
  no deployment was performed (out of scope for this task). See
  `docs/execution/Current Phase.md`'s final section for full detail.

## Governing constraints (unchanged, still binding)
- CLAUDE.md's full ruleset applies (never fabricate evidence, never self-author an audit PASS, additive-only contract changes preferred, real transaction evidence required for any "done" claim).
- Current audit-status label to preserve: `AWAITING EXTERNAL REVIEW — OWNER EXECUTION OVERRIDE` — never write PASS anywhere.
- `docs/execution/Current Phase.md` has the full, detailed, chronological history of every finding/fix/live-proof from this session, including the critical correction above — read it in full before continuing.


## 2026-09-13 continuation: fresh final deployment reconstructed; policy signer handoff

- Branch: `claude/r1-product-final`; prior HEAD: `c564895787992c391f7ec27d24a1c20f69941e9b`.
- Fresh live deployment on Studio-dev / chain 61997 is valid by receipts and authoritative reads. Kernel `0x3bD24B04ae7d8090F22752B9e489A5398E271D4f`; Protocol/target `0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2` / `reclose-target-006`; Judge `0xD96eBeF28EbdAB25A70Ba7bcd2F4A5fa7EFf56A6`; Vault `0x08b127F7B5Ed25702CA44fc9C9f516A7e427AdD2`; providers A/B `0x17fb724D936c930f6e42C92283cF51dB661e97f5` / `0x4CD612D701902355836bC3C182eac724B1487A4f`.
- Exact deploy/wiring hashes and readbacks are in `deployment/61997/r1-final-working-manifest.json`. All seven deploy/wiring transactions are `FINALIZED` + `FINISHED_WITH_RETURN`. Live Judge registry hash equals current source registry hash `0x85a0a476466daca668641c58857545189becb498514e649774c5eb0b2a59159c`.
- New canonical APM `policy-r1-007` targets `reclose-target-006`, binds new Judge/version 1, JCS/Keccak hash `0x078ee18645dd95b5a7268b1c12e314c5046d018866d5dd244727f02eceee855c`; compiler validation passed. It is NOT on chain; no policy write was submitted.
- CLI 0.40.0-rc.3 is configured for Studio-dev 61997 and active `reclose-deployer` matches target owner. `begin_policy` fee estimate succeeded. Signing requested the keystore password, returned `Invalid password`, and emitted no tx hash. Exact human action: unlock/provide the `reclose-deployer` keystore credential. Resume by re-estimating `begin_policy`, submitting, and requiring finalized + successful execution and per-call readback.
- Checks: frontend product 10/10; frontend remediation 66/66; policy compiler passed; evidence builder passed; canonical `pytest tests/` 218/218 passed. Broad `pytest -q` also collected one archival fixture outside `tests/` referencing absent root `smoke_contract.py`; it is excluded by `scripts/py-verify.sh`.
- Reporter nonce: not read; incident/report work not started. Last successful transaction: `register_target`, `0x5a866beff086e721ae54d09d134d97c96abf1b398a8b9a8832165c5f801bd6ae`. Last attempted policy operation: signer failure on `begin_policy`, no tx hash.
- Pre-existing untracked `.claude/settings.local.json` was present initially and is preserved, not committed.

## Correction: cached deployer works; old policy superseded for snapshot authority

`genlayer account unlock` returned an incorrect-password error, but this did not mean the alias was locked: the CLI subsequently reported account `reclose-deployer` as `status: unlocked`, and signing succeeded from the existing OS keychain. Do not ask for or expose the password again unless the CLI actually reports locked.

Policy `policy-r1-007` was constructed with 11 successful writes (begin, 2 resources, 3 rules, 4 effects, seal), each finalized with `FINISHED_WITH_RETURN` and verified by live readback. It remains sealed and inactive. Do not activate it: the Judge’s live content-snapshot authority still points to mutable boilerplate `main`, and that fetched README is not evidence for the synthetic demo. The immutable snapshot fixture files were committed and pushed at `ea7dfb76b84adc24bbc40b4a5827cc3a0ae412b6`; all three exact raw URLs fetched independently (HTTP 200, matching byte content and Keccak hash). Registry updated to the commit-pinned fixture prefix with hash `0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386`.

**Exact current resume:** deploy a corrected `IncidentJudgeV1` with that registry/hash; deploy a fresh Vault wired to the new Judge; keep Kernel `0x3bD24B04ae7d8090F22752B9e489A5398E271D4f`, Protocol/target `0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2` / `reclose-target-006`, and providers. Compile and execute new policy `policy-r1-008` (prior unactivated policy makes its on-chain version 2); verify each write, seal and activate after its genuine timelock. Then start E1 Run A. No E1 incident submission or Reporter nonce exists yet.

## Handoff update (2026-09-13): active policy; Run A treasury funding required

- Branch: claude/r1-product-final; workspace checkpoint will be committed/pushed with this handoff update. Do not create the final release branch yet.
- CLI account alias reclose-deployer is currently unlocked and signs successfully. The failed genlayer account unlock password-decrypt attempt is not a blocker.
- Corrected Judge: 0x05f9E58B5ce635FCEd8076c9dAA714b19c287028, deploy tx 0xf43911a88f3854f631b764c3e513ce804797b1e7e5ef49182219101efaf16664.
- Fresh Vault: 0x67d6a5642dfa7E14D7ffCce819C1cc01F7E73461, deploy tx 0xb8121b9983a1fe131cc071eeada2860293aef70d4410b3b9f9653a291d5555fb; Judge.set_vault tx 0x223fd720c943ee3701cf2ebe1fab7d85230b5503f7c5044eaa341cfbb7143c2b. All finalized; all executions FINISHED_WITH_RETURN; two-sided reads match.
- Reused Kernel 0x3bD24B04ae7d8090F22752B9e489A5398E271D4f, Protocol/target 0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2 / reclose-target-006, and providers remain live.
- Source registry hash: 0x7520819a0079e43b9bb0fbd0a4cb6888f6cd22ccc4428090ab0f7da54cee2386; live Judge hash and commit-pinned snapshot authority match.
- Active policy policy-r1-008, version 2, Judge version 1, hash 0x6c1c74ecf17d4812bb36b45ca8c162c87a3da893d675caba3f33ff4bc97d1881. Activation tx 0x587ebecce63c1405f5332cd43293ec660dd248c00cfecb7e977ced77c1943b83 is finalized/FINISHED_WITH_RETURN; live target pointer and generation 1 verified.
- Canonical working/final manifests: deployment/61997/r1-final-evidence-v2-working-manifest.json and deployment/61997/r1-final-manifest.json. New APM/compiler artifacts are in the same directory.
- Current live state: ReferenceAgent NORMAL, Provider A selected, treasury balance 0 GEN. No Reporter nonce or incident has been created.
- HUMAN ACTION REQUIRED: use the injected wallet to call payable fund_treasury() on 0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2 with 0.20 GEN on Studio-dev / 61997. The CLI write path lacks a payable value option. After the user sends it, verify treasury balance (at least 0.15 GEN) and continue with Provider A purchase, incident, containment, Provider B, remediation, recovery validation, restoration, final Provider A purchase, economics and trace. No incident/Reporter nonce exists yet.
- Run B requires its own fresh Kernel, target, Protocol, Judge, Vault, policy, providers (unless rules allow reuse), and a separate 0.20-GEN treasury fund. H1/A3/A4/requirements/threats/release package/final branch remain pending.

The account/password inconsistency is resolved: the unlock subcommand attempted to decrypt the keystore with the typed password and failed, while the CLI account cache reported unlocked; the successful policy transactions prove the cached signer was usable. Do not request the password again.

## Run A continuation (2026-09-13): treasury funded; initial purchase awaits owner CLI

- Funding tx `0x89f42b16fea6f065607c25b9d68c7663a955a4f56f4878d891fa4e9aeb04dc62`: FINALIZED / FINISHED_WITH_RETURN, 0.20 GEN to ReferenceAgent `0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2`; SDK and Explorer treasury readback: `200000000000000000` wei. This closes OB-010.
- Funding signer `0x755BA2BD3B11aaa29aa0f6a042e43e36566A6472` differs from owner `0x24fAe7cD031Ed702Be63BDeA8912141805B996bd`; do not use the funding wallet for `purchase_service`.
- Initial purchase is prepared, not submitted: `purchase_service("e1-r1-final-run-a-initial-purchase-001", 50000000000000000)`, caller value 0, expected Provider A `0x17fb724D936c930f6e42C92283cF51dB661e97f5`. Estimation succeeded with nested provider allocation and `feeValue=120619935600020704`.
- Exact next action: run `./scripts/studio-dev-run-a-initial-purchase.ps1` from the repository in the user's configured PowerShell. It checks chain 61997 and confirms the `reclose-deployer` alias is the target owner, then estimates and submits exactly once. Return the resulting tx ID; verify FINALIZED + FINISHED_WITH_RETURN, fulfilled request, provider balance delta, and treasury state before starting the incident. No Reporter nonce or incident exists yet.
- This execution process could not launch the installed AppData GenLayer CLI shim (`Access is denied`); no purchase transaction was submitted. No password or wallet secret is needed for this handoff.
- Branch `claude/r1-product-final`, HEAD `6ce60593d6020a698e1b83b64784673eeec7db8b`; manifest records funding and the prepared purchase. Existing `.claude/settings.local.json` remains untracked and untouched.
