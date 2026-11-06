"use strict";

// The demo world: an original exploration game, 《穹井》 VAULTWELL. Every name, number and line here is
// invented for the kit.

const SITE = {
  zh: "穹井",
  en: "VAULTWELL",
  tag: "向下，没有尽头。",
  depth: "−41,200 m",
  stratum: "4,112",
};

// Navigation: each section is a depth on the rail.
const NAV = [
  { id: "top", zh: "首层", en: "SURFACE", depth: "000" },
  { id: "world", zh: "穹井", en: "THE WELL", depth: "120" },
  { id: "bureau", zh: "测深署", en: "BUREAU", depth: "860" },
  { id: "hush", zh: "缄默体", en: "THE HUSH", depth: "2,410" },
  { id: "board", zh: "接线台", en: "SWITCHBOARD", depth: "3,377" },
  { id: "logs", zh: "通讯", en: "LOGS", depth: "3,960" },
  { id: "descend", zh: "下潜", en: "DESCEND", depth: "4,112" },
];

const WORLD = [
  "地表在三百年前被封上。结构没有停，它只向下长。",
  "每一层都比上一层大一点。没有人见过底。",
  "测深署用声音丈量深度：敲一下，等回声，记一个数。",
];

const WORLD_NOTES = [
  { at: [0.14, 0.12], zh: "第 120 层", en: "SEALED", note: "封闭" },
  { at: [0.62, 0.36], zh: "垂直轨", en: "RAIL 7", note: "失效" },
  { at: [0.3, 0.64], zh: "回声井", en: "ECHO SHAFT", note: "可用" },
  { at: [0.7, 0.86], zh: "第 4,112 层", en: "CURRENT", note: "你在这里" },
];

const STRATA = [
  { from: "0", to: "120", zh: "封层", en: "SEAL", state: "关闭" },
  { from: "120", to: "860", zh: "旧城", en: "OLD WARD", state: "已测" },
  { from: "860", to: "2,410", zh: "缆林", en: "CABLE FOREST", state: "已测" },
  { from: "2,410", to: "3,377", zh: "静区", en: "QUIET ZONE", state: "危险" },
  { from: "3,377", to: "4,112", zh: "接线层", en: "SWITCH LAYER", state: "测量中" },
  { from: "4,112", to: "?", zh: "未知", en: "UNSOUNDED", state: "未知" },
];

const MEMBERS = [
  { id: "wendi", code: "S-07", zh: "闻笛", en: "WEN DI", role: "领测", roleEn: "LEAD", record: "4,112", years: "11", trace: 7, quote: "回声晚到了半秒。下面还有东西。", stats: [["听距", "3,400 m"], ["下潜", "212 次"], ["静默", "41 h"]] },
  { id: "huoyi", code: "S-12", zh: "霍夷", en: "HUO YI", role: "制图", roleEn: "CARTOGRAPHER", record: "3,960", years: "6", trace: 3, quote: "图上每一条线，都有人走过一次。", stats: [["测绘", "1,208 页"], ["下潜", "96 次"], ["静默", "18 h"]] },
  { id: "sujiu", code: "S-19", zh: "苏九", en: "SU JIU", role: "信号", roleEn: "SIGNAL", record: "3,377", years: "4", trace: 11, quote: "别回话。它们听得见回话。", stats: [["频段", "9 条"], ["下潜", "71 次"], ["静默", "63 h"]] },
  { id: "kelan", code: "S-23", zh: "柯岚", en: "KE LAN", role: "后卫", roleEn: "REAR GUARD", record: "2,410", years: "9", trace: 5, quote: "我负责最后一个上来。", stats: [["撤离", "37 次"], ["下潜", "154 次"], ["静默", "29 h"]] },
];

const HUSH = {
  zh: "缄默体",
  en: "THE HUSH",
  lines: ["它们不攻击声音。它们拆掉发出声音的东西。", "看不见。只能从回声的缺口里知道它们在哪。"],
  readouts: [["距离", "1,240", "m"], ["回声缺口", "3", "处"], ["建议", "静默", ""]],
};

