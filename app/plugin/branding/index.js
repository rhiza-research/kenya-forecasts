// KMSA branding for the forecast file browser.
//
// Adds four bands around the file listing: the logo and title, the PILOT pill
// beside the blurb, a row of links, and a footer. Also marks the listing row
// named for the current date.
//
// The bands are built at runtime because the page HTML is not reachable.
// ctrl.ServeIndex compiles index.frontoffice.html into a template when its
// handler is constructed and never calls applyPatch, and the only two
// applyPatch call sites serve assets under public/assets/. So branding.patch
// adds a one line import of this module to
// public/assets/boot/ctrl_boot_frontoffice.js, which is in the preload list and
// therefore runs on every page.
//
// Filestash serves this file from inside the plugin zip, so import.meta.url is
// its real URL and the logo stored beside it resolves as a relative URL.


// --- Markup ---------------------------------------------------------------

const LOGO = new URL("./kmsa-logo.jpg", import.meta.url).href;

const HEADER = `
<div class="kmsa-band kmsa-band-header">
    <img class="kmsa-logo" src="${LOGO}" alt="Kenya Meteorological Service Authority" draggable="false">
    <h1 class="kmsa-title">2026 OND Rainy Season Pilot Forecasts</h1>
</div>
<div class="kmsa-band kmsa-band-pilot">
    <span class="kmsa-pill">PILOT</span>
    <div class="kmsa-prose">
        <p class="kmsa-blurb">This pilot provides enhanced forecasts through the rainy season to support agricultural decisions, produced from the ECMWF operational sub-seasonal-to-seasonal (S2S) forecast with custom post-processing (<a class="kmsa-link" href="https://github.com/alecjong-lab/ECMWF-S2S4AFRICA" rel="noopener noreferrer" target="_blank">github.com/alecjong-lab/ECMWF-S2S4AFRICA</a>).</p>
        <p class="kmsa-blurb kmsa-official">For the official forecasts, weather advisories, seasonal outlooks, and the full suite of operational forecasting products, please visit the <a class="kmsa-link" href="https://meteo.go.ke" rel="noopener noreferrer" target="_blank">Kenya Meteorological Service website</a>.</p>
    </div>
</div>
<div class="kmsa-band kmsa-band-links">
    <span class="kmsa-link-group">
        <span class="kmsa-link-label">Methodology:</span>
        <a class="kmsa-link" href="https://github.com/alecjong-lab/ECMWF-S2S4AFRICA" rel="noopener noreferrer" target="_blank">github.com/alecjong-lab/ECMWF-S2S4AFRICA</a>
    </span>
    <span class="kmsa-link-group">
        <span class="kmsa-link-label">Official forecasts:</span>
        <a class="kmsa-link" href="https://meteo.go.ke" rel="noopener noreferrer" target="_blank">meteo.go.ke</a>
    </span>
</div>`;

const FOOTER = `
<p class="kmsa-footer-line">Forecast data is public sector information from the Government of Kenya, freely available for reuse.</p>
<p class="kmsa-footer-line">Powered by Filestash, licensed AGPL-3.0. Source: <a class="kmsa-link" href="https://github.com/rhiza-research/kenya-forecasts" rel="noopener noreferrer" target="_blank">github.com/rhiza-research/kenya-forecasts</a></p>`;


// --- Current date row marker ----------------------------------------------

// Puts a TODAY pill and a background tint on the row named for today, matching
// against the archive's YYYY-MM-DD folder naming.
//
// The date comes from local time. Not toISOString, which is UTC and would name
// yesterday for anyone east of Greenwich in the morning.
//
// Only the name is compared, never the rest of the path: inside today's folder
// every child path still contains today's date, which would mark every row.
function markToday(root) {
    const now = new Date();
    const iso = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
    for (const row of root.querySelectorAll(".component_thing")) {
        if (row.getAttribute("data-kmsa-today") === "true") continue;
        const path = row.getAttribute("data-path") || "";
        const rowName = path.replace(/\/+$/, "").split("/").pop();
        if (rowName !== iso) continue;
        row.setAttribute("data-kmsa-today", "true");
        const name = row.querySelector(".component_filename");
        if (name && !name.querySelector(".kmsa-today-badge")) {
            const badge = document.createElement("span");
            badge.className = "kmsa-today-badge";
            badge.textContent = "TODAY";
            name.appendChild(badge);
        }
    }
}

// Reruns the marking. The listing is absent at startup and is replaced wholesale
// on navigation, so marking once would not survive either event.
function watchListing() {
    const run = () => markToday(document.body);
    run();
    const observer = new window.MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pagechange", run);
}


// --- Startup --------------------------------------------------------------

function band(id, markup) {
    const node = document.createElement("div");
    node.id = id;
    node.className = "kmsa-chrome " + id;
    node.innerHTML = markup;
    return node;
}

// Adds both bands and starts the row marking. The stylesheet lays body out as a
// column, so document order decides placement: the header goes before #app and
// the footer after it. The id check makes a second import a no-op rather than a
// second set of bands.
function install() {
    if (document.getElementById("kmsa-chrome-top")) return;
    document.body.insertBefore(band("kmsa-chrome-top", HEADER), document.body.firstChild);
    document.body.appendChild(band("kmsa-chrome-bottom", FOOTER));
    watchListing();
}

if (document.body) install();
else window.addEventListener("DOMContentLoaded", install, { once: true });
