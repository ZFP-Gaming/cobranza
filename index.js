require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const START_DATE = new Date("2020-08-02T00:00:00");

function daysSinceStart(now = new Date()) {
  const start = new Date(START_DATE.getTime());
  start.setHours(0, 0, 0, 0);
  const current = new Date(now.getTime());
  current.setHours(0, 0, 0, 0);
  const diffMs = current - start;
  return Math.floor(diffMs / 86400000);
}

function statusText() {
  const days = daysSinceStart();
  return `${days} dias sin pagar`;
}

function updatePresence() {
  if (!client.user) return;
  client.user.setPresence({
    activities: [{ name: statusText() }],
    status: "online"
  });
}

function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getTime());
  next.setHours(24, 0, 0, 0);
  return next - now;
}

function scheduleDailyUpdate() {
  const delay = msUntilNextMidnight();
  setTimeout(() => {
    updatePresence();
    scheduleDailyUpdate();
  }, delay);
}

client.once("ready", () => {
  updatePresence();
  scheduleDailyUpdate();
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
