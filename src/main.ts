import { world, system } from "@minecraft/server";

console.warn("[Mi_Addon] Script API Initialized!");

// Example: Send welcome message when a player spawns
world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) {
    event.player.sendMessage("§a[Mi_Addon] Welcome to the server! Mi_Addon is active.§r");
  }
});
