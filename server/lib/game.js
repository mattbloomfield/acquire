const fs = require('fs');
const path = require('path');
const Game = require('./constructors/Game');

const gameStorageLoc = path.join(__dirname, '../game-data/games.json');

async function saveGame(game) {
  return new Promise(async (resolve, reject) => {
    console.log('saving game...', game.id);
    let games = await getGames();
    if (!games) games = {};
    games[game.id] = game;
    fs.writeFile(gameStorageLoc, JSON.stringify(games), 'utf8', (err, data) => {
      if (err) throw err;
      resolve(data);
    });
  });
}

async function getGames() {
  return new Promise((resolve, reject) => {
    console.log('getting games...');
    fs.readFile(gameStorageLoc, 'utf8', (err, data) => {
      if (err) throw err;
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function createGame(name = 'untitled') {
  console.log('creating game...', name);
  const game = new Game(name);
  saveGame(game);
  return game;
}

async function deleteGame(idToDelete) {
  return new Promise(async (resolve, reject) => {
    console.log('deleting game...', idToDelete);
    let games = await getGames();
    if (!games) games = {};
    delete games[idToDelete];
    fs.writeFile(gameStorageLoc, JSON.stringify(games), 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

const rehydrateGame = (gameId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const games = await getGames();
      const g = games[gameId];
      const game = new Game(
        g.name,
        g.id,
        g.players,
        g.tiles,
        g.hotels,
        g.stocks,
        g.status,
        g.turns
      );

      const tilesByHotel = game.tileHotels;

      for (const hotelId in game.hotels) {
        const hotel = game.hotels[hotelId];
        const hotelTiles = tilesByHotel[hotelId] || {};
        hotel.stockPrice = hotel.getStockPrice(
          Object.keys(hotelTiles).length,
          hotel.tier
        ).price;
        hotel.minorityPrice = hotel.getStockPrice(
          Object.keys(hotelTiles).length,
          hotel.tier
        ).minority;
        hotel.majorityPrice = hotel.getStockPrice(
          Object.keys(hotelTiles).length,
          hotel.tier
        ).majority;
      }
      resolve(game);
    } catch (e) {
      console.log('error getting games', e);
      reject(e);
    }
  });
};

module.exports = {
  saveGame,
  getGames,
  createGame,
  deleteGame,
  rehydrateGame,
};
