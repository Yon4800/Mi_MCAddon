import { world, system, ItemStack, EntityComponentTypes, EntityHealthComponent, EntityEquippableComponent, Player } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

console.warn("[Mi_Addon] Initializing Misskey MC Addon Scripts...");

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

// Global Fediverse State (Empty initial state, no sample notes)
const globalNotes: NoteItem[] = [];

const instanceServerMap = new Map<string, InstanceData>(); // blockPosKey -> InstanceData

// Safe UI Form display helper with automatic busy-retry loop
function showFormSafe(player: Player, form: any, onResponse: (response: any) => void) {
  let attempts = 0;
  const tryShow = () => {
    form.show(player as any).then((response: any) => {
      if (response && response.cancelationReason === "userBusy" && attempts < 10) {
        attempts++;
        system.runTimeout(tryShow, 2);
        return;
      }
      onResponse(response);
    }).catch(() => {});
  };
  system.runTimeout(tryShow, 1);
}

// Available Reaction Emojis
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

// Open Instance Server UI
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

// Open Note Board UI
function openNoteBoardUI(player: Player, blockLoc: { x: number, y: number, z: number }) {
  const form = new ActionFormData()
    .title("📋 Misskey ノートタイムライン")
    .body("Misskeyのタイムライン掲示板です。ノートを投稿したり、リアクションを送りましょう！")
    .button("📝 ノートを投稿する")
    .button("📜 タイムラインを見る / リアクション")
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
    }
  });
}

// Helper: Get summary of reactions on a note (e.g. "[🐱x2] [❤️x1]")
function getReactionSummary(note: NoteItem): string {
  const counts: Record<string, number> = {};
  for (const emoji of Object.values(note.reactions)) {
    counts[emoji] = (counts[emoji] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `[${k}x${v}]`).join(" ");
}

// Helper: Get list of reactors grouped by emoji
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

// View timeline list & select note
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

// Note detail, reaction picker & delete option
function openNoteDetailUI(player: Player, note: NoteItem, blockLoc: { x: number, y: number, z: number }) {
  const myReaction = note.reactions[player.name];
  const myReactText = myReaction ? ` (あなたのリアクション: ${myReaction})` : "";
  const reactorsText = getReactorsDetail(note);
  const isAuthorOrOp = note.author === player.name || player.isOp();

  const form = new ActionFormData()
    .title(`📝 ノート詳細: @${note.author}`)
    .body(`「${note.content}」\n\n💖 リアクション一覧:${myReactText}\n${reactorsText}`)
    .button(myReaction ? `🔄 リアクションを変更する (${myReaction})` : "💖 絵文字リアクションする");

  if (isAuthorOrOp) {
    form.button("🗑️ このノートを削除する");
  }
  form.button("🔙 タイムラインに戻る");

  showFormSafe(player, form, (response) => {
    if (response.canceled || response.selection === undefined) return;

    if (response.selection === 0) {
      // Emoji Picker
      const pickForm = new ActionFormData()
        .title("🎨 リアクション絵文字を選択")
        .body(myReaction ? `現在のリアクション: ${myReaction}\n別の絵文字を選ぶと上書き変更されます:` : "リアクションしたい絵文字を選んでください:");

      for (const opt of reactionOptions) {
        pickForm.button(`${opt.glyph} ${opt.label}`);
      }

      showFormSafe(player, pickForm, (pRes) => {
        if (pRes.canceled || pRes.selection === undefined) return;
        const chosen = reactionOptions[pRes.selection];

        // 1 reaction per player (overwrite)
        note.reactions[player.name] = chosen.glyph;

        player.dimension.spawnParticle("minecraft:heart_particle", { x: blockLoc.x + 0.5, y: blockLoc.y + 1.2, z: blockLoc.z + 0.5 });
        player.sendMessage(`§d💖 ${note.author} のノートに ${chosen.glyph} (${chosen.label}) でリアクションしました！§r`);
      });
    } else if (response.selection === 1 && isAuthorOrOp) {
      // Delete note
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

// Open Reaction Wand UI for entity/player
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
// 0.7. Block Interaction for Fediverse (instance_server & note_board)
// ----------------------------------------------------
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
