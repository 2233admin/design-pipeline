"use strict";

// Copy of the fictional case 潮位警报 TIDEMARK: the Ring-Sea Sluice Authority keeps a city built in a
// sinking basin; "surge bodies" rise from under the basin. Every name, term and line here is original.

const ORG = { zh: "环海闸务局", en: "RING-SEA SLUICE AUTHORITY", code: "RSA", post: "第九排涝区指挥终端", postEn: "DRAINAGE ZONE 9 COMMAND" };
const WORK = { zh: "潮位警报", en: "TIDEMARK", film: "潮位警报重编版", mark: "初", caption: "TIDEMARK RECAST 1.0 FIRST TIDE" };

const NAV = [
  { id: "s-alert", zh: "警报", en: "ALERT" },
  { id: "s-reserve", zh: "蓄压", en: "RESERVE" },
  { id: "s-coupling", zh: "耦合", en: "COUPLING" },
  { id: "s-reports", zh: "报告", en: "REPORTS" },
  { id: "s-frames", zh: "闸甲", en: "FRAMES" },
];

// The report index: number, line one (one glyph), line two before and after the comma, a synopsis.
const REPORTS = [
  ["第壹报", "水", "位", "越线", "盆地东缘的水位第一次越过红线。值班闸手在三分钟内关上了十一道闸，第十二道没有回应。"],
  ["第弍报", "闸", "门", "不开", "十二号闸的电机完好，表决机却连续三次否决开闸。没有人知道第五席在顾虑什么。"],
  ["第叁报", "夜", "班", "无人", "交班记录上只剩一行字：“泵房的灯一直亮着”。巡检队在泵房里只找到一台还在运转的收音机。"],
  ["第肆报", "涌", "体", "上浮", "声呐第一次画出了涌体的轮廓：它比整座第九区还宽，正以每小时四米的速度上浮。"],
  ["第伍报", "蓄", "压", "见底", "外接电网被切断，闸甲只剩内蓄。倒计时从五分钟开始，没有人去看它。"],
  ["第陆报", "五", "席", "分歧", "四席可决，一席否决。规程写着需要全票，局长签下了例外。"],
  ["第柒报", "旧", "城", "沉没", "七十年前沉下去的旧城区出现在声呐上，街灯排列得整整齐齐。"],
  ["第捌报", "闸", "手", "归队", "停职半年的闸手回到第九区。她说自己只是来取回放在储物柜里的伞。"],
  ["第玖报", "耦", "合", "越限", "耦合率突破百分之九十。闸甲第一次在没有指令的情况下自己转过了身。"],
  ["第拾报", "雨", "季", "提前", "气象台把雨季提前了二十天。城里的人照常上班，只是都多带了一双鞋。"],
  ["第拾壹报", "泵", "房", "停电", "整座城黑了四十分钟。四十分钟里，闸手们用手摇泵把水位压回了线下。"],
  ["第拾弍报", "零", "号", "闸门", "地图上没有零号闸。档案室说它在城市建成之前就已经在那里了。"],
  ["第拾叁报", "声", "呐", "回波", "第五席要的声呐数据送到了。回波的形状像一扇门，从里面关着。"],
  ["第拾肆报", "旧", "约", "失效", "七十年前的排涝协定写着：零号闸只能从内侧打开。签字的人都已经不在了。"],
  ["第拾伍报", "渡", "船", "抛锚", "最后一班渡船在防波堤外抛了锚。船上的人说，水面下有整齐的街灯。"],
  ["第拾陆报", "席", "五", "陈述", "第五席第一次给出了完整的理由，只有一句话：门的那一边也有人在排水。"],
  ["第拾柒报", "城", "市", "上浮", "水位开始回落。不是因为闸，是因为整座城在慢慢上浮。"],
  ["第拾捌报", "潮", "位", "归零", "所有读数归零的那一刻，终端上只剩一行字：交班。"],
];

const ALERT = { title1: "第九排涝区", title2: "转入防潮战备", latin1: "TRANSFER OF DRAINAGE ZONE 9", latin2: "TO FLOOD COMBAT READINESS", stamp: "警报" };

const FRAMES = [
  { id: "frame-01", no: "壹", zh: "闸甲壹号", en: "SLUICE FRAME 01", task: "frame-01", height: "38.2 m", pump: "1,200 m³/s", th: "28.0 %", state: "待机", stateEn: "STANDBY" },
  { id: "frame-02", no: "弍", zh: "闸甲弍号", en: "SLUICE FRAME 02", task: "frame-02", height: "40.6 m", pump: "1,450 m³/s", th: "31.5 %", state: "出动", stateEn: "SORTIE" },
  { id: "frame-04", no: "肆", zh: "闸甲肆号", en: "SLUICE FRAME 04", task: "frame-04", height: "36.9 m", pump: "980 m³/s", th: "26.0 %", state: "封存", stateEn: "SEALED" },
];

const SECTORS = [
  ["E-01", "东缘一号闸", "常态", "NORMAL", 0.42],
  ["E-07", "东缘七号闸", "警戒", "CAUTION", 0.71],
  ["E-12", "东缘十二号闸", "越线", "BREACH", 0.96],
  ["S-03", "南堤三号闸", "常态", "NORMAL", 0.38],
  ["S-09", "南堤九号闸", "检修", "SERVICE", 0],
  ["W-02", "西港二号闸", "常态", "NORMAL", 0.33],
];

const LOG = [
  ["23:40:52", "SYS", "第九排涝区水位 +4.21 m，越过一级红线"],
  ["23:40:55", "SYS", "自动关闭东缘一至十一号闸：完成"],
  ["23:41:02", "ERR", "十二号闸无响应（电机正常，指令被表决否决）"],
  ["23:41:07", "OPS", "值班长申请五席表决：强制开启十二号闸"],
  ["23:41:09", "SYS", "表决中……第五席请求补充声呐数据"],
];

const SEATS = [
  ["席一", "SEAT 1", "可", "泵站余量足够"],
  ["席二", "SEAT 2", "可", "下游无居民区"],
  ["席三", "SEAT 3", "可", "水位仍在上涨"],
  ["席四", "SEAT 4", "可", "规程允许例外"],
  ["席五", "SEAT 5", "否", "声呐有未识别回波"],
];

const PILOTS = [
  { zh: "闸手 · 沈潮", en: "OPERATOR SHEN CHAO", ratio: "41.3", frame: "闸甲弍号" },
  { zh: "闸手 · 陆泊", en: "OPERATOR LU BO", ratio: "36.8", frame: "闸甲壹号" },
  { zh: "闸手 · 许汀", en: "OPERATOR XU TING", ratio: "28.4", frame: "闸甲肆号" },
];

module.exports = { ORG, WORK, NAV, REPORTS, ALERT, FRAMES, SECTORS, LOG, SEATS, PILOTS };
