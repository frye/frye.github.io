# Sea Scout rally rules and PDF

`sea-scout-rally-rules/index.html` is the single source of truth for the
rules. The downloadable copy is
`sea-scout-rally-rules/sea-scout-rally-rules.pdf`.

**Whenever content on the rules page changes, always regenerate and
verify the PDF, and include the updated PDF in the same change and commit
as the page.** Also regenerate it when print styles or PDF-generation
code/dependencies change. Do not hand-edit the PDF or maintain a separate
copy of the rules in Markdown, JavaScript, or another document.

## Regenerating the PDF

Use Node.js 20 or newer. From the repository root:

```sh
npm ci --prefix scripts/rally-pdf
npm run --prefix scripts/rally-pdf install-browser
npm run --prefix scripts/rally-pdf generate
```

Dependency and browser installation need network access. On Linux, if
Chromium reports missing system libraries, install its prerequisites with
`npm exec --prefix scripts/rally-pdf -- playwright install --with-deps chromium --only-shell`.

The generator runs offline after setup. It reads the local HTML and its
local stylesheets, uses `assets/sea-scout-rally-rules-print.css` for US
Letter output, and replaces the PDF only after rendering succeeds.
The printed document includes the complete rules but not the website's
navigation, footer, or download control. The live website requires no
Node.js runtime or PDF-generation step.

## Required checks

- Compare text extracted from every PDF page with the HTML rules. Verify
  every section, numbered rule, list item, table value, and scoring
  formula, including the final debrief section. Normalize layout
  whitespace and ignore PDF page numbers, not rule content.
- Verify the mathematical symbols and all scoring tolerances and
  penalties. Do not change the rules merely to fit the PDF layout.
- Inspect rendered PDF pages for clipped text, broken table rows,
  missing glyphs, blank pages, and awkward page breaks.
- Verify the download link near the rules title serves the updated PDF.
  Keep existing site navigation working and do not add links to this
  unlisted rules page from the homepage or Gallery.

Poppler tools can help with verification:

```sh
pdfinfo sea-scout-rally-rules/sea-scout-rally-rules.pdf
pdftotext -layout sea-scout-rally-rules/sea-scout-rally-rules.pdf -
```

Keep temporary PDF previews and extracted text outside the repository.
Commit the generated PDF and the generator's lockfile, but never
`scripts/rally-pdf/node_modules/`.
