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
const yosanoLoveMap = new Map<string, number>();
const mochochoEatMap = new Map<string, { count: number, lastEatTime: number }>();
const licensedPlayers = new Set<string>();
const accidentCarsMap = new Map<string, number>();
const carPrevPosMap = new Map<string, { x: number, y: number, z: number }>();
const momoLuckCooldownMap = new Map<string, number>();
const syuiloQuoteIndexMap = new Map<string, number>();
const syuiloLastTalkTimeMap = new Map<string, number>();

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

    if (/^(hello|hi|hey|こんにちは|こんばんは|おはよう|おはようございます|やあ|やっほー)$/i.test(event.message.trim())) {
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
  if (!target) return;

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
    .title("📋 Misskey ノートタイムライン")
    .body("Misskeyのタイムライン掲示板です。ノートを投稿したり、DMを送受信しましょう！")
    .button("📝 ノートを投稿する")
    .button(`⚙️ 絵文字デッキをカスタマイズ (${deckCount}スロット)`)
    .button("📜 タイムラインを見る / リアクション")
    .button(`✉️ ダイレクトメッセージ (DM)${dmBadge}`)
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
// 0.7. Block Interaction for Fediverse (Single-Click Instant UI with event.cancel)
// ----------------------------------------------------
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
    if (!canOpenUI(player)) return;
    const loc = block.location;
    system.run(() => {
      openInstanceServerUI(player, loc);
    });
    return;
  }

  if (block.typeId === "mi:note_board") {
    event.cancel = true;
    if (!canOpenUI(player)) return;
    const loc = block.location;
    system.run(() => {
      openNoteBoardUI(player, loc);
    });
    return;
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
          b.setPermutation(BlockPermutation.resolve(type, states));
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
        const isStairHole = (dx >= 4 && dx <= 6 && dz >= 4 && dz <= 6);
        if (!isStairHole) {
          setB(dx, fl.y, dz, fl.type);
        }
      }
    }
  }

  // Ceiling Lights (Sea Lanterns)
  for (const ly of [5, 10, 15]) {
    setB(-4, ly, -4, "minecraft:sea_lantern");
    setB(-4, ly, 4, "minecraft:sea_lantern");
    setB(2, ly, -4, "minecraft:sea_lantern");
    setB(0, ly, 0, "minecraft:sea_lantern");
  }

  // 4. Stable U-Shaped Quartz Staircase between all floors
  // Floors are at y: 0 (1F), y: 5 (2F), y: 10 (3F), y: 15 (4F), y: 21 (Roof)
  const stairBases = [0, 5, 10, 15];
  for (const yBase of stairBases) {
    // Clear head space above stairs
    for (let cdx = 4; cdx <= 6; cdx++) {
      for (let cdz = 4; cdz <= 6; cdz++) {
        for (let cy = 1; cy <= 5; cy++) {
          setB(cdx, yBase + cy, cdz, "minecraft:air");
        }
      }
    }

    // Step 1
    setB(4, yBase + 1, 4, "minecraft:smooth_quartz");
    // Step 2
    setB(4, yBase + 2, 5, "minecraft:smooth_quartz");
    // Landing (Step 3)
    setB(4, yBase + 3, 6, "minecraft:smooth_quartz");
    setB(5, yBase + 3, 6, "minecraft:smooth_quartz");
    setB(6, yBase + 3, 6, "minecraft:smooth_quartz");
    // Step 4
    setB(6, yBase + 4, 5, "minecraft:smooth_quartz");
    // Step 5 (connects to next floor level)
    setB(6, yBase + 5, 4, "minecraft:smooth_quartz");
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

  // Lobby Welcome Chest
  const lobbyChest = dimension.getBlock({ x: ox - 6, y: oy + 1, z: oz - 5 });
  if (lobbyChest) {
    lobbyChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (lobbyChest as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:bread", 16));
          inv.addItem(new ItemStack("minecraft:cookie", 8));
          inv.addItem(new ItemStack("mi:pudding", 4));
          inv.addItem(new ItemStack("mi:reaction_wand", 1));
        }
      } catch (e) { }
    }, 2);
  }

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

  // Developer Supplies Chest
  const devChest = dimension.getBlock({ x: ox + 1, y: oy + 6, z: oz - 2 });
  if (devChest) {
    devChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (devChest as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("mi:ota", 1));
          inv.addItem(new ItemStack("mi:otaku_cry", 1));
          inv.addItem(new ItemStack("mi:baked_mochocho", 8));
          inv.addItem(new ItemStack("mi:tin_foil_hat", 1));
          inv.addItem(new ItemStack("minecraft:iron_ingot", 12));
        }
      } catch (e) { }
    }, 2);
  }

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

  // Server Admin Chest
  const serverChest = dimension.getBlock({ x: ox - 6, y: oy + 11, z: oz + 4 });
  if (serverChest) {
    serverChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (serverChest as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("mi:ecology_server", 2));
          inv.addItem(new ItemStack("mi:machida", 4));
          inv.addItem(new ItemStack("mi:blob_aichi", 3));
          inv.addItem(new ItemStack("mi:sanjuu", 3));
          inv.addItem(new ItemStack("mi:gif", 3));
          inv.addItem(new ItemStack("mi:silenthill", 3));
        }
      } catch (e) { }
    }, 2);
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

  // Executive Safe & Vault Treasure
  setB(4, 16, 4, "minecraft:gold_block");
  setB(4, 17, 4, "minecraft:iron_block");
  setB(5, 16, 4, "minecraft:diamond_block");
  setB(5, 17, 4, "minecraft:gold_block");

  const safeChest = dimension.getBlock({ x: ox + 4, y: oy + 16, z: oz + 5 });
  if (safeChest) {
    safeChest.setType("minecraft:chest");
    system.runTimeout(() => {
      try {
        const inv = (safeChest as any).getComponent("minecraft:inventory")?.container;
        if (inv) {
          inv.addItem(new ItemStack("minecraft:netherite_ingot", 1));
          inv.addItem(new ItemStack("minecraft:diamond", 8));
          inv.addItem(new ItemStack("minecraft:golden_apple", 3));
          inv.addItem(new ItemStack("mi:kanagawa", 1));
          inv.addItem(new ItemStack("mi:bunchou", 2));
          inv.addItem(new ItemStack("mi:nekomimi_pudding", 2));
        }
      } catch (e) { }
    }, 2);
  }

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

  lastMisskeyHQLocation = { x: ox, y: oy, z: oz, dimensionId: dimension.id };
  return true;
}

