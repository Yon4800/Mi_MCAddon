import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent, EntityEquippableComponent, Player, BlockPermutation } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");

// ----------------------------------------------------
// UI Multi-Stack Prevention & Safe Form Display System
// ----------------------------------------------------
const playerUIOpenLock = new Map<string, number>(); // playerId -> last open timestamp (ms)

function canOpenUI(player: Player): boolean {
  const now = Date.now();
  const lastTime = playerUIOpenLock.get(player.id) || 0;
  if (now - lastTime < 600) return false; // Block duplicate triggers within 600ms
  playerUIOpenLock.set(player.id, now);
  return true;
}

function showFormSafe(player: Player, form: any, onResponse: (response: any) => void) {
  system.runTimeout(() => {
    form.show(player as any).then((response: any) => {
      if (response && response.cancelationReason === "userBusy") {
        return; // Don't loop-stack; user will just click once clearly
      }
      onResponse(response);
    }).catch(() => {});
  }, 1);
}

// ----------------------------------------------------
// Global State Maps
// ----------------------------------------------------
// ----------------------------------------------------
// Helper: Decrement 1 Item from Player Mainhand (Survival Mode)
// ----------------------------------------------------
function decrementPlayerHeldItem(player: Player): boolean {
  try {
    if (player.gameMode === "creative") return true;

    const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    if (!equippable) return false;
    const handItem = equippable.getEquipment("Mainhand" as any);
    if (!handItem) return false;

    if (handItem.amount > 1) {
      handItem.amount -= 1;
      equippable.setEquipment("Mainhand" as any, handItem);
    } else {
      equippable.setEquipment("Mainhand" as any, undefined);
    }
    return true;
  } catch (e) {
    return false;
  }
}

const zabutonPlaceCooldownMap = new Map<string, number>(); // playerId -> timestamp
const blueprintCooldownMap = new Map<string, number>(); // playerId -> timestamp
const yosanoLoveMap = new Map<string, number>();
const mochochoEatMap = new Map<string, { count: number, lastEatTime: number }>();
const licensedPlayers = new Set<string>();
const accidentCarsMap = new Map<string, number>();
const carPrevPosMap = new Map<string, { x: number, y: number, z: number }>();
const momoLuckCooldownMap = new Map<string, number>();
const syuiloQuoteIndexMap = new Map<string, number>();
const syuiloLastTalkTimeMap = new Map<string, number>();

// ----------------------------------------------------
// 0.0. Achievements (偉業) System
// ----------------------------------------------------
const ALL_IGYO_ITEMS = [
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

const IGYO_NAMES: Record<string, string> = {
  "aisatu": "挨拶の偉業",
  "suimin": "睡眠の偉業",
  "suibunhokyu": "水分補給の偉業",
  "asakatsu": "朝活の偉業",
  "chokin": "貯金の偉業",
  "dokusho": "読書の偉業",
  "josetsu": "除雪の偉業",
  "kaimono": "買い物の偉業",
  "seichi": "整地の偉業",
  "upgrade": "アップグレードの偉業",
  "shokuji": "食事の偉業",
  "ensei": "遠征の偉業"
};

const IGYO_DESCRIPTIONS: Record<string, string> = {
  "aisatu": "チャットで挨拶する",
  "suimin": "ベッドで眠る",
  "suibunhokyu": "水やポーションを飲む",
  "asakatsu": "朝6時〜9時に30分プレイ",
  "chokin": "金インゴット等を所持",
  "dokusho": "本を使用する",
  "josetsu": "雪を500個掘る",
  "kaimono": "村人と取引する",
  "seichi": "土や草を1000個掘る",
  "upgrade": "鍛冶台でネザライトに強化",
  "shokuji": "食べ物を500個食べる",
  "ensei": "ジ・エンド到達またはエンドラ討伐"
};

const playerAsakatsuPlaySecondsMap = new Map<string, number>(); // playerId -> total seconds in morning
const playerSnowBreakCountMap = new Map<string, number>(); // playerId -> snow blocks broken
const playerSeichiBreakCountMap = new Map<string, number>(); // playerId -> ground blocks broken
const playerFoodEatCountMap = new Map<string, number>(); // playerId -> food eaten count
const playerSmithingTableOpenMap = new Map<string, number>(); // playerId -> timestamp when opened smithing table

function playerHasItem(player: Player, itemTypeId: string): boolean {
  try {
    const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
    if (!inv) return false;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === itemTypeId) return true;
    }
  } catch (e) {}
  return false;
}

function hasPlayerAchieved(player: Player, igyoKey: string): boolean {
  try {
    const prop = player.getDynamicProperty(`igyo_${igyoKey}`);
    if (prop === true) return true;
  } catch (e) {}
  return player.hasTag(`igyo_${igyoKey}`);
}

function setPlayerAchieved(player: Player, igyoKey: string) {
  try {
    player.setDynamicProperty(`igyo_${igyoKey}`, true);
  } catch (e) {}
  player.addTag(`igyo_${igyoKey}`);
}

function grantAchievement(player: Player, igyoKey: string) {
  // すでに達成済みの場合は一切再付与しない（二度と復活しない）
  if (hasPlayerAchieved(player, igyoKey)) return;

  setPlayerAchieved(player, igyoKey);

  const itemTypeId = `mi:${igyoKey}_ha_igyo`;
  const name = IGYO_NAMES[igyoKey] || igyoKey;

  system.run(() => {
    try {
      const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
      if (!inv) return;

      const item = new ItemStack(itemTypeId, 1);
      // 達成者タグと説明を Lore に刻印！
      item.setLore([
        `§6達成者: §f${player.name}§r`,
        `§7達成条件: ${IGYO_DESCRIPTIONS[igyoKey] || ""}§r`
      ]);

      const hasBaseIgyo = hasPlayerAchieved(player, "base_igyo");
      inv.addItem(item);

      if (!hasBaseIgyo) {
        setPlayerAchieved(player, "base_igyo");
        const baseItem = new ItemStack("mi:igyo", 1);
        baseItem.setLore([
          `§6所有者: §f${player.name}§r`,
          `§e11種類の偉業を集めて右クリックすると§r`,
          `§e「偉業のツール」を錬成できます！§r`
        ]);
        inv.addItem(baseItem);
        player.sendMessage(`§6🏆 [偉業達成] 初めての偉業を達成！「偉業 (mi:igyo)」を獲得しました！§r`);
        player.sendMessage(`§e💡 [ヒント] 11種類すべての偉業を集めて「偉業」を右クリックすると、「偉業のツール」を錬成できます！§r`);
      }

      player.sendMessage(`§6🏆 [偉業達成] 「${name}」を獲得しました！§r`);

      // 偉業達成報奨金 5,000円を口座に振込！
      try {
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + 5000);
        player.sendMessage(`§a💵 [偉業達成祝儀] 口座に達成報奨金 §e5,000 円§a が振り込まれました！（現在残高: ${(curBal + 5000).toLocaleString()}円）§r`);
      } catch (e) { }

      const loc = player.location;
      player.dimension.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1.5, z: loc.z });
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
    } catch (e) {
      console.warn("[Mi_Addon] Error granting achievement: " + e);
    }
  });
}

function resetAchievement(player: Player, igyoKey: string) {
  try {
    player.setDynamicProperty(`igyo_${igyoKey}`, false);
  } catch (e) {}
  player.removeTag(`igyo_${igyoKey}`);
  if (igyoKey === "asakatsu") playerAsakatsuPlaySecondsMap.delete(player.id);
  if (igyoKey === "josetsu") playerSnowBreakCountMap.delete(player.id);
  if (igyoKey === "seichi") playerSeichiBreakCountMap.delete(player.id);
  if (igyoKey === "shokuji") playerFoodEatCountMap.delete(player.id);
}

function openAchievementRetryUI(player: Player) {
  const form = new ActionFormData()
    .title("🔄 偉業の再チャレンジ (リセット)")
    .body("紛失・ロストした偉業を選択してフラグをリセットし、もう一度達成条件にチャレンジできます。\n（※インベントリに所持中の偉業はリセット不要です）");

  const allKeys = Object.keys(IGYO_NAMES);

  for (const key of allKeys) {
    const itemTypeId = `mi:${key}_ha_igyo`;
    const isHeld = playerHasItem(player, itemTypeId);
    const isAchieved = hasPlayerAchieved(player, key);
    const name = IGYO_NAMES[key];

    if (isHeld) {
      form.button(`✅ ${name}\n[所持中 - リセット不要]`);
    } else if (isAchieved) {
      form.button(`🔄 ${name}\n[リセットして再挑戦！]`);
    } else {
      form.button(`⏳ ${name}\n[未達成 - チャレンジ可能]`);
    }
  }

  form.button("🔙 閉じる");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;
    const selectedIdx = res.selection;

    if (selectedIdx < allKeys.length) {
      const key = allKeys[selectedIdx];
      const itemTypeId = `mi:${key}_ha_igyo`;
      const isHeld = playerHasItem(player, itemTypeId);
      const isAchieved = hasPlayerAchieved(player, key);
      const name = IGYO_NAMES[key];
      const desc = IGYO_DESCRIPTIONS[key] || "";

      if (isHeld) {
        player.sendMessage(`§e⚠️ 「${name}」はすでにインベントリ内に所持しています。§r`);
        openAchievementRetryUI(player);
      } else if (isAchieved) {
        resetAchievement(player, key);
        player.sendMessage(`§a🔄 [偉業リセット] 「${name}」の実績フラグをリセットしました！§r`);
        player.sendMessage(`§e💡 再達成の条件: ${desc}§r`);
        const pLoc = player.location;
        player.dimension.spawnParticle("minecraft:totem_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
      } else {
        player.sendMessage(`§7「${name}」はまだ達成していません。(達成条件: ${desc})§r`);
        openAchievementRetryUI(player);
      }
    }
  });
}

// ----------------------------------------------------
// 0. Misskey Emoji Chat System
// ----------------------------------------------------
const emojiMap: Record<string, string> = {
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
  ":heart:": "❤️",
  ":good:": "👍",
  ":tada:": "🎉",
  ":bomb:": "💥"
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

    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー|おは|こん|おやすみ)/i.test(event.message.trim())) {
      grantAchievement(sender, "aisatu");
    }
  });
}

// ----------------------------------------------------
// 0.5. Momo & Syuilo NPCs
// ----------------------------------------------------
const MOMO_LUCK_COOLDOWN_MS = 5 * 60 * 1000;

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;
  if (!target) return;

  // Zabuton Stacking Interaction (Right-click existing zabuton with another zabuton item)
  if (target.typeId.startsWith("mi:zabuton_") && itemStack && itemStack.typeId.startsWith("mi:zabuton_")) {
    event.cancel = true; // Prevent mounting when holding a zabuton item
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
        player.sendMessage("§a🛋️ [Mi_Addon] 座布団を上に重ねました！§r");
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
        player.sendMessage("§dモモ: 「なでなで、ありがとうなの♪」§r");
        player.dimension.spawnParticle("minecraft:heart_particle", { x: target.location.x, y: target.location.y + 1.2, z: target.location.z });
        return;
      }

      momoLuckCooldownMap.set(player.id, now);
      try {
        player.addEffect("village_hero", 6000, { amplifier: 0 });
        player.addEffect("regeneration", 200, { amplifier: 0 });
      } catch (e) { }

      player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1, z: player.location.z });
      player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      player.sendMessage("§d🍀 [Mi_Addon] モモが幸運のおまじないをかけてくれた！(村の英雄＆再生効果)§r");
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

// ----------------------------------------------------
// 0.6. Fediverse, Notes & Emoji Reactions System (ActivityPub)
// ----------------------------------------------------
interface NoteItem {
  id: string;
  author: string;
  instance: string;
  content: string;
  timestamp: number;
  reactions: Record<string, string>; // playerName -> emojiGlyph
}

interface InstanceData {
  name: string;
  owner: string;
  federatedWith: string[];
}

const globalNotes: NoteItem[] = [];
const instanceServerMap = new Map<string, InstanceData>();

const reactionOptions = [
  { label: "にゃんぷっぷー", glyph: "\uE101" },
  { label: "をねこ (リラックス)", glyph: "\uE102" },
  { label: "愛知", glyph: "\uE103" },
  { label: "モチョチョ", glyph: "\uE104" },
  { label: "オタクくん", glyph: "\uE105" },
  { label: "オタクくん泣き", glyph: "\uE106" },
  { label: "blebcat", glyph: "\uE107" },
  { label: "長い変な車", glyph: "\uE108" },
  { label: "与謝野晶子", glyph: "\uE109" },
  { label: "ツチノコ", glyph: "\uE10A" },
  { label: "アルミホイル", glyph: "\uE10B" },
  { label: "をねこ (泣き)", glyph: "\uE10C" },
  { label: "をねこ (お疲れ)", glyph: "\uE10D" },
  { label: "ハート (❤️)", glyph: "❤️" },
  { label: "いいね (👍)", glyph: "👍" },
  { label: "祝 (🎉)", glyph: "🎉" },
  { label: "爆発 (💥)", glyph: "💥" }
];

function openInstanceServerUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
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

  const form = new ActionFormData()
    .title(`🏛️ インスタンス: @${inst.name}`)
    .body(`管理者: ${inst.owner}\n連合先サーバー数: ${inst.federatedWith.length} 拠点\n電波バフ: ${inst.federatedWith.length > 0 ? "⚡ 稼働中 (移動速度 / 採掘速度)" : "💤 未接続"}`)
    .button("📝 インスタンス名を変更する")
    .button("🌐 連合（Federation）管理")
    .button("📊 Fediverse 統計を見る")
    .button("閉じる");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      const modal = new ModalFormData()
        .title("🏛️ インスタンス名の設定")
        .textField("インスタンスのドメイン名を入力してください", "例: my-home.misskey", inst!.name);

      showFormSafe(player, modal, (res) => {
        if (res.canceled || !res.formValues) return;
        const newName = String(res.formValues[0]).trim();
        if (newName) {
          inst!.name = newName;
          player.sendMessage(`§a🏛️ [Fediverse] インスタンス名を「@${newName}」に設定しました！§r`);
        }
      });
    } else if (response.selection === 1) {
      const fedForm = new ActionFormData()
        .title("🌐 連合（Federation）管理")
        .body(`現在の連合先:\n${inst!.federatedWith.map(s => `・ @${s}`).join("\n")}`)
        .button("➕ 新しいインスタンスと連合を結ぶ")
        .button("戻る");

      showFormSafe(player, fedForm, (fRes) => {
        if (fRes.canceled || fRes.selection === undefined) return;
        if (fRes.selection === 0) {
          const connectModal = new ModalFormData()
            .title("➕ 連合先インスタンスの追加")
            .textField("接続先ドメイン名を入力", "例: friend-base.misskey");

          showFormSafe(player, connectModal, (cRes) => {
            if (cRes.canceled || !cRes.formValues) return;
            const target = String(cRes.formValues[0]).trim();
            if (target && !inst!.federatedWith.includes(target)) {
              inst!.federatedWith.push(target);
              player.dimension.spawnParticle("minecraft:totem_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
              player.sendMessage(`§a🌐 [ActivityPub] @${target} との連合接続（リレー同期）が完了しました！電波バフが強化されました！§r`);
            }
          });
        }
      });
    } else if (response.selection === 2) {
      player.sendMessage(`§b📊 [Fediverse統計] インスタンス: @${inst!.name} | 登録ノート総数: ${globalNotes.length} 件 | 連合数: ${inst!.federatedWith.length} 拠点§r`);
    }
  });
}

// Open Note Board UI with Emoji Deck support
// ----------------------------------------------------
// Customizable Personal Emoji Deck System
// ----------------------------------------------------
const playerEmojiDeckMap = new Map<string, string[]>(); // playerId -> array of emojiGlyphs

function getPlayerEmojiDeck(player: Player): string[] {
  let deck = playerEmojiDeckMap.get(player.id);
  if (!deck || deck.length === 0) {
    // Default 4 emoji deck
    deck = ["\uE101", "\uE102", "\uE104", "\uE10B"];
    playerEmojiDeckMap.set(player.id, deck);
  }
  return deck;
}

// Emoji Deck Settings UI (Add / Remove / Customize)
function openEmojiDeckSettingsUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const currentDeck = getPlayerEmojiDeck(player);

  const deckLabels = currentDeck.map((glyph, i) => {
    const opt = reactionOptions.find(o => o.glyph === glyph);
    return `スロット {${i + 1}}: ${glyph} ${opt ? opt.label : ""}`;
  });

  const form = new ActionFormData()
    .title("⚙️ 絵文字デッキのカスタマイズ")
    .body(`現在の絵文字デッキ (${currentDeck.length} 個):\n${deckLabels.join("\n") || "なし"}\n\nデッキを増やしたり減らしたり自由にカスタマイズできます:`)
    .button("➕ デッキに絵文字を追加する")
    .button("➖ デッキから絵文字を削除する")
    .button("🔄 デフォルト設定に戻す")
    .button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      // Add emoji to deck
      const pickForm = new ActionFormData()
        .title("➕ デッキに追加する絵文字を選択");

      for (const opt of reactionOptions) {
        pickForm.button(`${opt.glyph} ${opt.label}`);
      }

      showFormSafe(player, pickForm, (pRes) => {
        if (pRes.canceled || pRes.selection === undefined) {
          openEmojiDeckSettingsUI(player, blockLoc);
          return;
        }
        const chosen = reactionOptions[pRes.selection];
        currentDeck.push(chosen.glyph);
        player.sendMessage(`§a➕ 絵文字デッキに ${chosen.glyph} (${chosen.label}) を追加しました！（現在 ${currentDeck.length} 個）§r`);
        openEmojiDeckSettingsUI(player, blockLoc);
      });
    } else if (res.selection === 1) {
      // Remove emoji from deck
      if (currentDeck.length <= 1) {
        player.sendMessage("§c⚠️ 絵文字デッキは最低1個必要です。§r");
        openEmojiDeckSettingsUI(player, blockLoc);
        return;
      }

      const removeForm = new ActionFormData()
        .title("➖ 削除する絵文字を選択")
        .body("デッキから外したい絵文字を選んでください:");

      for (let i = 0; i < currentDeck.length; i++) {
        const glyph = currentDeck[i];
        const opt = reactionOptions.find(o => o.glyph === glyph);
        removeForm.button(`スロット {${i + 1}}: ${glyph} ${opt ? opt.label : ""}`);
      }

      showFormSafe(player, removeForm, (rRes) => {
        if (rRes.canceled || rRes.selection === undefined) {
          openEmojiDeckSettingsUI(player, blockLoc);
          return;
        }
        const removed = currentDeck.splice(rRes.selection, 1)[0];
        player.sendMessage(`§e➖ 絵文字デッキから ${removed} を削除しました。（残り ${currentDeck.length} 個）§r`);
        openEmojiDeckSettingsUI(player, blockLoc);
      });
    } else if (res.selection === 2) {
      playerEmojiDeckMap.set(player.id, ["\uE101", "\uE102", "\uE104", "\uE10B"]);
      player.sendMessage("§b🔄 絵文字デッキを初期設定（4個）に戻しました。§r");
      openEmojiDeckSettingsUI(player, blockLoc);
    } else {
      openNoteBoardUI(player, blockLoc);
    }
  });
}

// All-in-One Misskey Note Post Modal dynamically adapting to Player's Emoji Deck size
function openAllInOneNoteModal(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const currentDeck = getPlayerEmojiDeck(player);

  const emojiDeckList = [
    "(なし)",
    ...reactionOptions.map(o => `${o.glyph} ${o.label}`)
  ];

  const modal = new ModalFormData()
    .title("📝 Misskey ノート投稿")
    .textField(
      `本文 (文章中の好きな場所に {1}〜{${currentDeck.length}} と書くと絵文字が入ります):`,
      "例: 今日は {1} と一緒に {2} を食べたよ！",
      ""
    );

  // Dynamically add dropdown for each slot in player's customized emoji deck
  for (let i = 0; i < currentDeck.length; i++) {
    const defaultGlyph = currentDeck[i];
    const defaultIdx = reactionOptions.findIndex(o => o.glyph === defaultGlyph) + 1;
    modal.dropdown(`🎨 絵文字デッキ {${i + 1}}:`, emojiDeckList, defaultIdx > 0 ? defaultIdx : 0);
  }

  showFormSafe(player, modal, (res) => {
    if (res.canceled || !res.formValues) return;

    let text = String(res.formValues[0]).trim();
    const selectedEmojis: string[] = [];

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

    // If no placeholders used, append selected emojis to the end
    if (!hasPlaceholder && selectedEmojis.length > 0) {
      text = text ? `${text} ${selectedEmojis.join(" ")}` : selectedEmojis.join(" ");
    }

    // Auto-replace any shortcodes (:blobcat:, :cat:, :1:, :foil:, :mochocho: etc.)
    for (const [key, glyph] of Object.entries(emojiMap)) {
      if (text.includes(key)) {
        text = text.split(key).join(glyph);
      }
    }

    if (!text.trim()) {
      player.sendMessage("§c⚠️ 本文または絵文字を入力してください。§r");
      return;
    }

    const newNote: NoteItem = {
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
    world.sendMessage(`§a📢 [${player.name}@local.misskey] がノートを投稿しました: 「${text.trim()}」§r`);
  });
}

// Updated openNoteBoardUI with Emoji Deck Settings button
function openNoteBoardUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const unreadCount = directMessages.filter(m => m.recipient === player.name && !m.read).length;
  const dmBadge = unreadCount > 0 ? ` (${unreadCount}件未読)` : "";
  const deckCount = getPlayerEmojiDeck(player).length;

  const form = new ActionFormData()
    .title("📋 Misskey ノートタイムライン & ポータル")
    .body("Misskeyのタイムライン掲示板です。ノートを投稿したり、DMや金融取引（株・FX・ATM）を利用できます！")
    .button("📝 ノートを投稿する")
    .button(`⚙️ 絵文字デッキをカスタマイズ (${deckCount}スロット)`)
    .button("📜 タイムラインを見る / リアクション")
    .button(`✉️ ダイレクトメッセージ (DM)${dmBadge}`)
    .button("💹 Misskey証券 & FX取引所 / 🏦 ATM")
    .button("閉じる");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

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


function getReactionSummary(note: NoteItem): string {
  const counts: Record<string, number> = {};
  for (const emoji of Object.values(note.reactions)) {
    counts[emoji] = (counts[emoji] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `[${k}x${v}]`).join(" ");
}

function getReactorsDetail(note: NoteItem): string {
  const grouped: Record<string, string[]> = {};
  for (const [pName, emoji] of Object.entries(note.reactions)) {
    if (!grouped[emoji]) grouped[emoji] = [];
    grouped[emoji].push(pName);
  }
  if (Object.keys(grouped).length === 0) return "まだリアクションはありません";
  return Object.entries(grouped)
    .map(([emoji, users]) => `${emoji} (${users.length}): ${users.join(", ")}`)
    .join("\n");
}

function openTimelineListUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const form = new ActionFormData()
    .title("📜 タイムライン一覧")
    .body(globalNotes.length === 0 ? "投稿されたノートはまだありません。「新規ノートを投稿」からつぶやいてみましょう！" : "ノートを選択して詳細・リアクション・削除ができます:");

  for (const n of globalNotes) {
    const reactSummary = getReactionSummary(n);
    form.button(`${n.author}: ${n.content.substring(0, 18)}...\n${reactSummary || "リアクションなし"}`);
  }
  form.button("🔙 戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;
    if (response.selection >= globalNotes.length) return;

    const note = globalNotes[response.selection];
    openNoteDetailUI(player, note, blockLoc);
  });
}

