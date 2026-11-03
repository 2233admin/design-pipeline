"use strict";

// Tells a bot-challenge, WAF or captcha page from the page that was asked for (OpenSpec change
// reference-palette-extract). A capture of a block page looks like a real page, so measuring it
// produces a confident palette of the block page; every reference capture refuses it instead, with
// REFERENCE_BLOCKED, a contract error distinct from a failed or missing browser.
// The method follows yuvrajangadsingh/brandmd (MIT, src/extract.js): vendor markers decide alone;
// title and body phrases count only with a vendor footprint or a second independent signal, so a
// minimal landing page is not refused.

const { fail } = require("./contract-utils.cjs");

// Markers a vendor serves only on its challenge or block pages; any one decides.
const VENDOR_MARKERS = [
  { vendor: "cloudflare", kind: "challenge", html: /cf-browser-verification|cf-challenge-running|__cf_chl_|\/cdn-cgi\/challenge-platform\// },
  { vendor: "cloudflare", kind: "block", html: /cf-error-details/, text: /cloudflare ray id/ },
  { vendor: "perimeterx", kind: "challenge", html: /id=["']?px-captcha/ },
  { vendor: "datadome", kind: "challenge", html: /captcha-delivery\.com/ },
  { vendor: "imperva", kind: "block", html: /_incapsula_resource/ },
];
const CHALLENGE_PHRASE = /just a moment|attention required|verifying you are human|enable javascript and cookies to continue/;
const BLOCK_TITLE = /access denied|forbidden|^\s*40[13]\b|attention required|pardon our interruption|are you (a )?(human|robot)|captcha|request blocked|not authorized|security check/i;
const CAPTCHA_WIDGET = /class=["'][^"']*\b(g-recaptcha|h-captcha|cf-turnstile)\b/;
const FALLBACK_FONT = /^\s*("?)(times( new roman)?|arial|helvetica|system-ui|sans-serif|serif|-apple-system|blinkmacsystemfont)\1\s*$/i;

// Pure: { title, text, html, status, backgrounds, fonts } in, a verdict out. `backgrounds` (distinct
// measured background colours) and `fonts` (family names) are optional measurements; without them the
// bare-page signal is not counted. `vendorOnly` keeps only the vendor markers, for a project's own
// built page, whose designed 403 page must not be refused by its wording.
function detectBlockPage({ title = "", text = "", html = "", status = null, backgrounds = null, fonts = null } = {}, { vendorOnly = false } = {}) {
  const lowerHtml = String(html).toLowerCase();
  const lowerText = String(text).toLowerCase();
  const lowerTitle = String(title).toLowerCase();
  for (const marker of VENDOR_MARKERS) {
    if ((marker.html && marker.html.test(lowerHtml)) || (marker.text && marker.text.test(lowerText))) {
      return { blocked: true, kind: marker.kind, vendor: marker.vendor, signals: [`${marker.vendor} ${marker.kind} marker`] };
    }
  }
  if (vendorOnly) return { blocked: false, kind: null, vendor: null, signals: [] };
  const phrase = CHALLENGE_PHRASE.test(lowerTitle) || CHALLENGE_PHRASE.test(lowerText);
  if (phrase && /cloudflare/.test(lowerHtml)) return { blocked: true, kind: "challenge", vendor: "cloudflare", signals: ["challenge phrase with a cloudflare footprint"] };
  const signals = [];
  if (BLOCK_TITLE.test(title)) signals.push(`block title "${String(title).trim().slice(0, 80)}"`);
  if ([401, 403, 429].includes(status)) signals.push(`HTTP ${status}`);
  if (String(text).replace(/\s+/g, " ").trim().length < 200) signals.push("under 200 characters of text");
  if (CAPTCHA_WIDGET.test(lowerHtml)) signals.push("captcha widget");
  if (Array.isArray(backgrounds) && Array.isArray(fonts) && backgrounds.length <= 2 && fonts.length > 0 && fonts.every((font) => FALLBACK_FONT.test(String(font).split(",")[0]))) {
    signals.push("bare page: at most two backgrounds and only fallback fonts");
  }
  return signals.length >= 2 ? { blocked: true, kind: "block", vendor: null, signals } : { blocked: false, kind: null, vendor: null, signals };
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
  const text = source
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
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
