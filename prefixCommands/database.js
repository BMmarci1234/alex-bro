const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = path.join(__dirname, 'messages.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const createMessagesTable = `
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                channel_id TEXT,
                author_id TEXT,
                author_tag TEXT,
                content TEXT,
                embed_data TEXT,
                timestamp INTEGER,
                guild_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createMessagesTable, (err) => {
            if (err) {
                console.error('Error creating messages table:', err.message);
            } else {
                console.log('Messages table ready');
            }
        });
    }

    storeMessage(message) {
        return new Promise((resolve, reject) => {
            const embedData = message.embeds && message.embeds.length > 0 ? JSON.stringify(message.embeds) : null;
            
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO messages 
                (id, channel_id, author_id, author_tag, content, embed_data, timestamp, guild_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                message.id,
                message.channelId,
                message.author?.id || null,
                message.author?.tag || null,
                message.content || null,
                embedData,
                Date.now(),
                message.guildId || null,
                (err) => {
                    if (err) {
                        console.error('Error storing message:', err.message);
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    getMessage(messageId) {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT * FROM messages WHERE id = ?", [messageId], (err, row) => {
                if (err) {
                    console.error('Error retrieving message:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    deleteMessage(messageId) {
        return new Promise((resolve, reject) => {
            this.db.run("DELETE FROM messages WHERE id = ?", [messageId], function(err) {
                if (err) {
                    console.error('Error deleting message:', err.message);
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    getMessagesByChannel(channelId, limit = 100) {
        return new Promise((resolve, reject) => {
            this.db.all(
                "SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ?", 
                [channelId, limit], 
                (err, rows) => {
                    if (err) {
                        console.error('Error retrieving messages by channel:', err.message);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    cleanOldMessages(daysOld = 30) {
        return new Promise((resolve, reject) => {
            const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            this.db.run(
                "DELETE FROM messages WHERE timestamp < ?", 
                [cutoffTime], 
                function(err) {
                    if (err) {
                        console.error('Error cleaning old messages:', err.message);
                        reject(err);
                    } else {
                        console.log(`Cleaned ${this.changes} old messages`);
                        resolve(this.changes);
                    }
                }
            );
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;