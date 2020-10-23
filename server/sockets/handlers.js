const { io } = require('./index');
const { sendMessage } = require('./helpers.js');
const { rehydrateGame, saveGame } = require('../lib/game');
const Turn = require('../lib/constructors/Turn');
const {
  assignTile,
  decideTileAssociations,
  getPlayerById,
  deal,
  getTileOwners,
} = require('../lib/play');

const onUserConnect = (socket) => {
  console.log('a user connected');
};

const onUserDisconnect = () => {
  console.log('user disconnected');
};

const onPlayerCreated = async (socket, gameInfo) => {
  // change this to a socket connection so it can push the new player
  // to all existing players. Otherwise they don't have them in their game object.
  console.log('adding player');
  const name = gameInfo.name;
  const gameId = gameInfo.gameId;
  const socketId = socket.id;
  // verify information
  if (name && gameId) {
    console.log('rehydrating...');
    const game = await rehydrateGame(gameId);
    const player = game.addPlayer(name, socketId);
    saveGame(game);
    socket.emit('successful join', {
      playerId: player.id,
      gameId: gameId,
    });
    socket.broadcast.emit('new player', game);
  } else {
    res.status(403);
    res.json({
      error: 'Must provide a name and game ID',
    });
    return;
  }
};

/**
 * Rehydrates the game, deals tiles to the player, then returns updated game to everyone
 * //TODO: Should probably check to ensure game is not yet started
 * @param {object} socket
 * @param {object} gameInfo
 */
const onPlayerConnect = async (socket, gameInfo) => {
  try {
    if (!gameInfo) return;
    if (gameInfo.gameId) {
      game = await rehydrateGame(gameInfo.gameId);
      socket.emit('enter game', game);
      sendMessage(
        `${
          getPlayerById(game.players, gameInfo.playerId).player.name
        } has joined the game`
      );
    } else {
      socket.emit('game error', 'invalid game id');
    }
  } catch (e) {
    socket.emit('game error', e);
  }
};

const onStartGame = async (socket, gameId, playerId) => {
  game = await rehydrateGame(gameId);
  await deal(game);
  game.status = 'started'; // needs to be in constructor
  const turn = new Turn(game.players[0].id);
  game.addTurn(turn);
  saveGame(game);
  sendMessage(
    `${getPlayerById(game.players, playerId).player.name} has started the game`
  );
  io.emit('game started', game);
};

const onMergerInitiation = async (
  socket,
  gameId,
  tileId,
  playerId,
  hotelId
) => {
  const game = await rehydrateGame(gameId);
  const tile = game.tiles[tileId];
  const tileHotels = game.tileHotels;
  const associations = decideTileAssociations(tile, game.tiles);
  const sizes = {};

  associations.hotels.forEach((hotelId) => {
    const hotelTiles = tileHotels[hotelId] || {};
    sizes[hotelId] = Object.keys(hotelTiles).length;
  });
  game.status = 'merging';
  await saveGame(game);
  io.emit('handle merger', {
    game,
    associations,
    tileId,
    playerId,
    hotelId,
    tieExists: false,
    sizes,
  });
};

const onTilePlay = async (socket, gameId, tileId, playerId) => {
  console.log('handling tile play', tileId);
  // rehydrate things
  const game = await rehydrateGame(gameId);
  const tile = game.tiles[tileId];
  // set the owner
  tile.owner = 'board';
  const currentTurn = getCurrentTurn(game);
  if (currentTurn.tileId) {
    socket.emit('game error', {
      message:
        "Looks like you've already played a tile. Try buying stock instead...",
    });
    return;
  }
  currentTurn.tileId = tileId;
  // where was it placed?
  const associations = decideTileAssociations(tile, game.tiles);
  // is it next to another brand new tile?
  // TODO: need to check whether any hotels are available
  const startingNewChain =
    !associations.hotels.length && !associations.isIsland;
  if (associations.merger) {
    // mergers must be handled client side
    console.log(`it's a merger`);
    const tileHotels = game.tileHotels;
    let winner = null;
    let winningSize = 0;
    let tieExists = false;
    let safeHotels = [];
    const sizes = {};
    associations.hotels.forEach((hotelId) => {
      const hotel = game.hotels[hotelId];
      if (hotel.safe) safeHotels.push(hotelId);
      const hotelTiles = tileHotels[hotelId] || {};
      sizes[hotelId] = Object.keys(hotelTiles).length;
      if (sizes[hotelId] > winningSize) {
        winner = hotel.id;
        winningSize = sizes[hotelId];
        tieExists = false;
      } else if (sizes[hotelId] === winningSize) tieExists = true;
    });
    if (safeHotels.length > 1) {
      socket.emit('game error', {
        message: 'This tile would merge two safe hotel chains',
      });
      return;
    }
    if (tieExists) {
      socket.emit('choose winner', {
        game,
        associations,
        tileId,
        playerId,
        winner,
        tieExists,
        sizes,
      });
      return;
    }
    game.status = 'merging';
    await saveGame(game);
    io.emit('handle merger', {
      game,
      associations,
      tileId,
      playerId,
      winner,
      tieExists,
      sizes,
    });
  } else if (startingNewChain) {
    // new chains must be handled client side
    console.log(`it's a new chain`);
    // broadcast back to only the creator
    // tell them which hotels are available to create
    let hotels = [];
    for (const hotelId in game.hotels) {
      const tiles = game.tileHotels[hotelId] || {};
      const active = game.hotels.active || Object.keys(tiles).length > 0;
      if (!active) {
        hotels.push(game.hotels[hotelId]);
      }
    }
    if (hotels.length) {
      socket.emit('decide tile hotel', { tileId, playerId, hotels });
    } else {
      socket.emit('game error', {
        message:
          'This tile would create a new chain. There are no available hotel chains',
      });
      return;
    }
  } else {
    console.log(`it's not a merger or new chain`);
    assignTile(tileId, associations.hotels[0], game.tiles);
    const activeHotels = [];
    for (const hotelId in game.hotels) {
      console.log(hotelId, game.hotels[hotelId]);
      if (game.hotels[hotelId].active) {
        activeHotels.push(hotelId);
      }
    }
    if (activeHotels.length === 0) {
      await switchTurns(game, playerId);
    }
    await saveGame(game);
    // this is a hack to get the updated stock price
    const refreshedGame = await rehydrateGame(gameId);
    io.emit('tiles updated', refreshedGame);
  }
  sendMessage(
    `${getPlayerById(game.players, playerId).player.name} has played ${
      game.tiles[tileId].name
    }`
  );
};

