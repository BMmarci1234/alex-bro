const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('./config.json');
const Database = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();
// Initialize database
const database = new Database();

// Load commands from the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Clean old messages on startup (optional)
    try {
        await database.cleanOldMessages(30);
    } catch (error) {
        console.error('Error cleaning old messages:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Pass database to commands that might need it; prcManager is now removed
        await command.execute(interaction, database, null);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Store messages when they are created
client.on('messageCreate', async message => {
    // Store messages in the log channel and bot messages
    if (message.channelId === '1387153229485314109' || message.author.bot) {
        try {
            await database.storeMessage(message);
        } catch (error) {
            console.error('Error storing message:', error);
        }
    }

    if (message.author.bot) return;

    if (message.content.startsWith('-say ')) {
        // Check if user has the Junior High Rank role
        const hasJuniorHighRankRole = message.member.roles.cache.has(config.juniorHighRankRoleId); // Use config for role ID
        if (!hasJuniorHighRankRole) {
            return message.reply({ message: '<:X_:1390634239418044487> You do not have permission to use this command.', ephemeral: true });
        }

        const messageContent = message.content.slice(5); // Remove '-say ' prefix

        try {
            const sentMessage = await message.channel.send(messageContent);
            await message.delete();

            // Store the sent message if it's in the log channel
            if (sentMessage.channelId === config.staffAlertChannelId) { // Use config for log channel ID
                await database.storeMessage(sentMessage);
            }

            // Log the command usage
            const logEmbed = new EmbedBuilder()
                .setTitle('Command Used: -say')
                .setDescription(`
                    **User:** ${message.author}
                    **Message:** ${messageContent}
                `)
                .setColor(0x00FFFF)
                .setTimestamp();

            const logChannel = message.guild.channels.cache.get(config.logChannelId); // Use config for log channel ID
            if (logChannel) {
                const logMessage = await logChannel.send({ embeds: [logEmbed] });
                // Store the log message
                await database.storeMessage(logMessage);
            }
        } catch (error) {
            console.error('Error in -say command:', error);
        }
    }
});

// Function to convert role IDs to role names in text
function convertRoleIdsToNames(text, guild) {
    if (!text || !guild) return text;
    // Match role mentions like <@&1234567890>
    return text.replace(/<@&(\d+)>/g, (match, roleId) => {
        const role = guild.roles.cache.get(roleId);
        return role ? `@${role.name}` : match;
    });
}

// Function to format embed data for display
function formatEmbedData(embedData, guild) {
    if (!embedData) return '';
    try {
        const embeds = JSON.parse(embedData);
        let embedInfo = '\n**📋 Embed Content:**\n';
        embeds.forEach((embed, index) => {
            if (embed.title) {
                embedInfo += `**Title:** ${convertRoleIdsToNames(embed.title, guild)}\n`;
            }
            if (embed.description) {
                const description = convertRoleIdsToNames(embed.description, guild);
                embedInfo += `**Description:** ${description.length > 500 ? description.substring(0, 500) + '...' : description}\n`;
            }
            if (embed.fields && embed.fields.length > 0) {
                embedInfo += `**Fields:**\n`;
                embed.fields.forEach((field, fieldIndex) => {
                    if (fieldIndex < 5) { // Limit to first 5 fields to avoid too long messages
                        const fieldName = convertRoleIdsToNames(field.name, guild);
                        const fieldValue = convertRoleIdsToNames(field.value, guild);
                        embedInfo += `   • ${fieldName}: ${fieldValue}\n`;
                    }
                });
                if (embed.fields.length > 5) {
                    embedInfo += `   • ... and ${embed.fields.length - 5} more fields\n`;
                }
            }
            if (embed.footer) {
                embedInfo += `**Footer:** ${convertRoleIdsToNames(embed.footer.text, guild)}\n`;
            }
            if (embed.author) {
                embedInfo += `**Author:** ${convertRoleIdsToNames(embed.author.name, guild)}\n`;
            }
            if (embed.color) {
                embedInfo += `**Color:** #${embed.color.toString(16).padStart(6, '0')}\n`;
            }
            if (index < embeds.length - 1) {
                embedInfo += '\n---\n';
            }
        });
        return embedInfo;
    } catch (error) {
        console.error('Error parsing embed data:', error);
        return '\n**📋 Embed Content:** Could not parse embed data';
    }
}

// Monitor message deletions in the log channel
client.on('messageDelete', async message => {
    if (message.channelId === config.staffAlertChannelId) { // Use config for log channel ID
        const owner = await client.users.fetch('904032150549057596'); // Hardcoded owner ID, consider putting in config
        try {
            // Get stored message data from database
            const storedMessage = await database.getMessage(message.id);
            let contentToShow = 'No content available';
            let embedInfo = '';
            let authorInfo = 'Unknown';

            // Get the guild for role name conversion
            const guild = message.guild || client.guilds.cache.get(storedMessage?.guild_id);

            if (storedMessage) {
                authorInfo = storedMessage.author_tag || 'Unknown';
                if (storedMessage.content && storedMessage.content.trim()) {
                    const convertedContent = convertRoleIdsToNames(storedMessage.content, guild);
                    contentToShow = convertedContent.length > 1000 ?
                        convertedContent.substring(0, 1000) + '...' :
                        convertedContent;
                } else if (storedMessage.embed_data) {
                    embedInfo = formatEmbedData(storedMessage.embed_data, guild);
                    contentToShow = 'Message contained embeds (see below)';
                }
            } else {
                // Fallback to partial message data if available
                if (message.author) {
                    authorInfo = message.author.tag;
                }
                if (message.content) {
                    contentToShow = convertRoleIdsToNames(message.content, guild);
                } else if (message.embeds && message.embeds.length > 0) {
                    contentToShow = 'Message contained embeds (not stored)';
                }
            }

            const deleteEmbed = new EmbedBuilder()
                .setTitle('⚠️ Message Deleted in Log Channel')
                .setDescription(`
                    **Channel:** <#${message.channelId}>
                    **Author:** ${authorInfo}
                    **Content:** ${contentToShow}${embedInfo}
                    **Deleted at:** <t:${Math.floor(Date.now() / 1000)}:F>
                `.trim())
                .setColor(0xFF0000)
                .setTimestamp();

            await owner.send({ embeds: [deleteEmbed] });

            // Remove the message from database after notification
            if (storedMessage) {
                await database.deleteMessage(message.id);
            }
        } catch (error) {
            console.error('Error handling message deletion:', error);
        }
    }
});

// Handle message updates (optional - for tracking edits)
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.channelId === config.staffAlertChannelId) { // Use config for log channel ID
        try {
            await database.storeMessage(newMessage);
        } catch (error) {
            console.error('Error updating stored message:', error);
        }
    }
});

// Clean up database connection on exit
process.on('SIGINT', async () => {
    console.log('\nShutting down bot...');
    try {
        await database.close();
        await client.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    try {
        await database.close();
        await client.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

client.login(config.token);