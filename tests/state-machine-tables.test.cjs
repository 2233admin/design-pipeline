"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

// 加载所有声明了转换表的模块，让它们登记机器。
require("../skill/scripts/adaptation-core.cjs");
require("../skill/scripts/pipeline-state-core.cjs");
require("../skill/scripts/designmd-core.cjs");
const { allMachines, analyzeMachine, assertInitial, assertTransition, moveStatus } = require("../skill/scripts/state-machine-core.cjs");

const EXPECTED = ["adaptation.candidate", "adaptation.promotion", "designmd.publish", "pipeline-state.commit"];

test("every state machine that owns a lifecycle declares a transition table", () => {
  const names = allMachines().map((machine) => machine.name).sort();
  for (const name of EXPECTED) assert.ok(names.includes(name), `machine ${name} is no longer declared`);
});

test("every declared state is reachable from an initial state and no transition dangles", () => {
  for (const machine of allMachines()) {
    const { unreachable, dangling } = analyzeMachine(machine);
    assert.deepEqual(unreachable, [], `${machine.name}: unreachable states`);
    assert.deepEqual(dangling, [], `${machine.name}: transitions to undeclared states`);
    assert.ok(machine.initial.length > 0, `${machine.name}: no initial state`);
  }
});

test("illegal transitions are rejected with the current state and the legal next states", () => {
  for (const machine of allMachines()) {
    for (const [from, targets] of Object.entries(machine.transitions)) {
      for (const to of Object.keys(machine.transitions)) {
        if (targets.includes(to)) {
          assert.doesNotThrow(() => assertTransition(machine, from, to), `${machine.name} ${from}->${to}`);
        } else {
          assert.throws(() => assertTransition(machine, from, to), (error) => {
            assert.equal(error.code, "ILLEGAL_TRANSITION");
            assert.ok(error.message.includes(`current state ${from}`), error.message);
            assert.ok(error.message.includes("legal next:"), error.message);
            return true;
          }, `${machine.name} ${from}->${to}`);
        }
      }
    }
    assert.throws(() => assertTransition(machine, "no-such-state", machine.initial[0]), /unknown state no-such-state/);
    assert.throws(() => assertInitial(machine, "no-such-state"), /legal initial/);
  }
});

test("moveStatus leaves the record untouched when the transition is illegal", () => {
  const candidate = allMachines().find((machine) => machine.name === "adaptation.candidate");
  const record = { status: "rejected" };
  assert.throws(() => moveStatus(candidate, record, "promoted"), /terminal/);
  assert.equal(record.status, "rejected");
  moveStatus(candidate, { status: "evaluated" }, "promoted");
});
