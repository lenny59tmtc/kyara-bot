'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getProfile, mapLimit } = require('../kyara');
const store = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Recharge les stats Kyara des joueurs liés dans le JSON'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const mappings = store.getAllMappings();
    if (mappings.length === 0) {
      return interaction.editReply('Aucun joueur dans le fichier de mapping.');
    }

    let ok = 0;
    let failed = 0;
    let done = 0;
    const total = mappings.length;

    const results = await mapLimit(mappings, 5, async ({ discordId, kyaraId }) => {
      try {
        const profile = await getProfile(kyaraId);
        if (profile && profile.pseudo) {
          ok++;
          return { pseudo: profile.pseudo, mythics: profile.mythics, boosters: profile.boostersOpened };
        }
        failed++;
        return null;
      } catch {
        failed++;
        return null;
      } finally {
        done++;
        if (done % 5 === 0 || done === total) {
          interaction
            .editReply(`Chargement… **${done}/${total}** joueurs.`)
            .catch(() => {});
        }
      }
    });

    const lines = results
      .filter(Boolean)
      .sort((a, b) => {
        const ratioA = a.mythics > 0 ? a.boosters / a.mythics : Infinity;
        const ratioB = b.mythics > 0 ? b.boosters / b.mythics : Infinity;
        return ratioA - ratioB;
      })
      .map((r, i) => {
        const ratio = r.mythics > 0 ? (r.boosters / r.mythics).toFixed(1) : '∞';
        return `${i + 1}. **${r.pseudo}** — ${r.mythics}📱 · ${r.boosters}🎲 · ratio ${ratio}`;
      });

    return interaction.editReply(
      `✅ **Sync terminée** — ${ok} joueurs chargés, ${failed} échecs\n\n` +
        (lines.length > 0 ? lines.join('\n') : 'Aucune donnée.')
    );
  },
};
