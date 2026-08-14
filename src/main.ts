import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent } from "@minecraft/server";

console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");

// Map for Yosano affection state
const yosanoLoveMap = new Map<string, number>();

// Map for Baked Mochocho eat counter & timestamp per player
interface MochochoState {
  count: number;
  lastEatTime: number;
}
const mochochoEatMap = new Map<string, MochochoState>();

// Set of players who acquired driver's license
const licensedPlayers = new Set<string>();

// ----------------------------------------------------
// 1. Rare Mob Drops (entityDie event)
// ----------------------------------------------------
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;

  if (!deadEntity || !location) return;

  const typeId = deadEntity.typeId;

  // Custom entity drops
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
    const amount = Math.floor(Math.random() * 2) + 1; // 1-2 anko
    dimension.spawnItem(new ItemStack("mi:anko", amount), location);
    return;
  }

  // Vanilla mob drops
  let dropItemId: string | null = null;
  let chance = 0.15; // default 15%

  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") {
    dropItemId = "mi:blob_aichi";
  } else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") {
    dropItemId = "mi:machida";
  } else if (typeId === "minecraft:creeper") {
    dropItemId = "mi:silenthill";
  } else if (typeId === "minecraft:enderman") {
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
// 2. Interaction Events (Cat -> Blobcat / Woneko, Yosano -> Love, Car -> License)
// ----------------------------------------------------
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;

  if (!target) return;

  // Car ride (License acquisition)
  if (target.typeId === "mi:regretcar") {
    const playerId = player.id;
    if (!licensedPlayers.has(playerId)) {
      licensedPlayers.add(playerId);
      system.run(() => {
        const loc = target.location;
        player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1, z: loc.z });
        player.sendMessage("§e🚗 [Mi_Addon] 長い変な車に乗車し、運転免許を取得しました！§r");
      });
    }
  }

  if (!itemStack) return;

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

  // Cat + machida -> woneko
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:machida") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;

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

      // Remove cat and spawn woneko
      target.remove();
      dim.spawnEntity("mi:woneko", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("§a[Mi_Addon] 猫が をねこ (woneko) に進化しました！§r");
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
// 3. Item Complete Use (Baked Mochocho Overeat & Reset Logic)
// ----------------------------------------------------
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();

  // Baked Mochocho Logic (Limit: 5 per minute)
  if (itemStack.typeId === "mi:baked_mochocho") {
    let state = mochochoEatMap.get(playerId) || { count: 0, lastEatTime: now };
    
    // Auto reset if 60 seconds passed since last eat
    if (now - state.lastEatTime > 60000) {
      state.count = 0;
    }

    state.count += 1;
    state.lastEatTime = now;
    mochochoEatMap.set(playerId, state);

    if (state.count >= 5) {
      player.addEffect("nausea", 300, { amplifier: 1 }); // 15s nausea
      player.addEffect("hunger", 300, { amplifier: 1 });  // 15s hunger
      player.sendMessage("§c[Mi_Addon] ベイクドモチョチョを1分間に食べすぎて(5個)、強烈な吐き気と空腹におそわれた…！§r");
      mochochoEatMap.set(playerId, { count: 0, lastEatTime: now }); // Reset counter
    } else {
      player.sendMessage(`§a[Mi_Addon] ベイクドモチョチョを美味しく食べた！ (1分間の摂取数: ${state.count}/5)§r`);
    }
  }

  // Reset counter when drinking Milk Bucket
  if (itemStack.typeId === "minecraft:milk_bucket") {
    if (mochochoEatMap.has(playerId)) {
      mochochoEatMap.delete(playerId);
      player.sendMessage("§b[Mi_Addon] 牛乳を飲んで胃がすっきりした！（食べ過ぎカウントがリセットされました）§r");
    }
  }
});

// ----------------------------------------------------
// 4. Periodic Entity Loop (Woneko States & Traffic Jam on Regretcars)
// ----------------------------------------------------
system.runInterval(() => {
  const overworld = world.getDimension("overworld");

  // A. Woneko State & Blobcat Rival Effect Loop
  const wonekos = overworld.getEntities({ type: "mi:woneko" });
  const blobcats = overworld.getEntities({ type: "mi:blobcat" });

  for (const woneko of wonekos) {
    const loc = woneko.location;

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

  // B. Regretcar Traffic Jam Gimmick (3 or more cars nearby -> Traffic jam slowdown)
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  for (const car of cars) {
    const cLoc = car.location;
    let nearbyCarCount = 0;

    for (const otherCar of cars) {
      const oLoc = otherCar.location;
      const dSq = Math.pow(cLoc.x - oLoc.x, 2) + Math.pow(cLoc.y - oLoc.y, 2) + Math.pow(cLoc.z - oLoc.z, 2);
      if (dSq <= 144) { // within 12 blocks (12^2 = 144)
        nearbyCarCount++;
      }
    }

    // If 3 or more cars are crowded, trigger traffic jam
    if (nearbyCarCount >= 3) {
      car.addEffect("slowness", 30, { amplifier: 3, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
    }
  }
}, 20);

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
