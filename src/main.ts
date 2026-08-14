import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent } from "@minecraft/server";

console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");

// Map for Yosano affection state
const yosanoLoveMap = new Map<string, number>();

// ----------------------------------------------------
// 1. Rare Mob Drops (entityDie event)
// ----------------------------------------------------
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;

  if (!deadEntity || !location) return;

  const typeId = deadEntity.typeId;

  let dropItemId: string | null = null;
  let chance = 0.15; // default 15%

  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") {
    dropItemId = "mi:blob_aichi";
  } else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") {
    dropItemId = "mi:machida";
  } else if (typeId === "minecraft:creeper") {
    dropItemId = "mi:silenthill";
  } else if (typeId === "minecraft:enderman" || typeId === "mi:blebcat") {
    dropItemId = "mi:sanjuu";
    chance = 0.20;
  } else if (typeId === "minecraft:spider" || typeId === "minecraft:cave_spider") {
    dropItemId = "mi:gif";
    chance = 0.20;
  } else if (typeId === "minecraft:phantom") {
    dropItemId = "mi:bunchou";
    chance = 0.25;
  }

  if (dropItemId && Math.random() < chance) {
    dimension.spawnItem(new ItemStack(dropItemId, 1), location);
  }
});

// ----------------------------------------------------
// 2. Interaction Events (Cat -> Blobcat, Yosano -> Love)
// ----------------------------------------------------
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;

  if (!target || !itemStack) return;

  // Cat + blob_aichi -> blobcat
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:blob_aichi") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;

      // Consume 1 blob_aichi item
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) {
            equippable.setEquipment("Mainhand", undefined);
          }
        }
      }

      // Remove cat and spawn blobcat
      target.remove();
      dim.spawnEntity("mi:blobcat", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("§a[Mi_Addon] 猫が にゃんぷっぷー (blobcat) に進化しました！§r");
    });
  }

  // Yosano + machida -> Affection increase
  if (target.typeId === "mi:yosano" && itemStack.typeId === "mi:machida") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      const entityId = target.id;

      let loveLevel = (yosanoLoveMap.get(entityId) || 0) + 1;
      yosanoLoveMap.set(entityId, loveLevel);

      // Consume 1 machida item
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) {
            equippable.setEquipment("Mainhand", undefined);
          }
        }
      }

      dim.spawnParticle("minecraft:heart_particle", loc);

      if (loveLevel === 1) {
        player.sendMessage("§e与謝野晶子: 「あら…これが噂の『町田』ですの？ 素敵ですわ…！」§r");
      } else if (loveLevel === 2) {
        player.sendMessage("§e与謝野晶子: 「また町田をくださるなんて…私、あなたのことが好きになってしまいそう…§r");
      } else {
        // Max love level: 3
        player.sendMessage("§d与謝野晶子: 「あぁ！ 愛しています！ これをあなたに捧げますわ！」§r");
        
        // Give special item (Kanagawa)
        dim.spawnItem(new ItemStack("mi:kanagawa", 1), loc);
        dim.spawnItem(new ItemStack("minecraft:ender_pearl", 2), loc);

        // Ender pearl teleport effect & despawn
        dim.spawnParticle("minecraft:ender_chest_portal_particle", loc);
        player.sendMessage("§d与謝野晶子 はエンダーパールを投げていずこかへ消え去った…§r");
        
        yosanoLoveMap.delete(entityId);
        target.remove();
      }
    });
  }
});

// ----------------------------------------------------
// 3. Woneko State & Blobcat Rival Effect Loop (Every 1 sec)
// ----------------------------------------------------
system.runInterval(() => {
  const overworld = world.getDimension("overworld");

  // Query all woneko entities
  const wonekos = overworld.getEntities({ type: "mi:woneko" });
  const blobcats = overworld.getEntities({ type: "mi:blobcat" });

  for (const woneko of wonekos) {
    const loc = woneko.location;

    // A. Health-based Texture Variant update
    const healthComp = woneko.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
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

    // B. Blobcat Rival Proximity Check (Range <= 8 blocks)
    let isRivalNear = false;
    for (const blobcat of blobcats) {
      const bLoc = blobcat.location;
      const distSq = Math.pow(loc.x - bLoc.x, 2) + Math.pow(loc.y - bLoc.y, 2) + Math.pow(loc.z - bLoc.z, 2);
      if (distSq <= 64) { // 8 * 8 = 64
        isRivalNear = true;
        break;
      }
    }

    if (isRivalNear) {
      // Apply Strength II (+5 attack power) and Alert particle
      woneko.addEffect("strength", 40, { amplifier: 1, showParticles: true });
      overworld.spawnParticle("minecraft:villager_angry", { x: loc.x, y: loc.y + 1, z: loc.z });
    }
  }
}, 20);

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
