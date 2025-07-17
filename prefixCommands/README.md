# Discord Moderation Bot

A professional Discord.js v14 bot with role-based permissions, promotion tracking, and infraction management.

## Features

- **Slash Commands**: `/promote`, `/infract`, `/say`
- **Prefix Commands**: `-say` (alternative to slash command)
- **Role-Based Permissions**: Secure command access based on Discord roles
- **Logging**: Automatic logging to specified channels
- **Modern**: Built with Discord.js v14

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Bot
1. Edit `config.json` with your bot's details:
   - `token`: Your bot token from Discord Developer Portal
   - `clientId`: Your application's client ID
   - `guildId`: Your Discord server ID
   - `promotionChannelId`: Channel ID for promotion logs (default: 1366419104319410308)
   - `infractionChannelId`: Channel ID for infraction logs (default: 1387132449426899014)
   - `highRankRoleId`: Role ID that can use `/promote` (default: 1367062785665663047)
   - `internalAffairsRoleId`: Role ID that can use `/infract` (default: 1367063987572838480)

### 3. Deploy Commands
```bash
npm run deploy
```

### 4. Start Bot
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Commands

### `/promote`
- **Permission**: High Rank Role
- **Parameters**: user, old_rank, new_rank, notes (optional)
- **Example**: `/promote @JohnDoe @Member @Moderator Excellent performance this month`

### `/infract`
- **Permission**: Internal Affairs Role  
- **Parameters**: user, reason, punishment, appealable, notes (optional)
- **Example**: `/infract @BadUser Spam in general Warning true First offense`

### `/say` or `-say`
- **Permission**: Everyone
- **Parameters**: message
- **Example**: `/say Welcome to our Discord server!` or `-say Hello world!`

## File Structure

```
├── config.json              # Bot configuration
├── index.js                 # Main bot file
├── deploy-commands.js       # Command deployment
├── package.json             # Dependencies
└── commands/                # Command files
    ├── promote.js
    ├── infract.js
    └── say.js
```

## Security Features

- Role-based permission system
- Input sanitization for `/say` command
- No @everyone/@here mentions allowed
- Guild-only commands (no DM usage)
- Graceful error handling

## Support

For issues or questions, please check the Discord.js documentation or create an issue in this repository.
