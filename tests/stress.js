// Stress round against the current page. Evaluated in the page by cdp.mjs:
//   node tests/cdp.mjs file://$PWD/index.html tests/stress.js
// Returns a JSON object of findings and timings; any "FAIL" or "THREW" value is a defect.
const out = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 100 && !document.documentElement.dataset.selfcheck; i++) await sleep(100);
window.download = () => {};
window.confirm = () => true;
window.print = () => {};
window.__x = 0;
const XSS = `<script>window.__x=1<\/script><img src=x onerror="window.__x=2"><b onmouseover="window.__x=3">b</b>`;
const imgs = () => document.querySelectorAll("img").length;
const ok = c => c ? "ok" : "FAIL";
async function step(name, fn){ try { out[name] = await fn(); } catch (e){ out[name] = "THREW: " + (e && e.message); } }
const set = (sel, v) => { const n = document.querySelector(sel); n.value = v; n.dispatchEvent(new Event("input", { bubbles: true })); };
const allTypes = p => Object.keys(TYPES).map((t, i) => ({ id: "X" + i, type: t, prediction: p, refutes: p, t_measure: p, t_value: "1", b_measure: p, b_lo: "0", b_hi: "1", d_measure: p, d_min: "0", r_num: p, r_den: p, r_value: "1", k_a: p, k_b: p + "2", k_gap: "0" }));
const xssRaw = { title: XSS, question: XSS, design: XSS, sample_size: XSS, sample_unit: XSS, draw_rule: XSS, measures: XSS, analysis_plan: XSS, reporting: XSS, verifier: XSS, hypotheses: allTypes(XSS), kill: [{ text: XSS, covers: "all" }] };

await step("empty: freeze an empty form", async () => { fillForm({}); await freeze(); return document.querySelector("#reg-errors").children.length > 0 ? "refused with " + document.querySelector("#reg-errors").children.length + " messages" : "FAIL"; });
await step("empty: verify an empty file", async () => { await loadVerify("", "e"); return document.querySelector("#ver-errors").textContent; });
await step("empty: amend an empty file", async () => { await loadAmend("   ", "e"); return document.querySelector("#a-errors").textContent; });
await step("empty: import nothing", async () => { document.querySelector("#import-text").value = ""; readImport(); return document.querySelector("#import-errors").textContent; });

await step("xss: every register field, every type, freeze", async () => {
  fillForm(xssRaw); renderPreview(); await freeze(); await sleep(50);
  return { x: window.__x, imgs: imgs(), frozen: !document.querySelector("#frozen").hidden, preview_has_literal_tag: document.querySelector("#preview").textContent.includes("<script>") };
});
await step("xss: verify the hostile registration, file name hostile too", async () => {
  await loadVerify(lastFrozen.json, XSS); await sleep(50);
  return { x: window.__x, imgs: imgs(), rows: loaded.rows.length, title_rendered_as_text: document.querySelector("#ver-summary h2").textContent.includes("<img") };
});
await step("xss: amend with hostile text and a hostile new hypothesis", async () => {
  await loadAmend(lastFrozen.json, XSS);
  document.querySelector("#a-text").value = XSS;
  document.querySelector("#btn-add-ah").click();
  const b = document.querySelector("#a-hyps").lastElementChild;
  b.querySelector('[data-k="prediction"]').value = XSS; b.querySelector('[data-k="t_measure"]').value = XSS; b.querySelector('[data-k="t_value"]').value = "2";
  document.querySelector("#amend").requestSubmit(); await sleep(400);
  const chain = amendFrozen && amendFrozen.chainJson;
  if (chain) await loadVerify(chain, XSS);
  await sleep(50);
  document.querySelectorAll("#ver-summary details").forEach(d => d.open = true);
  return { x: window.__x, imgs: imgs(), chained: !!chain, links: loaded && loaded.res.links.length, ok: loaded && loaded.res.ok, errors: document.querySelector("#a-form-errors").textContent };
});
await step("xss: import hostile markdown", async () => {
  document.querySelector("#import-text").value = `# ${XSS}\n\n## 1. Question\n\n${XSS}\n\n## 4. Hypotheses\n\n| id | prediction | rule |\n|---|---|---|\n| H1 | ${XSS} | at least 0.5 |\n\n## 5. Kill conditions\n\n1. ${XSS}\n`;
  readImport(); await sleep(50);
  return { x: window.__x, imgs: imgs(), review_rows: document.querySelectorAll("#import-review tr").length };
});
await step("xss: print document built from hostile registration", async () => { printFromState(); await sleep(50); const d = document.querySelector("#print-doc"); const r = { x: window.__x, imgs: imgs(), has_text: d.textContent.includes("<script>") }; d.replaceChildren(); return r; });

