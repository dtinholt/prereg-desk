// Waits for the console self-check and returns its count. Evaluated by cdp.mjs.
for (let i = 0; i < 100 && !document.documentElement.dataset.selfcheck; i++) await new Promise(r => setTimeout(r, 100));
return { selfcheck: document.documentElement.dataset.selfcheck, count: document.documentElement.dataset.selfcheckCount };
