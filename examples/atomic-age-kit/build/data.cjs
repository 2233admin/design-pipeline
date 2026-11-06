"use strict";

// What the print-set sheet fills into the ten atomic-age templates. Two layers of content, as the owner
// asked: the original world (Halcyon Orbital Lines, the Orbitville Gazette, Meridian 88) and real
// history written as text (programmes, dates, crews as historical fact in documents). Marks stay empty
// labelled slots here; NASA imagery (1964-1975, public domain) fills the art slots and is credited.

const CREDIT = "Imagery: NASA. Not endorsed by NASA.";

const RENDERS = [
  {
    id: "cover.atomic-magazine", caption: "Magazine cover. Art: NASA Ames artwork of a torus space colony (Rick Guidice, 1975), duotone with a misregistered teal plate.", credit: CREDIT,
    images: { paper: "paper-cover.jpg", art: "colony-duotone.jpg" }, tones: { paper: "#E3CDA6", art: "#3C4A47" },
    set: { date: "JUNE 1975", price: "60c", item_1: "CITIES IN ORBIT", deck_1: "Inside the torus colony at L-5", page_1: "Page 12", item_2: "THE GEMINI YEARS", deck_2: "Ten flights, two seats, 1965-66", page_2: "Page 28" },
  },
  {
    id: "poster.atomic-travel", caption: "Travel poster. Art: Apollo 17, the crescent Earth over the lunar horizon (AS17-152-23272, December 1972), duotone.", credit: CREDIT,
    images: { art: "earthrise-duotone.jpg" }, tones: { art: "#1A1E20" },
    params: { art: "slot", ground: "ink", title_ink: "vermilion" },
    set: { kicker: "APOLLO 17 · DECEMBER 1972", title: "EARTHRISE", subtitle: "From lunar orbit, the last crewed flight", band: "THE VIEW FROM LUNAR ORBIT", date: "DEC. 1972" },
  },
  {
    id: "cover.atomic-linen-book", caption: "Linen book cover, the swoop round the title on charcoal cloth.",
    params: { cloth: "charcoal", swoop: "loop" }, set: { title_1: "ORBITAL", title_2: "TRAJECTORY", title_3: "TABLES", author: "HALCYON SURVEY OFFICE" },
  },
  {
    id: "banner.atomic-ad-panel", caption: "Ad panel (landscape). Brand and logo are user-filled; the default stays original.",
    set: { year: "1959", brand: "MERIDIAN 88", wordmark: "OWNER PORTFOLIO" },
  },
  {
    id: "card.atomic-field-label", caption: "Field-guide label card on a printed mustard board (materials generate --generator print).",
    images: { board: "print-mustard.jpg" }, tones: { board: "#E58F2C" },
  },
  {
    id: "doc.atomic-flight-plan", caption: "Flight-plan page, set as the Apollo 11 timeline of 20 July 1969 (historical fact as text; layout ours, unsigned annotations).",
    images: { paper: "paper-sheet.jpg" }, tones: { paper: "#ECE8DF" },
    params: { start_hour: 102, period_end: 46 },
    set: { code: "MCC-H", zone_time: "1556 EDT", net: "MSFN", period: "POWERED DESCENT (12 MIN)", event_1: "LM TOUCHDOWN - TRANQUILITY BASE", event_2: "POST-LANDING CHECKLIST", event_3: "STAY/NO-STAY T1, T2", event_4: "LM SYSTEMS CHECK", event_5: "EVA PREP", box_title: "DESCENT", box_line_1: "DOI BURN", box_line_2: "PDI", box_line_3: "THROTTLE DOWN", box_line_4: "PITCHOVER", box_line_5: "LANDING RADAR", box_line_6: "CONTACT LIGHT", note: "102:45 ok", side_1: "CDR ARMSTRONG", side_2: "CMP COLLINS", side_3: "LMP ALDRIN", cell_1: "APOLLO 11", cell_2: "FINAL", cell_3: "JULY 1, 1969", cell_4: "102:00-104:00", cell_5: "5/13", cell_6: "3-71", form: "MSC FORM 29 (MAY 69)" },
  },
  {
    id: "doc.atomic-checklist", caption: "Checklist page with a NASA line diagram of the Gemini spacecraft (S64-04925, 1964) in the craft slot, photocopied.", credit: CREDIT,
    images: { paper: "paper-sheet.jpg", craft: "gemini-diagram-copy.jpg" }, tones: { paper: "#ECE8DF", craft: "#F2F2F2" },
    params: { craft: "slot" },
    set: { title: "GEMINI RENDEZVOUS CHECKLIST", card_id: "GT-6A CARD 4", phase: "TERMINAL PHASE", section_1: "PRE-TPI", section_2: "TERMINAL PHASE", section_3: "STATION KEEPING", stamp_date: "DEC 15 1965" },
  },
  {
    id: "poster.atomic-orbit-plate", caption: "White-line plate: translunar geometry.",
    set: { caption: "After period translunar diagrams" },
  },
  {
    id: "card.atomic-credential", caption: "Press credential set for Apollo 11 (programme name as text; the emblem slot stays empty).",
    images: { paper: "paper-card.jpg" }, tones: { paper: "#F0E1BC" },
    set: { mission: "APOLLO", number: "11", name: "J. HARTLEY", org: "PALM MESA GAZETTE" },
  },
  {
    id: "poster.atomic-solar-print", caption: "Solar-system print on a printed vermilion flat with a misregistered mustard plate (materials generate --generator print).",
    images: { paper: "print-terra.jpg" }, tones: { paper: "#AF4524" },
    set: { title: "THE PLANETS · AS CHARTED IN 1961", edition: "HALCYON SURVEY OFFICE · SECOND EDITION" },
  },
];

module.exports = { RENDERS, CREDIT };
