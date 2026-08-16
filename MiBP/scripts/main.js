// src/main.ts
import { world, system, ItemStack, EntityComponentTypes, Player } from "@minecraft/server";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var yosanoLoveMap = /* @__PURE__ */ new Map();
var mochochoEatMap = /* @__PURE__ */ new Map();
var licensedPlayers = /* @__PURE__ */ new Set();
var accidentCarsMap = /* @__PURE__ */ new Map();
var achievementItems = {
  suimin: { itemId: "mi:suimin_ha_igyo", displayName: "\u7761\u7720\u306E\u5049\u696D" },
  suibunhokyu: { itemId: "mi:suibunhokyu_ha_igyo", displayName: "\u6C34\u5206\u88DC\u7D66\u306E\u5049\u696D" },
  aisatu: { itemId: "mi:aisatu_ha_igyo", displayName: "\u6328\u62F6\u306E\u5049\u696D" },
  asakatsu: { itemId: "mi:asakatsu_ha_igyo", displayName: "\u671D\u6D3B\u306E\u5049\u696D" },
  chokin: { itemId: "mi:chokin_ha_igyo", displayName: "\u8CAF\u91D1\u306E\u5049\u696D" },
  dokusho: { itemId: "mi:dokusho_ha_igyo", displayName: "\u8AAD\u66F8\u306E\u5049\u696D" },
  josetsu: { itemId: "mi:josetsu_ha_igyo", displayName: "\u9664\u96EA\u306E\u5049\u696D" },
  kaimono: { itemId: "mi:kaimono_ha_igyo", displayName: "\u8CB7\u3044\u7269\u306E\u5049\u696D" },
  seichi: { itemId: "mi:seichi_ha_igyo", displayName: "\u6574\u5730\u306E\u5049\u696D" },
  upgrade: { itemId: "mi:upgrade_ha_igyo", displayName: "\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u306E\u5049\u696D" },
  shokuji: { itemId: "mi:shokuji_ha_igyo", displayName: "\u98DF\u4E8B\u306E\u5049\u696D" }
};
var achievementScanTick = 0;
function getAchievementCounter(player, key) {
  const value = player.getDynamicProperty(`mi:achievement_${key}`);
  return typeof value === "number" ? value : 0;
}
function addAchievementCounter(player, key, amount = 1) {
  const nextValue = getAchievementCounter(player, key) + amount;
  player.setDynamicProperty(`mi:achievement_${key}`, nextValue);
  return nextValue;
}
function addPlayerItem(player, itemId) {
  const inventory = player.getComponent("minecraft:inventory");
  inventory?.container?.addItem(new ItemStack(itemId, 1));
}
function grantAchievement(player, key) {
  const tag = `mi:achievement_${key}`;
  if (player.hasTag(tag))
    return;
  player.addTag(tag);
  addPlayerItem(player, achievementItems[key].itemId);
  if (!player.hasTag("mi:achievement_first")) {
    player.addTag("mi:achievement_first");
    addPlayerItem(player, "mi:igyo");
  }
  player.sendMessage(`\xA76[Mi_Addon] ${achievementItems[key].displayName}\u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`);
}
function checkAchievementCounters(player) {
  if (getAchievementCounter(player, "josetsu") >= 500)
    grantAchievement(player, "josetsu");
  if (getAchievementCounter(player, "seichi") >= 1e3)
    grantAchievement(player, "seichi");
  if (getAchievementCounter(player, "shokuji") >= 500)
    grantAchievement(player, "shokuji");
}
function playerHasItem(player, itemIds) {
  const inventory = player.getComponent("minecraft:inventory");
  return containerHasItem(inventory?.container, itemIds);
}
function containerHasItem(container, itemIds) {
  if (!container)
    return false;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (item && itemIds.includes(item.typeId))
      return true;
  }
  return false;
}
function removeOneItemFromContainer(container, itemId) {
  if (!container)
    return false;
  for (let slot = 0; slot < container.size; slot++) {
    const item = container.getItem(slot);
    if (!item || item.typeId !== itemId)
      continue;
    if (item.amount > 1) {
      item.amount -= 1;
      container.setItem(slot, item);
    } else {
      container.setItem(slot, void 0);
    }
    return true;
  }
  return false;
}
function checkInventoryAchievements(player) {
  if (playerHasItem(player, ["minecraft:gold_ingot", "minecraft:gold_nugget", "minecraft:raw_gold", "minecraft:gold_block"])) {
    grantAchievement(player, "chokin");
  }
  if (playerHasItem(player, ["minecraft:netherite_pickaxe", "minecraft:netherite_axe", "minecraft:netherite_shovel", "minecraft:netherite_hoe", "minecraft:netherite_sword"])) {
    grantAchievement(player, "upgrade");
  }
}
function damageMiToolOnBlockBreak(player) {
  if (player.gameMode === "creative")
    return;
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  const mainhand = equippable?.getEquipment("Mainhand");
  if (!mainhand || !["mi:ota", "mi:otaku_cry", "mi:igyo_tool"].includes(mainhand.typeId))
    return;
  const durability = mainhand.getComponent("minecraft:durability");
  if (!durability)
    return;
  const enchantable = mainhand.getComponent("minecraft:enchantable");
  const unbreaking = enchantable?.getEnchantment("unbreaking");
  const unbreakingLevel = Math.max(0, Math.min(3, unbreaking?.level || 0));
  const damageChance = durability.getDamageChance(unbreakingLevel);
  if (Math.random() * 100 >= damageChance)
    return;
  durability.damage += 1;
  if (durability.damage >= durability.maxDurability) {
    equippable.setEquipment("Mainhand", void 0);
    player.sendMessage("\xA7c[Mi_Addon] \u30C4\u30FC\u30EB\u306E\u8010\u4E45\u5024\u304C\u5C3D\u304D\u307E\u3057\u305F\u3002\xA7r");
  } else {
    equippable.setEquipment("Mainhand", mainhand);
  }
}
function updateIgyoToolOwnership(player) {
  const ownsTool = player.hasTag("mi:igyo_tool_owned");
  const hasTool = playerHasItem(player, ["mi:igyo_tool"]);
  if (ownsTool && !hasTool)
    player.removeTag("mi:igyo_tool_owned");
}
function getBlockSafely(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch (error) {
    return void 0;
  }
}
function getPlayersSafely(dimension, options) {
  try {
    return dimension.getPlayers(options);
  } catch (error) {
    return [];
  }
}
function getEntitiesSafely(dimension, options) {
  try {
    return dimension.getEntities(options);
  } catch (error) {
    return [];
  }
}
function spawnParticleSafely(dimension, particleId, location) {
  try {
    dimension.spawnParticle(particleId, location);
  } catch (error) {
  }
}
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
  ":tutinoko:": "\uE10A",
  ":tinfoil:": "\uE10B"
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
    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー)$/i.test(event.message.trim())) {
      grantAchievement(sender, "aisatu");
    }
  });
}
var momoLuckCooldownMap = /* @__PURE__ */ new Map();
var MOMO_LUCK_COOLDOWN_MS = 5 * 60 * 1e3;
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== "mi:momo")
    return;
  const player = event.player;
  const target = event.target;
  const now = Date.now();
  const lastLuckTime = momoLuckCooldownMap.get(player.id) || 0;
  system.run(() => {
    if (now - lastLuckTime < MOMO_LUCK_COOLDOWN_MS) {
      player.sendMessage("\xA7d\u30E2\u30E2: \u300C\u306A\u3067\u306A\u3067\u3001\u3042\u308A\u304C\u3068\u3046\u306A\u306E\u266A\u300D\xA7r");
      player.dimension.spawnParticle("minecraft:heart_particle", { x: target.location.x, y: target.location.y + 1.2, z: target.location.z });
      return;
    }
    momoLuckCooldownMap.set(player.id, now);
    try {
      player.addEffect("village_hero", 6e3, { amplifier: 0 });
      player.addEffect("regeneration", 200, { amplifier: 0 });
    } catch (e) {
    }
    player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1, z: player.location.z });
    player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
    player.sendMessage("\xA7d\u{1F340} [Mi_Addon] \u30E2\u30E2\u304C\u5E78\u904B\u306E\u304A\u307E\u3058\u306A\u3044\u3092\u304B\u3051\u3066\u304F\u308C\u305F\uFF01(\u6751\u306E\u82F1\u96C4\uFF06\u518D\u751F\u52B9\u679C)\xA7r");
  });
});
var syuiloQuotes = [
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u3042\u3001\u3069\u3046\u3082\u3002Misskey\u306E\u958B\u767A\u3001\u4ECA\u65E5\u3082\u5143\u6C17\u306B\u3084\u3063\u3066\u307E\u3059\u3088\u3002\u300D\xA7r",
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u65B0\u6A5F\u80FD\u306E\u30A2\u30A4\u30C7\u30A2\u3001\u601D\u3044\u3064\u3044\u305F\u3089\u3059\u3050\u5B9F\u88C5\u3057\u3061\u3083\u3046\u30BF\u30A4\u30D7\u306A\u3093\u3067\u3059\u3088\u306D\u3002\u300D\xA7r",
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u30B5\u30FC\u30D0\u30FC\u304C\u843D\u3061\u3066\u306A\u3044\u304B\u3001\u3044\u3064\u3082\u5FC3\u306E\u3069\u3053\u304B\u3067\u6C17\u306B\u3057\u3066\u307E\u3059\u3002\u300D\xA7r",
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3001\u3044\u3063\u3071\u3044\u5897\u3048\u3066\u3046\u308C\u3057\u3044\u306A\u3042\u3002\u300D\xA7r",
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u30D0\u30B0\u5831\u544A\u306F\u3044\u3064\u3067\u3082\u6B53\u8FCE\u3067\u3059\u3002\u76F4\u305B\u308B\u304B\u306F\u5225\u3068\u3057\u3066\u3002\u300D\xA7r",
  "\xA7b\u3057\u3085\u3044\u308D: \u300C\u305F\u307E\u306B\u306FMinecraft\u3067\u606F\u629C\u304D\u3059\u308B\u306E\u3082\u3044\u3044\u3082\u306E\u3067\u3059\u306D\u3002\u300D\xA7r"
];
var syuiloQuoteIndexMap = /* @__PURE__ */ new Map();
var syuiloLastTalkTimeMap = /* @__PURE__ */ new Map();
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  if (event.target.typeId !== "mi:syuilo")
    return;
  const player = event.player;
  const target = event.target;
  const now = Date.now();
  const lastTime = syuiloLastTalkTimeMap.get(player.id) || 0;
  if (now - lastTime < 500)
    return;
  syuiloLastTalkTimeMap.set(player.id, now);
  const nextIndex = syuiloQuoteIndexMap.get(player.id) || 0;
  const quote = syuiloQuotes[nextIndex];
  syuiloQuoteIndexMap.set(player.id, (nextIndex + 1) % syuiloQuotes.length);
  system.run(() => {
    player.sendMessage(quote);
    const loc = target.location;
    player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
    player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.6, z: loc.z });
  });
});
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  const blockId = event.brokenBlockPermutation.type.id;
  damageMiToolOnBlockBreak(player);
  if (blockId.includes("snow"))
    addAchievementCounter(player, "josetsu");
  if (["minecraft:dirt", "minecraft:grass", "minecraft:grass_block"].includes(blockId))
    addAchievementCounter(player, "seichi");
  checkAchievementCounters(player);
});
var zabutonEntityIds = ["mi:zabuton_red", "mi:zabuton_blue", "mi:zabuton_green", "mi:zabuton_yellow"];
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const target = event.target;
  if (!zabutonEntityIds.includes(target.typeId))
    return;
  const itemStack = event.itemStack;
  if (!itemStack || itemStack.typeId !== target.typeId)
    return;
  event.cancel = true;
  const player = event.player;
  system.run(() => {
    const variantComponent = target.getComponent("minecraft:variant");
    const currentLayer = variantComponent?.value || 1;
    if (currentLayer >= 4)
      return;
    target.triggerEvent(`mi:set_layer_${currentLayer + 1}`);
    if (player.gameMode !== "creative") {
      const equippable = player.getComponent(EntityComponentTypes.Equippable);
      if (itemStack.amount > 1) {
        itemStack.amount -= 1;
        equippable?.setEquipment("Mainhand", itemStack);
      } else {
        equippable?.setEquipment("Mainhand", void 0);
      }
    }
  });
});
world.afterEvents.entityHurt.subscribe((event) => {
  const hurtEntity = event.hurtEntity;
  if (!zabutonEntityIds.includes(hurtEntity.typeId))
    return;
  const loc = hurtEntity.location;
  const dimension = hurtEntity.dimension;
  const variantComponent = hurtEntity.getComponent("minecraft:variant");
  const layerCount = variantComponent?.value || 1;
  system.run(() => {
    try {
      dimension.spawnItem(new ItemStack(hurtEntity.typeId, layerCount), loc);
      hurtEntity.remove();
    } catch (error) {
    }
  });
});
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
  const blockId = event.block.typeId;
  if (blockId === "minecraft:chest") {
    const requiredItems = Object.values(achievementItems).map((achievement) => achievement.itemId);
    const chestInventory = event.block.getComponent("minecraft:inventory");
    const chestContainer = chestInventory?.container;
    if (!event.player.hasTag("mi:igyo_tool_owned") && requiredItems.every((itemId) => containerHasItem(chestContainer, [itemId]))) {
      system.run(() => {
        for (const itemId of requiredItems)
          removeOneItemFromContainer(chestContainer, itemId);
        addPlayerItem(event.player, "mi:igyo_tool");
        event.player.addTag("mi:igyo_tool_owned");
        event.player.sendMessage("\xA76[Mi_Addon] \u3059\u3079\u3066\u306E\u5049\u696D\u3092\u30C1\u30A7\u30B9\u30C8\u306B\u7D0D\u3081\u3001\u5049\u696D\u306E\u30C4\u30FC\u30EB\u3092\u624B\u306B\u5165\u308C\u307E\u3057\u305F\uFF01\xA7r");
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
var playerTradeEvent = world.afterEvents.playerTrade;
if (playerTradeEvent) {
  playerTradeEvent.subscribe((event) => grantAchievement(event.player, "kaimono"));
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
world.afterEvents.entitySpawn.subscribe((event) => {
  const entity = event.entity;
  if (!entity || !entity.isValid())
    return;
  const typeId = entity.typeId;
  const isMonster = typeId.startsWith("minecraft:zombie") || typeId.startsWith("minecraft:skeleton") || typeId === "minecraft:creeper" || typeId === "minecraft:spider" || typeId === "minecraft:cave_spider" || typeId === "minecraft:enderman" || typeId === "minecraft:witch" || typeId === "minecraft:slime" || typeId === "minecraft:phantom" || typeId === "minecraft:drowned" || typeId === "minecraft:husk" || typeId === "minecraft:stray" || typeId === "mi:blebcat";
  if (!isMonster)
    return;
  const loc = entity.location;
  const dim = entity.dimension;
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
    } catch (e) {
    }
  }
});
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;
  if (!target)
    return;
  if (target.typeId === "mi:regretcar" && itemStack) {
    const dyeColorEventMap = {
      "minecraft:white_dye": { event: "mi:set_variant_0", colorName: "\u767D" },
      "minecraft:orange_dye": { event: "mi:set_variant_1", colorName: "\u30AA\u30EC\u30F3\u30B8" },
      "minecraft:magenta_dye": { event: "mi:set_variant_2", colorName: "\u30DE\u30BC\u30F3\u30BF" },
      "minecraft:light_blue_dye": { event: "mi:set_variant_3", colorName: "\u30E9\u30A4\u30C8\u30D6\u30EB\u30FC" },
      "minecraft:yellow_dye": { event: "mi:set_variant_4", colorName: "\u9EC4\u8272" },
      "minecraft:lime_dye": { event: "mi:set_variant_5", colorName: "\u30E9\u30A4\u30E0" },
      "minecraft:pink_dye": { event: "mi:set_variant_6", colorName: "\u30D4\u30F3\u30AF" },
      "minecraft:gray_dye": { event: "mi:set_variant_7", colorName: "\u7070\u8272" },
      "minecraft:light_gray_dye": { event: "mi:set_variant_8", colorName: "\u30E9\u30A4\u30C8\u30B0\u30EC\u30FC" },
      "minecraft:cyan_dye": { event: "mi:set_variant_9", colorName: "\u30B7\u30A2\u30F3" },
      "minecraft:purple_dye": { event: "mi:set_variant_10", colorName: "\u7D2B" },
      "minecraft:blue_dye": { event: "mi:set_variant_11", colorName: "\u9752" },
      "minecraft:brown_dye": { event: "mi:set_variant_12", colorName: "\u8336\u8272" },
      "minecraft:green_dye": { event: "mi:set_variant_13", colorName: "\u7DD1" },
      "minecraft:red_dye": { event: "mi:set_variant_14", colorName: "\u8D64" },
      "minecraft:black_dye": { event: "mi:set_variant_15", colorName: "\u9ED2" }
    };
    const colorInfo = dyeColorEventMap[itemStack.typeId];
    if (colorInfo) {
      system.run(() => {
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
        target.triggerEvent(colorInfo.event);
        player.sendMessage(`\xA7d[Mi_Addon] \u9577\u3044\u5909\u306A\u8ECA\u306E\u8272\u3092${colorInfo.colorName}\u306B\u67D3\u3081\u307E\u3057\u305F\u3002\xA7r`);
      });
      return;
    }
  }
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
  if (itemStack.getComponent?.("minecraft:food")) {
    addAchievementCounter(player, "shokuji");
    checkAchievementCounters(player);
  }
  if (itemStack.typeId === "mi:baked_mochocho") {
    let state = mochochoEatMap.get(playerId) || { count: 0, lastEatTime: now };
    if (now - state.lastEatTime > 6e4) {
      state.count = 0;
    }
    state.count += 1;
    state.lastEatTime = now;
    mochochoEatMap.set(playerId, state);
    const equippable = player.getComponent(EntityComponentTypes.Equippable);
    const headItem = equippable?.getEquipment("Head");
    const isWearingTinFoil = headItem?.typeId === "mi:tin_foil_hat";
    if (state.count >= 5) {
      if (isWearingTinFoil) {
        player.sendMessage("\xA7b\u{1F6E1}\uFE0F [Mi_Addon] \u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u3092\u98DF\u3079\u3059\u304E\u305F\u304C\u3001\u30A2\u30EB\u30DF\u30DB\u30A4\u30EB\u304C\u5410\u304D\u6C17\u96FB\u6CE2\u3092\u5B8C\u5168\u906E\u65AD\u3057\u305F\uFF01\xA7r");
      } else {
        player.addEffect("nausea", 300, { amplifier: 1 });
        player.addEffect("hunger", 300, { amplifier: 1 });
        player.sendMessage("\xA7c[Mi_Addon] \u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u30921\u5206\u9593\u306B\u98DF\u3079\u3059\u304E\u3066(5\u500B)\u3001\u5F37\u70C8\u306A\u5410\u304D\u6C17\u3068\u7A7A\u8179\u306B\u304A\u305D\u308F\u308C\u305F\u2026\uFF01\xA7r");
      }
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
  achievementScanTick += 1;
  const players = overworld.getPlayers();
  for (const p of players) {
    if (achievementScanTick >= 20) {
      updateIgyoToolOwnership(p);
      checkInventoryAchievements(p);
      const hour = (/* @__PURE__ */ new Date()).getHours();
      if (hour >= 6 && hour < 9) {
        const seconds = addAchievementCounter(p, "asakatsu_seconds", 5);
        if (seconds >= 1800)
          grantAchievement(p, "asakatsu");
      } else {
        p.setDynamicProperty("mi:achievement_asakatsu_seconds", 0);
      }
    }
    const equippable = p.getComponent(EntityComponentTypes.Equippable);
    const headItem = equippable?.getEquipment("Head");
    if (headItem?.typeId === "mi:tin_foil_hat") {
      const pLoc = p.location;
      const debuffs = ["darkness", "blindness", "nausea", "bad_omen"];
      for (const debuff of debuffs) {
        if (p.getEffect(debuff)) {
          p.removeEffect(debuff);
          p.sendMessage("\xA7b\u{1F6E1}\uFE0F [Mi_Addon] \u9670\u8B00\u8AD6\u8005\u306E\u30A2\u30EB\u30DF\u30DB\u30A4\u30EB\u304C\u602A\u96FB\u6CE2\u30FB\u601D\u8003\u653B\u6483\u3092\u53CD\u5C04\u30FB\u7121\u52B9\u5316\u3057\u305F\uFF01\xA7r");
        }
      }
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
  if (achievementScanTick >= 20)
    achievementScanTick = 0;
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
    if (!car.isValid())
      continue;
    const cLoc = car.location;
    const carId = car.id;
    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId);
      if (now < recoveryTime) {
        try {
          car.addEffect("slowness", 30, { amplifier: 255, showParticles: false });
        } catch (error) {
        }
        spawnParticleSafely(overworld, "minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
        spawnParticleSafely(overworld, "minecraft:lava_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
        activeAccidentLocations.push(cLoc);
        continue;
      } else {
        accidentCarsMap.delete(carId);
        spawnParticleSafely(overworld, "minecraft:heart_particle", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
        const nearbyPlayers = getPlayersSafely(overworld, { location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("\xA7a\u{1F527}\u{1F697} [Mi_Addon] \u8ECA\u4E21\u306E\u5FDC\u6025\u4FEE\u7406\u304C\u5B8C\u4E86\u3057\u3001\u4E8B\u6545\u73FE\u5834\u304C\u5FA9\u65E7\u3057\u307E\u3057\u305F\uFF01\xA7r");
        }
      }
    }
    const rideable = car.getComponent("minecraft:rideable");
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    const isRidden = riders.length > 0 || getPlayersSafely(overworld, { location: cLoc, maxDistance: 2.5 }).length > 0;
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
        spawnParticleSafely(overworld, "minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
        spawnParticleSafely(overworld, "minecraft:huge_explosion_emitter", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
        const nearbyPlayers = getPlayersSafely(overworld, { location: cLoc, maxDistance: 32 });
        for (const p of nearbyPlayers) {
          p.sendMessage("\xA7c\u{1F4A5}\u{1F697}\u3010\u4EA4\u901A\u4E8B\u6545\u767A\u751F\uFF01\u3011\u8ECA\u304C\u58C1\u306B\u6FC0\u7A81\u3057\u3066\u5927\u7834\u3057\u307E\u3057\u305F\uFF01 1\u5206\u9593 \u79FB\u52D5\u4E0D\u80FD\u306B\u306A\u308A\u307E\u3059\uFF01\xA7r");
        }
        continue;
      }
    }
    let isSlope = false;
    const viewDir = car.getViewDirection();
    const groundBlockCurrent = getBlockSafely(overworld, { x: Math.floor(cLoc.x), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z) });
    const groundBlockFront = getBlockSafely(overworld, { x: Math.floor(cLoc.x + viewDir.x * 2), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z + viewDir.z * 2) });
    const stepBlockFront = getBlockSafely(overworld, { x: Math.floor(cLoc.x + viewDir.x * 2), y: Math.floor(cLoc.y + 0.5), z: Math.floor(cLoc.z + viewDir.z * 2) });
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
    const nearbyEntities = getEntitiesSafely(overworld, {
      location: cLoc,
      maxDistance: 64,
      excludeTypes: ["minecraft:item"]
    });
    const nearbyCars = getEntitiesSafely(overworld, {
      location: cLoc,
      maxDistance: 64,
      type: "mi:regretcar"
    });
    const carJamThreshold = isSlope ? 4 : 10;
    const entityJamThreshold = isSlope ? 12 : 30;
    const isCongested = nearbyCars.length >= carJamThreshold || nearbyEntities.length >= entityJamThreshold;
    if (isNearAccident || isCongested) {
      car.addEffect("slowness", 10, { amplifier: 5, showParticles: false });
      spawnParticleSafely(overworld, "minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
    } else if (isSlope) {
      car.addEffect("slowness", 10, { amplifier: 2, showParticles: false });
      spawnParticleSafely(overworld, "minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
    }
  }
}, 5);
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
