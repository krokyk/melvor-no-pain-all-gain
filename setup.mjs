export function flipPenalties(values, enemy = false) {
  return values?.map(value => {
    if (value.value === 0 || value.isNegative === enemy) return value;
    const bonus = value.clone();
    bonus.value = -bonus.value;
    return bonus;
  });
}

export function setup(ctx) {
  const negativeObstacles = new WeakSet();
  // Keep XP and currency perks that require an originally negative obstacle.
  ctx.patch(BaseAgilityObject, "hasNegativeModifiers").get(function (original) {
    return negativeObstacles.has(this) || original();
  });
  ctx.patch(Agility, "postDataRegistration").before(function () {
    for (const object of [...this.actions.allObjects, ...this.pillars.allObjects]) {
      if (object.hasNegativeModifiers) negativeObstacles.add(object);
      object.modifiers = flipPenalties(object.modifiers);
      object.enemyModifiers = flipPenalties(object.enemyModifiers, true);
    }
  });
}