// ----------------------------------------------------
// 0.87. Misskey HQ Floor Dungeon & Spawning System
// ----------------------------------------------------
const hqSpawnedFloors = new Set<string>(); // key: `${hqX}_${hqZ}_floor${floorNum}`

system.runInterval(() => {
  if (!lastMisskeyHQLocation) return;
  const hq = lastMisskeyHQLocation;

  try {
    const dim = world.getDimension(hq.dimensionId);
    if (!dim) return;

    for (const player of world.getAllPlayers()) {
      if (player.dimension.id !== hq.dimensionId) continue;
      const pLoc = player.location;

      // Check if player is within HQ horizontal bounds (17x17 footprint)
      if (Math.abs(pLoc.x - hq.x) <= 8 && Math.abs(pLoc.z - hq.z) <= 8) {
        const relY = pLoc.y - hq.y;

        // 1F Entrance Lobby (y: 1..4) -> Spawn blebcat swarm
        const key1 = `${hq.x}_${hq.z}_floor1`;
        if (relY >= 1 && relY <= 4 && !hqSpawnedFloors.has(key1)) {
          hqSpawnedFloors.add(key1);
          player.sendMessage("§c⚠️ [1F エントランス] ぶれぶきゃっとの群れが現れた！§r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x, y: hq.y + 1.5, z: hq.z });
          for (let i = 0; i < 5; i++) {
            const sx = hq.x + (Math.random() * 6 - 3);
            const sz = hq.z + (Math.random() * 6 - 3);
            try { dim.spawnEntity("mi:blebcat", { x: sx, y: hq.y + 1, z: sz }); } catch (e) { }
          }
        }

        // 2F Dev Room (y: 6..9) -> Spawn hostile Misskey Researchers
        const key2 = `${hq.x}_${hq.z}_floor2`;
        if (relY >= 6 && relY <= 9 && !hqSpawnedFloors.has(key2)) {
          hqSpawnedFloors.add(key2);
          player.sendMessage("§c⚠️ [2F 開発室] 暴走したMisskey研究者たちが襲いかかってきた！§r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x - 3, y: hq.y + 6.5, z: hq.z - 2 });
          const spawnSpots = [
            { x: hq.x - 4, z: hq.z - 3 },
            { x: hq.x - 3, z: hq.z - 1 },
            { x: hq.x - 1, z: hq.z + 1 },
            { x: hq.x - 5, z: hq.z + 1 }
          ];
          for (const spot of spawnSpots) {
            try { dim.spawnEntity("mi:researcher", { x: spot.x + 0.5, y: hq.y + 6, z: spot.z + 0.5 }); } catch (e) { }
          }
        }

        // 3F Server Room (y: 11..14) -> Spawn hostile Murakami Tutinoko copies
        const key3 = `${hq.x}_${hq.z}_floor3`;
        if (relY >= 11 && relY <= 14 && !hqSpawnedFloors.has(key3)) {
          hqSpawnedFloors.add(key3);
          player.sendMessage("§c⚠️ [3F サーバー室] 生体サーバーから村上ツチノコ（複製体）が飛び出してきた！§r");
          dim.spawnParticle("minecraft:mob_portal", { x: hq.x - 4, y: hq.y + 11.5, z: hq.z });
          for (let i = 0; i < 5; i++) {
            const sz = hq.z + (i * 2 - 4);
            try { dim.spawnEntity("mi:m_tutinoko_hostile", { x: hq.x - 4 + 0.5, y: hq.y + 11, z: sz + 0.5 }); } catch (e) { }
          }
        }

        // 4F President Boss Room (y: 16..20) -> Spawn Boss: Murakami-san
        const key4 = `${hq.x}_${hq.z}_floor4`;
        if (relY >= 16 && relY <= 20 && !hqSpawnedFloors.has(key4)) {
          hqSpawnedFloors.add(key4);
          player.sendMessage("§6⚔️ [4F 社長室] ボス：村上さんが現れた！「開発所へようこそ…覚悟はできているかね？」§r");
          dim.spawnParticle("minecraft:totem_particle", { x: hq.x, y: hq.y + 16.5, z: hq.z + 2 });
          try { dim.spawnEntity("mi:murakami_boss", { x: hq.x + 0.5, y: hq.y + 16, z: hq.z + 2 + 0.5 }); } catch (e) { }
        }
      }
    }
  } catch (e) { }
}, 20);

// ----------------------------------------------------
// 0.88. Syuilo NPC Dialog & Misskey HQ Guide (1-Time Hint System)
// ----------------------------------------------------
const syuiloHintGivenPlayers = new Set<string>();

function openSyuiloDialogUI(player: Player, syuiloEntity: any) {
  const form = new ActionFormData()
    .title("🏢 しゅいろさん (Misskey)")
    .body("「やあ！ Misskey MC Addonへようこそ！\n何かお手伝いできることはありますか？」")
    .button("💬 世間話をする (開発トーク)")
    .button("🏢 Misskey開発所（本社ビル）の場所を聞く")
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
      // 🏢 1-Time Location Hint Exploration System
      const dim = player.dimension;

      // Determine world's unique HQ location if not already placed
      if (!lastMisskeyHQLocation || lastMisskeyHQLocation.dimensionId !== dim.id) {
        const pLoc = player.location;
        // Place HQ in a far, adventurous distance (e.g. +650, +650 from player)
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
        } catch (e) { }

        generateMisskeyHQ(dim, { x: targetX, y: groundY, z: targetZ });
      }

      const hq = lastMisskeyHQLocation!;
      const approxX = Math.round(hq.x / 50) * 50; // Approx coordinate for adventure hint
      const approxZ = Math.round(hq.z / 50) * 50;

      const playerId = player.id;
      if (!syuiloHintGivenPlayers.has(playerId)) {
        syuiloHintGivenPlayers.add(playerId);

        player.sendMessage("§b🏢 しゅいろ: 「Misskey開発所（本社ビル）だね！\n風の噂によると…ここから【北東】の方角、おおよそ §eX: " + approxX + " 付近, Z: " + approxZ + " 付近§b の平原にそびえ立っているらしいよ！§r");
        player.sendMessage("§d✨ [探索クエスト] 世界に数カ所しかない貴重な本社ビルです。自力で探検して目指してみよう！§r");
        player.dimension.spawnParticle("minecraft:totem_particle", { x: player.location.x, y: player.location.y + 1.5, z: player.location.z });
        player.dimension.spawnParticle("minecraft:villager_happy", { x: player.location.x, y: player.location.y + 2, z: player.location.z });
      } else {
        player.sendMessage("§b🏢 しゅいろ: 「開発所の場所のヒントはさっき教えたよ！ おおよそ §eX: " + approxX + " 付近, Z: " + approxZ + " 付近§b のあたりを探してみてね。無事にたどり着けるといいな！」§r");
      }
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
          dim.spawnParticle("minecraft:electric_spark_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          dim.spawnParticle("minecraft:smoke_particle", { x: loc.x, y: loc.y + 0.5, z: loc.z });
          if (entity.isValid()) entity.remove();
        });
        break;
      }
    } catch (e) { }
  }
});