function openNoteDetailUI(player: Player, note: NoteItem, blockLoc: { x: number, y: number, z: number }) {
  const myReaction = note.reactions[player.name];
  const myReactText = myReaction ? ` (あなたのリアクション: ${myReaction})` : "";
  const reactorsText = getReactorsDetail(note);
  const isAuthorOrOp = note.author === player.name || player.isOp();

  const form = new ActionFormData()
    .title(`📝 ノート詳細: @${note.author}`)
    .body(`「${note.content}」\n\n💖 リアクション一覧:${myReactText}\n${reactorsText}`)
    .button(myReaction ? `🔄 リアクションを変更する (${myReaction})` : "💖 絵文字リアクションする");

  if (myReaction) {
    form.button(`❌ リアクションを取り消す (${myReaction})`);
  }

  if (isAuthorOrOp) {
    form.button("🗑️ このノートを削除する");
  }
  form.button("🔙 タイムラインに戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    let buttonIndex = 0;
    const reactBtn = buttonIndex++;
    const unreactBtn = myReaction ? buttonIndex++ : -1;
    const deleteBtn = isAuthorOrOp ? buttonIndex++ : -1;

    if (response.selection === reactBtn) {
      const pickForm = new ActionFormData()
        .title("🎨 リアクション絵文字を選択")
        .body(myReaction ? `現在のリアクション: ${myReaction}\n別の絵文字を選ぶと変更されます:` : "リアクションしたい絵文字を選んでください:");

      if (myReaction) {
        pickForm.button("❌ リアクションを取り消す（解除）");
      }
      for (const opt of reactionOptions) {
        pickForm.button(`${opt.glyph} ${opt.label}`);
      }

      showFormSafe(player, pickForm, (pRes) => {
        if (pRes.canceled || pRes.selection === undefined) return;
        
        if (myReaction && pRes.selection === 0) {
          delete note.reactions[player.name];
          player.sendMessage("§e❌ リアクションを取り消しました。§r");
          openNoteDetailUI(player, note, blockLoc);
          return;
        }

        const optionIndex = myReaction ? pRes.selection - 1 : pRes.selection;
        const chosen = reactionOptions[optionIndex];
        if (chosen) {
          note.reactions[player.name] = chosen.glyph;
          player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
          player.sendMessage(`§d💖 ${note.author} のノートに ${chosen.glyph} (${chosen.label}) でリアクションしました！§r`);
          openNoteDetailUI(player, note, blockLoc);
        }
      });
    } else if (response.selection === unreactBtn) {
      delete note.reactions[player.name];
      player.sendMessage("§e❌ リアクションを取り消しました。§r");
      openNoteDetailUI(player, note, blockLoc);
    } else if (response.selection === deleteBtn) {
      const idx = globalNotes.findIndex(n => n.id === note.id);
      if (idx !== -1) {
        globalNotes.splice(idx, 1);
        player.sendMessage("§e🗑️ ノートを削除しました。§r");
      }
      openTimelineListUI(player, blockLoc);
    } else {
      openTimelineListUI(player, blockLoc);
    }
  });
}

function openReactionWandUI(player: Player, targetName: string, targetLoc: { x: number, y: number, z: number }, targetEntity?: any) {
  const form = new ActionFormData()
    .title(`🪄 ${targetName} にリアクションを送る`)
    .body("送りたい絵文字リアクションを選んでください:");

  for (const opt of reactionOptions) {
    form.button(`${opt.glyph} ${opt.label}`);
  }

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;
    const chosen = reactionOptions[res.selection];

    const dim = player.dimension;
    dim.spawnParticle("minecraft:heart_particle", { x: targetLoc.x, y: targetLoc.y + 1.5, z: targetLoc.z });
    dim.spawnParticle("minecraft:villager_happy", { x: targetLoc.x, y: targetLoc.y + 1.8, z: targetLoc.z });

    if (targetEntity) {
      try {
        const hp = targetEntity.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
        if (hp && hp.currentValue < hp.effectiveMax) {
          hp.setCurrentValue(Math.min(hp.effectiveMax, hp.currentValue + 4));
        }
      } catch (e) { }
    }

    world.sendMessage(`§d✨ [${player.name}] が ${targetName} に ${chosen.glyph} (${chosen.label}) リアクションを贈りました！§r`);
  });
}

// ----------------------------------------------------
// 0.65. Misskey Direct Message (DM) & Private Chat System
// ----------------------------------------------------
interface DirectMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  read: boolean;
  reaction?: string;
}

// Global In-Memory DM Store (playerId/playerName -> messages)
const directMessages: DirectMessage[] = [];

// Open DM Hub UI
function openDMHubUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const myDMs = directMessages.filter(m => m.recipient === player.name || m.sender === player.name);
  const unreadCount = directMessages.filter(m => m.recipient === player.name && !m.read).length;

  const form = new ActionFormData()
    .title("✉️ Misskey ダイレクトメッセージ (DM)")
    .body(`あなた宛ての未読DM: ${unreadCount} 件\n相手を選んでプライベートなメッセージを送信・確認できます。`)
    .button("📝 新しいDMを送信する")
    .button(`📬 受信トレイを見る (${unreadCount}件未読)`)
    .button("📤 送信済みメッセージ")
    .button("🔙 戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      // Send new DM
      openSendDMUI(player, blockLoc);
    } else if (response.selection === 1) {
      // Inbox
      openDMInboxUI(player, blockLoc);
    } else if (response.selection === 2) {
      // Sent box
      openDMSentBoxUI(player, blockLoc);
    } else if (response.selection === 3 && blockLoc) {
      openNoteBoardUI(player, blockLoc);
    }
  });
}

