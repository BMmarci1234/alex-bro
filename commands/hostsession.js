// commands/hostsession.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hostsession')
        .setDescription('Sends a server startup announcement.'),
    async execute(interaction) {

        const hasSHRRole = interaction.member.roles.cache.has('1367019494446202881');
        
        if (!hasSHRRole) {
            return await interaction.reply({
                content: '<:X_:1390634239418044487> You do not have permission to use this command.',
                ephemeral: true
            });
        }
        const startupEmbed = new EmbedBuilder()
            .setTitle('🚀 Server Starting Up!')
            .setDescription('The server is now starting. Please be patient while it loads. Get ready for some roleplay!')
            .setColor(0x0099FF) // Blue
            .setTimestamp()
            .setFooter({ text: 'Good luck with your session!' });

        await interaction.reply({ embeds: [startupEmbed] });
    },
};