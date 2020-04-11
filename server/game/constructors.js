const elements = require("./elements.json");

class Game {
  constructor() {
    this.tiles = this.initTiles();
    this.hotels = this.initHotels();
    this.stocks = this.initStocks();
    this.selectedPlayer = null;
    this.currentPlayer = null;
    this.players = [];
  }

  initTiles() {
    const tiles = {};
    elements.rows.forEach(row => {
      elements.columns.forEach(column => {
        const name = `${row}${column}`;
        const id = `${row}_${column}`;
        const tile = new Tile(name, id);
        tiles[tile.id] = tile;
      });
    });
    return tiles;
  }

  initHotels() {
    const hotels = {};
    elements.hotels.forEach(h => {
      const hotel = new HotelChain(h.name, h.id, h.color, h.tier);
      hotels[h.id] = hotel;
    });
    return hotels;
  }

  initStocks() {
    const stocks = {};
    elements.hotels.forEach(h => {
      if (!stocks[h.id]) stocks[h.id] = [];
      for (let i = 0; i < stockCount; i++) {
        const stock = new Card(`${h.name} #${i}`, `${h.id}_${i}`, h.id);
        stocks[h.id].push(stock);
      }
    });
    return stocks;
  }
}

class Player {
  constructor(name) {
    const number = gameEls.players.length + 1;
    this.name = name;
    this.id = `player_${number}`;
    this.number = number;
  }

  get tiles() {
    return allocateTiles(objToArr(gameEls.tiles)).owners[this.id];
  }

  get stocks() {
    allocateStocks(gameEls.stocks)[this.id];
  }
}

class Turn {
  constructor(player) {
    this.id = new Date().getTime();
    this.tile = null;
    this.player = player;
  }

  get stocks() {
    return allocateStocks(gameEls.stocks)[this.id] || [];
  }
}

class HotelChain {
  /**
   * Create a property chain (only to be called at beginning of game)
   * @param {string} name Name of the chain
   * @param {string} color A valid css color
   * @param {number} tier 0, 1, or 2, serving as the offset for pricing
   */
  constructor(name, id, color, tier) {
    this.name = name;
    this.id = id;
    this.color = color;
    this.tier = tier;
  }

  /**
   * Gets the stock pricing information given a companies profile
   * @param {number} tileCount
   * @param {number} tier
   */
  getStockPrice = (tileCount, tier) => {
    if (tileCount === 2) {
      return this.stockPrices[0 + tier];
    } else if (tileCount === 3) {
      return this.stockPrices[1 + tier];
    } else if (tileCount === 4) {
      return this.stockPrices[2 + tier];
    } else if (tileCount === 5) {
      return this.stockPrices[3 + tier];
    } else if (tileCount >= 6 && tileCount <= 10) {
      return this.stockPrices[4 + tier];
    } else if (tileCount >= 11 && tileCount <= 20) {
      return this.stockPrices[5 + tier];
    } else if (tileCount >= 21 && tileCount <= 30) {
      return this.stockPrices[6 + tier];
    } else if (tileCount >= 31 && tileCount <= 40) {
      return this.stockPrices[7 + tier];
    } else if (tileCount >= 40) {
      return this.stockPrices[8 + tier];
    } else {
      return 0;
    }
  };

  stockPrices = [
    { price: 200, majority: 2000, minority: 1000 },
    { price: 300, majority: 3000, minority: 1500 },
    { price: 400, majority: 4000, minority: 2000 },
    { price: 500, majority: 5000, minority: 2500 },
    { price: 600, majority: 6000, minority: 3000 },
    { price: 700, majority: 7000, minority: 3500 },
    { price: 800, majority: 8000, minority: 4000 },
    { price: 900, majority: 9000, minority: 4500 },
    { price: 1000, majority: 10000, minority: 5000 },
    { price: 1100, majority: 11000, minority: 5500 },
    { price: 1200, majority: 12000, minority: 6000 },
  ];

  get stockPrice() {
    return this.getStockPrice(Object.keys(this.tiles).length, this.tier).price;
  }

  get minorityPrice() {
    return this.getStockPrice(Object.keys(this.tiles).length, this.tier)
      .minority;
  }

  get majorityPrice() {
    return this.getStockPrice(Object.keys(this.tiles).length, this.tier)
      .majority;
  }

  get tiles() {
    return allocateTiles(objToArr(gameEls.tiles)).hotels[this.id];
  }

  get active() {
    return Object.keys(this.tiles).length > 0;
  }
}

class GamePiece {
  constructor(name, id, hotel) {
    this.name = name;
    this.id = id;
    this._owner = null;
    this._hotel = hotel;
  }

  /**
   * @param {string} owner
   */
  get owner() {
    return this._owner;
  }

  set owner(owner) {
    this._owner = owner;
  }

  get hotel() {
    return this._hotel;
  }

  set hotel(hotel) {
    this._hotel = hotel;
  }
}

class Tile extends GamePiece {
  constructor(name, id) {
    super(name, id);
  }
}

class Card extends GamePiece {
  constructor(name, id, hotel) {
    super(name, id, hotel);
  }
}

module.exports = {
    Game, Player,  Turn, HotelChain, Tile, Card
};