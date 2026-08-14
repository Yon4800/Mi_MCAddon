const fs = require('fs');
const path = require('path');
const os = require('os');

const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) {
  console.error("LOCALAPPDATA environment variable not found.");
  process.exit(1);
}

const comMojangPath = path.join(
  localAppData,
  'Packages',
  'Microsoft.MinecraftUWP_8wekyb3d8bbwe',
  'LocalState',
  'games',
  'com.mojang'
);

if (!fs.existsSync(comMojangPath)) {
  console.warn("com.mojang folder not found at standard UWP path:", comMojangPath);
  console.warn("Make sure Minecraft Bedrock Edition is installed.");
  process.exit(0);
}

const targetBP = path.join(comMojangPath, 'development_behavior_packs', 'MiBP');
const targetRP = path.join(comMojangPath, 'development_resource_packs', 'MiRP');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("Deploying MiBP to:", targetBP);
copyRecursive(path.resolve(__dirname, '../MiBP'), targetBP);

console.log("Deploying MiRP to:", targetRP);
copyRecursive(path.resolve(__dirname, '../MiRP'), targetRP);

console.log("Successfully deployed to development folders!");
