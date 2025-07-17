const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot repeat a message')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Text for bot to repeat')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if user has the Junior High Rank role
                // Check if user has any of the allowed roles (from config.json)
        const allowedRoles = require('../config.json').allowedECommandRoles;
        const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));

        if (!hasPermission) {
            return await interaction.reply({
                content: '<:X_:1390634239418044487> You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const message = interaction.options.getString('message');

        try {
            // Send the message
            await interaction.reply(message);

            // Log the command usage
            const logEmbed = new EmbedBuilder()
                .setTitle('Command Used: /say')
                .setDescription(`
                    **User:** ${interaction.user}
                    **Message:** ${message}
                `)
                .setColor(0x00FFFF)
                .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get('1387153229485314109');
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error('Error in say command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the command.',
                ephemeral: true
            });
        }
    },
};