// Send new DM UI
function openSendDMUI(player: Player, blockLoc?: { x: number, y: number, z: number }, defaultTarget?: string) {
  const allPlayers = world.getAllPlayers().map(p => p.name).filter(name => name !== player.name);

  if (allPlayers.length === 0 && !defaultTarget) {
    player.sendMessage("§c⚠️ 現在ワールド内に他のプレイヤーがいません。§r");
    return;
  }

  const targetList = defaultTarget && !allPlayers.includes(defaultTarget) ? [defaultTarget, ...allPlayers] : (allPlayers.length > 0 ? allPlayers : [defaultTarget || ""]);

  const modal = new ModalFormData()
    .title("📝 DM（ダイレクトメッセージ）の送信")
    .dropdown("送信先プレイヤーを選択:", targetList, 0)
    .textField("メッセージ本文を入力 (絵文字コードも使用可):", "例: あとで拠点に来て！ :blobcat:");

  showFormSafe(player, modal, (res) => {
    if (res.canceled || !res.formValues) return;

    const targetIndex = Number(res.formValues[0]);
    const targetName = targetList[targetIndex];
    let msgText = String(res.formValues[1]).trim();

    if (!targetName || !msgText) {
      player.sendMessage("§c⚠️ 送信先または本文が空です。§r");
      return;
    }

    // Replace emoji shortcodes
    for (const [key, glyph] of Object.entries(emojiMap)) {
      if (msgText.includes(key)) {
        msgText = msgText.split(key).join(glyph);
      }
    }

    const newDM: DirectMessage = {
      id: `dm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender: player.name,
      recipient: targetName,
      content: msgText,
      timestamp: Date.now(),
      read: false
    };

    directMessages.unshift(newDM);
    if (directMessages.length > 100) directMessages.pop();

    player.sendMessage(`§a✉️ [@${targetName}] にDMを送信しました: 「${msgText}」§r`);

    // Notify recipient if online
    const recipientPlayer = world.getAllPlayers().find(p => p.name === targetName);
    if (recipientPlayer) {
      recipientPlayer.sendMessage(`§d📬 [Misskey DM from @${player.name}]: §f${msgText}§r`);
      recipientPlayer.dimension.spawnParticle("minecraft:heart_particle", {
        x: recipientPlayer.location.x,
        y: recipientPlayer.location.y + 1.8,
        z: recipientPlayer.location.z
      });
      recipientPlayer.dimension.spawnParticle("minecraft:villager_happy", {
        x: recipientPlayer.location.x,
        y: recipientPlayer.location.y + 2.0,
        z: recipientPlayer.location.z
      });
    }
  });
}

// Inbox UI
function openDMInboxUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const inbox = directMessages.filter(m => m.recipient === player.name);

  const form = new ActionFormData()
    .title("📬 DM 受信トレイ")
    .body(inbox.length === 0 ? "受信したメッセージはありません。" : "メッセージを選択して詳細確認・返信・リアクションができます:");

  for (const dm of inbox) {
    const unreadBadge = dm.read ? "" : "§e[未読]§r ";
    const reactBadge = dm.reaction ? ` [${dm.reaction}]` : "";
    form.button(`${unreadBadge}@${dm.sender}: ${dm.content.substring(0, 15)}...${reactBadge}`);
  }
  form.button("🔙 戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;
    if (response.selection >= inbox.length) {
      openDMHubUI(player, blockLoc);
      return;
    }

    const selectedDM = inbox[response.selection];
    selectedDM.read = true; // Mark as read
    openDMDetailUI(player, selectedDM, blockLoc, true);
  });
}

// Sent box UI
function openDMSentBoxUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const sentBox = directMessages.filter(m => m.sender === player.name);

  const form = new ActionFormData()
    .title("📤 送信済み DM 一覧")
    .body(sentBox.length === 0 ? "送信したメッセージはありません。" : "送信したメッセージ一覧:");

  for (const dm of sentBox) {
    const reactBadge = dm.reaction ? ` [相手のリアクション: ${dm.reaction}]` : "";
    form.button(`To @${dm.recipient}: ${dm.content.substring(0, 18)}...${reactBadge}`);
  }
  form.button("🔙 戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;
    if (response.selection >= sentBox.length) {
      openDMHubUI(player, blockLoc);
      return;
    }

    const selectedDM = sentBox[response.selection];
    openDMDetailUI(player, selectedDM, blockLoc, false);
  });
}

// DM Detail UI with reply & reaction
function openDMDetailUI(player: Player, dm: DirectMessage, blockLoc?: { x: number, y: number, z: number }, isInbox: boolean = true) {
  const reactInfo = dm.reaction ? `\n💖 リアクション: ${dm.reaction}` : "";
  const form = new ActionFormData()
    .title(`✉️ DM: @${dm.sender} → @${dm.recipient}`)
    .body(`差出人: @${dm.sender}\n宛先: @${dm.recipient}\n\n「${dm.content}」${reactInfo}`);

  if (isInbox) {
    form.button("💬 このDMに返信する");
    form.button(dm.reaction ? `🔄 リアクションを変更する (${dm.reaction})` : "💖 絵文字リアクションする");
    if (dm.reaction) {
      form.button("❌ リアクションを取り消す");
    }
  }
  form.button("🗑️ このDMを削除する");
  form.button("🔙 一覧に戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (isInbox) {
      let bIdx = 0;
      const replyBtn = bIdx++;
      const reactBtn = bIdx++;
      const unreactBtn = dm.reaction ? bIdx++ : -1;
      const delBtn = bIdx++;

      if (response.selection === replyBtn) {
        openSendDMUI(player, blockLoc, dm.sender);
      } else if (response.selection === reactBtn) {
        const pickForm = new ActionFormData()
          .title("🎨 DMリアクションを選択");
        for (const opt of reactionOptions) {
          pickForm.button(`${opt.glyph} ${opt.label}`);
        }
        showFormSafe(player, pickForm, (pRes) => {
          if (pRes.canceled || pRes.selection === undefined) return;
          const chosen = reactionOptions[pRes.selection];
          dm.reaction = chosen.glyph;
          player.sendMessage(`§d💖 @${dm.sender} からのDMに ${chosen.glyph} でリアクションしました！§r`);

          // Notify sender if online
          const senderPlayer = world.getAllPlayers().find(p => p.name === dm.sender);
          if (senderPlayer) {
            senderPlayer.sendMessage(`§d💖 [@${player.name}] があなたのDMに ${chosen.glyph} でリアクションしました！§r`);
          }
          openDMDetailUI(player, dm, blockLoc, isInbox);
        });
      } else if (response.selection === unreactBtn) {
        delete dm.reaction;
        player.sendMessage("§e❌ DMのリアクションを取り消しました。§r");
        openDMDetailUI(player, dm, blockLoc, isInbox);
      } else if (response.selection === delBtn) {
        const idx = directMessages.findIndex(m => m.id === dm.id);
        if (idx !== -1) directMessages.splice(idx, 1);
        player.sendMessage("§e🗑️ DMを削除しました。§r");
        openDMInboxUI(player, blockLoc);
      } else {
        openDMInboxUI(player, blockLoc);
      }
    } else {
      // Sent box actions
      if (response.selection === 0) {
        const idx = directMessages.findIndex(m => m.id === dm.id);
        if (idx !== -1) directMessages.splice(idx, 1);
        player.sendMessage("§e🗑️ 送信済みDMを削除しました。§r");
        openDMSentBoxUI(player, blockLoc);
      } else {
        openDMSentBoxUI(player, blockLoc);
      }
    }
  });
}

// ----------------------------------------------------
// 0.68. Misskey Financial, Currency (M Coin), FX & Stock Exchange System
// ----------------------------------------------------

const YEN_ITEMS: { typeId: string, value: number, name: string }[] = [
  { typeId: "mi:yen_10000", value: 10000, name: "10,000 M紙幣" },
  { typeId: "mi:yen_5000", value: 5000, name: "5,000 M紙幣" },
  { typeId: "mi:yen_2000", value: 2000, name: "2,000 M紙幣" },
  { typeId: "mi:yen_1000", value: 1000, name: "1,000 M紙幣" },
  { typeId: "mi:yen_500", value: 500, name: "500 M硬貨" },
  { typeId: "mi:yen_100", value: 100, name: "100 M硬貨" },
  { typeId: "mi:yen_50", value: 50, name: "50 M硬貨" },
  { typeId: "mi:yen_10", value: 10, name: "10 M硬貨" },
  { typeId: "mi:yen_5", value: 5, name: "5 M硬貨" },
  { typeId: "mi:yen_1", value: 1, name: "1 M硬貨" },
];

const SELLABLE_ITEMS: { typeId: string, name: string, price: number }[] = [
  { typeId: "minecraft:iron_ingot", name: "鉄インゴット", price: 100 },
  { typeId: "minecraft:gold_ingot", name: "金インゴット", price: 500 },
  { typeId: "minecraft:emerald", name: "エメラルド", price: 1000 },
  { typeId: "minecraft:diamond", name: "ダイヤモンド", price: 3000 },
  { typeId: "minecraft:netherite_ingot", name: "ネザライトインゴット", price: 15000 },
  { typeId: "mi:machida", name: "町田", price: 500 },
  { typeId: "mi:sanjuu", name: "三重", price: 500 },
  { typeId: "mi:silenthill", name: "静岡", price: 500 },
  { typeId: "mi:gif", name: "岐阜", price: 500 },
  { typeId: "mi:blob_aichi", name: "顔のついた愛知", price: 500 },
  { typeId: "mi:bunchou", name: "文鳥", price: 800 },
  { typeId: "mi:anko", name: "あんこ", price: 300 },
  { typeId: "mi:ecology_server", name: "生態サーバー", price: 4000 },
  { typeId: "mi:baked_mochocho", name: "ベイクドモチョチョ", price: 400 },
];

// --- Bank Account & Storage ---
const playerBankBalanceMap = new Map<string, number>(); // playerId -> balance (JPY)
const playerStockHoldingsMap = new Map<string, Record<string, number>>(); // playerId -> { code: count }
const playerFxPositionsMap = new Map<string, FxPosition[]>(); // playerId -> positions

function getPlayerBankAccount(player: Player): number {
  let bal = playerBankBalanceMap.get(player.id);
  if (bal === undefined) {
    try {
      const prop = player.getDynamicProperty("mi_bank_balance");
      if (typeof prop === "number") {
        bal = prop;
      }
    } catch (e) { }
    if (bal === undefined) {
      // First time opening account: 5,000 M bonus!
      bal = 5000;
      setPlayerBankAccount(player, bal);
      player.sendMessage("§6🏦✨ [Misskey銀行] 口座開設おめでとうございます！ 口座開設祝い金 §e5,000 M§6 を口座に付与しました！§r");
    } else {
      playerBankBalanceMap.set(player.id, bal);
    }
  }
  return bal;
}

function setPlayerBankAccount(player: Player, balance: number) {
  balance = Math.max(0, Math.floor(balance));
  playerBankBalanceMap.set(player.id, balance);
  try {
    player.setDynamicProperty("mi_bank_balance", balance);
  } catch (e) { }
}

function countPlayerCash(player: Player): number {
  try {
    const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
    if (!inv) return 0;
    let total = 0;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (!item) continue;
      const found = YEN_ITEMS.find(y => y.typeId === item.typeId);
      if (found) {
        total += found.value * item.amount;
      }
    }
    return total;
  } catch (e) {
    return 0;
  }
}

function depositAllCash(player: Player): number {
  try {
    const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
    if (!inv) return 0;
    let totalDeposited = 0;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (!item) continue;
      const found = YEN_ITEMS.find(y => y.typeId === item.typeId);
      if (found) {
        totalDeposited += found.value * item.amount;
        inv.setItem(i, undefined);
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

function withdrawCash(player: Player, amount: number): boolean {
  const current = getPlayerBankAccount(player);
  if (current < amount || amount <= 0) return false;

  try {
    const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
    if (!inv) return false;

    let remaining = amount;
    const itemsToAdd: { typeId: string, count: number }[] = [];

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

function getPlayerStockHoldings(player: Player): Record<string, number> {
  let holdings = playerStockHoldingsMap.get(player.id);
  if (!holdings) {
    holdings = {};
    try {
      const saved = player.getDynamicProperty("mi_stock_holdings");
      if (typeof saved === "string") {
        holdings = JSON.parse(saved);
      }
    } catch (e) { }
    playerStockHoldingsMap.set(player.id, holdings);
  }
  return holdings;
}

function setPlayerStockHoldings(player: Player, holdings: Record<string, number>) {
  playerStockHoldingsMap.set(player.id, holdings);
  try {
    player.setDynamicProperty("mi_stock_holdings", JSON.stringify(holdings));
  } catch (e) { }
}

function getPlayerFxPositions(player: Player): FxPosition[] {
  let positions = playerFxPositionsMap.get(player.id);
  if (!positions) {
    positions = [];
    try {
      const saved = player.getDynamicProperty("mi_fx_positions");
      if (typeof saved === "string") {
        positions = JSON.parse(saved);
      }
    } catch (e) { }
    playerFxPositionsMap.set(player.id, positions);
  }
  return positions;
}

function setPlayerFxPositions(player: Player, positions: FxPosition[]) {
  playerFxPositionsMap.set(player.id, positions);
  try {
    player.setDynamicProperty("mi_fx_positions", JSON.stringify(positions));
  } catch (e) { }
}

// --- FX Engine ---
interface FxPair {
  id: string;
  name: string;
  symbol: string;
  baseRate: number;
  currentRate: number;
  prevRate: number;
  volatility: number;
  history: number[];
  description: string;
}

interface FxPosition {
  id: string;
  pairId: string;
  type: "BUY" | "SELL";
  leverage: number;
  entryRate: number;
  margin: number; // 証拠金 (M)
  volume: number; // 外貨数量
  timestamp: number;
}

const fxPairs: FxPair[] = [
  {
    id: "FED_M",
    name: "Fediverseクレジット / Mコイン (FED/M)",
    symbol: "FED",
    baseRate: 155.00,
    currentRate: 155.00,
    prevRate: 155.00,
    volatility: 0.35,
    history: [154.8, 155.0, 155.2, 155.0],
    description: "Fediverse連合の基軸クレジット。オンラインストア決済に対応。"
  },
  {
    id: "BLOB_M",
    name: "ブロッブコイン / Mコイン (BLOB/M)",
    symbol: "BLOB",
    baseRate: 168.00,
    currentRate: 168.00,
    prevRate: 168.00,
    volatility: 0.55,
    history: [167.5, 168.0, 168.2, 168.0],
    description: "にゃんぷっぷー経済圏の主要トークン。ボラティリティ中。"
  },
  {
    id: "NEKO_M",
    name: "をねこトークン / Mコイン (NEKO/M)",
    symbol: "NEKO",
    baseRate: 850.00,
    currentRate: 850.00,
    prevRate: 850.00,
    volatility: 12.0,
    history: [840, 855, 848, 850],
    description: "をねこコミュニティの希少トークン。ボラティリティ高。"
  },
  {
    id: "MCC_M",
    name: "モチョコイン / Mコイン (MCC/M)",
    symbol: "MCC",
    baseRate: 12.50,
    currentRate: 12.50,
    prevRate: 12.50,
    volatility: 2.2,
    history: [10.2, 14.8, 11.5, 12.5],
    description: "モチョチョ発祥の超ハイリスク草コイン。爆上げ・大暴落あり！"
  }
];

function updateFxRates() {
  for (const pair of fxPairs) {
    pair.prevRate = pair.currentRate;
    // Random walk with mean reversion
    const delta = (Math.random() - 0.495) * pair.volatility * (1 + (Math.random() - 0.5));
    const meanReversion = (pair.baseRate - pair.currentRate) * 0.05;
    let newRate = pair.currentRate + delta + meanReversion;
    // Clamp to minimum 0.01
    newRate = Math.max(0.01, parseFloat(newRate.toFixed(2)));
    pair.currentRate = newRate;
    pair.history.push(newRate);
    if (pair.history.length > 8) pair.history.shift();
  }
}

function calculatePositionProfit(pos: FxPosition, currentRate: number): number {
  if (pos.type === "BUY") {
    return Math.floor((currentRate - pos.entryRate) * pos.volume);
  } else {
    return Math.floor((pos.entryRate - currentRate) * pos.volume);
  }
}

// --- Stock Market Engine ---
interface StockInfo {
  code: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  prevPrice: number;
  volatility: number;
  dividendRate: number; // 每周期配当率
  history: number[];
  sector: string;
  description: string;
}

const stockMarket: StockInfo[] = [
  {
    code: "SYUIL",
    name: "しゅいろソフトウェア",
    basePrice: 5000,
    currentPrice: 5000,
    prevPrice: 5000,
    volatility: 0.08,
    dividendRate: 0.01,
    history: [4900, 5100, 4950, 5000],
    sector: "情報・通信",
    description: "Misskeyの開発・運営。大型アップデートで急騰、障害で急落。"
  },
  {
    code: "TUTI",
    name: "村上ツチノコ商事",
    basePrice: 1200,
    currentPrice: 1200,
    prevPrice: 1200,
    volatility: 0.04,
    dividendRate: 0.025,
    history: [1180, 1220, 1195, 1200],
    sector: "卸売・バイオ",
    description: "生体サーバーとあんこを扱う総合商社。安定成長・高配当銘柄。"
  },
  {
    code: "YHATA",
    name: "官営八幡製鉄",
    basePrice: 3500,
    currentPrice: 3500,
    prevPrice: 3500,
    volatility: 0.03,
    dividendRate: 0.02,
    history: [3450, 3520, 3480, 3500],
    sector: "鉄鋼・重工業",
    description: "大煙突と高炉を擁する伝統の製鉄企業。不況に強いディフェンシブ株。"
  },
  {
    code: "RCAR",
    name: "レグカー自動車工業",
    basePrice: 850,
    currentPrice: 850,
    prevPrice: 850,
    volatility: 0.09,
    dividendRate: 0.008,
    history: [820, 890, 840, 850],
    sector: "自動車・輸送機器",
    description: "長い変な車の製造元。新色発表で上昇、事故多発で下落。"
  },
  {
    code: "MOCHO",
    name: "モチョチョ製菓",
    basePrice: 300,
    currentPrice: 300,
    prevPrice: 300,
    volatility: 0.15,
    dividendRate: 0.005,
    history: [280, 360, 290, 300],
    sector: "食品",
    description: "ベイクドモチョチョとプリンの製造。プリンブームで10倍高にもなる仕手株気質。"
  },
  {
    code: "YSNO",
    name: "与謝野ロジスティクス",
    basePrice: 2400,
    currentPrice: 2400,
    prevPrice: 2400,
    volatility: 0.06,
    dividendRate: 0.018,
    history: [2350, 2450, 2380, 2400],
    sector: "物流・転送",
    description: "町田・神奈川間のエンダーパール空間転送を手掛ける次世代物流企業。"
  }
];

// --- Market News Types & State ---
interface MarketNews {
  id: string;
  category: "stock" | "fx";
  title: string;
  content: string;
  targetCode: string;
  impactPercent: number;
  timestamp: number;
}

const marketNewsHistory: MarketNews[] = [];

// --- World Persistence System for FX & Stock Market ---
function saveMarketWorldData() {
  try {
    // 1. Save FX Rates
    const fxData: Record<string, { currentRate: number, prevRate: number, history: number[] }> = {};
    for (const pair of fxPairs) {
      fxData[pair.id] = {
        currentRate: pair.currentRate,
        prevRate: pair.prevRate,
        history: pair.history
      };
    }
    world.setDynamicProperty("mi_fx_market_rates", JSON.stringify(fxData));

    // 2. Save Stock Prices
    const stockData: Record<string, { currentPrice: number, prevPrice: number, history: number[] }> = {};
    for (const stock of stockMarket) {
      stockData[stock.code] = {
        currentPrice: stock.currentPrice,
        prevPrice: stock.prevPrice,
        history: stock.history
      };
    }
    world.setDynamicProperty("mi_stock_market_prices", JSON.stringify(stockData));

    // 3. Save News History
    world.setDynamicProperty("mi_news_history_data", JSON.stringify(marketNewsHistory.slice(0, 20)));
  } catch (e) {
    console.warn("[Mi_Addon] Failed to save market data to world: " + e);
  }
}

function loadMarketWorldData() {
  try {
    // 1. Load FX Rates
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

    // 2. Load Stock Prices
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

    // 3. Load News History
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

// Initial Load on Script Start
loadMarketWorldData();

// === 1. Stock Market News Templates (25 types across 6 companies) ===
const STOCK_NEWS_TEMPLATES: { title: string, content: string, code: string, minImpact: number, maxImpact: number }[] = [
  // SYUIL (しゅいろソフトウェア)
  { title: "🚀【速報】しゅいろ氏、新機能を緊急デプロイ！", content: "Misskeyに革新的な新機能が実装され、ユーザー数が爆発的に増加しています！", code: "SYUIL", minImpact: 15, maxImpact: 35 },
  { title: "💥【障害】Misskey開発所の生体サーバーが一時ダウン", content: "アクセス集中により開発室のサーバーが過熱。エンジニアが緊急復旧対応中です。", code: "SYUIL", minImpact: -25, maxImpact: -10 },
  { title: "🌟【新版】Misskeyメジャーアップデート公開！", content: "世界トレンド1位を獲得し、新規サーバー設立ラッシュが発生しています。", code: "SYUIL", minImpact: 20, maxImpact: 40 },
  { title: "🤖【AI】Misskey AI自動ノート生成のベータ版が解禁", content: "高度なAI機能の導入が発表され、IT業界からの注目が一気に集まっています。", code: "SYUIL", minImpact: 12, maxImpact: 26 },
  { title: "⚠️【バグ】絵文字リアクション連打によるサーバー高負荷", content: "一部のインスタンスで連打スクリプトによる遅延が発生し、懸念が広がっています。", code: "SYUIL", minImpact: -18, maxImpact: -8 },

  // TUTI (村上ツチノコ商事)
  { title: "🐍【特需】ツチノコ繁殖ブーム到来！あんこ需要急増", content: "各地でツチノコのペット化が進み、あんこおよび生体サーバーの取引価格が高騰しています。", code: "TUTI", minImpact: 12, maxImpact: 28 },
  { title: "🔬【特許】生態サーバー高効率バイオ技術の特許取得", content: "繁殖効率を2倍にする新技術の独占権を獲得し、業績予想を上方修正しました。", code: "TUTI", minImpact: 15, maxImpact: 32 },
  { title: "🌧️【不作】原材料のアズキ不作によりあんこ出荷制限", content: "異常気象によるアズキの収穫量激減が報じられ、商社部門の売上減が懸念されています。", code: "TUTI", minImpact: -22, maxImpact: -10 },
  { title: "🔍【摘発】市場に出回る偽ツチノコ業者を一斉摘発", content: "不正業者の一掃により村上ツチノコ商事の正規ブランドへの信頼が急上昇しました。", code: "TUTI", minImpact: 10, maxImpact: 22 },

  // YHATA (官営八幡製鉄)
  { title: "🏭【増産】八幡製鉄所の高炉フル稼働、鉄鋼需要好調", content: "巨大建築ブームに伴い、高品質な製鉄鋼材の受注が過去最高を記録しました。", code: "YHATA", minImpact: 8, maxImpact: 18 },
  { title: "🛡️【新素材】超高硬度ネザライト合金の量産化に成功", content: "従来の鉄鋼を遥かに凌駕する特殊装甲鋼の開発に成功し、防衛産業から大口受注を獲得！", code: "YHATA", minImpact: 18, maxImpact: 35 },
  { title: "🚆【受注】大陸横断鉄道プロジェクトのレール独占供給", content: "長距離トロッコ鉄道の敷設特需により、数年先までの生産枠が埋まりました。", code: "YHATA", minImpact: 12, maxImpact: 25 },
  { title: "⛏️【高騰】輸入鉄鉱石価格の高騰により採算悪化懸念", content: "原材料コストの急上昇が利益を圧迫するとの見方から売りが優勢となっています。", code: "YHATA", minImpact: -20, maxImpact: -8 },

  // RCAR (レグカー自動車工業)
  { title: "🚗【新色】レグカーに新色カラーリングが登場！", content: "16色フル対応の新型レグカーが発表され、サバンナでの試乗希望者が殺到しています。", code: "RCAR", minImpact: 12, maxImpact: 30 },
  { title: "💥【事故】サバンナ街道でレグカーの多重激突事故が発生", content: "高速走行中のレグカーが壁に激突大破。安全対策への懸念から売りが先行しています。", code: "RCAR", minImpact: -28, maxImpact: -12 },
  { title: "⚡【発表】新開発「ターボブースター搭載モデル」を発表", content: "最高速度1.5倍の超高速仕様が発表され、モータースポーツファンが熱狂しています。", code: "RCAR", minImpact: 16, maxImpact: 35 },
  { title: "🏆【優勝】サバンナ横断キャノンボールラリーで総合優勝！", content: "過酷な悪路を走破し圧倒的な耐久性と速さを実証、注文が殺到しています。", code: "RCAR", minImpact: 14, maxImpact: 28 },
  { title: "🔧【リコール】長すぎる車体の曲がり角制御で点検回収", content: "一部車両で急カーブ時のフレームきしみ音が発生し、無償点検を発表しました。", code: "RCAR", minImpact: -22, maxImpact: -10 },

  // MOCHO (モチョチョ製菓)
  { title: "🍮【大流行】プリンのトランポリンジャンプがSNSで大バズり！", content: "ぽよんぽよん跳ねる動画がバズり、モチョチョ製菓のプリンが全国で品切れ続出！", code: "MOCHO", minImpact: 25, maxImpact: 60 },
  { title: "🤢【警告】ベイクドモチョチョ食べ過ぎによる吐き気注意報", content: "過剰摂取による体調不良者が報告され、食品安全委員会が注意を呼びかけています。", code: "MOCHO", minImpact: -30, maxImpact: -15 },
  { title: "🐱【新商品】「猫耳プリン」が若者を中心に空前ブーム", content: "食べると猫耳が生えて足が速くなるスイーツとして話題沸騰、売り上げが倍増！", code: "MOCHO", minImpact: 20, maxImpact: 45 },
  { title: "🎖️【ギネス】世界最大の巨大プリン作成に成功、世界記録認定", content: "高さ5mの超巨大プリンを完成させ、世界的お祭り騒ぎに発展しています！", code: "MOCHO", minImpact: 15, maxImpact: 35 },

  // YSNO (与謝野ロジスティクス)
  { title: "🦋【物流】与謝野晶子氏、神奈川・町田間の超空間輸送ルートを開設", content: "エンダーパール転送網の拡充により、即日配送エリアが大幅に拡大しました。", code: "YSNO", minImpact: 12, maxImpact: 28 },
  { title: "📦【実用化】エンダー自動空間デリバリーの商業運行開始", content: "チェストから指定場所へ瞬時に荷物を飛ばす次世代配送サービスが本格始動！", code: "YSNO", minImpact: 18, maxImpact: 34 },
  { title: "🌀【遅延】空間転送ゲートの磁場乱れにより荷物遅延多発", content: "一時的な空間の歪みにより一部配送便に大幅な遅れが生じ、補償費用が発生。", code: "YSNO", minImpact: -22, maxImpact: -9 },
  { title: "🌌【宇宙】ジ・エンド向け超長距離デリバリー実証実験に成功", content: "異次元空間を跨ぐ配送網の構築に成功し、物流界の革命児として株価が急上昇！", code: "YSNO", minImpact: 20, maxImpact: 40 }
];

// === 2. FX Market News Templates (16 types across 4 currency pairs) ===
const FX_NEWS_TEMPLATES: { title: string, content: string, pairId: string, minImpact: number, maxImpact: number }[] = [
  // FED/M (Fediverseクレジット/Mコイン)
  { title: "🌐【連合拡大】Fediverse接続サーバー数が10万台を突破！", content: "分散型SNSの爆発的拡大に伴い、連合ネットワーク基軸クレジットFEDが猛烈な買いを集めています！", pairId: "FED_M", minImpact: 4, maxImpact: 8 },
  { title: "⚠️【障害】大手インスタンス群の連鎖ダウンで一時売り浴びせ", content: "一時的なネットワーク分断によりFEDクレジットの流動性懸念が生じ、価格が急落しました。", pairId: "FED_M", minImpact: -6, maxImpact: -3 },
  { title: "💳【公式決済】主要MisskeyサーバーがFED決済を標準採用", content: "サーバー維持費やオンラインストアでのFED利用が拡大し、実需買いが殺到しています！", pairId: "FED_M", minImpact: 3, maxImpact: 7 },
  { title: "🔒【暗号化】次世代連合プロトコルの暗号化強化が発表", content: "セキュリティ向上への高評価から、FEDクレジットの信頼性が急上昇しています。", pairId: "FED_M", minImpact: 2, maxImpact: 5 },

  // BLOB/M (ブロッブコイン/Mコイン)
  { title: "🐱【爆買い】にゃんぷっぷーのぬいぐるみ発売でBLOB買い殺到", content: "公式グッズの決済通貨に指定され、にゃんぷっぷー経済圏トークンBLOBが高騰！", pairId: "BLOB_M", minImpact: 4, maxImpact: 9 },
  { title: "🌧️【品薄】愛知アイテムの収穫量減少でBLOB売り先行", content: "進化アイテムの供給不足が懸念され、一時的な調整売りが発生しています。", pairId: "BLOB_M", minImpact: -5, maxImpact: -2 },
  { title: "🤝【提携】モチョチョ製菓とBLOBポイントの相互交換が決定", content: "スイーツとのタイアップによりBLOBトークンの利用者が急増しています。", pairId: "BLOB_M", minImpact: 3, maxImpact: 6 },
  { title: "🎉【生誕祭】にゃんぷっぷー誕生祭イベントで取引高最高記録", content: "お祭りムードに包まれ、世界中からBLOB買いが流入しています！", pairId: "BLOB_M", minImpact: 5, maxImpact: 10 },

  // NEKO/M (をねこトークン/Mコイン)
  { title: "😴【のんびり】をねこリラックス効果でNEKOトークン急騰！", content: "癒やしを求めるトレーダーによる買いが集まり、高水準を維持しています。", pairId: "NEKO_M", minImpact: 15, maxImpact: 35 },
  { title: "😿【涙目】をねこ泣き顔スタンプ連打でサーバー過熱", content: "一部負荷による遅延が嫌気され、一時的に売りが優勢となりました。", pairId: "NEKO_M", minImpact: -20, maxImpact: -8 },
  { title: "🍵【静岡特需】静岡アイテムの需要急増でNEKO買い加速", content: "をねこ進化素材の取引活発化によりトークン価値が急上昇しています！", pairId: "NEKO_M", minImpact: 12, maxImpact: 25 },
  { title: "⚡【ライバル】にゃんぷっぷーとのエンカウントで攻撃力＆レートUP", content: "ライバル関係による注目度急上昇でNEKOトークンが大幅高！", pairId: "NEKO_M", minImpact: 18, maxImpact: 30 },

  // MCC/M (モチョコイン/Mコイン - 超ハイリスク草コイン)
  { title: "🌕【TO THE MOON!】有名インフルエンサーの投稿で狂乱急騰！", content: "「モチョコインしか勝たん」という一言で投機資金が流入、価格が爆騰中！", pairId: "MCC_M", minImpact: 70, maxImpact: 160 },
  { title: "💥【大暴落】CEOが「ただのネタコイン」と発言し大暴落！", content: "開発陣の梯子外し発言に投資家が激怒。投げ売りが止まらず大暴落しています！", pairId: "MCC_M", minImpact: -65, maxImpact: -35 },
  { title: "🍮【還元祭】プリン購入でモチョコイン全額キャッシュバック！", content: "モチョチョ製菓との大型タイアップキャンペーンが始まり、買いが買いを呼ぶ展開に！", pairId: "MCC_M", minImpact: 40, maxImpact: 90 },
  { title: "🐋【クジラ利確】大口投資家（クジラ）が保有コインを一斉放出", content: "初期からの大口ホルダーが莫大な利益確定売りを行い、価格が急落しています。", pairId: "MCC_M", minImpact: -50, maxImpact: -25 }
];

function updateStockPrices() {
  for (const stock of stockMarket) {
    stock.prevPrice = stock.currentPrice;
    // Normal fluctuation with mean reversion
    const percentChange = (Math.random() - 0.49) * stock.volatility;
    const meanReversion = ((stock.basePrice - stock.currentPrice) / stock.basePrice) * 0.04;
    let newPrice = stock.currentPrice * (1 + percentChange + meanReversion);
    newPrice = Math.max(10, Math.floor(newPrice));
    stock.currentPrice = newPrice;
    stock.history.push(newPrice);
    if (stock.history.length > 8) stock.history.shift();
  }

  // Pay Stock Dividends to all online players
  for (const player of world.getAllPlayers()) {
    const holdings = getPlayerStockHoldings(player);
    let totalDividends = 0;
    for (const [code, count] of Object.entries(holdings)) {
      if (count <= 0) continue;
      const stock = stockMarket.find(s => s.code === code);
      if (stock && stock.dividendRate > 0) {
        const div = Math.floor(stock.currentPrice * stock.dividendRate * count);
        totalDividends += div;
      }
    }
    if (totalDividends > 0) {
      const current = getPlayerBankAccount(player);
      setPlayerBankAccount(player, current + totalDividends);
      player.sendMessage(`§a💵 [配当金受取] 保有株式の配当金 §e${totalDividends.toLocaleString()} M§a が口座に振り込まれました！§r`);
    }
  }
}

function processMarketBreakingNews() {
  // 35% chance to trigger Stock News or FX News
  if (Math.random() < 0.35) {
    const isFxNews = Math.random() < 0.45; // 45% FX, 55% Stock

    if (isFxNews) {
      // Trigger FX News
      const tmpl = FX_NEWS_TEMPLATES[Math.floor(Math.random() * FX_NEWS_TEMPLATES.length)];
      const pair = fxPairs.find(p => p.id === tmpl.pairId);
      if (pair) {
        const impact = parseFloat((tmpl.minImpact + Math.random() * (tmpl.maxImpact - tmpl.minImpact)).toFixed(2));
        pair.prevRate = pair.currentRate;
        pair.currentRate = parseFloat(Math.max(0.01, pair.currentRate * (1 + impact / 100)).toFixed(2));
        pair.history.push(pair.currentRate);
        if (pair.history.length > 8) pair.history.shift();

        const news: MarketNews = {
          id: `fx_news_${Date.now()}`,
          category: "fx",
          title: tmpl.title,
          content: `${tmpl.content} (影響: ${pair.name} レートが ${impact >= 0 ? "+" : ""}${impact}%)`,
          targetCode: tmpl.pairId,
          impactPercent: impact,
          timestamp: Date.now()
        };
        marketNewsHistory.unshift(news);
        if (marketNewsHistory.length > 25) marketNewsHistory.pop();

        world.sendMessage(`§b🌐 [世界為替速報 (FX)] §e${tmpl.title}§r\n§7${news.content}§r`);
      }
    } else {
      // Trigger Stock News
      const tmpl = STOCK_NEWS_TEMPLATES[Math.floor(Math.random() * STOCK_NEWS_TEMPLATES.length)];
      const targetStock = stockMarket.find(s => s.code === tmpl.code);
      if (targetStock) {
        const impact = Math.floor(tmpl.minImpact + Math.random() * (tmpl.maxImpact - tmpl.minImpact));
        targetStock.prevPrice = targetStock.currentPrice;
        targetStock.currentPrice = Math.max(10, Math.floor(targetStock.currentPrice * (1 + impact / 100)));
        targetStock.history.push(targetStock.currentPrice);
        if (targetStock.history.length > 8) targetStock.history.shift();

        const news: MarketNews = {
          id: `stock_news_${Date.now()}`,
          category: "stock",
          title: tmpl.title,
          content: `${tmpl.content} (影響: ${targetStock.name}株が ${impact >= 0 ? "+" : ""}${impact}%)`,
          targetCode: tmpl.code,
          impactPercent: impact,
          timestamp: Date.now()
        };
        marketNewsHistory.unshift(news);
        if (marketNewsHistory.length > 25) marketNewsHistory.pop();

        world.sendMessage(`§6📰 [Misskey株価速報] §e${tmpl.title}§r\n§7${news.content}§r`);
      }
    }
  }
}

// Background Financial Market Ticker (Every 30 seconds = 600 ticks)
system.runInterval(() => {
  updateFxRates();
  updateStockPrices();
  processMarketBreakingNews();

  // Check FX Auto-Stoploss (Margin Call) for all online players
  for (const player of world.getAllPlayers()) {
    const positions = getPlayerFxPositions(player);
    if (positions.length === 0) continue;

    let modified = false;
    const remainingPositions: FxPosition[] = [];

    for (const pos of positions) {
      const pair = fxPairs.find(p => p.id === pos.pairId);
      if (!pair) continue;

      const profit = calculatePositionProfit(pos, pair.currentRate);
      // If loss exceeds 85% of margin, trigger auto stop-loss
      if (profit < -pos.margin * 0.85) {
        const refund = Math.max(0, pos.margin + profit);
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + refund);
        player.sendMessage(`§c🚨 [ロスカット執行] ${pair.name} のポジションが強制決済されました（損失: ${Math.abs(profit).toLocaleString()} M, 返還: ${refund.toLocaleString()} M）。§r`);
        modified = true;
      } else {
        remainingPositions.push(pos);
      }
    }

    if (modified) {
      setPlayerFxPositions(player, remainingPositions);
    }
  }

  // Save latest FX rates, Stock prices and News to World DynamicProperties
  saveMarketWorldData();
}, 600);

// --- Financial UI System ---

// --- Vehicle Upgrades & Perks Subscription Store ---
const CAR_PERK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface CarPerkDef {
  key: "turbo" | "insurance" | "gold_license";
  name: string;
  badge: string;
  fedPrice: number;
  description: string;
  effectSummary: string;
}

const CAR_PERK_DEFS: Record<string, CarPerkDef> = {
  turbo: {
    key: "turbo",
    name: "⚡ ターボブースター",
    badge: "ターボ",
    fedPrice: 30,
    description: "長い変な車のエンジンを超強化し、最高速度を1.5倍に爆速加速！",
    effectSummary: "最高速度が1.5倍に超加速"
  },
  insurance: {
    key: "insurance",
    name: "🛡️ 車両保険",
    badge: "保険",
    fedPrice: 20,
    description: "壁激突による大破事故時に、1分停止せず即座に現場修復！",
    effectSummary: "事故大破時の1分停止を即時復旧"
  },
  gold_license: {
    key: "gold_license",
    name: "🔰 ゴールド免許証",
    badge: "金免",
    fedPrice: 15,
    description: "優良ドライバー認定証。車を誤って殴っても車が怒らなくなる！",
    effectSummary: "車を殴っても怒られなくなる"
  }
};

interface CarPerkStatus {
  active: boolean;
  expiresAt: number;
  remainingMinutes: number;
  autoRenew: boolean;
}

function getCarPerkStatus(player: Player, perkKey: string): CarPerkStatus {
  try {
    const expiresAt = Number(player.getDynamicProperty(`mi_perk_${perkKey}_expires`) || 0);
    const rawAutoRenew = player.getDynamicProperty(`mi_perk_${perkKey}_auto_renew`);
    const autoRenew = rawAutoRenew === undefined ? true : Boolean(rawAutoRenew);
    const now = Date.now();
    const active = now < expiresAt;
    const remainingMinutes = active ? Math.max(1, Math.ceil((expiresAt - now) / 60000)) : 0;
    return { active, expiresAt, remainingMinutes, autoRenew };
  } catch (e) {
    return { active: false, expiresAt: 0, remainingMinutes: 0, autoRenew: false };
  }
}

function subscribeCarPerk(player: Player, perkKey: string, durationMs: number = CAR_PERK_DURATION_MS): CarPerkStatus {
  const current = getCarPerkStatus(player, perkKey);
  const now = Date.now();
  const baseTime = current.active ? current.expiresAt : now;
  const newExpires = baseTime + durationMs;

  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_expires`, newExpires);
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, true);
  } catch (e) { }

  return getCarPerkStatus(player, perkKey);
}

function setCarPerkAutoRenew(player: Player, perkKey: string, autoRenew: boolean) {
  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, autoRenew);
  } catch (e) { }
}

function cancelCarPerkSubscription(player: Player, perkKey: string) {
  try {
    player.setDynamicProperty(`mi_perk_${perkKey}_expires`, 0);
    player.setDynamicProperty(`mi_perk_${perkKey}_auto_renew`, false);
  } catch (e) { }
}

function hasCarPerk(player: Player, perkKey: string): boolean {
  return getCarPerkStatus(player, perkKey).active;
}

function getInsuranceStatus(player: Player): InsuranceStatus {
  const s = getCarPerkStatus(player, "insurance");
  return { active: s.active, expiresAt: s.expiresAt, remainingMinutes: s.remainingMinutes, autoRenew: s.autoRenew };
}

interface InsuranceStatus {
  active: boolean;
  expiresAt: number;
  remainingMinutes: number;
  autoRenew: boolean;
}

// Wealth Rank Information
interface WealthRank {
  rankName: string;
  minFed: number;
  badge: string;
  particle: string;
  description: string;
}

const WEALTH_RANKS: WealthRank[] = [
  { rankName: "Misskeyの大株主", minFed: 100000, badge: "§d👑[大株主]§r", particle: "minecraft:mob_portal", description: "総資産10万FED突破。虹色のポータルオーラと加速バフ。" },
  { rankName: "石油王", minFed: 20000, badge: "§6💎[石油王]§r", particle: "minecraft:totem_particle", description: "総資産2万FED突破。黄金とエメラルドのオーラ。" },
  { rankName: "大富豪", minFed: 5000, badge: "§e🎩[大富豪]§r", particle: "minecraft:villager_happy", description: "総資産5千FED突破。黄金のきらめきオーラ。" },
  { rankName: "資産家", minFed: 1000, badge: "§a💼[資産家]§r", particle: "minecraft:villager_happy", description: "総資産千FED突破。銅色のきらめき。" },
  { rankName: "一般市民", minFed: 0, badge: "§7[一般]§r", particle: "", description: "まずは投資や採掘で資産を築きましょう！" }
];

function getPlayerWealthRank(totalFed: number): WealthRank {
  for (const r of WEALTH_RANKS) {
    if (totalFed >= r.minFed) return r;
  }
  return WEALTH_RANKS[WEALTH_RANKS.length - 1];
}

