// Validation for project development-resource fields (see actions.ts /
// updateProjectDevResources). These are references/identifiers only —
// never credentials — so every validator also rejects a URL that embeds
// a username/password component.

type ValidationResult = { ok: true; value: string } | { ok: false; error: string };

function rejectEmbeddedCredentials(u: URL): string | null {
  if (u.username || u.password) return "URL must not include a username/password";
  return null;
}

export function validateGenericUrl(input: string): ValidationResult {
  const trimmed = input.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL, e.g. https://example.com" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "URL must start with http:// or https://" };
  }
  const credError = rejectEmbeddedCredentials(u);
  if (credError) return { ok: false, error: credError };
  return { ok: true, value: u.toString() };
}

// Accepts a GitHub repo URL, optionally with extra path segments
// (/tree/main, /pulls, etc.) and normalizes it down to the base
// https://github.com/{owner}/{repo} form, per spec: "Prefer storing the
// base repository URL rather than a specific file URL."
export function validateGithubRepoUrl(input: string): ValidationResult {
  const trimmed = input.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid GitHub URL, e.g. https://github.com/org/repo" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "URL must start with http:// or https://" };
  }
  const credError = rejectEmbeddedCredentials(u);
  if (credError) return { ok: false, error: credError };

  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "github.com") {
    return { ok: false, error: "Must be a github.com repository URL" };
  }
  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return { ok: false, error: "Enter a full repository URL, e.g. https://github.com/org/repo" };
  }
  const [owner, repo] = segments;
  return { ok: true, value: `https://github.com/${owner}/${repo.replace(/\.git$/, "")}` };
}

// Cheap guard against accidentally pasting a credential into a plain-text
// field (Claude account/workspace name, branch, tech stack). Not a secret
// scanner — just catches the obvious cases (known token prefixes, or a
// long opaque string with no spaces) so the mistake is caught at entry.
const SECRET_LIKE_PREFIX = /^(sk-|ghp_|gho_|ghs_|ghr_|glpat-|xox[baprs]-|AIza|Bearer\s|eyJ)/i;

export function looksLikeSecret(value: string): boolean {
  const trimmed = value.trim();
  if (SECRET_LIKE_PREFIX.test(trimmed)) return true;
  if (/^[A-Za-z0-9+/_=-]{32,}$/.test(trimmed)) return true;
  return false;
}
