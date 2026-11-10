# AI provider reliability

- [ ] Retry temporary Gemini failures with bounded exponential backoff and `Retry-After`.
- [ ] Fall back to the Lovable gateway only after temporary Gemini failures.
- [ ] Keep failures safe in logs and user-facing messages; never rerun PDF work.
- [ ] Verify provider success, retry, fallback, total failure, and permanent-auth failure.
