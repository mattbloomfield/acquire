const { io } = require('./index.js');

const sendMessage = (message, playerId = 'server') => {
  io.emit('new message', {
    playerId: playerId,
    message: message,
  });
};

module.exports = {
  sendMessage,
};
