import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { flipPenalties, setup } from "./setup.mjs";

class ModifierValue {
  constructor(value, inverted = false, scope = {}) {
    this.value = value;
    this.modifier = { inverted };
    Object.assign(this, scope);
  }
  get isNegative() { return this.modifier.inverted !== (this.value < 0); }
  clone() { return Object.assign(new ModifierValue(this.value), this); }
}

test("player penalties reverse without changing scopes, metadata, or shared originals", () => {
  const skill = {}, realm = {}, currency = {}, damageType = {}, action = {}, item = {};
  const penalty = new ModifierValue(-20, false, { skill, realm, currency, damageType, action, item });
  const benefit = new ModifierValue(15);
  const [bonus, retained] = flipPenalties([penalty, benefit]);
  assert.equal(bonus.value, 20);
  assert.equal(bonus.isNegative, false);
  for (const key of ["skill", "realm", "currency", "damageType", "action", "item", "modifier"]) {
    assert.equal(bonus[key], penalty[key]);
  }
  assert.notEqual(bonus, penalty);
  assert.equal(penalty.value, -20);
  assert.equal(retained, benefit);
});

test("positive cost and interval penalties become reductions while existing reductions remain", () => {
  const cost = new ModifierValue(20, true);
  const interval = new ModifierValue(-20, true);
  const values = flipPenalties([cost, interval]);
  assert.deepEqual(values.map(value => value.value), [-20, -20]);
  assert(values.every(value => !value.isNegative));
  assert.equal(values[1], interval);
});

test("enemy buffs reverse and existing enemy debuffs remain beneficial to the player", () => {
  const damageBuff = new ModifierValue(20);
  const resistanceDebuff = new ModifierValue(-5);
  const attackSpeedBuff = new ModifierValue(-10, true);
  const values = flipPenalties([damageBuff, resistanceDebuff, attackSpeedBuff], true);
  assert.deepEqual(values.map(value => value.value), [-20, -5, 10]);
  assert(values.every(value => value.isNegative));
  assert.equal(values[1], resistanceDebuff);
});

test("zero, absent modifiers, and repeated conversion leave values stable", () => {
  const zero = new ModifierValue(0, true);
  const negativeZero = new ModifierValue(-0);
  assert.equal(flipPenalties(undefined), undefined);
  assert.deepEqual(flipPenalties([]), []);
  assert.deepEqual(flipPenalties([zero, negativeZero]), [zero, negativeZero]);
  const converted = flipPenalties([new ModifierValue(-2.5), new ModifierValue(30, true)]);
  assert.deepEqual(flipPenalties(converted), converted);
  assert.deepEqual(converted.map(value => value.value), [2.5, -30]);
  assert.equal(Object.is(zero.value, 0), true);
  assert.equal(Object.is(negativeZero.value, -0), true);
});

function fixture(t) {
  const globals = ["BaseAgilityObject", "Agility"];
  const previous = globals.map(name => globalThis[name]);
  t.after(() => globals.forEach((name, index) => {
    if (previous[index] === undefined) delete globalThis[name];
    else globalThis[name] = previous[index];
  }));
  class BaseAgilityObject {
    constructor(modifiers, enemyModifiers) { this.modifiers = modifiers; this.enemyModifiers = enemyModifiers; }
    get hasNegativeModifiers() { return this.modifiers.some(value => value.isNegative); }
  }
  class Agility {
    constructor() { this.actions = { allObjects: [] }; this.pillars = { allObjects: [] }; }
    postDataRegistration() { this.registeredValues = this.actions.allObjects.map(object => object.modifiers.map(value => value.value)); }
  }
  Object.assign(globalThis, { BaseAgilityObject, Agility });
  const ctx = {
    patch(Class, name) {
      const descriptor = Object.getOwnPropertyDescriptor(Class.prototype, name);
      return {
        get(hook) { Object.defineProperty(Class.prototype, name, { configurable: true,
          get() { return hook.call(this, descriptor.get.bind(this)); },
        }); },
        before(hook) { Class.prototype[name] = function (...args) {
          hook.apply(this, args);
          return descriptor.value.apply(this, args);
        }; },
      };
    },
  };
  return { ctx, BaseAgilityObject, agility: new Agility() };
}

test("registration converts every course and pillar before native initialization", t => {
  const f = fixture(t);
  setup(f.ctx);
  const normal = new f.BaseAgilityObject([new ModifierValue(-20)]);
  const abyssal = new f.BaseAgilityObject([new ModifierValue(5, true)]);
  const pillar = new f.BaseAgilityObject([new ModifierValue(-3)], [new ModifierValue(8)]);
  f.agility.actions.allObjects.push(normal, abyssal);
  f.agility.pillars.allObjects.push(pillar);
  f.agility.postDataRegistration();
  assert.deepEqual(f.agility.registeredValues, [[20], [-5]]);
  assert.equal(pillar.modifiers[0].value, 3);
  assert.equal(pillar.enemyModifiers[0].value, -8);
  f.agility.postDataRegistration();
  assert.deepEqual(f.agility.registeredValues, [[20], [-5]]);
});

test("original negative-obstacle perk eligibility survives without affecting unrelated objects", t => {
  const f = fixture(t);
  const penalty = new f.BaseAgilityObject([new ModifierValue(-20)]);
  const beneficial = new f.BaseAgilityObject([new ModifierValue(5)]);
  const unrelated = new f.BaseAgilityObject([new ModifierValue(-7)]);
  f.agility.actions.allObjects.push(penalty, beneficial);
  setup(f.ctx);
  f.agility.postDataRegistration();
  assert.equal(penalty.modifiers[0].isNegative, false);
  assert.equal(penalty.hasNegativeModifiers, true);
  assert.equal(beneficial.hasNegativeModifiers, false);
  assert.equal(unrelated.modifiers[0].value, -7);
  assert.equal(unrelated.hasNegativeModifiers, true);
});

test("base-game Agility works without Abyssal content or expansion globals", t => {
  const f = fixture(t);
  const obstacle = new f.BaseAgilityObject([new ModifierValue(-20)]);
  f.agility.actions.allObjects.push(obstacle);
  setup(f.ctx);
  assert.doesNotThrow(() => f.agility.postDataRegistration());
  assert.equal(obstacle.modifiers[0].value, 20);
  assert.deepEqual(f.agility.pillars.allObjects, []);
  assert.equal(obstacle.enemyModifiers, undefined);
});

test("the runtime module loads from a standalone URL used by Melvor", async t => {
  const source = await readFile(new URL("./setup.mjs", import.meta.url));
  const runtime = await import(`data:text/javascript;base64,${source.toString("base64")}`);
  const f = fixture(t);
  assert.doesNotThrow(() => runtime.setup(f.ctx));
});
