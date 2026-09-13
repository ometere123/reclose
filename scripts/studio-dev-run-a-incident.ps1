param(
    [string]$ManifestPath = 'deployment/61997/r1-lifecycle-split-run-a-working-manifest.json'
)

$ErrorActionPreference = 'Stop'
$expectedChainId = '61997'
$repoRoot = Split-Path $PSScriptRoot -Parent
$manifestFullPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ManifestPath))
$manifest = Get-Content -LiteralPath $manifestFullPath -Raw | ConvertFrom-Json
$expectedOwner = [string]$manifest.deployer
$judge = [string]$manifest.contracts.IncidentJudgeV1.address
$kernel = [string]$manifest.contracts.AssuranceKernel.address
$target = [string]$manifest.contracts.ReferenceAgentProtocol.address
$targetId = [string]$manifest.targetId
if ($manifest.policy.status -ne 'active' -or [string]::IsNullOrWhiteSpace($expectedOwner) -or
    [string]::IsNullOrWhiteSpace($judge) -or [string]::IsNullOrWhiteSpace($kernel) -or
    [string]::IsNullOrWhiteSpace($target) -or [string]::IsNullOrWhiteSpace($targetId)) {
    throw "Refusing to prepare an incident from an incomplete or inactive deployment manifest: $ManifestPath"
}
$script:LastStudioDevCommandStart = [DateTimeOffset]::MinValue
$rpcThrottlePath = Join-Path $PSScriptRoot 'studio-dev-rpc-throttle.mjs'
$rpcThrottleUrl = ([System.Uri]$rpcThrottlePath).AbsoluteUri