// 1. Main Portal UI
function openFinancialPortalUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);

  // Calculate stock evaluation
  const holdings = getPlayerStockHoldings(player);
  let stockValue = 0;
  for (const [code, count] of Object.entries(holdings)) {
    const stock = stockMarket.find(s => s.code === code);
    if (stock && count > 0) {
      stockValue += stock.currentPrice * count;
    }
  }

  // Calculate FX position evaluation
  const positions = getPlayerFxPositions(player);
  let fxMargin = 0;
  let fxUnrealizedProfit = 0;
  for (const pos of positions) {
    fxMargin += pos.margin;
    const pair = fxPairs.find(p => p.id === pos.pairId);
    if (pair) {
      fxUnrealizedProfit += calculatePositionProfit(pos, pair.currentRate);
    }
  }

  const totalAssets = cash + bank + stockValue + fxMargin + fxUnrealizedProfit;
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;
  const totalFed = parseFloat((totalAssets / fedRate).toFixed(2));
  const wealthRank = getPlayerWealthRank(totalFed);

  const profitSign = fxUnrealizedProfit >= 0 ? "+" : "";
  const fxProfitText = fxUnrealizedProfit !== 0 ? ` (含み損益: ${profitSign}${fxUnrealizedProfit.toLocaleString()} M)` : "";

  const form = new ActionFormData()
    .title("💹 Misskey証券 & 金融ポータル")
    .body(
      `👤 §l${player.name}§r 様の資産サマリー [${wealthRank.badge}]\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 §6総資産評価額: §e${totalAssets.toLocaleString()} M§r (§b${totalFed.toLocaleString()} FED§r)\n` +
      `💵 所持金 (現金): §f${cash.toLocaleString()} M§r\n` +
      `🏦 口座残高 (預金): §a${bank.toLocaleString()} M§r\n` +
      `🏢 株式保有額: §b${stockValue.toLocaleString()} M§r\n` +
      `📈 FX証拠金: §d${fxMargin.toLocaleString()} M§r${fxProfitText}\n` +
      `💹 FED為替レート: §e1 FED = ${fedRate.toFixed(2)} M§r\n` +
      `━━━━━━━━━━━━━━━━━━`
    )
    .button("🛒 Misskeyオンラインストア (FED決済)")
    .button("🚗 車両アップグレード & 保険所")
    .button("🎰 Misskey スクラッチくじ (ガチャ)")
    .button("🏦 ATM・口座管理 (入金・出金・両替)")
    .button("🛍️ 買取・換金所 (鉱石・特産品を売却)")
    .button(`📈 FX 為替取引所 (${positions.length}件保有中)`)
    .button("🏢 Misskey株式市場 (株の売買・配当)")
    .button(`📰 経済ニュース速報 (${marketNewsHistory.length}件)`)
    .button("👑 富豪ランキング & 称号")
    .button("🔙 閉じる");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

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

// Store Items Definition (All in FED Credit)
interface StoreItem {
  id: string;
  name: string;
  fedPrice: number;
  typeId?: string;
  amount?: number;
  isPack?: boolean;
  requiredIgyo?: string; // e.g. "ensei" for elytra / shulker
  requiredUnlockTag?: string; // e.g. "unlocked_diamond", "unlocked_netherite"
  lockReason?: string;
  description: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: "elytra",
    name: "エリトラ (滑空翼)",
    fedPrice: 5000,
    typeId: "minecraft:elytra",
    amount: 1,
    requiredIgyo: "ensei",
    lockReason: "遠征の偉業 (エンド到達/討伐) が必要",
    description: "大空を飛翔できる至高の翼。遠征の偉業達成者限定！"
  },
  {
    id: "shulker_box",
    name: "シュルカーボックス",
    fedPrice: 800,
    typeId: "minecraft:shulker_box",
    amount: 1,
    requiredIgyo: "ensei",
    lockReason: "遠征の偉業 (エンド到達/討伐) が必要",
    description: "大量のアイテムを持ち運べるポータブル倉庫。エンド到達者限定！"
  },
  {
    id: "netherite",
    name: "ネザライトインゴット × 1",
    fedPrice: 1500,
    typeId: "minecraft:netherite_ingot",
    amount: 1,
    requiredUnlockTag: "unlocked_netherite",
    lockReason: "一度自力でネザライトを入手/強化する必要あり",
    description: "最上位装備の強化素材。一度入手したプレイヤーのみ購入可能。"
  },
  {
    id: "diamond_pack",
    name: "ダイヤモンド × 8",
    fedPrice: 500,
    typeId: "minecraft:diamond",
    amount: 8,
    requiredUnlockTag: "unlocked_diamond",
    lockReason: "一度自力でダイヤモンドを入手する必要あり",
    description: "高品質なダイヤモンド8個セット。一度入手したプレイヤーのみ購入可能。"
  },
  {
    id: "notch_apple",
    name: "エンチャント金リンゴ × 1",
    fedPrice: 600,
    typeId: "minecraft:enchanted_golden_apple",
    amount: 1,
    requiredIgyo: "chokin",
    lockReason: "貯金の偉業 (金所持) が必要",
    description: "再生V・耐性を授ける究極の神リンゴ。"
  },
  {
    id: "special_pack",
    name: "Misskey特産品パック",
    fedPrice: 80,
    isPack: true,
    description: "町田・三重・静岡・愛知・岐阜・文鳥が各1個入った素材セット。"
  },
  {
    id: "ecology_server",
    name: "生態サーバー × 1",
    fedPrice: 50,
    typeId: "mi:ecology_server",
    amount: 1,
    description: "ツチノコ繁殖やクラフトに必須の生体パーツ。"
  },
  {
    id: "mochocho_pack",
    name: "ベイクドモチョチョ × 16",
    fedPrice: 15,
    typeId: "mi:baked_mochocho",
    amount: 16,
    description: "美味しいモチョチョ。食べ過ぎには注意！"
  },
  {
    id: "pudding_pack",
    name: "プリン × 4",
    fedPrice: 20,
    typeId: "mi:pudding",
    amount: 4,
    description: "ぽよんぽよん跳ねるスイーツ。"
  },
  {
    id: "nekomimi_pack",
    name: "猫耳プリン × 2",
    fedPrice: 40,
    typeId: "mi:nekomimi_pudding",
    amount: 2,
    description: "食べると猫耳が生えて足が速くなる！"
  },
  {
    id: "blueprint_yahata",
    name: "八幡製鉄所の設計図",
    fedPrice: 2000,
    typeId: "mi:yahata_blueprint",
    amount: 1,
    description: "産業遺構ダンジョンを目の前に即時建設。"
  },
  {
    id: "blueprint_hq",
    name: "Misskey開発所の設計図",
    fedPrice: 3000,
    typeId: "mi:hq_blueprint",
    amount: 1,
    description: "4階建て＋ヘリポートの巨大ダンジョンを即時建設。"
  },
  {
    id: "egg_blobcat",
    name: "にゃんぷっぷーの卵",
    fedPrice: 100,
    typeId: "mi:blobcat_spawn_egg",
    amount: 1,
    description: "愛されマスコットを直接召喚。"
  },
  {
    id: "egg_woneko",
    name: "をねこの卵",
    fedPrice: 100,
    typeId: "mi:woneko_spawn_egg",
    amount: 1,
    description: "表情豊かなのんびり猫を召喚。"
  },
  {
    id: "egg_car",
    name: "長い変な車の卵",
    fedPrice: 250,
    typeId: "mi:regretcar_spawn_egg",
    amount: 1,
    description: "2人乗り超高速車両を召喚。"
  }
];

function isStoreItemLocked(player: Player, item: StoreItem): boolean {
  if (item.requiredIgyo && !hasPlayerAchieved(player, item.requiredIgyo)) {
    return true;
  }
  if (item.requiredUnlockTag && !player.hasTag(item.requiredUnlockTag)) {
    return true;
  }
  return false;
}

// Online Store UI (FED Shopping)
function openOnlineStoreUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;

  const form = new ActionFormData()
    .title("🛒 Misskey オンラインストア (FED決済)")
    .body(
      `口座残高: §a${bank.toLocaleString()} M§r (§b${(bank / fedRate).toFixed(2)} FED§r)\n` +
      `現在の為替レート: §e1 FED = ${fedRate.toFixed(2)} M§r\n` +
      `（※Mコイン高・FED安の時に買うと支払額がお得になります！）\n\n` +
      `購入したい商品を選択してください:`
    );

  for (const item of STORE_ITEMS) {
    const mCost = Math.floor(item.fedPrice * fedRate);
    const locked = isStoreItemLocked(player, item);

    if (locked) {
      form.button(`🔒 ${item.name} (${item.fedPrice.toLocaleString()} FED)\n[未解放: ${item.lockReason || "条件未達成"}]`);
    } else {
      form.button(`${item.name} (${item.fedPrice.toLocaleString()} FED)\n[支払額: 約 ${mCost.toLocaleString()} M]`);
    }
  }

  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection < STORE_ITEMS.length) {
      const item = STORE_ITEMS[res.selection];
      const locked = isStoreItemLocked(player, item);

      if (locked) {
        player.sendMessage(`§c🔒 [購入不可] 「${item.name}」はロックされています！（解除条件: ${item.lockReason || "未達成"}）§r`);
        openOnlineStoreUI(player, blockLoc);
        return;
      }

      const mCost = Math.floor(item.fedPrice * fedRate);
      if (bank < mCost) {
        player.sendMessage(`§c⚠️ 口座残高が不足しています。（必要額: ${mCost.toLocaleString()} M / 残高: ${bank.toLocaleString()} M）§r`);
        openOnlineStoreUI(player, blockLoc);
        return;
      }

      // Process purchase
      const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
      if (!inv) return;

      setPlayerBankAccount(player, bank - mCost);

      if (item.isPack) {
        // Special material pack
        inv.addItem(new ItemStack("mi:machida", 1));
        inv.addItem(new ItemStack("mi:sanjuu", 1));
        inv.addItem(new ItemStack("mi:silenthill", 1));
        inv.addItem(new ItemStack("mi:blob_aichi", 1));
        inv.addItem(new ItemStack("mi:gif", 1));
        inv.addItem(new ItemStack("mi:bunchou", 1));
      } else if (item.typeId) {
        inv.addItem(new ItemStack(item.typeId, item.amount || 1));
      }

      player.sendMessage(`§a🛒✨ [購入完了] 「${item.name}」を ${item.fedPrice.toLocaleString()} FED (${mCost.toLocaleString()} M) で購入しました！§r`);
      player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.8, z: player.location.z });
      openOnlineStoreUI(player, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// Vehicle Services & Subscription UI
function openVehicleServiceUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;

  const perkKeys: ("turbo" | "insurance" | "gold_license")[] = ["turbo", "insurance", "gold_license"];
  const statuses = perkKeys.map(k => ({ def: CAR_PERK_DEFS[k], status: getCarPerkStatus(player, k) }));

  const form = new ActionFormData()
    .title("🚗 車両アップグレード & 自動車保険所")
    .body(
      `口座残高: §a${bank.toLocaleString()} M§r (§b${(bank / fedRate).toFixed(2)} FED§r)\n\n` +
      `長い変な車（レグカー）の性能強化・保険・特別免許をサブスク契約できます:\n` +
      `（※30分定期契約。自動更新をONにすると口座残高から自動引き落とし継続されます）`
    );

  for (const { def, status } of statuses) {
    const costM = Math.floor(def.fedPrice * fedRate);
    if (status.active) {
      form.button(`✅ ${def.name} [契約中: 残り${status.remainingMinutes}分 / 更新:${status.autoRenew ? "ON" : "OFF"}]\n[タップして契約管理・延長・解約]`);
    } else {
      form.button(`${def.name} (${def.fedPrice} FED/30分 / 約${costM.toLocaleString()} M)\n[${def.effectSummary}]`);
    }
  }

  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection < perkKeys.length) {
      const chosenKey = perkKeys[res.selection];
      const { def, status } = statuses[res.selection];
      const costM = Math.floor(def.fedPrice * fedRate);

      if (status.active) {
        // Open management modal for this perk
        openCarPerkManageUI(player, chosenKey, blockLoc);
      } else {
        // Subscribe to this perk
        if (bank < costM) {
          player.sendMessage(`§c⚠️ 口座残高が不足しています。（必要額: ${costM.toLocaleString()} M / 残高: ${bank.toLocaleString()} M）§r`);
          openVehicleServiceUI(player, blockLoc);
        } else {
          setPlayerBankAccount(player, bank - costM);
          const newStatus = subscribeCarPerk(player, chosenKey);
          player.sendMessage(`§a🚗✨ [サブスク加入完了] 「${def.name}」に加入しました！（30分間有効 / 自動更新: ON）§r`);
          player.sendMessage(`§7効果: ${def.description}§r`);
          player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
          openVehicleServiceUI(player, blockLoc);
        }
      }
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// Vehicle Perk Subscription Management UI
function openCarPerkManageUI(player: Player, perkKey: "turbo" | "insurance" | "gold_license", blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;
  const def = CAR_PERK_DEFS[perkKey];
  const status = getCarPerkStatus(player, perkKey);
  const costM = Math.floor(def.fedPrice * fedRate);

  const form = new ActionFormData()
    .title(`${def.name} サブスクリプション管理`)
    .body(
      `👤 §l${player.name}§r 様の契約状況 [${def.name}]\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📋 契約状態: §a✅ 有効（効果発動中）§r\n` +
      `🎯 効果概要: ${def.description}\n` +
      `⏱️ 残り時間: §e約 ${status.remainingMinutes} 分§r\n` +
      `🔄 自動更新: ${status.autoRenew ? "§aON (期間満了時に自動引き落とし)§r" : "§cOFF (期間満了で失効)§r"}\n` +
      `💰 保険料・月額: §b${def.fedPrice} FED§r (約 §e${costM.toLocaleString()} M§r / 30分)\n` +
      `🏦 口座残高: §a${bank.toLocaleString()} M§r\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `ご希望の操作を選択してください:`
    )
    .button(`⏱️ 契約期間を延長 (+30分 / 約${costM.toLocaleString()} M)`)
    .button(`🔄 自動更新を切り替え (現在: ${status.autoRenew ? "ON ➔ OFF" : "OFF ➔ ON"})`)
    .button("❌ サブスクリプションを即時解約")
    .button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      // Extend
      if (bank < costM) {
        player.sendMessage(`§c⚠️ 口座残高が不足しています。（必要額: ${costM.toLocaleString()} M）§r`);
      } else {
        setPlayerBankAccount(player, bank - costM);
        const newStatus = subscribeCarPerk(player, perkKey);
        player.sendMessage(`§a⏱️✨ [期間延長完了] 「${def.name}」の期間を30分延長しました！（残り: 約 ${newStatus.remainingMinutes} 分）§r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      }
      openCarPerkManageUI(player, perkKey, blockLoc);
    } else if (res.selection === 1) {
      // Toggle auto-renew
      const nextAutoRenew = !status.autoRenew;
      setCarPerkAutoRenew(player, perkKey, nextAutoRenew);
      if (nextAutoRenew) {
        player.sendMessage(`§a🔄 [設定変更] 「${def.name}」の自動更新を §l有効 (ON)§r§a に設定しました。期間満了時に自動引き落としされます。§r`);
      } else {
        player.sendMessage(`§e🔄 [設定変更] 「${def.name}」の自動更新を §l無効 (OFF)§r§e に設定しました。残り時間がゼロになると失効します。§r`);
      }
      openCarPerkManageUI(player, perkKey, blockLoc);
    } else if (res.selection === 2) {
      // Cancel
      cancelCarPerkSubscription(player, perkKey);
      player.sendMessage(`§c❌ [解約完了] 「${def.name}」のサブスクリプションを解約しました。§r`);
      openVehicleServiceUI(player, blockLoc);
    } else {
      openVehicleServiceUI(player, blockLoc);
    }
  });
}

