# The Pre-Registration Desk

Public source: https://github.com/dtinholt/prereg-desk (Apache-2.0, first public release 11 October 2026).

Part of the lab's research at https://dinand.com/research/.

One static page that freezes a study plan under a timestamped hash. Dated addenda chain onto the frozen plan, and the Verify tab later marks a result against it.

## Why it exists

A study run by AI agents can be rerun, reread and reframed cheaply, so the temptation to adjust the question after the answer is in is strong. A pre-registration blocks that. You write down the question, the sample, the measures, the hypotheses with their numeric bars, and the conditions that void the study, and you lock them before any result exists. The lab does this for its own campaigns, and this page is the tool it built to make the lock checkable by someone else.

## Run it

Open `index.html` in a browser, or use the hosted copy at https://dinand.com/experiments/pre-registration-desk/. It needs no server or build step, and its only network request is the Google Fonts stylesheet. The page works offline with system fonts if that request fails. Nothing you type leaves the browser.

## How the hash and the freeze work

Freeze stamps the UTC time from the browser's clock, computes SHA-256 of the canonical registration with the Web Crypto API, and downloads `PREREG-<slug>.json` and `PREREG-<slug>.md`. The hash covers the `registration` member of the JSON file, freeze time included. The markdown copy carries the hash and is not itself hashed.

The canonical form is fixed. Every key and string is normalised to Unicode NFC, keys are sorted at every level (every own key is kept, a member named `__proto__` included), indent is two spaces, line ends are LF, there is no trailing newline, and the encoding is UTF-8. NFC means the same text typed on two systems, one composing `é` as a single code point and one as `e` plus a combining accent, hashes the same. Files from the first build (`prereg-desk/1`) were hashed without NFC and still verify under that rule. The format string sits inside the hashed member, so it cannot be switched unseen.

An addendum hashes an object that contains its parent's hash, the registration's hash, its sequence number and its time. Edit the parent and every link after it breaks.

## What it does

**Register.** A form with the fields the lab's research methods page at [dinand.com/research](https://dinand.com/research/) asks for in its second step: title, question, design, sample size and draw rule, measures, hypotheses, kill conditions, analysis plan, reporting and who verifies. The right column shows a live preview as canonical JSON or as markdown.

Each hypothesis has one of five types, and each is judged by its own rule. A file naming any other type, including `constructor` or `__proto__`, is refused with a message.

| Type | Registered | Supported when |
|---|---|---|
| Threshold | quantity, ≥ > ≤ <, a number, optional predicted band | the value meets the comparison; the band is reported beside the verdict |
| Two-sided band | quantity, a, b | a ≤ value ≤ b |
| Direction with a minimum effect | signed effect, rises or falls, minimum d ≥ 0 | the effect moves the predicted way by at least d; a move the other way falsifies |
| Ratio | numerator, denominator, comparison, bound | numerator ÷ denominator meets the bound; a zero denominator is not evaluable |
| Ranking | A, B, minimum gap d ≥ 0 | A > B and A − B ≥ d; with d = 0, A strictly above B |

Numbers accept decimals, exponents, a unicode minus and fractions such as `1/3`. Commas and percent signs are refused so `0,8` cannot be read as 8. Derived quantities (ratio, gap, effect size) are compared at 12 significant figures, so 0.3 − 0.1 meets a gap of 0.2. A ratio with a negative quantity carries a warning in its verdict note.

Kill conditions are rows. Each names what it voids: `all`, or ids such as `H1, H3`.

Freeze stamps the UTC time from the browser's clock, computes SHA-256 of the canonical registration with the Web Crypto API, and downloads `PREREG-<slug>.json` and `PREREG-<slug>.md`.

**Witness.** After a freeze the page shows a one-line public record, `PREREG | <title> | sha256:<hash> | frozen <UTC time> (UTC, browser clock)`, the same line as a `git commit --allow-empty -m '…'` command, and a note on why a public post is the timestamp that counts. The page makes no network calls, so it stamps nothing itself; the note says how to run the OpenTimestamps client on the downloaded file if you want a calendar proof too.

