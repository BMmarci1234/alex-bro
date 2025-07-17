const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, userMention } = require('discord.js');
const config = require('../config.json');

const blueline = '<:blueline:1367393939782635551>'.repeat(22);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infract')
        .setDescription('Issue infractions with detailed logging')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User being infracted')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Brief explanation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('punishment')
                .setDescription('Type of punishment (e.g., Warning, Strike, Termination, etc.)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('appealable')
                .setDescription('Can this infraction be appealed? (Yes/No or custom text)')
                .setRequired(true)),
            
    
    async execute(interaction) {
        // Check if user has the Internal Affairs role
        const allowedRoles = require('../config.json').allowedInfractCommandRoles;
        const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));

        if (!hasPermission) {
            return await interaction.reply({
                content: '<:X_:1390634239418044487> You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const punishment = interaction.options.getString('punishment');
        const appealable = interaction.options.getString('appealable');
        const notes = interaction.options.getString('notes') || 'No additional notes provided';

        // Create infraction embed
        const infractionEmbed = new EmbedBuilder()
            .setTitle('Staff Infraction')
            .setDescription(`
                ${blueline}
                **\`>\` User:** ${user}
                **\`>\` Reason:** ${reason}
                **\`>\` Punishment:** ${punishment}
                **\`>\` Appealable:** ${appealable}
            `)
            .setColor(0x09a2df)
            .setImage('https://media.discordapp.net/attachments/1366419104319410308/1387138669193728060/image.png?ex=685c410e&is=685aef8e&hm=dc2412f5d3dc755b9de564af56ca030df943deb18ee6e9ca7932d4da5c14f0f5&=&format=webp&quality=lossless&width=1047&height=180')
            .setFooter({ 
                text: `Signed, ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            // Send to infraction channel
            const infractionChannel = interaction.guild.channels.cache.get(config.infractionChannelId);
            if (infractionChannel) {
                await infractionChannel.send({ content: `<@${user.id}>`,embeds: [infractionEmbed] });
            }

            // Send DM to the infracted user
            try {
                await user.send({ embeds: [infractionEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${user.username}: ${error.message}`);
            }

            // Log the command usage
            const logEmbed = new EmbedBuilder()
                .setTitle('Command Used: /infract')
                .setDescription(`
                    **User:** ${interaction.user}
                    **Target:** ${user}
                    **Reason:** ${reason}
                    **Punishment:** ${punishment}
                    **Appealable:** ${appealable}
                `)
                .setColor(0xFF6600)
                .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get('1387153229485314109');
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

            // Reply to the interaction
            await interaction.reply({
                content: `<:Tick:1390634214168465540> Successfully logged infraction for ${user.username}!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in infract command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the infraction.',
                ephemeral: true
            });
        }
    },
};