await step("malformed: garbage, wrong shapes, deep nesting", async () => {
  const msgs = [];
  for (const t of ["{", "[]", "null", '"x"', '{"kind":"chain","links":"x"}', '{"kind":"chain","links":[5]}', '{"registration":{"hypotheses":"x"}}', '{"registration":{"hypotheses":[null]}}', '{"registration":{"hypotheses":[{"id":{"a":1}}]}}']){
    await loadVerify(t, "m"); msgs.push(document.querySelector("#ver-errors").textContent || "(no message)");
  }
  let deep = "1"; for (let i = 0; i < 20000; i++) deep = `{"a":${deep}}`;
  await loadVerify(`{"registration":{"title":"t","hypotheses":[],"x":${deep}}}`, "deep"); msgs.push(document.querySelector("#ver-errors").textContent);
  return msgs;
});
await step("malformed: a draft with the wrong shapes in storage", async () => {
  localStorage.setItem("prereg-desk:draft:v2", JSON.stringify({ title: 5, hypotheses: "x", kill: [null, 3] }));
  try { fillForm(JSON.parse(localStorage.getItem("prereg-desk:draft:v2"))); return ok(document.querySelector("#f-title").value === "5" && hypsEl.children.length === 1); }
  finally { localStorage.removeItem("prereg-desk:draft:v2"); fillForm({}); }
});
await step("malformed: hostile hypothesis values inside a hashed file", async () => {
  const reg = { format: FORMAT, title: "t", hypotheses: [{ id: "H1" }, { id: "H2", type: "ratio", threshold: "0.5", direction: "<=" }, { id: "H3", type: "band", band_low: 2, band_high: 1 }, { id: "H4", type: "nope" }, { id: "H1", type: "threshold", direction: "~", threshold: 1 }], kill_conditions: [{ id: "K1", text: 5, covers: 7 }, null] };
  const env = { registration: reg, sha256: await memberHash(reg) };
  await loadVerify(JSON.stringify(env), "odd"); await sleep(50);
  const refused = loaded === null && /unrecognised type/.test(document.querySelector("#ver-errors").textContent);
  reg.hypotheses = reg.hypotheses.filter(h => h.type !== "nope");
  await loadVerify(JSON.stringify({ registration: reg, sha256: await memberHash(reg) }), "odd2"); await sleep(50);
  return { unknown_type_refused: ok(refused), rows: loaded.rows.length, tally: document.querySelector("#ver-tally").textContent, notes: loaded.res.links[0].notes };
});

