'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { syncAll, getSyncedStats } = require('../autosync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Recharge les stats Kyara des joueurs liés dans le JSON'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await syncAll();

    const { at, data } = getSyncedStats();

    if (data.length === 0) {
      return interaction.editReply('Aucun joueur dans le fichier de mapping.');
    }

    const lines = data.map((r, i) => {
      const ratio = isFinite(r.ratio) ? r.ratio.toFixed(1) : '∞';
      return `${i + 1}. **${r.pseudo}** — ${r.mythics}📱 · ${r.boostersOpened}🎲 · ratio ${ratio}`;
    });

    return interaction.editReply(
      `✅ **Sync terminée** — ${data.length} joueurs chargés\n\n` + lines.join('\n')
    );
  },
};
