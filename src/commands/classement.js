'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSyncedStats } = require('../autosync');

function medalFor(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `\`${index + 1}\``;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Classement des joueurs par nombre de mythiques'),

  async execute(interaction) {
    await interaction.deferReply();

    const { at, data } = getSyncedStats();
    const ageMin = Math.round((Date.now() - at) / 60000);

    const ranking = [...data].sort((a, b) => {
      if (b.mythics !== a.mythics) return b.mythics - a.mythics;
      return a.pseudo.localeCompare(b.pseudo);
    });

    const embed = new EmbedBuilder()
      .setColor(0xff4d2e)
      .setTitle('🏆 Classement Mythiques — Kyara')
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
          `**${entry.mythics}**📱 · **${entry.boostersOpened.toLocaleString('fr-FR')}**🎲`
        );
      });
      embed.setDescription(lines.join('\n'));
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
