'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSyncedStats } = require('../autosync');

function formatRatio(ratio) {
  if (!isFinite(ratio)) return '∞';
  return ratio.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function medalFor(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `\`${index + 1}\``;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suceur')
    .setDescription(
      'Classement : le moins de boosters ouverts par mythique (plus chanceux)'
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const { at, data: ranking } = getSyncedStats();
    const ageMin = Math.round((Date.now() - at) / 60000);

    const embed = new EmbedBuilder()
      .setColor(0xff4d2e)
      .setTitle('🍆 Classement Suceur — Kyara')
      .setFooter({
        text:
          ranking.length === 0
            ? 'Aucun joueur dans le mapping'
            : `${ranking.length} joueurs classés · sync il y a ${ageMin} min`,
      })
      .setTimestamp();

    if (ranking.length === 0) {
      embed.setDescription('Aucun joueur dans le fichier de mapping.');
    } else {
      const top = ranking.slice(0, 10);
      const lines = top.map((entry, i) => {
        const medal = medalFor(i);
        return (
          `${medal} [${entry.pseudo}](https://kyara.games/profil/${entry.id}) — ` +
          `**${entry.mythics}**📱 · **${entry.boostersOpened.toLocaleString('fr-FR')}**🎲 · ` +
          `**${formatRatio(entry.ratio)}**`
        );
      });
      embed.setDescription(
        'Ratio = boosters ÷ mythiques (plus bas = plus chanceux)\n\n' + lines.join('\n')
      );
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
