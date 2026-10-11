# Changelog

## 0.1.0, 11 October 2026: first public release

The build as tested in the two rounds below, published with an Apache-2.0 licence, a CI workflow that runs the smoke test and the stress round, and a README written for readers outside the lab.

## 10 Oct 2026: stress, review, elevate round

### What broke under stress (first build, probed by `tests/stress-v1.js`)

- A hashed file with a hypothesis missing its `direction` crashed the Verify tab (`Cannot read properties of undefined (reading 'replace')`).
- A file whose `hypotheses` was not a list, or held `null`, crashed rendering. Nothing showed on the page.
- A malformed draft in localStorage (`hypotheses: "x"`) crashed the page at boot, before the form drew.
- A file nested 20,000 levels deep surfaced the raw engine message "Maximum call stack size exceeded".
- Two hypotheses with the same id froze without complaint, which made the verdict table ambiguous.
- A draft over the storage quota was reported as "browser storage is blocked here".
- Composed and decomposed forms of the same text (`café` typed two ways) gave different hashes.
- HTML and script payloads in every text field rendered as text and nothing executed.
- Speed was fine: 100x input rendered the Verify table in 9 ms.

### Review findings and fixes

- Every file now passes a shape check (`parseFile`) that returns a sentence for each failure. Depth is measured without recursion and capped at 64, and files over 20 MB are refused before parsing.
- The storage wrapper tells quota apart from blocked storage, and a draft that fails to load is set aside with a message.
- "Clear the draft" used to leave the autosave timer running, which could re-save after clearing. It cancels it now, and unloading a file empties the public-hash field.
- Loading a second file while the first was still hashing let the slower one win. Each load carries a token now and stale results are dropped (stress test "race"). A double click on freeze downloads once.
- Removing a hypothesis or kill condition moved focus to the page body. It lands on the neighbouring block, or on the add button.
- Hypothesis id fields, measured inputs (with the full quantity names in `aria-label`), the preview pane and the witness blocks have accessible names. The witness record uses `aria-labelledby` in place of a `label` pointing at a non-form element.
- Each verdict stamp carries its word, and "not evaluable" adds a dashed border.
- Error lists are built from text nodes. Every rendered string from a file goes through `textContent` or `esc()`.
- On every keystroke the Verify tab queried the DOM once per row, which grows with the square of the row count. Inputs and statuses are cached per row.
- Literal `</script>` inside a self-check string closed the script element in the browser. Escaped.
- Footer padding: `.colophon` overrode the frame gutter, so the footer sat 16 px out of line. Fixed.
- Slugs: a title whose part before the colon has no Latin letters produced "untitled". The slug now falls back to the whole title.
- Long fractions such as 1/3 showed as 0.3333333333333333 in locked rules. The display rounds to six figures with a ≈ sign; the file keeps the exact value.

### Added (elevate list)

1. Amend tab: load a frozen registration or chain, add a dated addendum with text and new hypotheses, freeze it under its own hash that includes the parent's hash and the registration's hash, download the addendum, its markdown and a chain file. Parent rules stay locked; an addendum cannot reuse a registered id or be dated before its parent.
2. Witness panel after every freeze: one-line public record (title, hash, UTC time), the same line as a `git commit --allow-empty` command, and an OpenTimestamps-style note.
3. Hypothesis types: threshold, two-sided band, direction with a minimum effect, ratio, ranking. Each is judged by its own rule.
4. Kill-condition checklist on Verify. Conditions now name the hypotheses they void; ticked conditions turn those rows "not evaluable".
5. Print to PDF: title page, numbered sections, hypothesis tables, addenda on their own pages, hash and page count in the footer of every page.
6. Markdown import with a review step, reading numbered `##` sections, hypothesis tables and bold-labelled bullets.
7. Worked examples per type from the Trial Balance and Delegation Cliff campaign pages.
8. NFC normalisation of every key and string before hashing (format `prereg-desk/2`). Format 1 files still verify under their original rule.
9. Self-checks for every type, the chain, import, NFC and hostile files.

### Counts

- Console self-check: 15 before, 68 after this round, 86 after the second check below.
- Headless tests: none before; now `tests/smoke.sh` and a 25-step stress round (`tests/run-stress.sh`).

## 10 Oct 2026: second independent check, thirteen fixes

- `sortDeep` and `nfcDeep` assigned keys with `out[k] = …`, so a member named `__proto__` vanished from the canonical text and could change without changing the hash. Keys are set with `defineProperty` now; a self-check hashes such a file and compares it with a `shasum -a 256` reference.
- Lookup tables (`TYPES`, `CMP`, `SYM`, `MAP`) have no prototype, and lookups go through own-key checks. A direction named `constructor` used to read as a comparison and mark rows supported. A hypothesis type of `constructor`, `__proto__` or `toString` gets the file refused with a message.
- A stored draft that is not valid JSON, or not an object, moves to a set-aside key named in the status line. It used to be dropped and then overwritten by autosave.
- Printing a file that fails its hash check stamps "FAILED ITS HASH CHECK" on the title page and in the footer, with no hash and no public record. An empty Verify or Amend tab prints a notice; it used to print the Register draft.
- After a failed load on Verify or Amend, the previous file's table, summary, kill box and any frozen addendum are gone.
- The public-hash field takes the first 64-character hex token from whatever is pasted, the desk's own one-line record included.
- Removing or retyping a new hypothesis in Amend clears the frozen panel, and editing its id renames its legend and remove button.
- Ratios with a negative quantity carry a warning in the verdict note.
- Freeze times compare as instants. A time written with an offset could sort after its parent as text while falling before it in fact.
- Inputs lock while a hash is computed.
- Copy: the ratio example describes what the desk does with an unbounded ratio, and the sample size matches the source page. Lists, antitheses and summary lines flagged in the page, the README and this file were rewritten.
- Self-check: 86/86.
