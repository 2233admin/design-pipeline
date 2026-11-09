"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { fail } = require("./contract-utils.cjs");

// 声明式转换表：每台机器 {from: [to...]}，由 assertTransition 在写状态前断言。
// 机器在模块加载时登记，tests/state-machine-tables.test.cjs 遍历全部登记项检查可达与悬空。
const MACHINES = new Map();

function defineMachine(name, { initial, transitions }) {
  if (MACHINES.has(name)) fail("state-machine", `machine ${name} is already defined`);
  const machine = Object.freeze({
    name,
    initial: Object.freeze([...initial]),
    transitions: Object.freeze(Object.fromEntries(Object.entries(transitions).map(([from, to]) => [from, Object.freeze([...to])]))),
  });
  MACHINES.set(name, machine);
  return machine;
}

function legalNext(machine, from) {
  return machine.transitions[from] || [];
}

function assertTransition(machine, from, to, scope = machine.name) {
  if (!Object.hasOwn(machine.transitions, from)) {
    fail(scope, `${machine.name} is in unknown state ${from}; known states: ${Object.keys(machine.transitions).join(", ")}`, { code: "ILLEGAL_TRANSITION", machine: machine.name, from, to });
  }
  const next = legalNext(machine, from);
  if (!next.includes(to)) {
    fail(scope, `${machine.name} cannot move ${from} -> ${to}; current state ${from}, legal next: ${next.length ? next.join(", ") : "(terminal)"}`, { code: "ILLEGAL_TRANSITION", machine: machine.name, from, to, legalNext: next });
  }
}

// 断言后写入 record.status，旧值不合法时抛 ILLEGAL_TRANSITION。
function moveStatus(machine, record, to, scope) {
  assertTransition(machine, record.status, to, scope);
  record.status = to;
}

// 初始进入某状态（record 尚无 status）：必须在 initial 内。
function assertInitial(machine, state, scope = machine.name) {
  if (!machine.initial.includes(state)) {
    fail(scope, `${machine.name} cannot start in ${state}; legal initial: ${machine.initial.join(", ")}`, { code: "ILLEGAL_TRANSITION", machine: machine.name, to: state });
  }
}

// 返回 {unreachable, dangling}：自 initial 不可达的状态；被转换指向却没有声明的状态。
function analyzeMachine(machine) {
  const declared = new Set(Object.keys(machine.transitions));
  const seen = new Set();
  const queue = [...machine.initial];
  while (queue.length) {
    const state = queue.shift();
    if (seen.has(state)) continue;
    seen.add(state);
    for (const next of machine.transitions[state] || []) queue.push(next);
  }
  const dangling = new Set();
  for (const targets of Object.values(machine.transitions)) for (const target of targets) if (!declared.has(target)) dangling.add(target);
  for (const state of machine.initial) if (!declared.has(state)) dangling.add(state);
  return { unreachable: [...declared].filter((state) => !seen.has(state)), dangling: [...dangling] };
}

function allMachines() {
  return [...MACHINES.values()];
}

// 两步提交的暂存文件用随机后缀；崩溃残留靠前缀扫描恢复，而不是靠 PID 撞名。
function transactionSuffix() {
  return crypto.randomBytes(6).toString("hex");
}

function listResidue(target, kind) {
  const parent = path.dirname(target);
  const prefix = `${path.basename(target)}.${kind}-`;
  if (!fs.existsSync(parent)) return [];
  return fs.readdirSync(parent).filter((name) => name.startsWith(prefix)).sort().map((name) => path.join(parent, name));
}

module.exports = { allMachines, analyzeMachine, assertInitial, assertTransition, defineMachine, legalNext, listResidue, moveStatus, transactionSuffix };