// Scratch Lottery UI
function openScratchLotteryUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;

  const normalCost = Math.floor(5 * fedRate);
  const premiumCost = Math.floor(25 * fedRate);

  const form = new ActionFormData()
    .title("🎰 Misskey スクラッチくじ & ガチャ")
    .body(
      `口座残高: §a${bank.toLocaleString()} M§r (§b${(bank / fedRate).toFixed(2)} FED§r)\n\n` +
      `一攫千金を狙えるスクラッチくじです！\n` +
      `🌟 特等 (JACKPOT): §e10,000 FED (約150万M) ＋ ネザライトフル装備§r\n` +
      `🥇 1等: §61,000 FED§r / 🥈 2等: §b偉業のツール (予備)§r / 🥉 3等: §aスイーツ詰め合わせ§r`
    )
    .button(`🎲 通常スクラッチ (5 FED / 約${normalCost.toLocaleString()} M)`)
    .button(`💎 プレミアムスクラッチ (25 FED / 約${premiumCost.toLocaleString()} M)`)
    .button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0 || res.selection === 1) {
      const isPremium = res.selection === 1;
      const cost = isPremium ? premiumCost : normalCost;

      if (bank < cost) {
        player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
        openScratchLotteryUI(player, blockLoc);
        return;
      }

      setPlayerBankAccount(player, bank - cost);

      // Roll lottery
      const roll = Math.random() * 100;
      const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
      const jackpotRate = isPremium ? 1.0 : 0.2; // 1% or 0.2%
      const firstRate = isPremium ? 5.0 : 1.5;   // 5% or 1.5%
      const secondRate = isPremium ? 15.0 : 6.0;
      const thirdRate = isPremium ? 40.0 : 25.0;

      let resultMsg = "";
      let rewardM = 0;

      if (roll < jackpotRate) {
        // JACKPOT!
        rewardM = Math.floor(10000 * fedRate);
        if (inv) {
          inv.addItem(new ItemStack("minecraft:netherite_helmet", 1));
          inv.addItem(new ItemStack("minecraft:netherite_chestplate", 1));
          inv.addItem(new ItemStack("minecraft:netherite_leggings", 1));
          inv.addItem(new ItemStack("minecraft:netherite_boots", 1));
        }
        resultMsg = `§6🌟🎉【特等 JACKPOT 当選！！！】§r\n§e賞金 10,000 FED (${rewardM.toLocaleString()} M) ＋ ネザライトフル装備一式§6 を獲得しました！！！§r`;
        world.sendMessage(`§6📢 [Misskeyくじ速報] プレイヤー「${player.name}」がスクラッチくじで特等 JACKPOT (10,000 FED) に当選しました！！！§r`);
        player.dimension.spawnParticle("minecraft:large_explosion", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else if (roll < jackpotRate + firstRate) {
        // 1st Prize
        rewardM = Math.floor(1000 * fedRate);
        resultMsg = `§e🥇【1等 当選！！】§r\n§a賞金 1,000 FED (${rewardM.toLocaleString()} M)§e を獲得しました！§r`;
      } else if (roll < jackpotRate + firstRate + secondRate) {
        // 2nd Prize
        if (inv) inv.addItem(new ItemStack("mi:igyo_tool", 1));
        resultMsg = `§b🥈【2等 当選！】§r\n§e万能採掘ツール「偉業のツール」§b を獲得しました！§r`;
      } else if (roll < jackpotRate + firstRate + secondRate + thirdRate) {
        // 3rd Prize
        if (inv) {
          inv.addItem(new ItemStack("mi:pudding", 2));
          inv.addItem(new ItemStack("mi:nekomimi_pudding", 1));
          inv.addItem(new ItemStack("mi:baked_mochocho", 4));
        }
        resultMsg = `§a🥉【3等 当選！】§r\n§dプリン＆ベイクドモチョチョ詰め合わせ§a を獲得しました！§r`;
      } else {
        // 4th / Participation
        if (inv) inv.addItem(new ItemStack("mi:baked_mochocho", 1));
        resultMsg = `§7【参加賞】ベイクドモチョチョ × 1 を獲得しました。次回に期待！§r`;
      }

      if (rewardM > 0) {
        const curBal = getPlayerBankAccount(player);
        setPlayerBankAccount(player, curBal + rewardM);
      }

      player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });

      const resForm = new ActionFormData()
        .title("🎰 スクラッチ結果発表！")
        .body(`削った結果...\n\n${resultMsg}`)
        .button("🎲 もう一度引く")
        .button("🔙 戻る");

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

// Wealth Rank UI
function openWealthRankUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);

  const holdings = getPlayerStockHoldings(player);
  let stockValue = 0;
  for (const [code, count] of Object.entries(holdings)) {
    const stock = stockMarket.find(s => s.code === code);
    if (stock && count > 0) stockValue += stock.currentPrice * count;
  }

  const positions = getPlayerFxPositions(player);
  let fxTotal = 0;
  for (const pos of positions) {
    fxTotal += pos.margin;
    const pair = fxPairs.find(p => p.id === pos.pairId);
    if (pair) fxTotal += calculatePositionProfit(pos, pair.currentRate);
  }

  const totalM = cash + bank + stockValue + fxTotal;
  const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;
  const totalFed = totalM / fedRate;
  const myRank = getPlayerWealthRank(totalFed);

  let rankList = "";
  for (const r of WEALTH_RANKS) {
    const isCurrent = myRank.rankName === r.rankName ? " §e◀ あなたのランク§r" : "";
    rankList += `${r.badge} §f${r.rankName}§r (基準: ${r.minFed.toLocaleString()} FED)${isCurrent}\n§7${r.description}§r\n\n`;
  }

  const form = new ActionFormData()
    .title("👑 富豪ランキング & 称号システム")
    .body(
      `👤 現在の総資産: §6${totalM.toLocaleString()} M§r (§b${totalFed.toFixed(2)} FED§r)\n` +
      `現在の称号: ${myRank.badge} §l${myRank.rankName}§r\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `【称号・ランク一覧】\n\n` +
      rankList
    )
    .button("🔙 戻る");

  showFormSafe(player, form, () => {
    openFinancialPortalUI(player, blockLoc);
  });
}


// 2. ATM UI
function openAtmUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);

  const form = new ActionFormData()
    .title("🏦 Misskey銀行 ATM")
    .body(`所持現金: §e${cash.toLocaleString()} M§r\n口座残高: §a${bank.toLocaleString()} M§r\n\n操作を選択してください:`)
    .button(`💰 手持ちの現金を全額入金 (+${cash.toLocaleString()} M)`)
    .button("💵 10,000 M 出金 (10,000 M紙幣×1)")
    .button("💵 5,000 M 出金 (5,000 M紙幣×1)")
    .button("💵 1,000 M 出金 (1,000 M紙幣×1)")
    .button("🪙 500 M 出金 (500 M硬貨×1)")
    .button("🔢 金額を指定して出金")
    .button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      // Deposit all
      const dep = depositAllCash(player);
      if (dep > 0) {
        player.sendMessage(`§a🏦 [入金完了] 手持ちの現金 §e${dep.toLocaleString()} M§a を口座に入金しました！§r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else {
        player.sendMessage("§c⚠️ インベントリにMコインアイテムがありません。§r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 1) {
      if (withdrawCash(player, 10000)) {
        player.sendMessage("§a🏧 [出金完了] 口座から §e10,000 M§a を引き出しました。§r");
      } else {
        player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 2) {
      if (withdrawCash(player, 5000)) {
        player.sendMessage("§a🏧 [出金完了] 口座から §e5,000 M§a を引き出しました。§r");
      } else {
        player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 3) {
      if (withdrawCash(player, 1000)) {
        player.sendMessage("§a🏧 [出金完了] 口座から §e1,000 M§a を引き出しました。§r");
      } else {
        player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 4) {
      if (withdrawCash(player, 500)) {
        player.sendMessage("§a🏧 [出金完了] 口座から §e500 M§a を引き出しました。§r");
      } else {
        player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
      }
      openAtmUI(player, blockLoc);
    } else if (res.selection === 5) {
      // Custom amount withdraw
      const modal = new ModalFormData()
        .title("🔢 出金金額の指定")
        .textField(`出金したい金額を入力してください (口座残高: ${bank.toLocaleString()} M):`, "例: 30000");

      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openAtmUI(player, blockLoc);
          return;
        }
        const val = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(val) || val <= 0) {
          player.sendMessage("§c⚠️ 正しい金額を入力してください。§r");
        } else if (withdrawCash(player, val)) {
          player.sendMessage(`§a🏧 [出金完了] 口座から §e${val.toLocaleString()} M§a を引き出しました！§r`);
        } else {
          player.sendMessage("§c⚠️ 口座残高が不足しているか、インベントリに空きがありません。§r");
        }
        openAtmUI(player, blockLoc);
      });
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// 3. Item Sell / Exchange Shop UI
function openItemSellUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
  if (!inv) return;

  // Calculate sellable items in inventory
  const inventoryCounts: { [typeId: string]: number } = {};
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (!item) continue;
    if (SELLABLE_ITEMS.some(s => s.typeId === item.typeId)) {
      inventoryCounts[item.typeId] = (inventoryCounts[item.typeId] || 0) + item.amount;
    }
  }

  let totalSellValue = 0;
  for (const s of SELLABLE_ITEMS) {
    const count = inventoryCounts[s.typeId] || 0;
    totalSellValue += s.price * count;
  }

  const form = new ActionFormData()
    .title("🛒 買取・換金所")
    .body(
      `鉱石や特産品を売却して口座に Mコイン をチャージできます！\n` +
      `インベントリ内の換金可能アイテム総額: §e${totalSellValue.toLocaleString()} M§r\n\n` +
      `売却方法を選択してください:`
    )
    .button(`✨ 換金可能アイテムをすべて一括売却 (+${totalSellValue.toLocaleString()} M)`);

  for (const s of SELLABLE_ITEMS) {
    const count = inventoryCounts[s.typeId] || 0;
    form.button(`${s.name} (単価: ${s.price.toLocaleString()} M)\n[所持: ${count}個 / 価値: ${(s.price * count).toLocaleString()} M]`);
  }

  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      // Sell all
      if (totalSellValue <= 0) {
        player.sendMessage("§c⚠️ インベントリに売却可能なアイテムがありません。§r");
        openItemSellUI(player, blockLoc);
        return;
      }

      for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item && SELLABLE_ITEMS.some(s => s.typeId === item.typeId)) {
          inv.setItem(i, undefined);
        }
      }

      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + totalSellValue);
      player.sendMessage(`§a🛒 [売却完了] アイテムを一括売却し、§e${totalSellValue.toLocaleString()} M§a を口座にチャージしました！§r`);
      player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      openItemSellUI(player, blockLoc);
    } else if (res.selection <= SELLABLE_ITEMS.length) {
      // Individual item sell
      const chosen = SELLABLE_ITEMS[res.selection - 1];
      const count = inventoryCounts[chosen.typeId] || 0;
      if (count <= 0) {
        player.sendMessage(`§c⚠️ 「${chosen.name}」を所持していません。§r`);
        openItemSellUI(player, blockLoc);
        return;
      }

      // Remove items
      let remainingToRemove = count;
      for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item && item.typeId === chosen.typeId) {
          if (item.amount <= remainingToRemove) {
            remainingToRemove -= item.amount;
            inv.setItem(i, undefined);
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
      player.sendMessage(`§a🛒 [売却完了] ${chosen.name} × ${count} 個を売却し、§e${earned.toLocaleString()} 円§a を獲得しました！§r`);
      openItemSellUI(player, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// 4. FX Exchange UI
function openFxExchangeUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const positions = getPlayerFxPositions(player);

  const form = new ActionFormData()
    .title("📈 Misskey FX (為替取引所)")
    .body(
      `口座残高: §a${bank.toLocaleString()} M§r\n` +
      `為替レートはリアルタイムにランダム変動します。レバレッジをかけて買い(Long)や売り(Short)で為替差益を狙いましょう！\n\n` +
      `取引したい通貨ペアまたはポジションを選択してください:`
    );

  for (const pair of fxPairs) {
    const diff = pair.currentRate - pair.prevRate;
    const arrow = diff > 0 ? "§c▲" : (diff < 0 ? "§9▼" : "§7-");
    const diffText = `${arrow} ${pair.currentRate.toFixed(2)} M (${diff >= 0 ? "+" : ""}${diff.toFixed(2)})§r`;
    const chart = pair.history.map(h => h.toFixed(1)).join("→");
    form.button(`${pair.name}\n現在: ${diffText} [推移: ${chart}]`);
  }

  form.button(`💼 保有ポジション一覧・決済 (${positions.length}件)`);
  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

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

// FX Order Modal
function openFxOrderModal(player: Player, pair: FxPair, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const diff = pair.currentRate - pair.prevRate;
  const arrow = diff >= 0 ? "▲" : "▼";

  const modal = new ModalFormData()
    .title(`📈 FX注文: ${pair.name}`)
    .dropdown("注文タイプ:", ["🟢 買い (Long - 上昇で利益)", "🔴 売り (Short - 下落で利益)"], 0)
    .dropdown("レバレッジ倍率:", ["1倍 (現物相当)", "5倍 (標準)", "10倍 (ハイレバ)", "25倍 (超ハイリスク)"], 1)
    .textField(`証拠金 (口座から投入するMコイン / 口座残高: ${bank.toLocaleString()} M):`, "例: 10000", "5000");

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
      player.sendMessage("§c⚠️ 正しい証拠金額を入力してください。§r");
      openFxExchangeUI(player, blockLoc);
      return;
    }

    if (margin > bank) {
      player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
      openFxExchangeUI(player, blockLoc);
      return;
    }

    // Deduct margin from bank
    setPlayerBankAccount(player, bank - margin);

    const volume = (margin * leverage) / pair.currentRate;
    const newPos: FxPosition = {
      id: `pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
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
      `§a📈 [FX注文約定] ${pair.name} を ${type === "BUY" ? "買い(Long)" : "売り(Short)"} でエントリーしました！\n` +
      `§7レート: ${pair.currentRate.toFixed(2)} M | レバレッジ: ${leverage}倍 | 証拠金: ${margin.toLocaleString()} M | 取引数量: ${volume.toFixed(2)}§r`
    );
    openFxPositionsUI(player, blockLoc);
  });
}

// FX Positions List UI
function openFxPositionsUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const positions = getPlayerFxPositions(player);

  const form = new ActionFormData()
    .title("💼 保有FXポジション一覧")
    .body(positions.length === 0 ? "現在保有しているFXポジションはありません。「通貨ペア」を選んでエントリーしましょう！" : "決済したいポジションを選択してください:");

  for (const pos of positions) {
    const pair = fxPairs.find(p => p.id === pos.pairId);
    const curRate = pair ? pair.currentRate : pos.entryRate;
    const profit = calculatePositionProfit(pos, curRate);
    const sign = profit >= 0 ? "+" : "";
    const color = profit >= 0 ? "§a" : "§c";

    form.button(
      `${pair ? pair.name : pos.pairId} [${pos.type} / ${pos.leverage}倍]\n` +
      `約定: ${pos.entryRate.toFixed(2)} → 現在: ${curRate.toFixed(2)} | 損益: ${color}${sign}${profit.toLocaleString()} M§r`
    );
  }

  if (positions.length > 0) {
    form.button("💥 すべてのポジションを一括決済する");
  }
  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection < positions.length) {
      // Close single position
      const pos = positions[res.selection];
      const pair = fxPairs.find(p => p.id === pos.pairId);
      const curRate = pair ? pair.currentRate : pos.entryRate;
      const profit = calculatePositionProfit(pos, curRate);
      const returnAmount = Math.max(0, pos.margin + profit);

      positions.splice(res.selection, 1);
      setPlayerFxPositions(player, positions);

      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + returnAmount);

      const color = profit >= 0 ? "§a" : "§c";
      const sign = profit >= 0 ? "+" : "";
      player.sendMessage(`§a💼 [FX決済完了] ポジションを決済しました。損益: ${color}${sign}${profit.toLocaleString()} M§a (受取額: ${returnAmount.toLocaleString()} M)§r`);
      openFxPositionsUI(player, blockLoc);
    } else if (positions.length > 0 && res.selection === positions.length) {
      // Close all positions
      let totalReturn = 0;
      let totalProfit = 0;

      for (const pos of positions) {
        const pair = fxPairs.find(p => p.id === pos.pairId);
        const curRate = pair ? pair.currentRate : pos.entryRate;
        const profit = calculatePositionProfit(pos, curRate);
        totalProfit += profit;
        totalReturn += Math.max(0, pos.margin + profit);
      }

      setPlayerFxPositions(player, []);
      const curBal = getPlayerBankAccount(player);
      setPlayerBankAccount(player, curBal + totalReturn);

      const color = totalProfit >= 0 ? "§a" : "§c";
      const sign = totalProfit >= 0 ? "+" : "";
      player.sendMessage(`§a💼 [FX全決済完了] すべてのポジションを決済しました。合計損益: ${color}${sign}${totalProfit.toLocaleString()} M§a (受取額: ${totalReturn.toLocaleString()} M)§r`);
      openFxPositionsUI(player, blockLoc);
    } else {
      openFxExchangeUI(player, blockLoc);
    }
  });
}

// 5. Stock Market UI
function openStockMarketUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);

  const form = new ActionFormData()
    .title("🏢 Misskey 株式市場")
    .body(
      `口座残高: §a${bank.toLocaleString()} M§r\n` +
      `Misskey世界の有力企業の株式を売買できます。保有していると定期的に「配当金」も得られます！\n\n` +
      `銘柄を選択して詳細確認・購入・売却を行えます:`
    );

  for (const stock of stockMarket) {
    const diff = stock.currentPrice - stock.prevPrice;
    const arrow = diff > 0 ? "§c▲" : (diff < 0 ? "§9▼" : "§7-");
    const diffText = `${arrow} ${stock.currentPrice.toLocaleString()} M (${diff >= 0 ? "+" : ""}${diff.toLocaleString()})§r`;
    const myCount = holdings[stock.code] || 0;
    const holdText = myCount > 0 ? ` [保有: ${myCount}株]` : "";

    form.button(`${stock.name} (${stock.code})\n${diffText}${holdText}`);
  }

  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection < stockMarket.length) {
      const stock = stockMarket[res.selection];
      openStockDetailUI(player, stock, blockLoc);
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// Stock Detail & Trade UI
function openStockDetailUI(player: Player, stock: StockInfo, blockLoc?: { x: number, y: number, z: number }) {
  const bank = getPlayerBankAccount(player);
  const holdings = getPlayerStockHoldings(player);
  const myCount = holdings[stock.code] || 0;
  const myValue = stock.currentPrice * myCount;
  const chart = stock.history.map(h => h.toLocaleString()).join(" → ");

  const form = new ActionFormData()
    .title(`🏢 銘柄詳細: ${stock.name}`)
    .body(
      `【銘柄コード】: §e${stock.code}§r (${stock.sector})\n` +
      `【現在株価】: §6${stock.currentPrice.toLocaleString()} M§r (基準: ${stock.basePrice.toLocaleString()} M)\n` +
      `【配当利回り】: §a${(stock.dividendRate * 100).toFixed(1)}% / 周期§r\n` +
      `【企業概要】: ${stock.description}\n` +
      `【直近推移】: ${chart}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 あなたの保有数: §b${myCount} 株§r (評価額: ${myValue.toLocaleString()} M)\n` +
      `口座残高: §a${bank.toLocaleString()} M§r`
    )
    .button("🛒 この株を購入する")
    .button(myCount > 0 ? `💰 この株を売却する (保有: ${myCount}株)` : "🔒 売却不可 (未保有)")
    .button("🔙 銘柄一覧に戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      // Buy stock modal
      const maxBuy = Math.floor(bank / stock.currentPrice);
      const modal = new ModalFormData()
        .title(`🛒 株の購入: ${stock.name}`)
        .textField(`購入株数を入力してください (単価: ${stock.currentPrice.toLocaleString()} M / 最大: ${maxBuy}株):`, "例: 10", "1");

      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openStockDetailUI(player, stock, blockLoc);
          return;
        }
        const count = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(count) || count <= 0) {
          player.sendMessage("§c⚠️ 正しい株数を入力してください。§r");
        } else {
          const totalCost = stock.currentPrice * count;
          if (totalCost > bank) {
            player.sendMessage("§c⚠️ 口座残高が不足しています。§r");
          } else {
            setPlayerBankAccount(player, bank - totalCost);
            holdings[stock.code] = (holdings[stock.code] || 0) + count;
            setPlayerStockHoldings(player, holdings);
            player.sendMessage(`§a🛒 [購入完了] ${stock.name} を ${count} 株購入しました！（総額: ${totalCost.toLocaleString()} M）§r`);
            player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
          }
        }
        openStockDetailUI(player, stock, blockLoc);
      });
    } else if (res.selection === 1 && myCount > 0) {
      // Sell stock modal
      const modal = new ModalFormData()
        .title(`💰 株の売却: ${stock.name}`)
        .textField(`売却株数を入力してください (単価: ${stock.currentPrice.toLocaleString()} M / 保有: ${myCount}株):`, `最大: ${myCount}`, String(myCount));

      showFormSafe(player, modal, (mRes) => {
        if (mRes.canceled || !mRes.formValues) {
          openStockDetailUI(player, stock, blockLoc);
          return;
        }
        const count = parseInt(String(mRes.formValues[0]).trim());
        if (isNaN(count) || count <= 0 || count > myCount) {
          player.sendMessage("§c⚠️ 保有株数以下の正しい株数を入力してください。§r");
        } else {
          const totalEarned = stock.currentPrice * count;
          setPlayerBankAccount(player, bank + totalEarned);
          holdings[stock.code] = myCount - count;
          if (holdings[stock.code] <= 0) delete holdings[stock.code];
          setPlayerStockHoldings(player, holdings);
          player.sendMessage(`§a💰 [売却完了] ${stock.name} を ${count} 株売却し、§e${totalEarned.toLocaleString()} M§a を口座に受け取りました！§r`);
        }
        openStockDetailUI(player, stock, blockLoc);
      });
    } else {
      openStockMarketUI(player, blockLoc);
    }
  });
}

// 6. Market News UI (Stock & FX)
function openMarketNewsUI(player: Player, blockLoc?: { x: number, y: number, z: number }) {
  const form = new ActionFormData()
    .title("📰 Misskey 経済ニュース速報 (株式 & FX)")
    .body(
      marketNewsHistory.length === 0
        ? "現在配信中の重大ニュースはありません。市場は平常運転です。"
        : `最新の市場ニュース一覧 (全${marketNewsHistory.length}件):\n気になるニュースをタップして詳細を確認できます:`
    );

  for (const news of marketNewsHistory) {
    const icon = news.category === "fx" ? "🌐[為替]" : "🏢[株式]";
    const impactText = news.impactPercent >= 0 ? `+${news.impactPercent}%` : `${news.impactPercent}%`;
    form.button(`${icon} ${news.title}\n[影響: ${impactText}] ${news.content.substring(0, 20)}...`);
  }

  form.button("🔙 戻る");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;
    if (res.selection < marketNewsHistory.length) {
      const chosen = marketNewsHistory[res.selection];
      const categoryName = chosen.category === "fx" ? "🌐 外国為替 (FX) 市場ニュース" : "🏢 Misskey 株式市場ニュース";
      const impactSign = chosen.impactPercent >= 0 ? "+" : "";

      const detailForm = new ActionFormData()
        .title("📰 ニュース詳細速報")
        .body(
          `【カテゴリー】: §e${categoryName}§r\n` +
          `【見出し】: §l${chosen.title}§r\n` +
          `【市場への影響】: §a${chosen.targetCode} が ${impactSign}${chosen.impactPercent}% 変動§r\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `${chosen.content}`
        )
        .button("🔙 ニュース一覧に戻る");

      showFormSafe(player, detailForm, () => {
        openMarketNewsUI(player, blockLoc);
      });
    } else {
      openFinancialPortalUI(player, blockLoc);
    }
  });
}

// Quick Wallet Menu on M Item Sneak + Right Click
function openQuickWalletUI(player: Player) {
  const cash = countPlayerCash(player);
  const bank = getPlayerBankAccount(player);

  const form = new ActionFormData()
    .title("👛 お財布 & 口座クイックメニュー")
    .body(`所持現金: §e${cash.toLocaleString()} M§r\n口座残高: §a${bank.toLocaleString()} M§r`)
    .button(`💰 手持ちの現金を全額口座に入金 (+${cash.toLocaleString()} M)`)
    .button("💹 Misskey証券 & FX取引所を開く")
    .button("🔙 閉じる");

  showFormSafe(player, form, (res) => {
    if (res.canceled || res.selection === undefined) return;

    if (res.selection === 0) {
      const dep = depositAllCash(player);
      if (dep > 0) {
        player.sendMessage(`§a👛 [クイック入金] 手持ちの現金 §e${dep.toLocaleString()} M§a を口座に入金しました！§r`);
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
      } else {
        player.sendMessage("§c⚠️ インベントリにMコインアイテムがありません。§r");
      }
    } else if (res.selection === 1) {
      openFinancialPortalUI(player);
    }
  });
}

// ----------------------------------------------------
// 0.9. Pudding & Nekomimi Pudding Gimmicks (Silent & Smooth)
// ----------------------------------------------------

const puddingBounceMap = new Map<string, number>(); // posKey -> bounceCount
const playerLastBounceTimeMap = new Map<string, number>(); // playerId -> timestamp
const playerPuddingEatLock = new Map<string, number>(); // playerId -> last eat time (ms)

function handlePuddingEat(player: Player, block: any, isNekomimi: boolean) {
  const now = Date.now();
  const lastEat = playerPuddingEatLock.get(player.id) || 0;
  if (now - lastEat < 500) return; // Debounce duplicate triggers
  playerPuddingEatLock.set(player.id, now);

  const loc = block.location;
  const dim = player.dimension;

  system.run(() => {
    block.setType("minecraft:air");
    dim.spawnParticle("minecraft:heart_particle", { x: loc.x + 0.5, y: loc.y + 0.6, z: loc.z + 0.5 });
    dim.spawnParticle("minecraft:villager_happy", { x: loc.x + 0.5, y: loc.y + 0.8, z: loc.z + 0.5 });

    if (isNekomimi) {
      try {
        const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
        if (equippable) {
          equippable.setEquipment("Head" as any, new ItemStack("mi:nekomimi_ears", 1));
        }
      } catch (e) { }

      player.addEffect("speed", 6000, { amplifier: 0 }); // 5m Speed
      player.addEffect("slow_falling", 1200, { amplifier: 0 }); // 1m Slow Falling
    } else {
      player.addEffect("regeneration", 200, { amplifier: 0 });
    }
  });
}

// ----------------------------------------------------
// 0.7. Block Interaction (Pudding, Fediverse, Chest Ritual, Bed)
// ----------------------------------------------------
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;

  // 1. Bed Sleep Achievement
  if (block.typeId.includes("bed")) {
    grantAchievement(player, "suimin");
  }

  // 1.5. Smithing Table Interaction Tracking (鍛冶台アップグレード用)
  if (block.typeId === "minecraft:smithing_table") {
    playerSmithingTableOpenMap.set(player.id, Date.now());
  }

  // 2. Pudding Eating Gimmick
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

  // 3. Fediverse Instance Server & Note Board & PC Client UI
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
        player.sendMessage("§b💻 [PCクライアント] デスクトップPCを起動し、Misskeyクライアントを開きました！§r");
      } else if (blockType === "mi:laptop_pc") {
        player.sendMessage("§a💻 [ノートPC] ノートパソコンを開き、Misskeyに接続しました！§r");
      } else if (blockType === "mi:display_monitor") {
        player.sendMessage("§e🖥️ [モニター] 画面の電源を入れ、Misskeyタイムラインを表示しました！§r");
      }
      openNoteBoardUI(player, loc);
    });
    return;
  }

  // 4. 偉業のツール 儀式システム (11種類の偉業アイテムをチェストに入れて右クリック)
  if (block.typeId === "minecraft:chest" || block.typeId === "minecraft:trapped_chest") {
    try {
      const chestContainer = (block as any).getComponent("minecraft:inventory")?.container;
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

        const matchedSlots = new Map<string, number>();

        for (let i = 0; i < chestContainer.size; i++) {
          const item = chestContainer.getItem(i);
          if (!item) continue;
          if (requiredIgyoTypes.includes(item.typeId) && !matchedSlots.has(item.typeId)) {
            matchedSlots.set(item.typeId, i);
          }
        }

        // 11種類すべてがチェスト内に存在するか？
        if (matchedSlots.size === requiredIgyoTypes.length) {
          if (playerHasItem(player, "mi:igyo_tool")) {
            player.sendMessage("§e⚠️ [偉業の儀式] あなたはすでに「偉業のツール」を所持しています！§r");
          } else {
            event.cancel = true; // チェストUIを開かずに儀式を発動！
            const blockLoc = block.location;
            const dim = player.dimension;

            system.run(() => {
              try {
                // 11種類のアイテムをそれぞれ1個消費
                for (const [typeId, slotIdx] of matchedSlots.entries()) {
                  const item = chestContainer.getItem(slotIdx);
                  if (item) {
                    if (item.amount > 1) {
                      item.amount -= 1;
                      chestContainer.setItem(slotIdx, item);
                    } else {
                      chestContainer.setItem(slotIdx, undefined);
                    }
                  }
                }

                // 偉業のツールを生成
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

                // 神聖な儀式演出
                dim.spawnParticle("minecraft:totem_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:large_explosion", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.0, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:villager_happy", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.5, z: blockLoc.z + 0.5 });
                dim.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.8, z: blockLoc.z + 0.5 });

                player.sendMessage("§6🏆✨【偉業達成の儀式】11の偉業が共鳴し、万能なる「偉業のツール」が授けられた！§r");
                world.sendMessage(`§6📢 [Mi_Addon] プレイヤー「${player.name}」が11の偉業をすべて捧げ、「偉業のツール」を手に入れました！§r`);
              } catch (e) {
                console.warn("[Mi_Addon] Error during Igyo tool ritual: " + e);
              }
            });
            return;
          }
        }
      }
    } catch (e) { }
  }
});

// ----------------------------------------------------
// 0.8. 官営八幡製鉄所 (Ruined Steelworks) Generator
// ----------------------------------------------------
const generatedSteelworksLocations: { x: number, z: number }[] = [];

