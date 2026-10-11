// Reports horizontal overflow on each tab (phone width check).
for (let i = 0; i < 100 && !document.documentElement.dataset.booted; i++) await new Promise(r => setTimeout(r, 100));
const res = {};
for (const t of ["register", "amend", "verify"]) { selectTab(t); await new Promise(r => setTimeout(r, 50)); res[t] = document.documentElement.scrollWidth - document.documentElement.clientWidth; }
document.querySelector("#btn-import").click(); res.importOpen = document.documentElement.scrollWidth - document.documentElement.clientWidth;
const wide = [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && e.offsetParent).map(e => e.tagName + "." + e.className).slice(0, 5);
res.wide = wide; return res;
