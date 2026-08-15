import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent, EntityEquippableComponent, Player } from "@minecraft/server";

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

// Map for accident cars: carId -> recovery timestamp (ms)
const accidentCarsMap = new Map<string, number>();

// Map for previous positions of regretcars: carId -> position
const carPrevPosMap = new Map<string, { x: number, y: number, z: number }>();

type AchievementKey = "suimin" | "suibunhokyu" | "aisatu" | "asakatsu" | "chokin" | "dokusho" | "josetsu" | "kaimono" | "seichi" | "upgrade" | "shokuji";

const achievementItems: Record<AchievementKey, { itemId: string, displayName: string }> = {
  suimin: { itemId: "mi:suimin_ha_igyo", displayName: "睡眠の偉業" },
  suibunhokyu: { itemId: "mi:suibunhokyu_ha_igyo", displayName: "水分補給の偉業" },
  aisatu: { itemId: "mi:aisatu_ha_igyo", displayName: "挨拶の偉業" },
  asakatsu: { itemId: "mi:asakatsu_ha_igyo", displayName: "朝活の偉業" },
  chokin: { itemId: "mi:chokin_ha_igyo", displayName: "貯金の偉業" },
  dokusho: { itemId: "mi:dokusho_ha_igyo", displayName: "読書の偉業" },
  josetsu: { itemId: "mi:josetsu_ha_igyo", displayName: "除雪の偉業" },
  kaimono: { itemId: "mi:kaimono_ha_igyo", displayName: "買い物の偉業" },
  seichi: { itemId: "mi:seichi_ha_igyo", displayName: "整地の偉業" },
  upgrade: { itemId: "mi:upgrade_ha_igyo", displayName: "アップグレードの偉業" },
  shokuji: { itemId: "mi:shokuji_ha_igyo", displayName: "食事の偉業" }
};

let achievementScanTick = 0;

function getAchievementCounter(player: Player, key: string): number {
  const value = player.getDynamicProperty(`mi:achievement_${key}`);
  return typeof value === "number" ? value : 0;
}

function addAchievementCounter(player: Player, key: string, amount = 1): number {
  const nextValue = getAchievementCounter(player, key) + amount;
  player.setDynamicProperty(`mi:achievement_${key}`, nextValue);
  return nextValue;
}

function addPlayerItem(player: Player, itemId: string): void {
  const inventory = player.getComponent("minecraft:inventory") as any;
  inventory?.container?.addItem(new ItemStack(itemId, 1));
}

function grantAchievement(player: Player, key: AchievementKey): void {
  const tag = `mi:achievement_${key}`;
  if (player.hasTag(tag)) return;

  player.addTag(tag);
  addPlayerItem(player, achievementItems[key].itemId);
  if (!player.hasTag("mi:achievement_first")) {
    player.addTag("mi:achievement_first");
    addPlayerItem(player, "mi:igyo");
  }
  player.sendMessage(`§6[Mi_Addon] ${achievementItems[key].displayName}を獲得しました！§r`);
}

function checkAchievementCounters(player: Player): void {
  if (getAchievementCounter(player, "josetsu") >= 500) grantAchievement(player, "josetsu");
  if (getAchievementCounter(player, "seichi") >= 1000) grantAchievement(player, "seichi");
  if (getAchievementCounter(player, "shokuji") >= 500) grantAchievement(player, "shokuji");
}

function playerHasItem(player: Player, itemIds: string[]): boolean {
  const inventory = player.getComponent("minecraft:inventory") as any;
  return containerHasItem(inventory?.container, itemIds);
}

function containerHasItem(container: any, itemIds: string[]): boolean {
  if (!container) return false;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && itemIds.includes(item.typeId)) return true;
  }
  return false;
}

function removeOneItemFromContainer(container: any, itemId: string): boolean {
  if (!container) return false;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (!item || item.typeId !== itemId) continue;
    if (item.amount > 1) {
      item.amount -= 1;
      container.setItem(slot, item);
    } else {
      container.setItem(slot, undefined);
    }
    return true;
  }
  return false;
}

function removeOneItem(player: Player, itemId: string): boolean {
  const inventory = player.getComponent("minecraft:inventory") as any;
  return removeOneItemFromContainer(inventory?.container, itemId);
}

