// src/main.ts
import { world, system, ItemStack, EntityComponentTypes, Player } from "@minecraft/server";
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
var syuiloLastTalkTimeMap = /* @__PURE__ */ new Map();
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
    const now = Date.now();
    const lastTime = syuiloLastTalkTimeMap.get(player.id) || 0;
    if (now - lastTime < 500)
      return;
    syuiloLastTalkTimeMap.set(player.id, now);
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
    system.run(() => {
      player.sendMessage(quote);
      const loc = target.location;
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.6, z: loc.z });
    });
    return;
  }
});
var globalNotes = [];
var instanceServerMap = /* @__PURE__ */ new Map();
var reactionOptions = [
  { label: "\u306B\u3083\u3093\u3077\u3063\u3077\u30FC", glyph: "\uE101" },
  { label: "\u3092\u306D\u3053", glyph: "\uE102" },
  { label: "\u611B\u77E5", glyph: "\uE103" },
  { label: "\u30E2\u30C1\u30E7\u30C1\u30E7", glyph: "\uE104" },
  { label: "\u30AA\u30BF\u30AF\u304F\u3093", glyph: "\uE105" },
  { label: "blebcat", glyph: "\uE107" },
  { label: "\u9577\u3044\u5909\u306A\u8ECA", glyph: "\uE108" },
  { label: "\u4E0E\u8B1D\u91CE\u6676\u5B50", glyph: "\uE109" },
  { label: "\u30C4\u30C1\u30CE\u30B3", glyph: "\uE10A" },
  { label: "\u30A2\u30EB\u30DF\u30DB\u30A4\u30EB", glyph: "\uE10B" },
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
function openNoteBoardUI(player, blockLoc) {
  const form = new ActionFormData().title("\u{1F4CB} Misskey \u30CE\u30FC\u30C8\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3").body("Misskey\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u63B2\u793A\u677F\u3067\u3059\u3002\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u305F\u308A\u3001\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u9001\u308A\u307E\u3057\u3087\u3046\uFF01").button("\u{1F4DD} \u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3059\u308B").button("\u{1F4DC} \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u898B\u308B / \u30EA\u30A2\u30AF\u30B7\u30E7\u30F3").button("\u9589\u3058\u308B");
  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === void 0)
      return;
    if (response.selection === 0) {
      const modal = new ModalFormData().title("\u{1F4DD} \u65B0\u898F\u30CE\u30FC\u30C8\u306E\u6295\u7A3F").textField("\u3044\u307E\u306A\u306B\u3057\u3066\u308B\uFF1F (\u672C\u6587)", "\u4F8B: \u4ECA\u65E5\u306F\u30D6\u30E9\u30F3\u30C1\u30DE\u30A4\u30CB\u30F3\u30B0\u3067\u30C0\u30A4\u30E4\u898B\u3064\u3051\u305F\uFF01");
      showFormSafe(player, modal, (res) => {
        if (res.canceled || !res.formValues)
          return;
        const text = String(res.formValues[0]).trim();
        if (text) {
          const newNote = {
            id: `note_${Date.now()}`,
            author: player.name,
            instance: "local.misskey",
            content: text,
            timestamp: Date.now(),
            reactions: {}
          };
          globalNotes.unshift(newNote);
          if (globalNotes.length > 50)
            globalNotes.pop();
          player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
          world.sendMessage(`\xA7a\u{1F4E2} [${player.name}@local.misskey] \u304C\u30CE\u30FC\u30C8\u3092\u6295\u7A3F\u3057\u307E\u3057\u305F: \u300C${text}\u300D\xA7r`);
        }
      });
    } else if (response.selection === 1) {
      openTimelineListUI(player, blockLoc);
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
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
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
