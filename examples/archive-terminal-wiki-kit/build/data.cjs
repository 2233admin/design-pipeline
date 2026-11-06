"use strict";

// Demo content: an original fictional game, 「霜线」 FROSTLINE, a cold-frontier survey game.
// Every name, number and date here is invented for the kit.

const SITE = { zh: "霜线档案", en: "FROSTLINE RECORDS", tag: "Alpha", kicker: "Frostline Records", sub: "玩家共同维护的《霜线》资料档案" };

const NAV = [
  { id: "browse", zh: "浏览", items: [
    { id: "home", zh: "首页", en: "Home", icon: "home", href: "home.html" },
    { id: "random", zh: "随机条目", en: "Random", icon: "shuffle", href: "entity.html" },
    { id: "index", zh: "分类索引", en: "Index", icon: "index", href: "list.html" },
    { id: "recent", zh: "最近更改", en: "Recent", icon: "history", href: "changes.html" },
  ] },
  { id: "contents", zh: "内容分类", items: [
    { id: "agents", zh: "调查员", en: "Agents", icon: "agent", href: "entity.html" },
    { id: "arms", zh: "武装", en: "Arms", icon: "arms", href: "list.html" },
    { id: "modules", zh: "模组", en: "Modules", icon: "module", href: "list.html" },
    { id: "threats", zh: "威胁体", en: "Threats", icon: "threat", href: "list.html" },
    { id: "supplies", zh: "物资", en: "Supplies", icon: "supply", href: "item.html" },
    { id: "recruit", zh: "招募", en: "Recruit", icon: "recruit", href: "list.html" },
    { id: "outposts", zh: "据点", en: "Outposts", icon: "outpost", href: "list.html" },
    { id: "live", zh: "极夜远征", en: "Polar Night", icon: "snow", href: "article.html", live: "进行中" },
  ] },
  { id: "help", zh: "帮助", items: [
    { id: "start", zh: "新手入门", en: "Start", icon: "compass", href: "article.html" },
    { id: "guide", zh: "编辑指南", en: "Guide", icon: "book", href: "article.html" },
  ] },
];

const TILES = [
  { zh: "调查员", en: "Agents", icon: "agent", href: "entity.html" },
  { zh: "武装", en: "Arms", icon: "arms", href: "list.html" },
  { zh: "模组", en: "Modules", icon: "module", href: "list.html" },
  { zh: "威胁体", en: "Threats", icon: "threat", href: "list.html" },
  { zh: "物资", en: "Supplies", icon: "supply", href: "item.html" },
  { zh: "招募", en: "Recruit", icon: "recruit", href: "list.html" },
  { zh: "据点", en: "Outposts", icon: "outpost", href: "list.html" },
  { zh: "补给站", en: "Depot", icon: "depot", href: "list.html" },
  { zh: "极夜远征", en: "Polar Night Expedition", icon: "snow", href: "article.html", flag: true },
  { zh: "地图", en: "Map", icon: "map", href: "list.html" },
  { zh: "事件", en: "Events", icon: "event", href: "article.html" },
  { zh: "通讯记录", en: "Comms Log", icon: "log", href: "changes.html" },
];

const AGENTS = [
  { zh: "白砾", en: "Gravel", rarity: 6, role: "先锋", roleEn: "Vanguard", arms: "长柄", faction: "北港工会", task: "agent-gravel", flag: "NEW" },
  { zh: "柒弦", en: "Septet", rarity: 6, role: "术师", roleEn: "Caster", arms: "法匣", faction: "测绘局", task: "agent-card", flag: "UP" },
  { zh: "罗鸢", en: "Kitefall", rarity: 5, role: "狙击", roleEn: "Marksman", arms: "射装", faction: "流民营地", task: "agent-card" },
  { zh: "祁寒", en: "Rime", rarity: 5, role: "守卫", roleEn: "Warden", arms: "重装", faction: "北港工会", task: "agent-card" },
  { zh: "莫桑", en: "Mulberry", rarity: 5, role: "医疗", roleEn: "Medic", arms: "法匣", faction: "测绘局", task: "agent-card" },
  { zh: "阿涅斯", en: "Agnes", rarity: 4, role: "术师", roleEn: "Caster", arms: "法匣", faction: "雪线教团", task: "agent-card" },
  { zh: "闻溪", en: "Brookside", rarity: 4, role: "先锋", roleEn: "Vanguard", arms: "单刃", faction: "流民营地", task: "agent-card" },
  { zh: "铁砧", en: "Anvil", rarity: 4, role: "守卫", roleEn: "Warden", arms: "重装", faction: "北港工会", task: "agent-card" },
];

const ARMS = [
  { zh: "寂潮", en: "Still Tide", rarity: 6, type: "长柄", attr: "力量", atk: 512, flag: "UP" },
  { zh: "断桥", en: "Broken Span", rarity: 6, type: "单刃", attr: "敏捷", atk: 498, flag: "NEW" },
  { zh: "白昼钉", en: "Daynail", rarity: 5, type: "射装", attr: "敏捷", atk: 431 },
  { zh: "余温", en: "Afterwarmth", rarity: 5, type: "法匣", attr: "意志", atk: 419 },
  { zh: "折光", en: "Refractor", rarity: 5, type: "射装", attr: "智识", atk: 425 },
  { zh: "冻土犁", en: "Permafrost Plow", rarity: 5, type: "重装", attr: "力量", atk: 440 },
  { zh: "回针", en: "Backstitch", rarity: 4, type: "单刃", attr: "敏捷", atk: 352 },
  { zh: "灯芯", en: "Wick", rarity: 4, type: "法匣", attr: "意志", atk: 344 },
  { zh: "夜巡", en: "Night Round", rarity: 4, type: "长柄", attr: "力量", atk: 357 },
  { zh: "碎冰锥", en: "Icepick", rarity: 3, type: "单刃", attr: "敏捷", atk: 288 },
  { zh: "铁栓", en: "Iron Bolt", rarity: 3, type: "重装", attr: "力量", atk: 291 },
  { zh: "信号枪", en: "Flare", rarity: 3, type: "射装", attr: "智识", atk: 279 },
];

const NEWS = [
  { date: "2041-03-18", title: "「极夜远征」限时委托开启", fresh: true, lead: true, task: "banner-polar-night" },
  { date: "2041-03-15", title: "v2.4「冰原回声」版本更新说明", fresh: true },
  { date: "2041-03-12", title: "「白砾」档案补全与语音收录", thumb: true },
  { date: "2041-03-08", title: "v2.4 已知问题与修复计划" },
  { date: "2041-03-02", title: "社区创作征集：据点明信片" },
];

const ITEMS = [
  { zh: "冷凝核心", en: "Condensate Core", rarity: 5 },
  { zh: "霜晶", en: "Rime Crystal", rarity: 4 },
  { zh: "校准片", en: "Calibration Shim", rarity: 3 },
  { zh: "铆钉束", en: "Rivet Bundle", rarity: 2 },
  { zh: "暖芯电池", en: "Heatcell", rarity: 3 },
  { zh: "测绘胶卷", en: "Survey Film", rarity: 1 },
];

module.exports = { SITE, NAV, TILES, AGENTS, ARMS, NEWS, ITEMS };
