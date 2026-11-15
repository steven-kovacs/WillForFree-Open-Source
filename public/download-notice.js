// The download dialog and the ZIP use the same notice for the selected kit.
export function downloadNotice(profile) {
  if (profile.use === "planning" || profile.use === "appointment") {
    return "This kit contains planning notes for a future will. There is no will to sign. Check that the notes record your wishes. You keep your legal rights.";
  }
  if (profile.key === "US-NC") {
    return "Check the North Carolina form and follow its signing instructions. All warranties, rights and remedies available under applicable law are preserved.";
  }
  return "Check your details and follow the local signing instructions. Where the law allows, WillForFree excludes liability only for the part of a loss caused by errors in your answers or required steps you miss. Your statutory rights are protected.";
}
