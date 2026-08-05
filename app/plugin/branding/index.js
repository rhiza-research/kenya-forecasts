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


// --- Copy -----------------------------------------------------------------
//
// All the text that appears on the page.

const TITLE = "2026 OND Rainy Season Pilot Forecasts";

const BLURB = "This pilot delivers enhanced, agriculture-focused forecasts for the 2026 OND rainy season, produced from the ECMWF operational S2S forecast with custom post-processing. The forecasts and supporting data available through this pilot are provided for evaluation purposes during the 2026 OND season. Official weather forecasts, warnings, and advisories are issued by the Kenya Meteorological Service at meteo.go.ke.";

const DATA_LINE = "Forecast data is public sector information from the Government of Kenya, freely available for reuse.";

const LINKS = [
    { label: "Methodology:", text: "github.com/alecjong-lab/ECMWF-S2S4AFRICA", href: "https://github.com/alecjong-lab/ECMWF-S2S4AFRICA" },
    { label: "Official forecasts:", text: "meteo.go.ke", href: "https://meteo.go.ke" },
];

const SOURCE = { text: "github.com/rhiza-research/kenya-forecasts", href: "https://github.com/rhiza-research/kenya-forecasts" };


// --- DOM helpers ----------------------------------------------------------
//
// Shorthand for building the elements the bands are made of.

// Creates an element with an optional class and text.
function _el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

// Creates a link that opens in a new tab.
function _anchor(text, href) {
    const a = _el("a", "kmsa-link", text);
    a.href = href;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    return a;
}


// --- Bands ----------------------------------------------------------------
//
// The branding itself. Each function returns one container that the stylesheet
// places above or below the app in the page column.

// Builds the top container: the logo and title band, the PILOT pill and
// blurb band, and the links band.
function buildHeader() {
    const top = _el("div", "kmsa-chrome kmsa-chrome-top");
    top.id = "kmsa-chrome-top";

    const header = _el("div", "kmsa-band kmsa-band-header");
    const logo = _el("img", "kmsa-logo");
    logo.src = new URL("./kmsa-logo.jpg", import.meta.url).href;
    logo.alt = "Kenya Meteorological Service Authority";
    logo.draggable = false;
    header.appendChild(logo);
    header.appendChild(_el("h1", "kmsa-title", TITLE));
    top.appendChild(header);

    const pilot = _el("div", "kmsa-band kmsa-band-pilot");
    pilot.appendChild(_el("span", "kmsa-pill", "PILOT"));
    pilot.appendChild(_el("p", "kmsa-blurb", BLURB));
    top.appendChild(pilot);

    const links = _el("div", "kmsa-band kmsa-band-links");
    for (const item of LINKS) {
        const group = _el("span", "kmsa-link-group");
        group.appendChild(_el("span", "kmsa-link-label", item.label));
        group.appendChild(_anchor(item.text, item.href));
        links.appendChild(group);
    }
    top.appendChild(links);

    return top;
}

// Builds the bottom container: the data reuse line and the Filestash license
// attribution.
function buildFooter() {
    const bottom = _el("div", "kmsa-chrome kmsa-chrome-bottom");
    bottom.id = "kmsa-chrome-bottom";

    bottom.appendChild(_el("p", "kmsa-footer-line", DATA_LINE));

    const attribution = _el("p", "kmsa-footer-line");
    attribution.appendChild(document.createTextNode("Powered by Filestash, licensed AGPL-3.0. Source: "));
    attribution.appendChild(_anchor(SOURCE.text, SOURCE.href));
    bottom.appendChild(attribution);

    return bottom;
}


// --- Current date row marker ----------------------------------------------
//
// Puts a TODAY pill and a background tint on the listing row for the current
// date. The archive names its folders with an ISO date, so the row name is the
// signal.

// Marks the row named for today, comparing the row's own name against the
// archive's YYYY-MM-DD folder naming.
//
// The date comes from local time. Not toISOString, which is UTC and would name
// yesterday for anyone east of Greenwich in the morning.
//
// Only the name is compared, never the rest of the path: inside today's folder
// every child path still contains today's date, which would mark every row.
//
// The data attribute keeps the pill from being appended twice.
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
            name.appendChild(_el("span", "kmsa-today-badge", "TODAY"));
        }
    }
}

// Reruns the marking. The listing is absent at startup and is replaced
// wholesale on navigation, so marking once would not survive either event.
function watchListing() {
    const run = () => markToday(document.body);
    run();
    const observer = new window.MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pagechange", run);
}


// --- Startup --------------------------------------------------------------

// Value of the data-kmsa-branding attribute set on the root element. Nothing
// reads it; it is there to make the branding visible in the DOM.
const SENTINEL = "kmsa-branding";

// Adds both containers and starts the row marking. The stylesheet lays body out
// as a column, so document order decides placement: the header goes before #app
// and the footer after it. The id check makes a second import a no-op rather
// than a second set of bands.
function install() {
    if (document.getElementById("kmsa-chrome-top")) return;
    document.documentElement.setAttribute("data-kmsa-branding", SENTINEL);
    document.body.insertBefore(buildHeader(), document.body.firstChild);
    document.body.appendChild(buildFooter());
    watchListing();
}

if (document.body) install();
else window.addEventListener("DOMContentLoaded", install, { once: true });
