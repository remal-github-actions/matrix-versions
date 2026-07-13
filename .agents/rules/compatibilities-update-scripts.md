---
paths:
- "compatibilities-update-*.ts"
---

# Compatibilities Update Scripts

- Be very strict: any deviation from the documented source format must fail loudly.
- Empty lines are the only tolerated deviation: ignore them.
- Have inline comments.
- Keep entries in the order of the source document. Do not sort them.
- Trim trailing '.0' segments from every generated version bound ('3.0' becomes '3', '2.0.0' becomes '2'): missing segments compare as zero in version range matching, so they carry no meaning.
- Keep each script self-contained: duplicate helpers instead of extracting shared modules.
- Spell out abbreviations. Keep them only inside literals quoted from the source format.
- Do not commit regenerated global-compatibilities.json together with script changes: run the script locally to verify, then revert; the main build applies the data via push-back.
- Regeneration must be idempotent: an immediate second run reports up-to-date.
- Prefer raw files from the source repository's main/master branch over the published HTML page: the HTML page can miss the latest (snapshot) updates.