await step("prototype names: __proto__ member, constructor type and direction", async () => {
  const reg = JSON.parse('{"format":"prereg-desk/2","title":"t","__proto__":{"threshold":0.1},"hypotheses":[{"id":"H1","type":"threshold","direction":"constructor","threshold":1,"measure":"m"}]}');
  const env = JSON.stringify({ registration: reg, sha256: await memberHash(reg) });
  await loadVerify(env, "proto"); const inp = loaded.inputs[0][0]; inp.value = "5"; inp.dispatchEvent(new Event("input", { bubbles: true }));
  const verdict = document.querySelector("#out-0").textContent;
  const tampered = env.replace('"threshold":0.1', '"threshold":0.9');
  await loadVerify(tampered, "proto2");
  const caught = loaded && !loaded.res.ok;
  await loadVerify('{"registration":{"hypotheses":[{"id":"H1","type":"constructor"}]}}', "ctor");
  return { constructor_direction: verdict, proto_tamper_caught: ok(caught), constructor_type: document.querySelector("#ver-errors").textContent.slice(0, 80) };
});
await step("unicode: emoji, RTL, combining marks, NFC across freeze", async () => {
  fillForm({ title: "PREREG-\u{1F9EA}: שלום café 中文", question: "Zalgo t̶̷e̸s̵t ﻿ ​", hypotheses: [{ id: "H1", prediction: "\u{1F600}", t_measure: "é", t_value: "0.5" }] });
  await freeze();
  const r = lastFrozen.env.registration;
  const decomposed = JSON.parse(lastFrozen.json); decomposed.registration.title = decomposed.registration.title.normalize("NFD");
  const res = await verifyChain([decomposed]);
  return { slug: r.slug, title_is_nfc: r.title === r.title.normalize("NFC"), nfd_copy_still_verifies: res.ok, x: window.__x };
});
await step("line endings: import with CRLF, CR and LF mixed", async () => {
  const md = toMarkdown(regFromRaw(EXAMPLE), null).split("\n").map((l, i) => l + (i % 3 === 0 ? "\r\n" : i % 3 === 1 ? "\r" : "\n")).join("");
  const p = parseMarkdown(md);
  return { hypotheses: p.hypotheses.length, kills: p.kill.length, question_found: !!p.fields.question };
});
await step("duplicates: same id twice is refused at freeze", async () => {
  fillForm({ title: "t", question: "q", hypotheses: [{ id: "A", prediction: "p", t_measure: "m", t_value: "1" }, { id: "A", prediction: "p", t_measure: "m", t_value: "2" }] });
  await freeze(); return document.querySelector("#reg-errors").textContent;
});
await step("out of range: reversed band, negative minimum, NaN, Infinity, comma decimal", async () => {
  fillForm({ title: "t", question: "q", hypotheses: [
    { id: "B", type: "band", prediction: "p", b_measure: "m", b_lo: "1", b_hi: "0" },
    { id: "D", type: "direction", prediction: "p", d_measure: "m", d_min: "-0.1" },
    { id: "N", type: "threshold", prediction: "p", t_measure: "m", t_value: "NaN" },
    { id: "I", type: "threshold", prediction: "p", t_measure: "m", t_value: "Infinity" },
    { id: "C", type: "threshold", prediction: "p", t_measure: "m", t_value: "0,8" },
    { id: "G", type: "ranking", prediction: "p", k_a: "same", k_b: "same", k_gap: "-1" }] });
  await freeze(); return [...document.querySelectorAll("#reg-errors div")].map(d => d.textContent);
});
await step("measured: negative, NaN, Infinity, huge values in Verify", async () => {
  await loadVerify(canonical((await demoChain("dc"))[0]), "dc");
  const i = loaded.rows.findIndex(r => r.h.id === "DC4"), inp = loaded.inputs[i][0];
  const res = {};
  for (const v of ["-0.05", "-0.0500001", "NaN", "Infinity", "1e308", "-1e-320", "−0.01", "1/0", ""]){ inp.value = v; inp.dispatchEvent(new Event("input", { bubbles: true })); res[v || "(blank)"] = document.querySelector("#out-" + i).textContent; }
  return res;
});
await step("dates: addenda across a DST change and a year boundary", async () => {
  const env = await makeRegEnvelope(regFromRaw(EXAMPLE_DC), "2026-11-01T06:59:59Z");
  const r0 = await verifyChain([env]);
  const a1 = await makeAddendum(r0, "After the US clock change.", [], "2026-11-01T07:00:01Z");
  const r1 = await verifyChain([env, a1]);
  const a2 = await makeAddendum(r1, "Across the new year.", [], "2027-01-01T00:00:00Z");
  const r2 = await verifyChain([env, a1, a2]);
  const back = await makeAddendum(r1, "Back across the year.", [], "2026-10-31T23:59:59Z");
  return { forward_ok: r2.ok, backdated_flagged: !(await verifyChain([env, a1, back])).ok };
});
await step("race: a slow load followed by a fast one keeps the second", async () => {
  const big = canonical((await demoChain("tb"))[0]).replace('"title": "', '"title": "' + "x".repeat(2e6));
  const small = canonical((await demoChain("dc"))[0]);
  const p1 = loadVerify(big, "slow"), p2 = loadVerify(small, "fast");
  await Promise.all([p1, p2]);
  return ok(loaded.name === "fast");
});
await step("storage: a draft over quota reports quota, not blocked", async () => {
  fillForm({}); set("#f-question", "q".repeat(6 * 1024 * 1024)); await sleep(600);
  const msg = document.querySelector("#draft-status").textContent;
  fillForm({}); renderPreview(); localStorage.removeItem("prereg-desk:draft:v2");
  return msg;
});
await step("paste 5 MB into a field: input handler, preview, freeze", async () => {
  fillForm(EXAMPLE_DC); fillForm(Object.assign({}, EXAMPLE_DC, { hypotheses: EXAMPLE_DC.hypotheses.map(h => Object.assign({}, h, { threshold: "0.5", min_effect: "0" })) }));
  const big = "5MB ".repeat(5 * 1024 * 1024 / 4);
  let t0 = performance.now(); set("#f-question", big); const tInput = performance.now() - t0;
  const truncated = document.querySelector("#preview").textContent.includes("preview cut at");
  t0 = performance.now(); await freeze(); const tFreeze = performance.now() - t0;
  t0 = performance.now(); await loadVerify(lastFrozen.json, "5mb"); const tVerify = performance.now() - t0;
  const r = { input_ms: Math.round(tInput), preview_truncated: truncated, freeze_ms: Math.round(tFreeze), verify_ms: Math.round(tVerify), json_mb: +(lastFrozen.json.length / 1048576).toFixed(1), status: document.querySelector("#draft-status").textContent };
  fillForm({}); renderPreview(); localStorage.removeItem("prereg-desk:draft:v2");
  return r;
});
for (const k of [10, 100]){
  await step(`scale ${k}x: render, freeze, verify, score, import, print`, async () => {
    const base = regFromRaw(EXAMPLE_DC);
    const raw = Object.assign({}, EXAMPLE_DC);
    for (const f of ["question", "design", "measures", "draw_rule"]) raw[f] = EXAMPLE_DC[f].repeat(k);
    raw.hypotheses = Array.from({ length: 4 * k }, (_, i) => Object.assign({}, EXAMPLE_DC.hypotheses[i % 4], { id: "DC" + (i + 1), threshold: "0.5", min_effect: "0" }));
    raw.kill = Array.from({ length: k }, (_, i) => ({ text: "Condition " + (i + 1), covers: "DC" + (i + 1) }));
    let t0 = performance.now(); fillForm(raw); renderPreview(); const tForm = performance.now() - t0;
    t0 = performance.now(); await freeze(); const tFreeze = performance.now() - t0;
    const errs = document.querySelector("#reg-errors").textContent;
    selectTab("verify");
    t0 = performance.now(); await loadVerify(lastFrozen.json, "big"); void document.querySelector("#ver-table").offsetHeight; const tVerify = performance.now() - t0;
    const inp = loaded.inputs[loaded.inputs.length - 1][0];
    t0 = performance.now(); inp.value = "0.01"; inp.dispatchEvent(new Event("input", { bubbles: true })); const tType = performance.now() - t0;
    const cb = document.querySelector("#ver-kill input");
    t0 = performance.now(); cb.checked = true; cb.dispatchEvent(new Event("change")); const tKill = performance.now() - t0;
    const md = toMarkdown(lastFrozen.env.registration, lastFrozen.hash);
    t0 = performance.now(); const p = parseMarkdown(md); const tImport = performance.now() - t0;
    t0 = performance.now(); printFromState(); const tPrint = performance.now() - t0; document.querySelector("#print-doc").replaceChildren();
    selectTab("register");
    return { hypotheses: raw.hypotheses.length, errors: errs || "none", form_ms: Math.round(tForm), freeze_ms: Math.round(tFreeze), verify_render_incl_layout_ms: Math.round(tVerify), keystroke_ms: Math.round(tType), kill_tick_ms: Math.round(tKill), import_ms: Math.round(tImport), import_rows: p.hypotheses.length, print_build_ms: Math.round(tPrint), tally: document.querySelector("#ver-tally").textContent };
  });
}
out["xss: final check, nothing executed"] = { x: window.__x, imgs: imgs() };
return out;
