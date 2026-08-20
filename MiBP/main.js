// src/main.ts
import { world, system, ItemStack, EntityComponentTypes, Player, BlockPermutation } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var playerUIOpenLock = /* @__PURE__ */ new Map();
function canOpenUI(player) {
  const now = Date.now();
  const lastTime = playerUIOpenLock.get(player.id) || 0;
  if (now - lastTime < 600) return false;
  playerUIOpenLock.set(player.id, now);
  return true;
}
function showFormSafe(player, form, onResponse) {
  system.runTimeout(() => {
    form.show(player).then((response) => {
      if (response && response.cancelationReason === "userBusy") {
        return;
      }
      onResponse(response);
    }).catch(() => {
    });
  }, 1);
}
function decrementPlayerHeldItem(player) {
  try {
    if (player.gameMode === "creative") return true;
    const equippable = player.getComponent(EntityComponentTypes.Equippable);
    if (!equippable) return false;
    const handItem = equippable.getEquipment("Mainhand");
    if (!handItem) return false;
    if (handItem.amount > 1) {
      handItem.amount -= 1;
      equippable.setEquipment("Mainhand", handItem);
    } else {
      equippable.setEquipment("Mainhand", void 0);
    }
    return true;
  } catch (e) {
    return false;
  }
}
var zabutonPlaceCooldownMap = /* @__PURE__ */ new Map();
var blueprintCooldownMap = /* @__PURE__ */ new Map();
var yosanoLoveMap = /* @__PURE__ */ new Map();
var mochochoEatMap = /* @__PURE__ */ new Map();
var licensedPlayers = /* @__PURE__ */ new Set();
var accidentCarsMap = /* @__PURE__ */ new Map();
var momoLuckCooldownMap = /* @__PURE__ */ new Map();
var syuiloQuoteIndexMap = /* @__PURE__ */ new Map();
var ALL_IGYO_ITEMS = [
  "mi:aisatu_ha_igyo",
  "mi:suimin_ha_igyo",
  "mi:suibunhokyu_ha_igyo",
  "mi:asakatsu_ha_igyo",
  "mi:chokin_ha_igyo",
  "mi:dokusho_ha_igyo",
  "mi:josetsu_ha_igyo",
  "mi:kaimono_ha_igyo",
  "mi:seichi_ha_igyo",
  "mi:upgrade_ha_igyo",
  "mi:shokuji_ha_igyo",
  "mi:ensei_ha_igyo"
];
var IGYO_NAMES = {
  "aisatu": "\u6328\u62F6\u306E\u5049\u696D",
  "suimin": "\u7761\u7720\u306E\u5049\u696D",
  "suibunhokyu": "\u6C34\u5206\u88DC\u7D66\u306E\u5049\u696D",
  "asakatsu": "\u671D\u6D3B\u306E\u5049\u696D",
  "chokin": "\u8CAF\u91D1\u306E\u5049\u696D",
  "dokusho": "\u8AAD\u66F8\u306E\u5049\u696D",
  "josetsu": "\u9664\u96EA\u306E\u5049\u696D",
  "kaimono": "\u8CB7\u3044\u7269\u306E\u5049\u696D",
  "seichi": "\u6574\u5730\u306E\u5049\u696D",
  "upgrade": "\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u306E\u5049\u696D",
  "shokuji": "\u98DF\u4E8B\u306E\u5049\u696D",
  "ensei": "\u9060\u5F81\u306E\u5049\u696D"
};
var IGYO_DESCRIPTIONS = {
  "aisatu": "\u30C1\u30E3\u30C3\u30C8\u3067\u6328\u62F6\u3059\u308B",
  "suimin": "\u30D9\u30C3\u30C9\u3067\u7720\u308B",
  "suibunhokyu": "\u6C34\u3084\u30DD\u30FC\u30B7\u30E7\u30F3\u3092\u98F2\u3080",
  "asakatsu": "\u671D6\u6642\u301C9\u6642\u306B30\u5206\u30D7\u30EC\u30A4",
  "chokin": "\u91D1\u30A4\u30F3\u30B4\u30C3\u30C8\u7B49\u3092\u6240\u6301",
  "dokusho": "\u672C\u3092\u4F7F\u7528\u3059\u308B",
  "josetsu": "\u96EA\u3092500\u500B\u6398\u308B",
  "kaimono": "\u6751\u4EBA\u3068\u53D6\u5F15\u3059\u308B",
  "seichi": "\u571F\u3084\u8349\u30921000\u500B\u6398\u308B",
  "upgrade": "\u935B\u51B6\u53F0\u3067\u30CD\u30B6\u30E9\u30A4\u30C8\u306B\u5F37\u5316",
  "shokuji": "\u98DF\u3079\u7269\u3092500\u500B\u98DF\u3079\u308B",
  "ensei": "\u30B8\u30FB\u30A8\u30F3\u30C9\u5230\u9054\u307E\u305F\u306F\u30A8\u30F3\u30C9\u30E9\u8A0E\u4F10"
};
var playerAsakatsuPlaySecondsMap = /* @__PURE__ */ new Map();
var playerSnowBreakCountMap = /* @__PURE__ */ new Map();
var playerSeichiBreakCountMap = /* @__PURE__ */ new Map();
var playerFoodEatCountMap = /* @__PURE__ */ new Map();
var playerSmithingTableOpenMap = /* @__PURE__ */ new Map();
function playerHasItem(player, itemTypeId) {
  try {
    const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inv) return false;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === itemTypeId) return true;
    }
  } catch (e) {
  }
  return false;
}
function hasPlayerAchieved(player, igyoKey) {
  try {
    const prop = player.getDynamicProperty(`igyo_${igyoKey}`);
    if (prop === true) return true;
  } catch (e) {
  }
  return player.hasTag(`igyo_${igyoKey}`);
}
function setPlayerAchieved(player, igyoKey) {
  try {
    player.setDynamicProperty(`igyo_${igyoKey}`, true);
  } catch (e) {
  }
  player.addTag(`igyo_${igyoKey}`);
}
function grantAchievement(player, igyoKey) {
  if (hasPlayerAchieved(player, igyoKey)) return;
  setPlayerAchieved(player, igyoKey);
  const itemTypeId = `mi:${igyoKey}_ha_igyo`;
  const name = IGYO_NAMES[igyoKey] || igyoKey;
  system.run(() => {
    try {
      const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
      if (!inv) return;
      const item = new ItemStack(itemTypeId, 1);
      item.setLore([
        `\xA76\u9054\u6210\u8005: \xA7f${player.name}\xA7r`,
        `\xA77\u9054\u6210\u6761\u4EF6: ${IGYO_DESCRIPTIONS[igyoKey] || ""}\xA7r`
      ]);
      const hasBaseIgyo = hasPlayerAchieved(player, "base_igyo");
      inv.addItem(item);
      if (!hasBaseIgyo) {
        setPlayerAchieved(player, "base_igyo");
        const baseItem = new ItemStack("mi:igyo", 1);
        baseItem.setLore([
          `\xA76\u6240\u6709\u8005: \xA7f${player.name}\xA7r`,
          `\xA7e11\u7A2E\u985E\u306E\u5049\u696D\u3092\u96C6\u3081\u3066\u53F3\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\xA7r`,
          `\xA7e\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u932C\u6210\u3067\u304D\u307E\u3059\uFF01\xA7r`
        ]);
        inv.addItem(baseItem);
        player.sendMessage(`\xA76\u{1F3C6} [\u5049\u696D\u9054\u6210] \u521D\u3081\u3066\u306E\u5049\u696D\u3092\u9054\u6210\uFF01\u300C\u5049\u696D (mi:igyo)\u300D\u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        player.sendMessage(`\xA7e\u{1F4A1} [\u30D2\u30F3\u30C8] 11\u7A2E\u985E\u3059\u3079\u3066\u306E\u5049\u696D\u3092\u96C6\u3081\u3066\u300C\u5049\u696D\u300D\u3092\u53F3\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u3001\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u932C\u6210\u3067\u304D\u307E\u3059\uFF01\xA7r`);
      }
      player.sendMessage(`\xA76\u{1F3C6} [\u5049\u696D\u9054\u6210] \u300C${name}\u300D\u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`);
      try {
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + 5e3);
        player.sendMessage(`\xA7a\u{1F4B5} [\u5049\u696D\u9054\u6210\u795D\u5100] \u53E3\u5EA7\u306B\u9054\u6210\u5831\u5968\u91D1 \xA7e5,000 \u5186\xA7a \u304C\u632F\u308A\u8FBC\u307E\u308C\u307E\u3057\u305F\uFF01\uFF08\u73FE\u5728\u6B8B\u9AD8: ${(curBal + 5e3).toLocaleString()}\u5186\uFF09\xA7r`);
      } catch (e) {
      }
      const loc = player.location;
      player.dimension.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1.5, z: loc.z });
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
    } catch (e) {
      console.warn("[Mi_Addon] Error granting achievement: " + e);
    }
  });
}
function resetAchievement(player, igyoKey) {
  try {
    player.setDynamicProperty(`igyo_${igyoKey}`, false);
  } catch (e) {
  }
  player.removeTag(`igyo_${igyoKey}`);
  if (igyoKey === "asakatsu") playerAsakatsuPlaySecondsMap.delete(player.id);
  if (igyoKey === "josetsu") playerSnowBreakCountMap.delete(player.id);
  if (igyoKey === "seichi") playerSeichiBreakCountMap.delete(player.id);
  if (igyoKey === "shokuji") playerFoodEatCountMap.delete(player.id);
}
function openAchievementRetryUI(player) {
  const form = new ActionFormData().title("\u{1F504} \u5049\u696D\u306E\u518D\u30C1\u30E3\u30EC\u30F3\u30B8 (\u30EA\u30BB\u30C3\u30C8)").body("\u7D1B\u5931\u30FB\u30ED\u30B9\u30C8\u3057\u305F\u5049\u696D\u3092\u9078\u629E\u3057\u3066\u30D5\u30E9\u30B0\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u3001\u3082\u3046\u4E00\u5EA6\u9054\u6210\u6761\u4EF6\u306B\u30C1\u30E3\u30EC\u30F3\u30B8\u3067\u304D\u307E\u3059\u3002\n\uFF08\u203B\u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u306B\u6240\u6301\u4E2D\u306E\u5049\u696D\u306F\u30EA\u30BB\u30C3\u30C8\u4E0D\u8981\u3067\u3059\uFF09");
  const allKeys = Object.keys(IGYO_NAMES);
  for (const key of allKeys) {
    const itemTypeId = `mi:${key}_ha_igyo`;
    const isHeld = playerHasItem(player, itemTypeId);
    const isAchieved = hasPlayerAchieved(player, key);
    const name = IGYO_NAMES[key];
    if (isHeld) {
      form.button(`\u2705 ${name}
[\u6240\u6301\u4E2D - \u30EA\u30BB\u30C3\u30C8\u4E0D\u8981]`);
    } else if (isAchieved) {
      form.button(`\u{1F504} ${name}
[\u30EA\u30BB\u30C3\u30C8\u3057\u3066\u518D\u6311\u6226\uFF01]`);
    } else {
      form.button(`\u23F3 ${name}
[\u672A\u9054\u6210 - \u30C1\u30E3\u30EC\u30F3\u30B8\u53EF\u80FD]`);
    }
  }
  form.button("\u{1F519} \u9589\u3058\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    const selectedIdx = res.selection;
    if (selectedIdx < allKeys.length) {
      const key = allKeys[selectedIdx];
      const itemTypeId = `mi:${key}_ha_igyo`;
      const isHeld = playerHasItem(player, itemTypeId);
      const isAchieved = hasPlayerAchieved(player, key);
      const name = IGYO_NAMES[key];
      const desc = IGYO_DESCRIPTIONS[key] || "";
      if (isHeld) {
        player.sendMessage(`\xA7e\u26A0\uFE0F \u300C${name}\u300D\u306F\u3059\u3067\u306B\u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u5185\u306B\u6240\u6301\u3057\u3066\u3044\u307E\u3059\u3002\xA7r`);
        openAchievementRetryUI(player);
      } else if (isAchieved) {
        resetAchievement(player, key);
        player.sendMessage(`\xA7a\u{1F504} [\u5049\u696D\u30EA\u30BB\u30C3\u30C8] \u300C${name}\u300D\u306E\u5B9F\u7E3E\u30D5\u30E9\u30B0\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        player.sendMessage(`\xA7e\u{1F4A1} \u518D\u9054\u6210\u306E\u6761\u4EF6: ${desc}\xA7r`);
        const pLoc = player.location;
        player.dimension.spawnParticle("minecraft:totem_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
      } else {
        player.sendMessage(`\xA77\u300C${name}\u300D\u306F\u307E\u3060\u9054\u6210\u3057\u3066\u3044\u307E\u305B\u3093\u3002(\u9054\u6210\u6761\u4EF6: ${desc})\xA7r`);
        openAchievementRetryUI(player);
      }
    }
  });
}
var emojiMap = {
  ":blobcat:": "\uE101",
  ":cat:": "\uE101",
  ":1:": "\uE101",
  ":neko_relax:": "\uE102",
  ":woneko:": "\uE102",
  ":neko:": "\uE102",
  ":2:": "\uE102",
  ":aichi:": "\uE103",
  ":blob_aichi:": "\uE103",
  ":3:": "\uE103",
  ":mochocho:": "\uE104",
  ":baked_mochocho:": "\uE104",
  ":bread:": "\uE104",
  ":4:": "\uE104",
  ":ota:": "\uE105",
  ":otaku:": "\uE105",
  ":5:": "\uE105",
  ":otaku_cry:": "\uE106",
  ":cry:": "\uE106",
  ":6:": "\uE106",
  ":blebcat:": "\uE107",
  ":7:": "\uE107",
  ":regretcar:": "\uE108",
  ":car:": "\uE108",
  ":8:": "\uE108",
  ":yosano:": "\uE109",
  ":9:": "\uE109",
  ":tutinoko:": "\uE10A",
  ":10:": "\uE10A",
  ":tinfoil:": "\uE10B",
  ":foil:": "\uE10B",
  ":11:": "\uE10B",
  ":neko_cry:": "\uE10C",
  ":12:": "\uE10C",
  ":neko_tired:": "\uE10D",
  ":neko_tired2:": "\uE10D",
  ":13:": "\uE10D",
  ":heart:": "\u2764\uFE0F",
  ":good:": "\u{1F44D}",
  ":tada:": "\u{1F389}",
  ":bomb:": "\u{1F4A5}"
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
    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー|おは|こん|おやすみ)/i.test(event.message.trim())) {
      grantAchievement(sender, "aisatu");
    }
  });
}
var MOMO_LUCK_COOLDOWN_MS = 5 * 60 * 1e3;
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;
  if (!target) return;
  if (target.typeId.startsWith("mi:zabuton_") && itemStack && itemStack.typeId.startsWith("mi:zabuton_")) {
    event.cancel = true;
    const zabutonTypeId = itemStack.typeId;
    const loc = target.location;
    const dim = target.dimension;
    const now = Date.now();
    const lastPlace = zabutonPlaceCooldownMap.get(player.id) || 0;
    if (now - lastPlace < 250) return;
    zabutonPlaceCooldownMap.set(player.id, now);
    system.run(() => {
      try {
        const stackLoc = { x: loc.x, y: loc.y + 0.16, z: loc.z };
        dim.spawnEntity(zabutonTypeId, stackLoc);
        dim.spawnParticle("minecraft:smoke_particle", { x: stackLoc.x, y: stackLoc.y + 0.1, z: stackLoc.z });
        decrementPlayerHeldItem(player);
        player.sendMessage("\xA7a\u{1F6CB}\uFE0F [Mi_Addon] \u5EA7\u5E03\u56E3\u3092\u4E0A\u306B\u91CD\u306D\u307E\u3057\u305F\uFF01\xA7r");
      } catch (e) {
        console.warn("[Mi_Addon] Error stacking zabuton: " + e);
      }
    });
    return;
  }
  if (target.typeId === "mi:momo") {
    event.cancel = true;
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
    return;
  }
  if (target.typeId === "mi:syuilo") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    system.run(() => {
      openSyuiloDialogUI(player, target);
    });
    return;
  }
});
var globalNotes = [];
var instanceServerMap = /* @__PURE__ */ new Map();
var reactionOptions = [
  { label: "\u306B\u3083\u3093\u3077\u3063\u3077\u30FC", glyph: "\uE101" },
  { label: "\u3092\u306D\u3053 (\u30EA\u30E9\u30C3\u30AF\u30B9)", glyph: "\uE102" },
  { label: "\u611B\u77E5", glyph: "\uE103" },
  { label: "\u30E2\u30C1\u30E7\u30C1\u30E7", glyph: "\uE104" },
  { label: "\u30AA\u30BF\u30AF\u304F\u3093", glyph: "\uE105" },
  { label: "\u30AA\u30BF\u30AF\u304F\u3093\u6CE3\u304D", glyph: "\uE106" },
  { label: "blebcat", glyph: "\uE107" },
  { label: "\u9577\u3044\u5909\u306A\u8ECA", glyph: "\uE108" },
  { label: "\u4E0E\u8B1D\u91CE\u6676\u5B50", glyph: "\uE109" },
  { label: "\u30C4\u30C1\u30CE\u30B3", glyph: "\uE10A" },
  { label: "\u30A2\u30EB\u30DF\u30DB\u30A4\u30EB", glyph: "\uE10B" },
  { label: "\u3092\u306D\u3053 (\u6CE3\u304D)", glyph: "\uE10C" },
  { label: "\u3092\u306D\u3053 (\u304A\u75B2\u308C)", glyph: "\uE10D" },
  { label: "\u30CF\u30FC\u30C8 (\u2764\uFE0F)", glyph: "\u2764\uFE0F" },
  { label: "\u3044\u3044\u306D (\u{1F44D})", glyph: "\u{1F44D}" },
  { label: "\u795D (\u{1F389})", glyph: "\u{1F389}" },
  { label: "\u7206\u767A (\u{1F4A5})", glyph: "\u{1F4A5}" }
];
function openInstanceServerUI(player, blockLoc) {
  const posKey = `${blockLoc.x},${blockLoc.y},${blockLoc.z}`;
  let inst = instanceServerMap.get(posKey);
  if (!inst) {
    inst = {
      name: `local-${Math.floor(Math.random() * 900 + 100)}.misskey`,
      owner: player.name,
      federatedWith: ["misskey.io"]
    };
    instanceServerMap.set(posKey, inst);
  }
  const form = new ActionFormData().title(`\u{1F3DB}\uFE0F \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9: @${inst.name}`).body(`\u7BA1\u7406\u8005: ${inst.owner}
\u9023\u5408\u5148\u30B5\u30FC\u30D0\u30FC\u6570: ${inst.federatedWith.length} \u62E0\u70B9
\u96FB\u6CE2\u30D0\u30D5: ${inst.federatedWith.length > 0 ? "\u26A1 \u7A3C\u50CD\u4E2D (\u79FB\u52D5\u901F\u5EA6 / \u63A1\u6398\u901F\u5EA6)" : "\u{1F4A4} \u672A\u63A5\u7D9A"}`).button("\u{1F4DD} \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u540D\u3092\u5909\u66F4\u3059\u308B").button("\u{1F310} \u9023\u5408\uFF08Federation\uFF09\u7BA1\u7406").button("\u{1F4CA} Fediverse \u7D71\u8A08\u3092\u898B\u308B").button("\u9589\u3058\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection === 0) {
      const modal = new ModalFormData().title("\u{1F3DB}\uFE0F \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u540D\u306E\u8A2D\u5B9A").textField("\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u306E\u30C9\u30E1\u30A4\u30F3\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044", "\u4F8B: my-home.misskey", inst.name);
      showFormSafe(player, modal, (res) => {
        if (res.canceled || !res.formValues) return;
        const newName = String(res.formValues[0]).trim();
        if (newName) {
          inst.name = newName;
          player.sendMessage(`\xA7a\u{1F3DB}\uFE0F [Fediverse] \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u540D\u3092\u300C@${newName}\u300D\u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        }
      });
    } else if (response.selection === 1) {
      const fedForm = new ActionFormData().title("\u{1F310} \u9023\u5408\uFF08Federation\uFF09\u7BA1\u7406").body(`\u73FE\u5728\u306E\u9023\u5408\u5148:
${inst.federatedWith.map((s) => `\u30FB @${s}`).join("\n")}`).button("\u2795 \u65B0\u3057\u3044\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u3068\u9023\u5408\u3092\u7D50\u3076").button("\u623B\u308B");
      showFormSafe(player, fedForm, (fRes) => {
        if (fRes.canceled || fRes.selection === void 0) return;
        if (fRes.selection === 0) {
          const connectModal = new ModalFormData().title("\u2795 \u9023\u5408\u5148\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u306E\u8FFD\u52A0").textField("\u63A5\u7D9A\u5148\u30C9\u30E1\u30A4\u30F3\u540D\u3092\u5165\u529B", "\u4F8B: friend-base.misskey");
          showFormSafe(player, connectModal, (cRes) => {
            if (cRes.canceled || !cRes.formValues) return;
            const target = String(cRes.formValues[0]).trim();
            if (target && !inst.federatedWith.includes(target)) {
              inst.federatedWith.push(target);
              player.dimension.spawnParticle("minecraft:totem_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
              player.sendMessage(`\xA7a\u{1F310} [ActivityPub] @${target} \u3068\u306E\u9023\u5408\u63A5\u7D9A\uFF08\u30EA\u30EC\u30FC\u540C\u671F\uFF09\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\uFF01\u96FB\u6CE2\u30D0\u30D5\u304C\u5F37\u5316\u3055\u308C\u307E\u3057\u305F\uFF01\xA7r`);
            }
          });
        }
      });
    } else if (response.selection === 2) {
      player.sendMessage(`\xA7b\u{1F4CA} [Fediverse\u7D71\u8A08] \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9: @${inst.name} | \u767B\u9332\u30CE\u30FC\u30C8\u7DCF\u6570: ${globalNotes.length} \u4EF6 | \u9023\u5408\u6570: ${inst.federatedWith.length} \u62E0\u70B9\xA7r`);
    }
  });
}
var playerEmojiDeckMap = /* @__PURE__ */ new Map();
function getPlayerEmojiDeck(player) {
  let deck = playerEmojiDeckMap.get(player.id);
  if (!deck || deck.length === 0) {
    deck = ["\uE101", "\uE102", "\uE104", "\uE10B"];
    playerEmojiDeckMap.set(player.id, deck);
  }
  return deck;
}
function openEmojiDeckSettingsUI(player, blockLoc) {
  const currentDeck = getPlayerEmojiDeck(player);
  const deckLabels = currentDeck.map((glyph, i) => {
    const opt = reactionOptions.find((o) => o.glyph === glyph);
    return `\u30B9\u30ED\u30C3\u30C8 {${i + 1}}: ${glyph} ${opt ? opt.label : ""}`;
  });
  const form = new ActionFormData().title("\u2699\uFE0F \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u306E\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA").body(`\u73FE\u5728\u306E\u7D75\u6587\u5B57\u30C7\u30C3\u30AD (${currentDeck.length} \u500B):
${deckLabels.join("\n") || "\u306A\u3057"}

\u30C7\u30C3\u30AD\u3092\u5897\u3084\u3057\u305F\u308A\u6E1B\u3089\u3057\u305F\u308A\u81EA\u7531\u306B\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA\u3067\u304D\u307E\u3059:`).button("\u2795 \u30C7\u30C3\u30AD\u306B\u7D75\u6587\u5B57\u3092\u8FFD\u52A0\u3059\u308B").button("\u2796 \u30C7\u30C3\u30AD\u304B\u3089\u7D75\u6587\u5B57\u3092\u524A\u9664\u3059\u308B").button("\u{1F504} \u30C7\u30D5\u30A9\u30EB\u30C8\u8A2D\u5B9A\u306B\u623B\u3059").button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      const pickForm = new ActionFormData().title("\u2795 \u30C7\u30C3\u30AD\u306B\u8FFD\u52A0\u3059\u308B\u7D75\u6587\u5B57\u3092\u9078\u629E");
      for (const opt of reactionOptions) {
        pickForm.button(`${opt.glyph} ${opt.label}`);
      }
      showFormSafe(player, pickForm, (pRes) => {
        if (pRes.canceled || pRes.selection === void 0) {
          openEmojiDeckSettingsUI(player, blockLoc);
          return;
        }
        const chosen = reactionOptions[pRes.selection];
        currentDeck.push(chosen.glyph);
        player.sendMessage(`\xA7a\u2795 \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u306B ${chosen.glyph} (${chosen.label}) \u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\uFF01\uFF08\u73FE\u5728 ${currentDeck.length} \u500B\uFF09\xA7r`);
        openEmojiDeckSettingsUI(player, blockLoc);
      });
    } else if (res.selection === 1) {
      if (currentDeck.length <= 1) {
        player.sendMessage("\xA7c\u26A0\uFE0F \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u306F\u6700\u4F4E1\u500B\u5FC5\u8981\u3067\u3059\u3002\xA7r");
        openEmojiDeckSettingsUI(player, blockLoc);
        return;
      }
      const removeForm = new ActionFormData().title("\u2796 \u524A\u9664\u3059\u308B\u7D75\u6587\u5B57\u3092\u9078\u629E").body("\u30C7\u30C3\u30AD\u304B\u3089\u5916\u3057\u305F\u3044\u7D75\u6587\u5B57\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044:");
      for (let i = 0; i < currentDeck.length; i++) {
        const glyph = currentDeck[i];
        const opt = reactionOptions.find((o) => o.glyph === glyph);
        removeForm.button(`\u30B9\u30ED\u30C3\u30C8 {${i + 1}}: ${glyph} ${opt ? opt.label : ""}`);
      }
      showFormSafe(player, removeForm, (rRes) => {
        if (rRes.canceled || rRes.selection === void 0) {
          openEmojiDeckSettingsUI(player, blockLoc);
          return;
        }
        const removed = currentDeck.splice(rRes.selection, 1)[0];
        player.sendMessage(`\xA7e\u2796 \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u304B\u3089 ${removed} \u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\uFF08\u6B8B\u308A ${currentDeck.length} \u500B\uFF09\xA7r`);
        openEmojiDeckSettingsUI(player, blockLoc);
      });
    } else if (res.selection === 2) {
      playerEmojiDeckMap.set(player.id, ["\uE101", "\uE102", "\uE104", "\uE10B"]);
      player.sendMessage("\xA7b\u{1F504} \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u3092\u521D\u671F\u8A2D\u5B9A\uFF084\u500B\uFF09\u306B\u623B\u3057\u307E\u3057\u305F\u3002\xA7r");
      openEmojiDeckSettingsUI(player, blockLoc);
    } else {
      openNoteBoardUI(player, blockLoc);
    }
  });
}
function openAllInOneNoteModal(player, blockLoc) {
  const currentDeck = getPlayerEmojiDeck(player);
  const emojiDeckList = [
    "(\u306A\u3057)",
    ...reactionOptions.map((o) => `${o.glyph} ${o.label}`)
  ];
  const modal = new ModalFormData().title("\u{1F4DD} Misskey \u30CE\u30FC\u30C8\u6295\u7A3F").textField(
    `\u672C\u6587 (\u6587\u7AE0\u4E2D\u306E\u597D\u304D\u306A\u5834\u6240\u306B {1}\u301C{${currentDeck.length}} \u3068\u66F8\u304F\u3068\u7D75\u6587\u5B57\u304C\u5165\u308A\u307E\u3059):`,
    "\u4F8B: \u4ECA\u65E5\u306F {1} \u3068\u4E00\u7DD2\u306B {2} \u3092\u98DF\u3079\u305F\u3088\uFF01",
    ""
  );
  for (let i = 0; i < currentDeck.length; i++) {
    const defaultGlyph = currentDeck[i];
    const defaultIdx = reactionOptions.findIndex((o) => o.glyph === defaultGlyph) + 1;
    modal.dropdown(`\u{1F3A8} \u7D75\u6587\u5B57\u30C7\u30C3\u30AD {${i + 1}}:`, emojiDeckList, defaultIdx > 0 ? defaultIdx : 0);
  }
  showFormSafe(player, modal, (res) => {
    if (res.canceled || !res.formValues) return;
    let text = String(res.formValues[0]).trim();
    const selectedEmojis = [];
    let hasPlaceholder = false;
    for (let i = 0; i < currentDeck.length; i++) {
      const formValIdx = Number(res.formValues[i + 1]);
      const glyph = formValIdx > 0 ? reactionOptions[formValIdx - 1].glyph : "";
      const placeholder = `{${i + 1}}`;
      if (text.includes(placeholder)) {
        text = text.split(placeholder).join(glyph);
        hasPlaceholder = true;
      } else if (glyph) {
        selectedEmojis.push(glyph);
      }
    }
    if (!hasPlaceholder && selectedEmojis.length > 0) {
      text = text ? `${text} ${selectedEmojis.join(" ")}` : selectedEmojis.join(" ");
    }
    for (const [key, glyph] of Object.entries(emojiMap)) {
      if (text.includes(key)) {
        text = text.split(key).join(glyph);
      }
    }
    if (!text.trim()) {
      player.sendMessage("\xA7c\u26A0\uFE0F \u672C\u6587\u307E\u305F\u306F\u7D75\u6587\u5B57\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\xA7r");
      return;
    }
    const newNote = {
      id: `note_${Date.now()}`,
      author: player.name,
      instance: "local.misskey",
      content: text.trim(),
      timestamp: Date.now(),
      reactions: {}
    };
    globalNotes.unshift(newNote);
    if (globalNotes.length > 50) globalNotes.pop();
    player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
    player.dimension.spawnParticle("minecraft:villager_happy", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.5, z: blockLoc.z + 0.5 });
    world.sendMessage(`\xA7a\u{1F4E2} [${player.name}@local.misskey] \u304C\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u307E\u3057\u305F: \u300C${text.trim()}\u300D\xA7r`);
  });
}
function openNoteBoardUI(player, blockLoc) {
  const unreadCount = directMessages.filter((m) => m.recipient === player.name && !m.read).length;
  const dmBadge = unreadCount > 0 ? ` (${unreadCount}\u4EF6\u672A\u8AAD)` : "";
  const deckCount = getPlayerEmojiDeck(player).length;
  const form = new ActionFormData().title("\u{1F4CB} Misskey \u30CE\u30FC\u30C8\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3 & \u30DD\u30FC\u30BF\u30EB").body("Misskey\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u63B2\u793A\u677F\u3067\u3059\u3002\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u305F\u308A\u3001DM\u3084\u91D1\u878D\u53D6\u5F15\uFF08\u682A\u30FBFX\u30FBATM\uFF09\u3092\u5229\u7528\u3067\u304D\u307E\u3059\uFF01").button("\u{1F4DD} \u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3059\u308B").button(`\u2699\uFE0F \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA (${deckCount}\u30B9\u30ED\u30C3\u30C8)`).button("\u{1F4DC} \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u898B\u308B / \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3").button(`\u2709\uFE0F \u30C0\u30A4\u30EC\u30AF\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8 (DM)${dmBadge}`).button("\u{1F4B9} Misskey\u8A3C\u5238 & FX\u53D6\u5F15\u6240 / \u{1F3E6} ATM").button("\u9589\u3058\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection === 0) {
      openAllInOneNoteModal(player, blockLoc);
    } else if (response.selection === 1) {
      openEmojiDeckSettingsUI(player, blockLoc);
    } else if (response.selection === 2) {
      openTimelineListUI(player, blockLoc);
    } else if (response.selection === 3) {
      openDMHubUI(player, blockLoc);
    } else if (response.selection === 4) {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function getReactionSummary(note) {
  const counts = {};
  for (const emoji of Object.values(note.reactions)) {
    counts[emoji] = (counts[emoji] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `[${k}x${v}]`).join(" ");
}
function getReactorsDetail(note) {
  const grouped = {};
  for (const [pName, emoji] of Object.entries(note.reactions)) {
    if (!grouped[emoji]) grouped[emoji] = [];
    grouped[emoji].push(pName);
  }
  if (Object.keys(grouped).length === 0) return "\u307E\u3060\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093";
  return Object.entries(grouped).map(([emoji, users]) => `${emoji} (${users.length}): ${users.join(", ")}`).join("\n");
}
function openTimelineListUI(player, blockLoc) {
  const form = new ActionFormData().title("\u{1F4DC} \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4E00\u89A7").body(globalNotes.length === 0 ? "\u6295\u7A3F\u3055\u308C\u305F\u30CE\u30FC\u30C8\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u300C\u65B0\u898F\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u300D\u304B\u3089\u3064\u3076\u3084\u3044\u3066\u307F\u307E\u3057\u3087\u3046\uFF01" : "\u30CE\u30FC\u30C8\u3092\u9078\u629E\u3057\u3066\u8A73\u7D30\u30FB\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u30FB\u524A\u9664\u304C\u3067\u304D\u307E\u3059:");
  for (const n of globalNotes) {
    const reactSummary = getReactionSummary(n);
    form.button(`${n.author}: ${n.content.substring(0, 18)}...
${reactSummary || "\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306A\u3057"}`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection >= globalNotes.length) return;
    const note = globalNotes[response.selection];
    openNoteDetailUI(player, note, blockLoc);
  });
}
function openNoteDetailUI(player, note, blockLoc) {
  const myReaction = note.reactions[player.name];
  const myReactText = myReaction ? ` (\u3042\u306A\u305F\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3: ${myReaction})` : "";
  const reactorsText = getReactorsDetail(note);
  const isAuthorOrOp = note.author === player.name || player.isOp();
  const form = new ActionFormData().title(`\u{1F4DD} \u30CE\u30FC\u30C8\u8A73\u7D30: @${note.author}`).body(`\u300C${note.content}\u300D

\u{1F496} \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u4E00\u89A7:${myReactText}
${reactorsText}`).button(myReaction ? `\u{1F504} \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u5909\u66F4\u3059\u308B (${myReaction})` : "\u{1F496} \u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3059\u308B");
  if (myReaction) {
    form.button(`\u274C \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3059 (${myReaction})`);
  }
  if (isAuthorOrOp) {
    form.button("\u{1F5D1}\uFE0F \u3053\u306E\u30CE\u30FC\u30C8\u3092\u524A\u9664\u3059\u308B");
  }
  form.button("\u{1F519} \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    let buttonIndex = 0;
    const reactBtn = buttonIndex++;
    const unreactBtn = myReaction ? buttonIndex++ : -1;
    const deleteBtn = isAuthorOrOp ? buttonIndex++ : -1;
    if (response.selection === reactBtn) {
      const pickForm = new ActionFormData().title("\u{1F3A8} \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u7D75\u6587\u5B57\u3092\u9078\u629E").body(myReaction ? `\u73FE\u5728\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3: ${myReaction}
\u5225\u306E\u7D75\u6587\u5B57\u3092\u9078\u3076\u3068\u5909\u66F4\u3055\u308C\u307E\u3059:` : "\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3057\u305F\u3044\u7D75\u6587\u5B57\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044:");
      if (myReaction) {
        pickForm.button("\u274C \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3059\uFF08\u89E3\u9664\uFF09");
      }
      for (const opt of reactionOptions) {
        pickForm.button(`${opt.glyph} ${opt.label}`);
      }
      showFormSafe(player, pickForm, (pRes) => {
        if (pRes.canceled || pRes.selection === void 0) return;
        if (myReaction && pRes.selection === 0) {
          delete note.reactions[player.name];
          player.sendMessage("\xA7e\u274C \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F\u3002\xA7r");
          openNoteDetailUI(player, note, blockLoc);
          return;
        }
        const optionIndex = myReaction ? pRes.selection - 1 : pRes.selection;
        const chosen = reactionOptions[optionIndex];
        if (chosen) {
          note.reactions[player.name] = chosen.glyph;
          player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
          player.sendMessage(`\xA7d\u{1F496} ${note.author} \u306E\u30CE\u30FC\u30C8\u306B ${chosen.glyph} (${chosen.label}) \u3067\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3057\u307E\u3057\u305F\uFF01\xA7r`);
          openNoteDetailUI(player, note, blockLoc);
        }
      });
    } else if (response.selection === unreactBtn) {
      delete note.reactions[player.name];
      player.sendMessage("\xA7e\u274C \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F\u3002\xA7r");
      openNoteDetailUI(player, note, blockLoc);
    } else if (response.selection === deleteBtn) {
      const idx = globalNotes.findIndex((n) => n.id === note.id);
      if (idx !== -1) {
        globalNotes.splice(idx, 1);
        player.sendMessage("\xA7e\u{1F5D1}\uFE0F \u30CE\u30FC\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\xA7r");
      }
      openTimelineListUI(player, blockLoc);
    } else {
      openTimelineListUI(player, blockLoc);
    }
  });
}
function openReactionWandUI(player, targetName, targetLoc, targetEntity) {
  const form = new ActionFormData().title(`\u{1FA84} ${targetName} \u306B\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u9001\u308B`).body("\u9001\u308A\u305F\u3044\u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044:");
  for (const opt of reactionOptions) {
    form.button(`${opt.glyph} ${opt.label}`);
  }
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    const chosen = reactionOptions[res.selection];
    const dim = player.dimension;
    dim.spawnParticle("minecraft:heart_particle", { x: targetLoc.x, y: targetLoc.y + 1.5, z: targetLoc.z });
    dim.spawnParticle("minecraft:villager_happy", { x: targetLoc.x, y: targetLoc.y + 1.8, z: targetLoc.z });
    if (targetEntity) {
      try {
        const hp = targetEntity.getComponent(EntityComponentTypes.Health);
        if (hp && hp.currentValue < hp.effectiveMax) {
          hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 4));
        }
      } catch (e) {
      }
    }
    world.sendMessage(`\xA7d\u2728 [${player.name}] \u304C ${targetName} \u306B ${chosen.glyph} (${chosen.label}) \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u8D08\u308A\u307E\u3057\u305F\uFF01\xA7r`);
  });
}
var directMessages = [];
function openDMHubUI(player, blockLoc) {
  const myDMs = directMessages.filter((m) => m.recipient === player.name || m.sender === player.name);
  const unreadCount = directMessages.filter((m) => m.recipient === player.name && !m.read).length;
  const form = new ActionFormData().title("\u2709\uFE0F Misskey \u30C0\u30A4\u30EC\u30AF\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8 (DM)").body(`\u3042\u306A\u305F\u5B9B\u3066\u306E\u672A\u8AADDM: ${unreadCount} \u4EF6
\u76F8\u624B\u3092\u9078\u3093\u3067\u30D7\u30E9\u30A4\u30D9\u30FC\u30C8\u306A\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9001\u4FE1\u30FB\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002`).button("\u{1F4DD} \u65B0\u3057\u3044DM\u3092\u9001\u4FE1\u3059\u308B").button(`\u{1F4EC} \u53D7\u4FE1\u30C8\u30EC\u30A4\u3092\u898B\u308B (${unreadCount}\u4EF6\u672A\u8AAD)`).button("\u{1F4E4} \u9001\u4FE1\u6E08\u307F\u30E1\u30C3\u30BB\u30FC\u30B8").button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection === 0) {
      openSendDMUI(player, blockLoc);
    } else if (response.selection === 1) {
      openDMInboxUI(player, blockLoc);
    } else if (response.selection === 2) {
      openDMSentBoxUI(player, blockLoc);
    } else if (response.selection === 3 && blockLoc) {
      openNoteBoardUI(player, blockLoc);
    }
  });
}
function openSendDMUI(player, blockLoc, defaultTarget) {
  const allPlayers = world.getAllPlayers().map((p) => p.name).filter((name) => name !== player.name);
  if (allPlayers.length === 0 && !defaultTarget) {
    player.sendMessage("\xA7c\u26A0\uFE0F \u73FE\u5728\u30EF\u30FC\u30EB\u30C9\u5185\u306B\u4ED6\u306E\u30D7\u30EC\u30A4\u30E4\u30FC\u304C\u3044\u307E\u305B\u3093\u3002\xA7r");
    return;
  }
  const targetList = defaultTarget && !allPlayers.includes(defaultTarget) ? [defaultTarget, ...allPlayers] : allPlayers.length > 0 ? allPlayers : [defaultTarget || ""];
  const modal = new ModalFormData().title("\u{1F4DD} DM\uFF08\u30C0\u30A4\u30EC\u30AF\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8\uFF09\u306E\u9001\u4FE1").dropdown("\u9001\u4FE1\u5148\u30D7\u30EC\u30A4\u30E4\u30FC\u3092\u9078\u629E:", targetList, 0).textField("\u30E1\u30C3\u30BB\u30FC\u30B8\u672C\u6587\u3092\u5165\u529B (\u7D75\u6587\u5B57\u30B3\u30FC\u30C9\u3082\u4F7F\u7528\u53EF):", "\u4F8B: \u3042\u3068\u3067\u62E0\u70B9\u306B\u6765\u3066\uFF01 :blobcat:");
  showFormSafe(player, modal, (res) => {
    if (res.canceled || !res.formValues) return;
    const targetIndex = Number(res.formValues[0]);
    const targetName = targetList[targetIndex];
    let msgText = String(res.formValues[1]).trim();
    if (!targetName || !msgText) {
      player.sendMessage("\xA7c\u26A0\uFE0F \u9001\u4FE1\u5148\u307E\u305F\u306F\u672C\u6587\u304C\u7A7A\u3067\u3059\u3002\xA7r");
      return;
    }
    for (const [key, glyph] of Object.entries(emojiMap)) {
      if (msgText.includes(key)) {
        msgText = msgText.split(key).join(glyph);
      }
    }
    const newDM = {
      id: `dm_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
      sender: player.name,
      recipient: targetName,
      content: msgText,
      timestamp: Date.now(),
      read: false
    };
    directMessages.unshift(newDM);
    if (directMessages.length > 100) directMessages.pop();
    player.sendMessage(`\xA7a\u2709\uFE0F [@${targetName}] \u306BDM\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F: \u300C${msgText}\u300D\xA7r`);
    const recipientPlayer = world.getAllPlayers().find((p) => p.name === targetName);
    if (recipientPlayer) {
      recipientPlayer.sendMessage(`\xA7d\u{1F4EC} [Misskey DM from @${player.name}]: \xA7f${msgText}\xA7r`);
      recipientPlayer.dimension.spawnParticle("minecraft:heart_particle", {
        x: recipientPlayer.location.x,
        y: recipientPlayer.location.y + 1.8,
        z: recipientPlayer.location.z
      });
      recipientPlayer.dimension.spawnParticle("minecraft:villager_happy", {
        x: recipientPlayer.location.x,
        y: recipientPlayer.location.y + 2,
        z: recipientPlayer.location.z
      });
    }
  });
}
function openDMInboxUI(player, blockLoc) {
  const inbox = directMessages.filter((m) => m.recipient === player.name);
  const form = new ActionFormData().title("\u{1F4EC} DM \u53D7\u4FE1\u30C8\u30EC\u30A4").body(inbox.length === 0 ? "\u53D7\u4FE1\u3057\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093\u3002" : "\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9078\u629E\u3057\u3066\u8A73\u7D30\u78BA\u8A8D\u30FB\u8FD4\u4FE1\u30FB\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u304C\u3067\u304D\u307E\u3059:");
  for (const dm of inbox) {
    const unreadBadge = dm.read ? "" : "\xA7e[\u672A\u8AAD]\xA7r ";
    const reactBadge = dm.reaction ? ` [${dm.reaction}]` : "";
    form.button(`${unreadBadge}@${dm.sender}: ${dm.content.substring(0, 15)}...${reactBadge}`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection >= inbox.length) {
      openDMHubUI(player, blockLoc);
      return;
    }
    const selectedDM = inbox[response.selection];
    selectedDM.read = true;
    openDMDetailUI(player, selectedDM, blockLoc, true);
  });
}
function openDMSentBoxUI(player, blockLoc) {
  const sentBox = directMessages.filter((m) => m.sender === player.name);
  const form = new ActionFormData().title("\u{1F4E4} \u9001\u4FE1\u6E08\u307F DM \u4E00\u89A7").body(sentBox.length === 0 ? "\u9001\u4FE1\u3057\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3042\u308A\u307E\u305B\u3093\u3002" : "\u9001\u4FE1\u3057\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u4E00\u89A7:");
  for (const dm of sentBox) {
    const reactBadge = dm.reaction ? ` [\u76F8\u624B\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3: ${dm.reaction}]` : "";
    form.button(`To @${dm.recipient}: ${dm.content.substring(0, 18)}...${reactBadge}`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection >= sentBox.length) {
      openDMHubUI(player, blockLoc);
      return;
    }
    const selectedDM = sentBox[response.selection];
    openDMDetailUI(player, selectedDM, blockLoc, false);
  });
}
function openDMDetailUI(player, dm, blockLoc, isInbox = true) {
  const reactInfo = dm.reaction ? `
\u{1F496} \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3: ${dm.reaction}` : "";
  const form = new ActionFormData().title(`\u2709\uFE0F DM: @${dm.sender} \u2192 @${dm.recipient}`).body(`\u5DEE\u51FA\u4EBA: @${dm.sender}
\u5B9B\u5148: @${dm.recipient}

\u300C${dm.content}\u300D${reactInfo}`);
  if (isInbox) {
    form.button("\u{1F4AC} \u3053\u306EDM\u306B\u8FD4\u4FE1\u3059\u308B");
    form.button(dm.reaction ? `\u{1F504} \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u5909\u66F4\u3059\u308B (${dm.reaction})` : "\u{1F496} \u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3059\u308B");
    if (dm.reaction) {
      form.button("\u274C \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3059");
    }
  }
  form.button("\u{1F5D1}\uFE0F \u3053\u306EDM\u3092\u524A\u9664\u3059\u308B");
  form.button("\u{1F519} \u4E00\u89A7\u306B\u623B\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (isInbox) {
      let bIdx = 0;
      const replyBtn = bIdx++;
      const reactBtn = bIdx++;
      const unreactBtn = dm.reaction ? bIdx++ : -1;
      const delBtn = bIdx++;
      if (response.selection === replyBtn) {
        openSendDMUI(player, blockLoc, dm.sender);
      } else if (response.selection === reactBtn) {
        const pickForm = new ActionFormData().title("\u{1F3A8} DM\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u9078\u629E");
        for (const opt of reactionOptions) {
          pickForm.button(`${opt.glyph} ${opt.label}`);
        }
        showFormSafe(player, pickForm, (pRes) => {
          if (pRes.canceled || pRes.selection === void 0) return;
          const chosen = reactionOptions[pRes.selection];
          dm.reaction = chosen.glyph;
          player.sendMessage(`\xA7d\u{1F496} @${dm.sender} \u304B\u3089\u306EDM\u306B ${chosen.glyph} \u3067\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3057\u307E\u3057\u305F\uFF01\xA7r`);
          const senderPlayer = world.getAllPlayers().find((p) => p.name === dm.sender);
          if (senderPlayer) {
            senderPlayer.sendMessage(`\xA7d\u{1F496} [@${player.name}] \u304C\u3042\u306A\u305F\u306EDM\u306B ${chosen.glyph} \u3067\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3057\u307E\u3057\u305F\uFF01\xA7r`);
          }
          openDMDetailUI(player, dm, blockLoc, isInbox);
        });
      } else if (response.selection === unreactBtn) {
        delete dm.reaction;
        player.sendMessage("\xA7e\u274C DM\u306E\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F\u3002\xA7r");
        openDMDetailUI(player, dm, blockLoc, isInbox);
      } else if (response.selection === delBtn) {
        const idx = directMessages.findIndex((m) => m.id === dm.id);
        if (idx !== -1) directMessages.splice(idx, 1);
        player.sendMessage("\xA7e\u{1F5D1}\uFE0F DM\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\xA7r");
        openDMInboxUI(player, blockLoc);
      } else {
        openDMInboxUI(player, blockLoc);
      }
    } else {
      if (response.selection === 0) {
        const idx = directMessages.findIndex((m) => m.id === dm.id);
        if (idx !== -1) directMessages.splice(idx, 1);
        player.sendMessage("\xA7e\u{1F5D1}\uFE0F \u9001\u4FE1\u6E08\u307FDM\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\xA7r");
        openDMSentBoxUI(player, blockLoc);
      } else {
        openDMSentBoxUI(player, blockLoc);
      }
    }
  });
}
var YEN_ITEMS = [
  { typeId: "mi:yen_10000", value: 1e4, name: "10,000 M\u7D19\u5E63" },
  { typeId: "mi:yen_5000", value: 5e3, name: "5,000 M\u7D19\u5E63" },
  { typeId: "mi:yen_2000", value: 2e3, name: "2,000 M\u7D19\u5E63" },
  { typeId: "mi:yen_1000", value: 1e3, name: "1,000 M\u7D19\u5E63" },
  { typeId: "mi:yen_500", value: 500, name: "500 M\u786C\u8CA8" },
  { typeId: "mi:yen_100", value: 100, name: "100 M\u786C\u8CA8" },
  { typeId: "mi:yen_50", value: 50, name: "50 M\u786C\u8CA8" },
  { typeId: "mi:yen_10", value: 10, name: "10 M\u786C\u8CA8" },
  { typeId: "mi:yen_5", value: 5, name: "5 M\u786C\u8CA8" },
  { typeId: "mi:yen_1", value: 1, name: "1 M\u786C\u8CA8" }
];
var SELLABLE_ITEMS = [
  { typeId: "minecraft:iron_ingot", name: "\u9244\u30A4\u30F3\u30B4\u30C3\u30C8", price: 100 },
  { typeId: "minecraft:gold_ingot", name: "\u91D1\u30A4\u30F3\u30B4\u30C3\u30C8", price: 500 },
  { typeId: "minecraft:emerald", name: "\u30A8\u30E1\u30E9\u30EB\u30C9", price: 1e3 },
  { typeId: "minecraft:diamond", name: "\u30C0\u30A4\u30E4\u30E2\u30F3\u30C9", price: 3e3 },
  { typeId: "minecraft:netherite_ingot", name: "\u30CD\u30B6\u30E9\u30A4\u30C8\u30A4\u30F3\u30B4\u30C3\u30C8", price: 15e3 },
  { typeId: "mi:machida", name: "\u753A\u7530", price: 500 },
  { typeId: "mi:sanjuu", name: "\u4E09\u91CD", price: 500 },
  { typeId: "mi:silenthill", name: "\u9759\u5CA1", price: 500 },
  { typeId: "mi:gif", name: "\u5C90\u961C", price: 500 },
  { typeId: "mi:blob_aichi", name: "\u9854\u306E\u3064\u3044\u305F\u611B\u77E5", price: 500 },
  { typeId: "mi:bunchou", name: "\u6587\u9CE5", price: 800 },
  { typeId: "mi:anko", name: "\u3042\u3093\u3053", price: 300 },
  { typeId: "mi:ecology_server", name: "\u751F\u614B\u30B5\u30FC\u30D0\u30FC", price: 4e3 },
  { typeId: "mi:baked_mochocho", name: "\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7", price: 400 }
];
var playerBankBalanceMap = /* @__PURE__ */ new Map();
var playerStockHoldingsMap = /* @__PURE__ */ new Map();
var playerFxPositionsMap = /* @__PURE__ */ new Map();
function getPlayerBankAccount(player) {
  let bal = playerBankBalanceMap.get(player.id);
  if (bal === void 0) {
    try {
      const prop = player.getDynamicProperty("mi_bank_balance");
      if (typeof prop === "number") {
        bal = prop;
      }
    } catch (e) {
    }
    if (bal === void 0) {
      bal = 5e3;
      setPlayerBankAccount(player, bal);
      player.sendMessage("\xA76\u{1F3E6}\u2728 [Misskey\u9280\u884C] \u53E3\u5EA7\u958B\u8A2D\u304A\u3081\u3067\u3068\u3046\u3054\u3056\u3044\u307E\u3059\uFF01 \u53E3\u5EA7\u958B\u8A2D\u795D\u3044\u91D1 \xA7e5,000 M\xA76 \u3092\u53E3\u5EA7\u306B\u4ED8\u4E0E\u3057\u307E\u3057\u305F\uFF01\xA7r");
    } else {
      playerBankBalanceMap.set(player.id, bal);
    }
  }
  return bal;
}
function setPlayerBankAccount(player, balance) {
  balance = Math.max(0, Math.floor(balance));
  playerBankBalanceMap.set(player.id, balance);
  try {
    player.setDynamicProperty("mi_bank_balance", balance);
  } catch (e) {
  }
}
function countPlayerCash(player) {
  try {
    const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inv) return 0;
    let total = 0;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (!item) continue;
      const found = YEN_ITEMS.find((y) => y.typeId === item.typeId);
      if (found) {
        total += found.value * item.amount;
      }
    }
    return total;
  } catch (e) {
    return 0;
  }
}
function depositAllCash(player) {
  try {
    const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inv) return 0;
    let totalDeposited = 0;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (!item) continue;
      const found = YEN_ITEMS.find((y) => y.typeId === item.typeId);
      if (found) {
        totalDeposited += found.value * item.amount;
        inv.setItem(i, void 0);
      }
    }
    if (totalDeposited > 0) {
      const current = getPlayerBankAccount(player);
      setPlayerBankAccount(player, current + totalDeposited);
    }
    return totalDeposited;
  } catch (e) {
    return 0;
  }
}
function withdrawCash(player, amount) {
  const current = getPlayerBankAccount(player);
  if (current < amount || amount <= 0) return false;
  try {
    const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (!inv) return false;
    let remaining = amount;
    const itemsToAdd = [];
    for (const yen of YEN_ITEMS) {
      if (remaining >= yen.value) {
        const count = Math.floor(remaining / yen.value);
        itemsToAdd.push({ typeId: yen.typeId, count });
        remaining %= yen.value;
      }
    }
    setPlayerBankAccount(player, current - amount);
    for (const add of itemsToAdd) {
      let countRemaining = add.count;
      while (countRemaining > 0) {
        const stack = Math.min(countRemaining, 64);
        inv.addItem(new ItemStack(add.typeId, stack));
        countRemaining -= stack;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}
function getPlayerStockHoldings(player) {
  let holdings = playerStockHoldingsMap.get(player.id);
  if (!holdings) {
    holdings = {};
    try {
      const saved = player.getDynamicProperty("mi_stock_holdings");
      if (typeof saved === "string") {
        holdings = JSON.parse(saved);
      }
    } catch (e) {
    }
    playerStockHoldingsMap.set(player.id, holdings);
  }
  return holdings;
}
function setPlayerStockHoldings(player, holdings) {
  playerStockHoldingsMap.set(player.id, holdings);
  try {
    player.setDynamicProperty("mi_stock_holdings", JSON.stringify(holdings));
  } catch (e) {
  }
}
function getPlayerFxPositions(player) {
  let positions = playerFxPositionsMap.get(player.id);
  if (!positions) {
    positions = [];
    try {
      const saved = player.getDynamicProperty("mi_fx_positions");
      if (typeof saved === "string") {
        positions = JSON.parse(saved);
      }
    } catch (e) {
    }
    playerFxPositionsMap.set(player.id, positions);
  }
  return positions;
}
function setPlayerFxPositions(player, positions) {
  playerFxPositionsMap.set(player.id, positions);
  try {
    player.setDynamicProperty("mi_fx_positions", JSON.stringify(positions));
  } catch (e) {
  }
}
var fxPairs = [
  {
    id: "FED_M",
    name: "Fediverse\u30AF\u30EC\u30B8\u30C3\u30C8 / M\u30B3\u30A4\u30F3 (FED/M)",
    symbol: "FED",
    baseRate: 155,
    currentRate: 155,
    prevRate: 155,
    volatility: 0.35,
    history: [154.8, 155, 155.2, 155],
    description: "Fediverse\u9023\u5408\u306E\u57FA\u8EF8\u30AF\u30EC\u30B8\u30C3\u30C8\u3002\u30AA\u30F3\u30E9\u30A4\u30F3\u30B9\u30C8\u30A2\u6C7A\u6E08\u306B\u5BFE\u5FDC\u3002"
  },
  {
    id: "BLOB_M",
    name: "\u30D6\u30ED\u30C3\u30D6\u30B3\u30A4\u30F3 / M\u30B3\u30A4\u30F3 (BLOB/M)",
    symbol: "BLOB",
    baseRate: 168,
    currentRate: 168,
    prevRate: 168,
    volatility: 0.55,
    history: [167.5, 168, 168.2, 168],
    description: "\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u7D4C\u6E08\u570F\u306E\u4E3B\u8981\u30C8\u30FC\u30AF\u30F3\u3002\u30DC\u30E9\u30C6\u30A3\u30EA\u30C6\u30A3\u4E2D\u3002"
  },
  {
    id: "NEKO_M",
    name: "\u3092\u306D\u3053\u30C8\u30FC\u30AF\u30F3 / M\u30B3\u30A4\u30F3 (NEKO/M)",
    symbol: "NEKO",
    baseRate: 850,
    currentRate: 850,
    prevRate: 850,
    volatility: 12,
    history: [840, 855, 848, 850],
    description: "\u3092\u306D\u3053\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u306E\u5E0C\u5C11\u30C8\u30FC\u30AF\u30F3\u3002\u30DC\u30E9\u30C6\u30A3\u30EA\u30C6\u30A3\u9AD8\u3002"
  },
  {
    id: "MCC_M",
    name: "\u30E2\u30C1\u30E7\u30B3\u30A4\u30F3 / M\u30B3\u30A4\u30F3 (MCC/M)",
    symbol: "MCC",
    baseRate: 12.5,
    currentRate: 12.5,
    prevRate: 12.5,
    volatility: 2.2,
    history: [10.2, 14.8, 11.5, 12.5],
    description: "\u30E2\u30C1\u30E7\u30C1\u30E7\u767A\u7965\u306E\u8D85\u30CF\u30A4\u30EA\u30B9\u30AF\u8349\u30B3\u30A4\u30F3\u3002\u7206\u4E0A\u3052\u30FB\u5927\u66B4\u843D\u3042\u308A\uFF01"
  }
];
function updateFxRates() {
  for (const pair of fxPairs) {
    pair.prevRate = pair.currentRate;
    const delta = (Math.random() - 0.495) * pair.volatility * (1 + (Math.random() - 0.5));
    const meanReversion = (pair.baseRate - pair.currentRate) * 0.05;
    let newRate = pair.currentRate + delta + meanReversion;
    newRate = Math.max(0.01, parseFloat(newRate.toFixed(2)));
    pair.currentRate = newRate;
    pair.history.push(newRate);
    if (pair.history.length > 8) pair.history.shift();
  }
}
function calculatePositionProfit(pos, currentRate) {
  if (pos.type === "BUY") {
    return Math.floor((currentRate - pos.entryRate) * pos.volume);
  } else {
    return Math.floor((pos.entryRate - currentRate) * pos.volume);
  }
}
var stockMarket = [
  {
    code: "SYUIL",
    name: "\u3057\u3085\u3044\u308D\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2",
    basePrice: 5e3,
    currentPrice: 5e3,
    prevPrice: 5e3,
    volatility: 0.08,
    dividendRate: 0.01,
    history: [4900, 5100, 4950, 5e3],
    sector: "\u60C5\u5831\u30FB\u901A\u4FE1",
    description: "Misskey\u306E\u958B\u767A\u30FB\u904B\u55B6\u3002\u5927\u578B\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u3067\u6025\u9A30\u3001\u969C\u5BB3\u3067\u6025\u843D\u3002"
  },
  {
    code: "TUTI",
    name: "\u6751\u4E0A\u30C4\u30C1\u30CE\u30B3\u5546\u4E8B",
    basePrice: 1200,
    currentPrice: 1200,
    prevPrice: 1200,
    volatility: 0.04,
    dividendRate: 0.025,
    history: [1180, 1220, 1195, 1200],
    sector: "\u5378\u58F2\u30FB\u30D0\u30A4\u30AA",
    description: "\u751F\u4F53\u30B5\u30FC\u30D0\u30FC\u3068\u3042\u3093\u3053\u3092\u6271\u3046\u7DCF\u5408\u5546\u793E\u3002\u5B89\u5B9A\u6210\u9577\u30FB\u9AD8\u914D\u5F53\u9298\u67C4\u3002"
  },
  {
    code: "YHATA",
    name: "\u5B98\u55B6\u516B\u5E61\u88FD\u9244",
    basePrice: 3500,
    currentPrice: 3500,
    prevPrice: 3500,
    volatility: 0.03,
    dividendRate: 0.02,
    history: [3450, 3520, 3480, 3500],
    sector: "\u9244\u92FC\u30FB\u91CD\u5DE5\u696D",
    description: "\u5927\u7159\u7A81\u3068\u9AD8\u7089\u3092\u64C1\u3059\u308B\u4F1D\u7D71\u306E\u88FD\u9244\u4F01\u696D\u3002\u4E0D\u6CC1\u306B\u5F37\u3044\u30C7\u30A3\u30D5\u30A7\u30F3\u30B7\u30D6\u682A\u3002"
  },
  {
    code: "RCAR",
    name: "\u30EC\u30B0\u30AB\u30FC\u81EA\u52D5\u8ECA\u5DE5\u696D",
    basePrice: 850,
    currentPrice: 850,
    prevPrice: 850,
    volatility: 0.09,
    dividendRate: 8e-3,
    history: [820, 890, 840, 850],
    sector: "\u81EA\u52D5\u8ECA\u30FB\u8F38\u9001\u6A5F\u5668",
    description: "\u9577\u3044\u5909\u306A\u8ECA\u306E\u88FD\u9020\u5143\u3002\u65B0\u8272\u767A\u8868\u3067\u4E0A\u6607\u3001\u4E8B\u6545\u591A\u767A\u3067\u4E0B\u843D\u3002"
  },
  {
    code: "MOCHO",
    name: "\u30E2\u30C1\u30E7\u30C1\u30E7\u88FD\u83D3",
    basePrice: 300,
    currentPrice: 300,
    prevPrice: 300,
    volatility: 0.15,
    dividendRate: 5e-3,
    history: [280, 360, 290, 300],
    sector: "\u98DF\u54C1",
    description: "\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u3068\u30D7\u30EA\u30F3\u306E\u88FD\u9020\u3002\u30D7\u30EA\u30F3\u30D6\u30FC\u30E0\u306710\u500D\u9AD8\u306B\u3082\u306A\u308B\u4ED5\u624B\u682A\u6C17\u8CEA\u3002"
  },
  {
    code: "YSNO",
    name: "\u4E0E\u8B1D\u91CE\u30ED\u30B8\u30B9\u30C6\u30A3\u30AF\u30B9",
    basePrice: 2400,
    currentPrice: 2400,
    prevPrice: 2400,
    volatility: 0.06,
    dividendRate: 0.018,
    history: [2350, 2450, 2380, 2400],
    sector: "\u7269\u6D41\u30FB\u8EE2\u9001",
    description: "\u753A\u7530\u30FB\u795E\u5948\u5DDD\u9593\u306E\u30A8\u30F3\u30C0\u30FC\u30D1\u30FC\u30EB\u7A7A\u9593\u8EE2\u9001\u3092\u624B\u639B\u3051\u308B\u6B21\u4E16\u4EE3\u7269\u6D41\u4F01\u696D\u3002"
  }
];
var marketNewsHistory = [];
function saveMarketWorldData() {
  try {
    const fxData = {};
    for (const pair of fxPairs) {
      fxData[pair.id] = {
        currentRate: pair.currentRate,
        prevRate: pair.prevRate,
        history: pair.history
      };
    }
    world.setDynamicProperty("mi_fx_market_rates", JSON.stringify(fxData));
    const stockData = {};
    for (const stock of stockMarket) {
      stockData[stock.code] = {
        currentPrice: stock.currentPrice,
        prevPrice: stock.prevPrice,
        history: stock.history
      };
    }
    world.setDynamicProperty("mi_stock_market_prices", JSON.stringify(stockData));
    world.setDynamicProperty("mi_news_history_data", JSON.stringify(marketNewsHistory.slice(0, 20)));
  } catch (e) {
    console.warn("[Mi_Addon] Failed to save market data to world: " + e);
  }
}
function loadMarketWorldData() {
  try {
    const fxJson = world.getDynamicProperty("mi_fx_market_rates");
    if (typeof fxJson === "string") {
      const fxData = JSON.parse(fxJson);
      for (const pair of fxPairs) {
        if (fxData[pair.id]) {
          pair.currentRate = fxData[pair.id].currentRate ?? pair.currentRate;
          pair.prevRate = fxData[pair.id].prevRate ?? pair.prevRate;
          if (Array.isArray(fxData[pair.id].history)) {
            pair.history = fxData[pair.id].history;
          }
        }
      }
    }
    const stockJson = world.getDynamicProperty("mi_stock_market_prices");
    if (typeof stockJson === "string") {
      const stockData = JSON.parse(stockJson);
      for (const stock of stockMarket) {
        if (stockData[stock.code]) {
          stock.currentPrice = stockData[stock.code].currentPrice ?? stock.currentPrice;
          stock.prevPrice = stockData[stock.code].prevPrice ?? stock.prevPrice;
          if (Array.isArray(stockData[stock.code].history)) {
            stock.history = stockData[stock.code].history;
          }
        }
      }
    }
    const newsJson = world.getDynamicProperty("mi_news_history_data");
    if (typeof newsJson === "string") {
      const newsData = JSON.parse(newsJson);
      if (Array.isArray(newsData)) {
        marketNewsHistory.length = 0;
        for (const n of newsData) {
          marketNewsHistory.push(n);
        }
      }
    }
  } catch (e) {
    console.warn("[Mi_Addon] Failed to load market data from world: " + e);
  }
}
loadMarketWorldData();
var STOCK_NEWS_TEMPLATES = [
  // SYUIL (しゅいろソフトウェア)
  { title: "\u{1F680}\u3010\u901F\u5831\u3011\u3057\u3085\u3044\u308D\u6C0F\u3001\u65B0\u6A5F\u80FD\u3092\u7DCA\u6025\u30C7\u30D7\u30ED\u30A4\uFF01", content: "Misskey\u306B\u9769\u65B0\u7684\u306A\u65B0\u6A5F\u80FD\u304C\u5B9F\u88C5\u3055\u308C\u3001\u30E6\u30FC\u30B6\u30FC\u6570\u304C\u7206\u767A\u7684\u306B\u5897\u52A0\u3057\u3066\u3044\u307E\u3059\uFF01", code: "SYUIL", minImpact: 15, maxImpact: 35 },
  { title: "\u{1F4A5}\u3010\u969C\u5BB3\u3011Misskey\u958B\u767A\u6240\u306E\u751F\u4F53\u30B5\u30FC\u30D0\u30FC\u304C\u4E00\u6642\u30C0\u30A6\u30F3", content: "\u30A2\u30AF\u30BB\u30B9\u96C6\u4E2D\u306B\u3088\u308A\u958B\u767A\u5BA4\u306E\u30B5\u30FC\u30D0\u30FC\u304C\u904E\u71B1\u3002\u30A8\u30F3\u30B8\u30CB\u30A2\u304C\u7DCA\u6025\u5FA9\u65E7\u5BFE\u5FDC\u4E2D\u3067\u3059\u3002", code: "SYUIL", minImpact: -25, maxImpact: -10 },
  { title: "\u{1F31F}\u3010\u65B0\u7248\u3011Misskey\u30E1\u30B8\u30E3\u30FC\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8\u516C\u958B\uFF01", content: "\u4E16\u754C\u30C8\u30EC\u30F3\u30C91\u4F4D\u3092\u7372\u5F97\u3057\u3001\u65B0\u898F\u30B5\u30FC\u30D0\u30FC\u8A2D\u7ACB\u30E9\u30C3\u30B7\u30E5\u304C\u767A\u751F\u3057\u3066\u3044\u307E\u3059\u3002", code: "SYUIL", minImpact: 20, maxImpact: 40 },
  { title: "\u{1F916}\u3010AI\u3011Misskey AI\u81EA\u52D5\u30CE\u30FC\u30C8\u751F\u6210\u306E\u30D9\u30FC\u30BF\u7248\u304C\u89E3\u7981", content: "\u9AD8\u5EA6\u306AAI\u6A5F\u80FD\u306E\u5C0E\u5165\u304C\u767A\u8868\u3055\u308C\u3001IT\u696D\u754C\u304B\u3089\u306E\u6CE8\u76EE\u304C\u4E00\u6C17\u306B\u96C6\u307E\u3063\u3066\u3044\u307E\u3059\u3002", code: "SYUIL", minImpact: 12, maxImpact: 26 },
  { title: "\u26A0\uFE0F\u3010\u30D0\u30B0\u3011\u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u9023\u6253\u306B\u3088\u308B\u30B5\u30FC\u30D0\u30FC\u9AD8\u8CA0\u8377", content: "\u4E00\u90E8\u306E\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u3067\u9023\u6253\u30B9\u30AF\u30EA\u30D7\u30C8\u306B\u3088\u308B\u9045\u5EF6\u304C\u767A\u751F\u3057\u3001\u61F8\u5FF5\u304C\u5E83\u304C\u3063\u3066\u3044\u307E\u3059\u3002", code: "SYUIL", minImpact: -18, maxImpact: -8 },
  // TUTI (村上ツチノコ商事)
  { title: "\u{1F40D}\u3010\u7279\u9700\u3011\u30C4\u30C1\u30CE\u30B3\u7E41\u6B96\u30D6\u30FC\u30E0\u5230\u6765\uFF01\u3042\u3093\u3053\u9700\u8981\u6025\u5897", content: "\u5404\u5730\u3067\u30C4\u30C1\u30CE\u30B3\u306E\u30DA\u30C3\u30C8\u5316\u304C\u9032\u307F\u3001\u3042\u3093\u3053\u304A\u3088\u3073\u751F\u4F53\u30B5\u30FC\u30D0\u30FC\u306E\u53D6\u5F15\u4FA1\u683C\u304C\u9AD8\u9A30\u3057\u3066\u3044\u307E\u3059\u3002", code: "TUTI", minImpact: 12, maxImpact: 28 },
  { title: "\u{1F52C}\u3010\u7279\u8A31\u3011\u751F\u614B\u30B5\u30FC\u30D0\u30FC\u9AD8\u52B9\u7387\u30D0\u30A4\u30AA\u6280\u8853\u306E\u7279\u8A31\u53D6\u5F97", content: "\u7E41\u6B96\u52B9\u7387\u30922\u500D\u306B\u3059\u308B\u65B0\u6280\u8853\u306E\u72EC\u5360\u6A29\u3092\u7372\u5F97\u3057\u3001\u696D\u7E3E\u4E88\u60F3\u3092\u4E0A\u65B9\u4FEE\u6B63\u3057\u307E\u3057\u305F\u3002", code: "TUTI", minImpact: 15, maxImpact: 32 },
  { title: "\u{1F327}\uFE0F\u3010\u4E0D\u4F5C\u3011\u539F\u6750\u6599\u306E\u30A2\u30BA\u30AD\u4E0D\u4F5C\u306B\u3088\u308A\u3042\u3093\u3053\u51FA\u8377\u5236\u9650", content: "\u7570\u5E38\u6C17\u8C61\u306B\u3088\u308B\u30A2\u30BA\u30AD\u306E\u53CE\u7A6B\u91CF\u6FC0\u6E1B\u304C\u5831\u3058\u3089\u308C\u3001\u5546\u793E\u90E8\u9580\u306E\u58F2\u4E0A\u6E1B\u304C\u61F8\u5FF5\u3055\u308C\u3066\u3044\u307E\u3059\u3002", code: "TUTI", minImpact: -22, maxImpact: -10 },
  { title: "\u{1F50D}\u3010\u6458\u767A\u3011\u5E02\u5834\u306B\u51FA\u56DE\u308B\u507D\u30C4\u30C1\u30CE\u30B3\u696D\u8005\u3092\u4E00\u6589\u6458\u767A", content: "\u4E0D\u6B63\u696D\u8005\u306E\u4E00\u6383\u306B\u3088\u308A\u6751\u4E0A\u30C4\u30C1\u30CE\u30B3\u5546\u4E8B\u306E\u6B63\u898F\u30D6\u30E9\u30F3\u30C9\u3078\u306E\u4FE1\u983C\u304C\u6025\u4E0A\u6607\u3057\u307E\u3057\u305F\u3002", code: "TUTI", minImpact: 10, maxImpact: 22 },
  // YHATA (官営八幡製鉄)
  { title: "\u{1F3ED}\u3010\u5897\u7523\u3011\u516B\u5E61\u88FD\u9244\u6240\u306E\u9AD8\u7089\u30D5\u30EB\u7A3C\u50CD\u3001\u9244\u92FC\u9700\u8981\u597D\u8ABF", content: "\u5DE8\u5927\u5EFA\u7BC9\u30D6\u30FC\u30E0\u306B\u4F34\u3044\u3001\u9AD8\u54C1\u8CEA\u306A\u88FD\u9244\u92FC\u6750\u306E\u53D7\u6CE8\u304C\u904E\u53BB\u6700\u9AD8\u3092\u8A18\u9332\u3057\u307E\u3057\u305F\u3002", code: "YHATA", minImpact: 8, maxImpact: 18 },
  { title: "\u{1F6E1}\uFE0F\u3010\u65B0\u7D20\u6750\u3011\u8D85\u9AD8\u786C\u5EA6\u30CD\u30B6\u30E9\u30A4\u30C8\u5408\u91D1\u306E\u91CF\u7523\u5316\u306B\u6210\u529F", content: "\u5F93\u6765\u306E\u9244\u92FC\u3092\u9065\u304B\u306B\u51CC\u99D5\u3059\u308B\u7279\u6B8A\u88C5\u7532\u92FC\u306E\u958B\u767A\u306B\u6210\u529F\u3057\u3001\u9632\u885B\u7523\u696D\u304B\u3089\u5927\u53E3\u53D7\u6CE8\u3092\u7372\u5F97\uFF01", code: "YHATA", minImpact: 18, maxImpact: 35 },
  { title: "\u{1F686}\u3010\u53D7\u6CE8\u3011\u5927\u9678\u6A2A\u65AD\u9244\u9053\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u306E\u30EC\u30FC\u30EB\u72EC\u5360\u4F9B\u7D66", content: "\u9577\u8DDD\u96E2\u30C8\u30ED\u30C3\u30B3\u9244\u9053\u306E\u6577\u8A2D\u7279\u9700\u306B\u3088\u308A\u3001\u6570\u5E74\u5148\u307E\u3067\u306E\u751F\u7523\u67A0\u304C\u57CB\u307E\u308A\u307E\u3057\u305F\u3002", code: "YHATA", minImpact: 12, maxImpact: 25 },
  { title: "\u26CF\uFE0F\u3010\u9AD8\u9A30\u3011\u8F38\u5165\u9244\u9271\u77F3\u4FA1\u683C\u306E\u9AD8\u9A30\u306B\u3088\u308A\u63A1\u7B97\u60AA\u5316\u61F8\u5FF5", content: "\u539F\u6750\u6599\u30B3\u30B9\u30C8\u306E\u6025\u4E0A\u6607\u304C\u5229\u76CA\u3092\u5727\u8FEB\u3059\u308B\u3068\u306E\u898B\u65B9\u304B\u3089\u58F2\u308A\u304C\u512A\u52E2\u3068\u306A\u3063\u3066\u3044\u307E\u3059\u3002", code: "YHATA", minImpact: -20, maxImpact: -8 },
  // RCAR (レグカー自動車工業)
  { title: "\u{1F697}\u3010\u65B0\u8272\u3011\u30EC\u30B0\u30AB\u30FC\u306B\u65B0\u8272\u30AB\u30E9\u30FC\u30EA\u30F3\u30B0\u304C\u767B\u5834\uFF01", content: "16\u8272\u30D5\u30EB\u5BFE\u5FDC\u306E\u65B0\u578B\u30EC\u30B0\u30AB\u30FC\u304C\u767A\u8868\u3055\u308C\u3001\u30B5\u30D0\u30F3\u30CA\u3067\u306E\u8A66\u4E57\u5E0C\u671B\u8005\u304C\u6BBA\u5230\u3057\u3066\u3044\u307E\u3059\u3002", code: "RCAR", minImpact: 12, maxImpact: 30 },
  { title: "\u{1F4A5}\u3010\u4E8B\u6545\u3011\u30B5\u30D0\u30F3\u30CA\u8857\u9053\u3067\u30EC\u30B0\u30AB\u30FC\u306E\u591A\u91CD\u6FC0\u7A81\u4E8B\u6545\u304C\u767A\u751F", content: "\u9AD8\u901F\u8D70\u884C\u4E2D\u306E\u30EC\u30B0\u30AB\u30FC\u304C\u58C1\u306B\u6FC0\u7A81\u5927\u7834\u3002\u5B89\u5168\u5BFE\u7B56\u3078\u306E\u61F8\u5FF5\u304B\u3089\u58F2\u308A\u304C\u5148\u884C\u3057\u3066\u3044\u307E\u3059\u3002", code: "RCAR", minImpact: -28, maxImpact: -12 },
  { title: "\u26A1\u3010\u767A\u8868\u3011\u65B0\u958B\u767A\u300C\u30BF\u30FC\u30DC\u30D6\u30FC\u30B9\u30BF\u30FC\u642D\u8F09\u30E2\u30C7\u30EB\u300D\u3092\u767A\u8868", content: "\u6700\u9AD8\u901F\u5EA61.5\u500D\u306E\u8D85\u9AD8\u901F\u4ED5\u69D8\u304C\u767A\u8868\u3055\u308C\u3001\u30E2\u30FC\u30BF\u30FC\u30B9\u30DD\u30FC\u30C4\u30D5\u30A1\u30F3\u304C\u71B1\u72C2\u3057\u3066\u3044\u307E\u3059\u3002", code: "RCAR", minImpact: 16, maxImpact: 35 },
  { title: "\u{1F3C6}\u3010\u512A\u52DD\u3011\u30B5\u30D0\u30F3\u30CA\u6A2A\u65AD\u30AD\u30E3\u30CE\u30F3\u30DC\u30FC\u30EB\u30E9\u30EA\u30FC\u3067\u7DCF\u5408\u512A\u52DD\uFF01", content: "\u904E\u9177\u306A\u60AA\u8DEF\u3092\u8D70\u7834\u3057\u5727\u5012\u7684\u306A\u8010\u4E45\u6027\u3068\u901F\u3055\u3092\u5B9F\u8A3C\u3001\u6CE8\u6587\u304C\u6BBA\u5230\u3057\u3066\u3044\u307E\u3059\u3002", code: "RCAR", minImpact: 14, maxImpact: 28 },
  { title: "\u{1F527}\u3010\u30EA\u30B3\u30FC\u30EB\u3011\u9577\u3059\u304E\u308B\u8ECA\u4F53\u306E\u66F2\u304C\u308A\u89D2\u5236\u5FA1\u3067\u70B9\u691C\u56DE\u53CE", content: "\u4E00\u90E8\u8ECA\u4E21\u3067\u6025\u30AB\u30FC\u30D6\u6642\u306E\u30D5\u30EC\u30FC\u30E0\u304D\u3057\u307F\u97F3\u304C\u767A\u751F\u3057\u3001\u7121\u511F\u70B9\u691C\u3092\u767A\u8868\u3057\u307E\u3057\u305F\u3002", code: "RCAR", minImpact: -22, maxImpact: -10 },
  // MOCHO (モチョチョ製菓)
  { title: "\u{1F36E}\u3010\u5927\u6D41\u884C\u3011\u30D7\u30EA\u30F3\u306E\u30C8\u30E9\u30F3\u30DD\u30EA\u30F3\u30B8\u30E3\u30F3\u30D7\u304CSNS\u3067\u5927\u30D0\u30BA\u308A\uFF01", content: "\u307D\u3088\u3093\u307D\u3088\u3093\u8DF3\u306D\u308B\u52D5\u753B\u304C\u30D0\u30BA\u308A\u3001\u30E2\u30C1\u30E7\u30C1\u30E7\u88FD\u83D3\u306E\u30D7\u30EA\u30F3\u304C\u5168\u56FD\u3067\u54C1\u5207\u308C\u7D9A\u51FA\uFF01", code: "MOCHO", minImpact: 25, maxImpact: 60 },
  { title: "\u{1F922}\u3010\u8B66\u544A\u3011\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u98DF\u3079\u904E\u304E\u306B\u3088\u308B\u5410\u304D\u6C17\u6CE8\u610F\u5831", content: "\u904E\u5270\u6442\u53D6\u306B\u3088\u308B\u4F53\u8ABF\u4E0D\u826F\u8005\u304C\u5831\u544A\u3055\u308C\u3001\u98DF\u54C1\u5B89\u5168\u59D4\u54E1\u4F1A\u304C\u6CE8\u610F\u3092\u547C\u3073\u304B\u3051\u3066\u3044\u307E\u3059\u3002", code: "MOCHO", minImpact: -30, maxImpact: -15 },
  { title: "\u{1F431}\u3010\u65B0\u5546\u54C1\u3011\u300C\u732B\u8033\u30D7\u30EA\u30F3\u300D\u304C\u82E5\u8005\u3092\u4E2D\u5FC3\u306B\u7A7A\u524D\u30D6\u30FC\u30E0", content: "\u98DF\u3079\u308B\u3068\u732B\u8033\u304C\u751F\u3048\u3066\u8DB3\u304C\u901F\u304F\u306A\u308B\u30B9\u30A4\u30FC\u30C4\u3068\u3057\u3066\u8A71\u984C\u6CB8\u9A30\u3001\u58F2\u308A\u4E0A\u3052\u304C\u500D\u5897\uFF01", code: "MOCHO", minImpact: 20, maxImpact: 45 },
  { title: "\u{1F396}\uFE0F\u3010\u30AE\u30CD\u30B9\u3011\u4E16\u754C\u6700\u5927\u306E\u5DE8\u5927\u30D7\u30EA\u30F3\u4F5C\u6210\u306B\u6210\u529F\u3001\u4E16\u754C\u8A18\u9332\u8A8D\u5B9A", content: "\u9AD8\u30555m\u306E\u8D85\u5DE8\u5927\u30D7\u30EA\u30F3\u3092\u5B8C\u6210\u3055\u305B\u3001\u4E16\u754C\u7684\u304A\u796D\u308A\u9A12\u304E\u306B\u767A\u5C55\u3057\u3066\u3044\u307E\u3059\uFF01", code: "MOCHO", minImpact: 15, maxImpact: 35 },
  // YSNO (与謝野ロジスティクス)
  { title: "\u{1F98B}\u3010\u7269\u6D41\u3011\u4E0E\u8B1D\u91CE\u6676\u5B50\u6C0F\u3001\u795E\u5948\u5DDD\u30FB\u753A\u7530\u9593\u306E\u8D85\u7A7A\u9593\u8F38\u9001\u30EB\u30FC\u30C8\u3092\u958B\u8A2D", content: "\u30A8\u30F3\u30C0\u30FC\u30D1\u30FC\u30EB\u8EE2\u9001\u7DB2\u306E\u62E1\u5145\u306B\u3088\u308A\u3001\u5373\u65E5\u914D\u9001\u30A8\u30EA\u30A2\u304C\u5927\u5E45\u306B\u62E1\u5927\u3057\u307E\u3057\u305F\u3002", code: "YSNO", minImpact: 12, maxImpact: 28 },
  { title: "\u{1F4E6}\u3010\u5B9F\u7528\u5316\u3011\u30A8\u30F3\u30C0\u30FC\u81EA\u52D5\u7A7A\u9593\u30C7\u30EA\u30D0\u30EA\u30FC\u306E\u5546\u696D\u904B\u884C\u958B\u59CB", content: "\u30C1\u30A7\u30B9\u30C8\u304B\u3089\u6307\u5B9A\u5834\u6240\u3078\u77AC\u6642\u306B\u8377\u7269\u3092\u98DB\u3070\u3059\u6B21\u4E16\u4EE3\u914D\u9001\u30B5\u30FC\u30D3\u30B9\u304C\u672C\u683C\u59CB\u52D5\uFF01", code: "YSNO", minImpact: 18, maxImpact: 34 },
  { title: "\u{1F300}\u3010\u9045\u5EF6\u3011\u7A7A\u9593\u8EE2\u9001\u30B2\u30FC\u30C8\u306E\u78C1\u5834\u4E71\u308C\u306B\u3088\u308A\u8377\u7269\u9045\u5EF6\u591A\u767A", content: "\u4E00\u6642\u7684\u306A\u7A7A\u9593\u306E\u6B6A\u307F\u306B\u3088\u308A\u4E00\u90E8\u914D\u9001\u4FBF\u306B\u5927\u5E45\u306A\u9045\u308C\u304C\u751F\u3058\u3001\u88DC\u511F\u8CBB\u7528\u304C\u767A\u751F\u3002", code: "YSNO", minImpact: -22, maxImpact: -9 },
  { title: "\u{1F30C}\u3010\u5B87\u5B99\u3011\u30B8\u30FB\u30A8\u30F3\u30C9\u5411\u3051\u8D85\u9577\u8DDD\u96E2\u30C7\u30EA\u30D0\u30EA\u30FC\u5B9F\u8A3C\u5B9F\u9A13\u306B\u6210\u529F", content: "\u7570\u6B21\u5143\u7A7A\u9593\u3092\u8DE8\u3050\u914D\u9001\u7DB2\u306E\u69CB\u7BC9\u306B\u6210\u529F\u3057\u3001\u7269\u6D41\u754C\u306E\u9769\u547D\u5150\u3068\u3057\u3066\u682A\u4FA1\u304C\u6025\u4E0A\u6607\uFF01", code: "YSNO", minImpact: 20, maxImpact: 40 }
];
var FX_NEWS_TEMPLATES = [
  // FED/M (Fediverseクレジット/Mコイン)
  { title: "\u{1F310}\u3010\u9023\u5408\u62E1\u5927\u3011Fediverse\u63A5\u7D9A\u30B5\u30FC\u30D0\u30FC\u6570\u304C10\u4E07\u53F0\u3092\u7A81\u7834\uFF01", content: "\u5206\u6563\u578BSNS\u306E\u7206\u767A\u7684\u62E1\u5927\u306B\u4F34\u3044\u3001\u9023\u5408\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u57FA\u8EF8\u30AF\u30EC\u30B8\u30C3\u30C8FED\u304C\u731B\u70C8\u306A\u8CB7\u3044\u3092\u96C6\u3081\u3066\u3044\u307E\u3059\uFF01", pairId: "FED_M", minImpact: 4, maxImpact: 8 },
  { title: "\u26A0\uFE0F\u3010\u969C\u5BB3\u3011\u5927\u624B\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u7FA4\u306E\u9023\u9396\u30C0\u30A6\u30F3\u3067\u4E00\u6642\u58F2\u308A\u6D74\u3073\u305B", content: "\u4E00\u6642\u7684\u306A\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u5206\u65AD\u306B\u3088\u308AFED\u30AF\u30EC\u30B8\u30C3\u30C8\u306E\u6D41\u52D5\u6027\u61F8\u5FF5\u304C\u751F\u3058\u3001\u4FA1\u683C\u304C\u6025\u843D\u3057\u307E\u3057\u305F\u3002", pairId: "FED_M", minImpact: -6, maxImpact: -3 },
  { title: "\u{1F4B3}\u3010\u516C\u5F0F\u6C7A\u6E08\u3011\u4E3B\u8981Misskey\u30B5\u30FC\u30D0\u30FC\u304CFED\u6C7A\u6E08\u3092\u6A19\u6E96\u63A1\u7528", content: "\u30B5\u30FC\u30D0\u30FC\u7DAD\u6301\u8CBB\u3084\u30AA\u30F3\u30E9\u30A4\u30F3\u30B9\u30C8\u30A2\u3067\u306EFED\u5229\u7528\u304C\u62E1\u5927\u3057\u3001\u5B9F\u9700\u8CB7\u3044\u304C\u6BBA\u5230\u3057\u3066\u3044\u307E\u3059\uFF01", pairId: "FED_M", minImpact: 3, maxImpact: 7 },
  { title: "\u{1F512}\u3010\u6697\u53F7\u5316\u3011\u6B21\u4E16\u4EE3\u9023\u5408\u30D7\u30ED\u30C8\u30B3\u30EB\u306E\u6697\u53F7\u5316\u5F37\u5316\u304C\u767A\u8868", content: "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u5411\u4E0A\u3078\u306E\u9AD8\u8A55\u4FA1\u304B\u3089\u3001FED\u30AF\u30EC\u30B8\u30C3\u30C8\u306E\u4FE1\u983C\u6027\u304C\u6025\u4E0A\u6607\u3057\u3066\u3044\u307E\u3059\u3002", pairId: "FED_M", minImpact: 2, maxImpact: 5 },
  // BLOB/M (ブロッブコイン/Mコイン)
  { title: "\u{1F431}\u3010\u7206\u8CB7\u3044\u3011\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u306E\u306C\u3044\u3050\u308B\u307F\u767A\u58F2\u3067BLOB\u8CB7\u3044\u6BBA\u5230", content: "\u516C\u5F0F\u30B0\u30C3\u30BA\u306E\u6C7A\u6E08\u901A\u8CA8\u306B\u6307\u5B9A\u3055\u308C\u3001\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u7D4C\u6E08\u570F\u30C8\u30FC\u30AF\u30F3BLOB\u304C\u9AD8\u9A30\uFF01", pairId: "BLOB_M", minImpact: 4, maxImpact: 9 },
  { title: "\u{1F327}\uFE0F\u3010\u54C1\u8584\u3011\u611B\u77E5\u30A2\u30A4\u30C6\u30E0\u306E\u53CE\u7A6B\u91CF\u6E1B\u5C11\u3067BLOB\u58F2\u308A\u5148\u884C", content: "\u9032\u5316\u30A2\u30A4\u30C6\u30E0\u306E\u4F9B\u7D66\u4E0D\u8DB3\u304C\u61F8\u5FF5\u3055\u308C\u3001\u4E00\u6642\u7684\u306A\u8ABF\u6574\u58F2\u308A\u304C\u767A\u751F\u3057\u3066\u3044\u307E\u3059\u3002", pairId: "BLOB_M", minImpact: -5, maxImpact: -2 },
  { title: "\u{1F91D}\u3010\u63D0\u643A\u3011\u30E2\u30C1\u30E7\u30C1\u30E7\u88FD\u83D3\u3068BLOB\u30DD\u30A4\u30F3\u30C8\u306E\u76F8\u4E92\u4EA4\u63DB\u304C\u6C7A\u5B9A", content: "\u30B9\u30A4\u30FC\u30C4\u3068\u306E\u30BF\u30A4\u30A2\u30C3\u30D7\u306B\u3088\u308ABLOB\u30C8\u30FC\u30AF\u30F3\u306E\u5229\u7528\u8005\u304C\u6025\u5897\u3057\u3066\u3044\u307E\u3059\u3002", pairId: "BLOB_M", minImpact: 3, maxImpact: 6 },
  { title: "\u{1F389}\u3010\u751F\u8A95\u796D\u3011\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u8A95\u751F\u796D\u30A4\u30D9\u30F3\u30C8\u3067\u53D6\u5F15\u9AD8\u6700\u9AD8\u8A18\u9332", content: "\u304A\u796D\u308A\u30E0\u30FC\u30C9\u306B\u5305\u307E\u308C\u3001\u4E16\u754C\u4E2D\u304B\u3089BLOB\u8CB7\u3044\u304C\u6D41\u5165\u3057\u3066\u3044\u307E\u3059\uFF01", pairId: "BLOB_M", minImpact: 5, maxImpact: 10 },
  // NEKO/M (をねこトークン/Mコイン)
  { title: "\u{1F634}\u3010\u306E\u3093\u3073\u308A\u3011\u3092\u306D\u3053\u30EA\u30E9\u30C3\u30AF\u30B9\u52B9\u679C\u3067NEKO\u30C8\u30FC\u30AF\u30F3\u6025\u9A30\uFF01", content: "\u7652\u3084\u3057\u3092\u6C42\u3081\u308B\u30C8\u30EC\u30FC\u30C0\u30FC\u306B\u3088\u308B\u8CB7\u3044\u304C\u96C6\u307E\u308A\u3001\u9AD8\u6C34\u6E96\u3092\u7DAD\u6301\u3057\u3066\u3044\u307E\u3059\u3002", pairId: "NEKO_M", minImpact: 15, maxImpact: 35 },
  { title: "\u{1F63F}\u3010\u6D99\u76EE\u3011\u3092\u306D\u3053\u6CE3\u304D\u9854\u30B9\u30BF\u30F3\u30D7\u9023\u6253\u3067\u30B5\u30FC\u30D0\u30FC\u904E\u71B1", content: "\u4E00\u90E8\u8CA0\u8377\u306B\u3088\u308B\u9045\u5EF6\u304C\u5ACC\u6C17\u3055\u308C\u3001\u4E00\u6642\u7684\u306B\u58F2\u308A\u304C\u512A\u52E2\u3068\u306A\u308A\u307E\u3057\u305F\u3002", pairId: "NEKO_M", minImpact: -20, maxImpact: -8 },
  { title: "\u{1F375}\u3010\u9759\u5CA1\u7279\u9700\u3011\u9759\u5CA1\u30A2\u30A4\u30C6\u30E0\u306E\u9700\u8981\u6025\u5897\u3067NEKO\u8CB7\u3044\u52A0\u901F", content: "\u3092\u306D\u3053\u9032\u5316\u7D20\u6750\u306E\u53D6\u5F15\u6D3B\u767A\u5316\u306B\u3088\u308A\u30C8\u30FC\u30AF\u30F3\u4FA1\u5024\u304C\u6025\u4E0A\u6607\u3057\u3066\u3044\u307E\u3059\uFF01", pairId: "NEKO_M", minImpact: 12, maxImpact: 25 },
  { title: "\u26A1\u3010\u30E9\u30A4\u30D0\u30EB\u3011\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u3068\u306E\u30A8\u30F3\u30AB\u30A6\u30F3\u30C8\u3067\u653B\u6483\u529B\uFF06\u30EC\u30FC\u30C8UP", content: "\u30E9\u30A4\u30D0\u30EB\u95A2\u4FC2\u306B\u3088\u308B\u6CE8\u76EE\u5EA6\u6025\u4E0A\u6607\u3067NEKO\u30C8\u30FC\u30AF\u30F3\u304C\u5927\u5E45\u9AD8\uFF01", pairId: "NEKO_M", minImpact: 18, maxImpact: 30 },
  // MCC/M (モチョコイン/Mコイン - 超ハイリスク草コイン)
  { title: "\u{1F315}\u3010TO THE MOON!\u3011\u6709\u540D\u30A4\u30F3\u30D5\u30EB\u30A8\u30F3\u30B5\u30FC\u306E\u6295\u7A3F\u3067\u72C2\u4E71\u6025\u9A30\uFF01", content: "\u300C\u30E2\u30C1\u30E7\u30B3\u30A4\u30F3\u3057\u304B\u52DD\u305F\u3093\u300D\u3068\u3044\u3046\u4E00\u8A00\u3067\u6295\u6A5F\u8CC7\u91D1\u304C\u6D41\u5165\u3001\u4FA1\u683C\u304C\u7206\u9A30\u4E2D\uFF01", pairId: "MCC_M", minImpact: 70, maxImpact: 160 },
  { title: "\u{1F4A5}\u3010\u5927\u66B4\u843D\u3011CEO\u304C\u300C\u305F\u3060\u306E\u30CD\u30BF\u30B3\u30A4\u30F3\u300D\u3068\u767A\u8A00\u3057\u5927\u66B4\u843D\uFF01", content: "\u958B\u767A\u9663\u306E\u68AF\u5B50\u5916\u3057\u767A\u8A00\u306B\u6295\u8CC7\u5BB6\u304C\u6FC0\u6012\u3002\u6295\u3052\u58F2\u308A\u304C\u6B62\u307E\u3089\u305A\u5927\u66B4\u843D\u3057\u3066\u3044\u307E\u3059\uFF01", pairId: "MCC_M", minImpact: -65, maxImpact: -35 },
  { title: "\u{1F36E}\u3010\u9084\u5143\u796D\u3011\u30D7\u30EA\u30F3\u8CFC\u5165\u3067\u30E2\u30C1\u30E7\u30B3\u30A4\u30F3\u5168\u984D\u30AD\u30E3\u30C3\u30B7\u30E5\u30D0\u30C3\u30AF\uFF01", content: "\u30E2\u30C1\u30E7\u30C1\u30E7\u88FD\u83D3\u3068\u306E\u5927\u578B\u30BF\u30A4\u30A2\u30C3\u30D7\u30AD\u30E3\u30F3\u30DA\u30FC\u30F3\u304C\u59CB\u307E\u308A\u3001\u8CB7\u3044\u304C\u8CB7\u3044\u3092\u547C\u3076\u5C55\u958B\u306B\uFF01", pairId: "MCC_M", minImpact: 40, maxImpact: 90 },
  { title: "\u{1F40B}\u3010\u30AF\u30B8\u30E9\u5229\u78BA\u3011\u5927\u53E3\u6295\u8CC7\u5BB6\uFF08\u30AF\u30B8\u30E9\uFF09\u304C\u4FDD\u6709\u30B3\u30A4\u30F3\u3092\u4E00\u6589\u653E\u51FA", content: "\u521D\u671F\u304B\u3089\u306E\u5927\u53E3\u30DB\u30EB\u30C0\u30FC\u304C\u83AB\u5927\u306A\u5229\u76CA\u78BA\u5B9A\u58F2\u308A\u3092\u884C\u3044\u3001\u4FA1\u683C\u304C\u6025\u843D\u3057\u3066\u3044\u307E\u3059\u3002", pairId: "MCC_M", minImpact: -50, maxImpact: -25 }
];
function updateStockPrices() {
  for (const stock of stockMarket) {
    stock.prevPrice = stock.currentPrice;
    const percentChange = (Math.random() - 0.49) * stock.volatility;
    const meanReversion = (stock.basePrice - stock.currentPrice) / stock.basePrice * 0.04;
    let newPrice = stock.currentPrice * (1 + percentChange + meanReversion);
    newPrice = Math.max(10, Math.floor(newPrice));
    stock.currentPrice = newPrice;
    stock.history.push(newPrice);
    if (stock.history.length > 8) stock.history.shift();
  }
  for (const player of world.getAllPlayers()) {
    const holdings = getPlayerStockHoldings(player);
    let totalDividends = 0;
    for (const [code, count] of Object.entries(holdings)) {
      if (count <= 0) continue;
      const stock = stockMarket.find((s) => s.code === code);
      if (stock && stock.dividendRate > 0) {
        const div = Math.floor(stock.currentPrice * stock.dividendRate * count);
        totalDividends += div;
      }
    }
    if (totalDividends > 0) {
      const current = getPlayerBankAccount(player);
      setPlayerBankAccount(player, current + totalDividends);
      player.sendMessage(`\xA7a\u{1F4B5} [\u914D\u5F53\u91D1\u53D7\u53D6] \u4FDD\u6709\u682A\u5F0F\u306E\u914D\u5F53\u91D1 \xA7e${totalDividends.toLocaleString()} M\xA7a \u304C\u53E3\u5EA7\u306B\u632F\u308A\u8FBC\u307E\u308C\u307E\u3057\u305F\uFF01\xA7r`);
    }
  }
}
function processMarketBreakingNews() {
  if (Math.random() < 0.35) {
    const isFxNews = Math.random() < 0.45;
    if (isFxNews) {
      const tmpl = FX_NEWS_TEMPLATES[Math.floor(Math.random() * FX_NEWS_TEMPLATES.length)];
      const pair = fxPairs.find((p) => p.id === tmpl.pairId);
      if (pair) {
        const impact = parseFloat((tmpl.minImpact + Math.random() * (tmpl.maxImpact - tmpl.minImpact)).toFixed(2));
        pair.prevRate = pair.currentRate;
        pair.currentRate = parseFloat(Math.max(0.01, pair.currentRate * (1 + impact / 100)).toFixed(2));
        pair.history.push(pair.currentRate);
        if (pair.history.length > 8) pair.history.shift();
        const news = {
          id: `fx_news_${Date.now()}`,
          category: "fx",
          title: tmpl.title,
          content: `${tmpl.content} (\u5F71\u97FF: ${pair.name} \u30EC\u30FC\u30C8\u304C ${impact >= 0 ? "+" : ""}${impact}%)`,
          targetCode: tmpl.pairId,
          impactPercent: impact,
          timestamp: Date.now()
        };
        marketNewsHistory.unshift(news);
        if (marketNewsHistory.length > 25) marketNewsHistory.pop();
        world.sendMessage(`\xA7b\u{1F310} [\u4E16\u754C\u70BA\u66FF\u901F\u5831 (FX)] \xA7e${tmpl.title}\xA7r
\xA77${news.content}\xA7r`);
      }
    } else {
      const tmpl = STOCK_NEWS_TEMPLATES[Math.floor(Math.random() * STOCK_NEWS_TEMPLATES.length)];
      const targetStock = stockMarket.find((s) => s.code === tmpl.code);
      if (targetStock) {
        const impact = Math.floor(tmpl.minImpact + Math.random() * (tmpl.maxImpact - tmpl.minImpact));
        targetStock.prevPrice = targetStock.currentPrice;
        targetStock.currentPrice = Math.max(10, Math.floor(targetStock.currentPrice * (1 + impact / 100)));
        targetStock.history.push(targetStock.currentPrice);
        if (targetStock.history.length > 8) targetStock.history.shift();
        const news = {
          id: `stock_news_${Date.now()}`,
          category: "stock",
          title: tmpl.title,
          content: `${tmpl.content} (\u5F71\u97FF: ${targetStock.name}\u682A\u304C ${impact >= 0 ? "+" : ""}${impact}%)`,
          targetCode: tmpl.code,
          impactPercent: impact,
          timestamp: Date.now()
        };
        marketNewsHistory.unshift(news);
        if (marketNewsHistory.length > 25) marketNewsHistory.pop();
        world.sendMessage(`\xA76\u{1F4F0} [Misskey\u682A\u4FA1\u901F\u5831] \xA7e${tmpl.title}\xA7r
\xA77${news.content}\xA7r`);
      }
    }
  }
}
system.runInterval(() => {
  updateFxRates();
  updateStockPrices();
  processMarketBreakingNews();
  for (const player of world.getAllPlayers()) {
    const positions = getPlayerFxPositions(player);
    if (positions.length === 0) continue;
    let modified = false;
    const remainingPositions = [];
    for (const pos of positions) {
      const pair = fxPairs.find((p) => p.id === pos.pairId);
      if (!pair) continue;
      const profit = calculatePositionProfit(pos, pair.currentRate);
      if (profit < -pos.margin * 0.85) {
        const refund = Math.max(0, pos.margin + profit);
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + refund);
        player.sendMessage(`\xA7c\u{1F6A8} [\u30ED\u30B9\u30AB\u30C3\u30C8\u57F7\u884C] ${pair.name} \u306E\u30DD\u30B8\u30B7\u30E7\u30F3\u304C\u5F37\u5236\u6C7A\u6E08\u3055\u308C\u307E\u3057\u305F\uFF08\u640D\u5931: ${Math.abs(profit).toLocaleString()} M, \u8FD4\u9084: ${refund.toLocaleString()} M\uFF09\u3002\xA7r`);
        modified = true;
      } else {
        remainingPositions.push(pos);
      }
    }
    if (modified) {
      setPlayerFxPositions(player, remainingPositions);
    }
  }
  saveMarketWorldData();
}, 600);
var CAR_PERK_DURATION_MS = 30 * 60 * 1e3;
var CAR_PERK_DEFS = {
  turbo: {
    key: "turbo",
    name: "\u26A1 \u30BF\u30FC\u30DC\u30D6\u30FC\u30B9\u30BF\u30FC",
    badge: "\u30BF\u30FC\u30DC",
    fedPrice: 30,
    description: "\u9577\u3044\u5909\u306A\u8ECA\u306E\u30A8\u30F3\u30B8\u30F3\u3092\u8D85\u5F37\u5316\u3057\u3001\u6700\u9AD8\u901F\u5EA6\u30921.5\u500D\u306B\u7206\u901F\u52A0\u901F\uFF01",
    effectSummary: "\u6700\u9AD8\u901F\u5EA6\u304C1.5\u500D\u306B\u8D85\u52A0\u901F"
  },
  insurance: {
    key: "insurance",
    name: "\u{1F6E1}\uFE0F \u8ECA\u4E21\u4FDD\u967A",
    badge: "\u4FDD\u967A",
    fedPrice: 20,
    description: "\u58C1\u6FC0\u7A81\u306B\u3088\u308B\u5927\u7834\u4E8B\u6545\u6642\u306B\u30011\u5206\u505C\u6B62\u305B\u305A\u5373\u5EA7\u306B\u73FE\u5834\u4FEE\u5FA9\uFF01",
    effectSummary: "\u4E8B\u6545\u5927\u7834\u6642\u306E1\u5206\u505C\u6B62\u3092\u5373\u6642\u5FA9\u65E7"
  },
  gold_license: {
    key: "gold_license",
    name: "\u{1F530} \u30B4\u30FC\u30EB\u30C9\u514D\u8A31\u8A3C",
    badge: "\u91D1\u514D",
    fedPrice: 15,
    description: "\u512A\u826F\u30C9\u30E9\u30A4\u30D0\u30FC\u8A8D\u5B9A\u8A3C\u3002\u8ECA\u3092\u8AA4\u3063\u3066\u6BB4\u3063\u3066\u3082\u8ECA\u304C\u6012\u3089\u306A\u304F\u306A\u308B\uFF01",
    effectSummary: "\u8ECA\u3092\u6BB4\u3063\u3066\u3082\u6012\u3089\u308C\u306A\u304F\u306A\u308B"
  }
};
function getCarPerkStatus(player, perkKey) {
  try {
    const expiresAt = Number(player.getDynamicProperty(`mi_perk_${perkKey}_expires`) || 0);
    const rawAutoRenew = player.getDynamicProperty(`mi_perk_${perkKey}_auto_renew`);
    const autoRenew = rawAutoRenew === void 0 ? true : Boolean(rawAutoRenew);
    const now = Date.now();
    const active = now < expiresAt;
    const remainingMinutes = active ? Math.max(1, Math.ceil((expiresAt - now) / 6e4)) : 0;
    return { active, expiresAt, remainingMinutes, autoRenew };
  } catch (e) {
    return { active: false, expiresAt: 0, remainingMinutes: 0, autoRenew: false };
  }
}
function subscribeCarPerk(player, perkKey, durationMs = CAR_PERK_DURATION_MS) {
  const current = getCarPerkStatus(player, perkKey);
  const now = Date.now();
  const baseTime = current.active ? current.expiresAt : now;
  const newExpires = baseTime + durationMs;
  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_expires`, newExpires);
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, true);
  } catch (e) {
  }
  return getCarPerkStatus(player, perkKey);
}
function setCarPerkAutoRenew(player, perkKey, autoRenew) {
  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, autoRenew);
  } catch (e) {
  }
}
function cancelCarPerkSubscription(player, perkKey) {
  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_expires`, 0);
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, false);
  } catch (e) {
  }
}
function hasCarPerk(player, perkKey) {
  return getCarPerkStatus(player, perkKey).active;
}
function getInsuranceStatus(player) {
  const s = getCarPerkStatus(player, "insurance");
  return { active: s.active, expiresAt: s.expiresAt, remainingMinutes: s.remainingMinutes, autoRenew: s.autoRenew };
}
var WEALTH_RANKS = [
  { rankName: "Misskey\u306E\u5927\u682A\u4E3B", minFed: 1e5, badge: "\xA7d\u{1F451}[\u5927\u682A\u4E3B]\xA7r", particle: "minecraft:mob_portal", description: "\u7DCF\u8CC7\u752310\u4E07FED\u7A81\u7834\u3002\u8679\u8272\u306E\u30DD\u30FC\u30BF\u30EB\u30AA\u30FC\u30E9\u3068\u52A0\u901F\u30D0\u30D5\u3002" },
  { rankName: "\u77F3\u6CB9\u738B", minFed: 2e4, badge: "\xA76\u{1F48E}[\u77F3\u6CB9\u738B]\xA7r", particle: "minecraft:totem_particle", description: "\u7DCF\u8CC7\u75232\u4E07FED\u7A81\u7834\u3002\u9EC4\u91D1\u3068\u30A8\u30E1\u30E9\u30EB\u30C9\u306E\u30AA\u30FC\u30E9\u3002" },
  { rankName: "\u5927\u5BCC\u8C6A", minFed: 5e3, badge: "\xA7e\u{1F3A9}[\u5927\u5BCC\u8C6A]\xA7r", particle: "minecraft:villager_happy", description: "\u7DCF\u8CC7\u75235\u5343FED\u7A81\u7834\u3002\u9EC4\u91D1\u306E\u304D\u3089\u3081\u304D\u30AA\u30FC\u30E9\u3002" },
  { rankName: "\u8CC7\u7523\u5BB6", minFed: 1e3, badge: "\xA7a\u{1F4BC}[\u8CC7\u7523\u5BB6]\xA7r", particle: "minecraft:villager_happy", description: "\u7DCF\u8CC7\u7523\u5343FED\u7A81\u7834\u3002\u9285\u8272\u306E\u304D\u3089\u3081\u304D\u3002" },
  { rankName: "\u4E00\u822C\u5E02\u6C11", minFed: 0, badge: "\xA77[\u4E00\u822C]\xA7r", particle: "", description: "\u307E\u305A\u306F\u6295\u8CC7\u3084\u63A1\u6398\u3067\u8CC7\u7523\u3092\u7BC9\u304D\u307E\u3057\u3087\u3046\uFF01" }
];
function getPlayerWealthRank(totalFed) {
  for (const r of WEALTH_RANKS) {
    if (totalFed >= r.minFed) return r;
  }
  return WEALTH_RANKS[WEALTH_RANKS.length - 1];
}
function openFinancialPortalUI(player, blockLoc) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);
  let stockValue = 0;
  for (const [code, count] of Object.entries(holdings)) {
    const stock = stockMarket.find((s) => s.code === code);
    if (stock && count > 0) {
      stockValue += stock.currentPrice * count;
    }
  }
  const positions = getPlayerFxPositions(player);
  let fxMargin = 0;
  let fxUnrealizedProfit = 0;
  for (const pos of positions) {
    fxMargin += pos.margin;
    const pair = fxPairs.find((p) => p.id === pos.pairId);
    if (pair) {
      fxUnrealizedProfit += calculatePositionProfit(pos, pair.currentRate);
    }
  }
  const totalAssets = cash + bank + stockValue + fxMargin + fxUnrealizedProfit;
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const totalFed = parseFloat((totalAssets / fedRate).toFixed(2));
  const wealthRank = getPlayerWealthRank(totalFed);
  const profitSign = fxUnrealizedProfit >= 0 ? "+" : "";
  const fxProfitText = fxUnrealizedProfit !== 0 ? ` (\u542B\u307F\u640D\u76CA: ${profitSign}${fxUnrealizedProfit.toLocaleString()} M)` : "";
  const form = new ActionFormData().title("\u{1F4B9} Misskey\u8A3C\u5238 & \u91D1\u878D\u30DD\u30FC\u30BF\u30EB").body(
    `\u{1F464} \xA7l${player.name}\xA7r \u69D8\u306E\u8CC7\u7523\u30B5\u30DE\u30EA\u30FC [${wealthRank.badge}]
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B0} \xA76\u7DCF\u8CC7\u7523\u8A55\u4FA1\u984D: \xA7e${totalAssets.toLocaleString()} M\xA7r (\xA7b${totalFed.toLocaleString()} FED\xA7r)
\u{1F4B5} \u6240\u6301\u91D1 (\u73FE\u91D1): \xA7f${cash.toLocaleString()} M\xA7r
\u{1F3E6} \u53E3\u5EA7\u6B8B\u9AD8 (\u9810\u91D1): \xA7a${bank.toLocaleString()} M\xA7r
\u{1F3E2} \u682A\u5F0F\u4FDD\u6709\u984D: \xA7b${stockValue.toLocaleString()} M\xA7r
\u{1F4C8} FX\u8A3C\u62E0\u91D1: \xA7d${fxMargin.toLocaleString()} M\xA7r${fxProfitText}
\u{1F4B9} FED\u70BA\u66FF\u30EC\u30FC\u30C8: \xA7e1 FED = ${fedRate.toFixed(2)} M\xA7r
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`
  ).button("\u{1F6D2} Misskey\u30AA\u30F3\u30E9\u30A4\u30F3\u30B9\u30C8\u30A2 (FED\u6C7A\u6E08)").button("\u{1F697} \u8ECA\u4E21\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9 & \u4FDD\u967A\u6240").button("\u{1F3B0} Misskey \u30B9\u30AF\u30E9\u30C3\u30C1\u304F\u3058 (\u30AC\u30C1\u30E3)").button("\u{1F3E6} ATM\u30FB\u53E3\u5EA7\u7BA1\u7406 (\u5165\u91D1\u30FB\u51FA\u91D1\u30FB\u4E21\u66FF)").button("\u{1F6CD}\uFE0F \u8CB7\u53D6\u30FB\u63DB\u91D1\u6240 (\u9271\u77F3\u30FB\u7279\u7523\u54C1\u3092\u58F2\u5374)").button(`\u{1F4C8} FX \u70BA\u66FF\u53D6\u5F15\u6240 (${positions.length}\u4EF6\u4FDD\u6709\u4E2D)`).button("\u{1F3E2} Misskey\u682A\u5F0F\u5E02\u5834 (\u682A\u306E\u58F2\u8CB7\u30FB\u914D\u5F53)").button(`\u{1F4F0} \u7D4C\u6E08\u30CB\u30E5\u30FC\u30B9\u901F\u5831 (${marketNewsHistory.length}\u4EF6)`).button("\u{1F451} \u5BCC\u8C6A\u30E9\u30F3\u30AD\u30F3\u30B0 & \u79F0\u53F7").button("\u{1F519} \u9589\u3058\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      openOnlineStoreUI(player, blockLoc);
    } else if (res.selection === 1) {
      openVehicleServiceUI(player, blockLoc);
    } else if (res.selection === 2) {
      openScratchLotteryUI(player, blockLoc);
    } else if (res.selection === 3) {
      openAtmUI(player, blockLoc);
    } else if (res.selection === 4) {
      openItemSellUI(player, blockLoc);
    } else if (res.selection === 5) {
      openFxExchangeUI(player, blockLoc);
    } else if (res.selection === 6) {
      openStockMarketUI(player, blockLoc);
    } else if (res.selection === 7) {
      openMarketNewsUI(player, blockLoc);
    } else if (res.selection === 8) {
      openWealthRankUI(player, blockLoc);
    }
  });
}
var STORE_ITEMS = [
  {
    id: "elytra",
    name: "\u30A8\u30EA\u30C8\u30E9 (\u6ED1\u7A7A\u7FFC)",
    fedPrice: 5e3,
    typeId: "minecraft:elytra",
    amount: 1,
    requiredIgyo: "ensei",
    lockReason: "\u9060\u5F81\u306E\u5049\u696D (\u30A8\u30F3\u30C9\u5230\u9054/\u8A0E\u4F10) \u304C\u5FC5\u8981",
    description: "\u5927\u7A7A\u3092\u98DB\u7FD4\u3067\u304D\u308B\u81F3\u9AD8\u306E\u7FFC\u3002\u9060\u5F81\u306E\u5049\u696D\u9054\u6210\u8005\u9650\u5B9A\uFF01"
  },
  {
    id: "shulker_box",
    name: "\u30B7\u30E5\u30EB\u30AB\u30FC\u30DC\u30C3\u30AF\u30B9",
    fedPrice: 800,
    typeId: "minecraft:shulker_box",
    amount: 1,
    requiredIgyo: "ensei",
    lockReason: "\u9060\u5F81\u306E\u5049\u696D (\u30A8\u30F3\u30C9\u5230\u9054/\u8A0E\u4F10) \u304C\u5FC5\u8981",
    description: "\u5927\u91CF\u306E\u30A2\u30A4\u30C6\u30E0\u3092\u6301\u3061\u904B\u3079\u308B\u30DD\u30FC\u30BF\u30D6\u30EB\u5009\u5EAB\u3002\u30A8\u30F3\u30C9\u5230\u9054\u8005\u9650\u5B9A\uFF01"
  },
  {
    id: "netherite",
    name: "\u30CD\u30B6\u30E9\u30A4\u30C8\u30A4\u30F3\u30B4\u30C3\u30C8 \xD7 1",
    fedPrice: 1500,
    typeId: "minecraft:netherite_ingot",
    amount: 1,
    requiredUnlockTag: "unlocked_netherite",
    lockReason: "\u4E00\u5EA6\u81EA\u529B\u3067\u30CD\u30B6\u30E9\u30A4\u30C8\u3092\u5165\u624B/\u5F37\u5316\u3059\u308B\u5FC5\u8981\u3042\u308A",
    description: "\u6700\u4E0A\u4F4D\u88C5\u5099\u306E\u5F37\u5316\u7D20\u6750\u3002\u4E00\u5EA6\u5165\u624B\u3057\u305F\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u307F\u8CFC\u5165\u53EF\u80FD\u3002"
  },
  {
    id: "diamond_pack",
    name: "\u30C0\u30A4\u30E4\u30E2\u30F3\u30C9 \xD7 8",
    fedPrice: 500,
    typeId: "minecraft:diamond",
    amount: 8,
    requiredUnlockTag: "unlocked_diamond",
    lockReason: "\u4E00\u5EA6\u81EA\u529B\u3067\u30C0\u30A4\u30E4\u30E2\u30F3\u30C9\u3092\u5165\u624B\u3059\u308B\u5FC5\u8981\u3042\u308A",
    description: "\u9AD8\u54C1\u8CEA\u306A\u30C0\u30A4\u30E4\u30E2\u30F3\u30C98\u500B\u30BB\u30C3\u30C8\u3002\u4E00\u5EA6\u5165\u624B\u3057\u305F\u30D7\u30EC\u30A4\u30E4\u30FC\u306E\u307F\u8CFC\u5165\u53EF\u80FD\u3002"
  },
  {
    id: "notch_apple",
    name: "\u30A8\u30F3\u30C1\u30E3\u30F3\u30C8\u91D1\u30EA\u30F3\u30B4 \xD7 1",
    fedPrice: 600,
    typeId: "minecraft:enchanted_golden_apple",
    amount: 1,
    requiredIgyo: "chokin",
    lockReason: "\u8CAF\u91D1\u306E\u5049\u696D (\u91D1\u6240\u6301) \u304C\u5FC5\u8981",
    description: "\u518D\u751FV\u30FB\u8010\u6027\u3092\u6388\u3051\u308B\u7A76\u6975\u306E\u795E\u30EA\u30F3\u30B4\u3002"
  },
  {
    id: "special_pack",
    name: "Misskey\u7279\u7523\u54C1\u30D1\u30C3\u30AF",
    fedPrice: 80,
    isPack: true,
    description: "\u753A\u7530\u30FB\u4E09\u91CD\u30FB\u9759\u5CA1\u30FB\u611B\u77E5\u30FB\u5C90\u961C\u30FB\u6587\u9CE5\u304C\u54041\u500B\u5165\u3063\u305F\u7D20\u6750\u30BB\u30C3\u30C8\u3002"
  },
  {
    id: "ecology_server",
    name: "\u751F\u614B\u30B5\u30FC\u30D0\u30FC \xD7 1",
    fedPrice: 50,
    typeId: "mi:ecology_server",
    amount: 1,
    description: "\u30C4\u30C1\u30CE\u30B3\u7E41\u6B96\u3084\u30AF\u30E9\u30D5\u30C8\u306B\u5FC5\u9808\u306E\u751F\u4F53\u30D1\u30FC\u30C4\u3002"
  },
  {
    id: "mochocho_pack",
    name: "\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7 \xD7 16",
    fedPrice: 15,
    typeId: "mi:baked_mochocho",
    amount: 16,
    description: "\u7F8E\u5473\u3057\u3044\u30E2\u30C1\u30E7\u30C1\u30E7\u3002\u98DF\u3079\u904E\u304E\u306B\u306F\u6CE8\u610F\uFF01"
  },
  {
    id: "pudding_pack",
    name: "\u30D7\u30EA\u30F3 \xD7 4",
    fedPrice: 20,
    typeId: "mi:pudding",
    amount: 4,
    description: "\u307D\u3088\u3093\u307D\u3088\u3093\u8DF3\u306D\u308B\u30B9\u30A4\u30FC\u30C4\u3002"
  },
  {
    id: "nekomimi_pack",
    name: "\u732B\u8033\u30D7\u30EA\u30F3 \xD7 2",
    fedPrice: 40,
    typeId: "mi:nekomimi_pudding",
    amount: 2,
    description: "\u98DF\u3079\u308B\u3068\u732B\u8033\u304C\u751F\u3048\u3066\u8DB3\u304C\u901F\u304F\u306A\u308B\uFF01"
  },
  {
    id: "blueprint_yahata",
    name: "\u516B\u5E61\u88FD\u9244\u6240\u306E\u8A2D\u8A08\u56F3",
    fedPrice: 2e3,
    typeId: "mi:yahata_blueprint",
    amount: 1,
    description: "\u7523\u696D\u907A\u69CB\u30C0\u30F3\u30B8\u30E7\u30F3\u3092\u76EE\u306E\u524D\u306B\u5373\u6642\u5EFA\u8A2D\u3002"
  },
  {
    id: "blueprint_hq",
    name: "Misskey\u958B\u767A\u6240\u306E\u8A2D\u8A08\u56F3",
    fedPrice: 3e3,
    typeId: "mi:hq_blueprint",
    amount: 1,
    description: "4\u968E\u5EFA\u3066\uFF0B\u30D8\u30EA\u30DD\u30FC\u30C8\u306E\u5DE8\u5927\u30C0\u30F3\u30B8\u30E7\u30F3\u3092\u5373\u6642\u5EFA\u8A2D\u3002"
  },
  {
    id: "egg_blobcat",
    name: "\u306B\u3083\u3093\u3077\u3063\u3077\u30FC\u306E\u5375",
    fedPrice: 100,
    typeId: "mi:blobcat_spawn_egg",
    amount: 1,
    description: "\u611B\u3055\u308C\u30DE\u30B9\u30B3\u30C3\u30C8\u3092\u76F4\u63A5\u53EC\u559A\u3002"
  },
  {
    id: "egg_woneko",
    name: "\u3092\u306D\u3053\u306E\u5375",
    fedPrice: 100,
    typeId: "mi:woneko_spawn_egg",
    amount: 1,
    description: "\u8868\u60C5\u8C4A\u304B\u306A\u306E\u3093\u3073\u308A\u732B\u3092\u53EC\u559A\u3002"
  },
  {
    id: "egg_car",
    name: "\u9577\u3044\u5909\u306A\u8ECA\u306E\u5375",
    fedPrice: 250,
    typeId: "mi:regretcar_spawn_egg",
    amount: 1,
    description: "2\u4EBA\u4E57\u308A\u8D85\u9AD8\u901F\u8ECA\u4E21\u3092\u53EC\u559A\u3002"
  }
];
function isStoreItemLocked(player, item) {
  if (item.requiredIgyo && !hasPlayerAchieved(player, item.requiredIgyo)) {
    return true;
  }
  if (item.requiredUnlockTag && !player.hasTag(item.requiredUnlockTag)) {
    return true;
  }
  return false;
}
function openOnlineStoreUI(player, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const form = new ActionFormData().title("\u{1F6D2} Misskey \u30AA\u30F3\u30E9\u30A4\u30F3\u30B9\u30C8\u30A2 (FED\u6C7A\u6E08)").body(
    `\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r (\xA7b${(bank / fedRate).toFixed(2)} FED\xA7r)
\u73FE\u5728\u306E\u70BA\u66FF\u30EC\u30FC\u30C8: \xA7e1 FED = ${fedRate.toFixed(2)} M\xA7r
\uFF08\u203BM\u30B3\u30A4\u30F3\u9AD8\u30FBFED\u5B89\u306E\u6642\u306B\u8CB7\u3046\u3068\u652F\u6255\u984D\u304C\u304A\u5F97\u306B\u306A\u308A\u307E\u3059\uFF01\uFF09

\u8CFC\u5165\u3057\u305F\u3044\u5546\u54C1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:`
  );
  for (const item of STORE_ITEMS) {
    const mCost = Math.floor(item.fedPrice * fedRate);
    const locked = isStoreItemLocked(player, item);
    if (locked) {
      form.button(`\u{1F512} ${item.name} (${item.fedPrice.toLocaleString()} FED)
[\u672A\u89E3\u653E: ${item.lockReason || "\u6761\u4EF6\u672A\u9054\u6210"}]`);
    } else {
      form.button(`${item.name} (${item.fedPrice.toLocaleString()} FED)
[\u652F\u6255\u984D: \u7D04 ${mCost.toLocaleString()} M]`);
    }
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < STORE_ITEMS.length) {
      const item = STORE_ITEMS[res.selection];
      const locked = isStoreItemLocked(player, item);
      if (locked) {
        player.sendMessage(`\xA7c\u{1F512} [\u8CFC\u5165\u4E0D\u53EF] \u300C${item.name}\u300D\u306F\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059\uFF01\uFF08\u89E3\u9664\u6761\u4EF6: ${item.lockReason || "\u672A\u9054\u6210"}\uFF09\xA7r`);
        openOnlineStoreUI(player, blockLoc);
        return;
      }
      const mCost = Math.floor(item.fedPrice * fedRate);
      if (bank < mCost) {
        player.sendMessage(`\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\uFF08\u5FC5\u8981\u984D: ${mCost.toLocaleString()} M / \u6B8B\u9AD8: ${bank.toLocaleString()} M\uFF09\xA7r`);
        openOnlineStoreUI(player, blockLoc);
        return;
      }
      const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
      if (!inv) return;
      setPlayerBankAccount(player, bank - mCost);
      if (item.isPack) {
        inv.addItem(new ItemStack("mi:machida", 1));
        inv.addItem(new ItemStack("mi:sanjuu", 1));
        inv.addItem(new ItemStack("mi:silenthill", 1));
        inv.addItem(new ItemStack("mi:blob_aichi", 1));
        inv.addItem(new ItemStack("mi:gif", 1));
        inv.addItem(new ItemStack("mi:bunchou", 1));
      } else if (item.typeId) {
        inv.addItem(new ItemStack(item.typeId, item.amount || 1));
      }
      player.sendMessage(`\xA7a\u{1F6D2}\u2728 [\u8CFC\u5165\u5B8C\u4E86] \u300C${item.name}\u300D\u3092 ${item.fedPrice.toLocaleString()} FED (${mCost.toLocaleString()} M) \u3067\u8CFC\u5165\u3057\u307E\u3057\u305F\uFF01\xA7r`);
      player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.8, z: player.location.z });
      openOnlineStoreUI(player, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openVehicleServiceUI(player, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const perkKeys = ["turbo", "insurance", "gold_license"];
  const statuses = perkKeys.map((k) => ({ def: CAR_PERK_DEFS[k], status: getCarPerkStatus(player, k) }));
  const form = new ActionFormData().title("\u{1F697} \u8ECA\u4E21\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9 & \u81EA\u52D5\u8ECA\u4FDD\u967A\u6240").body(
    `\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r (\xA7b${(bank / fedRate).toFixed(2)} FED\xA7r)

\u9577\u3044\u5909\u306A\u8ECA\uFF08\u30EC\u30B0\u30AB\u30FC\uFF09\u306E\u6027\u80FD\u5F37\u5316\u30FB\u4FDD\u967A\u30FB\u7279\u5225\u514D\u8A31\u3092\u30B5\u30D6\u30B9\u30AF\u5951\u7D04\u3067\u304D\u307E\u3059:
\uFF08\u203B30\u5206\u5B9A\u671F\u5951\u7D04\u3002\u81EA\u52D5\u66F4\u65B0\u3092ON\u306B\u3059\u308B\u3068\u53E3\u5EA7\u6B8B\u9AD8\u304B\u3089\u81EA\u52D5\u5F15\u304D\u843D\u3068\u3057\u7D99\u7D9A\u3055\u308C\u307E\u3059\uFF09`
  );
  for (const { def, status } of statuses) {
    const costM = Math.floor(def.fedPrice * fedRate);
    if (status.active) {
      form.button(`\u2705 ${def.name} [\u5951\u7D04\u4E2D: \u6B8B\u308A${status.remainingMinutes}\u5206 / \u66F4\u65B0:${status.autoRenew ? "ON" : "OFF"}]
[\u30BF\u30C3\u30D7\u3057\u3066\u5951\u7D04\u7BA1\u7406\u30FB\u5EF6\u9577\u30FB\u89E3\u7D04]`);
    } else {
      form.button(`${def.name} (${def.fedPrice} FED/30\u5206 / \u7D04${costM.toLocaleString()} M)
[${def.effectSummary}]`);
    }
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < perkKeys.length) {
      const chosenKey = perkKeys[res.selection];
      const { def, status } = statuses[res.selection];
      const costM = Math.floor(def.fedPrice * fedRate);
      if (status.active) {
        openCarPerkManageUI(player, chosenKey, blockLoc);
      } else {
        if (bank < costM) {
          player.sendMessage(`\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\uFF08\u5FC5\u8981\u984D: ${costM.toLocaleString()} M / \u6B8B\u9AD8: ${bank.toLocaleString()} M\uFF09\xA7r`);
          openVehicleServiceUI(player, blockLoc);
        } else {
          setPlayerBankAccount(player, bank - costM);
          const newStatus = subscribeCarPerk(player, chosenKey);
          player.sendMessage(`\xA7a\u{1F697}\u2728 [\u30B5\u30D6\u30B9\u30AF\u52A0\u5165\u5B8C\u4E86] \u300C${def.name}\u300D\u306B\u52A0\u5165\u3057\u307E\u3057\u305F\uFF01\uFF0830\u5206\u9593\u6709\u52B9 / \u81EA\u52D5\u66F4\u65B0: ON\uFF09\xA7r`);
          player.sendMessage(`\xA77\u52B9\u679C: ${def.description}\xA7r`);
          player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
          openVehicleServiceUI(player, blockLoc);
        }
      }
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openCarPerkManageUI(player, perkKey, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const def = CAR_PERK_DEFS[perkKey];
  const status = getCarPerkStatus(player, perkKey);
  const costM = Math.floor(def.fedPrice * fedRate);
  const form = new ActionFormData().title(`${def.name} \u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u7BA1\u7406`).body(
    `\u{1F464} \xA7l${player.name}\xA7r \u69D8\u306E\u5951\u7D04\u72B6\u6CC1 [${def.name}]
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4CB} \u5951\u7D04\u72B6\u614B: \xA7a\u2705 \u6709\u52B9\uFF08\u52B9\u679C\u767A\u52D5\u4E2D\uFF09\xA7r
\u{1F3AF} \u52B9\u679C\u6982\u8981: ${def.description}
\u23F1\uFE0F \u6B8B\u308A\u6642\u9593: \xA7e\u7D04 ${status.remainingMinutes} \u5206\xA7r
\u{1F504} \u81EA\u52D5\u66F4\u65B0: ${status.autoRenew ? "\xA7aON (\u671F\u9593\u6E80\u4E86\u6642\u306B\u81EA\u52D5\u5F15\u304D\u843D\u3068\u3057)\xA7r" : "\xA7cOFF (\u671F\u9593\u6E80\u4E86\u3067\u5931\u52B9)\xA7r"}
\u{1F4B0} \u4FDD\u967A\u6599\u30FB\u6708\u984D: \xA7b${def.fedPrice} FED\xA7r (\u7D04 \xA7e${costM.toLocaleString()} M\xA7r / 30\u5206)
\u{1F3E6} \u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u3054\u5E0C\u671B\u306E\u64CD\u4F5C\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:`
  ).button(`\u23F1\uFE0F \u5951\u7D04\u671F\u9593\u3092\u5EF6\u9577 (+30\u5206 / \u7D04${costM.toLocaleString()} M)`).button(`\u{1F504} \u81EA\u52D5\u66F4\u65B0\u3092\u5207\u308A\u66FF\u3048 (\u73FE\u5728: ${status.autoRenew ? "ON \u2794 OFF" : "OFF \u2794 ON"})`).button("\u274C \u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u3092\u5373\u6642\u89E3\u7D04").button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      if (bank < costM) {
        player.sendMessage(`\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\uFF08\u5FC5\u8981\u984D: ${costM.toLocaleString()} M\uFF09\xA7r`);
      } else {
        setPlayerBankAccount(player, bank - costM);
        const newStatus = subscribeCarPerk(player, perkKey);
        player.sendMessage(`\xA7a\u23F1\uFE0F\u2728 [\u671F\u9593\u5EF6\u9577\u5B8C\u4E86] \u300C${def.name}\u300D\u306E\u671F\u9593\u309230\u5206\u5EF6\u9577\u3057\u307E\u3057\u305F\uFF01\uFF08\u6B8B\u308A: \u7D04 ${newStatus.remainingMinutes} \u5206\uFF09\xA7r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      }
      openCarPerkManageUI(player, perkKey, blockLoc);
    } else if (res.selection === 1) {
      const nextAutoRenew = !status.autoRenew;
      setCarPerkAutoRenew(player, perkKey, nextAutoRenew);
      if (nextAutoRenew) {
        player.sendMessage(`\xA7a\u{1F504} [\u8A2D\u5B9A\u5909\u66F4] \u300C${def.name}\u300D\u306E\u81EA\u52D5\u66F4\u65B0\u3092 \xA7l\u6709\u52B9 (ON)\xA7r\xA7a \u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F\u3002\u671F\u9593\u6E80\u4E86\u6642\u306B\u81EA\u52D5\u5F15\u304D\u843D\u3068\u3057\u3055\u308C\u307E\u3059\u3002\xA7r`);
      } else {
        player.sendMessage(`\xA7e\u{1F504} [\u8A2D\u5B9A\u5909\u66F4] \u300C${def.name}\u300D\u306E\u81EA\u52D5\u66F4\u65B0\u3092 \xA7l\u7121\u52B9 (OFF)\xA7r\xA7e \u306B\u8A2D\u5B9A\u3057\u307E\u3057\u305F\u3002\u6B8B\u308A\u6642\u9593\u304C\u30BC\u30ED\u306B\u306A\u308B\u3068\u5931\u52B9\u3057\u307E\u3059\u3002\xA7r`);
      }
      openCarPerkManageUI(player, perkKey, blockLoc);
    } else if (res.selection === 2) {
      cancelCarPerkSubscription(player, perkKey);
      player.sendMessage(`\xA7c\u274C [\u89E3\u7D04\u5B8C\u4E86] \u300C${def.name}\u300D\u306E\u30B5\u30D6\u30B9\u30AF\u30EA\u30D7\u30B7\u30E7\u30F3\u3092\u89E3\u7D04\u3057\u307E\u3057\u305F\u3002\xA7r`);
      openVehicleServiceUI(player, blockLoc);
    } else {
      openVehicleServiceUI(player, blockLoc);
    }
  });
}
function openScratchLotteryUI(player, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const normalCost = Math.floor(5 * fedRate);
  const premiumCost = Math.floor(25 * fedRate);
  const form = new ActionFormData().title("\u{1F3B0} Misskey \u30B9\u30AF\u30E9\u30C3\u30C1\u304F\u3058 & \u30AC\u30C1\u30E3").body(
    `\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r (\xA7b${(bank / fedRate).toFixed(2)} FED\xA7r)

\u4E00\u652B\u5343\u91D1\u3092\u72D9\u3048\u308B\u30B9\u30AF\u30E9\u30C3\u30C1\u304F\u3058\u3067\u3059\uFF01
\u{1F31F} \u7279\u7B49 (JACKPOT): \xA7e10,000 FED (\u7D04150\u4E07M) \uFF0B \u30CD\u30B6\u30E9\u30A4\u30C8\u30D5\u30EB\u88C5\u5099\xA7r
\u{1F947} 1\u7B49: \xA761,000 FED\xA7r / \u{1F948} 2\u7B49: \xA7b\u5049\u696D\u306E\u30C4\u30FC\u30EB (\u4E88\u5099)\xA7r / \u{1F949} 3\u7B49: \xA7a\u30B9\u30A4\u30FC\u30C4\u8A70\u3081\u5408\u308F\u305B\xA7r`
  ).button(`\u{1F3B2} \u901A\u5E38\u30B9\u30AF\u30E9\u30C3\u30C1 (5 FED / \u7D04${normalCost.toLocaleString()} M)`).button(`\u{1F48E} \u30D7\u30EC\u30DF\u30A2\u30E0\u30B9\u30AF\u30E9\u30C3\u30C1 (25 FED / \u7D04${premiumCost.toLocaleString()} M)`).button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0 || res.selection === 1) {
      const isPremium = res.selection === 1;
      const cost = isPremium ? premiumCost : normalCost;
      if (bank < cost) {
        player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
        openScratchLotteryUI(player, blockLoc);
        return;
      }
      setPlayerBankAccount(player, bank - cost);
      const roll = Math.random() * 100;
      const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
      const jackpotRate = isPremium ? 1 : 0.2;
      const firstRate = isPremium ? 5 : 1.5;
      const secondRate = isPremium ? 15 : 6;
      const thirdRate = isPremium ? 40 : 25;
      let resultMsg = "";
      let rewardM = 0;
      if (roll < jackpotRate) {
        rewardM = Math.floor(1e4 * fedRate);
        if (inv) {
          inv.addItem(new ItemStack("minecraft:netherite_helmet", 1));
          inv.addItem(new ItemStack("minecraft:netherite_chestplate", 1));
          inv.addItem(new ItemStack("minecraft:netherite_leggings", 1));
          inv.addItem(new ItemStack("minecraft:netherite_boots", 1));
        }
        resultMsg = `\xA76\u{1F31F}\u{1F389}\u3010\u7279\u7B49 JACKPOT \u5F53\u9078\uFF01\uFF01\uFF01\u3011\xA7r
\xA7e\u8CDE\u91D1 10,000 FED (${rewardM.toLocaleString()} M) \uFF0B \u30CD\u30B6\u30E9\u30A4\u30C8\u30D5\u30EB\u88C5\u5099\u4E00\u5F0F\xA76 \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\uFF01\uFF01\xA7r`;
        world.sendMessage(`\xA76\u{1F4E2} [Misskey\u304F\u3058\u901F\u5831] \u30D7\u30EC\u30A4\u30E4\u30FC\u300C${player.name}\u300D\u304C\u30B9\u30AF\u30E9\u30C3\u30C1\u304F\u3058\u3067\u7279\u7B49 JACKPOT (10,000 FED) \u306B\u5F53\u9078\u3057\u307E\u3057\u305F\uFF01\uFF01\uFF01\xA7r`);
        player.dimension.spawnParticle("minecraft:large_explosion", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else if (roll < jackpotRate + firstRate) {
        rewardM = Math.floor(1e3 * fedRate);
        resultMsg = `\xA7e\u{1F947}\u30101\u7B49 \u5F53\u9078\uFF01\uFF01\u3011\xA7r
\xA7a\u8CDE\u91D1 1,000 FED (${rewardM.toLocaleString()} M)\xA7e \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`;
      } else if (roll < jackpotRate + firstRate + secondRate) {
        if (inv) inv.addItem(new ItemStack("mi:igyo_tool", 1));
        resultMsg = `\xA7b\u{1F948}\u30102\u7B49 \u5F53\u9078\uFF01\u3011\xA7r
\xA7e\u4E07\u80FD\u63A1\u6398\u30C4\u30FC\u30EB\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\xA7b \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`;
      } else if (roll < jackpotRate + firstRate + secondRate + thirdRate) {
        if (inv) {
          inv.addItem(new ItemStack("mi:pudding", 2));
          inv.addItem(new ItemStack("mi:nekomimi_pudding", 1));
          inv.addItem(new ItemStack("mi:baked_mochocho", 4));
        }
        resultMsg = `\xA7a\u{1F949}\u30103\u7B49 \u5F53\u9078\uFF01\u3011\xA7r
\xA7d\u30D7\u30EA\u30F3\uFF06\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7\u8A70\u3081\u5408\u308F\u305B\xA7a \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`;
      } else {
        if (inv) inv.addItem(new ItemStack("mi:baked_mochocho", 1));
        resultMsg = `\xA77\u3010\u53C2\u52A0\u8CDE\u3011\u30D9\u30A4\u30AF\u30C9\u30E2\u30C1\u30E7\u30C1\u30E7 \xD7 1 \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\u3002\u6B21\u56DE\u306B\u671F\u5F85\uFF01\xA7r`;
      }
      if (rewardM > 0) {
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + rewardM);
      }
      player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      const resForm = new ActionFormData().title("\u{1F3B0} \u30B9\u30AF\u30E9\u30C3\u30C1\u7D50\u679C\u767A\u8868\uFF01").body(`\u524A\u3063\u305F\u7D50\u679C...

${resultMsg}`).button("\u{1F3B2} \u3082\u3046\u4E00\u5EA6\u5F15\u304F").button("\u{1F519} \u623B\u308B");
      showFormSafe(player, resForm, (fRes) => {
        if (fRes.selection === 0) {
          openScratchLotteryUI(player, blockLoc);
        } else {
          openFinancialPortalUI(player, blockLoc);
        }
      });
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openWealthRankUI(player, blockLoc) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);
  let stockValue = 0;
  for (const [code, count] of Object.entries(holdings)) {
    const stock = stockMarket.find((s) => s.code === code);
    if (stock && count > 0) stockValue += stock.currentPrice * count;
  }
  const positions = getPlayerFxPositions(player);
  let fxTotal = 0;
  for (const pos of positions) {
    fxTotal += pos.margin;
    const pair = fxPairs.find((p) => p.id === pos.pairId);
    if (pair) fxTotal += calculatePositionProfit(pos, pair.currentRate);
  }
  const totalM = cash + bank + stockValue + fxTotal;
  const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
  const totalFed = totalM / fedRate;
  const myRank = getPlayerWealthRank(totalFed);
  let rankList = "";
  for (const r of WEALTH_RANKS) {
    const isCurrent = myRank.rankName === r.rankName ? " \xA7e\u25C0 \u3042\u306A\u305F\u306E\u30E9\u30F3\u30AF\xA7r" : "";
    rankList += `${r.badge} \xA7f${r.rankName}\xA7r (\u57FA\u6E96: ${r.minFed.toLocaleString()} FED)${isCurrent}
\xA77${r.description}\xA7r

`;
  }
  const form = new ActionFormData().title("\u{1F451} \u5BCC\u8C6A\u30E9\u30F3\u30AD\u30F3\u30B0 & \u79F0\u53F7\u30B7\u30B9\u30C6\u30E0").body(
    `\u{1F464} \u73FE\u5728\u306E\u7DCF\u8CC7\u7523: \xA76${totalM.toLocaleString()} M\xA7r (\xA7b${totalFed.toFixed(2)} FED\xA7r)
\u73FE\u5728\u306E\u79F0\u53F7: ${myRank.badge} \xA7l${myRank.rankName}\xA7r
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u3010\u79F0\u53F7\u30FB\u30E9\u30F3\u30AF\u4E00\u89A7\u3011

` + rankList
  ).button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, () => {
    openFinancialPortalUI(player, blockLoc);
  });
}
function openAtmUI(player, blockLoc) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);
  const form = new ActionFormData().title("\u{1F3E6} Misskey\u9280\u884C ATM").body(`\u6240\u6301\u73FE\u91D1: \xA7e${cash.toLocaleString()} M\xA7r
\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r

\u64CD\u4F5C\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:`).button(`\u{1F4B0} \u624B\u6301\u3061\u306E\u73FE\u91D1\u3092\u5168\u984D\u5165\u91D1 (+${cash.toLocaleString()} M)`).button("\u{1F4B5} 10,000 M \u51FA\u91D1 (10,000 M\u7D19\u5E63\xD71)").button("\u{1F4B5} 5,000 M \u51FA\u91D1 (5,000 M\u7D19\u5E63\xD71)").button("\u{1F4B5} 1,000 M \u51FA\u91D1 (1,000 M\u7D19\u5E63\xD71)").button("\u{1FA99} 500 M \u51FA\u91D1 (500 M\u786C\u8CA8\xD71)").button("\u{1F522} \u91D1\u984D\u3092\u6307\u5B9A\u3057\u3066\u51FA\u91D1").button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      const dep = depositAllCash(player);
      if (dep > 0) {
        player.sendMessage(`\xA7a\u{1F3E6} [\u5165\u91D1\u5B8C\u4E86] \u624B\u6301\u3061\u306E\u73FE\u91D1 \xA7e${dep.toLocaleString()} M\xA7a \u3092\u53E3\u5EA7\u306B\u5165\u91D1\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u306BM\u30B3\u30A4\u30F3\u30A2\u30A4\u30C6\u30E0\u304C\u3042\u308A\u307E\u305B\u3093\u3002\xA7r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 1) {
      if (withdrawCash(player, 1e4)) {
        player.sendMessage("\xA7a\u{1F3E7} [\u51FA\u91D1\u5B8C\u4E86] \u53E3\u5EA7\u304B\u3089 \xA7e10,000 M\xA7a \u3092\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\u3002\xA7r");
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 2) {
      if (withdrawCash(player, 5e3)) {
        player.sendMessage("\xA7a\u{1F3E7} [\u51FA\u91D1\u5B8C\u4E86] \u53E3\u5EA7\u304B\u3089 \xA7e5,000 M\xA7a \u3092\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\u3002\xA7r");
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 3) {
      if (withdrawCash(player, 1e3)) {
        player.sendMessage("\xA7a\u{1F3E7} [\u51FA\u91D1\u5B8C\u4E86] \u53E3\u5EA7\u304B\u3089 \xA7e1,000 M\xA7a \u3092\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\u3002\xA7r");
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 4) {
      if (withdrawCash(player, 500)) {
        player.sendMessage("\xA7a\u{1F3E7} [\u51FA\u91D1\u5B8C\u4E86] \u53E3\u5EA7\u304B\u3089 \xA7e500 M\xA7a \u3092\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\u3002\xA7r");
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 5) {
      const modal = new ModalFormData().title("\u{1F522} \u51FA\u91D1\u91D1\u984D\u306E\u6307\u5B9A").textField(`\u51FA\u91D1\u3057\u305F\u3044\u91D1\u984D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044 (\u53E3\u5EA7\u6B8B\u9AD8: ${bank.toLocaleString()} M):`, "\u4F8B: 30000");
      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openAtmUI(player, blockLoc);
          return;
        }
        const val = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(val) || val <= 0) {
          player.sendMessage("\xA7c\u26A0\uFE0F \u6B63\u3057\u3044\u91D1\u984D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\xA7r");
        } else if (withdrawCash(player, val)) {
          player.sendMessage(`\xA7a\u{1F3E7} [\u51FA\u91D1\u5B8C\u4E86] \u53E3\u5EA7\u304B\u3089 \xA7e${val.toLocaleString()} M\xA7a \u3092\u5F15\u304D\u51FA\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        } else {
          player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u308B\u304B\u3001\u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u306B\u7A7A\u304D\u304C\u3042\u308A\u307E\u305B\u3093\u3002\xA7r");
        }
        openAtmUI(player, blockLoc);
      });
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openItemSellUI(player, blockLoc) {
  const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
  if (!inv) return;
  const inventoryCounts = {};
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (!item) continue;
    if (SELLABLE_ITEMS.some((s) => s.typeId === item.typeId)) {
      inventoryCounts[item.typeId] = (inventoryCounts[item.typeId] || 0) + item.amount;
    }
  }
  let totalSellValue = 0;
  for (const s of SELLABLE_ITEMS) {
    const count = inventoryCounts[s.typeId] || 0;
    totalSellValue += s.price * count;
  }
  const form = new ActionFormData().title("\u{1F6D2} \u8CB7\u53D6\u30FB\u63DB\u91D1\u6240").body(
    `\u9271\u77F3\u3084\u7279\u7523\u54C1\u3092\u58F2\u5374\u3057\u3066\u53E3\u5EA7\u306B M\u30B3\u30A4\u30F3 \u3092\u30C1\u30E3\u30FC\u30B8\u3067\u304D\u307E\u3059\uFF01
\u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u5185\u306E\u63DB\u91D1\u53EF\u80FD\u30A2\u30A4\u30C6\u30E0\u7DCF\u984D: \xA7e${totalSellValue.toLocaleString()} M\xA7r

\u58F2\u5374\u65B9\u6CD5\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:`
  ).button(`\u2728 \u63DB\u91D1\u53EF\u80FD\u30A2\u30A4\u30C6\u30E0\u3092\u3059\u3079\u3066\u4E00\u62EC\u58F2\u5374 (+${totalSellValue.toLocaleString()} M)`);
  for (const s of SELLABLE_ITEMS) {
    const count = inventoryCounts[s.typeId] || 0;
    form.button(`${s.name} (\u5358\u4FA1: ${s.price.toLocaleString()} M)
[\u6240\u6301: ${count}\u500B / \u4FA1\u5024: ${(s.price * count).toLocaleString()} M]`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      if (totalSellValue <= 0) {
        player.sendMessage("\xA7c\u26A0\uFE0F \u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u306B\u58F2\u5374\u53EF\u80FD\u306A\u30A2\u30A4\u30C6\u30E0\u304C\u3042\u308A\u307E\u305B\u3093\u3002\xA7r");
        openItemSellUI(player, blockLoc);
        return;
      }
      for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item && SELLABLE_ITEMS.some((s) => s.typeId === item.typeId)) {
          inv.setItem(i, void 0);
        }
      }
      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + totalSellValue);
      player.sendMessage(`\xA7a\u{1F6D2} [\u58F2\u5374\u5B8C\u4E86] \u30A2\u30A4\u30C6\u30E0\u3092\u4E00\u62EC\u58F2\u5374\u3057\u3001\xA7e${totalSellValue.toLocaleString()} M\xA7a \u3092\u53E3\u5EA7\u306B\u30C1\u30E3\u30FC\u30B8\u3057\u307E\u3057\u305F\uFF01\xA7r`);
      player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      openItemSellUI(player, blockLoc);
    } else if (res.selection <= SELLABLE_ITEMS.length) {
      const chosen = SELLABLE_ITEMS[res.selection - 1];
      const count = inventoryCounts[chosen.typeId] || 0;
      if (count <= 0) {
        player.sendMessage(`\xA7c\u26A0\uFE0F \u300C${chosen.name}\u300D\u3092\u6240\u6301\u3057\u3066\u3044\u307E\u305B\u3093\u3002\xA7r`);
        openItemSellUI(player, blockLoc);
        return;
      }
      let remainingToRemove = count;
      for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item && item.typeId === chosen.typeId) {
          if (item.amount <= remainingToRemove) {
            remainingToRemove -= item.amount;
            inv.setItem(i, void 0);
          } else {
            item.amount -= remainingToRemove;
            inv.setItem(i, item);
            remainingToRemove = 0;
          }
          if (remainingToRemove <= 0) break;
        }
      }
      const earned = chosen.price * count;
      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + earned);
      player.sendMessage(`\xA7a\u{1F6D2} [\u58F2\u5374\u5B8C\u4E86] ${chosen.name} \xD7 ${count} \u500B\u3092\u58F2\u5374\u3057\u3001\xA7e${earned.toLocaleString()} \u5186\xA7a \u3092\u7372\u5F97\u3057\u307E\u3057\u305F\uFF01\xA7r`);
      openItemSellUI(player, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openFxExchangeUI(player, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const positions = getPlayerFxPositions(player);
  const form = new ActionFormData().title("\u{1F4C8} Misskey FX (\u70BA\u66FF\u53D6\u5F15\u6240)").body(
    `\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r
\u70BA\u66FF\u30EC\u30FC\u30C8\u306F\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u306B\u30E9\u30F3\u30C0\u30E0\u5909\u52D5\u3057\u307E\u3059\u3002\u30EC\u30D0\u30EC\u30C3\u30B8\u3092\u304B\u3051\u3066\u8CB7\u3044(Long)\u3084\u58F2\u308A(Short)\u3067\u70BA\u66FF\u5DEE\u76CA\u3092\u72D9\u3044\u307E\u3057\u3087\u3046\uFF01

\u53D6\u5F15\u3057\u305F\u3044\u901A\u8CA8\u30DA\u30A2\u307E\u305F\u306F\u30DD\u30B8\u30B7\u30E7\u30F3\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:`
  );
  for (const pair of fxPairs) {
    const diff = pair.currentRate - pair.prevRate;
    const arrow = diff > 0 ? "\xA7c\u25B2" : diff < 0 ? "\xA79\u25BC" : "\xA77-";
    const diffText = `${arrow} ${pair.currentRate.toFixed(2)} M (${diff >= 0 ? "+" : ""}${diff.toFixed(2)})\xA7r`;
    const chart = pair.history.map((h) => h.toFixed(1)).join("\u2192");
    form.button(`${pair.name}
\u73FE\u5728: ${diffText} [\u63A8\u79FB: ${chart}]`);
  }
  form.button(`\u{1F4BC} \u4FDD\u6709\u30DD\u30B8\u30B7\u30E7\u30F3\u4E00\u89A7\u30FB\u6C7A\u6E08 (${positions.length}\u4EF6)`);
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < fxPairs.length) {
      const pair = fxPairs[res.selection];
      openFxOrderModal(player, pair, blockLoc);
    } else if (res.selection === fxPairs.length) {
      openFxPositionsUI(player, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openFxOrderModal(player, pair, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const diff = pair.currentRate - pair.prevRate;
  const arrow = diff >= 0 ? "\u25B2" : "\u25BC";
  const modal = new ModalFormData().title(`\u{1F4C8} FX\u6CE8\u6587: ${pair.name}`).dropdown("\u6CE8\u6587\u30BF\u30A4\u30D7:", ["\u{1F7E2} \u8CB7\u3044 (Long - \u4E0A\u6607\u3067\u5229\u76CA)", "\u{1F534} \u58F2\u308A (Short - \u4E0B\u843D\u3067\u5229\u76CA)"], 0).dropdown("\u30EC\u30D0\u30EC\u30C3\u30B8\u500D\u7387:", ["1\u500D (\u73FE\u7269\u76F8\u5F53)", "5\u500D (\u6A19\u6E96)", "10\u500D (\u30CF\u30A4\u30EC\u30D0)", "25\u500D (\u8D85\u30CF\u30A4\u30EA\u30B9\u30AF)"], 1).textField(`\u8A3C\u62E0\u91D1 (\u53E3\u5EA7\u304B\u3089\u6295\u5165\u3059\u308BM\u30B3\u30A4\u30F3 / \u53E3\u5EA7\u6B8B\u9AD8: ${bank.toLocaleString()} M):`, "\u4F8B: 10000", "5000");
  showFormSafe(player, modal, (res) => {
    if (res.canceled || !res.formValues) {
      openFxExchangeUI(player, blockLoc);
      return;
    }
    const type = res.formValues[0] === 0 ? "BUY" : "SELL";
    const levOptions = [1, 5, 10, 25];
    const leverage = levOptions[Number(res.formValues[1])] || 1;
    const margin = parseInt(String(res.formValues[2]).trim());
    if (isNaN(margin) || margin <= 0) {
      player.sendMessage("\xA7c\u26A0\uFE0F \u6B63\u3057\u3044\u8A3C\u62E0\u91D1\u984D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\xA7r");
      openFxExchangeUI(player, blockLoc);
      return;
    }
    if (margin > bank) {
      player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
      openFxExchangeUI(player, blockLoc);
      return;
    }
    setPlayerBankAccount(player, bank - margin);
    const volume = margin * leverage / pair.currentRate;
    const newPos = {
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
      pairId: pair.id,
      type,
      leverage,
      entryRate: pair.currentRate,
      margin,
      volume,
      timestamp: Date.now()
    };
    const positions = getPlayerFxPositions(player);
    positions.push(newPos);
    setPlayerFxPositions(player, positions);
    player.sendMessage(
      `\xA7a\u{1F4C8} [FX\u6CE8\u6587\u7D04\u5B9A] ${pair.name} \u3092 ${type === "BUY" ? "\u8CB7\u3044(Long)" : "\u58F2\u308A(Short)"} \u3067\u30A8\u30F3\u30C8\u30EA\u30FC\u3057\u307E\u3057\u305F\uFF01
\xA77\u30EC\u30FC\u30C8: ${pair.currentRate.toFixed(2)} M | \u30EC\u30D0\u30EC\u30C3\u30B8: ${leverage}\u500D | \u8A3C\u62E0\u91D1: ${margin.toLocaleString()} M | \u53D6\u5F15\u6570\u91CF: ${volume.toFixed(2)}\xA7r`
    );
    openFxPositionsUI(player, blockLoc);
  });
}
function openFxPositionsUI(player, blockLoc) {
  const positions = getPlayerFxPositions(player);
  const form = new ActionFormData().title("\u{1F4BC} \u4FDD\u6709FX\u30DD\u30B8\u30B7\u30E7\u30F3\u4E00\u89A7").body(positions.length === 0 ? "\u73FE\u5728\u4FDD\u6709\u3057\u3066\u3044\u308BFX\u30DD\u30B8\u30B7\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u300C\u901A\u8CA8\u30DA\u30A2\u300D\u3092\u9078\u3093\u3067\u30A8\u30F3\u30C8\u30EA\u30FC\u3057\u307E\u3057\u3087\u3046\uFF01" : "\u6C7A\u6E08\u3057\u305F\u3044\u30DD\u30B8\u30B7\u30E7\u30F3\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044:");
  for (const pos of positions) {
    const pair = fxPairs.find((p) => p.id === pos.pairId);
    const curRate = pair ? pair.currentRate : pos.entryRate;
    const profit = calculatePositionProfit(pos, curRate);
    const sign = profit >= 0 ? "+" : "";
    const color = profit >= 0 ? "\xA7a" : "\xA7c";
    form.button(
      `${pair ? pair.name : pos.pairId} [${pos.type} / ${pos.leverage}\u500D]
\u7D04\u5B9A: ${pos.entryRate.toFixed(2)} \u2192 \u73FE\u5728: ${curRate.toFixed(2)} | \u640D\u76CA: ${color}${sign}${profit.toLocaleString()} M\xA7r`
    );
  }
  if (positions.length > 0) {
    form.button("\u{1F4A5} \u3059\u3079\u3066\u306E\u30DD\u30B8\u30B7\u30E7\u30F3\u3092\u4E00\u62EC\u6C7A\u6E08\u3059\u308B");
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < positions.length) {
      const pos = positions[res.selection];
      const pair = fxPairs.find((p) => p.id === pos.pairId);
      const curRate = pair ? pair.currentRate : pos.entryRate;
      const profit = calculatePositionProfit(pos, curRate);
      const returnAmount = Math.max(0, pos.margin + profit);
      positions.splice(res.selection, 1);
      setPlayerFxPositions(player, positions);
      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + returnAmount);
      const color = profit >= 0 ? "\xA7a" : "\xA7c";
      const sign = profit >= 0 ? "+" : "";
      player.sendMessage(`\xA7a\u{1F4BC} [FX\u6C7A\u6E08\u5B8C\u4E86] \u30DD\u30B8\u30B7\u30E7\u30F3\u3092\u6C7A\u6E08\u3057\u307E\u3057\u305F\u3002\u640D\u76CA: ${color}${sign}${profit.toLocaleString()} M\xA7a (\u53D7\u53D6\u984D: ${returnAmount.toLocaleString()} M)\xA7r`);
      openFxPositionsUI(player, blockLoc);
    } else if (positions.length > 0 && res.selection === positions.length) {
      let totalReturn = 0;
      let totalProfit = 0;
      for (const pos of positions) {
        const pair = fxPairs.find((p) => p.id === pos.pairId);
        const curRate = pair ? pair.currentRate : pos.entryRate;
        const profit = calculatePositionProfit(pos, curRate);
        totalProfit += profit;
        totalReturn += Math.max(0, pos.margin + profit);
      }
      setPlayerFxPositions(player, []);
      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + totalReturn);
      const color = totalProfit >= 0 ? "\xA7a" : "\xA7c";
      const sign = totalProfit >= 0 ? "+" : "";
      player.sendMessage(`\xA7a\u{1F4BC} [FX\u5168\u6C7A\u6E08\u5B8C\u4E86] \u3059\u3079\u3066\u306E\u30DD\u30B8\u30B7\u30E7\u30F3\u3092\u6C7A\u6E08\u3057\u307E\u3057\u305F\u3002\u5408\u8A08\u640D\u76CA: ${color}${sign}${totalProfit.toLocaleString()} M\xA7a (\u53D7\u53D6\u984D: ${totalReturn.toLocaleString()} M)\xA7r`);
      openFxPositionsUI(player, blockLoc);
    } else {
      openFxExchangeUI(player, blockLoc);
    }
  });
}
function openStockMarketUI(player, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);
  const form = new ActionFormData().title("\u{1F3E2} Misskey \u682A\u5F0F\u5E02\u5834").body(
    `\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r
Misskey\u4E16\u754C\u306E\u6709\u529B\u4F01\u696D\u306E\u682A\u5F0F\u3092\u58F2\u8CB7\u3067\u304D\u307E\u3059\u3002\u4FDD\u6709\u3057\u3066\u3044\u308B\u3068\u5B9A\u671F\u7684\u306B\u300C\u914D\u5F53\u91D1\u300D\u3082\u5F97\u3089\u308C\u307E\u3059\uFF01

\u9298\u67C4\u3092\u9078\u629E\u3057\u3066\u8A73\u7D30\u78BA\u8A8D\u30FB\u8CFC\u5165\u30FB\u58F2\u5374\u3092\u884C\u3048\u307E\u3059:`
  );
  for (const stock of stockMarket) {
    const diff = stock.currentPrice - stock.prevPrice;
    const arrow = diff > 0 ? "\xA7c\u25B2" : diff < 0 ? "\xA79\u25BC" : "\xA77-";
    const diffText = `${arrow} ${stock.currentPrice.toLocaleString()} M (${diff >= 0 ? "+" : ""}${diff.toLocaleString()})\xA7r`;
    const myCount = holdings[stock.code] || 0;
    const holdText = myCount > 0 ? ` [\u4FDD\u6709: ${myCount}\u682A]` : "";
    form.button(`${stock.name} (${stock.code})
${diffText}${holdText}`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < stockMarket.length) {
      const stock = stockMarket[res.selection];
      openStockDetailUI(player, stock, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openStockDetailUI(player, stock, blockLoc) {
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);
  const myCount = holdings[stock.code] || 0;
  const myValue = stock.currentPrice * myCount;
  const chart = stock.history.map((h) => h.toLocaleString()).join(" \u2192 ");
  const form = new ActionFormData().title(`\u{1F3E2} \u9298\u67C4\u8A73\u7D30: ${stock.name}`).body(
    `\u3010\u9298\u67C4\u30B3\u30FC\u30C9\u3011: \xA7e${stock.code}\xA7r (${stock.sector})
\u3010\u73FE\u5728\u682A\u4FA1\u3011: \xA76${stock.currentPrice.toLocaleString()} M\xA7r (\u57FA\u6E96: ${stock.basePrice.toLocaleString()} M)
\u3010\u914D\u5F53\u5229\u56DE\u308A\u3011: \xA7a${(stock.dividendRate * 100).toFixed(1)}% / \u5468\u671F\xA7r
\u3010\u4F01\u696D\u6982\u8981\u3011: ${stock.description}
\u3010\u76F4\u8FD1\u63A8\u79FB\u3011: ${chart}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} \u3042\u306A\u305F\u306E\u4FDD\u6709\u6570: \xA7b${myCount} \u682A\xA7r (\u8A55\u4FA1\u984D: ${myValue.toLocaleString()} M)
\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r`
  ).button("\u{1F6D2} \u3053\u306E\u682A\u3092\u8CFC\u5165\u3059\u308B").button(myCount > 0 ? `\u{1F4B0} \u3053\u306E\u682A\u3092\u58F2\u5374\u3059\u308B (\u4FDD\u6709: ${myCount}\u682A)` : "\u{1F512} \u58F2\u5374\u4E0D\u53EF (\u672A\u4FDD\u6709)").button("\u{1F519} \u9298\u67C4\u4E00\u89A7\u306B\u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      const maxBuy = Math.floor(bank / stock.currentPrice);
      const modal = new ModalFormData().title(`\u{1F6D2} \u682A\u306E\u8CFC\u5165: ${stock.name}`).textField(`\u8CFC\u5165\u682A\u6570\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044 (\u5358\u4FA1: ${stock.currentPrice.toLocaleString()} M / \u6700\u5927: ${maxBuy}\u682A):`, "\u4F8B: 10", "1");
      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openStockDetailUI(player, stock, blockLoc);
          return;
        }
        const count = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(count) || count <= 0) {
          player.sendMessage("\xA7c\u26A0\uFE0F \u6B63\u3057\u3044\u682A\u6570\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\xA7r");
        } else {
          const totalCost = stock.currentPrice * count;
          if (totalCost > bank) {
            player.sendMessage("\xA7c\u26A0\uFE0F \u53E3\u5EA7\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002\xA7r");
          } else {
            setPlayerBankAccount(player, bank - totalCost);
            holdings[stock.code] = (holdings[stock.code] || 0) + count;
            setPlayerStockHoldings(player, holdings);
            player.sendMessage(`\xA7a\u{1F6D2} [\u8CFC\u5165\u5B8C\u4E86] ${stock.name} \u3092 ${count} \u682A\u8CFC\u5165\u3057\u307E\u3057\u305F\uFF01\uFF08\u7DCF\u984D: ${totalCost.toLocaleString()} M\uFF09\xA7r`);
            player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
          }
        }
        openStockDetailUI(player, stock, blockLoc);
      });
    } else if (res.selection === 1 && myCount > 0) {
      const modal = new ModalFormData().title(`\u{1F4B0} \u682A\u306E\u58F2\u5374: ${stock.name}`).textField(`\u58F2\u5374\u682A\u6570\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044 (\u5358\u4FA1: ${stock.currentPrice.toLocaleString()} M / \u4FDD\u6709: ${myCount}\u682A):`, `\u6700\u5927: ${myCount}`, String(myCount));
      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openStockDetailUI(player, stock, blockLoc);
          return;
        }
        const count = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(count) || count <= 0 || count > myCount) {
          player.sendMessage("\xA7c\u26A0\uFE0F \u4FDD\u6709\u682A\u6570\u4EE5\u4E0B\u306E\u6B63\u3057\u3044\u682A\u6570\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\xA7r");
        } else {
          const totalEarned = stock.currentPrice * count;
          setPlayerBankAccount(player, bank + totalEarned);
          holdings[stock.code] = myCount - count;
          if (holdings[stock.code] <= 0) delete holdings[stock.code];
          setPlayerStockHoldings(player, holdings);
          player.sendMessage(`\xA7a\u{1F4B0} [\u58F2\u5374\u5B8C\u4E86] ${stock.name} \u3092 ${count} \u682A\u58F2\u5374\u3057\u3001\xA7e${totalEarned.toLocaleString()} M\xA7a \u3092\u53E3\u5EA7\u306B\u53D7\u3051\u53D6\u308A\u307E\u3057\u305F\uFF01\xA7r`);
        }
        openStockDetailUI(player, stock, blockLoc);
      });
    } else {
      openStockMarketUI(player, blockLoc);
    }
  });
}
function openMarketNewsUI(player, blockLoc) {
  const form = new ActionFormData().title("\u{1F4F0} Misskey \u7D4C\u6E08\u30CB\u30E5\u30FC\u30B9\u901F\u5831 (\u682A\u5F0F & FX)").body(
    marketNewsHistory.length === 0 ? "\u73FE\u5728\u914D\u4FE1\u4E2D\u306E\u91CD\u5927\u30CB\u30E5\u30FC\u30B9\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u5E02\u5834\u306F\u5E73\u5E38\u904B\u8EE2\u3067\u3059\u3002" : `\u6700\u65B0\u306E\u5E02\u5834\u30CB\u30E5\u30FC\u30B9\u4E00\u89A7 (\u5168${marketNewsHistory.length}\u4EF6):
\u6C17\u306B\u306A\u308B\u30CB\u30E5\u30FC\u30B9\u3092\u30BF\u30C3\u30D7\u3057\u3066\u8A73\u7D30\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059:`
  );
  for (const news of marketNewsHistory) {
    const icon = news.category === "fx" ? "\u{1F310}[\u70BA\u66FF]" : "\u{1F3E2}[\u682A\u5F0F]";
    const impactText = news.impactPercent >= 0 ? `+${news.impactPercent}%` : `${news.impactPercent}%`;
    form.button(`${icon} ${news.title}
[\u5F71\u97FF: ${impactText}] ${news.content.substring(0, 20)}...`);
  }
  form.button("\u{1F519} \u623B\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection < marketNewsHistory.length) {
      const chosen = marketNewsHistory[res.selection];
      const categoryName = chosen.category === "fx" ? "\u{1F310} \u5916\u56FD\u70BA\u66FF (FX) \u5E02\u5834\u30CB\u30E5\u30FC\u30B9" : "\u{1F3E2} Misskey \u682A\u5F0F\u5E02\u5834\u30CB\u30E5\u30FC\u30B9";
      const impactSign = chosen.impactPercent >= 0 ? "+" : "";
      const detailForm = new ActionFormData().title("\u{1F4F0} \u30CB\u30E5\u30FC\u30B9\u8A73\u7D30\u901F\u5831").body(
        `\u3010\u30AB\u30C6\u30B4\u30EA\u30FC\u3011: \xA7e${categoryName}\xA7r
\u3010\u898B\u51FA\u3057\u3011: \xA7l${chosen.title}\xA7r
\u3010\u5E02\u5834\u3078\u306E\u5F71\u97FF\u3011: \xA7a${chosen.targetCode} \u304C ${impactSign}${chosen.impactPercent}% \u5909\u52D5\xA7r
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${chosen.content}`
      ).button("\u{1F519} \u30CB\u30E5\u30FC\u30B9\u4E00\u89A7\u306B\u623B\u308B");
      showFormSafe(player, detailForm, () => {
        openMarketNewsUI(player, blockLoc);
      });
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}
function openQuickWalletUI(player) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);
  const form = new ActionFormData().title("\u{1F45B} \u304A\u8CA1\u5E03 & \u53E3\u5EA7\u30AF\u30A4\u30C3\u30AF\u30E1\u30CB\u30E5\u30FC").body(`\u6240\u6301\u73FE\u91D1: \xA7e${cash.toLocaleString()} M\xA7r
\u53E3\u5EA7\u6B8B\u9AD8: \xA7a${bank.toLocaleString()} M\xA7r`).button(`\u{1F4B0} \u624B\u6301\u3061\u306E\u73FE\u91D1\u3092\u5168\u984D\u53E3\u5EA7\u306B\u5165\u91D1 (+${cash.toLocaleString()} M)`).button("\u{1F4B9} Misskey\u8A3C\u5238 & FX\u53D6\u5F15\u6240\u3092\u958B\u304F").button("\u{1F519} \u9589\u3058\u308B");
  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === void 0) return;
    if (res.selection === 0) {
      const dep = depositAllCash(player);
      if (dep > 0) {
        player.sendMessage(`\xA7a\u{1F45B} [\u30AF\u30A4\u30C3\u30AF\u5165\u91D1] \u624B\u6301\u3061\u306E\u73FE\u91D1 \xA7e${dep.toLocaleString()} M\xA7a \u3092\u53E3\u5EA7\u306B\u5165\u91D1\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else {
        player.sendMessage("\xA7c\u26A0\uFE0F \u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u306BM\u30B3\u30A4\u30F3\u30A2\u30A4\u30C6\u30E0\u304C\u3042\u308A\u307E\u305B\u3093\u3002\xA7r");
      }
    } else if (res.selection === 1) {
      openFinancialPortalUI(player);
    }
  });
}
var puddingBounceMap = /* @__PURE__ */ new Map();
var playerLastBounceTimeMap = /* @__PURE__ */ new Map();
var playerPuddingEatLock = /* @__PURE__ */ new Map();
function handlePuddingEat(player, block, isNekomimi) {
  const now = Date.now();
  const lastEat = playerPuddingEatLock.get(player.id) || 0;
  if (now - lastEat < 500) return;
  playerPuddingEatLock.set(player.id, now);
  const loc = block.location;
  const dim = player.dimension;
  system.run(() => {
    block.setType("minecraft:air");
    dim.spawnParticle("minecraft:heart_particle", { x: loc.x + 0.5, y: loc.y + 0.6, z: loc.z + 0.5 });
    dim.spawnParticle("minecraft:villager_happy", { x: loc.x + 0.5, y: loc.y + 0.8, z: loc.z + 0.5 });
    if (isNekomimi) {
      try {
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        if (equippable) {
          equippable.setEquipment("Head", new ItemStack("mi:nekomimi_ears", 1));
        }
      } catch (e) {
      }
      player.addEffect("speed", 6e3, { amplifier: 0 });
      player.addEffect("slow_falling", 1200, { amplifier: 0 });
    } else {
      player.addEffect("regeneration", 200, { amplifier: 0 });
    }
  });
}
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
  if (block.typeId.includes("bed")) {
    grantAchievement(player, "suimin");
  }
  if (block.typeId === "minecraft:smithing_table") {
    playerSmithingTableOpenMap.set(player.id, Date.now());
  }
  if (block.typeId === "mi:pudding") {
    event.cancel = true;
    handlePuddingEat(player, block, false);
    return;
  }
  if (block.typeId === "mi:nekomimi_pudding") {
    event.cancel = true;
    handlePuddingEat(player, block, true);
    return;
  }
  if (block.typeId === "mi:instance_server") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    const loc = block.location;
    system.run(() => {
      openInstanceServerUI(player, loc);
    });
    return;
  }
  if (block.typeId === "mi:note_board" || block.typeId === "mi:desktop_pc" || block.typeId === "mi:laptop_pc" || block.typeId === "mi:display_monitor") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    const loc = block.location;
    const blockType = block.typeId;
    system.run(() => {
      const bLoc = { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 };
      player.dimension.spawnParticle("minecraft:villager_happy", bLoc);
      if (blockType === "mi:desktop_pc") {
        player.sendMessage("\xA7b\u{1F4BB} [PC\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8] \u30C7\u30B9\u30AF\u30C8\u30C3\u30D7PC\u3092\u8D77\u52D5\u3057\u3001Misskey\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u3092\u958B\u304D\u307E\u3057\u305F\uFF01\xA7r");
      } else if (blockType === "mi:laptop_pc") {
        player.sendMessage("\xA7a\u{1F4BB} [\u30CE\u30FC\u30C8PC] \u30CE\u30FC\u30C8\u30D1\u30BD\u30B3\u30F3\u3092\u958B\u304D\u3001Misskey\u306B\u63A5\u7D9A\u3057\u307E\u3057\u305F\uFF01\xA7r");
      } else if (blockType === "mi:display_monitor") {
        player.sendMessage("\xA7e\u{1F5A5}\uFE0F [\u30E2\u30CB\u30BF\u30FC] \u753B\u9762\u306E\u96FB\u6E90\u3092\u5165\u308C\u3001Misskey\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u8868\u793A\u3057\u307E\u3057\u305F\uFF01\xA7r");
      }
      openNoteBoardUI(player, loc);
    });
    return;
  }
  if (block.typeId === "minecraft:chest" || block.typeId === "minecraft:trapped_chest") {
    try {
      const chestContainer = block.getComponent("minecraft:inventory")?.container;
      if (chestContainer) {
        const requiredIgyoTypes = [
          "mi:aisatu_ha_igyo",
          "mi:suimin_ha_igyo",
          "mi:suibunhokyu_ha_igyo",
          "mi:asakatsu_ha_igyo",
          "mi:chokin_ha_igyo",
          "mi:dokusho_ha_igyo",
          "mi:josetsu_ha_igyo",
          "mi:kaimono_ha_igyo",
          "mi:seichi_ha_igyo",
          "mi:upgrade_ha_igyo",
          "mi:shokuji_ha_igyo"
        ];
        const matchedSlots = /* @__PURE__ */ new Map();
        for (let i = 0; i < chestContainer.size; i++) {
          const item = chestContainer.getItem(i);
          if (!item) continue;
          if (requiredIgyoTypes.includes(item.typeId) && !matchedSlots.has(item.typeId)) {
            matchedSlots.set(item.typeId, i);
          }
        }
        if (matchedSlots.size === requiredIgyoTypes.length) {
          if (playerHasItem(player, "mi:igyo_tool")) {
            player.sendMessage("\xA7e\u26A0\uFE0F [\u5049\u696D\u306E\u5100\u5F0F] \u3042\u306A\u305F\u306F\u3059\u3067\u306B\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u6240\u6301\u3057\u3066\u3044\u307E\u3059\uFF01\xA7r");
          } else {
            event.cancel = true;
            const blockLoc = block.location;
            const dim = player.dimension;
            system.run(() => {
              try {
                for (const [typeId, slotIdx] of matchedSlots.entries()) {
                  const item = chestContainer.getItem(slotIdx);
                  if (item) {
                    if (item.amount > 1) {
                      item.amount -= 1;
                      chestContainer.setItem(slotIdx, item);
                    } else {
                      chestContainer.setItem(slotIdx, void 0);
                    }
                  }
                }
                const toolItem = new ItemStack("mi:igyo_tool", 1);
                let addedToChest = false;
                try {
                  chestContainer.addItem(toolItem);
                  addedToChest = true;
                } catch (e) {
                  addedToChest = false;
                }
                if (!addedToChest) {
                  dim.spawnItem(toolItem, { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
                }
                dim.spawnParticle("minecraft:totem_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:large_explosion", { x: blockLoc.x + 0.5, y: blockLoc.y + 1, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:villager_happy", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.5, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.8, z: blockLoc.z + 0.5 });
                player.sendMessage("\xA76\u{1F3C6}\u2728\u3010\u5049\u696D\u9054\u6210\u306E\u5100\u5F0F\u301111\u306E\u5049\u696D\u304C\u5171\u9CF4\u3057\u3001\u4E07\u80FD\u306A\u308B\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u304C\u6388\u3051\u3089\u308C\u305F\uFF01\xA7r");
                world.sendMessage(`\xA76\u{1F4E2} [Mi_Addon] \u30D7\u30EC\u30A4\u30E4\u30FC\u300C${player.name}\u300D\u304C11\u306E\u5049\u696D\u3092\u3059\u3079\u3066\u6367\u3052\u3001\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u624B\u306B\u5165\u308C\u307E\u3057\u305F\uFF01\xA7r`);
              } catch (e) {
                console.warn("[Mi_Addon] Error during Igyo tool ritual: " + e);
              }
            });
            return;
          }
        }
      }
    } catch (e) {
    }
  }
});
var generatedSteelworksLocations = [];
function generateYahataSteelworks(dimension, origin) {
  const ox = Math.floor(origin.x);
  const oy = Math.floor(origin.y);
  const oz = Math.floor(origin.z);
  for (let dx = -8; dx <= 9; dx++) {
    for (let dz = -8; dz <= 9; dz++) {
      for (let dy = -2; dy <= 0; dy++) {
        const block = dimension.getBlock({ x: ox + dx, y: oy + dy, z: oz + dz });
        if (block) {
          const type = (dx + dz) % 3 === 0 ? "minecraft:cracked_deepslate_bricks" : "minecraft:deepslate_bricks";
          block.setType(type);
        }
      }
    }
  }
  for (let dy = 1; dy <= 8; dy++) {
    for (let dx = -8; dx <= 9; dx++) {
      for (let dz = -8; dz <= 9; dz++) {
        const isWall = dx === -8 || dx === 9 || dz === -8 || dz === 9;
        const isPillar = (dx === -8 || dx === 9 || dx === 0) && (dz === -8 || dz === 9 || dz === 0);
        if (isPillar) {
          const b = dimension.getBlock({ x: ox + dx, y: oy + dy, z: oz + dz });
          if (b) b.setType("minecraft:deepslate_bricks");
        } else if (isWall) {
          const isWindow = dy >= 3 && dy <= 5 && (Math.abs(dx) % 4 === 2 || Math.abs(dz) % 4 === 2);
          const isDecayed = (dx + dy + dz) % 7 === 0;
          const b = dimension.getBlock({ x: ox + dx, y: oy + dy, z: oz + dz });
          if (b) {
            if (isWindow) {
              b.setType("minecraft:iron_bars");
            } else if (!isDecayed) {
              b.setType((dx + dy) % 2 === 0 ? "minecraft:brick_block" : "minecraft:mud_bricks");
            } else {
              b.setType("minecraft:air");
            }
          }
        }
      }
    }
  }
  const cx = ox - 5;
  const cz = oz - 5;
  for (let dy = 1; dy <= 16; dy++) {
    for (let cdx = -1; cdx <= 1; cdx++) {
      for (let cdz = -1; cdz <= 1; cdz++) {
        const b = dimension.getBlock({ x: cx + cdx, y: oy + dy, z: cz + cdz });
        if (b) {
          const isHollow = cdx === 0 && cdz === 0 && dy < 16;
          if (isHollow) {
            b.setType("minecraft:air");
          } else if (dy === 16 && cdx === 0 && cdz === 0) {
            b.setType("minecraft:campfire");
          } else {
            b.setType("minecraft:brick_block");
          }
        }
      }
    }
  }
  const fx = ox + 3;
  const fz = oz + 3;
  for (let dy = 1; dy <= 4; dy++) {
    for (let fdx = -2; fdx <= 2; fdx++) {
      for (let fdz = -2; fdz <= 2; fdz++) {
        const b = dimension.getBlock({ x: fx + fdx, y: oy + dy, z: fz + fdz });
        if (b) {
          if (fdx === 0 && fdz === 0 && dy === 1) {
            b.setType("minecraft:lava");
          } else if (dy === 2 && (Math.abs(fdx) === 1 || Math.abs(fdz) === 1)) {
            b.setType("minecraft:blast_furnace");
          } else if (dy === 3 && fdx === 0 && fdz === 0) {
            b.setType("minecraft:hopper");
          } else if (Math.abs(fdx) === 2 || Math.abs(fdz) === 2) {
            b.setType("minecraft:iron_block");
          } else {
            b.setType("minecraft:deepslate_bricks");
          }
        }
      }
    }
  }
  for (let pz = -4; pz <= 4; pz++) {
    const pipeB = dimension.getBlock({ x: ox, y: oy + 6, z: oz + pz });
    if (pipeB) pipeB.setType("minecraft:iron_bars");
  }
  const chest1 = dimension.getBlock({ x: ox - 3, y: oy + 1, z: oz + 4 });
  if (chest1) {
    chest1.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = chest1.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:iron_ingot", 16));
          inv.addItem(new ItemStack("minecraft:raw_iron", 24));
          inv.addItem(new ItemStack("minecraft:coal", 32));
          inv.addItem(new ItemStack("minecraft:blast_furnace", 2));
          inv.addItem(new ItemStack("mi:ecology_server", 1));
          inv.addItem(new ItemStack("mi:machida", 2));
          inv.addItem(new ItemStack("mi:tin_foil_hat", 1));
        }
      } catch (e) {
      }
    }, 2);
  }
  const chest2 = dimension.getBlock({ x: cx + 2, y: oy + 1, z: cz + 2 });
  if (chest2) {
    chest2.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = chest2.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:iron_block", 3));
          inv.addItem(new ItemStack("mi:blob_aichi", 2));
          inv.addItem(new ItemStack("mi:sanjuu", 2));
          inv.addItem(new ItemStack("mi:gif", 2));
          inv.addItem(new ItemStack("mi:silenthill", 2));
          inv.addItem(new ItemStack("minecraft:golden_apple", 1));
        }
      } catch (e) {
      }
    }, 2);
  }
  for (let i = 0; i < 3; i++) {
    try {
      dimension.spawnEntity("mi:blebcat", { x: ox + (i - 1) * 3, y: oy + 1, z: oz + (i - 1) * 3 });
    } catch (e) {
    }
  }
  return true;
}
var lastMisskeyHQLocation = null;
function generateMisskeyHQ(dimension, origin) {
  const ox = Math.floor(origin.x);
  const oy = Math.floor(origin.y);
  const oz = Math.floor(origin.z);
  const setB = (dx, dy, dz, type, states) => {
    try {
      const b = dimension.getBlock({ x: ox + dx, y: oy + dy, z: oz + dz });
      if (b) {
        if (states) {
          try {
            b.setPermutation(BlockPermutation.resolve(type, states));
          } catch (e) {
            b.setType(type);
          }
        } else {
          b.setType(type);
        }
      }
    } catch (e) {
    }
  };
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      setB(dx, -1, dz, "minecraft:deepslate_bricks");
      setB(dx, 0, dz, (dx + dz) % 2 === 0 ? "minecraft:quartz_block" : "minecraft:deepslate_tiles");
      for (let dy = 1; dy <= 22; dy++) {
        setB(dx, dy, dz, "minecraft:air");
      }
    }
  }
  for (let dy = 1; dy <= 21; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        const isCorner = (dx === -8 || dx === 8) && (dz === -8 || dz === 8);
        const isPillar = isCorner || (dx === 0 || dz === 0) && (dx === -8 || dx === 8 || dz === -8 || dz === 8);
        const isOuterWall = dx === -8 || dx === 8 || dz === -8 || dz === 8;
        if (isPillar) {
          setB(dx, dy, dz, "minecraft:quartz_pillar");
        } else if (isOuterWall) {
          if (dz === -8 && Math.abs(dx) <= 1 && dy <= 3) {
            setB(dx, dy, dz, "minecraft:air");
          } else {
            const isWindowFloor = dy >= 2 && dy <= 4 || dy >= 7 && dy <= 9 || dy >= 12 && dy <= 14 || dy >= 17 && dy <= 19;
            if (isWindowFloor && Math.abs(dx) !== 8 && Math.abs(dz) !== 8) {
              setB(dx, dy, dz, "minecraft:light_blue_stained_glass");
            } else {
              setB(dx, dy, dz, "minecraft:white_concrete");
            }
          }
        }
      }
    }
  }
  const floorLevels = [
    { y: 5, type: "minecraft:light_gray_concrete" },
    // 2F Dev Office Floor
    { y: 10, type: "minecraft:smooth_stone" },
    // 3F Server Room Floor
    { y: 15, type: "minecraft:red_wool" },
    // 4F President Room Floor
    { y: 21, type: "minecraft:quartz_block" }
    // Rooftop Floor
  ];
  for (const fl of floorLevels) {
    for (let dx = -7; dx <= 7; dx++) {
      for (let dz = -7; dz <= 7; dz++) {
        const isStairHole = dx >= 5 && dx <= 6 && dz >= 3 && dz <= 6;
        if (!isStairHole) {
          setB(dx, fl.y, dz, fl.type);
        }
      }
    }
  }
  for (const ly of [5, 10, 15, 21]) {
    setB(-4, ly, -4, "minecraft:sea_lantern");
    setB(-4, ly, 4, "minecraft:sea_lantern");
    setB(4, ly, -4, "minecraft:sea_lantern");
    setB(4, ly, 0, "minecraft:sea_lantern");
    setB(-4, ly, 0, "minecraft:sea_lantern");
    setB(0, ly, 0, "minecraft:sea_lantern");
    setB(0, ly, -4, "minecraft:sea_lantern");
    setB(0, ly, 4, "minecraft:sea_lantern");
  }
  const stairBases = [0, 5, 10, 15];
  for (const yBase of stairBases) {
    for (let cdx = 5; cdx <= 6; cdx++) {
      for (let cdz = 2; cdz <= 6; cdz++) {
        for (let cy = 1; cy <= 5; cy++) {
          setB(cdx, yBase + cy, cdz, "minecraft:air");
        }
      }
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 1, 2, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 1, 3, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 });
      setB(cdx, yBase + 2, 3, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 2, 4, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 });
      setB(cdx, yBase + 3, 4, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 3, 5, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 });
      setB(cdx, yBase + 4, 5, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 4, 6, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 });
      setB(cdx, yBase + 5, 6, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 5, 7, "minecraft:smooth_quartz");
    }
  }
  for (let rx = -4; rx <= -1; rx++) {
    setB(rx, 1, -4, "minecraft:smooth_quartz");
  }
  setB(-3, 2, -4, "mi:desktop_pc", { "minecraft:cardinal_direction": "south" });
  setB(-2, 2, -4, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  try {
    dimension.spawnEntity("mi:zabuton_blue", { x: ox - 3 + 0.5, y: oy + 1, z: oz - 5 + 0.5 });
  } catch (e) {
  }
  for (let lz = -4; lz <= -1; lz++) {
    try {
      dimension.spawnEntity(lz % 2 === 0 ? "mi:zabuton_red" : "mi:zabuton_yellow", { x: ox + 3.5, y: oy + 1, z: oz + lz + 0.5 });
    } catch (e) {
    }
  }
  setB(2, 1, -3, "minecraft:flower_pot");
  setB(-7, 2, 0, "mi:note_board");
  setB(-7, 2, 1, "mi:instance_server");
  setB(-7, 1, 0, "minecraft:bookshelf");
  setB(-7, 1, 1, "minecraft:bookshelf");
  for (let dx = -5; dx <= -2; dx++) {
    setB(dx, 6, -3, "minecraft:birch_planks");
    setB(dx, 6, -2, "minecraft:birch_planks");
  }
  setB(-5, 7, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  setB(-4, 7, -3, "mi:desktop_pc", { "minecraft:cardinal_direction": "north" });
  setB(-3, 7, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  setB(-2, 7, -3, "mi:laptop_pc", { "minecraft:cardinal_direction": "north" });
  setB(-5, 7, -2, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  setB(-4, 7, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "south" });
  setB(-3, 7, -2, "mi:desktop_pc", { "minecraft:cardinal_direction": "south" });
  setB(-2, 7, -2, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  try {
    dimension.spawnEntity("mi:zabuton_blue", { x: ox - 4 + 0.5, y: oy + 6, z: oz - 4 + 0.5 });
    dimension.spawnEntity("mi:zabuton_green", { x: ox - 3 + 0.5, y: oy + 6, z: oz - 4 + 0.5 });
    dimension.spawnEntity("mi:zabuton_red", { x: ox - 4 + 0.5, y: oy + 6, z: oz - 1 + 0.5 });
    dimension.spawnEntity("mi:zabuton_yellow", { x: ox - 3 + 0.5, y: oy + 6, z: oz - 1 + 0.5 });
  } catch (e) {
  }
  setB(1, 6, -4, "mi:ecology_server_block", { "minecraft:cardinal_direction": "south" });
  setB(1, 7, -4, "mi:ecology_server_block", { "minecraft:cardinal_direction": "south" });
  setB(-7, 7, -1, "minecraft:white_concrete");
  setB(-7, 7, 0, "minecraft:white_concrete");
  setB(-7, 7, 1, "minecraft:white_concrete");
  setB(-7, 8, -1, "minecraft:white_concrete");
  setB(-7, 8, 0, "minecraft:white_concrete");
  setB(-7, 8, 1, "minecraft:white_concrete");
  setB(-7, 6, -2, "minecraft:bookshelf");
  setB(-7, 7, -2, "minecraft:bookshelf");
  setB(-7, 6, 2, "minecraft:bookshelf");
  setB(-7, 7, 2, "minecraft:bookshelf");
  for (let pz = -6; pz <= 3; pz++) {
    for (let py = 11; py <= 14; py++) {
      setB(0, py, pz, "minecraft:glass_pane");
    }
  }
  for (let sz = -5; sz <= 2; sz += 2) {
    setB(-5, 11, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "east" });
    setB(-5, 12, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "east" });
    setB(-3, 11, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "west" });
    setB(-3, 12, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "west" });
    setB(-4, 13, sz, "minecraft:iron_bars");
  }
  setB(-6, 11, -3, "mi:instance_server");
  setB(-6, 11, 0, "mi:instance_server");
  for (let mx = 2; mx <= 5; mx++) {
    for (let mz = -3; mz <= 1; mz++) {
      setB(mx, 11, mz, "minecraft:dark_oak_planks");
    }
  }
  setB(3, 12, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "west" });
  setB(3, 12, 0, "mi:laptop_pc", { "minecraft:cardinal_direction": "west" });
  setB(4, 12, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "east" });
  setB(4, 12, 0, "mi:laptop_pc", { "minecraft:cardinal_direction": "east" });
  setB(3, 12, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  setB(4, 12, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  for (let cz = -2; cz <= 0; cz++) {
    try {
      dimension.spawnEntity(cz % 2 === 0 ? "mi:zabuton_blue" : "mi:zabuton_green", { x: ox + 1.5, y: oy + 11, z: oz + cz + 0.5 });
      dimension.spawnEntity(cz % 2 === 0 ? "mi:zabuton_red" : "mi:zabuton_yellow", { x: ox + 6.5, y: oy + 11, z: oz + cz + 0.5 });
    } catch (e) {
    }
  }
  for (let sz = -3; sz <= 0; sz++) {
    for (let sy = 12; sy <= 14; sy++) {
      setB(7, sy, sz, "minecraft:black_concrete");
    }
  }
  setB(0, 20, 0, "minecraft:sea_lantern");
  setB(0, 19, 0, "minecraft:end_rod");
  setB(-1, 19, 0, "minecraft:end_rod");
  setB(1, 19, 0, "minecraft:end_rod");
  setB(0, 19, -1, "minecraft:end_rod");
  setB(0, 19, 1, "minecraft:end_rod");
  for (let px = -2; px <= 2; px++) {
    setB(px, 16, 4, "minecraft:dark_oak_planks");
  }
  setB(-1, 17, 4, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  setB(0, 17, 4, "mi:desktop_pc", { "minecraft:cardinal_direction": "north" });
  setB(1, 17, 4, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  try {
    dimension.spawnEntity("mi:zabuton_red", { x: ox + 0.5, y: oy + 16, z: oz + 5 + 0.5 });
  } catch (e) {
  }
  setB(-4, 16, 5, "mi:ecology_server_block");
  setB(-4, 17, 5, "mi:ecology_server_block");
  setB(-4, 18, 5, "mi:ecology_server_block");
  for (let rx = -8; rx <= 8; rx++) {
    for (let rz = -8; rz <= 8; rz++) {
      const isEdge = rx === -8 || rx === 8 || rz === -8 || rz === 8;
      if (isEdge) {
        setB(rx, 22, rz, "minecraft:iron_bars");
      }
    }
  }
  for (let hx = -3; hx <= 3; hx++) {
    for (let hz = -3; hz <= 3; hz++) {
      const isH = Math.abs(hx) === 2 && Math.abs(hz) <= 2 || hz === 0 && Math.abs(hx) <= 2;
      setB(hx, 21, hz, isH ? "minecraft:yellow_concrete" : "minecraft:gray_concrete");
    }
  }
  for (let ay = 22; ay <= 26; ay++) {
    setB(0, ay, 0, "minecraft:iron_bars");
  }
  setB(0, 27, 0, "minecraft:sea_lantern");
  setB(0, 28, 0, "minecraft:lightning_rod");
  registerMisskeyHQ({ x: ox, y: oy, z: oz, dimensionId: dimension.id });
  return true;
}
var hqFloorActiveMap = /* @__PURE__ */ new Map();
function spawnRewardChest(dimension, loc, rewardType) {
  const chestKey = `${loc.x}_${loc.y}_${loc.z}`;
  if (spawnedChestLocationsSet.has(chestKey)) return;
  spawnedChestLocationsSet.add(chestKey);
  try {
    const block = dimension.getBlock(loc);
    if (!block) return;
    block.setType("minecraft:chest");
    dimension.spawnParticle("minecraft:totem_particle", { x: loc.x + 0.5, y: loc.y + 1.2, z: loc.z + 0.5 });
    dimension.spawnParticle("minecraft:large_explosion", { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 });
    system.runTimeout(() => {
      try {
        const inv = block.getComponent("minecraft:inventory")?.container;
        if (!inv) return;
        if (rewardType === "lobby") {
          inv.addItem(new ItemStack("minecraft:bread", 16));
          inv.addItem(new ItemStack("minecraft:cookie", 12));
          inv.addItem(new ItemStack("mi:pudding", 4));
          inv.addItem(new ItemStack("mi:reaction_wand", 1));
          inv.addItem(new ItemStack("minecraft:iron_ingot", 8));
          inv.addItem(new ItemStack("minecraft:torch", 16));
        } else if (rewardType === "dev") {
          inv.addItem(new ItemStack("minecraft:diamond", 2));
          inv.addItem(new ItemStack("minecraft:emerald", 8));
          inv.addItem(new ItemStack("minecraft:iron_ingot", 12));
          inv.addItem(new ItemStack("minecraft:bread", 16));
          inv.addItem(new ItemStack("mi:machida", 2));
        } else if (rewardType === "server") {
          inv.addItem(new ItemStack("mi:ecology_server", 2));
          inv.addItem(new ItemStack("mi:sanjuu", 3));
          inv.addItem(new ItemStack("mi:gif", 3));
          inv.addItem(new ItemStack("mi:silenthill", 3));
          inv.addItem(new ItemStack("minecraft:gold_ingot", 8));
          inv.addItem(new ItemStack("minecraft:ender_pearl", 4));
        } else if (rewardType === "boss") {
          inv.addItem(new ItemStack("minecraft:netherite_ingot", 2));
          inv.addItem(new ItemStack("minecraft:diamond", 6));
          inv.addItem(new ItemStack("minecraft:golden_apple", 4));
          inv.addItem(new ItemStack("mi:tin_foil_hat", 1));
          inv.addItem(new ItemStack("mi:igyo_tool", 1));
          inv.addItem(new ItemStack("mi:kanagawa", 2));
        }
      } catch (e) {
      }
    }, 2);
  } catch (e) {
  }
}
var allMisskeyHQLocations = [];
var generatedHQLocations = [];
var plannedHQLocation = null;
var momoLastPetTimeMap = /* @__PURE__ */ new Map();
var hqSpawnedFloors = /* @__PURE__ */ new Set();
var spawnedChestLocationsSet = /* @__PURE__ */ new Set();
function registerMisskeyHQ(loc) {
  lastMisskeyHQLocation = loc;
  const exists = allMisskeyHQLocations.some(
    (h) => Math.abs(h.x - loc.x) < 16 && Math.abs(h.z - loc.z) < 16 && h.dimensionId === loc.dimensionId
  );
  if (!exists) {
    allMisskeyHQLocations.push(loc);
  }
}
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  const players = overworld.getPlayers();
  if (players.length === 0) return;
  for (const hq of allMisskeyHQLocations) {
    const dim = world.getDimension(hq.dimensionId) || overworld;
    for (const player of players) {
      if (player.dimension.id !== hq.dimensionId) continue;
      const pLoc = player.location;
      if (Math.abs(pLoc.x - hq.x) <= 9 && Math.abs(pLoc.z - hq.z) <= 9) {
        const relY = pLoc.y - hq.y;
        const key1 = `${hq.x}_${hq.z}_floor1`;
        if (relY >= 0 && relY <= 5 && !hqSpawnedFloors.has(key1)) {
          hqSpawnedFloors.add(key1);
          hqFloorActiveMap.set(key1, { type: "floor1", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("\xA7c\u26A0\uFE0F [1F \u30A8\u30F3\u30C8\u30E9\u30F3\u30B9] \u8B66\u5099 blebcat \u90E8\u968A\u304C\u73FE\u308C\u305F\uFF01\xA7r");
          try {
            dim.spawnParticle("minecraft:totem_particle", { x: hq.x + 0.5, y: hq.y + 1.5, z: hq.z + 0.5 });
          } catch (e) {
          }
          const spawnCount = 6 + players.length * 2;
          for (let i = 0; i < spawnCount; i++) {
            const sx = hq.x + (Math.random() * 3.6 - 1.8);
            const sz = hq.z + (Math.random() * 3.6 - 1.8);
            try {
              dim.spawnEntity("mi:blebcat", { x: sx, y: hq.y + 1.2, z: sz });
            } catch (e) {
              console.warn("[Mi_Addon] Error spawning blebcat: " + e);
            }
          }
        }
        const key2 = `${hq.x}_${hq.z}_floor2`;
        if (relY >= 5.5 && relY <= 10 && !hqSpawnedFloors.has(key2)) {
          hqSpawnedFloors.add(key2);
          hqFloorActiveMap.set(key2, { type: "floor2", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("\xA7c\u26A0\uFE0F [2F \u958B\u767A\u5BA4] \u66B4\u8D70\u3057\u305FMisskey\u7814\u7A76\u8005\u305F\u3061\u304C\u8972\u3044\u304B\u304B\u3063\u3066\u304D\u305F\uFF01\xA7r");
          try {
            dim.spawnParticle("minecraft:totem_particle", { x: hq.x - 3, y: hq.y + 6.5, z: hq.z - 2 });
          } catch (e) {
          }
          const spawnCount = 4 + players.length;
          for (let i = 0; i < spawnCount; i++) {
            const sx = hq.x + (Math.random() * 4 - 1);
            const sz = hq.z + (Math.random() * 5 - 2.5);
            try {
              dim.spawnEntity("mi:researcher", { x: sx, y: hq.y + 6.2, z: sz });
            } catch (e) {
              console.warn("[Mi_Addon] Error spawning researcher: " + e);
            }
          }
        }
        const key3 = `${hq.x}_${hq.z}_floor3`;
        if (relY >= 10.5 && relY <= 15 && !hqSpawnedFloors.has(key3)) {
          hqSpawnedFloors.add(key3);
          hqFloorActiveMap.set(key3, { type: "floor3", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("\xA7c\u26A0\uFE0F [3F \u30B5\u30FC\u30D0\u30FC\u5BA4] \u751F\u4F53\u30B5\u30FC\u30D0\u30FC\u304B\u3089\u6751\u4E0A\u30C4\u30C1\u30CE\u30B3\uFF08\u8907\u88FD\u4F53\uFF09\u304C\u98DB\u3073\u51FA\u3057\u3066\u304D\u305F\uFF01\xA7r");
          try {
            dim.spawnParticle("minecraft:mob_portal", { x: hq.x - 4, y: hq.y + 11.5, z: hq.z });
          } catch (e) {
          }
          const spawnCount = 5 + players.length;
          for (let i = 0; i < spawnCount; i++) {
            const sx = hq.x + (Math.random() * 3 - 1.5);
            const sz = hq.z + (Math.random() * 4 - 2);
            try {
              dim.spawnEntity("mi:m_tutinoko_hostile", { x: sx, y: hq.y + 11.2, z: sz });
            } catch (e) {
              console.warn("[Mi_Addon] Error spawning m_tutinoko_hostile: " + e);
            }
          }
        }
        const key4 = `${hq.x}_${hq.z}_floor4`;
        if (relY >= 15.5 && relY <= 21 && !hqSpawnedFloors.has(key4)) {
          hqSpawnedFloors.add(key4);
          hqFloorActiveMap.set(key4, { type: "floor4", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("\xA76\u2694\uFE0F [4F \u793E\u9577\u5BA4] \u30DC\u30B9\uFF1A\u6751\u4E0A\u3055\u3093\u304C\u73FE\u308C\u305F\uFF01\u300C\u958B\u767A\u6240\u3078\u3088\u3046\u3053\u305D\u2026\u899A\u609F\u306F\u3067\u304D\u3066\u3044\u308B\u304B\u306D\uFF1F\u300D\xA7r");
          try {
            dim.spawnParticle("minecraft:totem_particle", { x: hq.x, y: hq.y + 16.5, z: hq.z + 2 });
            dim.spawnEntity("mi:murakami_boss", { x: hq.x + 0.5, y: hq.y + 16.2, z: hq.z + 2 + 0.5 });
          } catch (e) {
            console.warn("[Mi_Addon] Error spawning murakami_boss: " + e);
          }
        }
      }
    }
  }
}, 10);
var completedFloorsSet = /* @__PURE__ */ new Set();
function checkAllFloorClears() {
  const overworld = world.getDimension("overworld");
  const players = overworld.getPlayers();
  if (players.length === 0) return;
  for (const [key, floorData] of hqFloorActiveMap.entries()) {
    if (!floorData.spawned || floorData.cleared) continue;
    const { hqLoc, type } = floorData;
    const floorKey = `${hqLoc.x}_${hqLoc.z}_${type}`;
    if (completedFloorsSet.has(floorKey)) {
      floorData.cleared = true;
      continue;
    }
    const hasPlayerInHQ = players.some((p) => {
      const pLoc = p.location;
      return Math.abs(pLoc.x - hqLoc.x) <= 12 && Math.abs(pLoc.z - hqLoc.z) <= 12;
    });
    if (!hasPlayerInHQ) continue;
    const dim = world.getDimension(hqLoc.dimensionId || "overworld") || overworld;
    if (type === "floor1") {
      try {
        const blebcats = dim.getEntities({
          location: { x: hqLoc.x, y: hqLoc.y + 1, z: hqLoc.z },
          maxDistance: 14,
          type: "mi:blebcat"
        });
        if (blebcats.length === 0) {
          completedFloorsSet.add(floorKey);
          floorData.cleared = true;
          const chestLoc = { x: hqLoc.x - 3, y: hqLoc.y + 1, z: hqLoc.z - 4 };
          spawnRewardChest(dim, chestLoc, "lobby");
          const nearbyP = dim.getPlayers({ location: chestLoc, maxDistance: 32 });
          for (const p of nearbyP) {
            p.sendMessage("\xA7a\u{1F389}\u2694\uFE0F\u30101F \u30A8\u30F3\u30C8\u30E9\u30F3\u30B9 \u5236\u8987\uFF01\u3011\u8B66\u5099 blebcat \u90E8\u968A\u3092\u5168\u6EC5\u3055\u305B\u307E\u3057\u305F\uFF01 \u5831\u916C\u30C1\u30A7\u30B9\u30C8\u304C\u51FA\u73FE\uFF01\xA7r");
          }
        }
      } catch (e) {
      }
    } else if (type === "floor2") {
      try {
        const researchers = dim.getEntities({
          location: { x: hqLoc.x, y: hqLoc.y + 6, z: hqLoc.z },
          maxDistance: 14,
          type: "mi:researcher"
        });
        if (researchers.length === 0) {
          completedFloorsSet.add(floorKey);
          floorData.cleared = true;
          const chestLoc = { x: hqLoc.x, y: hqLoc.y + 6, z: hqLoc.z };
          spawnRewardChest(dim, chestLoc, "dev");
          const nearbyP = dim.getPlayers({ location: chestLoc, maxDistance: 32 });
          for (const p of nearbyP) {
            p.sendMessage("\xA7a\u{1F389}\u2694\uFE0F\u30102F \u958B\u767A\u5BA4 \u5236\u8987\uFF01\u3011\u7814\u7A76\u8005\u90E8\u968A\u3092\u5168\u6EC5\u3055\u305B\u307E\u3057\u305F\uFF01 \u5831\u916C\u30C1\u30A7\u30B9\u30C8\u304C\u51FA\u73FE\uFF01\xA7r");
          }
        }
      } catch (e) {
      }
    } else if (type === "floor3") {
      try {
        const tutinokos = dim.getEntities({
          location: { x: hqLoc.x, y: hqLoc.y + 11, z: hqLoc.z },
          maxDistance: 14,
          type: "mi:m_tutinoko_hostile"
        });
        if (tutinokos.length === 0) {
          completedFloorsSet.add(floorKey);
          floorData.cleared = true;
          const chestLoc = { x: hqLoc.x, y: hqLoc.y + 11, z: hqLoc.z };
          spawnRewardChest(dim, chestLoc, "server");
          const nearbyP = dim.getPlayers({ location: chestLoc, maxDistance: 32 });
          for (const p of nearbyP) {
            p.sendMessage("\xA7a\u{1F389}\u2694\uFE0F\u30103F \u30B5\u30FC\u30D0\u30FC\u5BA4 \u5236\u8987\uFF01\u3011\u30C4\u30C1\u30CE\u30B3\u8907\u88FD\u8ECD\u56E3\u3092\u5168\u6EC5\u3055\u305B\u307E\u3057\u305F\uFF01 \u5831\u916C\u30C1\u30A7\u30B9\u30C8\u304C\u51FA\u73FE\uFF01\xA7r");
          }
        }
      } catch (e) {
      }
    } else if (type === "floor4") {
      try {
        const bosses = dim.getEntities({
          location: { x: hqLoc.x, y: hqLoc.y + 16, z: hqLoc.z },
          maxDistance: 20,
          type: "mi:murakami_boss"
        });
        if (bosses.length === 0) {
          completedFloorsSet.add(floorKey);
          floorData.cleared = true;
          const chestLoc = { x: hqLoc.x, y: hqLoc.y + 16, z: hqLoc.z };
          spawnRewardChest(dim, chestLoc, "boss");
          const nearbyP = dim.getPlayers({ location: chestLoc, maxDistance: 32 });
          for (const p of nearbyP) {
            p.sendMessage("\xA76\u{1F451}\u{1F3C6}\u3010Misskey\u958B\u767A\u6240 \u5B8C\u5168\u5236\u8987\uFF01\u3011\u30DC\u30B9\u30FB\u6751\u4E0A\u3055\u3093\u3092\u8A0E\u4F10\u3057\u307E\u3057\u305F\uFF01 \u793E\u9577\u79D8\u8535\u306E\u91D1\u5EAB\u30DE\u30B9\u30BF\u30FC\u30C1\u30A7\u30B9\u30C8\u304C\u51FA\u73FE\uFF01\xA7r");
          }
        }
      } catch (e) {
      }
    }
  }
}
system.runInterval(() => {
  checkAllFloorClears();
}, 10);
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const deadType = deadEntity?.typeId;
  if (deadType && deadType.startsWith("mi:zabuton_")) {
    try {
      const dim = deadEntity.dimension;
      const loc = deadEntity.location;
      dim.spawnItem(new ItemStack(deadType, 1), loc);
      dim.spawnParticle("minecraft:smoke_particle", loc);
    } catch (e) {
    }
    return;
  }
  if (deadType === "mi:blebcat" || deadType === "mi:researcher" || deadType === "mi:m_tutinoko_hostile" || deadType === "mi:murakami_boss") {
    system.runTimeout(() => {
      checkAllFloorClears();
    }, 2);
  }
});
function getNearestOrPlannedHQ(player) {
  const pLoc = player.location;
  if (allMisskeyHQLocations.length > 0) {
    let minDist = Infinity;
    let nearest = null;
    for (const hq of allMisskeyHQLocations) {
      const d = Math.sqrt(Math.pow(pLoc.x - hq.x, 2) + Math.pow(pLoc.z - hq.z, 2));
      if (d < minDist) {
        minDist = d;
        nearest = { x: hq.x, z: hq.z };
      }
    }
    if (nearest) return nearest;
  }
  if (!plannedHQLocation) {
    const angle = Math.PI / 4 * (1 + Math.abs(Math.floor(pLoc.x + 123)) % 7);
    const dist = 1800 + Math.abs(Math.floor(pLoc.z + 456)) % 600;
    plannedHQLocation = {
      x: Math.round(pLoc.x + Math.cos(angle) * dist),
      z: Math.round(pLoc.z + Math.sin(angle) * dist)
    };
  }
  return plannedHQLocation;
}
function getCompassDirectionName(fromLoc, targetLoc) {
  const dx = targetLoc.x - fromLoc.x;
  const dz = targetLoc.z - fromLoc.z;
  const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
  let dirName = "\u5317 (North)";
  const deg = (Math.atan2(dz, dx) * 180 / Math.PI + 360 + 90) % 360;
  if (deg >= 337.5 || deg < 22.5) dirName = "\u5317 (North)";
  else if (deg >= 22.5 && deg < 67.5) dirName = "\u5317\u6771 (North-East)";
  else if (deg >= 67.5 && deg < 112.5) dirName = "\u6771 (East)";
  else if (deg >= 112.5 && deg < 157.5) dirName = "\u5357\u6771 (South-East)";
  else if (deg >= 157.5 && deg < 202.5) dirName = "\u5357 (South)";
  else if (deg >= 202.5 && deg < 247.5) dirName = "\u5357\u897F (South-West)";
  else if (deg >= 247.5 && deg < 292.5) dirName = "\u897F (West)";
  else dirName = "\u5317\u897F (North-West)";
  return { dirName, dist };
}
function openSyuiloDialogUI(player, syuiloEntity) {
  const form = new ActionFormData().title("\u{1F3E2} \u3057\u3085\u3044\u308D (Misskey)").body("\u300C\u3084\u3042\uFF01 Misskey MC Addon\u3078\u3088\u3046\u3053\u305D\uFF01\n\u4F55\u304B\u304A\u624B\u4F1D\u3044\u3067\u304D\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u3059\u304B\uFF1F\u300D").button("\u{1F4AC} \u4E16\u9593\u8A71\u3092\u3059\u308B (\u958B\u767A\u30C8\u30FC\u30AF)").button("\u{1F3E2} Misskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u306E\u5834\u6240\u3092\u805E\u304F").button("\u{1F504} \u7D1B\u5931\u3057\u305F\u5049\u696D\u306E\u518D\u30C1\u30E3\u30EC\u30F3\u30B8 (\u30EA\u30BB\u30C3\u30C8)").button("\u307E\u305F\u306D");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0) return;
    if (response.selection === 0) {
      const syuiloQuotes = [
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u3042\u3001\u3069\u3046\u3082\u3002Misskey\u306E\u958B\u767A\u3001\u4ECA\u65E5\u3082\u5143\u6C17\u306B\u3084\u3063\u3066\u307E\u3059\u3088\u3002\u300D\xA7r",
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u65B0\u6A5F\u80FD\u306E\u30A2\u30A4\u30C7\u30A2\u3001\u601D\u3044\u3064\u3044\u305F\u3089\u3059\u3050\u5B9F\u88C5\u3057\u3061\u3083\u3046\u30BF\u30A4\u30D7\u306A\u3093\u3067\u3059\u3088\u306D\u3002\u300D\xA7r",
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u30B5\u30FC\u30D0\u30FC\u304C\u843D\u3061\u3066\u306A\u3044\u304B\u3001\u3044\u3064\u3082\u5FC3\u306E\u3069\u3053\u304B\u3067\u6C17\u306B\u3057\u3066\u307E\u3059\u3002\u300D\xA7r",
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u7D75\u6587\u5B57\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3001\u3044\u3063\u3071\u3044\u5897\u3048\u3066\u3046\u308C\u3057\u3044\u306A\u3042\u3002\u300D\xA7r",
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u30D0\u30B0\u5831\u544A\u306F\u3044\u3064\u3067\u3082\u6B53\u8FCE\u3067\u3059\u3002\u76F4\u305B\u308B\u304B\u306F\u5225\u3068\u3057\u3066\u3002\u300D\xA7r",
        "\xA7b\u3057\u3085\u3044\u308D: \u300C\u305F\u307E\u306B\u306FMinecraft\u3067\u606F\u629C\u304D\u3059\u308B\u306E\u3082\u3044\u3044\u3082\u306E\u3067\u3059\u306D\u3002\u300D\xA7r"
      ];
      const nextIndex = syuiloQuoteIndexMap.get(player.id) || 0;
      const quote = syuiloQuotes[nextIndex];
      syuiloQuoteIndexMap.set(player.id, (nextIndex + 1) % syuiloQuotes.length);
      player.sendMessage(quote);
      const loc = syuiloEntity.location;
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.6, z: loc.z });
    } else if (response.selection === 1) {
      const pLoc = player.location;
      const targetHQ = getNearestOrPlannedHQ(player);
      const { dirName, dist } = getCompassDirectionName(pLoc, targetHQ);
      player.sendMessage(`\xA76\u{1F3E2}\u{1F4CD}\u3010Misskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u306E\u9060\u5F81\u5EA7\u6A19\u3011\xA7r`);
      player.sendMessage(`\xA7f\u958B\u767A\u6240\u30D3\u30EB\u306F\u3053\u3053\u304B\u3089\u9065\u304B\u5F7C\u65B9\u306E\u3010\xA7a${dirName}\xA7f \u65B9\u5411 / \u7D04 \xA7e${dist}m \u5148\xA7f\uFF08X: \xA7b${targetHQ.x}\xA7f, Z: \xA7b${targetHQ.z}\xA7f \u4ED8\u8FD1\uFF09\u3011\u306B\u8073\u3048\u7ACB\u3063\u3066\u3044\u308B\u3088\uFF01\xA7r`);
      player.sendMessage(`\xA77\u{1F4A1} \u30A8\u30F3\u30C9\u8981\u585E\u306E\u3088\u3046\u306A\u9577\u65C5\u306B\u306A\u308B\u304B\u3089\u8ECA\u3084\u98DF\u6599\u3092\u6E96\u5099\u3057\u3066\u306D\uFF01 \u9053\u306B\u8FF7\u3063\u305F\u3089\u300E\u751F\u614B\u30B5\u30FC\u30D0\u30FC\u300F\u3092\u53F3\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u96FB\u6CE2\u3067\u65B9\u89D2\u3092\u6559\u3048\u3066\u304F\u308C\u308B\u3088\uFF01\xA7r`);
      const loc = syuiloEntity.location;
      player.dimension.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 2, z: loc.z });
    } else if (response.selection === 2) {
      openAchievementRetryUI(player);
    }
  });
}
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  if (!deadEntity) return;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;
  const typeId = deadEntity.typeId;
  if (typeId === "mi:blebcat") {
    if (Math.random() < 0.4) dimension.spawnItem(new ItemStack("mi:ecology_server", 1), location);
    if (Math.random() < 0.2) dimension.spawnItem(new ItemStack("mi:sanjuu", 1), location);
    return;
  }
  if (typeId === "mi:m_tutinoko") {
    const amount = Math.floor(Math.random() * 2) + 1;
    dimension.spawnItem(new ItemStack("mi:anko", amount), location);
    return;
  }
  let dropItemId = null;
  let chance = 0.15;
  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") dropItemId = "mi:blob_aichi";
  else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") dropItemId = "mi:machida";
  else if (typeId === "minecraft:creeper") dropItemId = "mi:silenthill";
  else if (typeId === "minecraft:enderman") {
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
  if (!entity || !entity.isValid()) return;
  const typeId = entity.typeId;
  const isMonster = typeId.startsWith("minecraft:zombie") || typeId.startsWith("minecraft:skeleton") || typeId === "minecraft:creeper" || typeId === "minecraft:spider" || typeId === "minecraft:cave_spider" || typeId === "minecraft:enderman" || typeId === "minecraft:witch" || typeId === "minecraft:slime" || typeId === "minecraft:phantom" || typeId === "minecraft:drowned" || typeId === "minecraft:husk" || typeId === "minecraft:stray" || typeId === "mi:blebcat";
  if (!isMonster) return;
  const loc = entity.location;
  const dim = entity.dimension;
  for (let dy = -1; dy >= -3; dy--) {
    try {
      const block = dim.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y + dy), z: Math.floor(loc.z) });
      if (block && block.typeId === "mi:tin_foil_block") {
        system.run(() => {
          dim.spawnParticle("minecraft:witch_spell_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          dim.spawnParticle("minecraft:smoke_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          if (entity.isValid()) entity.remove();
        });
        break;
      }
    } catch (e) {
    }
  }
});
function handleMomoPet(player, momoEntity) {
  const now = Date.now();
  const lastPet = momoLastPetTimeMap.get(player.id) || 0;
  const dim = player.dimension;
  const mLoc = momoEntity.location;
  if (now - lastPet < 3e5) {
    const remainSec = Math.ceil((3e5 - (now - lastPet)) / 1e3);
    dim.spawnParticle("minecraft:heart_particle", { x: mLoc.x, y: mLoc.y + 1.2, z: mLoc.z });
    player.sendMessage(`\xA7d\u30E2\u30E2: \u307D\u3088\u307D\u3088\u2026\uFF08\u306A\u3067\u306A\u3067\u3055\u308C\u3066\u5B09\u3057\u305D\u3046\u306B\u3057\u3066\u3044\u308B\uFF01 / \u30AF\u30FC\u30EB\u30C0\u30A6\u30F3: \u6B8B\u308A${remainSec}\u79D2\uFF09\xA7r`);
    return;
  }
  momoLastPetTimeMap.set(player.id, now);
  dim.spawnParticle("minecraft:heart_particle", { x: mLoc.x, y: mLoc.y + 1.5, z: mLoc.z });
  dim.spawnParticle("minecraft:totem_particle", { x: mLoc.x, y: mLoc.y + 1.2, z: mLoc.z });
  player.addEffect("hero_of_the_village", 6e3, { amplifier: 0 });
  player.addEffect("regeneration", 1200, { amplifier: 0 });
  player.sendMessage("\xA7d\u{1F338}\u2728 [\u30E2\u30E2] \u307D\u3088\u3093\uFF01 \u30E2\u30E2\u3092\u512A\u3057\u304F\u306A\u3067\u306A\u3067\u3057\u305F\uFF01\xA7r");
  player.sendMessage("\xA7a\u5E78\u904B\u306E\u30D0\u30D5\u3010\u6751\u306E\u82F1\u96C4 (5\u5206) & \u518D\u751F (1\u5206)\u3011\u3092\u6388\u304B\u308A\u307E\u3057\u305F\uFF01\xA7r");
}
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;
  if (!target) return;
  if (target.typeId === "mi:syuilo") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    system.run(() => {
      openSyuiloDialogUI(player, target);
    });
    return;
  }
  if (target.typeId === "mi:momo") {
    event.cancel = true;
    system.run(() => {
      handleMomoPet(player, target);
    });
    return;
  }
  if (target.typeId === "minecraft:villager" || target.typeId === "minecraft:wandering_trader") {
    grantAchievement(player, "kaimono");
  }
  if (target instanceof Player && player.isSneaking) {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    system.run(() => {
      openSendDMUI(player, void 0, target.name);
    });
    return;
  }
  if (itemStack && itemStack.typeId === "mi:reaction_wand") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    const tLoc = target.location;
    const targetName = target.nameTag || target.typeId.replace("mi:", "").replace("minecraft:", "");
    system.run(() => {
      openReactionWandUI(player, targetName, tLoc, target);
    });
    return;
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
    if (itemStack) {
      const dyeMap = {
        "minecraft:red_dye": { variant: 0, name: "\u8D64 (Red)" },
        "minecraft:blue_dye": { variant: 1, name: "\u9752 (Blue)" },
        "minecraft:yellow_dye": { variant: 2, name: "\u9EC4 (Yellow)" },
        "minecraft:green_dye": { variant: 3, name: "\u7DD1 (Green)" },
        "minecraft:white_dye": { variant: 4, name: "\u767D (White)" },
        "minecraft:black_dye": { variant: 5, name: "\u9ED2 (Black)" },
        "minecraft:purple_dye": { variant: 6, name: "\u7D2B (Purple)" },
        "minecraft:pink_dye": { variant: 7, name: "\u30D4\u30F3\u30AF (Pink)" },
        "minecraft:light_blue_dye": { variant: 8, name: "\u6C34\u8272 (Light Blue)" },
        "minecraft:cyan_dye": { variant: 9, name: "\u30B7\u30A2\u30F3 (Cyan)" },
        "minecraft:orange_dye": { variant: 10, name: "\u30AA\u30EC\u30F3\u30B8 (Orange)" },
        "minecraft:lime_dye": { variant: 11, name: "\u9EC4\u7DD1 (Lime)" },
        "minecraft:magenta_dye": { variant: 12, name: "\u30DE\u30BC\u30F3\u30BF (Magenta)" },
        "minecraft:brown_dye": { variant: 13, name: "\u8336\u8272 (Brown)" },
        "minecraft:gray_dye": { variant: 14, name: "\u7070\u8272 (Gray)" },
        "minecraft:light_gray_dye": { variant: 15, name: "\u8584\u7070\u8272 (Light Gray)" }
      };
      const dye = dyeMap[itemStack.typeId];
      if (dye) {
        event.cancel = true;
        system.run(() => {
          target.triggerEvent(`mi:set_variant_${dye.variant}`);
          const loc = target.location;
          const dim = target.dimension;
          dim.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.2, z: loc.z });
          dim.spawnParticle("minecraft:smoke_particle", { x: loc.x, y: loc.y + 0.8, z: loc.z });
          if (player.gameMode !== "creative") {
            if (itemStack.amount > 1) {
              itemStack.amount -= 1;
            } else {
              const equippable = player.getComponent(EntityComponentTypes.Equippable);
              if (equippable) equippable.setEquipment("Mainhand", void 0);
            }
          }
          player.sendMessage(`\xA7a\u{1F3A8} [Mi_Addon] \u9577\u3044\u5909\u306A\u8ECA\u3092\u300C${dye.name}\u300D\u306B\u518D\u5857\u88C5\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        });
        return;
      }
      const repairItems = {
        "minecraft:iron_ingot": { healAmount: 15, name: "\u9244\u30A4\u30F3\u30B4\u30C3\u30C8" },
        "minecraft:iron_block": { healAmount: 45, name: "\u9244\u30D6\u30ED\u30C3\u30AF", fullRepair: true },
        "minecraft:gold_ingot": { healAmount: 25, name: "\u91D1\u30A4\u30F3\u30B4\u30C3\u30C8" },
        "minecraft:gold_block": { healAmount: 45, name: "\u91D1\u30D6\u30ED\u30C3\u30AF", fullRepair: true },
        "minecraft:netherite_ingot": { healAmount: 45, name: "\u30CD\u30B6\u30E9\u30A4\u30C8\u30A4\u30F3\u30B4\u30C3\u30C8", fullRepair: true },
        "mi:ecology_server": { healAmount: 45, name: "\u751F\u614B\u30B5\u30FC\u30D0\u30FC", fullRepair: true }
      };
      const repair = repairItems[itemStack.typeId];
      if (repair) {
        event.cancel = true;
        system.run(() => {
          const healthComp = target.getComponent(EntityComponentTypes.Health);
          const isAccident = accidentCarsMap.has(target.id);
          const currentHp = healthComp ? healthComp.currentValue : 45;
          const maxHp = healthComp ? healthComp.effectiveMax : 45;
          if (!isAccident && currentHp >= maxHp) {
            player.sendMessage(`\xA7e\u{1F697} [Mi_Addon] \u3053\u306E\u8ECA\u4E21\u306F\u3059\u3067\u306B\u5B8C\u5168\u306A\u72B6\u614B\u3067\u3059\uFF01\uFF08\u8010\u4E45\u5EA6: ${currentHp}/${maxHp}\uFF09\xA7r`);
            return;
          }
          decrementPlayerHeldItem(player);
          if (healthComp) {
            const newHp = Math.min(maxHp, currentHp + repair.healAmount);
            healthComp.setCurrentValue(newHp);
          }
          if (isAccident) {
            accidentCarsMap.delete(target.id);
          }
          const loc = target.location;
          const dim = target.dimension;
          dim.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.2, z: loc.z });
          dim.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1, z: loc.z });
          dim.spawnParticle("minecraft:lava_particle", { x: loc.x, y: loc.y + 0.6, z: loc.z });
          const finalHp = healthComp ? healthComp.currentValue : 45;
          player.sendMessage(`\xA7a\u{1F527}\u{1F697} [\u8ECA\u4E21\u4FEE\u7406] ${repair.name} \u3092\u4F7F\u3063\u3066\u8ECA\u4E21\u3092\u4FEE\u7406\u30FB\u6574\u5099\u3057\u307E\u3057\u305F\uFF01\uFF08\u8010\u4E45\u5EA6: \xA7e${finalHp}/${maxHp}\xA7a\uFF09\xA7r`);
        });
        return;
      }
    }
  }
  if (!itemStack) return;
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:blob_aichi") {
    event.cancel = true;
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) equippable.setEquipment("Mainhand", void 0);
        }
      }
      target.remove();
      dim.spawnEntity("mi:blobcat", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("\xA7a[Mi_Addon] \u732B\u304C \u306B\u3083\u3093\u3077\u3063\u3077\u30FC (blobcat) \u306B\u9032\u5316\u3057\u307E\u3057\u305F\uFF01\xA7r");
    });
  }
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:silenthill") {
    event.cancel = true;
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;
      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable);
          if (equippable) equippable.setEquipment("Mainhand", void 0);
        }
      }
      target.remove();
      dim.spawnEntity("mi:woneko", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("\xA7a[Mi_Addon] \u732B\u304C \u3092\u306D\u3053 (woneko) \u306B\u9032\u5316\u3057\u307E\u3057\u305F\uFF01\xA7r");
    });
  }
  if (target.typeId === "mi:yosano" && itemStack.typeId === "mi:machida") {
    event.cancel = true;
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
          if (equippable) equippable.setEquipment("Mainhand", void 0);
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
  if (attacker && attacker.typeId === "mi:m_tutinoko_hostile" && hurtEntity instanceof Player) {
    try {
      hurtEntity.addEffect("poison", 120, { amplifier: 1, showParticles: true });
      hurtEntity.addEffect("hunger", 160, { amplifier: 0, showParticles: true });
      const pLoc = hurtEntity.location;
      hurtEntity.dimension.spawnParticle("minecraft:villager_angry", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
    } catch (e) {
    }
  }
  if (attacker && attacker.typeId === "mi:researcher" && hurtEntity instanceof Player) {
    try {
      hurtEntity.addEffect("slowness", 160, { amplifier: 1, showParticles: true });
      hurtEntity.addEffect("weakness", 160, { amplifier: 1, showParticles: true });
      hurtEntity.addEffect("nausea", 120, { amplifier: 0, showParticles: true });
      hurtEntity.addEffect("darkness", 100, { amplifier: 0, showParticles: true });
      const pLoc = hurtEntity.location;
      const dim = hurtEntity.dimension;
      dim.spawnParticle("minecraft:smoke_particle", { x: pLoc.x, y: pLoc.y + 1, z: pLoc.z });
      dim.spawnParticle("minecraft:villager_angry", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
      dim.spawnParticle("minecraft:witch_spell_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
    } catch (e) {
    }
  }
  if (hurtEntity.typeId === "mi:regretcar" && attacker instanceof Player) {
    const playerId = attacker.id;
    if (!licensedPlayers.has(playerId) && !hasCarPerk(attacker, "gold_license")) {
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
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  if (!deadEntity) return;
  const loc = deadEntity.location;
  const dim = deadEntity.dimension;
  const typeId = deadEntity.typeId;
  system.run(() => {
    try {
      if (typeId === "minecraft:ender_dragon") {
        const players = dim.getPlayers({ location: loc, maxDistance: 128 });
        for (const p of players) {
          grantAchievement(p, "ensei");
        }
      } else if (typeId === "mi:murakami_boss") {
        const billCount = 2 + Math.floor(Math.random() * 4);
        dim.spawnItem(new ItemStack("mi:yen_10000", billCount), loc);
      } else if (typeId === "mi:researcher") {
        if (Math.random() < 0.25) {
          dim.spawnItem(new ItemStack("mi:yen_1000", 1), loc);
        } else if (Math.random() < 0.5) {
          dim.spawnItem(new ItemStack("mi:yen_500", 1), loc);
        }
      } else if (typeId === "mi:blebcat") {
        if (Math.random() < 0.2) {
          dim.spawnItem(new ItemStack("mi:yen_100", 1), loc);
        } else if (Math.random() < 0.35) {
          dim.spawnItem(new ItemStack("mi:yen_50", 1), loc);
        }
      } else if (typeId === "mi:m_tutinoko_hostile") {
        if (Math.random() < 0.3) {
          dim.spawnItem(new ItemStack("mi:yen_100", 1), loc);
        }
      } else if (typeId.includes("zombie") || typeId.includes("skeleton") || typeId.includes("creeper")) {
        if (Math.random() < 0.15) {
          const coin = Math.random() < 0.5 ? "mi:yen_10" : "mi:yen_5";
          dim.spawnItem(new ItemStack(coin, 1), loc);
        }
      }
    } catch (e) {
    }
  });
});
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();
  if (itemStack.typeId === "minecraft:potion" || itemStack.typeId.includes("potion") || itemStack.typeId === "minecraft:milk_bucket" || itemStack.typeId === "minecraft:water_bucket") {
    grantAchievement(player, "suibunhokyu");
  }
  const foodCount = (playerFoodEatCountMap.get(playerId) || 0) + 1;
  playerFoodEatCountMap.set(playerId, foodCount);
  if (foodCount >= 500) {
    grantAchievement(player, "shokuji");
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
  const players = overworld.getPlayers();
  for (const p of players) {
    if (playerHasItem(p, "minecraft:gold_ingot") || playerHasItem(p, "minecraft:gold_nugget") || playerHasItem(p, "minecraft:raw_gold") || playerHasItem(p, "minecraft:gold_block")) {
      grantAchievement(p, "chokin");
    }
    const lastSmithingTime = playerSmithingTableOpenMap.get(p.id) || 0;
    if (now - lastSmithingTime < 15e3) {
      const netheriteItems = [
        "minecraft:netherite_sword",
        "minecraft:netherite_pickaxe",
        "minecraft:netherite_axe",
        "minecraft:netherite_shovel",
        "minecraft:netherite_hoe",
        "minecraft:netherite_helmet",
        "minecraft:netherite_chestplate",
        "minecraft:netherite_leggings",
        "minecraft:netherite_boots"
      ];
      if (netheriteItems.some((item) => playerHasItem(p, item))) {
        grantAchievement(p, "upgrade");
        playerSmithingTableOpenMap.delete(p.id);
      }
    }
    const currentHour = ((/* @__PURE__ */ new Date()).getUTCHours() + 9) % 24;
    if (currentHour >= 6 && currentHour < 9) {
      const pId = p.id;
      const playSecs = (playerAsakatsuPlaySecondsMap.get(pId) || 0) + 1;
      playerAsakatsuPlaySecondsMap.set(pId, playSecs);
      if (playSecs >= 1800) {
        grantAchievement(p, "asakatsu");
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
        overworld.spawnParticle("minecraft:witch_spell_particle", { x: pLoc.x, y: pLoc.y + 1.8, z: pLoc.z });
      }
    }
  }
  for (const allP of world.getAllPlayers()) {
    if (allP.dimension.id.includes("the_end")) {
      grantAchievement(allP, "ensei");
    }
    if (!allP.hasTag("unlocked_diamond")) {
      const diamondItems = [
        "minecraft:diamond",
        "minecraft:diamond_block",
        "minecraft:diamond_ore",
        "minecraft:deepslate_diamond_ore",
        "minecraft:diamond_sword",
        "minecraft:diamond_pickaxe",
        "minecraft:diamond_axe",
        "minecraft:diamond_shovel",
        "minecraft:diamond_hoe",
        "minecraft:diamond_helmet",
        "minecraft:diamond_chestplate",
        "minecraft:diamond_leggings",
        "minecraft:diamond_boots"
      ];
      if (diamondItems.some((it) => playerHasItem(allP, it))) {
        allP.addTag("unlocked_diamond");
      }
    }
    if (!allP.hasTag("unlocked_netherite")) {
      if (playerHasItem(allP, "minecraft:netherite_ingot") || playerHasItem(allP, "minecraft:netherite_scrap") || playerHasItem(allP, "minecraft:ancient_debris") || hasPlayerAchieved(allP, "upgrade")) {
        allP.addTag("unlocked_netherite");
      }
    }
    const cash = countPlayerCash(allP);
    const bank = getPlayerBankAccount(allP);
    const holdings = getPlayerStockHoldings(allP);
    let stockVal = 0;
    for (const [code, count] of Object.entries(holdings)) {
      const stock = stockMarket.find((s) => s.code === code);
      if (stock && count > 0) stockVal += stock.currentPrice * count;
    }
    const totalAssets = cash + bank + stockVal;
    const fedRate = fxPairs.find((p) => p.id === "FED_M")?.currentRate || 155;
    const totalFed = totalAssets / fedRate;
    const rank = getPlayerWealthRank(totalFed);
    if (rank.particle) {
      const loc = allP.location;
      try {
        allP.dimension.spawnParticle(rank.particle, { x: loc.x, y: loc.y + 0.2, z: loc.z });
        if (rank.rankName === "Misskey\u306E\u5927\u682A\u4E3B") {
          allP.addEffect("speed", 30, { amplifier: 0, showParticles: false });
        }
      } catch (e) {
      }
    }
    const perkKeysList = ["turbo", "insurance", "gold_license"];
    for (const perkKey of perkKeysList) {
      const perkDef = CAR_PERK_DEFS[perkKey];
      const pStatus = getCarPerkStatus(allP, perkKey);
      const lastCheckProp = `mi_perk_${perkKey}_last_check`;
      const lastCheckedExpires = Number(allP.getDynamicProperty(lastCheckProp) || 0);
      if (pStatus.expiresAt > 0 && !pStatus.active && lastCheckedExpires !== pStatus.expiresAt) {
        allP.setDynamicProperty(lastCheckProp, pStatus.expiresAt);
        const renewCost = Math.floor(perkDef.fedPrice * fedRate);
        if (pStatus.autoRenew) {
          const curBank = getPlayerBankAccount(allP);
          if (curBank >= renewCost) {
            setPlayerBankAccount(allP, curBank - renewCost);
            const newStatus = subscribeCarPerk(allP, perkKey);
            allP.sendMessage(`\xA7b\u{1F697}\u{1F4B3} [\u8ECA\u4E21\u30B5\u30D6\u30B9\u30AF] \u300C${perkDef.name}\u300D\u306E\u4FDD\u967A\u6599\uFF08${perkDef.fedPrice} FED / \u7D04 ${renewCost.toLocaleString()} M\uFF09\u3092\u5F15\u304D\u843D\u3068\u3057\u3001\u5951\u7D04\u309230\u5206\u9593\u81EA\u52D5\u66F4\u65B0\u3057\u307E\u3057\u305F\uFF01\xA7r`);
          } else {
            cancelCarPerkSubscription(allP, perkKey);
            allP.sendMessage(`\xA7c\u26A0\uFE0F [\u8ECA\u4E21\u30B5\u30D6\u30B9\u30AF] \u53E3\u5EA7\u6B8B\u9AD8\u4E0D\u8DB3\u306E\u305F\u3081\u300C${perkDef.name}\u300D\u306E\u81EA\u52D5\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF08\u5FC5\u8981\u984D: ${renewCost.toLocaleString()} M\uFF09\u3002\u5951\u7D04\u304C\u5931\u52B9\u3057\u307E\u3057\u305F\u3002\xA7r`);
          }
        } else {
          cancelCarPerkSubscription(allP, perkKey);
          allP.sendMessage(`\xA77\u{1F697} [\u8ECA\u4E21\u30B5\u30D6\u30B9\u30AF] \u300C${perkDef.name}\u300D\u306E\u5951\u7D04\u671F\u9593\u304C\u6E80\u4E86\u3057\u307E\u3057\u305F\u3002\u518D\u5EA6\u3054\u5229\u7528\u306E\u969B\u306F\u91D1\u878D\u30DD\u30FC\u30BF\u30EB\u304B\u3089\u3054\u52A0\u5165\u304F\u3060\u3055\u3044\u3002\xA7r`);
        }
      }
    }
  }
  for (const [posKey, inst] of instanceServerMap.entries()) {
    const [sx, sy, sz] = posKey.split(",").map(Number);
    const fedCount = inst.federatedWith.length;
    if (fedCount > 0) {
      const nearbyP = overworld.getPlayers({
        location: { x: sx, y: sy, z: sz },
        maxDistance: 32
      });
      for (const p of nearbyP) {
        p.addEffect("speed", 30, { amplifier: 0, showParticles: false });
        p.addEffect("haste", 30, { amplifier: Math.min(2, fedCount - 1), showParticles: false });
      }
    }
  }
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
  for (const p of players) {
    const pLoc = p.location;
    const pId = p.id;
    const now2 = Date.now();
    const lastBounce = playerLastBounceTimeMap.get(pId) || 0;
    if (now2 - lastBounce < 350) continue;
    const bx = Math.floor(pLoc.x);
    const by = Math.floor(pLoc.y - 0.2);
    const bz = Math.floor(pLoc.z);
    try {
      const b = overworld.getBlock({ x: bx, y: by, z: bz });
      if (b && (b.typeId === "mi:pudding" || b.typeId === "mi:nekomimi_pudding")) {
        playerLastBounceTimeMap.set(pId, now2);
        const posKey = `${bx},${by},${bz}`;
        const count = (puddingBounceMap.get(posKey) || 0) + 1;
        puddingBounceMap.set(posKey, count);
        p.applyKnockback(0, 0, 0, 0.75);
        overworld.spawnParticle("minecraft:slime_particle", { x: bx + 0.5, y: by + 0.7, z: bz + 0.5 });
        if (count >= 5) {
          puddingBounceMap.delete(posKey);
          b.setType("minecraft:air");
          overworld.spawnParticle("minecraft:smoke_particle", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 });
          overworld.spawnParticle("minecraft:lava_particle", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 });
        }
      }
    } catch (e) {
    }
  }
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  const activeAccidentLocations = [];
  for (const car of cars) {
    if (!car.isValid()) continue;
    const cLoc = car.location;
    const carId = car.id;
    let playerNearby = false;
    for (const p of players) {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - cLoc.x, 2) + Math.pow(pLoc.y - cLoc.y, 2) + Math.pow(pLoc.z - cLoc.z, 2);
      if (distSq <= 2304) {
        playerNearby = true;
        break;
      }
    }
    if (!playerNearby) continue;
    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId);
      if (now < recoveryTime) {
        try {
          car.addEffect("slowness", 30, { amplifier: 255, showParticles: false });
          overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
          overworld.spawnParticle("minecraft:lava_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
        } catch (e) {
        }
        activeAccidentLocations.push(cLoc);
        continue;
      } else {
        accidentCarsMap.delete(carId);
        try {
          overworld.spawnParticle("minecraft:heart_particle", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
          const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
          for (const p of nearbyPlayers) {
            p.sendMessage("\xA7a\u{1F527}\u{1F697} [Mi_Addon] \u8ECA\u4E21\u306E\u5FDC\u6025\u4FEE\u7406\u304C\u5B8C\u4E86\u3057\u3001\u4E8B\u6545\u73FE\u5834\u304C\u5FA9\u65E7\u3057\u307E\u3057\u305F\uFF01\xA7r");
          }
        } catch (e) {
        }
      }
    }
    const rideable = car.getComponent("minecraft:rideable");
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    let isRidden = false;
    try {
      isRidden = riders.length > 0 || overworld.getPlayers({ location: cLoc, maxDistance: 2.5 }).length > 0;
    } catch (e) {
    }
    if (isRidden) {
      for (const rider of riders) {
        if (rider instanceof Player && hasCarPerk(rider, "turbo")) {
          car.addEffect("speed", 20, { amplifier: 1, showParticles: false });
        }
      }
      const viewDir = car.getViewDirection();
      let hasWallHit = false;
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
          } catch (e) {
          }
        }
        if (hasWallHit) break;
      }
      if (hasWallHit) {
        let hasInsuranceRider = false;
        for (const rider of riders) {
          if (rider instanceof Player) {
            const insStatus = getInsuranceStatus(rider);
            if (insStatus.active) {
              hasInsuranceRider = true;
              rider.sendMessage(`\xA7b\u{1F6E1}\uFE0F\u{1F697} [\u8ECA\u4E21\u4FDD\u967A\u767A\u52D5] \u8ECA\u304C\u5927\u7834\u3057\u305F\u304C\u3001\u8ECA\u4E21\u4FDD\u967A\u30B5\u30D6\u30B9\u30AF\u306B\u3088\u308A\u5373\u5EA7\u306B\u73FE\u5834\u4FEE\u5FA9\u3055\u308C\u307E\u3057\u305F\uFF01\uFF08\u6B8B\u308A\u6642\u9593: \u7D04 ${insStatus.remainingMinutes} \u5206\uFF09\xA7r`);
              overworld.spawnParticle("minecraft:totem_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
              break;
            }
          }
        }
        if (!hasInsuranceRider) {
          accidentCarsMap.set(carId, now + 6e4);
          activeAccidentLocations.push(cLoc);
          try {
            car.applyKnockback(-viewDir.x, -viewDir.z, 0.6, 0.2);
            overworld.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
            overworld.spawnParticle("minecraft:huge_explosion_emitter", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
            const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
            for (const p of nearbyPlayers) {
              p.sendMessage("\xA7c\u{1F4A5}\u{1F697}\u3010\u4EA4\u901A\u4E8B\u6545\u767A\u751F\uFF01\u3011\u8ECA\u304C\u58C1\u306B\u6FC0\u7A81\u3057\u3066\u5927\u7834\u3057\u307E\u3057\u305F\uFF01 1\u5206\u9593 \u79FB\u52D5\u4E0D\u80FD\u306B\u306A\u308A\u307E\u3059\uFF01\xA7r");
            }
          } catch (e) {
          }
          continue;
        }
      }
    }
    let isSlope = false;
    try {
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
    } catch (e) {
    }
    let isNearAccident = false;
    for (const accLoc of activeAccidentLocations) {
      const distSq = Math.pow(cLoc.x - accLoc.x, 2) + Math.pow(cLoc.y - accLoc.y, 2) + Math.pow(cLoc.z - accLoc.z, 2);
      if (distSq <= 625) {
        isNearAccident = true;
        break;
      }
    }
    let nearbyEntities = [];
    let nearbyCars = [];
    try {
      nearbyEntities = overworld.getEntities({ location: cLoc, maxDistance: 64, excludeTypes: ["minecraft:item"] });
      nearbyCars = overworld.getEntities({ location: cLoc, maxDistance: 64, type: "mi:regretcar" });
    } catch (e) {
    }
    const carJamThreshold = isSlope ? 4 : 10;
    const entityJamThreshold = isSlope ? 12 : 30;
    const isCongested = nearbyCars.length >= carJamThreshold || nearbyEntities.length >= entityJamThreshold;
    try {
      if (isNearAccident || isCongested) {
        car.addEffect("slowness", 10, { amplifier: 5, showParticles: false });
        overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
      } else if (isSlope) {
        car.addEffect("slowness", 10, { amplifier: 2, showParticles: false });
        overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
      }
    } catch (e) {
    }
  }
  for (const p of players) {
    const pLoc = p.location;
    const chunkX = Math.floor(pLoc.x / 64) * 64;
    const chunkZ = Math.floor(pLoc.z / 64) * 64;
    let alreadyExistsSteelworks = false;
    for (const loc of generatedSteelworksLocations) {
      const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
      if (distSq < 16e4) {
        alreadyExistsSteelworks = true;
        break;
      }
    }
    if (!alreadyExistsSteelworks && Math.random() < 0.15) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 24 + Math.random() * 16;
      const genX = Math.floor(pLoc.x + Math.cos(angle) * dist);
      const genZ = Math.floor(pLoc.z + Math.sin(angle) * dist);
      try {
        let surfaceY = Math.floor(pLoc.y);
        let foundGround = false;
        for (let y = Math.min(120, Math.floor(pLoc.y) + 15); y >= Math.max(50, Math.floor(pLoc.y) - 15); y--) {
          try {
            const b = overworld.getBlock({ x: genX, y, z: genZ });
            if (b && !b.isAir && !b.isLiquid) {
              surfaceY = y + 1;
              foundGround = true;
              break;
            }
          } catch (e) {
            break;
          }
        }
        if (foundGround) {
          generatedSteelworksLocations.push({ x: chunkX, z: chunkZ });
          generateYahataSteelworks(overworld, { x: genX, y: surfaceY, z: genZ });
          console.warn(`[Mi_Addon] Safely Generated Yahata Steelworks at (${genX}, ${surfaceY}, ${genZ})`);
        }
      } catch (e) {
      }
    }
    let shouldGenerateHQ = false;
    let hqGenX = 0;
    let hqGenZ = 0;
    if (plannedHQLocation) {
      const pDistSq = Math.pow(pLoc.x - plannedHQLocation.x, 2) + Math.pow(pLoc.z - plannedHQLocation.z, 2);
      const isAlreadyBuilt = allMisskeyHQLocations.some(
        (h) => Math.pow(h.x - plannedHQLocation.x, 2) + Math.pow(h.z - plannedHQLocation.z, 2) < 25600
        // 160m
      );
      if (pDistSq <= 4e4 && !isAlreadyBuilt) {
        shouldGenerateHQ = true;
        hqGenX = plannedHQLocation.x;
        hqGenZ = plannedHQLocation.z;
      }
    }
    if (!shouldGenerateHQ) {
      let alreadyExistsHQ = false;
      for (const loc of generatedHQLocations) {
        const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
        if (distSq < 625e4) {
          alreadyExistsHQ = true;
          break;
        }
      }
      for (const loc of allMisskeyHQLocations) {
        const distSq = Math.pow(pLoc.x - loc.x, 2) + Math.pow(pLoc.z - loc.z, 2);
        if (distSq < 625e4) {
          alreadyExistsHQ = true;
          break;
        }
      }
      const distFromOrigin = Math.sqrt(pLoc.x * pLoc.x + pLoc.z * pLoc.z);
      if (!alreadyExistsHQ && distFromOrigin >= 1500 && Math.random() < 0.05) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 32 + Math.random() * 24;
        hqGenX = Math.floor(pLoc.x + Math.cos(angle) * dist);
        hqGenZ = Math.floor(pLoc.z + Math.sin(angle) * dist);
        shouldGenerateHQ = true;
      }
    }
    if (shouldGenerateHQ) {
      try {
        let surfaceY = Math.floor(pLoc.y);
        let foundGround = false;
        for (let y = Math.min(120, Math.floor(pLoc.y) + 20); y >= Math.max(50, Math.floor(pLoc.y) - 20); y--) {
          try {
            const b = overworld.getBlock({ x: hqGenX, y, z: hqGenZ });
            if (b && !b.isAir && !b.isLiquid) {
              surfaceY = y + 1;
              foundGround = true;
              break;
            }
          } catch (e) {
            break;
          }
        }
        if (foundGround) {
          generatedHQLocations.push({ x: chunkX, z: chunkZ });
          generateMisskeyHQ(overworld, { x: hqGenX, y: surfaceY, z: hqGenZ });
          console.warn(`[Mi_Addon] Safely Generated Misskey HQ Skyscraper at (${hqGenX}, ${surfaceY}, ${hqGenZ})`);
          world.sendMessage(`\xA76\u{1F3E2}\u26A1\u3010\u5927\u767A\u898B\uFF01\u3011\u30D7\u30EC\u30A4\u30E4\u30FC\u300C${p.name}\u300D\u304C\u9065\u304B\u5F7C\u65B9\u306E\u8981\u585E\u30C0\u30F3\u30B8\u30E7\u30F3\u300CMisskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u300D\u3092\u767A\u898B\u30FB\u5230\u9054\u3057\u307E\u3057\u305F\uFF01\xA7r`);
          if (plannedHQLocation && Math.abs(hqGenX - plannedHQLocation.x) < 48 && Math.abs(hqGenZ - plannedHQLocation.z) < 48) {
            plannedHQLocation = null;
          }
        }
      } catch (e) {
      }
    }
  }
}, 20);
var murakamiLastSkillTimeMap = /* @__PURE__ */ new Map();
var murakamiPhase2AnnouncedSet = /* @__PURE__ */ new Set();
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  let murakamiBosses = [];
  try {
    murakamiBosses = overworld.getEntities({ type: "mi:murakami_boss" });
  } catch (e) {
  }
  const now = Date.now();
  for (const boss of murakamiBosses) {
    if (!boss.isValid()) continue;
    const healthComp = boss.getComponent(EntityComponentTypes.Health);
    if (!healthComp) continue;
    const currentHp = healthComp.currentValue;
    const maxHp = healthComp.effectiveMax;
    const isEnraged = currentHp <= maxHp * 0.5;
    if (!isEnraged) continue;
    const bLoc = boss.location;
    const nearbyPlayers = overworld.getPlayers().filter((p) => {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.y - bLoc.y, 2) + Math.pow(pLoc.z - bLoc.z, 2);
      return distSq <= 576;
    });
    if (nearbyPlayers.length === 0) continue;
    if (!murakamiPhase2AnnouncedSet.has(boss.id)) {
      murakamiPhase2AnnouncedSet.add(boss.id);
      for (const p of nearbyPlayers) {
        p.sendMessage("\xA7c\u{1F525} [\u6751\u4E0A\u3055\u3093] \u300C\u3050\u306C\u306C\u2026\u3084\u308B\u306A\u2026\uFF01 \u3060\u304C\u3053\u3053\u304B\u3089\u304C\u672C\u756A\u3060\uFF01\uFF01\u300D\xA7r");
      }
    }
    const lastSkill = murakamiLastSkillTimeMap.get(boss.id) || 0;
    if (now - lastSkill >= 2e4) {
      murakamiLastSkillTimeMap.set(boss.id, now);
      for (const p of nearbyPlayers) {
        p.sendMessage("\xA7c\u26A1 [\u6751\u4E0A\u3055\u3093] \u300C\u767D\u9B3C\u591C\u884C\uFF08\u306F\u3063\u304D\u3084\u3053\u3046\uFF09\u306E\u59CB\u307E\u308A\u3060\u2026\uFF01 \u6211\u304C\u8907\u88FD\u4F53\u3069\u3082\u3088\u3001\u4FB5\u5165\u8005\u3092\u55B0\u3089\u3044\u5C3D\u304F\u305B\uFF01\uFF01\u300D\xA7r");
      }
      try {
        overworld.spawnParticle("minecraft:mob_portal", { x: bLoc.x, y: bLoc.y + 1.5, z: bLoc.z });
        overworld.spawnParticle("minecraft:large_explosion", { x: bLoc.x, y: bLoc.y + 2, z: bLoc.z });
        overworld.spawnParticle("minecraft:sonic_explosion", { x: bLoc.x, y: bLoc.y + 1, z: bLoc.z });
      } catch (e) {
      }
      for (const p of nearbyPlayers) {
        const pLoc = p.location;
        const dist = Math.sqrt(Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.z - bLoc.z, 2));
        if (dist <= 10) {
          const kx = (pLoc.x - bLoc.x) / (dist || 1);
          const kz = (pLoc.z - bLoc.z) / (dist || 1);
          try {
            p.applyKnockback(kx, kz, 1.6, 0.6);
            p.applyDamage(3);
          } catch (e) {
          }
        }
      }
      try {
        boss.addEffect("strength", 200, { amplifier: 0 });
        boss.addEffect("resistance", 160, { amplifier: 1 });
        boss.addEffect("speed", 300, { amplifier: 1 });
      } catch (e) {
      }
      const summonCount = 7 + nearbyPlayers.length * 2;
      for (let i = 0; i < summonCount; i++) {
        const sx = bLoc.x + (Math.random() * 8 - 4);
        const sz = bLoc.z + (Math.random() * 8 - 4);
        const randType = Math.random();
        system.runTimeout(() => {
          try {
            if (randType < 0.6) {
              overworld.spawnEntity("mi:m_tutinoko_hostile", { x: sx, y: bLoc.y + 0.5, z: sz });
            } else if (randType < 0.85) {
              overworld.spawnEntity("mi:researcher", { x: sx, y: bLoc.y + 0.5, z: sz });
            } else {
              overworld.spawnEntity("mi:blebcat", { x: sx, y: bLoc.y + 1, z: sz });
            }
            overworld.spawnParticle("minecraft:mob_portal", { x: sx, y: bLoc.y + 1, z: sz });
          } catch (e) {
          }
        }, i * 2);
      }
    }
  }
}, 20);
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  if (itemStack.typeId === "mi:igyo" || itemStack.typeId.endsWith("_ha_igyo")) {
    if (player.isSneaking) {
      openAchievementRetryUI(player);
      return;
    }
    const inv = player.getComponent(EntityComponentTypes.Inventory)?.container;
    if (inv) {
      const foundSlots = /* @__PURE__ */ new Map();
      for (let i = 0; i < inv.size; i++) {
        const it = inv.getItem(i);
        if (it && ALL_IGYO_ITEMS.includes(it.typeId) && !foundSlots.has(it.typeId)) {
          foundSlots.set(it.typeId, i);
        }
      }
      const missingItems = ALL_IGYO_ITEMS.filter((typeId) => !foundSlots.has(typeId));
      if (missingItems.length > 0) {
        const currentCount = ALL_IGYO_ITEMS.length - missingItems.length;
        player.sendMessage(`\xA7e\u{1F4DC} [\u5049\u696D\u306E\u932C\u6210] \u73FE\u5728\u306E\u9032\u6357: \xA76${currentCount} / 11\xA7e \u500B\xA7r`);
        player.sendMessage(`\xA77\u307E\u3060\u9054\u6210\u30FB\u6240\u6301\u3057\u3066\u3044\u306A\u3044\u5049\u696D (${missingItems.length}\u500B):\xA7r`);
        for (const missing of missingItems) {
          const key = missing.replace("mi:", "").replace("_ha_igyo", "");
          const name = IGYO_NAMES[key] || key;
          const desc = IGYO_DESCRIPTIONS[key] || "";
          player.sendMessage(`\xA7c\u30FB ${name} \xA77(${desc})\xA7r`);
        }
      } else {
        if (playerHasItem(player, "mi:igyo_tool")) {
          player.sendMessage("\xA7e\u26A0\uFE0F \u3042\u306A\u305F\u306F\u3059\u3067\u306B\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u6240\u6301\u3057\u3066\u3044\u307E\u3059\uFF01\xA7r");
        } else {
          for (const [typeId, slotIdx] of foundSlots.entries()) {
            const it = inv.getItem(slotIdx);
            if (it) {
              if (it.amount > 1) {
                it.amount -= 1;
                inv.setItem(slotIdx, it);
              } else {
                inv.setItem(slotIdx, void 0);
              }
            }
          }
          if (itemStack.typeId === "mi:igyo") {
            decrementPlayerHeldItem(player);
          }
          const tool = new ItemStack("mi:igyo_tool", 1);
          tool.setLore([
            `\xA76\u5049\u696D\u9054\u6210\u8005: \xA7f${player.name}\xA7r`,
            `\xA7e11\u306E\u5049\u696D\u3092\u6367\u3052\u3066\u932C\u6210\u3055\u308C\u305F\u4E07\u80FD\u30C4\u30FC\u30EB\xA7r`,
            `\xA77\u936C\u30FB\u30C4\u30EB\u30CF\u30B7\u30FB\u65A7\u30FB\u30B7\u30E3\u30D9\u30EB\u3059\u3079\u3066\u306E\u80FD\u529B\u3092\u6301\u3064\xA7r`
          ]);
          inv.addItem(tool);
          const pLoc = player.location;
          const dim = player.dimension;
          dim.spawnParticle("minecraft:totem_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
          dim.spawnParticle("minecraft:large_explosion", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
          dim.spawnParticle("minecraft:villager_happy", { x: pLoc.x, y: pLoc.y + 2, z: pLoc.z });
          dim.spawnParticle("minecraft:heart_particle", { x: pLoc.x, y: pLoc.y + 2.2, z: pLoc.z });
          player.sendMessage("\xA76\u{1F3C6}\u2728\u3010\u5049\u696D\u9054\u6210\u306E\u5100\u5F0F\u301111\u306E\u5049\u696D\u304C\u5171\u9CF4\u3057\u3001\u4E07\u80FD\u306A\u308B\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u304C\u6388\u3051\u3089\u308C\u305F\uFF01\xA7r");
          world.sendMessage(`\xA76\u{1F4E2} [Mi_Addon] \u30D7\u30EC\u30A4\u30E4\u30FC\u300C${player.name}\u300D\u304C11\u306E\u5049\u696D\u3092\u3059\u3079\u3066\u6367\u3052\u3001\u300C\u5049\u696D\u306E\u30C4\u30FC\u30EB\u300D\u3092\u932C\u6210\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        }
      }
    }
  }
  if (itemStack.typeId === "minecraft:book" || itemStack.typeId === "minecraft:writable_book" || itemStack.typeId === "minecraft:written_book" || itemStack.typeId === "minecraft:enchanted_book") {
    grantAchievement(player, "dokusho");
  }
  if (itemStack.typeId === "mi:yahata_blueprint") {
    const now = Date.now();
    const lastUse = blueprintCooldownMap.get(player.id) || 0;
    if (now - lastUse < 2e3) return;
    blueprintCooldownMap.set(player.id, now);
    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const targetLoc = {
      x: Math.floor(pLoc.x + viewDir.x * 8),
      y: Math.floor(pLoc.y),
      z: Math.floor(pLoc.z + viewDir.z * 8)
    };
    decrementPlayerHeldItem(player);
    player.sendMessage("\xA7e\u{1F3ED} [\u5B98\u55B6\u516B\u5E61\u88FD\u9244\u6240] \u8A2D\u8A08\u56F3\u3092\u5C55\u958B\u3057\u3001\u6B74\u53F2\u3042\u308B\u88FD\u9244\u6240\u5EC3\u589F\u3092\u5EFA\u8A2D\u4E2D...\uFF01\xA7r");
    try {
      dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
    } catch (e) {
    }
    system.runTimeout(() => {
      generateYahataSteelworks(dim, targetLoc);
      player.sendMessage("\xA7a\u2728 \u5B98\u55B6\u516B\u5E61\u88FD\u9244\u6240\u306E\u907A\u69CB\uFF08\u5EC3\u589F\u30C0\u30F3\u30B8\u30E7\u30F3\uFF09\u304C\u76EE\u306E\u524D\u306B\u73FE\u308C\u307E\u3057\u305F\uFF01\xA7r");
      try {
        dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 4, z: targetLoc.z });
      } catch (e) {
      }
    }, 5);
    return;
  }
  if (itemStack.typeId === "mi:hq_blueprint") {
    const now = Date.now();
    const lastUse = blueprintCooldownMap.get(player.id) || 0;
    if (now - lastUse < 2e3) return;
    blueprintCooldownMap.set(player.id, now);
    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const targetLoc = {
      x: Math.floor(pLoc.x + viewDir.x * 12),
      y: Math.floor(pLoc.y),
      z: Math.floor(pLoc.z + viewDir.z * 12)
    };
    decrementPlayerHeldItem(player);
    player.sendMessage("\xA7b\u{1F3E2} [Misskey\u958B\u767A\u6240] \u8A2D\u8A08\u56F3\u3092\u5C55\u958B\u3057\u3001\u958B\u767A\u6240\u30D3\u30EB\uFF084\u968E\u5EFA\u3066\u30C0\u30F3\u30B8\u30E7\u30F3\uFF09\u3092\u5EFA\u8A2D\u4E2D...\uFF01\xA7r");
    try {
      dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
      dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 6, z: targetLoc.z });
    } catch (e) {
    }
    system.runTimeout(() => {
      generateMisskeyHQ(dim, targetLoc);
      player.sendMessage("\xA7a\u2728 Misskey\u958B\u767A\u6240\uFF084\u968E\u5EFA\u3066\u30C0\u30F3\u30B8\u30E7\u30F3\uFF09\u306E\u5EFA\u8A2D\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\uFF01\xA7r");
      try {
        dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 8, z: targetLoc.z });
      } catch (e) {
      }
    }, 5);
    return;
  }
  if (itemStack.typeId === "mi:ecology_server") {
    const dim = player.dimension;
    const pLoc = player.location;
    const targetHQ = getNearestOrPlannedHQ(player);
    const { dirName, dist } = getCompassDirectionName(pLoc, targetHQ);
    const dx = targetHQ.x - pLoc.x;
    const dz = targetHQ.z - pLoc.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = dx / len;
    const nz = dz / len;
    for (let step = 1; step <= 8; step++) {
      const px = pLoc.x + nx * step * 1.5;
      const py = pLoc.y + 1.2 + step * 0.4;
      const pz = pLoc.z + nz * step * 1.5;
      try {
        dim.spawnParticle("minecraft:witch_spell_particle", { x: px, y: py, z: pz });
        dim.spawnParticle("minecraft:totem_particle", { x: px, y: py, z: pz });
      } catch (e) {
      }
    }
    if (dist <= 200) {
      player.sendMessage(`\xA7d\u26A1 [\u751F\u614B\u30B5\u30FC\u30D0\u30FC\u63A2\u77E5] \u96FB\u6CE2\u304C\u8D85\u5F37\u529B\u3067\u3059\uFF01 Misskey\u958B\u767A\u6240\u306F\u76EE\u3068\u9F3B\u306E\u5148\uFF08\u7D04 \xA7e${dist}m \u5148\xA7d\uFF09\u306B\u3042\u308A\u307E\u3059\uFF01\xA7r`);
    } else {
      player.sendMessage(`\xA7b\u{1F4E1} [\u751F\u614B\u30B5\u30FC\u30D0\u30FC\u63A2\u77E5] \u958B\u767A\u6240\u306E\u96FB\u6CE2\u3092\u30AD\u30E3\u30C3\u30C1\uFF01 \u65B9\u89D2: \u3010\xA7a${dirName}\xA7b \u65B9\u5411 / \u7D04 \xA7e${dist}m \u5148\xA7b\uFF08X: \xA7f${targetHQ.x}\xA7b, Z: \xA7f${targetHQ.z}\xA7b \u4ED8\u8FD1\uFF09\u3011\xA7r`);
    }
    return;
  }
  if (itemStack.typeId.startsWith("mi:yen_")) {
    openQuickWalletUI(player);
    return;
  }
});
function isLogBlock(typeId) {
  return typeId.includes("log") || typeId.includes("wood") || typeId.includes("stem") || typeId.includes("hyphae");
}
function isLeavesBlock(typeId) {
  return typeId.includes("leaves") || typeId.includes("leaf") || typeId.includes("azalea") || typeId.includes("wart_block") || typeId.includes("shroomlight") || typeId.includes("mangrove_roots");
}
function isOreBlock(typeId) {
  return typeId.includes("ore") || typeId.includes("ancient_debris") || typeId.includes("raw_iron_block") || typeId.includes("raw_gold_block") || typeId.includes("raw_copper_block");
}
function isStoneTypeBlock(typeId) {
  const stones = [
    "minecraft:andesite",
    "minecraft:polished_andesite",
    "minecraft:granite",
    "minecraft:polished_granite",
    "minecraft:diorite",
    "minecraft:polished_diorite",
    "minecraft:tuff",
    "minecraft:polished_tuff",
    "minecraft:deepslate",
    "minecraft:cobbled_deepslate",
    "minecraft:calcite",
    "minecraft:dripstone_block"
  ];
  return stones.some((st) => typeId === st || typeId.includes(st.replace("minecraft:", "")));
}
function isExplosionToolTarget(typeId) {
  return isLogBlock(typeId) || isLeavesBlock(typeId) || isOreBlock(typeId) || isStoneTypeBlock(typeId);
}
world.beforeEvents.playerBreakBlock.subscribe((event) => {
  const itemStack = event.itemStack;
  if (itemStack && itemStack.typeId === "mi:explosion_tool") {
    const blockTypeId = event.block.typeId;
    if (!isExplosionToolTarget(blockTypeId)) {
      event.cancel = true;
    }
  }
});
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  if (!player) return;
  const playerId = player.id;
  const blockPerm = event.brokenBlockPermutation;
  const blockTypeId = blockPerm?.type?.id || "";
  const groundKeywords = ["dirt", "grass", "podzol", "mycelium", "mud", "sand", "gravel", "clay"];
  if (groundKeywords.some((kw) => blockTypeId.includes(kw))) {
    const count = (playerSeichiBreakCountMap.get(playerId) || 0) + 1;
    playerSeichiBreakCountMap.set(playerId, count);
    if (count >= 1e3) {
      grantAchievement(player, "seichi");
    }
  }
  if (blockTypeId.includes("snow")) {
    const count = (playerSnowBreakCountMap.get(playerId) || 0) + 1;
    playerSnowBreakCountMap.set(playerId, count);
    if (count >= 500) {
      grantAchievement(player, "josetsu");
    }
  }
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  const handItem = event.itemStackBeforeBreak || equippable?.getEquipment("Mainhand");
  if (handItem && handItem.typeId === "mi:explosion_tool") {
    const isLog = isLogBlock(blockTypeId);
    const isLeafTarget = isLeavesBlock(blockTypeId);
    const isOre = isOreBlock(blockTypeId);
    const isStone = isStoneTypeBlock(blockTypeId);
    if (isLog || isLeafTarget || isOre || isStone) {
      const pKey = `${playerId}_vein_mining`;
      if (!isVeinMiningInProgress.has(pKey)) {
        isVeinMiningInProgress.add(pKey);
        const blockLoc = { x: event.block.location.x, y: event.block.location.y, z: event.block.location.z };
        const dim = event.block.dimension;
        system.run(() => {
          try {
            const maxBlocks = isLog ? 128 : isLeafTarget ? 256 : 64;
            const visited = /* @__PURE__ */ new Set();
            const queue = [];
            const destroyedBlocks = [];
            const startKey = `${blockLoc.x},${blockLoc.y},${blockLoc.z}`;
            visited.add(startKey);
            queue.push(blockLoc);
            while (queue.length > 0 && destroyedBlocks.length < maxBlocks) {
              const curr = queue.shift();
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    const nx = curr.x + dx;
                    const ny = curr.y + dy;
                    const nz = curr.z + dz;
                    const key = `${nx},${ny},${nz}`;
                    if (!visited.has(key)) {
                      visited.add(key);
                      try {
                        const b = dim.getBlock({ x: nx, y: ny, z: nz });
                        if (b && !b.isAir) {
                          const bType = b.typeId;
                          const matches = isLog && isLogBlock(bType) || isLeafTarget && isLeavesBlock(bType) || isOre && (bType === blockTypeId || isOreBlock(bType)) || isStone && (bType === blockTypeId || isStoneTypeBlock(bType));
                          if (matches) {
                            queue.push({ x: nx, y: ny, z: nz });
                            destroyedBlocks.push({ x: nx, y: ny, z: nz });
                          }
                        }
                      } catch (e) {
                      }
                    }
                  }
                }
              }
            }
            const destroyedLeaves = [];
            if (isLog) {
              const allTreePositions = [blockLoc, ...destroyedBlocks];
              const leafQueue = [];
              for (const tp of allTreePositions) {
                for (let lx = -3; lx <= 3; lx++) {
                  for (let ly = -2; ly <= 8; ly++) {
                    for (let lz = -3; lz <= 3; lz++) {
                      const fx = tp.x + lx;
                      const fy = tp.y + ly;
                      const fz = tp.z + lz;
                      const fKey = `${fx},${fy},${fz}`;
                      if (!visited.has(fKey)) {
                        visited.add(fKey);
                        try {
                          const lb = dim.getBlock({ x: fx, y: fy, z: fz });
                          if (lb && !lb.isAir && isLeavesBlock(lb.typeId)) {
                            leafQueue.push({ x: fx, y: fy, z: fz });
                            destroyedLeaves.push({ x: fx, y: fy, z: fz });
                          }
                        } catch (e) {
                        }
                      }
                    }
                  }
                }
              }
              while (leafQueue.length > 0 && destroyedLeaves.length < 300) {
                const lCurr = leafQueue.shift();
                for (let dx = -1; dx <= 1; dx++) {
                  for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                      if (dx === 0 && dy === 0 && dz === 0) continue;
                      const nx = lCurr.x + dx;
                      const ny = lCurr.y + dy;
                      const nz = lCurr.z + dz;
                      const key = `${nx},${ny},${nz}`;
                      if (!visited.has(key)) {
                        visited.add(key);
                        try {
                          const lb = dim.getBlock({ x: nx, y: ny, z: nz });
                          if (lb && !lb.isAir && isLeavesBlock(lb.typeId)) {
                            leafQueue.push({ x: nx, y: ny, z: nz });
                            destroyedLeaves.push({ x: nx, y: ny, z: nz });
                          }
                        } catch (e) {
                        }
                      }
                    }
                  }
                }
              }
            }
            let toolBroken = false;
            let actualBrokenBlocks = 0;
            let actualBrokenLeaves = 0;
            const curHeld = equippable?.getEquipment("Mainhand");
            const durabilityComp = curHeld ? curHeld.getComponent("minecraft:durability") : null;
            let unbreakingLevel = 0;
            if (curHeld) {
              const enchantComp = curHeld.getComponent("minecraft:enchantable");
              if (enchantComp) {
                const unbreaking = enchantComp.getEnchantment("unbreaking");
                if (unbreaking) unbreakingLevel = unbreaking.level;
              }
            }
            for (const db of destroyedBlocks) {
              if (toolBroken) break;
              try {
                const b = dim.getBlock({ x: db.x, y: db.y, z: db.z });
                if (b && !b.isAir) {
                  dim.runCommand(`setblock ${db.x} ${db.y} ${db.z} air destroy`);
                  actualBrokenBlocks++;
                  if (player.gameMode !== "creative" && durabilityComp) {
                    if (Math.random() < 1 / (unbreakingLevel + 1)) {
                      durabilityComp.damage += 1;
                      if (durabilityComp.damage >= durabilityComp.maxDurability) {
                        toolBroken = true;
                        equippable?.setEquipment("Mainhand", void 0);
                        dim.spawnParticle("minecraft:smoke_particle", player.location);
                        player.sendMessage("\xA7c\u{1F4A5} [Mi_Addon] \u30A8\u30AF\u30B9\u30D7\u30ED\u30FC\u30B8\u30E7\u30F3\u30C4\u30FC\u30EB\u304C\u4F7F\u3044\u679C\u305F\u3055\u308C\u3066\u58CA\u308C\u3066\u3057\u307E\u3063\u305F\uFF01\xA7r");
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
            for (const lf of destroyedLeaves) {
              if (toolBroken) break;
              try {
                const lb = dim.getBlock({ x: lf.x, y: lf.y, z: lf.z });
                if (lb && !lb.isAir) {
                  dim.runCommand(`setblock ${lf.x} ${lf.y} ${lf.z} air destroy`);
                  actualBrokenLeaves++;
                  if (player.gameMode !== "creative" && durabilityComp) {
                    if (Math.random() < 1 / (unbreakingLevel + 1)) {
                      durabilityComp.damage += 1;
                      if (durabilityComp.damage >= durabilityComp.maxDurability) {
                        toolBroken = true;
                        equippable?.setEquipment("Mainhand", void 0);
                        dim.spawnParticle("minecraft:smoke_particle", player.location);
                        player.sendMessage("\xA7c\u{1F4A5} [Mi_Addon] \u30A8\u30AF\u30B9\u30D7\u30ED\u30FC\u30B8\u30E7\u30F3\u30C4\u30FC\u30EB\u304C\u4F7F\u3044\u679C\u305F\u3055\u308C\u3066\u58CA\u308C\u3066\u3057\u307E\u3063\u305F\uFF01\xA7r");
                      }
                    }
                  }
                }
              } catch (e) {
              }
            }
            if (!toolBroken && curHeld && player.gameMode !== "creative") {
              equippable?.setEquipment("Mainhand", curHeld);
            }
            dim.spawnParticle("minecraft:lava_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 0.5, z: blockLoc.z + 0.5 });
            dim.spawnParticle("minecraft:large_explosion", { x: blockLoc.x + 0.5, y: blockLoc.y + 0.5, z: blockLoc.z + 0.5 });
            const totalBroken = actualBrokenBlocks + 1;
            if (totalBroken > 1 || actualBrokenLeaves > 0) {
              player.sendMessage(`\xA76\u{1F4A5} [\u4E00\u62EC\u7834\u58CA] \xA7e${totalBroken} \u500B\xA76 \u306E\u30D6\u30ED\u30C3\u30AF${actualBrokenLeaves > 0 ? `\uFF08\uFF0B\u8449\u3063\u3071 ${actualBrokenLeaves}\u500B\uFF09` : ""} \u3092\u4E00\u62EC\u7206\u7815\u63A1\u6398\u3057\u307E\u3057\u305F\uFF01\xA7r`);
            }
          } finally {
            isVeinMiningInProgress.delete(pKey);
          }
        });
      }
    }
  }
  if (player.gameMode !== "creative") {
    try {
      if (!equippable) return;
      const curHandItem = equippable.getEquipment("Mainhand");
      if (!curHandItem) return;
      const typeId = curHandItem.typeId;
      if (typeId === "mi:ota" || typeId === "mi:otaku_cry" || typeId === "mi:igyo_tool") {
        const durability = curHandItem.getComponent("minecraft:durability");
        if (durability) {
          let unbreakingLevel = 0;
          const enchantable = curHandItem.getComponent("minecraft:enchantable");
          if (enchantable) {
            const unbreaking = enchantable.getEnchantment("unbreaking");
            if (unbreaking) unbreakingLevel = unbreaking.level;
          }
          const damageChance = 1 / (unbreakingLevel + 1);
          if (Math.random() < damageChance) {
            if (durability.damage + 1 >= durability.maxDurability) {
              equippable.setEquipment("Mainhand", void 0);
              const pLoc = player.location;
              player.dimension.spawnParticle("minecraft:smoke_particle", { x: pLoc.x, y: pLoc.y + 0.8, z: pLoc.z });
              player.sendMessage("\xA7c\u{1F4A5} [Mi_Addon] \u9053\u5177\u304C\u58CA\u308C\u3066\u3057\u307E\u3063\u305F\uFF01\xA7r");
            } else {
              durability.damage += 1;
              equippable.setEquipment("Mainhand", curHandItem);
            }
          }
        }
      }
    } catch (e) {
    }
  }
});
var isVeinMiningInProgress = /* @__PURE__ */ new Set();
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
