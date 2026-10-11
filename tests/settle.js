// Waits for boot and the self-check, then returns. Used for screenshots.
for (let i = 0; i < 100 && !(document.documentElement.dataset.selfcheck && document.documentElement.dataset.booted); i++) await new Promise(r => setTimeout(r, 100));
await document.fonts.ready;
const open = new URLSearchParams(location.hash.slice(1).replace(/&/g, "&")).has("examples");
if (location.hash.includes("examples")) document.querySelector("#examples-box").open = true;
if (location.hash.includes("chainopen")) document.querySelectorAll("#ver-summary details").forEach(d => d.open = true);
return { selfcheck: document.documentElement.dataset.selfcheckCount, booted: document.documentElement.dataset.booted };