function checkInventoryAchievements(player: Player): void {
  if (playerHasItem(player, ["minecraft:gold_ingot", "minecraft:gold_nugget", "minecraft:raw_gold", "minecraft:gold_block"])) {
    grantAchievement(player, "chokin");
  }
  if (playerHasItem(player, ["minecraft:netherite_pickaxe", "minecraft:netherite_axe", "minecraft:netherite_shovel", "minecraft:netherite_hoe", "minecraft:netherite_sword"])) {
    grantAchievement(player, "upgrade");
  }
}

function damageMiToolOnBlockBreak(player: Player): void {
  if ((player as any).gameMode === "creative") return;

  const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
  const mainhand = equippable?.getEquipment("Mainhand" as any);
  if (!mainhand || !["mi:ota", "mi:otaku_cry", "mi:igyo_tool"].includes(mainhand.typeId)) return;

  const durability = mainhand.getComponent("minecraft:durability") as any;
  if (!durability) return;

  const enchantable = mainhand.getComponent("minecraft:enchantable") as any;
  const unbreaking = enchantable?.getEnchantment("unbreaking");
  const unbreakingLevel = Math.max(0, Math.min(3, unbreaking?.level || 0));
  const damageChance = durability.getDamageChance(unbreakingLevel);
  if (Math.random() * 100 >= damageChance) return;

  durability.damage += 1;
  if (durability.damage >= durability.maxDurability) {
    equippable.setEquipment("Mainhand" as any, undefined);
    player.sendMessage("§c[Mi_Addon] ツールの耐久値が尽きました。§r");
  } else {
    equippable.setEquipment("Mainhand" as any, mainhand);
  }
}

function updateIgyoToolOwnership(player: Player): void {
  const ownsTool = player.hasTag("mi:igyo_tool_owned");
  const hasTool = playerHasItem(player, ["mi:igyo_tool"]);
  if (ownsTool && !hasTool) player.removeTag("mi:igyo_tool_owned");
}

// ----------------------------------------------------
// 0. Misskey Emoji Chat System (chatSend event)
// ----------------------------------------------------
const emojiMap: Record<string, string> = {
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
  ":tutinoko:": "\uE10A",
  ":tinfoil:": "\uE10B"
};

if ((world.afterEvents as any)?.chatSend) {
  (world.afterEvents as any).chatSend.subscribe((event: any) => {
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

    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー)$/i.test(event.message.trim())) {
      grantAchievement(sender, "aisatu");
    }
  });
}

// ----------------------------------------------------
// 0.5. Achievement Actions
// ----------------------------------------------------
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  const blockId = event.brokenBlockPermutation.type.id;

  damageMiToolOnBlockBreak(player);

  if (blockId.includes("snow")) addAchievementCounter(player, "josetsu");
  if (["minecraft:dirt", "minecraft:grass", "minecraft:grass_block"].includes(blockId)) addAchievementCounter(player, "seichi");
  checkAchievementCounters(player);
});

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const blockId = event.block.typeId;

  if (blockId === "minecraft:chest") {
    const requiredItems = Object.values(achievementItems).map((achievement) => achievement.itemId);
    const chestInventory = event.block.getComponent("minecraft:inventory") as any;
    const chestContainer = chestInventory?.container;
    if (!event.player.hasTag("mi:igyo_tool_owned") && requiredItems.every((itemId) => containerHasItem(chestContainer, [itemId]))) {
      system.run(() => {
        for (const itemId of requiredItems) removeOneItemFromContainer(chestContainer, itemId);
        addPlayerItem(event.player, "mi:igyo_tool");
        event.player.addTag("mi:igyo_tool_owned");
        event.player.sendMessage("§6[Mi_Addon] すべての偉業をチェストに納め、偉業のツールを手に入れました！§r");
      });
    }
  }

  if (blockId.endsWith("_bed")) {
    grantAchievement(event.player, "suimin");
  }
});

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemId = event.itemStack.typeId;

  if (itemId === "minecraft:water_bucket" || itemId === "minecraft:potion") {
    grantAchievement(player, "suibunhokyu");
  }
  if (["minecraft:book", "minecraft:writable_book", "minecraft:written_book"].includes(itemId)) {
    grantAchievement(player, "dokusho");
  }
});

