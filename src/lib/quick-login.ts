import "server-only";

/**
 * Single toggle for the one-click demo/dev login. ClickfieldAI is still in
 * the build-out phase and wants this available in production for now --
 * set DISABLE_QUICK_LOGIN=true (env var, no code change) to turn it off
 * once the system moves past active development.
 */
export function isQuickLoginEnabled() {
  return process.env.DISABLE_QUICK_LOGIN !== "true";
}
