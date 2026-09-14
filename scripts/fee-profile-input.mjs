const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL = /^\d+$/;

/** Validate the complete fee-profile batch before any Studio-dev RPC is sent. */
export function validateFeeProfileInputs(profiles, expectedGeneration) {
  const errors = [];
  if (!Array.isArray(profiles) || profiles.length === 0) return ["profile input must be a non-empty array"];
  if (!String(expectedGeneration ?? "").trim()) errors.push("active deployment generation is required");
  const seen = new Set();

  for (const profile of profiles) {
    const id = String(profile?.id ?? profile?.name ?? "<unnamed>");
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      errors.push(`${id}: profile must be an object`);
      continue;
    }
    if (!profile.id || seen.has(profile.id)) errors.push(`${id}: profile id is missing or duplicated`);
    seen.add(profile.id);
    if (profile.deploymentGeneration !== expectedGeneration) {
      errors.push(`${id}: deployment generation ${profile.deploymentGeneration || "<missing>"} does not match ${expectedGeneration || "<missing>"}`);
    }

    if (String(profile.id).endsWith("-deploy")) {
      errors.push(`${id}: deployment fee estimation is not supported by this write profiler; do not send a generic write estimate as a deploy profile`);
      continue;
    }

    if (profile.knownFailure) {
      const failure = profile.knownFailure;
      if (failure.status !== "ESTIMATION_FAILED" || !String(failure.error ?? "").trim() || !String(failure.evidenceRef ?? "").trim()) {
        errors.push(`${id}: known failure must retain ESTIMATION_FAILED, exact error, and evidenceRef`);
      }
      continue;
    }

    if (!ADDRESS.test(String(profile.address ?? ""))) errors.push(`${id}: valid deployed contract address is required`);
    if (!String(profile.functionName ?? "").trim()) errors.push(`${id}: functionName is required`);
    if (!Array.isArray(profile.args) || profile.args.length === 0) errors.push(`${id}: real non-empty args are required before any RPC call`);
    if (profile.args && /PLACEHOLDER|REPLACE_WITH/i.test(JSON.stringify(profile.args))) errors.push(`${id}: placeholder argument is forbidden`);
    if (profile.value !== undefined && !DECIMAL.test(String(profile.value))) errors.push(`${id}: value must be an explicit decimal integer string`);
  }

  return errors;
}
