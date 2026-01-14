if (typeof ReadableStream === "undefined") {
  const { ReadableStream } = require("stream/web");
  global.ReadableStream = ReadableStream;
}

require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const START_DATE = { year: 2020, month: 8, day: 2 };
const TIME_ZONE = "America/Santiago";

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00";
  const match = tzName.match(/GMT([+-]\d{2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return (hours * 60 + Math.sign(hours) * minutes) * 60000;
}

function getTzDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day"))
  };
}

function utcMsForTzMidnight({ year, month, day }, timeZone) {
  let utcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let i = 0; i < 2; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    const nextUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs;
    if (nextUtcMs === utcMs) break;
    utcMs = nextUtcMs;
  }
  return utcMs;
}

function daysSinceStart(now = new Date()) {
  const current = getTzDateParts(now, TIME_ZONE);
  const startUtc = Date.UTC(START_DATE.year, START_DATE.month - 1, START_DATE.day);
  const currentUtc = Date.UTC(current.year, current.month - 1, current.day);
  const diffMs = currentUtc - startUtc;
  return Math.floor(diffMs / 86400000) + 1;
}

function statusText() {
  const days = daysSinceStart();
  return `Vitoco: ${days} días sin pagar`;
}

function updatePresence() {
  if (!client.user) return;
  client.user.setPresence({
    activities: [{ name: statusText() }],
    status: "online"
  });
}

function msUntilNextMidnight(now = new Date()) {
  const today = getTzDateParts(now, TIME_ZONE);
  const nextUtcDate = new Date(Date.UTC(today.year, today.month - 1, today.day) + 86400000);
  const nextDate = {
    year: nextUtcDate.getUTCFullYear(),
    month: nextUtcDate.getUTCMonth() + 1,
    day: nextUtcDate.getUTCDate()
  };
  const nextMidnightUtcMs = utcMsForTzMidnight(nextDate, TIME_ZONE);
  return Math.max(1000, nextMidnightUtcMs - now.getTime());
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
