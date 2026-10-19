'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSyncedStats } = require('../autosync');

function medalFor(index) {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `\`${index + 1}\``;
}

function formatCards(cards) {
  return Number(cards || 0).toLocaleString('fr-FR');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Classement des joueurs par nombre de cartes possédées'),

  async execute(interaction) {
    await interaction.deferReply();

    const { at, data } = getSyncedStats();
    const ageMin = Math.round((Date.now() - at) / 60000);

    const ranking = [...data].sort((a, b) => {
      const cardsA = a.owned || 0;
      const cardsB = b.owned || 0;
      if (cardsB !== cardsA) return cardsB - cardsA;
      if (b.mythics !== a.mythics) return b.mythics - a.mythics;
      return a.pseudo.localeCompare(b.pseudo);
    });

    const totalCards = ranking.reduce((sum, entry) => sum + (entry.owned || 0), 0);

    const embed = new EmbedBuilder()
      .setColor(0xff4d2e)
      .setTitle('🏆 Classement Cartes — Kyara')
      .setFooter({
        text:
          ranking.length === 0
            ? 'Aucun joueur dans le mapping'
            : `${ranking.length} joueurs classés · ${formatCards(totalCards)} cartes au total · sync il y a ${ageMin} min`,
      })
      .setTimestamp();

    if (ranking.length === 0) {
      embed.setDescription(
        'Aucun joueur dans le fichier de mapping.\n' +
          'Ajoute des profils dans `data/players.json` puis lance `/sync`.'
      );
    } else {
      const top = ranking.slice(0, 10);
      const lines = top.map((entry, i) => {
        const medal = medalFor(i);
        return (
          `${medal} [${entry.pseudo}](https://kyara.games/profil/${entry.id}) — ` +
          `**${formatCards(entry.owned)}**🃏 · **${entry.mythics}**📱`
        );
      });
      embed.setDescription(
        'Classement par nombre de cartes possédées (collection la plus complète)\n\n' +
          lines.join('\n')
      );
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
