// commands/give.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config.json'); // Adjust path as needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Gives a user a temporary role.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to give the role to.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('role_type')
                .setDescription('The type of car permissions to grant.')
                .setRequired(true)
                .addChoices(
                    { name: 'LEO Car Perms', value: 'leo_car_perms' },
                    { name: 'Exotic Car Perms', value: 'exotic_car_perms' },
                ))
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Duration for the role (in minutes).')
                .setRequired(true)
                .setMinValue(1)), // Minimum 1 minute
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

        const targetUser = interaction.options.getUser('target');
        const roleType = interaction.options.getString('role_type');
        const timeInMinutes = interaction.options.getInteger('time');

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: `Could not find ${targetUser.tag} in this server.`, ephemeral: true });
        }

        let roleIdToGive;
        let roleName;

        switch (roleType) {
            case 'leo_car_perms':
                roleIdToGive = config.leoCarPermsRoleId;
                roleName = 'LEO Car Perms';
                break;
            case 'exotic_car_perms':
                roleIdToGive = config.exoticCarPermsRoleId;
                roleName = 'Exotic Car Perms';
                break;
            default:
                return interaction.reply({ content: 'Invalid role type specified.', ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(roleIdToGive);

        if (!role) {
            return interaction.reply({ content: `Role with ID ${roleIdToGive} (${roleName}) not found. Please check your config.`, ephemeral: true });
        }

        if (targetMember.roles.cache.has(roleIdToGive)) {
            return interaction.reply({ content: `${targetUser.tag} already has the ${roleName} role.`, ephemeral: true });
        }

        try {
            await targetMember.roles.add(role, `Given by ${interaction.user.tag} for ${timeInMinutes} minutes.`);

            const confirmEmbed = new EmbedBuilder()
                .setTitle('<:Tick:1390634214168465540> Role Granted')
                .setDescription(`<@${interaction.user.id}> has granted ${roleType} to <@${targetUser.id}>, the permission expires after ${timeInMinutes} of usage.`)
                .setColor(0x09a2df)
                .setFooter({ iconURL: interaction.user.displayAvatarURL(), text: `Given by${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed] });

            // Schedule role removal
            setTimeout(async () => {
                if (targetMember.roles.cache.has(roleIdToGive)) { // Check if they still have the role
                    await targetMember.roles.remove(role, `Time expired for ${roleName} given by ${interaction.user.tag}.`).catch(console.error);

                    const removedEmbed = new EmbedBuilder()
                        .setTitle('⏳ Role Expired')
                        .setDescription(`The **${roleName}** role has been automatically removed from ${targetUser.tag}.`)
                        .setColor(0xFFA500)
                        .setTimestamp();

                    // Try to send a DM to the user
                    try {
                        await targetUser.send({ embeds: [removedEmbed] });
                    } catch (dmError) {
                        console.warn(`Could not DM user ${targetUser.tag} about role removal: ${dmError.message}`);
                    }

                    // Optionally send to a log channel
                    const staffLogChannel = interaction.guild.channels.cache.get(config.staffAlertChannelId); // Using staff alert channel for logs too
                    if (staffLogChannel) {
                        await staffLogChannel.send({ embeds: [removedEmbed] }).catch(console.error);
                    }
                }
            }, timeInMinutes * 60 * 1000); // Convert minutes to milliseconds

        } catch (error) {
            console.error("Error giving/removing role:", error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription(`There was an error granting the role. Please check my permissions or try again.`)
                .setColor(0xFF0000);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};