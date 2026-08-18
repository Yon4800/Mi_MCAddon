// src/main.ts
import { world, system, ItemStack, EntityComponentTypes, Player, BlockPermutation } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var playerUIOpenLock = /* @__PURE__ */ new Map();
function canOpenUI(player) {
  const now = Date.now();
  const lastTime = playerUIOpenLock.get(player.id) || 0;
  if (now - lastTime < 600)
    return false;
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
var yosanoLoveMap = /* @__PURE__ */ new Map();
var mochochoEatMap = /* @__PURE__ */ new Map();
var licensedPlayers = /* @__PURE__ */ new Set();
var accidentCarsMap = /* @__PURE__ */ new Map();
var momoLuckCooldownMap = /* @__PURE__ */ new Map();
var syuiloQuoteIndexMap = /* @__PURE__ */ new Map();
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
    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー)$/i.test(event.message.trim())) {
      grantAchievement(sender, "aisatu");
    }
  });
}
var MOMO_LUCK_COOLDOWN_MS = 5 * 60 * 1e3;
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  if (!target)
    return;
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
    if (!canOpenUI(player))
      return;
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
    if (response.canceled || response.selection === void 0)
      return;
    if (response.selection === 0) {
      const modal = new ModalFormData().title("\u{1F3DB}\uFE0F \u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u540D\u306E\u8A2D\u5B9A").textField("\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u306E\u30C9\u30E1\u30A4\u30F3\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044", "\u4F8B: my-home.misskey", inst.name);
      showFormSafe(player, modal, (res) => {
        if (res.canceled || !res.formValues)
          return;
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
        if (fRes.canceled || fRes.selection === void 0)
          return;
        if (fRes.selection === 0) {
          const connectModal = new ModalFormData().title("\u2795 \u9023\u5408\u5148\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9\u306E\u8FFD\u52A0").textField("\u63A5\u7D9A\u5148\u30C9\u30E1\u30A4\u30F3\u540D\u3092\u5165\u529B", "\u4F8B: friend-base.misskey");
          showFormSafe(player, connectModal, (cRes) => {
            if (cRes.canceled || !cRes.formValues)
              return;
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
    if (res.canceled || res.selection === void 0)
      return;
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
    if (res.canceled || !res.formValues)
      return;
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
    if (globalNotes.length > 50)
      globalNotes.pop();
    player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
    player.dimension.spawnParticle("minecraft:villager_happy", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.5, z: blockLoc.z + 0.5 });
    world.sendMessage(`\xA7a\u{1F4E2} [${player.name}@local.misskey] \u304C\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u307E\u3057\u305F: \u300C${text.trim()}\u300D\xA7r`);
  });
}
function openNoteBoardUI(player, blockLoc) {
  const unreadCount = directMessages.filter((m) => m.recipient === player.name && !m.read).length;
  const dmBadge = unreadCount > 0 ? ` (${unreadCount}\u4EF6\u672A\u8AAD)` : "";
  const deckCount = getPlayerEmojiDeck(player).length;
  const form = new ActionFormData().title("\u{1F4CB} Misskey \u30CE\u30FC\u30C8\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3").body("Misskey\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u63B2\u793A\u677F\u3067\u3059\u3002\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u305F\u308A\u3001DM\u3092\u9001\u53D7\u4FE1\u3057\u307E\u3057\u3087\u3046\uFF01").button("\u{1F4DD} \u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3059\u308B").button(`\u2699\uFE0F \u7D75\u6587\u5B57\u30C7\u30C3\u30AD\u3092\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA (${deckCount}\u30B9\u30ED\u30C3\u30C8)`).button("\u{1F4DC} \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u898B\u308B / \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3").button(`\u2709\uFE0F \u30C0\u30A4\u30EC\u30AF\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8 (DM)${dmBadge}`).button("\u9589\u3058\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0)
      return;
    if (response.selection === 0) {
      openAllInOneNoteModal(player, blockLoc);
    } else if (response.selection === 1) {
      openEmojiDeckSettingsUI(player, blockLoc);
    } else if (response.selection === 2) {
      openTimelineListUI(player, blockLoc);
    } else if (response.selection === 3) {
      openDMHubUI(player, blockLoc);
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
    if (!grouped[emoji])
      grouped[emoji] = [];
    grouped[emoji].push(pName);
  }
  if (Object.keys(grouped).length === 0)
    return "\u307E\u3060\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093";
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
    if (response.canceled || response.selection === void 0)
      return;
    if (response.selection >= globalNotes.length)
      return;
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
    if (response.canceled || response.selection === void 0)
      return;
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
        if (pRes.canceled || pRes.selection === void 0)
          return;
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
    if (res.canceled || res.selection === void 0)
      return;
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
    if (response.canceled || response.selection === void 0)
      return;
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
    if (res.canceled || !res.formValues)
      return;
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
    if (directMessages.length > 100)
      directMessages.pop();
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
    if (response.canceled || response.selection === void 0)
      return;
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
    if (response.canceled || response.selection === void 0)
      return;
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
    if (response.canceled || response.selection === void 0)
      return;
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
          if (pRes.canceled || pRes.selection === void 0)
            return;
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
        if (idx !== -1)
          directMessages.splice(idx, 1);
        player.sendMessage("\xA7e\u{1F5D1}\uFE0F DM\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\xA7r");
        openDMInboxUI(player, blockLoc);
      } else {
        openDMInboxUI(player, blockLoc);
      }
    } else {
      if (response.selection === 0) {
        const idx = directMessages.findIndex((m) => m.id === dm.id);
        if (idx !== -1)
          directMessages.splice(idx, 1);
        player.sendMessage("\xA7e\u{1F5D1}\uFE0F \u9001\u4FE1\u6E08\u307FDM\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002\xA7r");
        openDMSentBoxUI(player, blockLoc);
      } else {
        openDMSentBoxUI(player, blockLoc);
      }
    }
  });
}
var puddingBounceMap = /* @__PURE__ */ new Map();
var playerLastBounceTimeMap = /* @__PURE__ */ new Map();
var playerPuddingEatLock = /* @__PURE__ */ new Map();
function handlePuddingEat(player, block, isNekomimi) {
  const now = Date.now();
  const lastEat = playerPuddingEatLock.get(player.id) || 0;
  if (now - lastEat < 500)
    return;
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
    if (!canOpenUI(player))
      return;
    const loc = block.location;
    system.run(() => {
      openInstanceServerUI(player, loc);
    });
    return;
  }
  if (block.typeId === "mi:note_board") {
    event.cancel = true;
    if (!canOpenUI(player))
      return;
    const loc = block.location;
    system.run(() => {
      openNoteBoardUI(player, loc);
    });
    return;
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
          if (b)
            b.setType("minecraft:deepslate_bricks");
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
    if (pipeB)
      pipeB.setType("minecraft:iron_bars");
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
          b.setPermutation(BlockPermutation.resolve(type, states));
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
        const isStairHole = dx >= 4 && dx <= 6 && dz >= 4 && dz <= 6;
        if (!isStairHole) {
          setB(dx, fl.y, dz, fl.type);
        }
      }
    }
  }
  for (const ly of [5, 10, 15]) {
    setB(-4, ly, -4, "minecraft:sea_lantern");
    setB(-4, ly, 4, "minecraft:sea_lantern");
    setB(2, ly, -4, "minecraft:sea_lantern");
    setB(0, ly, 0, "minecraft:sea_lantern");
  }
  const stairBases = [0, 5, 10, 15];
  for (const yBase of stairBases) {
    for (let cdx = 4; cdx <= 6; cdx++) {
      for (let cdz = 4; cdz <= 6; cdz++) {
        for (let cy = 1; cy <= 5; cy++) {
          setB(cdx, yBase + cy, cdz, "minecraft:air");
        }
      }
    }
    setB(4, yBase + 1, 4, "minecraft:smooth_quartz");
    setB(4, yBase + 2, 5, "minecraft:smooth_quartz");
    setB(4, yBase + 3, 6, "minecraft:smooth_quartz");
    setB(5, yBase + 3, 6, "minecraft:smooth_quartz");
    setB(6, yBase + 3, 6, "minecraft:smooth_quartz");
    setB(6, yBase + 4, 5, "minecraft:smooth_quartz");
    setB(6, yBase + 5, 4, "minecraft:smooth_quartz");
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
  const lobbyChest = dimension.getBlock({ x: ox - 6, y: oy + 1, z: oz - 5 });
  if (lobbyChest) {
    lobbyChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = lobbyChest.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:bread", 16));
          inv.addItem(new ItemStack("minecraft:cookie", 8));
          inv.addItem(new ItemStack("mi:pudding", 4));
          inv.addItem(new ItemStack("mi:reaction_wand", 1));
        }
      } catch (e) {
      }
    }, 2);
  }
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
  const devChest = dimension.getBlock({ x: ox + 1, y: oy + 6, z: oz - 2 });
  if (devChest) {
    devChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = devChest.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("mi:ota", 1));
          inv.addItem(new ItemStack("mi:otaku_cry", 1));
          inv.addItem(new ItemStack("mi:baked_mochocho", 8));
          inv.addItem(new ItemStack("mi:tin_foil_hat", 1));
          inv.addItem(new ItemStack("minecraft:iron_ingot", 12));
        }
      } catch (e) {
      }
    }, 2);
  }
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
  const serverChest = dimension.getBlock({ x: ox - 6, y: oy + 11, z: oz + 4 });
  if (serverChest) {
    serverChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = serverChest.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("mi:ecology_server", 2));
          inv.addItem(new ItemStack("mi:machida", 4));
          inv.addItem(new ItemStack("mi:blob_aichi", 3));
          inv.addItem(new ItemStack("mi:sanjuu", 3));
          inv.addItem(new ItemStack("mi:gif", 3));
          inv.addItem(new ItemStack("mi:silenthill", 3));
        }
      } catch (e) {
      }
    }, 2);
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
  setB(4, 16, 4, "minecraft:gold_block");
  setB(4, 17, 4, "minecraft:iron_block");
  setB(5, 16, 4, "minecraft:diamond_block");
  setB(5, 17, 4, "minecraft:gold_block");
  const safeChest = dimension.getBlock({ x: ox + 4, y: oy + 16, z: oz + 5 });
  if (safeChest) {
    safeChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = safeChest.getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:netherite_ingot", 1));
          inv.addItem(new ItemStack("minecraft:diamond", 8));
          inv.addItem(new ItemStack("minecraft:golden_apple", 3));
          inv.addItem(new ItemStack("mi:kanagawa", 1));
          inv.addItem(new ItemStack("mi:bunchou", 2));
          inv.addItem(new ItemStack("mi:nekomimi_pudding", 2));
        }
      } catch (e) {
      }
    }, 2);
  }
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
  lastMisskeyHQLocation = { x: ox, y: oy, z: oz, dimensionId: dimension.id };
  return true;
}
var hqSpawnedFloors = /* @__PURE__ */ new Set();
system.runInterval(() => {
  if (!lastMisskeyHQLocation)
    return;
  const hq = lastMisskeyHQLocation;
  try {
    const dim = world.getDimension(hq.dimensionId);
    if (!dim)
      return;
    for (const player of world.getAllPlayers()) {
      if (player.dimension.id !== hq.dimensionId)
        continue;
      const pLoc = player.location;
      if (Math.abs(pLoc.x - hq.x) <= 8 && Math.abs(pLoc.z - hq.z) <= 8) {
        const relY = pLoc.y - hq.y;
        const key1 = `${hq.x}_${hq.z}_floor1`;
        if (relY >= 1 && relY <= 4 && !hqSpawnedFloors.has(key1)) {
          hqSpawnedFloors.add(key1);
          player.sendMessage("\xA7c\u26A0\uFE0F [1F \u30A8\u30F3\u30C8\u30E9\u30F3\u30B9] \u3076\u308C\u3076\u304D\u3083\u3063\u3068\u306E\u7FA4\u308C\u304C\u73FE\u308C\u305F\uFF01\xA7r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x, y: hq.y + 1.5, z: hq.z });
          for (let i = 0; i < 5; i++) {
            const sx = hq.x + (Math.random() * 6 - 3);
            const sz = hq.z + (Math.random() * 6 - 3);
            try {
              dim.spawnEntity("mi:blebcat", { x: sx, y: hq.y + 1, z: sz });
            } catch (e) {
            }
          }
        }
        const key2 = `${hq.x}_${hq.z}_floor2`;
        if (relY >= 6 && relY <= 9 && !hqSpawnedFloors.has(key2)) {
          hqSpawnedFloors.add(key2);
          player.sendMessage("\xA7c\u26A0\uFE0F [2F \u958B\u767A\u5BA4] \u66B4\u8D70\u3057\u305FMisskey\u7814\u7A76\u8005\u305F\u3061\u304C\u8972\u3044\u304B\u304B\u3063\u3066\u304D\u305F\uFF01\xA7r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x - 3, y: hq.y + 6.5, z: hq.z - 2 });
          const spawnSpots = [
            { x: hq.x - 4, z: hq.z - 3 },
            { x: hq.x - 3, z: hq.z - 1 },
            { x: hq.x - 1, z: hq.z + 1 },
            { x: hq.x - 5, z: hq.z + 1 }
          ];
          for (const spot of spawnSpots) {
            try {
              dim.spawnEntity("mi:researcher", { x: spot.x + 0.5, y: hq.y + 6, z: spot.z + 0.5 });
            } catch (e) {
            }
          }
        }
        const key3 = `${hq.x}_${hq.z}_floor3`;
        if (relY >= 11 && relY <= 14 && !hqSpawnedFloors.has(key3)) {
          hqSpawnedFloors.add(key3);
          player.sendMessage("\xA7c\u26A0\uFE0F [3F \u30B5\u30FC\u30D0\u30FC\u5BA4] \u751F\u4F53\u30B5\u30FC\u30D0\u30FC\u304B\u3089\u6751\u4E0A\u30C4\u30C1\u30CE\u30B3\uFF08\u8907\u88FD\u4F53\uFF09\u304C\u98DB\u3073\u51FA\u3057\u3066\u304D\u305F\uFF01\xA7r");
          dim.spawnParticle("minecraft:mob_portal", { x: hq.x - 4, y: hq.y + 11.5, z: hq.z });
          for (let i = 0; i < 5; i++) {
            const sz = hq.z + (i * 2 - 4);
            try {
              dim.spawnEntity("mi:m_tutinoko_hostile", { x: hq.x - 4 + 0.5, y: hq.y + 11, z: sz + 0.5 });
            } catch (e) {
            }
          }
        }
        const key4 = `${hq.x}_${hq.z}_floor4`;
        if (relY >= 16 && relY <= 20 && !hqSpawnedFloors.has(key4)) {
          hqSpawnedFloors.add(key4);
          player.sendMessage("\xA76\u2694\uFE0F [4F \u793E\u9577\u5BA4] \u30DC\u30B9\uFF1A\u6751\u4E0A\u3055\u3093\u304C\u73FE\u308C\u305F\uFF01\u300C\u958B\u767A\u6240\u3078\u3088\u3046\u3053\u305D\u2026\u899A\u609F\u306F\u3067\u304D\u3066\u3044\u308B\u304B\u306D\uFF1F\u300D\xA7r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x, y: hq.y + 16.5, z: hq.z + 2 });
          try {
            dim.spawnEntity("mi:murakami_boss", { x: hq.x + 0.5, y: hq.y + 16, z: hq.z + 2 + 0.5 });
          } catch (e) {
          }
        }
      }
    }
  } catch (e) {
  }
}, 20);
var syuiloHintGivenPlayers = /* @__PURE__ */ new Set();
function openSyuiloDialogUI(player, syuiloEntity) {
  const form = new ActionFormData().title("\u{1F3E2} \u3057\u3085\u3044\u308D\u3055\u3093 (Misskey)").body("\u300C\u3084\u3042\uFF01 Misskey MC Addon\u3078\u3088\u3046\u3053\u305D\uFF01\n\u4F55\u304B\u304A\u624B\u4F1D\u3044\u3067\u304D\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u3059\u304B\uFF1F\u300D").button("\u{1F4AC} \u4E16\u9593\u8A71\u3092\u3059\u308B (\u958B\u767A\u30C8\u30FC\u30AF)").button("\u{1F3E2} Misskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u306E\u5834\u6240\u3092\u805E\u304F").button("\u307E\u305F\u306D");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0)
      return;
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
      const dim = player.dimension;
      if (!lastMisskeyHQLocation || lastMisskeyHQLocation.dimensionId !== dim.id) {
        const pLoc = player.location;
        const targetX = Math.floor(pLoc.x + 600 + Math.floor(Math.random() * 200));
        const targetZ = Math.floor(pLoc.z + 600 + Math.floor(Math.random() * 200));
        let groundY = 64;
        try {
          for (let y = 120; y >= 60; y--) {
            const b = dim.getBlock({ x: targetX, y, z: targetZ });
            if (b && !b.isAir && !b.isLiquid) {
              groundY = y + 1;
              break;
            }
          }
        } catch (e) {
        }
        generateMisskeyHQ(dim, { x: targetX, y: groundY, z: targetZ });
      }
      const hq = lastMisskeyHQLocation;
      const approxX = Math.round(hq.x / 50) * 50;
      const approxZ = Math.round(hq.z / 50) * 50;
      const playerId = player.id;
      if (!syuiloHintGivenPlayers.has(playerId)) {
        syuiloHintGivenPlayers.add(playerId);
        player.sendMessage("\xA7b\u{1F3E2} \u3057\u3085\u3044\u308D: \u300CMisskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u3060\u306D\uFF01\n\u98A8\u306E\u5642\u306B\u3088\u308B\u3068\u2026\u3053\u3053\u304B\u3089\u3010\u5317\u6771\u3011\u306E\u65B9\u89D2\u3001\u304A\u304A\u3088\u305D \xA7eX: " + approxX + " \u4ED8\u8FD1, Z: " + approxZ + " \u4ED8\u8FD1\xA7b \u306E\u5E73\u539F\u306B\u305D\u3073\u3048\u7ACB\u3063\u3066\u3044\u308B\u3089\u3057\u3044\u3088\uFF01\xA7r");
        player.sendMessage("\xA7d\u2728 [\u63A2\u7D22\u30AF\u30A8\u30B9\u30C8] \u4E16\u754C\u306B\u6570\u30AB\u6240\u3057\u304B\u306A\u3044\u8CB4\u91CD\u306A\u672C\u793E\u30D3\u30EB\u3067\u3059\u3002\u81EA\u529B\u3067\u63A2\u691C\u3057\u3066\u76EE\u6307\u3057\u3066\u307F\u3088\u3046\uFF01\xA7r");
        player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 2, z: player.location.z });
      } else {
        player.sendMessage("\xA7b\u{1F3E2} \u3057\u3085\u3044\u308D: \u300C\u958B\u767A\u6240\u306E\u5834\u6240\u306E\u30D2\u30F3\u30C8\u306F\u3055\u3063\u304D\u6559\u3048\u305F\u3088\uFF01 \u304A\u304A\u3088\u305D \xA7eX: " + approxX + " \u4ED8\u8FD1, Z: " + approxZ + " \u4ED8\u8FD1\xA7b \u306E\u3042\u305F\u308A\u3092\u63A2\u3057\u3066\u307F\u3066\u306D\u3002\u7121\u4E8B\u306B\u305F\u3069\u308A\u7740\u3051\u308B\u3068\u3044\u3044\u306A\uFF01\u300D\xA7r");
      }
    }
  });
}
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  if (!deadEntity)
    return;
  const dimension = deadEntity.dimension;
  const location = deadEntity.location;
  const typeId = deadEntity.typeId;
  if (typeId === "mi:blebcat") {
    if (Math.random() < 0.4)
      dimension.spawnItem(new ItemStack("mi:ecology_server", 1), location);
    if (Math.random() < 0.2)
      dimension.spawnItem(new ItemStack("mi:sanjuu", 1), location);
    return;
  }
  if (typeId === "mi:m_tutinoko") {
    const amount = Math.floor(Math.random() * 2) + 1;
    dimension.spawnItem(new ItemStack("mi:anko", amount), location);
    return;
  }
  let dropItemId = null;
  let chance = 0.15;
  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk")
    dropItemId = "mi:blob_aichi";
  else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray")
    dropItemId = "mi:machida";
  else if (typeId === "minecraft:creeper")
    dropItemId = "mi:silenthill";
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
          if (entity.isValid())
            entity.remove();
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
  if (target instanceof Player && player.isSneaking) {
    event.cancel = true;
    if (!canOpenUI(player))
      return;
    system.run(() => {
      openSendDMUI(player, void 0, target.name);
    });
    return;
  }
  if (itemStack && itemStack.typeId === "mi:reaction_wand") {
    event.cancel = true;
    if (!canOpenUI(player))
      return;
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
              if (equippable)
                equippable.setEquipment("Mainhand", void 0);
            }
          }
          player.sendMessage(`\xA7a\u{1F3A8} [Mi_Addon] \u9577\u3044\u5909\u306A\u8ECA\u3092\u300C${dye.name}\u300D\u306B\u518D\u5857\u88C5\u3057\u307E\u3057\u305F\uFF01\xA7r`);
        });
        return;
      }
    }
  }
  if (!itemStack)
    return;
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
          if (equippable)
            equippable.setEquipment("Mainhand", void 0);
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
          if (equippable)
            equippable.setEquipment("Mainhand", void 0);
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
          if (equippable)
            equippable.setEquipment("Mainhand", void 0);
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
    if (now2 - lastBounce < 350)
      continue;
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
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  if (itemStack.typeId === "mi:yahata_blueprint") {
    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const targetLoc = {
      x: Math.floor(pLoc.x + viewDir.x * 8),
      y: Math.floor(pLoc.y),
      z: Math.floor(pLoc.z + viewDir.z * 8)
    };
    player.sendMessage("\xA7e\u{1F3ED} [\u5B98\u55B6\u516B\u5E61\u88FD\u9244\u6240] \u8A2D\u8A08\u56F3\u3092\u5C55\u958B\u3057\u3001\u6B74\u53F2\u3042\u308B\u88FD\u9244\u6240\u5EC3\u589F\u3092\u5EFA\u8A2D\u4E2D...\uFF01\xA7r");
    dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
    system.runTimeout(() => {
      generateYahataSteelworks(dim, targetLoc);
      player.sendMessage("\xA7a\u2728 \u5B98\u55B6\u516B\u5E61\u88FD\u9244\u6240\u306E\u907A\u69CB\uFF08\u5EC3\u589F\u30C0\u30F3\u30B8\u30E7\u30F3\uFF09\u304C\u76EE\u306E\u524D\u306B\u73FE\u308C\u307E\u3057\u305F\uFF01\xA7r");
      dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 4, z: targetLoc.z });
    }, 5);
  }
  if (itemStack.typeId === "mi:hq_blueprint") {
    const dim = player.dimension;
    const pLoc = player.location;
    const viewDir = player.getViewDirection();
    const targetLoc = {
      x: Math.floor(pLoc.x + viewDir.x * 12),
      y: Math.floor(pLoc.y),
      z: Math.floor(pLoc.z + viewDir.z * 12)
    };
    player.sendMessage("\xA7b\u{1F3E2} [Misskey\u958B\u767A\u6240] \u8A2D\u8A08\u56F3\u3092\u5C55\u958B\u3057\u3001\u672C\u793E\u30D3\u30EB\uFF081F\u301C4F\u30FB\u5C4B\u4E0A\uFF09\u3092\u5EFA\u7BC9\u4E2D...\uFF01\xA7r");
    dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
    system.runTimeout(() => {
      generateMisskeyHQ(dim, targetLoc);
      player.sendMessage("\xA7a\u2728 Misskey\u958B\u767A\u6240\uFF08\u672C\u793E\u30D3\u30EB\uFF09\u304C\u5802\u3005\u5B8C\u6210\u3057\u307E\u3057\u305F\uFF01\xA7r");
      player.sendMessage("\xA77\u{1F4A1} 1F: \u30ED\u30D3\u30FC | 2F: \u958B\u767A\u5BA4 | 3F: \u30B5\u30FC\u30D0\u30FC\u30EB\u30FC\u30E0 & \u4F1A\u8B70\u5BA4 | 4F: \u793E\u9577\u5BA4 (\u30DC\u30B9\u90E8\u5C4B) | \u5C4B\u4E0A: \u9023\u5408\u30A2\u30F3\u30C6\u30CA\xA7r");
      dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 5, z: targetLoc.z });
    }, 5);
  }
});
var worldGenTick = 0;
system.runInterval(() => {
  worldGenTick++;
  if (worldGenTick % 200 !== 0)
    return;
  const overworld = world.getDimension("overworld");
  const players = overworld.getPlayers();
  for (const p of players) {
    const pLoc = p.location;
    const chunkX = Math.floor(pLoc.x / 64) * 64;
    const chunkZ = Math.floor(pLoc.z / 64) * 64;
    let alreadyExists = false;
    for (const loc of generatedSteelworksLocations) {
      const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
      if (distSq < 16e4) {
        alreadyExists = true;
        break;
      }
    }
    if (!alreadyExists && Math.random() < 0.15) {
      const genX = chunkX + Math.floor(Math.random() * 32) + 16;
      const genZ = chunkZ + Math.floor(Math.random() * 32) + 16;
      try {
        let surfaceY = Math.floor(pLoc.y);
        for (let y = 120; y >= 60; y--) {
          const b = overworld.getBlock({ x: genX, y, z: genZ });
          if (b && !b.isAir && !b.isLiquid) {
            surfaceY = y + 1;
            break;
          }
        }
        generatedSteelworksLocations.push({ x: chunkX, z: chunkZ });
        generateYahataSteelworks(overworld, { x: genX, y: surfaceY, z: genZ });
        console.warn(`[Mi_Addon] Generated Yahata Steelworks at (${genX}, ${surfaceY}, ${genZ})`);
      } catch (e) {
      }
    }
  }
}, 20);
var murakamiLastSkillTimeMap = /* @__PURE__ */ new Map();
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  let murakamiBosses = [];
  try {
    murakamiBosses = overworld.getEntities({ type: "mi:murakami_boss" });
  } catch (e) {
  }
  const now = Date.now();
  for (const boss of murakamiBosses) {
    if (!boss.isValid())
      continue;
    const bLoc = boss.location;
    const nearbyPlayers = overworld.getPlayers().filter((p) => {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.y - bLoc.y, 2) + Math.pow(pLoc.z - bLoc.z, 2);
      return distSq <= 576;
    });
    if (nearbyPlayers.length === 0)
      continue;
    const lastSkill = murakamiLastSkillTimeMap.get(boss.id) || 0;
    if (now - lastSkill >= 18e3) {
      murakamiLastSkillTimeMap.set(boss.id, now);
      for (const p of nearbyPlayers) {
        p.sendMessage("\xA7c\u26A1 [\u6751\u4E0A\u3055\u3093] \u300C\u767D\u9B3C\u591C\u884C\uFF08\u306F\u3063\u304D\u3084\u3053\u3046\uFF09\u306E\u59CB\u307E\u308A\u3060\u2026\uFF01 \u6211\u304C\u8907\u88FD\u4F53\u3069\u3082\u3088\u3001\u4FB5\u5165\u8005\u3092\u55B0\u3089\u3044\u5C3D\u304F\u305B\uFF01\uFF01\u300D\xA7r");
      }
      overworld.spawnParticle("minecraft:mob_portal", { x: bLoc.x, y: bLoc.y + 1.5, z: bLoc.z });
      overworld.spawnParticle("minecraft:large_explosion", { x: bLoc.x, y: bLoc.y + 2, z: bLoc.z });
      overworld.spawnParticle("minecraft:sonic_explosion", { x: bLoc.x, y: bLoc.y + 1, z: bLoc.z });
      for (const p of nearbyPlayers) {
        const pLoc = p.location;
        const dist = Math.sqrt(Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.z - bLoc.z, 2));
        if (dist <= 10) {
          const kx = (pLoc.x - bLoc.x) / (dist || 1);
          const kz = (pLoc.z - bLoc.z) / (dist || 1);
          p.applyKnockback(kx, kz, 1.6, 0.6);
          p.applyDamage(3);
        }
      }
      boss.addEffect("strength", 200, { amplifier: 0 });
      boss.addEffect("resistance", 160, { amplifier: 1 });
      boss.addEffect("speed", 300, { amplifier: 1 });
      const summonCount = 6 + nearbyPlayers.length * 3;
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
console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