const BOARD = {
  lines: [
    ["03:12:40", "SYS", "接线台 7 号 唤醒"],
    ["03:12:41", "SYS", "线路 0412 · 0413 · 0419 在线"],
    ["03:12:44", "REQ", "发送握手 / 层号 4,112"],
    ["03:12:47", "ACK", "总台应答：识别码未登记"],
    ["03:12:47", "ERR", "接入被拒绝：缺少回声钥"],
  ],
};

const LOGS = [
  { date: "2026.11.06", kind: "信标", kindEn: "BEACON", title: "第 4,112 层信标恢复 4 分钟", code: "TX-0412" },
  { date: "2026.11.02", kind: "版本", kindEn: "UPDATE", title: "「静区」测绘数据开放，地图新增 9 条竖井", code: "TX-0409" },
  { date: "2026.10.28", kind: "公告", kindEn: "NOTICE", title: "先行测试第二轮招募：下潜资格申请开启", code: "TX-0405" },
  { date: "2026.10.21", kind: "记录", kindEn: "RECORD", title: "测深员 S-19 的第 71 次下潜记录（节选）", code: "TX-0401" },
  { date: "2026.10.14", kind: "影像", kindEn: "FILM", title: "先导影像「回声晚到半秒」公开", code: "TX-0398" },
];

const PLATFORMS = [
  { zh: "PC", en: "WINDOWS" },
  { zh: "主机", en: "CONSOLE" },
  { zh: "移动端", en: "MOBILE" },
];

// Art slots: every picture position in the kit. Show mode draws a procedural structure plate (no
// figures) or carries the slot with type and data; slot mode shows the frame, size and task id.
const SLOTS = {
  "hero-kv": { zh: "主视觉", en: "KEY VISUAL", size: "3840×2160", safe: "8% 6% 22% 6%", plate: { scene: "shaft", seed: 11, vx: 0.22, vy: 0.58, roll: -8 } },
  "world-shaft": { zh: "竖井剖面", en: "SHAFT VIEW", size: "1600×2400", safe: "6%", plate: { scene: "shaft", seed: 5, vx: 0.6, vy: 0.22, roll: 3, slab: 0 } },
  "member-wendi": { zh: "测深员立绘", en: "PORTRAIT", size: "1200×1800", safe: "6% 10%" },
  "member-huoyi": { zh: "测深员立绘", en: "PORTRAIT", size: "1200×1800", safe: "6% 10%" },
  "member-sujiu": { zh: "测深员立绘", en: "PORTRAIT", size: "1200×1800", safe: "6% 10%" },
  "member-kelan": { zh: "测深员立绘", en: "PORTRAIT", size: "1200×1800", safe: "6% 10%" },
  "hush-sighting": { zh: "目击", en: "SIGHTING", size: "3840×1600", safe: "10%", plate: { scene: "shaft", seed: 23, vx: 0.78, vy: 0.3, roll: 7, ink: "night", slabY: 0.86 } },
  "log-thumb": { zh: "通讯配图", en: "LOG IMAGE", size: "1200×675", safe: "8%", plate: { scene: "shaft", seed: 31, vx: 0.5, vy: 0.45, roll: -2, slab: 0 } },
  "descend-well": { zh: "下潜竖井", en: "THE DROP", size: "2400×2160", safe: "8%", plate: { scene: "shaft", seed: 61, vx: 0.46, vy: 0.78, roll: 2, slab: 0, ink: "night" } },
  "cockpit-view": { zh: "舱外视野", en: "VIEWPORT", size: "3840×2160", safe: "12%", plate: { scene: "shaft", seed: 47, vx: 0.5, vy: 0.5, roll: 0, ink: "night", slab: 0 } },
};

module.exports = { SITE, NAV, WORLD, WORLD_NOTES, STRATA, MEMBERS, HUSH, BOARD, LOGS, PLATFORMS, SLOTS };
