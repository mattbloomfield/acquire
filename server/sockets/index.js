const app = require('../app.js');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
module.exports = {
  http,
  io,
};
const {
  onUserConnect,
  onUserDisconnect,
  onPlayerCreated,
  onPlayerConnect,
  onTilePlay,
  onHotelChoice,
  onMergerComplete,
  onStockPurchase,
  onStockSell,
  onNewMessage,
  onMergerInitiation,
  onStartGame,
  onEndGame,
  onEndTurn,
} = require('./handlers');
const { sendMessage } = require('./helpers');

io.on('connection', (socket) => {
  onUserConnect();

  // someday link socket.id with player and tell when they have left
  socket.on('disconnect', () => {
    onUserDisconnect(socket);
  });

  socket.on('player created', (gameInfo) => {
    onPlayerCreated(socket, gameInfo);
  });

  // send message to all players as an alert
  // send this player game
  socket.on('player joined', (gameInfo) => {
    onPlayerConnect(socket, gameInfo);
  });

  // set game.status = 'started' and broadcast to all players
  // start the first turn
  socket.on('start game', (gameInfo) => {
    onStartGame(socket, gameInfo.gameId, gameInfo.playerId);
  });
  socket.on('end game', (gameInfo) => {
    onEndGame(socket, gameInfo.gameId, gameInfo.playerId);
  });

  // send a message to all players with updated game
  socket.on('tile played', (gameInfo) => {
    onTilePlay(socket, gameInfo.gameId, gameInfo.tileId, gameInfo.playerId);
  });

  // only called if there was a tie
  socket.on('initiate merger', (gameInfo) => {
    onMergerInitiation(
      socket,
      gameInfo.gameId,
      gameInfo.tileId,
      gameInfo.playerId,
      gameInfo.hotelId
    );
  });

  socket.on('hotel choice made', (gameInfo) => {
    onHotelChoice(
      socket,
      gameInfo.gameId,
      gameInfo.tileId,
      gameInfo.playerId,
      gameInfo.hotelId
    );
  });

  // send a message to all players. Assign tiles as necessary
  // Send an updated game
  socket.on('merger complete', (gameInfo) => {
    onMergerComplete(
      socket,
      gameInfo.gameId,
      gameInfo.playerId,
      gameInfo.winner,
      gameInfo.tileId
    );
  });

  // send a simple message to all players about stock purchase as
  // well as updated game
  socket.on('purchase stock', (gameInfo) => {
    onStockPurchase(
      socket,
      gameInfo.gameId,
      gameInfo.playerId,
      gameInfo.hotelId
    );
  });
  socket.on('sell stock', (gameInfo) => {
    onStockSell(socket, gameInfo.gameId, gameInfo.playerId, gameInfo.hotelId);
  });

  // start a new turn, then send message to all players that
  // a turn is complete with updated game
  socket.on('end turn', (gameInfo) => {
    onEndTurn(socket, gameInfo.gameId, gameInfo.playerId, gameInfo.turn);
  });

  // forward the message to all players
  socket.on('chat message', (messageInfo) => {
    onNewMessage(socket, messageInfo);
  });
});