function generateYahataSteelworks(dimension: any, origin: { x: number, y: number, z: number }): boolean {
  const ox = Math.floor(origin.x);
  const oy = Math.floor(origin.y);
  const oz = Math.floor(origin.z);

  // 1. Foundation & Floor (18 x 18 Cobblestone / Deepslate Bricks)
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

  // 2. Brick Walls & Ruined Pillars
  for (let dy = 1; dy <= 8; dy++) {
    for (let dx = -8; dx <= 9; dx++) {
      for (let dz = -8; dz <= 9; dz++) {
        const isWall = (dx === -8 || dx === 9 || dz === -8 || dz === 9);
        const isPillar = (dx === -8 || dx === 9 || dx === 0) && (dz === -8 || dz === 9 || dz === 0);

        if (isPillar) {
          const b = dimension.getBlock({ x: ox + dx, y: oy + dy, z: oz + dz });
          if (b) b.setType("minecraft:deepslate_bricks");
        } else if (isWall) {
          // Semi-ruined brick wall with holes
          const isWindow = (dy >= 3 && dy <= 5) && (Math.abs(dx) % 4 === 2 || Math.abs(dz) % 4 === 2);
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

  // 3. Great Smelting Chimney (赤レンガの大煙突: 高度 +16, 頂上にキャンプファイヤー)
  const cx = ox - 5;
  const cz = oz - 5;
  for (let dy = 1; dy <= 16; dy++) {
    for (let cdx = -1; cdx <= 1; cdx++) {
      for (let cdz = -1; cdz <= 1; cdz++) {
        const b = dimension.getBlock({ x: cx + cdx, y: oy + dy, z: cz + cdz });
        if (b) {
          const isHollow = (cdx === 0 && cdz === 0 && dy < 16);
          if (isHollow) {
            b.setType("minecraft:air");
          } else if (dy === 16 && cdx === 0 && cdz === 0) {
            b.setType("minecraft:campfire"); // Smoke billowing
          } else {
            b.setType("minecraft:brick_block");
          }
        }
      }
    }
  }

  // 4. Central Blast Furnace & Smelting Trough (巨大高炉 & 溶鉱炉)
  const fx = ox + 3;
  const fz = oz + 3;
  for (let dy = 1; dy <= 4; dy++) {
    for (let fdx = -2; fdx <= 2; fdx++) {
      for (let fdz = -2; fdz <= 2; fdz++) {
        const b = dimension.getBlock({ x: fx + fdx, y: oy + dy, z: fz + fdz });
        if (b) {
          if (fdx === 0 && fdz === 0 && dy === 1) {
            b.setType("minecraft:lava"); // Molten iron
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

  // 5. Pipe Network & Iron Bars
  for (let pz = -4; pz <= 4; pz++) {
    const pipeB = dimension.getBlock({ x: ox, y: oy + 6, z: oz + pz });
    if (pipeB) pipeB.setType("minecraft:iron_bars");
  }

  // 6. Treasure Chests (産業革命のお宝チェスト)
  const chest1 = dimension.getBlock({ x: ox - 3, y: oy + 1, z: oz + 4 });
  if (chest1) {
    chest1.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (chest1 as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:iron_ingot", 16));
          inv.addItem(new ItemStack("minecraft:raw_iron", 24));
          inv.addItem(new ItemStack("minecraft:coal", 32));
          inv.addItem(new ItemStack("minecraft:blast_furnace", 2));
          inv.addItem(new ItemStack("mi:ecology_server", 1));
          inv.addItem(new ItemStack("mi:machida", 2));
          inv.addItem(new ItemStack("mi:tin_foil_hat", 1));
        }
      } catch (e) { }
    }, 2);
  }

  const chest2 = dimension.getBlock({ x: cx + 2, y: oy + 1, z: cz + 2 });
  if (chest2) {
    chest2.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (chest2 as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:iron_block", 3));
          inv.addItem(new ItemStack("mi:blob_aichi", 2));
          inv.addItem(new ItemStack("mi:sanjuu", 2));
          inv.addItem(new ItemStack("mi:gif", 2));
          inv.addItem(new ItemStack("mi:silenthill", 2));
          inv.addItem(new ItemStack("minecraft:golden_apple", 1));
        }
      } catch (e) { }
    }, 2);
  }

  // 7. Spawn Ambient Particles & Monster Guards
  for (let i = 0; i < 3; i++) {
    try {
      dimension.spawnEntity("mi:blebcat", { x: ox + (i - 1) * 3, y: oy + 1, z: oz + (i - 1) * 3 });
    } catch (e) { }
  }

  return true;
}

// ----------------------------------------------------
// 0.85. Misskey 開発所 (Misskey HQ Skyscraper) Generator
// ----------------------------------------------------
let lastMisskeyHQLocation: { x: number, y: number, z: number, dimensionId: string } | null = null;

function generateMisskeyHQ(dimension: any, origin: { x: number, y: number, z: number }): boolean {
  const ox = Math.floor(origin.x);
  const oy = Math.floor(origin.y);
  const oz = Math.floor(origin.z);

  // Helper safe block placer with optional BlockPermutation states (direction, etc)
  const setB = (dx: number, dy: number, dz: number, type: string, states?: Record<string, any>) => {
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
    } catch (e) { }
  };

  // 1. Foundation & Interior Air Clear (17x17 footprint, height 28)
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      setB(dx, -1, dz, "minecraft:deepslate_bricks");
      setB(dx, 0, dz, (dx + dz) % 2 === 0 ? "minecraft:quartz_block" : "minecraft:deepslate_tiles");

      for (let dy = 1; dy <= 22; dy++) {
        setB(dx, dy, dz, "minecraft:air");
      }
    }
  }

  // 2. Pillars, Walls & Modern Glass Curtain
  for (let dy = 1; dy <= 21; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        const isCorner = (dx === -8 || dx === 8) && (dz === -8 || dz === 8);
        const isPillar = isCorner || ((dx === 0 || dz === 0) && (dx === -8 || dx === 8 || dz === -8 || dz === 8));
        const isOuterWall = (dx === -8 || dx === 8 || dz === -8 || dz === 8);

        if (isPillar) {
          setB(dx, dy, dz, "minecraft:quartz_pillar");
        } else if (isOuterWall) {
          // Entrance Door on South (z = -8, x = -1..1, y = 1..3)
          if (dz === -8 && Math.abs(dx) <= 1 && dy <= 3) {
            setB(dx, dy, dz, "minecraft:air");
          } else {
            // Modern glass curtain wall
            const isWindowFloor = (dy >= 2 && dy <= 4) || (dy >= 7 && dy <= 9) || (dy >= 12 && dy <= 14) || (dy >= 17 && dy <= 19);
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

  // 3. Floors & Ceilings
  const floorLevels = [
    { y: 5, type: "minecraft:light_gray_concrete" }, // 2F Dev Office Floor
    { y: 10, type: "minecraft:smooth_stone" },       // 3F Server Room Floor
    { y: 15, type: "minecraft:red_wool" },          // 4F President Room Floor
    { y: 21, type: "minecraft:quartz_block" }       // Rooftop Floor
  ];

  for (const fl of floorLevels) {
    for (let dx = -7; dx <= 7; dx++) {
      for (let dz = -7; dz <= 7; dz++) {
        // Staircase opening area: dx: 4..6, dz: 4..6
        const isStairHole = (dx >= 5 && dx <= 6 && dz >= 3 && dz <= 6);
        if (!isStairHole) {
          setB(dx, fl.y, dz, fl.type);
        }
      }
    }
  }

  // Ceiling Lights (Sea Lanterns - Bright Modern Office Lighting)
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

  // 4. Wide 2-Block Straight Quartz Staircase (Interior z: 2..6, Zero Exterior Wall Breach)
  // Floors are at y: 0 (1F), y: 5 (2F), y: 10 (3F), y: 15 (4F), y: 21 (Roof)
  const stairBases = [0, 5, 10, 15];
  for (const yBase of stairBases) {
    // Clear head space strictly within interior room (x: 5..6, z: 2..6, y: 1..5) - Never touch z: 7..8!
    for (let cdx = 5; cdx <= 6; cdx++) {
      for (let cdz = 2; cdz <= 6; cdz++) {
        for (let cy = 1; cy <= 5; cy++) {
          setB(cdx, yBase + cy, cdz, "minecraft:air");
        }
      }
    }

    // Step 1 (z = 2, y = yBase + 1)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 1, 2, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }

    // Step 2 (z = 3, y = yBase + 2)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 1, 3, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 }); // Underside
      setB(cdx, yBase + 2, 3, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }

    // Step 3 (z = 4, y = yBase + 3)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 2, 4, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 }); // Underside
      setB(cdx, yBase + 3, 4, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }

    // Step 4 (z = 5, y = yBase + 4)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 3, 5, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 }); // Underside
      setB(cdx, yBase + 4, 5, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }

    // Step 5 (z = 6, y = yBase + 5 - connects flush to next floor level!)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 4, 6, "minecraft:quartz_stairs", { "upside_down_bit": true, "weirdo_direction": 3 }); // Underside
      setB(cdx, yBase + 5, 6, "minecraft:quartz_stairs", { "upside_down_bit": false, "weirdo_direction": 2 });
    }

    // Solid landing transition at z = 7 (Next floor walkway)
    for (let cdx = 5; cdx <= 6; cdx++) {
      setB(cdx, yBase + 5, 7, "minecraft:smooth_quartz");
    }
  }

  // ----------------------------------------------------
  // 5. Floor Furnishing & Gimmicks
  // ----------------------------------------------------

  // === 1F: Entrance Lobby (Flat Reception Desk, Lounge, Note Board, Instance Server) ===
  // Flat Quartz Counter Desk
  for (let rx = -4; rx <= -1; rx++) {
    setB(rx, 1, -4, "minecraft:smooth_quartz");
  }
  setB(-3, 2, -4, "mi:desktop_pc", { "minecraft:cardinal_direction": "south" });       // Facing receptionist (South)
  setB(-2, 2, -4, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });   // Facing receptionist (South)
  try {
    dimension.spawnEntity("mi:zabuton_blue", { x: ox - 3 + 0.5, y: oy + 1, z: oz - 5 + 0.5 });
  } catch (e) { }

  // Waiting Lounge (Zabutons & Planters)
  for (let lz = -4; lz <= -1; lz++) {
    try {
      dimension.spawnEntity(lz % 2 === 0 ? "mi:zabuton_red" : "mi:zabuton_yellow", { x: ox + 3.5, y: oy + 1, z: oz + lz + 0.5 });
    } catch (e) { }
  }
  setB(2, 1, -3, "minecraft:flower_pot");

  // Lobby Fediverse Wall
  setB(-7, 2, 0, "mi:note_board");
  setB(-7, 2, 1, "mi:instance_server");
  setB(-7, 1, 0, "minecraft:bookshelf");
  setB(-7, 1, 1, "minecraft:bookshelf");

  // === 2F: Developer Room (Solid Planks Desks, PCs, Monitors, Bio Server Prototype, Whiteboard) ===
  // Desk Island 1 (Solid flat table)
  for (let dx = -5; dx <= -2; dx++) {
    setB(dx, 6, -3, "minecraft:birch_planks");
    setB(dx, 6, -2, "minecraft:birch_planks");
  }
  // North-facing workers (z: -4 sitting)
  setB(-5, 7, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  setB(-4, 7, -3, "mi:desktop_pc", { "minecraft:cardinal_direction": "north" });
  setB(-3, 7, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });
  setB(-2, 7, -3, "mi:laptop_pc", { "minecraft:cardinal_direction": "north" });

  // South-facing workers (z: -1 sitting)
  setB(-5, 7, -2, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  setB(-4, 7, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "south" });
  setB(-3, 7, -2, "mi:desktop_pc", { "minecraft:cardinal_direction": "south" });
  setB(-2, 7, -2, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });

  // Dev Room Zabutons (North & South of table)
  try {
    dimension.spawnEntity("mi:zabuton_blue", { x: ox - 4 + 0.5, y: oy + 6, z: oz - 4 + 0.5 });
    dimension.spawnEntity("mi:zabuton_green", { x: ox - 3 + 0.5, y: oy + 6, z: oz - 4 + 0.5 });
    dimension.spawnEntity("mi:zabuton_red", { x: ox - 4 + 0.5, y: oy + 6, z: oz - 1 + 0.5 });
    dimension.spawnEntity("mi:zabuton_yellow", { x: ox - 3 + 0.5, y: oy + 6, z: oz - 1 + 0.5 });
  } catch (e) { }

  // Ecology Server Prototype in Dev Room
  setB(1, 6, -4, "mi:ecology_server_block", { "minecraft:cardinal_direction": "south" });
  setB(1, 7, -4, "mi:ecology_server_block", { "minecraft:cardinal_direction": "south" });

  // Whiteboard & Bookshelves
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

  // === 3F: Server Room & Meeting Room (Bio Server Rows & Solid Conference Table) ===
  for (let pz = -6; pz <= 3; pz++) {
    for (let py = 11; py <= 14; py++) {
      setB(0, py, pz, "minecraft:glass_pane");
    }
  }

  // Server Room (Two Rows of Ecology Servers & Instance Servers)
  for (let sz = -5; sz <= 2; sz += 2) {
    setB(-5, 11, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "east" });
    setB(-5, 12, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "east" });
    setB(-3, 11, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "west" });
    setB(-3, 12, sz, "mi:ecology_server_block", { "minecraft:cardinal_direction": "west" });
    setB(-4, 13, sz, "minecraft:iron_bars");
  }
  setB(-6, 11, -3, "mi:instance_server");
  setB(-6, 11, 0, "mi:instance_server");

  // Meeting Room (Solid Full Block Conference Table with Laptops)
  for (let mx = 2; mx <= 5; mx++) {
    for (let mz = -3; mz <= 1; mz++) {
      setB(mx, 11, mz, "minecraft:dark_oak_planks");
    }
  }

  // West side laptops facing West (towards x: 1 seats)
  setB(3, 12, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "west" });
  setB(3, 12, 0, "mi:laptop_pc", { "minecraft:cardinal_direction": "west" });

  // East side laptops facing East (towards x: 6 seats)
  setB(4, 12, -2, "mi:laptop_pc", { "minecraft:cardinal_direction": "east" });
  setB(4, 12, 0, "mi:laptop_pc", { "minecraft:cardinal_direction": "east" });

  // Presentation Monitors facing South
  setB(3, 12, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });
  setB(4, 12, -3, "mi:display_monitor", { "minecraft:cardinal_direction": "south" });

  // Conference Zabutons (Left & Right sides of table)
  for (let cz = -2; cz <= 0; cz++) {
    try {
      dimension.spawnEntity(cz % 2 === 0 ? "mi:zabuton_blue" : "mi:zabuton_green", { x: ox + 1.5, y: oy + 11, z: oz + cz + 0.5 });
      dimension.spawnEntity(cz % 2 === 0 ? "mi:zabuton_red" : "mi:zabuton_yellow", { x: ox + 6.5, y: oy + 11, z: oz + cz + 0.5 });
    } catch (e) { }
  }

  // Presentation Screen
  for (let sz = -3; sz <= 0; sz++) {
    for (let sy = 12; sy <= 14; sy++) {
      setB(7, sy, sz, "minecraft:black_concrete");
    }
  }



  // === 4F: President / Boss Room (Spacious Luxury Boss Arena) ===
  setB(0, 20, 0, "minecraft:sea_lantern");
  setB(0, 19, 0, "minecraft:end_rod");
  setB(-1, 19, 0, "minecraft:end_rod");
  setB(1, 19, 0, "minecraft:end_rod");
  setB(0, 19, -1, "minecraft:end_rod");
  setB(0, 19, 1, "minecraft:end_rod");

  // Executive Solid President Desk (Facing North towards sitting president)
  for (let px = -2; px <= 2; px++) {
    setB(px, 16, 4, "minecraft:dark_oak_planks");
  }
  setB(-1, 17, 4, "mi:display_monitor", { "minecraft:cardinal_direction": "north" }); // President Sub Monitor
  setB(0, 17, 4, "mi:desktop_pc", { "minecraft:cardinal_direction": "north" });       // President Desktop PC
  setB(1, 17, 4, "mi:display_monitor", { "minecraft:cardinal_direction": "north" });  // President Sub Monitor 2
  try {
    dimension.spawnEntity("mi:zabuton_red", { x: ox + 0.5, y: oy + 16, z: oz + 5 + 0.5 }); // President Zabuton
  } catch (e) { }

  // President's Custom Ecology Server Pillars
  setB(-4, 16, 5, "mi:ecology_server_block");
  setB(-4, 17, 5, "mi:ecology_server_block");
  setB(-4, 18, 5, "mi:ecology_server_block");



  // === Rooftop Deck & Fediverse Antenna (y = 22..28) ===
  for (let rx = -8; rx <= 8; rx++) {
    for (let rz = -8; rz <= 8; rz++) {
      const isEdge = (rx === -8 || rx === 8 || rz === -8 || rz === 8);
      if (isEdge) {
        setB(rx, 22, rz, "minecraft:iron_bars");
      }
    }
  }

  // Helipad "H" Marking
  for (let hx = -3; hx <= 3; hx++) {
    for (let hz = -3; hz <= 3; hz++) {
      const isH = (Math.abs(hx) === 2 && Math.abs(hz) <= 2) || (hz === 0 && Math.abs(hx) <= 2);
      setB(hx, 21, hz, isH ? "minecraft:yellow_concrete" : "minecraft:gray_concrete");
    }
  }

  // Fediverse Broadcasting Antenna Tower
  for (let ay = 22; ay <= 26; ay++) {
    setB(0, ay, 0, "minecraft:iron_bars");
  }
  setB(0, 27, 0, "minecraft:sea_lantern");
  setB(0, 28, 0, "minecraft:lightning_rod");

  registerMisskeyHQ({ x: ox, y: oy, z: oz, dimensionId: dimension.id });
  return true;
}

// ----------------------------------------------------
// 0.87. Misskey HQ Floor Dungeon & Spawning System (Robust & Multi-HQ Compatible)
// ----------------------------------------------------
// ----------------------------------------------------
// Misskey HQ Floor Clear & Active State Registry
// ----------------------------------------------------
const hqFloorActiveMap = new Map<string, {
  type: "floor1" | "floor2" | "floor3" | "floor4",
  hqLoc: { x: number, y: number, z: number },
  spawned: boolean,
  cleared: boolean
}>();

// Helper to spawn and fill reward chests
function spawnRewardChest(dimension: any, loc: { x: number, y: number, z: number }, rewardType: "lobby" | "dev" | "server" | "boss") {
  const chestKey = `${loc.x}_${loc.y}_${loc.z}`;
  if (spawnedChestLocationsSet.has(chestKey)) return; // Strictly prevent duplicate chest spawns!
  spawnedChestLocationsSet.add(chestKey);

  try {
    const block = dimension.getBlock(loc);
    if (!block) return;

    block.setType("minecraft:chest");
    dimension.spawnParticle("minecraft:totem_particle", { x: loc.x + 0.5, y: loc.y + 1.2, z: loc.z + 0.5 });
    dimension.spawnParticle("minecraft:large_explosion", { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 });

    system.runTimeout(() => {
      try {
        const inv = (block as any).getComponent("minecraft:inventory")?.container;
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
      } catch (e) { }
    }, 2);
  } catch (e) { }
}

const allMisskeyHQLocations: { x: number, y: number, z: number, dimensionId: string }[] = [];
const generatedHQLocations: { x: number, z: number }[] = [];
let plannedHQLocation: { x: number, z: number } | null = null;
const momoLastPetTimeMap = new Map<string, number>(); // playerId -> timestamp

const hqSpawnedFloors = new Set<string>(); // key: `${hqX}_${hqZ}_floor${floorNum}`
const spawnedChestLocationsSet = new Set<string>(); // key: `${x}_${y}_${z}`

// Hook into generateMisskeyHQ location saving (Deduplicated)
function registerMisskeyHQ(loc: { x: number, y: number, z: number, dimensionId: string }) {
  lastMisskeyHQLocation = loc;
  const exists = allMisskeyHQLocations.some(
    h => Math.abs(h.x - loc.x) < 16 && Math.abs(h.z - loc.z) < 16 && h.dimensionId === loc.dimensionId
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

      // Check if player is within HQ horizontal bounds (18x18 footprint: ±9 blocks)
      if (Math.abs(pLoc.x - hq.x) <= 9 && Math.abs(pLoc.z - hq.z) <= 9) {
        const relY = pLoc.y - hq.y;

        // 1F Entrance Lobby (y: 0..5) -> Spawn blebcat swarm
        const key1 = `${hq.x}_${hq.z}_floor1`;
        if (relY >= 0 && relY <= 5 && !hqSpawnedFloors.has(key1)) {
          hqSpawnedFloors.add(key1);
          hqFloorActiveMap.set(key1, { type: "floor1", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("§c⚠️ [1F エントランス] 警備 blebcat 部隊が現れた！§r");
          try {
            dim.spawnParticle("minecraft:totem_particle", { x: hq.x + 0.5, y: hq.y + 1.5, z: hq.z + 0.5 });
          } catch (e) { }

          const spawnCount = 6 + (players.length * 2);
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

        // 2F Dev Room (y: 5.5..10) -> Spawn hostile Misskey Researchers
        const key2 = `${hq.x}_${hq.z}_floor2`;
        if (relY >= 5.5 && relY <= 10 && !hqSpawnedFloors.has(key2)) {
          hqSpawnedFloors.add(key2);
          hqFloorActiveMap.set(key2, { type: "floor2", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("§c⚠️ [2F 開発室] 暴走したMisskey研究者たちが襲いかかってきた！§r");
          try {
            dim.spawnParticle("minecraft:totem_particle", { x: hq.x - 3, y: hq.y + 6.5, z: hq.z - 2 });
          } catch (e) { }

          const spawnCount = 4 + players.length;
          for (let i = 0; i < spawnCount; i++) {
            const sx = hq.x + (Math.random() * 4.0 - 1.0);
            const sz = hq.z + (Math.random() * 5.0 - 2.5);
            try {
              dim.spawnEntity("mi:researcher", { x: sx, y: hq.y + 6.2, z: sz });
            } catch (e) {
              console.warn("[Mi_Addon] Error spawning researcher: " + e);
            }
          }
        }

        // 3F Server Room (y: 10.5..15) -> Spawn hostile Murakami Tutinoko copies
        const key3 = `${hq.x}_${hq.z}_floor3`;
        if (relY >= 10.5 && relY <= 15 && !hqSpawnedFloors.has(key3)) {
          hqSpawnedFloors.add(key3);
          hqFloorActiveMap.set(key3, { type: "floor3", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("§c⚠️ [3F サーバー室] 生体サーバーから村上ツチノコ（複製体）が飛び出してきた！§r");
          try {
            dim.spawnParticle("minecraft:mob_portal", { x: hq.x - 4, y: hq.y + 11.5, z: hq.z });
          } catch (e) { }

          const spawnCount = 5 + players.length;
          for (let i = 0; i < spawnCount; i++) {
            const sx = hq.x + (Math.random() * 3.0 - 1.5);
            const sz = hq.z + (Math.random() * 4.0 - 2.0);
            try {
              dim.spawnEntity("mi:m_tutinoko_hostile", { x: sx, y: hq.y + 11.2, z: sz });
            } catch (e) {
              console.warn("[Mi_Addon] Error spawning m_tutinoko_hostile: " + e);
            }
          }
        }

        // 4F President Boss Room (y: 15.5..21) -> Spawn Boss: Murakami-san
        const key4 = `${hq.x}_${hq.z}_floor4`;
        if (relY >= 15.5 && relY <= 21 && !hqSpawnedFloors.has(key4)) {
          hqSpawnedFloors.add(key4);
          hqFloorActiveMap.set(key4, { type: "floor4", hqLoc: hq, spawned: true, cleared: false });
          player.sendMessage("§6⚔️ [4F 社長室] ボス：村上さんが現れた！「開発所へようこそ…覚悟はできているかね？」§r");
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
// ----------------------------------------------------
// ----------------------------------------------------
// Floor Mob Clear Monitoring Function & Loops
// ----------------------------------------------------
const completedFloorsSet = new Set<string>(); // key: `${hqX}_${hqZ}_${type}`

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

    // Only process floors where a player is currently present inside this specific HQ footprint (within 12 blocks horizontally)
    const hasPlayerInHQ = players.some(p => {
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
            p.sendMessage("§a🎉⚔️【1F エントランス 制覇！】警備 blebcat 部隊を全滅させました！ 報酬チェストが出現！§r");
          }
        }
      } catch (e) { }
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
            p.sendMessage("§a🎉⚔️【2F 開発室 制覇！】研究者部隊を全滅させました！ 報酬チェストが出現！§r");
          }
        }
      } catch (e) { }
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
            p.sendMessage("§a🎉⚔️【3F サーバー室 制覇！】ツチノコ複製軍団を全滅させました！ 報酬チェストが出現！§r");
          }
        }
      } catch (e) { }
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
            p.sendMessage("§6👑🏆【Misskey開発所 完全制覇！】ボス・村上さんを討伐しました！ 社長秘蔵の金庫マスターチェストが出現！§r");
          }
        }
      } catch (e) { }
    }
  }
}

// 1. Periodic Loop (Every 0.5s)
system.runInterval(() => {
  checkAllFloorClears();
}, 10);

// 2. Immediate Entity Death Event Check
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  const deadType = deadEntity?.typeId;

  // Zabuton Break Drop
  if (deadType && deadType.startsWith("mi:zabuton_")) {
    try {
      const dim = deadEntity.dimension;
      const loc = deadEntity.location;
      dim.spawnItem(new ItemStack(deadType, 1), loc);
      dim.spawnParticle("minecraft:smoke_particle", loc);
    } catch (e) { }
    return;
  }

  if (
    deadType === "mi:blebcat" ||
    deadType === "mi:researcher" ||
    deadType === "mi:m_tutinoko_hostile" ||
    deadType === "mi:murakami_boss"
  ) {
    system.runTimeout(() => {
      checkAllFloorClears();
    }, 2);
  }
});

// ----------------------------------------------------
// 0.88. Syuilo NPC Dialog & Misskey HQ Guide (Unified Stronghold System)
// ----------------------------------------------------
function getNearestOrPlannedHQ(player: Player): { x: number, z: number } {
  const pLoc = player.location;
  if (allMisskeyHQLocations.length > 0) {
    let minDist = Infinity;
    let nearest: { x: number, z: number } | null = null;
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
    // Stronghold-like Epic Distance: 1,800m - 2,400m away in an angular direction
    const angle = (Math.PI / 4) * (1 + (Math.abs(Math.floor(pLoc.x + 123)) % 7));
    const dist = 1800 + (Math.abs(Math.floor(pLoc.z + 456)) % 600);
    plannedHQLocation = {
      x: Math.round(pLoc.x + Math.cos(angle) * dist),
      z: Math.round(pLoc.z + Math.sin(angle) * dist)
    };
  }
  return plannedHQLocation;
}

function getCompassDirectionName(fromLoc: { x: number, z: number }, targetLoc: { x: number, z: number }): { dirName: string, dist: number } {
  const dx = targetLoc.x - fromLoc.x;
  const dz = targetLoc.z - fromLoc.z;
  const dist = Math.round(Math.sqrt(dx * dx + dz * dz));

  let dirName = "北 (North)";
  const deg = (Math.atan2(dz, dx) * 180 / Math.PI + 360 + 90) % 360;
  if (deg >= 337.5 || deg < 22.5) dirName = "北 (North)";
  else if (deg >= 22.5 && deg < 67.5) dirName = "北東 (North-East)";
  else if (deg >= 67.5 && deg < 112.5) dirName = "東 (East)";
  else if (deg >= 112.5 && deg < 157.5) dirName = "南東 (South-East)";
  else if (deg >= 157.5 && deg < 202.5) dirName = "南 (South)";
  else if (deg >= 202.5 && deg < 247.5) dirName = "南西 (South-West)";
  else if (deg >= 247.5 && deg < 292.5) dirName = "西 (West)";
  else dirName = "北西 (North-West)";

  return { dirName, dist };
}

