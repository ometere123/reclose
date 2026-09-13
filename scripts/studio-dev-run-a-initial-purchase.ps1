param()

$ErrorActionPreference = 'Stop'

$rpc = 'https://studio-dev.genlayer.com/api'
$expectedChainId = '61997'
$expectedOwner = '0x24fAe7cD031Ed702Be63BDeA8912141805B996bd'
$target = '0xAbb0446A9e4e50d8d7C463F7F3eae320C0Ba9ca2'
$requestRef = 'e1-r1-final-run-a-initial-purchase-001'
$amountWei = '50000000000000000'

# Prevent a mistaken write on another GenLayer network.
$networkInfo = (& genlayer network info 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $networkInfo -notmatch "chainId:\s*'$expectedChainId'") {
    throw "Refusing to submit: GenLayer CLI is not configured for Studio-dev chain $expectedChainId.`n$networkInfo"
}

# purchase_service is owner-only. Verify the configured alias resolves to the registered owner.
$accountInfo = (& genlayer account show --account reclose-deployer 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $accountInfo -notmatch [regex]::Escape($expectedOwner)) {
    throw "Refusing to submit: reclose-deployer did not verify as target owner $expectedOwner.`n$accountInfo"
}

# Estimate the exact call with real arguments through the repository's pinned SDK helper.
# It emits one JSON object and uses the same Studio-dev fee-estimation RPC as the CLI.
$estimateArgs = '["e1-r1-final-run-a-initial-purchase-001","50000000000000000"]'
$estimateOutput = & node (Join-Path $PSScriptRoot 'estimate-studio-dev-write.mjs') $target purchase_service --args $estimateArgs --bigint-arg-index 1 --account $expectedOwner
$estimateExitCode = $LASTEXITCODE
if ($estimateExitCode -ne 0) {
    throw "Fee estimation failed; no purchase was submitted.`n$($estimateOutput | Out-String)"
}
$estimate = ($estimateOutput -join [Environment]::NewLine) | ConvertFrom-Json
if ($null -eq $estimate.distribution -or $null -eq $estimate.feeValue) {
    throw 'Fee estimation did not return both distribution and feeValue; no purchase was submitted.'
}

$fees = [ordered]@{ distribution = $estimate.distribution }
if ($estimate.messageAllocations -is [array] -and $estimate.messageAllocations.Count -gt 0) {
    $fees.messageAllocations = $estimate.messageAllocations
}
$feesJson = ConvertTo-Json -InputObject $fees -Depth 100 -Compress

Write-Host "Submitting one Provider A purchase on Studio-dev (chain $expectedChainId)."
Write-Host "Target: $target; request: $requestRef; treasury spend: 0.05 GEN; transaction fee value: $($estimate.feeValue)."
Write-Host 'The write uses the verified reclose-deployer owner signer. Do not run this script a second time for this request.'

$writeOutput = & genlayer write $target purchase_service --rpc $rpc --fees $feesJson --fee-value $estimate.feeValue --args $requestRef $amountWei 2>&1
$writeExitCode = $LASTEXITCODE
$writeOutput | ForEach-Object { Write-Output $_ }
if ($writeExitCode -ne 0) {
    throw "Purchase write failed with exit code $writeExitCode. Inspect the CLI output above before retrying."
}
