// src/main.ts
import { world, system, ItemStack, EntityComponentTypes } from "@minecraft/server";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var yosanoLoveMap = /* @__PURE__ */ new Map();
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;
  if (!deadEntity || !location)
    return;
  const typeId = deadEntity.typeId;
  let dropItemId = null;
  let chance = 0.15;
  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") {
    dropItemId = "mi:blob_aichi";
  } else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") {
    dropItemId = "mi:machida";
  } else if (typeId === "minecraft:creeper") {
    dropItemId = "mi:silenthill";
  } else if (typeId === "minecraft:enderman" || typeId === "mi:blebcat") {
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
  if (!target || !itemStack)
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
}, 20);
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