function openSyuiloDialogUI(player: Player, syuiloEntity: any) {
  const form = new ActionFormData()
    .title("🏢 しゅいろ (Misskey)")
    .body("「やあ！ Misskey MC Addonへようこそ！\n何かお手伝いできることはありますか？」")
    .button("💬 世間話をする (開発トーク)")
    .button("🏢 Misskey開発所（本社ビル）の場所を聞く")
    .button("🔄 紛失した偉業の再チャレンジ (リセット)")
    .button("またね");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      // 💬 Casual dev talk
      const syuiloQuotes = [
        "§bしゅいろ: 「あ、どうも。Misskeyの開発、今日も元気にやってますよ。」§r",
        "§bしゅいろ: 「新機能のアイデア、思いついたらすぐ実装しちゃうタイプなんですよね。」§r",
        "§bしゅいろ: 「サーバーが落ちてないか、いつも心のどこかで気にしてます。」§r",
        "§bしゅいろ: 「絵文字リアクション、いっぱい増えてうれしいなあ。」§r",
        "§bしゅいろ: 「バグ報告はいつでも歓迎です。直せるかは別として。」§r",
        "§bしゅいろ: 「たまにはMinecraftで息抜きするのもいいものですね。」§r"
      ];
      const nextIndex = syuiloQuoteIndexMap.get(player.id) || 0;
      const quote = syuiloQuotes[nextIndex];
      syuiloQuoteIndexMap.set(player.id, (nextIndex + 1) % syuiloQuotes.length);

      player.sendMessage(quote);
      const loc = syuiloEntity.location;
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.6, z: loc.z });
    } else if (response.selection === 1) {
      // 🏢 Stronghold Scale HQ Location Guide
      const pLoc = player.location;
      const targetHQ = getNearestOrPlannedHQ(player);
      const { dirName, dist } = getCompassDirectionName(pLoc, targetHQ);

      player.sendMessage(`§6🏢📍【Misskey開発所（本社ビル）の遠征座標】§r`);
      player.sendMessage(`§f開発所ビルはここから遥か彼方の【§a${dirName}§f 方向 / 約 §e${dist}m 先§f（X: §b${targetHQ.x}§f, Z: §b${targetHQ.z}§f 付近）】に聳え立っているよ！§r`);
      player.sendMessage(`§7💡 エンド要塞のような長旅になるから車や食料を準備してね！ 道に迷ったら『生態サーバー』を右クリックすると電波で方角を教えてくれるよ！§r`);

      const loc = syuiloEntity.location;
      player.dimension.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 2.0, z: loc.z });
    } else if (response.selection === 2) {
      // 🔄 偉業の再チャレンジ (リセットUI)
      openAchievementRetryUI(player);
    }
  });
}

// ----------------------------------------------------
// 1. Rare Mob Drops
// ----------------------------------------------------
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

  let dropItemId: string | null = null;
  let chance = 0.15;

  if (typeId === "minecraft:zombie" || typeId === "minecraft:zombie_villager" || typeId === "minecraft:husk") dropItemId = "mi:blob_aichi";
  else if (typeId === "minecraft:skeleton" || typeId === "minecraft:stray") dropItemId = "mi:machida";
  else if (typeId === "minecraft:creeper") dropItemId = "mi:silenthill";
  else if (typeId === "minecraft:enderman") { dropItemId = "mi:sanjuu"; chance = 0.20; }
  else if (typeId === "minecraft:spider" || typeId === "minecraft:cave_spider") { dropItemId = "mi:gif"; chance = 0.20; }
  else if (typeId === "minecraft:phantom") { dropItemId = "mi:bunchou"; chance = 0.25; }

  if (dropItemId && Math.random() < chance) {
    dimension.spawnItem(new ItemStack(dropItemId, 1), location);
  }
});

// ----------------------------------------------------
// 1.5. Tin Foil Block Jamming
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
    } catch (e) { }
  }
});

// ----------------------------------------------------
// 2. Interaction Events (Syuilo, Momo, Cat, Yosano, Car, Reaction Wand)
// ----------------------------------------------------
function handleMomoPet(player: Player, momoEntity: any) {
  const now = Date.now();
  const lastPet = momoLastPetTimeMap.get(player.id) || 0;
  const dim = player.dimension;
  const mLoc = momoEntity.location;

  if (now - lastPet < 300000) { // 5 min cooldown
    const remainSec = Math.ceil((300000 - (now - lastPet)) / 1000);
    dim.spawnParticle("minecraft:heart_particle", { x: mLoc.x, y: mLoc.y + 1.2, z: mLoc.z });
    player.sendMessage(`§dモモ: ぽよぽよ…（なでなでされて嬉しそうにしている！ / クールダウン: 残り${remainSec}秒）§r`);
    return;
  }

  momoLastPetTimeMap.set(player.id, now);
  dim.spawnParticle("minecraft:heart_particle", { x: mLoc.x, y: mLoc.y + 1.5, z: mLoc.z });
  dim.spawnParticle("minecraft:totem_particle", { x: mLoc.x, y: mLoc.y + 1.2, z: mLoc.z });
  player.addEffect("hero_of_the_village", 6000, { amplifier: 0 }); // 5 min
  player.addEffect("regeneration", 1200, { amplifier: 0 }); // 1 min

  player.sendMessage("§d🌸✨ [モモ] ぽよん！ モモを優しくなでなでした！§r");
  player.sendMessage("§a幸運のバフ【村の英雄 (5分) & 再生 (1分)】を授かりました！§r");
}

world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;

  if (!target) return;

  // Syuilo Conversation & Misskey HQ Guide Dialog
  if (target.typeId === "mi:syuilo") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    system.run(() => {
      openSyuiloDialogUI(player, target);
    });
    return;
  }

  // Momo Petting & Lucky Buff
  if (target.typeId === "mi:momo") {
    event.cancel = true;
    system.run(() => {
      handleMomoPet(player, target);
    });
    return;
  }

  // Villager trade achievement (買い物の偉業)
  if (target.typeId === "minecraft:villager" || target.typeId === "minecraft:wandering_trader") {
    grantAchievement(player, "kaimono");
  }

  // Player-to-Player Direct DM shortcut (Shift + Right Click another player)
  if (target instanceof Player && player.isSneaking) {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    system.run(() => {
      openSendDMUI(player, undefined, target.name);
    });
    return;
  }

  // Reaction Wand usage
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

  // Car ride (License acquisition) & Dye Repainting
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

    if (itemStack) {
      const dyeMap: Record<string, { variant: number, name: string }> = {
        "minecraft:red_dye": { variant: 0, name: "赤 (Red)" },
        "minecraft:blue_dye": { variant: 1, name: "青 (Blue)" },
        "minecraft:yellow_dye": { variant: 2, name: "黄 (Yellow)" },
        "minecraft:green_dye": { variant: 3, name: "緑 (Green)" },
        "minecraft:white_dye": { variant: 4, name: "白 (White)" },
        "minecraft:black_dye": { variant: 5, name: "黒 (Black)" },
        "minecraft:purple_dye": { variant: 6, name: "紫 (Purple)" },
        "minecraft:pink_dye": { variant: 7, name: "ピンク (Pink)" },
        "minecraft:light_blue_dye": { variant: 8, name: "水色 (Light Blue)" },
        "minecraft:cyan_dye": { variant: 9, name: "シアン (Cyan)" },
        "minecraft:orange_dye": { variant: 10, name: "オレンジ (Orange)" },
        "minecraft:lime_dye": { variant: 11, name: "黄緑 (Lime)" },
        "minecraft:magenta_dye": { variant: 12, name: "マゼンタ (Magenta)" },
        "minecraft:brown_dye": { variant: 13, name: "茶色 (Brown)" },
        "minecraft:gray_dye": { variant: 14, name: "灰色 (Gray)" },
        "minecraft:light_gray_dye": { variant: 15, name: "薄灰色 (Light Gray)" }
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
              const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
              if (equippable) equippable.setEquipment("Mainhand" as any, undefined);
            }
          }

          player.sendMessage(`§a🎨 [Mi_Addon] 長い変な車を「${dye.name}」に再塗装しました！§r`);
        });
        return;
      }

      // Vehicle Repair / Healing Items (鉄・金・ネザライト・生態サーバー等で修理)
      const repairItems: Record<string, { healAmount: number, name: string, fullRepair?: boolean }> = {
        "minecraft:iron_ingot": { healAmount: 15, name: "鉄インゴット" },
        "minecraft:iron_block": { healAmount: 45, name: "鉄ブロック", fullRepair: true },
        "minecraft:gold_ingot": { healAmount: 25, name: "金インゴット" },
        "minecraft:gold_block": { healAmount: 45, name: "金ブロック", fullRepair: true },
        "minecraft:netherite_ingot": { healAmount: 45, name: "ネザライトインゴット", fullRepair: true },
        "mi:ecology_server": { healAmount: 45, name: "生態サーバー", fullRepair: true }
      };

      const repair = repairItems[itemStack.typeId];
      if (repair) {
        event.cancel = true;
        system.run(() => {
          const healthComp = target.getComponent(EntityComponentTypes.Health) as any;
          const isAccident = accidentCarsMap.has(target.id);
          const currentHp = healthComp ? healthComp.currentValue : 45;
          const maxHp = healthComp ? healthComp.effectiveMax : 45;

          if (!isAccident && currentHp >= maxHp) {
            player.sendMessage(`§e🚗 [Mi_Addon] この車両はすでに完全な状態です！（耐久度: ${currentHp}/${maxHp}）§r`);
            return;
          }

          // Consume 1 item
          decrementPlayerHeldItem(player);

          // Restore HP
          if (healthComp) {
            const newHp = Math.min(maxHp, currentHp + repair.healAmount);
            healthComp.setCurrentValue(newHp);
          }

          // If car was in crash accident, restore immediately!
          if (isAccident) {
            accidentCarsMap.delete(target.id);
          }

          // Particles and feedback
          const loc = target.location;
          const dim = target.dimension;
          dim.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.2, z: loc.z });
          dim.spawnParticle("minecraft:totem_particle", { x: loc.x, y: loc.y + 1.0, z: loc.z });
          dim.spawnParticle("minecraft:lava_particle", { x: loc.x, y: loc.y + 0.6, z: loc.z });

          const finalHp = healthComp ? healthComp.currentValue : 45;
          player.sendMessage(`§a🔧🚗 [車両修理] ${repair.name} を使って車両を修理・整備しました！（耐久度: §e${finalHp}/${maxHp}§a）§r`);
        });
        return;
      }
    }
  }

  if (!itemStack) return;

  // Cat + blob_aichi -> blobcat
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:blob_aichi") {
    event.cancel = true;
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;

      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) equippable.setEquipment("Mainhand" as any, undefined);
        }
      }

      target.remove();
      dim.spawnEntity("mi:blobcat", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("§a[Mi_Addon] 猫が にゃんぷっぷー (blobcat) に進化しました！§r");
    });
  }

  // Cat + silenthill -> woneko
  if (target.typeId === "minecraft:cat" && itemStack.typeId === "mi:silenthill") {
    event.cancel = true;
    system.run(() => {
      const loc = target.location;
      const dim = target.dimension;

      if (player.gameMode !== "creative") {
        if (itemStack.amount > 1) {
          itemStack.amount -= 1;
        } else {
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) equippable.setEquipment("Mainhand" as any, undefined);
        }
      }

      target.remove();
      dim.spawnEntity("mi:woneko", loc);
      dim.spawnParticle("minecraft:heart_particle", loc);
      player.sendMessage("§a[Mi_Addon] 猫が をねこ (woneko) に進化しました！§r");
    });
  }

  // Yosano + machida
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
          const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
          if (equippable) equippable.setEquipment("Mainhand" as any, undefined);
        }
      }

      dim.spawnParticle("minecraft:heart_particle", loc);

      if (loveLevel === 1) {
        player.sendMessage("§e与謝野晶子: 「あら…これが噂の『町田』ですの？ 素敵ですわ…！」§r");
      } else if (loveLevel === 2) {
        player.sendMessage("§e与謝野晶子: 「また町田をくださるなんて…私、あなたのことが好きになってしまいそう…§r");
      } else {
        player.sendMessage("§d与謝野晶子: 「あぁ！ 愛しています！ これをあなたに捧げますわ！」§r");
        dim.spawnItem(new ItemStack("mi:kanagawa", 1), loc);
        dim.spawnItem(new ItemStack("minecraft:ender_pearl", 2), loc);
        dim.spawnParticle("minecraft:ender_chest_portal_particle", loc);
        player.sendMessage("§d与謝野晶子 はエンダーパールを投げていずこかへ消え去った…§r");
        yosanoLoveMap.delete(entityId);
        target.remove();
      }
    });
  }
});

// ----------------------------------------------------
// 3. Entity Hurt Event (Unlicensed Attack on Car)
// ----------------------------------------------------
world.afterEvents.entityHurt.subscribe((event) => {
  const hurtEntity = event.hurtEntity;
  const damageSource = event.damageSource;
  const attacker = damageSource.damagingEntity;

  // 1. Murakami Tutinoko Copy Poison Attack (mi:m_tutinoko_hostile)
  if (attacker && attacker.typeId === "mi:m_tutinoko_hostile" && hurtEntity instanceof Player) {
    try {
      hurtEntity.addEffect("poison", 120, { amplifier: 1, showParticles: true }); // Poison II (6s)
      hurtEntity.addEffect("hunger", 160, { amplifier: 0, showParticles: true });
      const pLoc = hurtEntity.location;
      hurtEntity.dimension.spawnParticle("minecraft:villager_angry", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
    } catch (e) { }
  }

  // 2. Misskey Researcher Dangerous Chemical & Wave Debuff Attack (mi:researcher)
  if (attacker && attacker.typeId === "mi:researcher" && hurtEntity instanceof Player) {
    try {
      hurtEntity.addEffect("slowness", 160, { amplifier: 1, showParticles: true }); // Slowness II (8s)
      hurtEntity.addEffect("weakness", 160, { amplifier: 1, showParticles: true }); // Weakness II (8s)
      hurtEntity.addEffect("nausea", 120, { amplifier: 0, showParticles: true });   // Nausea (6s)
      hurtEntity.addEffect("darkness", 100, { amplifier: 0, showParticles: true }); // Darkness (5s)

      const pLoc = hurtEntity.location;
      const dim = hurtEntity.dimension;
      dim.spawnParticle("minecraft:smoke_particle", { x: pLoc.x, y: pLoc.y + 1.0, z: pLoc.z });
      dim.spawnParticle("minecraft:villager_angry", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
      dim.spawnParticle("minecraft:witch_spell_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
    } catch (e) { }
  }

  if (hurtEntity.typeId === "mi:regretcar" && attacker instanceof Player) {
    const playerId = attacker.id;

    if (!licensedPlayers.has(playerId) && !hasCarPerk(attacker, "gold_license")) {
      hurtEntity.triggerEvent("mi:become_angry");
      const cLoc = hurtEntity.location;
      const pLoc = attacker.location;

      attacker.dimension.spawnParticle("minecraft:villager_angry", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
      attacker.dimension.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
      attacker.sendMessage("§c🚗💨 [Mi_Addon] 無免許で車を攻撃したため、長い変な車が激怒して体当たりしてきた！§r");

      const dx = pLoc.x - cLoc.x;
      const dz = pLoc.z - cLoc.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      attacker.applyKnockback((dx / dist) * 1.5, (dz / dist) * 1.5, 1.2, 0.4);
      attacker.applyDamage(4);
    }
  }
});

// ----------------------------------------------------
// 3.5. Entity Die Event (Currency / Yen Drops & Expedition Achievement)
// ----------------------------------------------------
world.afterEvents.entityDie.subscribe((event) => {
  const deadEntity = event.deadEntity;
  if (!deadEntity) return;

  const loc = deadEntity.location;
  const dim = deadEntity.dimension;
  const typeId = deadEntity.typeId;

  system.run(() => {
    try {
      if (typeId === "minecraft:ender_dragon") {
        // Grant Expedition Achievement to all nearby players
        const players = dim.getPlayers({ location: loc, maxDistance: 128 });
        for (const p of players) {
          grantAchievement(p, "ensei");
        }
      } else if (typeId === "mi:murakami_boss") {
        // Boss drop: 20,000 - 50,000 yen!
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
        // Small pocket money
        if (Math.random() < 0.15) {
          const coin = Math.random() < 0.5 ? "mi:yen_10" : "mi:yen_5";
          dim.spawnItem(new ItemStack(coin, 1), loc);
        }
      }
    } catch (e) { }
  });
});

// ----------------------------------------------------
// 4. Item Complete Use (Baked Mochocho, Hydration & Food Achievements)
// ----------------------------------------------------
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();

  // 1. 水分補給の偉業 (ポーション・牛乳・水)
  if (
    itemStack.typeId === "minecraft:potion" ||
    itemStack.typeId.includes("potion") ||
    itemStack.typeId === "minecraft:milk_bucket" ||
    itemStack.typeId === "minecraft:water_bucket"
  ) {
    grantAchievement(player, "suibunhokyu");
  }

  // 2. 食事の偉業 (累計500個)
  const foodCount = (playerFoodEatCountMap.get(playerId) || 0) + 1;
  playerFoodEatCountMap.set(playerId, foodCount);
  if (foodCount >= 500) {
    grantAchievement(player, "shokuji");
  }

  // 3. ベイクドモチョチョ食べ過ぎギミック
  if (itemStack.typeId === "mi:baked_mochocho") {
    let state = mochochoEatMap.get(playerId) || { count: 0, lastEatTime: now };
    
    if (now - state.lastEatTime > 60000) {
      state.count = 0;
    }

    state.count += 1;
    state.lastEatTime = now;
    mochochoEatMap.set(playerId, state);

    const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    const headItem = equippable?.getEquipment("Head" as any);
    const isWearingTinFoil = headItem?.typeId === "mi:tin_foil_hat";

    if (state.count >= 5) {
      if (isWearingTinFoil) {
        player.sendMessage("§b🛡️ [Mi_Addon] ベイクドモチョチョを食べすぎたが、アルミホイルが吐き気電波を完全遮断した！§r");
      } else {
        player.addEffect("nausea", 300, { amplifier: 1 });
        player.addEffect("hunger", 300, { amplifier: 1 });
        player.sendMessage("§c[Mi_Addon] ベイクドモチョチョを1分間に食べすぎて(5個)、強烈な吐き気と空腹におそわれた…！§r");
      }
      mochochoEatMap.set(playerId, { count: 0, lastEatTime: now });
    } else {
      player.sendMessage(`§a[Mi_Addon] ベイクドモチョチョを美味しく食べた！ (1分間の摂取数: ${state.count}/5)§r`);
    }
  }

  if (itemStack.typeId === "minecraft:milk_bucket") {
    if (mochochoEatMap.has(playerId)) {
      mochochoEatMap.delete(playerId);
      player.sendMessage("§b[Mi_Addon] 牛乳を飲んで胃がすっきりした！（食べ過ぎカウントがリセットされました）§r");
    }
  }
});

// ----------------------------------------------------
// 5. Periodic Tick Loop
// ----------------------------------------------------
system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  const now = Date.now();

  // A. Tin Foil Hat Mental Protection & Wave Detection
  const players = overworld.getPlayers();
  for (const p of players) {
    // 1. 偉業判定: 貯金 (金インゴット/金塊/生の金/金ブロック所持)
    if (
      playerHasItem(p, "minecraft:gold_ingot") ||
      playerHasItem(p, "minecraft:gold_nugget") ||
      playerHasItem(p, "minecraft:raw_gold") ||
      playerHasItem(p, "minecraft:gold_block")
    ) {
      grantAchievement(p, "chokin");
    }

    // 2. 偉業判定: アップグレード (鍛冶台を使った直後のみ判定)
    const lastSmithingTime = playerSmithingTableOpenMap.get(p.id) || 0;
    if (now - lastSmithingTime < 15000) {
      const netheriteItems = [
        "minecraft:netherite_sword", "minecraft:netherite_pickaxe", "minecraft:netherite_axe",
        "minecraft:netherite_shovel", "minecraft:netherite_hoe", "minecraft:netherite_helmet",
        "minecraft:netherite_chestplate", "minecraft:netherite_leggings", "minecraft:netherite_boots"
      ];
      if (netheriteItems.some(item => playerHasItem(p, item))) {
        grantAchievement(p, "upgrade");
        playerSmithingTableOpenMap.delete(p.id);
      }
    }

    // 3. 偉業判定: 朝活 (リアル時間朝6時〜9時に累計30分プレイ)
    const currentHour = (new Date().getUTCHours() + 9) % 24; // JST
    if (currentHour >= 6 && currentHour < 9) {
      const pId = p.id;
      const playSecs = (playerAsakatsuPlaySecondsMap.get(pId) || 0) + 1;
      playerAsakatsuPlaySecondsMap.set(pId, playSecs);
      if (playSecs >= 1800) {
        grantAchievement(p, "asakatsu");
      }
    }

    const equippable = p.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
    const headItem = equippable?.getEquipment("Head" as any);
    if (headItem?.typeId === "mi:tin_foil_hat") {
      const pLoc = p.location;

      const debuffs = ["darkness", "blindness", "nausea", "bad_omen"];
      for (const debuff of debuffs) {
        if (p.getEffect(debuff as any)) {
          p.removeEffect(debuff as any);
          p.sendMessage("§b🛡️ [Mi_Addon] 陰謀論者のアルミホイルが怪電波・思考攻撃を反射・無効化した！§r");
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

  // A.5. All Dimensions: The End Detection, Ore Unlocks & Wealth Aura Particles
  for (const allP of world.getAllPlayers()) {
    // 1. 遠征の偉業判定: ジ・エンドに到達
    if (allP.dimension.id.includes("the_end")) {
      grantAchievement(allP, "ensei");
    }

    // 1.5. 鉱石購入アンロック判定 (ダイヤモンド & ネザライト)
    if (!allP.hasTag("unlocked_diamond")) {
      const diamondItems = [
        "minecraft:diamond", "minecraft:diamond_block", "minecraft:diamond_ore", "minecraft:deepslate_diamond_ore",
        "minecraft:diamond_sword", "minecraft:diamond_pickaxe", "minecraft:diamond_axe", "minecraft:diamond_shovel",
        "minecraft:diamond_hoe", "minecraft:diamond_helmet", "minecraft:diamond_chestplate", "minecraft:diamond_leggings", "minecraft:diamond_boots"
      ];
      if (diamondItems.some(it => playerHasItem(allP, it))) {
        allP.addTag("unlocked_diamond");
      }
    }

    if (!allP.hasTag("unlocked_netherite")) {
      if (
        playerHasItem(allP, "minecraft:netherite_ingot") ||
        playerHasItem(allP, "minecraft:netherite_scrap") ||
        playerHasItem(allP, "minecraft:ancient_debris") ||
        hasPlayerAchieved(allP, "upgrade")
      ) {
        allP.addTag("unlocked_netherite");
      }
    }

    // 2. 富豪オーラ & 称号エフェクト
    const cash = countPlayerCash(allP);
    const bank = getPlayerBankAccount(allP);
    const holdings = getPlayerStockHoldings(allP);
    let stockVal = 0;
    for (const [code, count] of Object.entries(holdings)) {
      const stock = stockMarket.find(s => s.code === code);
      if (stock && count > 0) stockVal += stock.currentPrice * count;
    }
    const totalAssets = cash + bank + stockVal;
    const fedRate = fxPairs.find(p => p.id === "FED_M")?.currentRate || 155.0;
    const totalFed = totalAssets / fedRate;
    const rank = getPlayerWealthRank(totalFed);

    if (rank.particle) {
      const loc = allP.location;
      try {
        allP.dimension.spawnParticle(rank.particle, { x: loc.x, y: loc.y + 0.2, z: loc.z });
        if (rank.rankName === "Misskeyの大株主") {
          allP.addEffect("speed", 30, { amplifier: 0, showParticles: false });
        }
      } catch (e) { }
    }

    // 3. 車両サービス（サブスクリプション）の自動更新 & 満了処理
    const perkKeysList: ("turbo" | "insurance" | "gold_license")[] = ["turbo", "insurance", "gold_license"];
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
            allP.sendMessage(`§b🚗💳 [車両サブスク] 「${perkDef.name}」の保険料（${perkDef.fedPrice} FED / 約 ${renewCost.toLocaleString()} M）を引き落とし、契約を30分間自動更新しました！§r`);
          } else {
            cancelCarPerkSubscription(allP, perkKey);
            allP.sendMessage(`§c⚠️ [車両サブスク] 口座残高不足のため「${perkDef.name}」の自動更新に失敗しました（必要額: ${renewCost.toLocaleString()} M）。契約が失効しました。§r`);
          }
        } else {
          cancelCarPerkSubscription(allP, perkKey);
          allP.sendMessage(`§7🚗 [車両サブスク] 「${perkDef.name}」の契約期間が満了しました。再度ご利用の際は金融ポータルからご加入ください。§r`);
        }
      }
    }
  }

  // B. Fediverse Instance Server Beacon Buffs
  for (const [posKey, inst] of instanceServerMap.entries()) {
    const [sx, sy, sz] = posKey.split(',').map(Number);
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

  // C. Woneko State & Blobcat Rival Effect Loop
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


  // E. Pudding Poyon-Poyon Bounce & Break Gimmick (Silent)
  for (const p of players) {
    const pLoc = p.location;
    const pId = p.id;
    const now = Date.now();
    const lastBounce = playerLastBounceTimeMap.get(pId) || 0;
    if (now - lastBounce < 350) continue;

    const bx = Math.floor(pLoc.x);
    const by = Math.floor(pLoc.y - 0.2);
    const bz = Math.floor(pLoc.z);

    try {
      const b = overworld.getBlock({ x: bx, y: by, z: bz });
      if (b && (b.typeId === "mi:pudding" || b.typeId === "mi:nekomimi_pudding")) {
        playerLastBounceTimeMap.set(pId, now);

        const posKey = `${bx},${by},${bz}`;
        const count = (puddingBounceMap.get(posKey) || 0) + 1;
        puddingBounceMap.set(posKey, count);

        // Silent Poyon-Poyon Bounce upward
        p.applyKnockback(0, 0, 0, 0.75);
        overworld.spawnParticle("minecraft:slime_particle", { x: bx + 0.5, y: by + 0.7, z: bz + 0.5 });

        if (count >= 5) {
          puddingBounceMap.delete(posKey);
          b.setType("minecraft:air");
          overworld.spawnParticle("minecraft:smoke_particle", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 });
          overworld.spawnParticle("minecraft:lava_particle", { x: bx + 0.5, y: by + 0.5, z: bz + 0.5 });
        }
      }
    } catch (e) { }
  }
  // D. Regretcar Wall Crash (Accident), Slopes & Traffic Jam Gimmick (Safe Loaded-Chunk Guarded)
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  const activeAccidentLocations: { x: number, y: number, z: number }[] = [];

  for (const car of cars) {
    if (!car.isValid()) continue;

    const cLoc = car.location;
    const carId = car.id;

    // Skip cars that are in unloaded or faraway chunks (Must be within 48m of an active player)
    let playerNearby = false;
    for (const p of players) {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - cLoc.x, 2) + Math.pow(pLoc.y - cLoc.y, 2) + Math.pow(pLoc.z - cLoc.z, 2);
      if (distSq <= 2304) { // 48m
        playerNearby = true;
        break;
      }
    }
    if (!playerNearby) continue;

    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId)!;
      if (now < recoveryTime) {
        try {
          car.addEffect("slowness", 30, { amplifier: 255, showParticles: false });
          overworld.spawnParticle("minecraft:smoke_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
          overworld.spawnParticle("minecraft:lava_particle", { x: cLoc.x, y: cLoc.y + 0.5, z: cLoc.z });
        } catch (e) { }
        activeAccidentLocations.push(cLoc);
        continue;
      } else {
        accidentCarsMap.delete(carId);
        try {
          overworld.spawnParticle("minecraft:heart_particle", { x: cLoc.x, y: cLoc.y + 1.5, z: cLoc.z });
          const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
          for (const p of nearbyPlayers) {
            p.sendMessage("§a🔧🚗 [Mi_Addon] 車両の応急修理が完了し、事故現場が復旧しました！§r");
          }
        } catch (e) { }
      }
    }

    const rideable = car.getComponent("minecraft:rideable") as any;
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    let isRidden = false;
    try {
      isRidden = riders.length > 0 || overworld.getPlayers({ location: cLoc, maxDistance: 2.5 }).length > 0;
    } catch (e) { }

    if (isRidden) {
      // Check if rider has Turbo upgrade
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
          } catch (e) { }
        }
        if (hasWallHit) break;
      }

      if (hasWallHit) {
        // Check if any rider has Car Insurance (Subscription)
        let hasInsuranceRider = false;
        for (const rider of riders) {
          if (rider instanceof Player) {
            const insStatus = getInsuranceStatus(rider);
            if (insStatus.active) {
              hasInsuranceRider = true;
              rider.sendMessage(`§b🛡️🚗 [車両保険発動] 車が大破したが、車両保険サブスクにより即座に現場修復されました！（残り時間: 約 ${insStatus.remainingMinutes} 分）§r`);
              overworld.spawnParticle("minecraft:totem_particle", { x: cLoc.x, y: cLoc.y + 1.2, z: cLoc.z });
              break;
            }
          }
        }

        if (!hasInsuranceRider) {
          accidentCarsMap.set(carId, now + 60000);
          activeAccidentLocations.push(cLoc);

          try {
            car.applyKnockback(-viewDir.x, -viewDir.z, 0.6, 0.2);
            overworld.spawnParticle("minecraft:large_explosion", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
            overworld.spawnParticle("minecraft:huge_explosion_emitter", { x: cLoc.x, y: cLoc.y + 0.8, z: cLoc.z });
            const nearbyPlayers = overworld.getPlayers({ location: cLoc, maxDistance: 32 });
            for (const p of nearbyPlayers) {
              p.sendMessage("§c💥🚗【交通事故発生！】車が壁に激突して大破しました！ 1分間 移動不能になります！§r");
            }
          } catch (e) { }
          continue;
        }
      }
    }

    let isSlope = false;
    try {
      const viewDir = car.getViewDirection();
      const groundBlockCurrent = overworld.getBlock({ x: Math.floor(cLoc.x), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z) });
      const groundBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2.0), y: Math.floor(cLoc.y - 0.5), z: Math.floor(cLoc.z + viewDir.z * 2.0) });
      const stepBlockFront = overworld.getBlock({ x: Math.floor(cLoc.x + viewDir.x * 2.0), y: Math.floor(cLoc.y + 0.5), z: Math.floor(cLoc.z + viewDir.z * 2.0) });

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
    } catch (e) { }

    let isNearAccident = false;
    for (const accLoc of activeAccidentLocations) {
      const distSq = Math.pow(cLoc.x - accLoc.x, 2) + Math.pow(cLoc.y - accLoc.y, 2) + Math.pow(cLoc.z - accLoc.z, 2);
      if (distSq <= 625) {
        isNearAccident = true;
        break;
      }
    }

    let nearbyEntities: any[] = [];
    let nearbyCars: any[] = [];
    try {
      nearbyEntities = overworld.getEntities({ location: cLoc, maxDistance: 64, excludeTypes: ["minecraft:item"] });
      nearbyCars = overworld.getEntities({ location: cLoc, maxDistance: 64, type: "mi:regretcar" });
    } catch (e) { }

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
    } catch (e) { }
  }

  for (const p of players) {
    const pLoc = p.location;
    const chunkX = Math.floor(pLoc.x / 64) * 64;
    const chunkZ = Math.floor(pLoc.z / 64) * 64;

    // 1. Natural Generation: 官営八幡製鉄所 (Yahata Steelworks)
    let alreadyExistsSteelworks = false;
    for (const loc of generatedSteelworksLocations) {
      const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
      if (distSq < 160000) { // 400m minimum spacing
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
      } catch (e) { }
    }

    // 2. Natural Generation: Misskey開発所 本社ビル (Misskey HQ Skyscraper)
    let shouldGenerateHQ = false;
    let hqGenX = 0;
    let hqGenZ = 0;

    if (plannedHQLocation) {
      const pDistSq = Math.pow(pLoc.x - plannedHQLocation.x, 2) + Math.pow(pLoc.z - plannedHQLocation.z, 2);
      const isAlreadyBuilt = allMisskeyHQLocations.some(
        h => Math.pow(h.x - plannedHQLocation!.x, 2) + Math.pow(h.z - plannedHQLocation!.z, 2) < 25600 // 160m
      );
      if (pDistSq <= 40000 && !isAlreadyBuilt) { // within 200m of planned stronghold location
        shouldGenerateHQ = true;
        hqGenX = plannedHQLocation.x;
        hqGenZ = plannedHQLocation.z;
      }
    }

    if (!shouldGenerateHQ) {
      let alreadyExistsHQ = false;
      for (const loc of generatedHQLocations) {
        const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
        if (distSq < 6250000) { // 2,500m minimum stronghold spacing
          alreadyExistsHQ = true;
          break;
        }
      }
      for (const loc of allMisskeyHQLocations) {
        const distSq = Math.pow(pLoc.x - loc.x, 2) + Math.pow(pLoc.z - loc.z, 2);
        if (distSq < 6250000) {
          alreadyExistsHQ = true;
          break;
        }
      }

      // Very rare random natural generation at high distance from origin
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
          world.sendMessage(`§6🏢⚡【大発見！】プレイヤー「${p.name}」が遥か彼方の要塞ダンジョン「Misskey開発所（本社ビル）」を発見・到達しました！§r`);
          if (plannedHQLocation && Math.abs(hqGenX - plannedHQLocation.x) < 48 && Math.abs(hqGenZ - plannedHQLocation.z) < 48) {
            plannedHQLocation = null;
          }
        }
      } catch (e) { }
    }
  }
}, 20);


