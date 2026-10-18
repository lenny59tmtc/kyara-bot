'use strict';

const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const { startAutoSync } = require('./src/autosync');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID environment variables.');
  process.exit(1);
}

const commands = [
  require('./src/commands/suceur'),
  require('./src/commands/sync'),
];

async function deployCommands() {
  const rest = new REST().setToken(DISCORD_TOKEN);
  const body = commands.map((c) => c.data.toJSON());

  if (GUILD_ID) {
    console.log(`Deploying ${body.length} guild commands to ${GUILD_ID}…`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  } else {
    console.log(`Deploying ${body.length} global commands…`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
  }
  console.log('Commands deployed.');
}

async function main() {
  const deployOnly = process.argv.includes('--deploy-only');

  try {
    await deployCommands();
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    if (deployOnly) process.exit(1);
  }

  if (deployOnly) {
    process.exit(0);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.commands = new Collection();
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }

  client.once('clientReady', (c) => {
    console.log(`Logged in as ${c.user.tag} (${c.user.id})`);
    console.log(`Serving ${c.guilds.cache.size} guild(s).`);
    startAutoSync();
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[interaction] error in /${interaction.commandName}:`, err);
      const payload = {
        content: 'Une erreur est survenue en exécutant la commande.',
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });

  await client.login(DISCORD_TOKEN);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
