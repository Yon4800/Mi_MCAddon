// src/main.ts
import { world, system, ItemStack, EntityComponentTypes, Player } from "@minecraft/server";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var yosanoLoveMap = /* @__PURE__ */ new Map();
var mochochoEatMap = /* @__PURE__ */ new Map();
var licensedPlayers = /* @__PURE__ */ new Set();
var accidentCarsMap = /* @__PURE__ */ new Map();
var emojiMap = {
  ":blobcat:": "\uE101",
  ":woneko:": "\uE102",
  ":aichi:": "\uE103",
  ":blob_aichi:": "\uE103",
  ":mochocho:": "\uE104",
  ":baked_mochocho:": "\uE104",
  ":ota:": "\uE105",
  ":otaku_cry:": "\uE106",
  ":blebcat:": "\uE107",
  ":regretcar:": "\uE108",
  ":yosano:": "\uE109",
  ":tutinoko:": "\uE10A"
};
if (world.afterEvents?.chatSend) {
  world.afterEvents.chatSend.subscribe((event) => {
    const sender = event.sender;
    let message = event.message;
    let hasEmoji = false;
    for (const [key, glyph] of Object.entries(emojiMap)) {
      if (message.includes(key)) {
        message = message.split(key).join(glyph);
        hasEmoji = true;
      }
    }
    if (hasEmoji) {
      system.run(() => {
        world.sendMessage(`<${sender.name}> ${message}`);
      });
    }
  });
}
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;
  if (!deadEntity || !location)
    return;
  const typeId = deadEntity.typeId;
  if (typeId === "mi:blebcat") {
    if (Math.random() < 0.4) {
      dimension.spawnItem(new ItemStack("mi:ecology_server", 1), location);
    }
    if (Math.random() < 0.2) {
      dimension.spawnItem(new ItemStack("mi:sanjuu", 1), location);
    }
    return;
  }
  if (typeId === "mi:m_tutinoko") {
    const amount = Math.floor(Math.random() * 2) + 1;
    dimension.spawnItem(new ItemStack("mi:anko", amount), location);
    return;
  }
  let dropItemId = null;
  let chance = 0.15;
  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") {
    dropItemId = "mi:blob_aichi";
  } else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") {
    dropItemId = "mi:machida";
  } else if (typeId === "minecraft:creeper") {
    dropItemId = "mi:silenthill";
  } else if (typeId === "minecraft:enderman") {
    dropItemId = "mi:sanjuu";
    chance = 0.2;
  } else if (typeId === "minecraft:spider" || typeId === "minecraft:cave_spider") {
    dropItemId = "mi:gif";
    chance = 0.2;
  } else if (typeId === "minecraft:phantom") {
    dropItemId = "mi:bunchou";
    chance = 0.25;
  }
  if (dropItemId && Math.random() < chance) {
    dimension.spawnItem(new ItemStack(dropItemId, 1), location);
  }
});
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;
  if (!target)
    return;
  if (target.typeId === "mi:regretcar") {
    const playerId = player.id;
    if (!licensedPlayers.has(playerId)) {
      licensedPlayers.add(playerId);
      system.run(() => {
        const loc = target.location;
        player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1, z: loc.z });
        player.sendMessage("\xA7e\u{1F697} [Mi_Addon] \u9577\u3044\u5909\u306A\u8ECA\u306B\u4E57\u8ECA\u3057\u3001\u904B\u8EE2\u514D\u8A31\u3092\u53D6\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r");
      });
    }
  }
  if (!itemStack)
    return;
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:blob_aichi") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) {
            equippable.setEquipment("Mainhand", void 0);
          }
        }
      }
      target.remove();
      dim.spawnEntity("mi:blobcat", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("\xA7a[Mi_Addon] \u732B\u304C \u306B\u3083\u3093\u3077\u3063\u3077\u30FC (blobcat) \u306B\u9032\u5316\u3057\u307E\u3057\u305F\uFF01\xA7r");
    });
  }
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:silenthill") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) {
            equippable.setEquipment("Mainhand", void 0);
          }
        }
      }
      target.remove();
      dim.spawnEntity("mi:woneko", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("\xA7a[Mi_Addon] \u732B\u304C \u3092\u306D\u3053 (woneko) \u306B\u9032\u5316\u3057\u307E\u3057\u305F\uFF01\xA7r");
    });
  }
  if (target.typeId === "mi:yosano" && itemStack.typeId === "mi:machida") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      const entityId = target.id;
      let loveLevel = (yosanoLoveMap.get(entityId) || 0) + 1;
      yosanoLoveMap.set(entityId, loveLevel);
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) {
            equippable.setEquipment("Mainhand", void 0);
          }
        }
      }
      dim.spawnParticle("minecraft:heart_particle", loc);
      if (loveLevel === 1) {
        player.sendMessage("\xA7e\u4E0E\u8B1D\u91CE\u6676\u5B50: \u300C\u3042\u3089\u2026\u3053\u308C\u304C\u5642\u306E\u300E\u753A\u7530\u300F\u3067\u3059\u306E\uFF1F \u7D20\u6575\u3067\u3059\u308F\u2026\uFF01\u300D\xA7r");
      } else if (loveLevel === 2) {
        player.sendMessage("\xA7e\u4E0E\u8B1D\u91CE\u6676\u5B50: \u300C\u307E\u305F\u753A\u7530\u3092\u304F\u3060\u3055\u308B\u306A\u3093\u3066\u2026\u79C1\u3001\u3042\u306A\u305F\u306E\u3053\u3068\u304C\u597D\u304D\u306B\u306A\u3063\u3066\u3057\u307E\u3044\u305D\u3046\u2026\xA7r");
      } else {
        player.sendMessage("\xA7d\u4E0E\u8B1D\u91CE\u6676\u5B50: \u300C\u3042\u3041\uFF01 \u611B\u3057\u3066\u3044\u307E\u3059\uFF01 \u3053\u308C\u3092\u3042\u306A\u305F\u306B\u6367\u3052\u307E\u3059\u308F\uFF01\u300D\xA7r");
        dim.spawnItem(new ItemStack("mi:kanagawa", 1), loc);
        dim.spawnItem(new ItemStack("minecraft:ender_pearl", 2), loc);
        dim.spawnParticle("minecraft:ender_chest_portal_particle", loc);
        player.sendMessage("\xA7d\u4E0E\u8B1D\u91CE\u6676\u5B50 \u306F\u30A8\u30F3\u30C0\u30FC\u30D1\u30FC\u30EB\u3092\u6295\u3052\u3066\u3044\u305A\u3053\u304B\u3078\u6D88\u3048\u53BB\u3063\u305F\u2026\xA7r");
        yosanoLoveMap.delete(entityId);
        target.remove();
      }
    });
  }
});
world.afterEvents.entityHurt.subscribe((event) => {
  const hurtEntity = event.hurtEntity;
  const damageSource = event.damageSource;
  const attacker = damageSource.damagingEntity;
  if (hurtEntity.typeId === "mi:regretcar" && attacker instanceof Player) {
    const playerId = attacker.id;
    if (!licensedPlayers.has(playerId)) {
      hurtEntity.triggerEvent("mi:become_angry");
      const cLoc = hurtEntity.location;
      const pLoc = attacker.location;
      attacker.dimension.spawnParticle("minecraft:villager_angry", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
      attacker.dimension.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
      attacker.sendMessage("\xA7c\u{1F697}\u{1F4A8} [Mi_Addon] \u7121\u514D\u8A31\u3067\u8ECA\u3092\u653B\u6483\u3057\u305F\u305F\u3081\u3001\u9577\u3044\u5909\u306A\u8ECA\u304C\u6FC0\u6012\u3057\u3066\u4F53\u5F53\u305F\u308A\u3057\u3066\u304D\u305F\uFF01\xA7r");
      const dx = pLoc.x - cLoc.x;
      const dz = pLoc.z - cLoc.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      attacker.applyKnockback(dx / dist * 1.5, dz / dist * 1.5, 1.2, 0.4);
      attacker.applyDamage(4);
    }
  }
});
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();
  if (itemStack.typeId === "mi:baked_mochocho") {
    let state = mochochoEatMap.get(playerId) || { count: 0, lastEatTime: now };
    if (now - state.lastEatTime > 6e4) {
      state.count = 0;
    }
    state.count += 1;
    state.lastEatTime = now;
    mochochoEatMap.set(playerId, state);
    if (state.count >= 5) {
      player.addEffect("nausea", 300, { amplifier: 1 });
      player.addEffect("hunger", 300, { amplifier: 1 });
      player.sendMessage("\xA7c[Mi_Addon] \u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u30921\u5206\u9593\u306B\u98DF\u3079\u3059\u304E\u3066(5\u500B)\u3001\u5F37\u70C8\u306A\u5410\u304D\u6C17\u3068\u7A7A\u8179\u306B\u304A\u305D\u308F\u308C\u305F\u2026\uFF01\xA7r");
      mochochoEatMap.set(playerId, { count: 0, lastEatTime: now });
    } else {
      player.sendMessage(`\xA7a[Mi_Addon] \u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u3092\u7F8E\u5473\u3057\u304F\u98DF\u3079\u305F\uFF01 (1\u5206\u9593\u306E\u6442\u53D6\u6570: ${state.count}/5)\xA7r`);
    }
  }
  if (itemStack.typeId === "minecraft:milk_bucket") {
    if (mochochoEatMap.has(playerId)) {
      mochochoEatMap.delete(playerId);
      player.sendMessage("\xA7b[Mi_Addon] \u725B\u4E73\u3092\u98F2\u3093\u3067\u80C3\u304C\u3059\u3063\u304D\u308A\u3057\u305F\uFF01\uFF08\u98DF\u3079\u904E\u304E\u30AB\u30A6\u30F3\u30C8\u304C\u30EA\u30BB\u30C3\u30C8\u3055\u308C\u307E\u3057\u305F\uFF09\xA7r");
    }
  }
});
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  const now = Date.now();
  const wonekos = overworld.getEntities({ type: "mi:woneko" });
  const blobcats = overworld.getEntities({ type: "mi:blobcat" });
  for (const woneko of wonekos) {
    const loc = woneko.location;
    const healthComp = woneko.getComponent(EntityComponentTypes.Health);
    if (healthComp) {
      const currentHp = healthComp.currentValue;
      const maxHp = healthComp.effectiveMax;
      if (currentHp <= 4) {
        woneko.triggerEvent("mi:set_cry");
      } else if (currentHp < maxHp) {
        woneko.triggerEvent("mi:set_tired");
      } else {
        woneko.triggerEvent("mi:set_relax");
      }
    }
    let isRivalNear = false;
    for (const blobcat of blobcats) {
      const bLoc = blobcat.location;
      const distSq = Math.pow(loc.x - bLoc.x, 2) + Math.pow(loc.y - bLoc.y, 2) + Math.pow(loc.z - bLoc.z, 2);
      if (distSq <= 64) {
        isRivalNear = true;
        break;
      }
    }
    if (isRivalNear) {
      woneko.addEffect("strength", 40, { amplifier: 1, showParticles: true });
      overworld.spawnParticle("minecraft:villager_angry", { x: loc.x, y: loc.y + 1, z: loc.z });
    }
  }
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  const activeAccidentLocations = [];
  for (const car of cars) {
    const cLoc = car.location;
    const carId = car.id;
    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId);
      if (now < recoveryTime) {
        car.addEffect("slowness", 30, { amplifier: 255, showParticles: false });
        overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
        overworld.spawnParticle("minecraft:lava_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
        activeAccidentLocations.push(cLoc);
        continue;
      } else {
        accidentCarsMap.delete(carId);
        overworld.spawnParticle("minecraft:heart_particle", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
        const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("\xA7a\u{1F527}\u{1F697} [Mi_Addon] \u8ECA\u4E21\u306E\u5FDC\u6025\u4FEE\u7406\u304C\u5B8C\u4E86\u3057\u3001\u4E8B\u6545\u73FE\u5834\u304C\u5FA9\u65E7\u3057\u307E\u3057\u305F\uFF01\xA7r");
        }
      }
    }
    const rideable = car.getComponent("minecraft:rideable");
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    const isRidden = riders.length > 0 || overworld.getPlayers({ location: cLoc, maxDistance: 2.5 }).length > 0;
    if (isRidden) {
      const viewDir2 = car.getViewDirection();
      let hasWallHit = false;
      const testDistances = [1.8, 2.6, 3.4];
      const lateralOffsets = [-0.8, 0, 0.8];
      for (const dist of testDistances) {
        for (const lat of lateralOffsets) {
          const checkX = Math.floor(cLoc.x + viewDir2.x * dist - viewDir2.z * lat);
          const checkY = Math.floor(cLoc.y + 0.5);
          const checkZ = Math.floor(cLoc.z + viewDir2.z * dist + viewDir2.x * lat);
          try {
            const block = overworld.getBlock({ x: checkX, y: checkY, z: checkZ });
            if (block && !block.isAir && !block.isLiquid) {
              hasWallHit = true;
              break;
            }
          } catch (e) {
          }
        }
        if (hasWallHit)
          break;
      }
      if (hasWallHit) {
        accidentCarsMap.set(carId, now + 6e4);
        activeAccidentLocations.push(cLoc);
        try {
          car.applyKnockback(-viewDir2.x, -viewDir2.z, 0.6, 0.2);
        } catch (e) {
        }
        overworld.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
        overworld.spawnParticle("minecraft:huge_explosion_emitter", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
        const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("\xA7c\u{1F4A5}\u{1F697}\u3010\u4EA4\u901A\u4E8B\u6545\u767A\u751F\uFF01\u3011\u8ECA\u304C\u58C1\u306B\u6FC0\u7A81\u3057\u3066\u5927\u7834\u3057\u307E\u3057\u305F\uFF01 1\u5206\u9593 \u79FB\u52D5\u4E0D\u80FD\u306B\u306A\u308A\u307E\u3059\uFF01\xA7r");
        }
        continue;
      }
    }
    let isSlope = false;
    const viewDir = car.getViewDirection();
    const groundBlockCurrent = overworld.getBlock({ x: Math.floor(cLoc.x), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z) });
    const groundBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z + viewDir.z * 2) });
    const stepBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2), y: Math.floor(cLoc.y + 0.5), z: Math.floor(cLoc.z + viewDir.z * 2) });
    const currentTypeId = groundBlockCurrent?.typeId || "";
    const frontTypeId = groundBlockFront?.typeId || "";
    const stepTypeId = stepBlockFront?.typeId || "";
    if (currentTypeId.includes("slab") || currentTypeId.includes("stairs") || frontTypeId.includes("slab") || frontTypeId.includes("stairs") || stepBlockFront && !stepBlockFront.isAir && !stepBlockFront.isLiquid || groundBlockFront && groundBlockCurrent && groundBlockFront.typeId !== groundBlockCurrent.typeId) {
      isSlope = true;
    }
    let isNearAccident = false;
    for (const accLoc of activeAccidentLocations) {
      const distSq = Math.pow(cLoc.x - accLoc.x, 2) + Math.pow(cLoc.y - accLoc.y, 2) + Math.pow(cLoc.z - accLoc.z, 2);
      if (distSq <= 625) {
        isNearAccident = true;
        break;
      }
    }
    const nearbyEntities = overworld.getEntities({
      location: cLoc,
      maxDistance: 64,
      excludeTypes: ["minecraft:item"]
    });
    const nearbyCars = overworld.getEntities({
      location: cLoc,
      maxDistance: 64,
      type: "mi:regretcar"
    });
    const carJamThreshold = isSlope ? 4 : 10;
    const entityJamThreshold = isSlope ? 12 : 30;
    const isCongested = nearbyCars.length >= carJamThreshold || nearbyEntities.length >= entityJamThreshold;
    if (isNearAccident || isCongested) {
      car.addEffect("slowness", 10, { amplifier: 5, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
    } else if (isSlope) {
      car.addEffect("slowness", 10, { amplifier: 2, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
    }
  }
}, 5);
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
