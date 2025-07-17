const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

// Use the custom blueline emoji (ensure it exists on the server)
const blueline = '<:blueline:1367393939782635551>'.repeat(22);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promote')
        .setDescription('Promote a user to a new rank with logging')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Discord user to promote')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('new_rank')
                .setDescription('New role to assign')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for promotion')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
                // Check if user has any of the allowed roles (from config.json)
        const allowedRoles = require('../config.json').allowedECommandRoles;
        const hasPermission = interaction.member.roles.cache.some(role => allowedRoles.includes(role.id));

        if (!hasPermission) {
            return await interaction.reply({
                content: '<:X_:1390634239418044487> You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const userId = user?.id;
        const member = userId ? interaction.guild.members.cache.get(userId) : null;
        const newRank = interaction.options.getRole('new_rank');
        const reason = interaction.options.getString('reason');

        // Validation
        if (!user || !member || !newRank || !reason) {
            return await interaction.reply({
                content: '❌ Missing required data. Please ensure all options are correctly selected.',
                ephemeral: true
            });
        }

        // Create promotion embed
        const promotionEmbed = new EmbedBuilder()
            .setTitle('Staff Promotion')
            .setDescription(`${blueline}` +
                ` \`>\` **Staff Member:** ${user.toString()}\n` + // Proper mention
                ` \`>\` **New Rank:** ${newRank.toString()}\n` +   // Proper mention
                ` \`>\` **Reason:** ${reason}`
            )
            .setColor(0x09a2df)
            .setImage('https://media.discordapp.net/attachments/1366419104319410308/1387138669193728060/image.png?ex=685c410e&is=685aef8e&hm=dc2412f5d3dc755b9de564af56ca030df943deb18ee6e9ca7932d4da5c14f0f5&=&format=webp&quality=lossless&width=1047&height=180')
            .setFooter({ 
                text: `Signed, ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        try {
            // Send to promotion channel
            const promotionChannel = interaction.guild.channels.cache.get(config.promotionChannelId);
            if (promotionChannel) {
                await promotionChannel.send({ content: `${user}`, embeds: [promotionEmbed] });
            }

            // Send DM to the promoted user
            const dmEmbed = new EmbedBuilder()
                .setTitle('You have been promoted!')
                .setDescription(`Congratulations ${user.username}, you have been promoted to **${newRank.name}**!`)
                .setColor(0x00FF00)
                .setFooter({ 
                    text: `Reason: ${reason}`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTimestamp();
            
            try {
                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`Could not DM user ${user.username}: ${error.message}`);
            }

            // Log the command usage
            const logEmbed = new EmbedBuilder()
                .setTitle('Command Used: /promote')
                .setDescription(
                    `> **Staff Member:** ${user}\n` +
                    `> **New Rank:** ${newRank}\n` +
                    `> **Reason:** ${reason}`
                )
                .setColor(0x0099FF)
                .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get('1387153229485314109');
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

            // Reply to the interaction
            await interaction.reply({
                content: `<:Tick:1390634214168465540> Successfully promoted ${user.username} to ${newRank.name}!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in promote command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the promotion.',
                ephemeral: true
            });
        }
    },
};