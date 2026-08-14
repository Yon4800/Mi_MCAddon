// src/main.ts
import { world, system, ItemStack, EntityComponentTypes } from "@minecraft/server";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var yosanoLoveMap = /* @__PURE__ */ new Map();
var mochochoEatMap = /* @__PURE__ */ new Map();
var licensedPlayers = /* @__PURE__ */ new Set();
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
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:machida") {
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
  for (const car of cars) {
    const cLoc = car.location;
    let nearbyCarCount = 0;
    for (const otherCar of cars) {
      const oLoc = otherCar.location;
      const dSq = Math.pow(cLoc.x - oLoc.x, 2) + Math.pow(cLoc.y - oLoc.y, 2) + Math.pow(cLoc.z - oLoc.z, 2);
      if (dSq <= 144) {
        nearbyCarCount++;
      }
    }
    if (nearbyCarCount >= 3) {
      car.addEffect("slowness", 30, { amplifier: 3, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
    }
  }
}, 20);
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
