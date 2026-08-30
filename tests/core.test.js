const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const logic = script.slice(0, script.indexOf("/** ---------- UI/状态 ---------- **/"));
const context = vm.createContext({ console, Math });
vm.runInContext(logic, context);

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

test("fraction helpers normalize decimal denominators", () => {
  assert.deepEqual(json(context.parseFraction("1/10.5")), { n: 2, d: 21, g: 1 });
  assert.equal(context.fracEqual(context.parseFraction("1/10.5"), context.parseFraction("2/21")), true);
});

test("random percentage questions always carry a usable fraction answer", () => {
  for (let i = 0; i < 500; i += 1) {
    const q = context.genRandomPercentQuestion();
    assert.ok(q.ansFrac && Number.isInteger(q.ansFrac.n) && Number.isInteger(q.ansFrac.d));
    assert.ok(q.displayFrac);
  }
});

test("random fraction questions always carry a display percentage", () => {
  for (let i = 0; i < 500; i += 1) {
    const q = context.genRandomFracQuestion();
    assert.match(q.ansP, /^\d+(?:\.\d)?%$/);
  }
});

test("power banks cover the requested ranges", () => {
  const banks = vm.runInContext("POWER_BANKS", context);
  assert.equal(banks.squares.max, 30);
  assert.equal(banks.cubes.max, 16);
  assert.equal(banks.fourthPowers.max, 12);
});

test("generated fourth powers and large multiplication answers are correct", () => {
  for (let i = 0; i < 500; i += 1) {
    const power = context.pickPowerQuestion("fourthPowers", "forward");
    assert.equal(Number(power.answer), Number(power.prompt) ** 4);

    const multiplication = context.pickMultiplicationQuestion();
    assert.ok(multiplication.a >= 1 && multiplication.a <= 19);
    assert.ok(multiplication.b >= 1 && multiplication.b <= 19);
    assert.equal(Number(multiplication.answer), multiplication.a * multiplication.b);
  }
});

test("page includes strict integer validation and locks answered questions", () => {
  assert.match(script, /!\/\^\\d\+\$\/\.test\(v\)/);
  assert.match(script, /if \(state\.answered\)/);
  assert.match(script, /setTimeout\(newQuestion, 850\)/);
});

test("support entry is optional and does not contain payment secrets", () => {
  assert.match(html, /id="supportBtn"/);
  assert.match(html, /支持。支持不会影响任何功能/);
  assert.doesNotMatch(html, /(private[_-]?key|client[_-]?secret|支付密码)/i);
  assert.ok(fs.existsSync("assets-alipay.jpg"));
});
