// Klira Server - Telegram Alert System
import { Telegraf } from "telegraf";
import axios from "axios";
import { logger } from "./utils";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN) {
  logger.warn("TELEGRAM_BOT_TOKEN not set - alerts disabled");
}

export const bot = TELEGRAM_BOT_TOKEN ? new Telegraf(TELEGRAM_BOT_TOKEN) : null;

const ids = TELEGRAM_CHAT_ID ? [Number(TELEGRAM_CHAT_ID)] : [];

const CHECK_INTERVAL = 30_000; // 30s
const AUTO_RESUME_DELAY = 60 * 60 * 1000; // 1 hour

const SERVER_URL = process.env.SERVER_URL || "http://localhost:4000";
const MATCHING_ENGINE_URL =
  process.env.MATCHING_ENGINE_URL || "http://localhost:4001";
const ENDPOINTS = [`${SERVER_URL}`, `${SERVER_URL}/health`];

let monitoring = true;
let alerting = false;
let stopTimestamp: number | null = null;
let alertInterval: NodeJS.Timeout | null = null; // Store interval reference

async function checkEndpoints() {
  if (!monitoring || !bot) return;

  for (const url of ENDPOINTS) {
    try {
      const res = await axios.get(url, { timeout: 6000 });

      if (res.status !== 200) {
        await sendAlert(`${url} returned status ${res.status}`);
      } else if (url.includes("/health") && res.data?.status !== "healthy") {
        await sendAlert(`${url} unhealthy: ${JSON.stringify(res.data)}`);
      }
    } catch (err: any) {
      await sendAlert(
        `Something is down. Endpoint check failed for ${url}. Error Message: ${err.message}`
      );
      logger.error("Endpoint check error", {
        error: err.message,
        stack: err.stack,
      });
    }
  }
}

async function sendAlert(message: string) {
  // Don't send alerts if monitoring is stopped
  if (!monitoring) return;

  // Don't send alerts if no chat ID is configured
  if (ids.length === 0) {
    logger.warn("TELEGRAM_CHAT_ID not set — alert suppressed", { message });
    return;
  }

  if (!alerting && bot) {
    alerting = true;

    // Send the first alert immediately
    try {
      await bot.telegram.sendMessage(ids[0], message);
    } catch (err) {
      logger.error("Failed to send Telegram alert", {
        error: (err as Error).message,
      });
    }

    // Then send every 1 minute
    alertInterval = setInterval(async () => {
      if (!alerting || !monitoring) {
        stopAlerting();
        return;
      }
      if (ids.length > 0 && bot) {
        try {
          await bot.telegram.sendMessage(ids[0], message);
        } catch (err) {
          logger.error("Failed to send Telegram alert", {
            error: (err as Error).message,
          });
        }
      }
    }, 60 * 1000);
  }
}

function stopAlerting() {
  alerting = false;
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}

export function stopAlerts() {
  monitoring = false;
  stopAlerting();
  clearInterval(checkEndpointsInterval);
  clearInterval(autoResumeInterval);
}

const autoResumeInterval = setInterval(async () => {
  if (stopTimestamp && Date.now() - stopTimestamp >= AUTO_RESUME_DELAY) {
    try {
      const results = await Promise.all(
        ENDPOINTS.map((url) => axios.get(url, { timeout: 6000 }))
      );

      const allHealthy = results.every(
        (res, i) =>
          res.status === 200 &&
          (!ENDPOINTS[i].includes("/health") || res.data?.status === "healthy")
      );

      if (allHealthy) {
        monitoring = true;
        stopTimestamp = null;
        if (ids.length > 0 && bot) {
          await bot.telegram.sendMessage(
            ids[0],
            "Monitoring resumed automatically after 1 hour of stop (all endpoints healthy)."
          );
        }
      }
    } catch {
      // If still unhealthy, keep waiting.
    }
  }
}, 60_000);

if (bot) {
  // Authorization middleware: restrict all commands to the configured chat
  bot.use((ctx, next) => {
    if (!TELEGRAM_CHAT_ID) {
      logger.warn("TELEGRAM_CHAT_ID not set — rejecting bot command");
      return; // Require chat ID to be configured
    }
    if (ctx.chat?.id.toString() !== TELEGRAM_CHAT_ID) {
      return; // silently ignore unauthorized chats
    }
    return next();
  });

  bot.start((ctx) => ctx.reply("Monitoring bot started"));

  bot.command("status", (ctx) =>
    ctx.reply(
      `Monitoring: ${monitoring ? "ON" : "OFF"} | Alerting: ${alerting}`
    )
  );

  bot.command("stop", (ctx) => {
    monitoring = false;
    stopAlerting();
    stopTimestamp = Date.now();
    ctx.reply("Monitoring and alerts stopped");
  });

  bot.command("resume", (ctx) => {
    monitoring = true;
    stopAlerting();
    stopTimestamp = null;
    ctx.reply("Monitoring resumed");
  });

  bot.command("pause", (ctx) => {
    monitoring = false;
    stopAlerting();
    ctx.reply("Monitoring paused");
  });
}