**Amend.** Load a frozen registration, or a chain file to add a further addendum. The desk checks every hash first and refuses to chain onto a file that fails. Write the addendum text and, if needed, new hypotheses (ids default to `A1-H1`, `A1-H2`). Freezing hashes an addendum object that contains its parent's hash, the registration's hash, its sequence number and its time, then downloads `PREREG-<slug>.A<n>.json`, `PREREG-<slug>.A<n>.md` and `PREREG-<slug>.chain.json` (the registration followed by every addendum). Registered rules stay fixed. A new row needs an unused id, and editing the parent breaks every link after it. An addendum dated before its parent is flagged; freeze times are compared as instants, so a time written with an offset such as `+05:00` cannot slip ahead of its parent. Inputs are locked while a hash is computed.

**Verify.** Drop a registration or a chain file. The page recomputes every hash and checks each addendum against its parent. The chain shows each link with its time, hash and state; addendum text opens on demand. Paste a hash you posted in public, or the whole one-line record (the page takes the first 64-character hex token), and the page says which link it matches; a hash matching no link withholds every verdict. A broken registration withholds everything; a broken addendum withholds its own rows and those after it. Each hypothesis gets inputs for its type (one value, or two for ratio and ranking) and a stamp: supported, falsified or not evaluable. Tick any kill condition that fired and the rows it voids read "not evaluable". A tally line counts the states. The verdict table downloads as markdown with the chain, the public-hash result and the fired conditions.

**Print.** "Print or save as PDF" on any tab uses the browser's print dialog with a print stylesheet: a title page (title, freeze time, hash, public record, addenda), the eight sections, hypothesis tables with repeating headers, each addendum on its own page, and `PREREG-<slug> · SHA-256 <hash>` plus "page n of N" in the footer of every page. A draft prints with "Draft, not frozen · no hash" in the footer. A file that fails its hash check prints with "FAILED ITS HASH CHECK" stamped on the title page and in the footer, with no hash and no public record. Printing an empty Verify or Amend tab prints a notice saying nothing is loaded.

**Import.** "Import a PREREG markdown" reads the house format: a `#` title, numbered `##` sections matched by keyword (question, design, sample, measures, hypotheses or predictions, kill or stop conditions, analysis, reporting, verifier), hypotheses as a table or as bold-labelled bullets (`- **H1 (name).** … at least 0.70 (band 0.70 to 0.95)`), and kill conditions as a numbered list. The reader shows what it found, with a note on every row it guessed, before anything touches the form. The desk's own markdown reads back to the identical registration.

**Canonical form, and NFC.** Every key and string is normalised to Unicode NFC, keys are sorted at every level (every own key is kept, a member named `__proto__` included), two-space indent, LF line ends, no trailing newline, UTF-8. The hash covers the `registration` member (or the `addendum` member) of the JSON file, freeze time included. NFC means the same text typed on two systems, one composing `é` as a single code point and one as `e` plus a combining accent, hashes the same. The markdown copy carries the hash and is not itself hashed. Files from the first build (`prereg-desk/1`) were hashed without NFC and still verify under that rule; the format string sits inside the hashed member, so it cannot be switched unseen.

**Drafts.** The form autosaves to localStorage under `prereg-desk:draft:v2` (a first-build draft under `:v1` is read once), every access wrapped in try/catch. A draft over the storage quota says so. A stored draft that is not valid JSON, or not an object, is moved to a `prereg-desk:draft:v2:set-aside:<time>` key and the status line names it; if it cannot be moved, autosave stays off until you clear the draft. The Amend form is not autosaved.