function Invoke-StudioDevCommand {
    param(
        [Parameter(Mandatory)][string]$Executable,
        [string[]]$Arguments = @()
    )

    # Commands are sequential. In addition, every Node process preloads the shared fetch guard,
    # which serializes all Studio-dev RPC calls, spaces ordinary calls by 2.6s, and backs off
    # receipt/status polling and transient capacity/rate-limit responses.
    if ($script:LastStudioDevCommandStart -ne [DateTimeOffset]::MinValue) {
        $elapsed = ([DateTimeOffset]::UtcNow - $script:LastStudioDevCommandStart).TotalMilliseconds
        if ($elapsed -lt 2600) { Start-Sleep -Milliseconds ([int][Math]::Ceiling(2600 - $elapsed)) }
    }

    $oldNodeOptions = $env:NODE_OPTIONS
    $oldThrottleFlag = $env:RECLOSE_STUDIO_RPC_THROTTLE
    try {
        $env:NODE_OPTIONS = ((@($oldNodeOptions, "--import=$rpcThrottleUrl") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' ')
        $env:RECLOSE_STUDIO_RPC_THROTTLE = '1'
        $output = @(& $Executable @Arguments)
        $exitCode = $LASTEXITCODE
        $script:LastStudioDevCommandStart = [DateTimeOffset]::UtcNow
        return [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
    }
    finally {
        $env:NODE_OPTIONS = $oldNodeOptions
        $env:RECLOSE_STUDIO_RPC_THROTTLE = $oldThrottleFlag
    }
}

# The configured built-in network must be Studio-dev. Do not use --rpc here: the GenLayer CLI
# skill warns that overriding a built-in network RPC drops its chain configuration.
$networkResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments @('network', 'info')
$networkInfo = ($networkResult.Output | Out-String)
if ($networkResult.ExitCode -ne 0 -or $networkInfo -notmatch "chainId:\s*'$expectedChainId'") {
    throw "Refusing to submit: configure the GenLayer CLI for Studio-dev chain $expectedChainId first.`n$networkInfo"
}

$activeAccountResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments @('account')
$activeAccountInfo = ($activeAccountResult.Output | Out-String)
if ($activeAccountResult.ExitCode -ne 0 -or $activeAccountInfo -notmatch [regex]::Escape($expectedOwner)) {
    throw "Refusing to submit: the active GenLayer account is not the registered target owner $expectedOwner.`n$activeAccountInfo"
}
$deployerResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments @('account', 'show', '--account', 'reclose-deployer')
$deployerInfo = ($deployerResult.Output | Out-String)
if ($deployerResult.ExitCode -ne 0 -or $deployerInfo -notmatch [regex]::Escape($expectedOwner)) {
    throw "Refusing to submit: account alias reclose-deployer did not verify as target owner $expectedOwner.`n$deployerInfo"
}

# The Node preparer is read-only: it checks live deployment/policy/registry/target state, fetches
# the immutable fixture, reads the nonce, builds the EAP, and asks the pinned SDK for the nested
# fee allocations. Do not proceed if any check or simulation fails.
$preparedResult = Invoke-StudioDevCommand -Executable 'node' -Arguments @((Join-Path $PSScriptRoot 'r1-final-run-a-incident-prepare.mjs'), $ManifestPath)
$preparedLines = $preparedResult.Output
if ($preparedResult.ExitCode -ne 0) {
    throw "Incident preparation or fee estimation failed; no report was submitted."
}
$preparedJson = $preparedLines -join [Environment]::NewLine
try { $prepared = $preparedJson | ConvertFrom-Json } catch {
    throw "Incident preparation did not return valid JSON; no report was submitted.`n$preparedJson"
}
if ($prepared.schema -ne 'reclose-e1-run-a-incident-prepared-v1' -or
    $prepared.network.chainId -ne 61997 -or
    $prepared.deployment.kernel -ne $kernel -or
    $prepared.deployment.judge -ne $judge -or
    $prepared.deployment.target -ne $target -or
    $prepared.deployment.targetId -ne $targetId -or
    $prepared.reporter -ne $expectedOwner -or
    $prepared.policy.active -ne $true -or
    $prepared.fixture.reality -ne 'SYNTHETIC' -or
    $prepared.args.Count -ne 8 -or
    $null -eq $prepared.fees.distribution -or
    $prepared.fees.messageAllocations.Count -lt 1 -or
    [string]::IsNullOrWhiteSpace([string]$prepared.feeValueWei)) {
    throw "Prepared report failed the wrapper's final shape/identity checks; no report was submitted.`n$preparedJson"
}

# Re-read the nonce after all simulations and immediately before the signer call. A changed nonce
# invalidates the prepared EAP and incident identity, so stop and rebuild rather than submit stale data.
$nonceResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments @('call', $judge, 'get_reporter_nonce', '--args', $expectedOwner)
$nonceOutput = ($nonceResult.Output | Out-String).Trim()
if ($nonceResult.ExitCode -ne 0 -or $nonceOutput -notmatch '^\d+$') {
    throw "Could not verify the current Reporter nonce from the CLI; no report was submitted.`n$nonceOutput"
}
if ([int]$nonceOutput -ne [int]$prepared.reporterNonce) {
    throw "Reporter nonce changed after preparation ($($prepared.reporterNonce) -> $nonceOutput); no report was submitted. Re-run this helper to rebuild fresh evidence and fees."
}

Write-Host "Prepared canonical synthetic E1 Run A compromise report."
Write-Host "Target: $targetId; policy: $($prepared.policy.key); reporter nonce: $($prepared.reporterNonce)."
Write-Host "Fixture: $($prepared.fixture.url)"
Write-Host "Evidence hash: $($prepared.fixture.contentHash); EAP hash: $($prepared.args[4])"
Write-Host "Fee value: $($prepared.feeValueWei) wei; nested allocations: $($prepared.fees.messageAllocations.Count)."
Write-Host 'Submitting once with the active registered owner account. Save the top-level transaction ID from the CLI output.'

$feesJson = ConvertTo-Json -InputObject $prepared.fees -Depth 100 -Compress
$writeArgs = @(
    'write', $judge, 'submit_incident',
    '--fees', $feesJson,
    '--fee-value', [string]$prepared.feeValueWei,
    '--args'
) + @($prepared.args | ForEach-Object { [string]$_ })
$writeResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments $writeArgs
$writeOutput = $writeResult.Output
$writeOutput | ForEach-Object { Write-Output $_ }
if ($writeResult.ExitCode -ne 0) {
    throw "Incident write failed with exit code $($writeResult.ExitCode). Inspect the output; do not rerun blindly."
}

# Poll the returned transaction through the same throttled CLI transport. The preloaded fetch
# guard applies a growing delay to consecutive receipt/status polls and retries only transient
# RPC/capacity responses. This command is reached only after the complete SDK fee preflight passes.
$writeText = $writeOutput -join [Environment]::NewLine
$txMatch = [regex]::Match($writeText, '(?im)(?:Transaction ID|tx_id)["'']?\s*[:=]\s*["'']?(0x[0-9a-f]{64})')
if (-not $txMatch.Success) {
    throw "The live write returned no recognizable transaction ID. Do not resubmit; inspect the saved CLI output."
}
$txId = $txMatch.Groups[1].Value
Write-Host "Polling submitted incident transaction $txId with bounded Studio-dev receipt polling."
$receiptResult = Invoke-StudioDevCommand -Executable 'genlayer' -Arguments @('receipt', $txId, '--retries', '20', '--interval', '5000')
$receiptText = $receiptResult.Output -join [Environment]::NewLine
$receiptResult.Output | ForEach-Object { Write-Output $_ }
if ($receiptResult.ExitCode -ne 0 -or $receiptText -notmatch 'FINALIZED' -or $receiptText -notmatch 'FINISHED_WITH_RETURN') {
    throw "Incident transaction $txId did not verify as FINALIZED / FINISHED_WITH_RETURN. Do not resubmit; preserve this receipt output and inspect authoritative state."
}