if (bot) {
  bot.command("health", async (ctx) => {
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([
        axios.get(`${SERVER_URL}/health`, { timeout: 6000 }),
        axios.get(`${SERVER_URL}/metrics`, {
          timeout: 6000,
          headers: { "x-api-key": process.env.KEEPER_API_KEY || "" },
        }),
      ]);

      const health =
        healthRes.status === "fulfilled" ? healthRes.value.data : null;
      const metrics =
        metricsRes.status === "fulfilled" ? metricsRes.value.data : null;

      let msg = "";

      if (health) {
        msg += `Status: ${health.status}\nTimestamp: ${
          health.timestamp
        }\nUptime: ${health.uptime.toFixed(2)}s\n`;
      } else {
        msg += "Health endpoint unreachable\n";
      }

      if (metrics) {
        msg += `\nMetrics:\n- Total Requests: ${
          metrics.totalRequests
        }\n- Successful Fills: ${metrics.successfulFills}\n- Failed Fills: ${
          metrics.failedFills
        }\n- Successful Expires: ${
          metrics.successfulExpires
        }\n- Failed Expires: ${metrics.failedExpires}\n- Avg Response Time: ${
          metrics.averageResponseTime?.toFixed(2) ?? "N/A"
        } ms\n- Last Activity: ${metrics.lastActivity}\n`;
      }

      await ctx.reply(msg || "No data available");
    } catch (err: any) {
      await ctx.reply(`Failed to fetch health: ${err.message}`);
    }
  });

  bot.command("info", async (ctx) => {
    try {
      // Collect data only from the new endpoints
      const [statusRes, pairsRes] = await Promise.all([
        axios.get(`${MATCHING_ENGINE_URL}/api/v1/status`, { timeout: 6000 }),
        axios.get(`${MATCHING_ENGINE_URL}/api/v1/pairs`, { timeout: 6000 }),
      ]);

      const status = statusRes.data;
      const pairs = pairsRes.data;

      const msg = `
=== Status ===
Running: ${status.is_running ? "Yes" : "No"}
Logs Socket Running: ${status.logs_socket_running ? "Yes" : "No"}
Pyth Running: ${status.pyth_running ? "Yes" : "No"}
JUP Running: ${status.jup_running ? "Yes" : "No"}
Total Orders: ${status.total_orders}
Total Pairs: ${status.total_pairs}

=== Pairs ===
${pairs.length > 0 ? pairs.join("\n") : "No pairs"}
`;

      await ctx.reply(msg);
    } catch (err: any) {
      await ctx.reply(`Failed to fetch info: ${err.message}`);
    }
  });

  bot.command("code", async (ctx) => {
    const loadingMessage = await ctx.reply("Creating code...");

    try {
      const args = ctx.message.text.split(" ").slice(1);
      let maxUses = 1;

      // Check if the first argument is a number (capped between 1 and 10).
      if (args.length > 0 && !isNaN(parseInt(args[0]))) {
        maxUses = Math.max(1, Math.min(parseInt(args[0]), 10));
      }

      const password = process.env.KLIRA_CODE_PASSWORD;
      if (!password) {
        throw new Error("KLIRA_CODE_PASSWORD not set in environment");
      }
      const createdBy = process.env.KLIRA_CODE_CREATED_BY;
      if (!createdBy) {
        logger.warn(
          "KLIRA_CODE_CREATED_BY not set, skipping invite code attribution"
        );
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMessage.message_id,
          undefined,
          "Cannot generate code: KLIRA_CODE_CREATED_BY is not configured."
        );
        return;
      }
      const url = `https://www.klira.xyz/api/create`;

      const res = await axios.post(url, { createdBy, password, maxUses });

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        `Generated code with ${maxUses} use(s):\n${res.data.code}`
      );
    } catch (err: any) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        `Failed to generate code. Error: ${err.message}`
      );
      logger.error("Failed to generate invite code", {
        error: err.message,
        stack: err.stack,
      });
    }
  });

  bot.telegram.setMyCommands([
    { command: "health", description: "Show ts server /health endpoint data" },
    {
      command: "info",
      description: "Show pairs info and matching engine status",
    },
    { command: "code", description: "Create a Invite Code" },
    { command: "status", description: "Show monitoring status" },
    { command: "stop", description: "Stop monitoring and alerts" },
    { command: "resume", description: "Resume monitoring" },
    { command: "pause", description: "Pause monitoring" },
  ]);
} // end if (bot)

const checkEndpointsInterval = setInterval(checkEndpoints, CHECK_INTERVAL);

if (bot) {
  bot.launch().catch((err) => {
    logger.error("Failed to launch Telegram bot", { error: err.message });
  });
}