**Worked examples.** Two buttons fill the form from two public campaign pages on the lab's research site, and a table on the Register tab names one row per hypothesis type with what the page reports. Each type is covered: a threshold, a two-sided band, a direction, a ratio and a ranking. Rows the pages publish without a number keep a blank, and the desk refuses to freeze until someone sets it. No measured value ships as an input, with one exception: the verify demo (`#verify&demo=dc`) fills a single value, the median difference the source page reports for its revalidation certificate, and says so under the table. One ratio example has no denominator to enter, because the source page reports that the cheaper method never reached the bar. That row stays waiting, and a zero denominator is marked not evaluable.

URL hashes: `#register`, `#amend`, `#verify`, `#register&example`, `#register&example=dc`, `#register&import` (opens the import review on a campaign markdown), `#verify&demo` (campaign registration plus a demonstration addendum, frozen in memory), `#verify&demo=dc`, `&kill` (ticks the first kill condition), `&print` (builds the print document, for headless PDF), `#register&demo&witness`, `#amend&demo`. Demo modes download nothing.

## Tests

```sh
sh tests/smoke.sh        # page self-check in headless Chrome
sh tests/run-stress.sh   # 25 hostile and extreme steps over the DevTools protocol
```

Both need Chrome or Chromium. The scripts look for Chrome in its macOS location. On any other system, or for another build, point the `CHROME` environment variable at the binary:

```sh
CHROME="$(which chromium || which google-chrome)" sh tests/smoke.sh
```

- The page runs a console self-check on every load: `[prereg-desk self-check] 86/86 passed`, and `<html data-selfcheck="pass" data-selfcheck-count="86/86">`. It covers SHA-256 against the FIPS 180-2 vector and a `shasum -a 256` value, canonical form, NFC, number parsing, every hypothesis type at and around its edges, kill conditions, validation, the amendment chain (linking, a second addendum, a moved parent threshold, reordering, id reuse, back-dating, edited addendum text, format 1 files), hostile file shapes, markdown import, witness text and escaping. Further checks pin each defect found in two independent reviews: a `__proto__` member hashed against a `shasum` reference, prototype-named types and directions, unreadable drafts, printing of broken chains, public-hash extraction, negative ratios, offset dates, form locking, and the Amend list renumbering.
- `tests/smoke.sh` exits non-zero unless the self-check passes.
- `tests/run-stress.sh` drives the page through `tests/cdp.mjs` (Node 22 or later, Python 3, no other dependencies). It exits non-zero on any failure or page error.
- `tests/selfcheck.js` is a snippet that `cdp.mjs` evaluates inside the page. It does not run on its own under Node.

Timings on the 100x input (400 hypotheses, 100 kill conditions, text fields repeated 100 times): form render 53 ms, freeze 94 ms, Verify render including layout 28 ms, a keystroke in a measured value under 1 ms, markdown import 1 ms. A 5 MB paste into one field: input handler 9 ms, preview cut at 200,000 characters with a note, freeze 860 ms, Verify 14 ms.

## Limits

- It does not witness time. The timestamp is whatever the browser clock says.
- The stored hash proves only that the file agrees with itself. Tying the file to a moment needs the hash posted somewhere you cannot back-date.
- It checks measured numbers against frozen rules. It does not check that the numbers were measured honestly, computed correctly, or that the kill conditions were honoured. Ticking a kill condition is the user's word.
- A hypothesis with several clauses, such as one bar at three lengths, has to be split into one row per number.
- Ranking treats higher as above. To predict "A below B", swap the labels.
- Import is best effort. Free-text rules take the earliest comparator in the sentence, and the measured quantity of a prose bullet is left for you to name. Addendum sections in the markdown are noted and skipped.
- The print footer uses CSS page margin boxes. Current Chrome and Edge print them; browsers without margin-box support print the pages without the footer, and the hash still appears on the title page.
- Kill conditions live in the registration. An addendum has no field for them.

## Licence

Apache-2.0. See `LICENSE`.

## Sources

- Field list and house rules: the research methods page at https://dinand.com/research/, second step.
- Worked examples: two campaign pages on the same site (question, registered, measured, found and limits sections).
- Visual identity: the site's ledger tokens, copied inline.
