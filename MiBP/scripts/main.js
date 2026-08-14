// src/main.ts
import { world } from "@minecraft/server";
console.warn("[Mi_Addon] Script API Initialized!");
world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) {
    event.player.sendMessage("\xA7a[Mi_Addon] Welcome to the server! Mi_Addon is active.\xA7r");
  }
});
