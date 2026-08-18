# 🚀 Misskey MC Addon (Minecraft 統合版 アドオン)

[![Minecraft](https://img.shields.io/badge/Minecraft-Bedrock%201.21+-green.svg)](https://minecraft.net/)
[![Script API](https://img.shields.io/badge/@minecraft%2Fserver-1.11.0-blue.svg)](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/)
[![License](https://img.shields.io/badge/License-MIT-orange.svg)](LICENSE)

分散型SNS **「Misskey」** の世界観をMinecraft（統合版/Bedrock Edition）に完全再現した超大型アドオンです！  
個性豊かなマスコットキャラクターたち、攻略型ダンジョン、インスタンスサーバー設置やFediverse連合バフ、ゲーム内ノート掲示板、そして11種類の偉業システムなど、多彩な独自ギミックが満載です。

---

## 🌟 主な特徴 & 見どころ

### 🐱 1. 個性豊かなモブ・NPC・ボス
- **にゃんぷっぷー (`mi:nyanpuppu`) & をねこ (`mi:woneko`)**:
  - 猫に特定のアイテム（顔のついた愛知 / 静岡）を与えることで進化。
  - 体力が減ると泣き顔（`cry`）に変化し、回復すると元に戻るダイナミックな感情表現！
- **blebcat (`mi:blebcat`)**:
  - 俊敏に飛び跳ねる猫型モブ。倒すと生体サーバーや三重をドロップ。
- **与謝野晶子 (`mi:yosano`)**:
  - 普段は温厚ですが、攻撃を受けると即死級の大爆発・衝撃波・全方位レーザーを放つ！ 町田アイテムをプレゼントすると好感度が上昇。
- **村上ツチノコ (`mi:m_tutinoko`)**:
  - 生息地で野生化。生態サーバーで繁殖可能。倒すと「あんこ」をドロップ。
- **モモ (`mi:momo`) & しゅいろ (`mi:syuilo`)**:
  - モモを撫でると村の英雄＆再生効果のバフが付与。
  - しゅいろさんに話しかけると開発トークや本社ビルの位置ヒント、**紛失した偉業の再チャレンジ** が可能。
- **ボス：村上さん (`mi:murakami_boss`)**:
  - HP 300の最強ボス。HP 50%以下で **Phase 2「白鬼夜行」** が発動し、大軍勢を召喚！

---

### 🏢 2. 完全攻略型ダンジョン
- **Misskey開発所（本社ビル）**:
  - 全4フロア＋屋上ヘリポート完備の巨大ビルダンジョン。
  - 各階層に足を踏み入れると敵部隊が出現し、**全滅させた瞬間にのみ勝利報酬チェストが出現**！
  - 設計図（`mi:hq_blueprint`）を使うことで好きな場所に即時建築も可能。
- **官営八幡製鉄所**:
  - 大煙突・高炉・お宝チェストを備えた歴史ある製鉄所廃墟。設計図（`mi:yahata_blueprint`）でも建築可能。

---

### 🌐 3. Fediverse・ActivityPub & SNSシステム
- **インスタンスサーバー (`mi:instance_server`)**:
  - ブロックを設置し、他サーバーと連合（Federation）を結ぶことで、周囲に常時「移動速度上昇」＆「採掘速度上昇」のビーコンバフを展開！
- **ノート掲示板 (`mi:note_board`)**:
  - サーバー内のプレイヤー全員で共有できるタイムライン掲示板。投稿・閲覧・リアクションが可能。
- **ダイレクトメッセージ (DM)**:
  - プレイヤー同士でShift＋右クリック、またはサーバーから非公開メッセージを即時送受信。
- **絵文字チャット & デッキ**:
  - チャット欄に `:blobcat:` や `:ota:` と入力すると、ゲーム内独自フォントのカラー絵文字に自動変換！

---

### 🏆 4. 偉業システム & 万能「偉業のツール」
- **11種類の日常の偉業**:
  - 挨拶、睡眠、水分補給、朝活、貯金、読書、除雪、買い物、整地、アップグレード、食事。
  - 獲得アイテムのLore（説明文）に **達成者名が刻印** され、勝手に復活しない永続記憶仕様。
  - 紛失時はしゅいろさんまたは「偉業」アイテムからいつでも **再チャレンジ（リセット）** 可能。
- **万能「偉業のツール (`mi:igyo_tool`)」**:
  - 11種類すべての偉業を集めて「偉業 (`mi:igyo`)」を右クリックすると手元で直接錬成！
  - **鍬・ツルハシ・斧・シャベルすべての万能採掘性能**（採掘速度9）を持ち、鉄や生体サーバーで金床修理可能。

---

### 🚗 5. レグカー交通・家具・おもしろギミック
- **レグカー (`mi:regretcar`)**:
  - 染料を持って右クリックすることで全16色に再塗装可能。
  - 運転免許システム、時速40km以上の激突大破、前方に車がいるときの「渋滞検知」機能を搭載！
- **座布団スタック (`mi:zabuton_*`)**:
  - 全4色。座布団同士を右クリックすることでどこまでも高く積み上げ可能！
- **プリン & 猫耳プリン (`mi:pudding`, `mi:nekomimi_pudding`)**:
  - ブロックとして設置して右クリックで食べる。猫耳プリンを食べると猫耳（装飾）が頭に自動装着！
- **陰謀論者のアルミホイル帽子 & ブロック (`mi:tin_foil_hat`, `mi:tin_foil_block`)**:
  - 暗闇・吐き気・不吉な予感などの怪電波デバフを完全無効化。

---

## 📥 導入方法 (Installation)

### 動作環境
- **Minecraft 統合版 (Bedrock Edition)**: `v1.21.0` 以降
- **対応プラットフォーム**: Windows (PC), iOS, Android, Xbox, PlayStation, Nintendo Switch

### インストール手順
1. 本フォルダにある **`Mi.mcaddon`** をダブルクリック（またはMinecraftで開く）すると、自動的にビヘイビアーパック・リソースパックがインポートされます。
2. ワールド作成（または既存ワールドの設定）で以下を設定します：
   - **ビヘイビアーパック**: `Misskey Addon BP` を有効化
   - **リソースパック**: `Misskey Addon RP` を有効化
   - **実験的機能 (Experiments)**: **「ベータ API (Beta APIs)」** を必ず **ON** にしてください。

---

## 🛠️ 開発 & ビルド手順 (For Developers)

本アドオンは TypeScript と Node.js による自動ビルドシステムを採用しています。

### 必要ツール
- [Node.js](https://nodejs.org/) (v18.0.0 以上推奨)
- npm

### ビルド手順
```bash
# 依存パッケージのインストール
npm install

# アドオンのコンパイル & .mcaddon パッケージング
npm run build
```

- `npm run build` を実行すると以下の処理が自動で行われます：
  1. `k_emojis/` および `emojis/` のPNG画像から絵文字フォントグリフシート（`glyph_E1.png`, `glyph_E0.png`）を自動生成
  2. `src/main.ts` を esbuild でバンドルして `MiBP/scripts/main.js` へ出力
  3. 最新のパック構成を `Mi.mcaddon` に自動圧縮・出力

---

## 📖 公式ドキュメント (Wiki)

より詳しいアイテムレシピ、モブのドロップ確率、ダンジョンギミック解説は **[公式Wiki (Mi_MCAddon.wiki)](../Mi_MCAddon.wiki/Home.md)** をご覧ください。

- [🏠 Wiki ホーム (総合トップ)](../Mi_MCAddon.wiki/Home.md)
- [👾 エンティティ・モブ完全仕様](../Mi_MCAddon.wiki/Entities.md)
- [📦 アイテム・ブロック・全レシピ一覧](../Mi_MCAddon.wiki/Items-and-Recipes.md)
- [⚙️ ゲームシステム・ダンジョン・ギミック](../Mi_MCAddon.wiki/Mechanics.md)
- [🏆 偉業システム・ツール錬成](../Mi_MCAddon.wiki/Achievements.md)
- [🎨 絵文字コード表 & カスタム絵文字追加手順](../Mi_MCAddon.wiki/Emojis.md)
- [🔮 将来の検討・拡張機能](../Mi_MCAddon.wiki/Planned-Features.md)

---

## 📄 ライセンス & クレジット

- **開発**: Yon4800
- **Misskey Project**: [misskey-hub.net](https://misskey-hub.net/)
- 本アドオンは非公式のファンメイド・アドオンです。Mojang Studios および Misskey 公式とは直接の関係はありません。