const onHotelChoice = async (socket, gameId, tileId, playerId, hotelId) => {
  console.log('user has chosen a hotel using ', tileId);
  const game = await rehydrateGame(gameId);
  console.log('hotelId', hotelId);
  console.log('hotel', game.hotels[hotelId]);
  const tile = game.tiles[tileId];
  tile.owner = 'board';
  assignTile(tileId, hotelId, game.tiles);
  // force the new hotel to be active
  game.hotels[hotelId].active = true;
  purchaseStock(game, hotelId, playerId);
  await saveGame(game);
  // this is a total hack to get teh stock price. It should be setup differently
  const refreshedGame = await rehydrateGame(gameId);
  io.emit('tiles updated', refreshedGame);
  sendMessage(
    `${getPlayerById(game.players, playerId).player.name} has started the ${
      game.hotels[hotelId].name
    } chain`
  );
};

const onMergerComplete = async (socket, gameId, playerId, winner, tileId) => {
  const game = await rehydrateGame(gameId);
  const currentTurn = getCurrentTurn(game);
  if (playerId !== currentTurn.playerId) {
    sendMessage(
      `${
        getPlayerById(game.players, playerId).player.name
      }  finished their merger. `
    );
  }
  // TODO: Add the amounts for majority/minority
  game.status = 'started';
  assignTile(tileId, winner, game.tiles);
  await saveGame(game);
  io.emit('tiles updated', game);
  sendMessage(
    `${
      getPlayerById(game.players, playerId).player.name
    }  has completed the merger. The winner was ${game.hotels[winner].name}`
  );
};

const onStockPurchase = async (socket, gameId, playerId, hotelId) => {
  // copied directly from frontend
  const game = await rehydrateGame(gameId);
  const currentTurn = getCurrentTurn(game);
  const stock = purchaseStock(game, hotelId, playerId);
  currentTurn.stocks.push(stock);
  await saveGame(game);
  io.emit('stock purchased', game);
  sendMessage(
    `${
      getPlayerById(game.players, playerId).player.name
    } has purchased stock in ${game.hotels[hotelId].name}`
  );
  if (currentTurn.stocks.length > 2) {
    await switchTurns(game, playerId);
  }
};

function purchaseStock(game, hotelId, playerId) {
  for (i = 0; i < game.stocks[hotelId].length; i++) {
    const card = game.stocks[hotelId][i];
    if (card.owner) continue;
    card.owner = playerId;
    // TODO: Remove the amount from the players account
    return card;
  }
}

const onStockSell = async (socket, gameId, playerId, hotelId) => {
  const game = await rehydrateGame(gameId);
  for (i = 0; i < game.stocks[hotelId].length; i++) {
    const card = game.stocks[hotelId][i];
    if (card.owner === playerId) {
      card.owner = null;
      // TODO: Add the amount from the players account
      break;
    }
  }
  await saveGame(game);
  io.emit('stock sold', game);
  sendMessage(
    `${getPlayerById(game.players, playerId).player.name} has sold stock in ${
      game.hotels[hotelId].name
    }`
  );
};

const onEndGame = async (socket, gameId, playerId) => {
  const game = await rehydrateGame(gameId);
  const tileHotels = game.tileHotels;
  const sizes = {};
  for (const hotelId in game.hotels) {
    const hotel = game.hotels[hotelId];
    const hotelTiles = tileHotels[hotelId] || {};
    sizes[hotelId] = Object.keys(hotelTiles).length;
  }
  io.emit('handle merger', {
    associations: {
      hotels: Object.keys(game.hotels),
    },
    sizes,
  });
};

const onEndTurn = async (socket, gameId, playerId, turn) => {
  const game = await rehydrateGame(gameId);
  await switchTurns(game, playerId);
};

async function switchTurns(game, playerId) {
  await deal(game);
  const currentPlayerIndex = getPlayerById(game.players, playerId).index;
  const nextPlayerIndex =
    currentPlayerIndex + 1 >= game.players.length ? 0 : currentPlayerIndex + 1;
  game.turns.push(new Turn(game.players[nextPlayerIndex].id));
  await saveGame(game);
  io.emit('turn started', game);
  sendMessage(
    `${game.players[currentPlayerIndex].name} has ended their turn. It is now ${game.players[nextPlayerIndex].name}'s turn.`
  );
}

const onNewMessage = (socket, messageInfo) => {
  sendMessage(messageInfo.message, messageInfo.playerId);
};

function getCurrentTurn(game) {
  return game.turns[game.turns.length - 1];
}

module.exports = {
  onUserConnect,
  onUserDisconnect,
  onPlayerCreated,
  onPlayerConnect,
  onMergerInitiation,
  onTilePlay,
  onHotelChoice,
  onMergerComplete,
  onStockPurchase,
  onStockSell,
  onNewMessage,
  onStartGame,
  onEndGame,
  onEndTurn,
};
