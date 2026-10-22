<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Production parent identity compatibility

Production supports SMS and email registration/login plus phone-aware parent administration. Preserve these capabilities in subsequent releases. Integrated source checkpoints are on branch `codex/phone-admin-integration-20261021` in both repositories; see `C:/Raqeem/02-Releases/admin-phone-identity-20261021/DEPLOYMENT.md`. An older main snapshot can remove SMS even while a new unrelated fix works. Keep the OfflineBoot update from f2427344d232f435ca67cf43a7739129faa2cd47 when merging. After deployment, verify `/api/auth/channels` returns `sms: true`, both registration choices remain visible, and phone-only parents are recognized as verified in administration. This note does not authorize a deployment on its own.
