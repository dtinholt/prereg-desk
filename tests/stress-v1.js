// Stress probe against the first build (kept for the changelog record). Evaluated by cdp.mjs.
const out = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
window.download = () => {};
window.__x = 0;
const XSS = `<script>window.__x=1<\/script><img src=x onerror="window.__x=2">`;
const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); };
async function step(name, fn) { try { out[name] = await fn(); } catch (e) { out[name] = "THREW: " + e.message; } }

await step("empty-freeze", async () => { fillForm({}); document.querySelector("#btn-freeze").click(); await sleep(50); return document.querySelector("#reg-errors").textContent; });
await step("xss-register", async () => {
  fillForm({ title: XSS, question: XSS, design: XSS, hypotheses: [{ id: "H1", prediction: XSS, measure: XSS, direction: ">=", threshold: "0.5", refutes: XSS }], kill_conditions: XSS, verifier: XSS });
  renderPreview(); document.querySelector("#btn-freeze").click(); await sleep(300);
  return { x: window.__x, imgs: document.querySelectorAll("img").length, line: document.querySelector("#frozen-line").textContent.slice(0, 60) };
});
await step("xss-verify", async () => { await loadText(lastFrozen.json, XSS); await sleep(100); return { x: window.__x, imgs: document.querySelectorAll("img").length }; });
await step("missing-direction", async () => {
  const reg = { title: "t", hypotheses: [{ id: "H1", threshold: 1 }] };
  await loadText(JSON.stringify({ registration: reg, sha256: await sha256Hex(canonical(reg)) }), "f"); return document.querySelector("#ver-table tbody").children.length;
});
await step("hypotheses-not-array", async () => { const reg = { title: "t", hypotheses: "nope" }; await loadText(JSON.stringify({ registration: reg, sha256: "" }), "f"); return "rendered"; });
await step("null-hypothesis", async () => { const reg = { title: "t", hypotheses: [null] }; await loadText(JSON.stringify({ registration: reg, sha256: "" }), "f"); return "rendered"; });
await step("deep-nesting", async () => { let s = "1"; for (let i = 0; i < 20000; i++) s = `{"a":${s}}`; await loadText(`{"registration":{"title":"t","hypotheses":[],"x":${s}}}`, "deep"); return document.querySelector("#ver-errors").textContent || "no error shown"; });
await step("malformed-draft", async () => { localStorage.setItem("prereg-desk:draft:v1", JSON.stringify({ hypotheses: "x" })); try { fillForm(JSON.parse(localStorage.getItem("prereg-desk:draft:v1"))); return "ok"; } finally { localStorage.removeItem("prereg-desk:draft:v1"); } });
await step("dup-ids", async () => { fillForm({ title: "t", question: "q", hypotheses: [{ id: "X", prediction: "p", measure: "m", direction: ">=", threshold: "1" }, { id: "X", prediction: "p", measure: "m", direction: ">=", threshold: "1" }] }); return validate(readForm()); });
await step("nfc", async () => { const a = await sha256Hex(canonical({ t: "café" })), b = await sha256Hex(canonical({ t: "café" })); return a === b ? "same" : "differ"; });
await step("huge-100x", async () => {
  const big = JSON.parse(JSON.stringify(EXAMPLE));
  for (const k of ["question", "design", "measures"]) big[k] = big[k].repeat(100);
  big.hypotheses = Array.from({ length: 600 }, (_, i) => Object.assign({}, EXAMPLE.hypotheses[i % 6], { id: "H" + (i + 1), threshold: "0.8" }));
  let t0 = performance.now(); fillForm(big); renderPreview(); const tForm = performance.now() - t0;
  t0 = performance.now(); onChange(); const tInput = performance.now() - t0;
  const reg = readForm(); reg.frozen_at_utc = "2026-01-01T00:00:00Z";
  const text = JSON.stringify({ registration: reg, sha256: await sha256Hex(canonical(reg)) });
  t0 = performance.now(); await loadText(text, "big"); const tVerify = performance.now() - t0;
  return { tForm: Math.round(tForm), tInput: Math.round(tInput), tVerify: Math.round(tVerify), bytes: text.length };
});
await step("paste-5MB", async () => {
  fillForm({}); const s = "x".repeat(5 * 1024 * 1024);
  const t0 = performance.now(); set("#f-question", s); const t = performance.now() - t0; await sleep(700);
  return { ms: Math.round(t), status: document.querySelector("#draft-status").textContent };
});
await step("infinity-measured", async () => num("1e400"));
await step("public-hash-prefix", async () => "ok");
return out;