const playerTradeEvent = (world.afterEvents as any).playerTrade;
if (playerTradeEvent) {
  playerTradeEvent.subscribe((event: any) => grantAchievement(event.player, "kaimono"));
}

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
// 1.5. Tin Foil Block Jamming (Prevent All Monster Spawns on Tin Foil Block)
// ----------------------------------------------------
world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (!entity || !entity.isValid()) return;

  const typeId = entity.typeId;
  const isMonster = typeId.startsWith("minecraft:zombie") ||
    typeId.startsWith("minecraft:skeleton") ||
    typeId === "minecraft:creeper" ||
    typeId === "minecraft:spider" ||
    typeId === "minecraft:cave_spider" ||
    typeId === "minecraft:enderman" ||
    typeId === "minecraft:witch" ||
    typeId === "minecraft:slime" ||
    typeId === "minecraft:phantom" ||
    typeId === "minecraft:drowned" ||
    typeId === "minecraft:husk" ||
    typeId === "minecraft:stray" ||
    typeId === "mi:blebcat";

  if (!isMonster) return;

  const loc = entity.location;
  const dim = entity.dimension;

  // Check blocks directly below the spawn position
  for (let dy = -1; dy >= -3; dy--) {
    try {
      const block = dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y + dy), z: Math.floor(loc.z) });
      if (block && block.typeId === "mi:tin_foil_block") {
        system.run(() => {
          dim.spawnParticle("minecraft:electric_spark_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          dim.spawnParticle("minecraft:smoke_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          if (entity.isValid()) {
            entity.remove();
          }
        });
        break;
      }
    } catch (e) { }
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

  // Dying regretcar with dye while preserving original texture
  if (target.typeId === "mi:regretcar" && itemStack) {
    const dyeColorEventMap: Record<string, { event: string; colorName: string }> = {
      "minecraft:white_dye": { event: "mi:set_variant_0", colorName: "白" },
      "minecraft:orange_dye": { event: "mi:set_variant_1", colorName: "オレンジ" },
      "minecraft:magenta_dye": { event: "mi:set_variant_2", colorName: "マゼンタ" },
      "minecraft:light_blue_dye": { event: "mi:set_variant_3", colorName: "ライトブルー" },
      "minecraft:yellow_dye": { event: "mi:set_variant_4", colorName: "黄色" },
      "minecraft:lime_dye": { event: "mi:set_variant_5", colorName: "ライム" },
      "minecraft:pink_dye": { event: "mi:set_variant_6", colorName: "ピンク" },
      "minecraft:gray_dye": { event: "mi:set_variant_7", colorName: "灰色" },
      "minecraft:light_gray_dye": { event: "mi:set_variant_8", colorName: "ライトグレー" },
      "minecraft:cyan_dye": { event: "mi:set_variant_9", colorName: "シアン" },
      "minecraft:purple_dye": { event: "mi:set_variant_10", colorName: "紫" },
      "minecraft:blue_dye": { event: "mi:set_variant_11", colorName: "青" },
      "minecraft:brown_dye": { event: "mi:set_variant_12", colorName: "茶色" },
      "minecraft:green_dye": { event: "mi:set_variant_13", colorName: "緑" },
      "minecraft:red_dye": { event: "mi:set_variant_14", colorName: "赤" },
      "minecraft:black_dye": { event: "mi:set_variant_15", colorName: "黒" }
    };

    const colorInfo = dyeColorEventMap[itemStack.typeId];
    if (colorInfo) {
      system.run(() => {
        if (player.gameMode !== "creative") {
          if (itemStack.amount > 1) {
            itemStack.amount -= 1;
          } else {
            const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
            if (equippable) {
              equippable.setEquipment("Mainhand" as any, undefined);
            }
          }
        }

        target.triggerEvent(colorInfo.event);
        player.sendMessage(`§d[Mi_Addon] 長い変な車の色を${colorInfo.colorName}に染めました。§r`);
      });
      return;
    }
  }

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
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) {
            equippable.setEquipment("Mainhand" as any, undefined);
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

  // Cat + silenthill -> woneko
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:silenthill") {
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;

      // Consume 1 silenthill item
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) {
            equippable.setEquipment("Mainhand" as any, undefined);
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
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) {
            equippable.setEquipment("Mainhand" as any, undefined);
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
// 3. Entity Hurt Event (Unlicensed Player Attacks Regretcar -> Retaliate/Ram)
// ----------------------------------------------------
world.afterEvents.entityHurt.subscribe((event) => {
  const hurtEntity = event.hurtEntity;
  const damageSource = event.damageSource;
  const attacker = damageSource.damagingEntity;

  if (hurtEntity.typeId === "mi:regretcar" && attacker instanceof Player) {
    const playerId = attacker.id;

    // Check if player does not have a license
    if (!licensedPlayers.has(playerId)) {
      hurtEntity.triggerEvent("mi:become_angry");
      const cLoc = hurtEntity.location;
      const pLoc = attacker.location;

      attacker.dimension.spawnParticle("minecraft:villager_angry", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
      attacker.dimension.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
      attacker.sendMessage("§c🚗💨 [Mi_Addon] 無免許で車を攻撃したため、長い変な車が激怒して体当たりしてきた！§r");

      // Ramming impact / knockback
      const dx = pLoc.x - cLoc.x;
      const dz = pLoc.z - cLoc.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      attacker.applyKnockback((dx / dist) * 1.5, (dz / dist) * 1.5, 1.2, 0.4);
      attacker.applyDamage(4);
    }
  }
});

// ----------------------------------------------------
// 4. Item Complete Use (Baked Mochocho Overeat & Reset Logic)
// ----------------------------------------------------
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();

  if ((itemStack as any).getComponent?.("minecraft:food")) {
    addAchievementCounter(player, "shokuji");
    checkAchievementCounters(player);
  }

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

    // Check if wearing Tin Foil Hat (immunity to nausea)
    const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    const headItem = equippable?.getEquipment("Head" as any);
    const isWearingTinFoil = headItem?.typeId === "mi:tin_foil_hat";

    if (state.count >= 5) {
      if (isWearingTinFoil) {
        player.sendMessage("§b🛡️ [Mi_Addon] ベイクドモチョチョを食べすぎたが、アルミホイルが吐き気電波を完全遮断した！§r");
      } else {
        player.addEffect("nausea", 300, { amplifier: 1 }); // 15s nausea
        player.addEffect("hunger", 300, { amplifier: 1 });  // 15s hunger
        player.sendMessage("§c[Mi_Addon] ベイクドモチョチョを1分間に食べすぎて(5個)、強烈な吐き気と空腹におそわれた…！§r");
      }
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
// 5. Periodic Entity Loop (Tin Foil Hat, Woneko, Car Accidents & Jams)
// ----------------------------------------------------
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  const now = Date.now();
  achievementScanTick += 1;

  // A. Tin Foil Hat Mental Protection & Wave Detection Loop
  const players = overworld.getPlayers();
  for (const p of players) {
    if (achievementScanTick >= 20) {
      updateIgyoToolOwnership(p);
      checkInventoryAchievements(p);

      const hour = new Date().getHours();
      if (hour >= 6 && hour < 9) {
        const seconds = addAchievementCounter(p, "asakatsu_seconds", 5);
        if (seconds >= 1800) grantAchievement(p, "asakatsu");
      } else {
        p.setDynamicProperty("mi:achievement_asakatsu_seconds", 0);
      }
    }
    const equippable = p.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    const headItem = equippable?.getEquipment("Head" as any);
    if (headItem?.typeId === "mi:tin_foil_hat") {
      const pLoc = p.location;

      // 1. Remove mental debuffs instantly
      const debuffs = ["darkness", "blindness", "nausea", "bad_omen"];
      for (const debuff of debuffs) {
        if (p.getEffect(debuff as any)) {
          p.removeEffect(debuff as any);
          p.sendMessage("§b🛡️ [Mi_Addon] 陰謀論者のアルミホイルが怪電波・思考攻撃を反射・無効化した！§r");
        }
      }

      // 2. 5G / Monster Thought-Wave Radar Detection
      const nearbyMonsters = overworld.getEntities({
        location: pLoc,
        maxDistance: 16,
        families: ["monster", "blebcat"]
      });

      if (nearbyMonsters.length > 0) {
        overworld.spawnParticle("minecraft:electric_spark_particle", { x: pLoc.x, y: pLoc.y + 1.8, z: pLoc.z });
      }
    }
  }
  if (achievementScanTick >= 20) achievementScanTick = 0;

  // B. Woneko State & Blobcat Rival Effect Loop
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

  // C. Regretcar Wall Crash (Accident), Slopes & Traffic Jam Gimmick
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  const activeAccidentLocations: { x: number, y: number, z: number }[] = [];

  for (const car of cars) {
    const cLoc = car.location;
    const carId = car.id;

    // 1. Check if car is currently in an accident
    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId)!;
      if (now < recoveryTime) {
        // Immobilize completely (1 minute)
        car.addEffect("slowness", 30, { amplifier: 255, showParticles: false });
        overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
        overworld.spawnParticle("minecraft:lava_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
        activeAccidentLocations.push(cLoc);
        continue;
      } else {
        // Accident recovery after 1 minute
        accidentCarsMap.delete(carId);
        overworld.spawnParticle("minecraft:heart_particle", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
        const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("§a🔧🚗 [Mi_Addon] 車両の応急修理が完了し、事故現場が復旧しました！§r");
        }
      }
    }

    // 2. Detect Wall Collision (Crash into solid block while ridden)
    const rideable = car.getComponent("minecraft:rideable") as any;
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    const isRidden = riders.length > 0 || overworld.getPlayers({ location: cLoc, maxDistance: 2.5 }).length > 0;

    if (isRidden) {
      const viewDir = car.getViewDirection();
      let hasWallHit = false;

      // Scan multi-points ahead of the long front nose (1.8 to 3.4 blocks ahead, across left/center/right)
      const testDistances = [1.8, 2.6, 3.4];
      const lateralOffsets = [-0.8, 0, 0.8];

      for (const dist of testDistances) {
        for (const lat of lateralOffsets) {
          const checkX = Math.floor(cLoc.x + viewDir.x * dist - viewDir.z * lat);
          const checkY = Math.floor(cLoc.y + 0.5);
          const checkZ = Math.floor(cLoc.z + viewDir.z * dist + viewDir.x * lat);

          try {
            const block = overworld.getBlock({ x: checkX, y: checkY, z: checkZ });
            if (block && !block.isAir && !block.isLiquid) {
              hasWallHit = true;
              break;
            }
          } catch (e) { }
        }
        if (hasWallHit) break;
      }

      if (hasWallHit) {
        // Trigger accident!
        accidentCarsMap.set(carId, now + 60000); // 1 minute
        activeAccidentLocations.push(cLoc);

        // Bounce back slightly from the wall
        try {
          car.applyKnockback(-viewDir.x, -viewDir.z, 0.6, 0.2);
        } catch (e) { }

        overworld.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
        overworld.spawnParticle("minecraft:huge_explosion_emitter", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });

        const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("§c💥🚗【交通事故発生！】車が壁に激突して大破しました！ 1分間 移動不能になります！§r");
        }
        continue;
      }
    }

    // 3. Slope / Step (Sag) Detection (Uphill / Downhill / Slab / Stairs)
    let isSlope = false;
    const viewDir = car.getViewDirection();
    const groundBlockCurrent = overworld.getBlock({ x: Math.floor(cLoc.x), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z) });
    const groundBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2.0), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z + viewDir.z * 2.0) });
    const stepBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2.0), y: Math.floor(cLoc.y + 0.5), z: Math.floor(cLoc.z + viewDir.z * 2.0) });

    // Check if current or front ground is a slab/stairs or has height difference (step)
    const currentTypeId = groundBlockCurrent?.typeId || "";
    const frontTypeId = groundBlockFront?.typeId || "";
    const stepTypeId = stepBlockFront?.typeId || "";

    if (
      currentTypeId.includes("slab") || currentTypeId.includes("stairs") ||
      frontTypeId.includes("slab") || frontTypeId.includes("stairs") ||
      (stepBlockFront && !stepBlockFront.isAir && !stepBlockFront.isLiquid) ||
      (groundBlockFront && groundBlockCurrent && groundBlockFront.typeId !== groundBlockCurrent.typeId)
    ) {
      isSlope = true;
    }

    // 4. Regular Traffic Jam, Sag Traffic Jam & Accident Jam Slowdown
    let isNearAccident = false;
    for (const accLoc of activeAccidentLocations) {
      const distSq = Math.pow(cLoc.x - accLoc.x, 2) + Math.pow(cLoc.y - accLoc.y, 2) + Math.pow(cLoc.z - accLoc.z, 2);
      if (distSq <= 625) { // within 25 blocks of an accident (25^2 = 625)
        isNearAccident = true;
        break;
      }
    }

    // Check all nearby entities within 64 blocks
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

    // Jam threshold: significantly lower on slopes (Sag Jam: only 4+ cars or 12+ entities needed)
    const carJamThreshold = isSlope ? 4 : 10;
    const entityJamThreshold = isSlope ? 12 : 30;

    const isCongested = nearbyCars.length >= carJamThreshold || nearbyEntities.length >= entityJamThreshold;

    if (isNearAccident || isCongested) {
      // Severe Traffic Jam (amplifier 5)
      car.addEffect("slowness", 10, { amplifier: 5, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
    } else if (isSlope) {
      // Natural Slope Deceleration (amplifier 2)
      car.addEffect("slowness", 10, { amplifier: 2, showParticles: false });
      overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
    }
  }
}, 5);

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
