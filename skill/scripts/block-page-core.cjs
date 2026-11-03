"use strict";

// Tells a bot-challenge, WAF or captcha page from the page that was asked for (OpenSpec change
// reference-palette-extract). A capture of a block page looks like a real page, so measuring it
// produces a confident palette of the block page; every reference capture refuses it instead, with
// REFERENCE_BLOCKED, a contract error distinct from a failed or missing browser.
// The method follows yuvrajangadsingh/brandmd (MIT, src/extract.js), narrowed so that a real page is
// never refused for what it loads or what its text talks about: only elements a vendor renders on its
// challenge or block page decide alone (read from id and class attributes, never from text or script
// URLs); a challenge phrase counts only in the title, or in a short body, and only with a vendor
// footprint; generic wording needs a second, independent signal.

const { fail } = require("./contract-utils.cjs");

// Element ids or classes a vendor renders only on its challenge or block page; any one decides.
const CHALLENGE_ELEMENTS = [
  { vendor: "cloudflare", kind: "challenge", token: /^(cf-chl[\w-]*|challenge-form|cf-browser-verification|cf-challenge-running|cf-please-wait)$/ },
  { vendor: "cloudflare", kind: "block", token: /^(cf-error-details|cf-error-details-wrapper|cf-wrapper|cf-error-overview)$/ },
  { vendor: "perimeterx", kind: "challenge", token: /^px-captcha$/ },
];
// A captcha widget container: a challenge only with a challenge phrase in the title or a short body.
const CAPTCHA_WIDGET = /^(cf-turnstile|g-recaptcha|h-captcha)$/;
// Body text a vendor prints on its block page; decides only on a short page.
const BLOCK_TEXT = [
  { vendor: "cloudflare", kind: "block", text: /cloudflare ray id/ },
  { vendor: "imperva", kind: "block", text: /incapsula incident id/ },
];
const CHALLENGE_PHRASE = /just a moment|attention required|verifying you are human|checking your browser|checking if the site connection is secure|enable javascript and cookies to continue|performing security verification/;
// Footprints of a challenge in progress; a page that only loads a CDN asset or names a vendor has none.
const CHALLENGE_FOOTPRINT = /\/cdn-cgi\/challenge-platform\/|_cf_chl_opt|__cf_chl_|captcha-delivery\.com|\/_incapsula_resource|px-captcha/;
const BLOCK_TITLE = /^\s*(access denied|forbidden|40[13]\b|attention required|pardon our interruption|are you (a )?(human|robot)|captcha|request blocked|not authorized|security check)/i;
const FALLBACK_FONT = /^\s*("?)(times( new roman)?|arial|helvetica|system-ui|sans-serif|serif|-apple-system|blinkmacsystemfont)\1\s*$/i;
const SHORT_BODY = 300;
const THIN_BODY = 200;

// The id and class tokens of every element in an HTML string (attributes only, so text that quotes
// markup, which is escaped, never matches).
function elementTokens(html) {
  const tokens = new Set();
  const attribute = /\s(?:id|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  for (let match = attribute.exec(html); match; match = attribute.exec(html)) {
    for (const token of (match[1] ?? match[2] ?? match[3] ?? "").split(/\s+/)) if (token) tokens.add(token.toLowerCase());
  }
  return tokens;
}

// Pure: { title, text, html, status, backgrounds, fonts } in, a verdict out. `text` is the visible
// body text. `backgrounds` (distinct measured background colours) and `fonts` (family names) are
// optional; without them the bare-page signal is not counted. `vendorOnly` keeps only vendor
// evidence, for a project's own built page, whose designed 403 page must not be refused by its wording.
function detectBlockPage({ title = "", text = "", html = "", status = null, backgrounds = null, fonts = null } = {}, { vendorOnly = false } = {}) {
  const lowerHtml = String(html).toLowerCase();
  const visible = String(text).replace(/\s+/g, " ").trim();
  const lowerText = visible.toLowerCase();
  const short = visible.length < SHORT_BODY;
  const tokens = elementTokens(String(html));
  for (const element of CHALLENGE_ELEMENTS) {
    const hit = [...tokens].find((token) => element.token.test(token));
    if (hit) return { blocked: true, kind: element.kind, vendor: element.vendor, signals: [`${element.vendor} ${element.kind} element (${hit})`] };
  }
  for (const marker of BLOCK_TEXT) {
    if (short && marker.text.test(lowerText)) return { blocked: true, kind: marker.kind, vendor: marker.vendor, signals: [`${marker.vendor} ${marker.kind} text on a short page`] };
  }
  const titlePhrase = CHALLENGE_PHRASE.test(String(title).toLowerCase());
  const bodyPhrase = short && CHALLENGE_PHRASE.test(lowerText);
  const footprint = CHALLENGE_FOOTPRINT.test(lowerHtml);
  const widget = [...tokens].find((token) => CAPTCHA_WIDGET.test(token));
  if ((titlePhrase || bodyPhrase) && (footprint || widget)) {
    return { blocked: true, kind: "challenge", vendor: widget === "g-recaptcha" ? "recaptcha" : widget === "h-captcha" ? "hcaptcha" : "cloudflare", signals: [`challenge phrase in the ${titlePhrase ? "title" : "short body"} with ${widget ? `a ${widget} widget` : "a challenge footprint"}`] };
  }
  if (vendorOnly) return { blocked: false, kind: null, vendor: null, signals: [] };
  const signals = [];
  if (BLOCK_TITLE.test(title)) signals.push(`block title "${String(title).trim().slice(0, 80)}"`);
  if ([401, 403, 429].includes(status)) signals.push(`HTTP ${status}`);
  if (visible.length < THIN_BODY) signals.push(`under ${THIN_BODY} characters of text`);
  if (Array.isArray(backgrounds) && Array.isArray(fonts) && backgrounds.length <= 2 && fonts.length > 0 && fonts.every((font) => FALLBACK_FONT.test(String(font).split(",")[0]))) {
    signals.push("bare page: at most two backgrounds and only fallback fonts");
  }
  // A block title is required: thin text, a status and a bare look are each true of real pages.
  return signals.length >= 2 && BLOCK_TITLE.test(title) ? { blocked: true, kind: "block", vendor: null, signals } : { blocked: false, kind: null, vendor: null, signals };
}

// Runs in the page: what detectBlockPage reads, bounded so a huge page stays cheap to send back.
function collectBlockSignals() {
  return {
    title: document.title || "",
    text: (document.body?.innerText || "").slice(0, 20000),
    html: (document.documentElement?.outerHTML || "").slice(0, 400000),
  };
}

// Reads the same signals from saved page HTML (a capture adapter's page.html).
function signalsFromHtml(html) {
  const source = String(html || "");
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1] || "").replace(/\s+/g, " ").trim();
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(source)?.[1] ?? source;
  const text = body
    .replace(/<(script|style|noscript|template|title)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text, html: source };
}

function refuseBlockPage(scope, url, verdict) {
  const what = verdict.vendor ? `a ${verdict.vendor} ${verdict.kind} page` : "a block or access-denied page";
  fail(scope, `${url} served ${what} (${verdict.signals.join("; ")}), not the reference, so nothing was measured or kept as evidence. Fix: use a page of the site that is served without a challenge (for example its docs or pricing page), or save the reference by hand (a screenshot the owner provides) and use it as an image reference`, { code: "REFERENCE_BLOCKED", vendor: verdict.vendor, kind: verdict.kind, signals: verdict.signals });
}

module.exports = { collectBlockSignals, detectBlockPage, refuseBlockPage, signalsFromHtml };