// ----------------------------------------------------
// 2. Interaction Events (Cat, Yosano, Car, Reaction Wand)
// ----------------------------------------------------
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  const player = event.player;
  const target = event.target;
  const itemStack = event.itemStack;

  if (!target) return;


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

  if (hurtEntity.typeId === "mi:regretcar" && attacker instanceof Player) {
    const playerId = attacker.id;

    if (!licensedPlayers.has(playerId)) {
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
// 4. Item Complete Use (Baked Mochocho Overeat)
// ----------------------------------------------------
world.afterEvents.itemCompleteUse.subscribe((event) => {
  const player = event.source;
  const itemStack = event.itemStack;
  const playerId = player.id;
  const now = Date.now();

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
        overworld.spawnParticle("minecraft:electric_spark_particle", { x: pLoc.x, y: pLoc.y + 1.8, z: pLoc.z });
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

  // D. Regretcar Wall Crash (Accident), Slopes & Traffic Jam Gimmick
  const cars = overworld.getEntities({ type: "mi:regretcar" });
  const activeAccidentLocations: { x: number, y: number, z: number }[] = [];

  for (const car of cars) {
    const cLoc = car.location;
    const carId = car.id;

    if (accidentCarsMap.has(carId)) {
      const recoveryTime = accidentCarsMap.get(carId)!;
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
          p.sendMessage("§a🔧🚗 [Mi_Addon] 車両の応急修理が完了し、事故現場が復旧しました！§r");
        }
      }
    }

    const rideable = car.getComponent("minecraft:rideable") as any;
    const riders = rideable && typeof rideable.getRiders === "function" ? rideable.getRiders() : [];
    const isRidden = riders.length > 0 || overworld.getPlayers({ location: cLoc, maxDistance: 2.5 }).length > 0;

    if (isRidden) {
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
        accidentCarsMap.set(carId, now + 60000);
        activeAccidentLocations.push(cLoc);

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

    let isSlope = false;
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


// ----------------------------------------------------
// 0.85. Yahata Blueprint Item Use & Natural World Generation
// ----------------------------------------------------
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

    player.sendMessage("§e🏭 [官営八幡製鉄所] 設計図を展開し、歴史ある製鉄所廃墟を建設中...！§r");
    dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });

    system.runTimeout(() => {
      generateYahataSteelworks(dim, targetLoc);
      player.sendMessage("§a✨ 官営八幡製鉄所の遺構（廃墟ダンジョン）が目の前に現れました！§r");
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

    player.sendMessage("§b🏢 [Misskey開発所] 設計図を展開し、本社ビル（1F〜4F・屋上）を建築中...！§r");
    dim.spawnParticle("minecraft:large_explosion", { x: targetLoc.x, y: targetLoc.y + 2, z: targetLoc.z });

    system.runTimeout(() => {
      generateMisskeyHQ(dim, targetLoc);
      player.sendMessage("§a✨ Misskey開発所（本社ビル）が堂々完成しました！§r");
      player.sendMessage("§7💡 1F: ロビー | 2F: 開発室 | 3F: サーバールーム & 会議室 | 4F: 社長室 (ボス部屋) | 屋上: 連合アンテナ§r");
      dim.spawnParticle("minecraft:totem_particle", { x: targetLoc.x, y: targetLoc.y + 5, z: targetLoc.z });
    }, 5);
  }
});

// Periodic Random Natural Generation around exploring players
let worldGenTick = 0;
system.runInterval(() => {
  worldGenTick++;
  if (worldGenTick % 200 !== 0) return; // Check every 10 seconds

  const overworld = world.getDimension("overworld");
  const players = overworld.getPlayers();

  for (const p of players) {
    const pLoc = p.location;
    const chunkX = Math.floor(pLoc.x / 64) * 64;
    const chunkZ = Math.floor(pLoc.z / 64) * 64;

    // Check if steelworks already generated near this 64x64 chunk
    let alreadyExists = false;
    for (const loc of generatedSteelworksLocations) {
      const distSq = Math.pow(chunkX - loc.x, 2) + Math.pow(chunkZ - loc.z, 2);
      if (distSq < 160000) { // 400m minimum spacing
        alreadyExists = true;
        break;
      }
    }

    if (!alreadyExists && Math.random() < 0.15) { // 15% chance per chunk
      const genX = chunkX + Math.floor(Math.random() * 32) + 16;
      const genZ = chunkZ + Math.floor(Math.random() * 32) + 16;

      // Find surface ground
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
      } catch (e) { }
    }
  }
}, 20);