// ----------------------------------------------------
// 0.86. Boss: Murakami-san Phase 2 "白鬼夜行 (Night of the White Phantoms)" (Triggers when HP <= 50%)
// ----------------------------------------------------
const murakamiLastSkillTimeMap = new Map<string, number>(); // entityId -> timestamp
const murakamiPhase2AnnouncedSet = new Set<string>(); // entityId -> boolean

system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  let murakamiBosses: any[] = [];
  try {
    murakamiBosses = overworld.getEntities({ type: "mi:murakami_boss" });
  } catch (e) { }

  const now = Date.now();

  for (const boss of murakamiBosses) {
    if (!boss.isValid()) continue;

    // Check Boss Health: Only trigger 白鬼夜行 when HP <= 50% (<= 175 HP)
    const healthComp = boss.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
    if (!healthComp) continue;

    const currentHp = healthComp.currentValue;
    const maxHp = healthComp.effectiveMax;
    const isEnraged = currentHp <= (maxHp * 0.5); // 50% HP or lower

    if (!isEnraged) continue; // Do not use 白鬼夜行 at full health!

    const bLoc = boss.location;

    // Find nearby players within 24 blocks
    const nearbyPlayers = overworld.getPlayers().filter(p => {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.y - bLoc.y, 2) + Math.pow(pLoc.z - bLoc.z, 2);
      return distSq <= 576; // 24m
    });

    if (nearbyPlayers.length === 0) continue;

    // First time entering Phase 2 Announcement
    if (!murakamiPhase2AnnouncedSet.has(boss.id)) {
      murakamiPhase2AnnouncedSet.add(boss.id);
      for (const p of nearbyPlayers) {
        p.sendMessage("§c🔥 [村上さん] 「ぐぬぬ…やるな…！ だがここからが本番だ！！」§r");
      }
    }

    const lastSkill = murakamiLastSkillTimeMap.get(boss.id) || 0;
    if (now - lastSkill >= 20000) { // Every 20 seconds during Phase 2
      murakamiLastSkillTimeMap.set(boss.id, now);

      // ⚡ Announce "白鬼夜行"
      for (const p of nearbyPlayers) {
        p.sendMessage("§c⚡ [村上さん] 「白鬼夜行（はっきやこう）の始まりだ…！ 我が複製体どもよ、侵入者を喰らい尽くせ！！」§r");
      }

      // Visual & Sound Effects
      try {
        overworld.spawnParticle("minecraft:mob_portal", { x: bLoc.x, y: bLoc.y + 1.5, z: bLoc.z });
        overworld.spawnParticle("minecraft:large_explosion", { x: bLoc.x, y: bLoc.y + 2, z: bLoc.z });
        overworld.spawnParticle("minecraft:sonic_explosion", { x: bLoc.x, y: bLoc.y + 1, z: bLoc.z });
      } catch (e) { }

      // 1. Shockwave Attack: Knockback all nearby players
      for (const p of nearbyPlayers) {
        const pLoc = p.location;
        const dist = Math.sqrt(Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.z - bLoc.z, 2));
        if (dist <= 10) {
          const kx = (pLoc.x - bLoc.x) / (dist || 1);
          const kz = (pLoc.z - bLoc.z) / (dist || 1);
          try {
            p.applyKnockback(kx, kz, 1.6, 0.6);
            p.applyDamage(3);
          } catch (e) { }
        }
      }

      // 2. Buff Murakami-san in Enraged State
      try {
        boss.addEffect("strength", 200, { amplifier: 0 }); // Strength I (10s)
        boss.addEffect("resistance", 160, { amplifier: 1 }); // Resistance II (8s)
        boss.addEffect("speed", 300, { amplifier: 1 }); // Speed II
      } catch (e) { }

      // 3. Summon White Phantoms (村上ツチノコ複製体 + 暴走研究者 + blebcat)
      const summonCount = 7 + (nearbyPlayers.length * 2);
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
              overworld.spawnEntity("mi:blebcat", { x: sx, y: bLoc.y + 1.0, z: sz });
            }
            overworld.spawnParticle("minecraft:mob_portal", { x: sx, y: bLoc.y + 1, z: sz });
          } catch (e) { }
        }, i * 2);
      }
    }
  }
}, 20);

// ----------------------------------------------------
// 0.85. Item Use Handlers (Igyo Tool Forging, Blueprints & Dokusho)
// ----------------------------------------------------
world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;

  // 0. 偉業 (`mi:igyo`) または 偉業アイテム右クリックによる「偉業のツール」錬成 / スニークで再チャレンジUI
  if (itemStack.typeId === "mi:igyo" || itemStack.typeId.endsWith("_ha_igyo")) {
    if (player.isSneaking) {
      openAchievementRetryUI(player);
      return;
    }

    const inv = (player.getComponent(EntityComponentTypes.Inventory) as any)?.container;
    if (inv) {
      // インベントリ内の11種の偉業アイテムのスロットを走査
      const foundSlots = new Map<string, number>();
      for (let i = 0; i < inv.size; i++) {
        const it = inv.getItem(i);
        if (it && ALL_IGYO_ITEMS.includes(it.typeId) && !foundSlots.has(it.typeId)) {
          foundSlots.set(it.typeId, i);
        }
      }

      const missingItems = ALL_IGYO_ITEMS.filter(typeId => !foundSlots.has(typeId));

      if (missingItems.length > 0) {
        // まだ揃っていない場合：進捗状況と不足している偉業一覧を表示
        const currentCount = ALL_IGYO_ITEMS.length - missingItems.length;
        player.sendMessage(`§e📜 [偉業の錬成] 現在の進捗: §6${currentCount} / 11§e 個§r`);
        player.sendMessage(`§7まだ達成・所持していない偉業 (${missingItems.length}個):§r`);
        for (const missing of missingItems) {
          const key = missing.replace("mi:", "").replace("_ha_igyo", "");
          const name = IGYO_NAMES[key] || key;
          const desc = IGYO_DESCRIPTIONS[key] || "";
          player.sendMessage(`§c・ ${name} §7(${desc})§r`);
        }
      } else {
        // 11種類すべて揃っている場合！
        if (playerHasItem(player, "mi:igyo_tool")) {
          player.sendMessage("§e⚠️ あなたはすでに「偉業のツール」を所持しています！§r");
        } else {
          // 11種類の偉業アイテムをインベントリから各1個消費
          for (const [typeId, slotIdx] of foundSlots.entries()) {
            const it = inv.getItem(slotIdx);
            if (it) {
              if (it.amount > 1) {
                it.amount -= 1;
                inv.setItem(slotIdx, it);
              } else {
                inv.setItem(slotIdx, undefined);
              }
            }
          }

          // 手持ちの mi:igyo も消費
          if (itemStack.typeId === "mi:igyo") {
            decrementPlayerHeldItem(player);
          }

          // 偉業のツールを生成して付与！
          const tool = new ItemStack("mi:igyo_tool", 1);
          tool.setLore([
            `§6偉業達成者: §f${player.name}§r`,
            `§e11の偉業を捧げて錬成された万能ツール§r`,
            `§7鍬・ツルハシ・斧・シャベルすべての能力を持つ§r`
          ]);

          inv.addItem(tool);

          // 豪華な儀式演出
          const pLoc = player.location;
          const dim = player.dimension;
          dim.spawnParticle("minecraft:totem_particle", { x: pLoc.x, y: pLoc.y + 1.5, z: pLoc.z });
          dim.spawnParticle("minecraft:large_explosion", { x: pLoc.x, y: pLoc.y + 1.2, z: pLoc.z });
          dim.spawnParticle("minecraft:villager_happy", { x: pLoc.x, y: pLoc.y + 2.0, z: pLoc.z });
          dim.spawnParticle("minecraft:heart_particle", { x: pLoc.x, y: pLoc.y + 2.2, z: pLoc.z });

          player.sendMessage("§6🏆✨【偉業達成の儀式】11の偉業が共鳴し、万能なる「偉業のツール」が授けられた！§r");
          world.sendMessage(`§6📢 [Mi_Addon] プレイヤー「${player.name}」が11の偉業をすべて捧げ、「偉業のツール」を錬成しました！§r`);
        }
      }
    }
  }

  // 1. 読書の偉業 (本・本と羽ペン・記入済みの本・エンチャント本)
  if (
    itemStack.typeId === "minecraft:book" ||
    itemStack.typeId === "minecraft:writable_book" ||
    itemStack.typeId === "minecraft:written_book" ||
    itemStack.typeId === "minecraft:enchanted_book"
  ) {
    grantAchievement(player, "dokusho");
  }

  // 2. Yahata Steelworks Blueprint (mi:yahata_blueprint)
  if (itemStack.typeId === "mi:yahata_blueprint") {
    const now = Date.now();
    const lastUse = blueprintCooldownMap.get(player.id) || 0;
    if (now - lastUse < 2000) return;
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
    player.sendMessage("§e🏭 [官営八幡製鉄所] 設計図を展開し、歴史ある製鉄所廃墟を建設中...！§r");
    try {
      dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
    } catch (e) { }

    system.runTimeout(() => {
      generateYahataSteelworks(dim, targetLoc);
      player.sendMessage("§a✨ 官営八幡製鉄所の遺構（廃墟ダンジョン）が目の前に現れました！§r");
      try {
        dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 4, z: targetLoc.z });
      } catch (e) { }
    }, 5);
    return;
  }

  // 3. Misskey HQ Blueprint (mi:hq_blueprint)
  if (itemStack.typeId === "mi:hq_blueprint") {
    const now = Date.now();
    const lastUse = blueprintCooldownMap.get(player.id) || 0;
    if (now - lastUse < 2000) return;
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
    player.sendMessage("§b🏢 [Misskey開発所] 設計図を展開し、開発所ビル（4階建てダンジョン）を建設中...！§r");
    try {
      dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });
      dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 6, z: targetLoc.z });
    } catch (e) { }

    system.runTimeout(() => {
      generateMisskeyHQ(dim, targetLoc);
      player.sendMessage("§a✨ Misskey開発所（4階建てダンジョン）の建設が完了しました！§r");
      try {
        dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 8, z: targetLoc.z });
      } catch (e) { }
    }, 5);
    return;
  }

  // 3.5. 生態サーバー (`mi:ecology_server`) によるエンダーアイ風レーダー探知
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

    // Beam particle trajectory upward towards HQ direction (Ender Eye style!)
    for (let step = 1; step <= 8; step++) {
      const px = pLoc.x + nx * step * 1.5;
      const py = pLoc.y + 1.2 + step * 0.4;
      const pz = pLoc.z + nz * step * 1.5;
      try {
        dim.spawnParticle("minecraft:witch_spell_particle", { x: px, y: py, z: pz });
        dim.spawnParticle("minecraft:totem_particle", { x: px, y: py, z: pz });
      } catch (e) { }
    }

    if (dist <= 200) {
      player.sendMessage(`§d⚡ [生態サーバー探知] 電波が超強力です！ Misskey開発所は目と鼻の先（約 §e${dist}m 先§d）にあります！§r`);
    } else {
      player.sendMessage(`§b📡 [生態サーバー探知] 開発所の電波をキャッチ！ 方角: 【§a${dirName}§b 方向 / 約 §e${dist}m 先§b（X: §f${targetHQ.x}§b, Z: §f${targetHQ.z}§b 付近）】§r`);
    }
    return;
  }

  // 4. 通貨アイテム (`mi:yen_*`) の使用 -> お財布 & 口座クイックメニュー
  if (itemStack.typeId.startsWith("mi:yen_")) {
    openQuickWalletUI(player);
    return;
  }
});

// ----------------------------------------------------
// 0.89. Block Break Events (Seichi, Josetsu & Tool Durability Consumption)
// ----------------------------------------------------
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const player = event.player;
  if (!player) return;
  const playerId = player.id;
  const blockPerm = event.brokenBlockPermutation;
  const blockTypeId = blockPerm?.type?.id || "";

  // 1. 整地の偉業 (土・草・砂・砂利など累計1000個)
  const groundKeywords = ["dirt", "grass", "podzol", "mycelium", "mud", "sand", "gravel", "clay"];
  if (groundKeywords.some(kw => blockTypeId.includes(kw))) {
    const count = (playerSeichiBreakCountMap.get(playerId) || 0) + 1;
    playerSeichiBreakCountMap.set(playerId, count);
    if (count >= 1000) {
      grantAchievement(player, "seichi");
    }
  }

  // 2. 除雪の偉業 (雪・粉雪など累計500個)
  if (blockTypeId.includes("snow")) {
    const count = (playerSnowBreakCountMap.get(playerId) || 0) + 1;
    playerSnowBreakCountMap.set(playerId, count);
    if (count >= 500) {
      grantAchievement(player, "josetsu");
    }
  }

  // 3. カスタムツール耐久値消費 & 耐久力（Unbreaking）エンチャント計算
  if (player.gameMode !== "creative") {
    try {
      const equippable = player.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
      if (!equippable) return;
      const handItem = equippable.getEquipment("Mainhand" as any);
      if (!handItem) return;

      const typeId = handItem.typeId;
      if (typeId === "mi:ota" || typeId === "mi:otaku_cry" || typeId === "mi:igyo_tool") {
        const durability = handItem.getComponent("minecraft:durability") as any;
        if (durability) {
          // Unbreaking レベル取得
          let unbreakingLevel = 0;
          const enchantable = handItem.getComponent("minecraft:enchantable") as any;
          if (enchantable) {
            const unbreaking = enchantable.getEnchantment("unbreaking");
            if (unbreaking) unbreakingLevel = unbreaking.level;
          }

          // 耐久力確率: 1 / (level + 1)
          const damageChance = 1 / (unbreakingLevel + 1);
          if (Math.random() < damageChance) {
            if (durability.damage + 1 >= durability.maxDurability) {
              // 道具破損
              equippable.setEquipment("Mainhand" as any, undefined);
              const pLoc = player.location;
              player.dimension.spawnParticle("minecraft:smoke_particle", { x: pLoc.x, y: pLoc.y + 0.8, z: pLoc.z });
              player.sendMessage("§c💥 [Mi_Addon] 道具が壊れてしまった！§r");
            } else {
              durability.damage += 1;
              equippable.setEquipment("Mainhand" as any, handItem);
            }
          }
        }
      }
    } catch (e) { }
  }
});

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
