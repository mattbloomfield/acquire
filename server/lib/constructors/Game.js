const elements = require('../elements.json');
const rules = require('../rules.json');
const { getTileOwners } = require('../play');
const { objToArr } = require('../helpers');
const { Card, Tile } = require('./GamePiece');
const HotelChain = require('./HotelChain');
const Player = require('./Player');
const Turn = require('./Turn');

class Game {
  constructor(name, id, players, tiles, hotels, stocks, status, turns) {
    const tileInputs = tiles || createTiles();
    this.name = name || 'Untitled';
    this.id = id || new Date().getTime();
    this.players = initPlayers(players);
    this.tiles = initTiles(tileInputs);
    this.hotels = initHotels(hotels, this.tiles);
    this.stocks = initStocks(stocks, this.hotels);
    this.status = status || 'unstarted';
    this.turns = initTurns(turns) || [];
  }

  addPlayer(name, socketId) {
    const player = new Player(name, socketId);
    this.players.push(player);
    return player;
  }

  addTurn(turn) {
    this.turns.push(turn);
  }

  get tileOwnership() {
    const tileOwnership = getTileOwners(objToArr(this.tiles)).owners;
    return tileOwnership;
  }

  get tileHotels() {
    const tileHotels = getTileOwners(objToArr(this.tiles)).hotels;
    return tileHotels;
  }
}

function createTiles() {
  const tiles = {};
  elements.rows.forEach((row) => {
    elements.columns.forEach((column) => {
      const name = `${row}${column}`;
      const id = `${row}_${column}`;
      const tile = new Tile(name, id);
      tiles[tile.id] = tile;
    });
  });
  return tiles;
}

function initPlayers(playerInputs = []) {
  return playerInputs.map(
    (player) =>
      new Player(player.name, player.socketId, player.id, player.dollars)
  );
}

function initTiles(tileInputs) {
  const tiles = {};
  for (const t in tileInputs) {
    const tile = tileInputs[t];
    tiles[t] = new Tile(tile.name, tile.id, tile._hotel, tile._owner);
    //TODO: found a bug with _owner and _hotel - might apply to other gamepieces. Should check that out.
  }
  return tiles;
}

function initHotels(hotelInputs, tiles) {
  const hotelChains = {};
  hotelInputs = hotelInputs || elements.hotels;
  for (const hotelId in hotelInputs) {
    const hotel = hotelInputs[hotelId];
    const hotelTiles = getTileOwners(objToArr(tiles)).hotels[hotelId] || {};
    const hotelChain = new HotelChain(
      hotel.name,
      hotelId,
      hotel.color,
      hotel.tier,
      Object.keys(hotelTiles).length > 0,
      Object.keys(hotelTiles).length >= rules.safeChainCount
    );
    //TODO: Feels like there may be more to init here for existing data
    hotelChains[hotelId] = hotelChain;
  }
  return hotelChains;
}

function initStocks(inputStocks, hotels) {
  const stocks = {};
  for (const hotelId in hotels) {
    const hotel = hotels[hotelId];
    if (!stocks[hotelId]) stocks[hotelId] = [];
    for (let i = 0; i < rules.stockCount; i++) {
      let owner = null;
      if (inputStocks) {
        owner = inputStocks[hotelId][i]._owner;
      }
      const stock = new Card(
        `${hotel.name} #${i}`,
        `${hotelId}_${i}`,
        hotelId,
        owner
      );
      stocks[hotelId].push(stock);
    }
  }
  return stocks;
}

function initTurns(turns = []) {
  return turns.map((turn) => {
    return new Turn(turn.playerId, turn.id, turn.tileId, turn.stocks);
  });
}

module.exports = Game;
