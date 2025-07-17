module.exports = {
  name: 'say',
  async execute(message, args) {
    if (!args.length) return message.reply('You need to provide a message.');
    message.channel.send(args.join(' '));
  }
};
