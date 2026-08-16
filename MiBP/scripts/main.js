// src/main.ts
import { world, system, EntityComponentTypes } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");
var globalNotes = [];
var instanceServerMap = /* @__PURE__ */ new Map();
function showFormSafe(player, form, onResponse) {
  let attempts = 0;
  const tryShow = () => {
    form.show(player).then((response) => {
      if (response && response.cancelationReason === "userBusy" && attempts < 10) {
        attempts++;
        system.runTimeout(tryShow, 2);
        return;
      }
      onResponse(response);
    }).catch(() => {
    });
  };
  system.runTimeout(tryShow, 1);
}
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
    const backBtn = buttonIndex++;
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
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;
  if (block.typeId === "mi:instance_server") {
    const loc = block.location;
    system.run(() => {
      openInstanceServerUI(player, loc);
    });
    return;
  }
  if (block.typeId === "mi:note_board") {
    const loc = block.location;
    system.run(() => {
      openNoteBoardUI(player, loc);
    });
    return;
  }
});
