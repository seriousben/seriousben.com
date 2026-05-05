# AGENTS.md

## Tools Section

The site has a `/tools/` section for self-contained HTML/CSS/JS tools.

### Structure

- `content/tools/<slug>.md` — metadata only (title, date, summary, tags, toolUrl). No rendered page (cascade sets `build: render: never`).
- `static/tools/<slug>/` — the actual tool. Plain HTML/CSS/JS, Hugo serves as-is.
- `content/tools/_index.md` — section listing page at `/tools/`.

### Adding a new tool

```bash
./new-tool <name>
# e.g. ./new-tool color-picker
```

This creates the content file and static folder together. Fill in `summary` and `tags` in the generated markdown, then build the tool in `static/tools/<slug>/`.

### Front matter fields

| Field     | Purpose                                      |
|-----------|----------------------------------------------|
| `title`   | Display name on the card                     |
| `date`    | Created date (shown on card)                 |
| `summary` | One-line description on the card              |
| `tags`    | Tag pills on the card                        |
| `toolUrl` | Path to the static tool (e.g. `/tools/<slug>/`) |

### Dates

- **Created** comes from the `date` front matter field.
- **Updated** comes from git (via `enableGitInfo` in config). Hugo reads the last commit that touched the content file.
- Updated only displays when it differs from Created.

### Validation

```bash
./validate-tools
```

Checks that every content file with `toolUrl` has a matching `static/tools/` folder with `index.html`, and vice versa.

### Key constraint

Content files in `content/tools/` must not render individual pages (the cascade ensures this). The card on `/tools/` is the full Hugo-side presence. The `toolUrl` links directly to the static tool app.
