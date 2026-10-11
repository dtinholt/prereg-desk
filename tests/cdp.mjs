// Minimal Chrome DevTools Protocol driver, no dependencies (Node 22+ has WebSocket built in).
// Usage: node tests/cdp.mjs <page-url> <script.js> [--width=1280] [--height=900] [--dark=1] [--mobile=1] [--shot=out.png [--full=1]] [--pdf=out.pdf]
// The script is evaluated in the page after load; it must evaluate to a Promise or value
// that is JSON-serialisable. Console messages, page errors and the result print as JSON lines.
// Exit code 0 when the script resolves and no page error occurred, 1 otherwise.
import { spawn } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, scriptPath, ...rest] = process.argv;
if (!url || !scriptPath) { console.error("usage: node cdp.mjs <url> <script.js>"); process.exit(2); }
const opt = Object.fromEntries(rest.map(a => a.replace(/^--/, "").split("=")));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "prereg-cdp-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${opt.width || 1280},${opt.height || 900}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let exitCode = 1;
async function main() {
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find(t => t.type === "page"); } catch (_) {}
    if (!target) await sleep(100);
  }
  if (!target) throw new Error("chrome did not start");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = [];
  const listeners = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === "Runtime.consoleAPICalled") console.log(JSON.stringify({ console: m.params.type, text: m.params.args.map(a => a.value ?? a.description).join(" ") }));
    if (m.method === "Runtime.exceptionThrown") { errors.push(m.params.exceptionDetails); console.log(JSON.stringify({ pageerror: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text })); }
    if (m.method === "Page.javascriptDialogOpening") { console.log(JSON.stringify({ dialog: m.params.message })); send("Page.handleJavaScriptDialog", { accept: true }); }
    listeners.forEach(f => f(m));
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
  if (opt.dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  if (opt.mobile) await send("Emulation.setDeviceMetricsOverride", { width: +(opt.width || 390), height: +(opt.height || 844), deviceScaleFactor: 2, mobile: true });
  const loaded = new Promise(res => listeners.push(m => { if (m.method === "Page.loadEventFired") res(); }));
  await send("Page.navigate", { url });
  await loaded; await sleep(400);
  const src = readFileSync(scriptPath, "utf8");
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${src} })()`, awaitPromise: true, returnByValue: true, timeout: 120000 });
  if (r.result?.exceptionDetails) { console.log(JSON.stringify({ scripterror: r.result.exceptionDetails.exception?.description })); }
  else { console.log(JSON.stringify({ result: r.result?.result?.value })); exitCode = errors.length ? 1 : 0; }
  if (opt.shot) {
    await sleep(300);
    let clip;
    if (opt.full) { const m = await send("Page.getLayoutMetrics"); const c = m.result.cssContentSize; clip = { x: 0, y: 0, width: c.width, height: Math.min(c.height, 12000), scale: 1 }; }
    const shot = await send("Page.captureScreenshot", Object.assign({ format: "png" }, clip ? { clip, captureBeyondViewport: true } : {}));
    (await import("node:fs")).writeFileSync(opt.shot, Buffer.from(shot.result.data, "base64"));
  }
  if (opt.pdf) {
    const pdf = await send("Page.printToPDF", { printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true });
    (await import("node:fs")).writeFileSync(opt.pdf, Buffer.from(pdf.result.data, "base64"));
  }
  ws.close();
}
main().catch(e => { console.error(e); }).finally(() => { chrome.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch (_) {} process.exit(exitCode); }, 300); });
