
import "dotenv/config";

import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import { askSavi } from "./ai.js";

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  OWNER_DISCORD_ID
} = process.env;

if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !DISCORD_GUILD_ID ||
  !OWNER_DISCORD_ID ||
  !process.env.GEMINI_API_KEY
) {
  throw new Error("Missing required configuration in .env");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check SAVI AI status"),

  new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Meet SAVI AI")
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" })
    .setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      DISCORD_CLIENT_ID,
      DISCORD_GUILD_ID
    ),
    { body: commands }
  );

  console.log("Discord commands registered!");
}

client.once(Events.ClientReady, bot => {
  console.log("--------------------------------");
  console.log("SAVI AI BRAIN IS ONLINE!");
  console.log(`Logged in as ${bot.user.tag}`);
  console.log("--------------------------------");
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.user.id !== OWNER_DISCORD_ID) {
    return interaction.reply({
      content: "This AI assistant is private.",
      ephemeral: true
    });
  }

  if (interaction.commandName === "ping") {
    return interaction.reply("Pong! SAVI AI is online. 🚀");
  }

  if (interaction.commandName === "hello") {
    return interaction.reply(
      "Hey boss! My AI brain is ready. Let's create something amazing!"
    );
  }
});

// Handle normal Discord messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // Only respond to the owner
  if (message.author.id !== OWNER_DISCORD_ID) return;

  // Only respond in the configured server
  if (message.guildId !== DISCORD_GUILD_ID) return;

  const userMessage = message.content.trim();

  if (!userMessage) return;

  try {
    await message.channel.sendTyping();

    const answer = await askSavi(
      message.channel.id,
      userMessage
    );

    // Discord message limit is 2000 characters.
    const chunks = answer.match(/[\s\S]{1,1900}/g) || [];

    for (const chunk of chunks) {
      await message.reply(chunk);
    }

  } catch (error) {
    console.error("SAVI AI error:", error.message);

    await message.reply(
      "Sorry boss! I couldn't process that message. Please try again."
    );
  }
});

async function startBot() {
  try {
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exitCode = 1;
  }
}

startBot();
