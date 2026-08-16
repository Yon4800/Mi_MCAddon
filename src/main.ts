import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent, EntityEquippableComponent, Player } from "@minecraft/server";
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
  ":blobcat:": "",
  ":woneko:": "",
  ":aichi:": "",
  ":blob_aichi:": "",
  ":mochocho:": "",
  ":baked_mochocho:": "",
  ":ota:": "",
  ":otaku_cry:": "",
  ":blebcat:": "",
  ":regretcar:": "",
  ":yosano:": "",
  ":tutinoko:": "",
  ":tinfoil:": ""
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
    const now = Date.now();
    const lastTime = syuiloLastTalkTimeMap.get(player.id) || 0;
    if (now - lastTime < 500) return;
    syuiloLastTalkTimeMap.set(player.id, now);

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

    system.run(() => {
      player.sendMessage(quote);
      const loc = target.location;
      player.dimension.spawnParticle("minecraft:villager_happy", { x: loc.x, y: loc.y + 1.8, z: loc.z });
      player.dimension.spawnParticle("minecraft:heart_particle", { x: loc.x, y: loc.y + 1.6, z: loc.z });
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
  { label: "にゃんぷっぷー", glyph: "" },
  { label: "をねこ", glyph: "" },
  { label: "愛知", glyph: "" },
  { label: "モチョチョ", glyph: "" },
  { label: "オタクくん", glyph: "" },
  { label: "blebcat", glyph: "" },
  { label: "長い変な車", glyph: "" },
  { label: "与謝野晶子", glyph: "" },
  { label: "ツチノコ", glyph: "" },
  { label: "アルミホイル", glyph: "" },
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

function openNoteBoardUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const unreadCount = directMessages.filter(m => m.recipient === player.name && !m.read).length;
  const dmBadge = unreadCount > 0 ? ` (${unreadCount}件未読)` : "";

  const form = new ActionFormData()
    .title("📋 Misskey ノートタイムライン")
    .body("Misskeyのタイムライン掲示板です。ノートを投稿したり、DMを送受信しましょう！")
    .button("📝 ノートを投稿する")
    .button("📜 タイムラインを見る / リアクション")
    .button(`✉️ ダイレクトメッセージ (DM)${dmBadge}`)
    .button("閉じる");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      const modal = new ModalFormData()
        .title("📝 新規ノートの投稿")
        .textField("いまなにしてる？ (本文)", "例: 今日はブランチマイニングでダイヤ見つけた！");

      showFormSafe(player, modal, (res) => {
        if (res.canceled || !res.formValues) return;
        const text = String(res.formValues[0]).trim();
        if (text) {
          const newNote: NoteItem = {
            id: `note_${Date.now()}`,
            author: player.name,
            instance: "local.misskey",
            content: text,
            timestamp: Date.now(),
            reactions: {}
          };
          globalNotes.unshift(newNote);
          if (globalNotes.length > 50) globalNotes.pop();

          player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
          world.sendMessage(`§a📢 [${player.name}@local.misskey] がノートを投稿しました: 「${text}」§r`);
        }
      });
    } else if (response.selection === 1) {
      openTimelineListUI(player, blockLoc);
    } else if (response.selection === 2) {
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
// 0.7. Block Interaction for Fediverse (Single-Click Instant UI with event.cancel)
// ----------------------------------------------------
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const block = event.block;
  const player = event.player;

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

console.warn("[Mi_Addon] All Scripts Loaded & Running Successfully!");