// ----------------------------------------------------
// 0.86. Boss: Murakami-san Special Skill "白鬼夜行 (Night of the White Phantoms)"
// ----------------------------------------------------
const murakamiLastSkillTimeMap = new Map<string, number>(); // entityId -> timestamp

system.runInterval(() => {
  const overworld = world.getDimension("overworld");
  let murakamiBosses: any[] = [];
  try {
    murakamiBosses = overworld.getEntities({ type: "mi:murakami_boss" });
  } catch (e) { }

  const now = Date.now();

  for (const boss of murakamiBosses) {
    if (!boss.isValid()) continue;
    const bLoc = boss.location;

    // Find nearby players within 24 blocks
    const nearbyPlayers = overworld.getPlayers().filter(p => {
      const pLoc = p.location;
      const distSq = Math.pow(pLoc.x - bLoc.x, 2) + Math.pow(pLoc.y - bLoc.y, 2) + Math.pow(pLoc.z - bLoc.z, 2);
      return distSq <= 576; // 24m
    });

    if (nearbyPlayers.length === 0) continue;

    const lastSkill = murakamiLastSkillTimeMap.get(boss.id) || 0;
    if (now - lastSkill >= 18000) { // Every 18 seconds
      murakamiLastSkillTimeMap.set(boss.id, now);

      // ⚡ Announce "白鬼夜行"
      for (const p of nearbyPlayers) {
        p.sendMessage("§c⚡ [村上さん] 「白鬼夜行（はっきやこう）の始まりだ…！ 我が複製体どもよ、侵入者を喰らい尽くせ！！」§r");
      }

      // Visual & Sound Effects
      overworld.spawnParticle("minecraft:mob_portal", { x: bLoc.x, y: bLoc.y + 1.5, z: bLoc.z });
      overworld.spawnParticle("minecraft:large_explosion", { x: bLoc.x, y: bLoc.y + 2, z: bLoc.z });
      overworld.spawnParticle("minecraft:sonic_explosion", { x: bLoc.x, y: bLoc.y + 1, z: bLoc.z });

      // 1. Shockwave Attack: Knockback all nearby players
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

      // 2. Buff Murakami-san
      boss.addEffect("strength", 200, { amplifier: 0 }); // Strength I (10s)
      boss.addEffect("resistance", 160, { amplifier: 1 }); // Resistance II (8s)
      boss.addEffect("speed", 300, { amplifier: 1 }); // Speed II

      // 3. Summon White Phantoms (村上ツチノコ複製体 + 暴走研究者 + blebcat)
      const summonCount = 6 + (nearbyPlayers.length * 3);
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

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
