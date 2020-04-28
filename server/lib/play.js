const rules = require('./rules.json');
const elements = require('./elements.json');
const { objToArr } = require('./helpers');

function getRandomUnownedTile(tiles) {
  const unassignedTiles = tiles.filter((tile) => !tile.owner);
  return unassignedTiles[getRandomInt(0, unassignedTiles.length)];
}

function deal(game) {
  const tiles = objToArr(game.tiles);
  console.log('tiles', tiles);
  game.players.forEach((player) => {
    const tilesByOwner = game.tileOwnership;
    const playerTiles = tilesByOwner[player.id] || {};
    let currentCount = Object.keys(playerTiles).length;
    if (currentCount < rules.maxPlayerTiles) {
      getRandomUnownedTile(tiles).owner = player.id;
      deal(game);
    }
  });
}

function assignTile(tileId, selectedHotel, tiles) {
  if (!selectedHotel) return;
  console.log('assigning tile %s to %s', tileId, selectedHotel);
  tiles[tileId].hotel = selectedHotel;
  tiles[tileId].owner = 'board';
  // recursively assign
  const adjacentTiles = findAdjacentTiles(tileId, tiles);
  console.log('more to assign? adjacents: ', JSON.stringify(adjacentTiles));
  for (t in adjacentTiles) {
    const tile = adjacentTiles[t];
    console.log('does %s need assignment', JSON.stringify(tile));
    if (tile.owner === 'board' && tile.hotel !== selectedHotel) {
      console.log('yes!');
      assignTile(tile.id, selectedHotel, tiles);
    }
  }
}

function getTileOwners(tiles) {
  tiles = objToArr(tiles);
  const owners = {};
  const hotels = {};
  tiles.forEach((tile) => {
    if (!owners[tile.owner]) owners[tile.owner] = {};
    owners[tile.owner][tile.id] = tile;
    if (tile.hotel) {
      if (!hotels[tile.hotel]) hotels[tile.hotel] = {};
      hotels[tile.hotel][tile.id] = tile;
    }
  });
  return { owners, hotels };
}

function getStockOwners(stocks, players) {
  const owners = {
    bank: [],
  };
  players.forEach((player) => {
    owners[player.id] = [];
  });
  for (const deck in stocks) {
    stocks[deck].forEach((stock) => {
      if (stock.owner) {
        if (!owners[stock.owner]) owners[stock.owner] = [];
        owners[stock.owner].push(stock);
      } else {
        owners.bank.push(stock);
      }
    });
  }
  return owners;
}

function decideTileAssociations(inputTile, tiles) {
  const adjacentTiles = findAdjacentTiles(inputTile, tiles);
  console.log('examined: ', adjacentTiles);
  const hotels = [];
  let merger = false;
  let island = true;
  for (tile in adjacentTiles) {
    const currentTile = adjacentTiles[tile];
    if (currentTile.hotel) {
      if (!hotels.length) {
        console.log('not assigned yet');
        hotels.push(currentTile.hotel);
      } else if (hotels.includes(currentTile.hotel) && hotels.length === 1) {
        console.log('ok, good match');
      } else {
        console.log('looks like a merger');
        if (!hotels.includes(currentTile.hotel)) hotels.push(currentTile.hotel);
        merger = true;
      }
    }
    if (currentTile.owner === 'board') {
      island = false;
    }
  }
  return {
    isIsland: island,
    merger: merger,
    hotels: hotels,
  };
}

function findAdjacentTiles(inputTile, tiles) {
  if (typeof inputTile === 'string') inputTile = { id: inputTile };
  const tileArr = inputTile.id.split('_');

  const letter = tileArr[0];
  const number = parseInt(tileArr[1]);

  const letterIndex = elements.rows.indexOf(letter);
  const numberIndex = elements.columns.indexOf(number);

  const aboveIndex = `${elements.rows[letterIndex - 1]}_${number}`;
  const belowIndex = `${elements.rows[letterIndex + 1]}_${number}`;
  const leftIndex = `${letter}_${elements.columns[numberIndex - 1]}`;
  const rightIndex = `${letter}_${elements.columns[numberIndex + 1]}`;

  const above = tiles[aboveIndex];
  const below = tiles[belowIndex];
  const left = tiles[leftIndex];
  const right = tiles[rightIndex];

  return {
    above: {
      hotel: above && above.hotel ? above.hotel : null,
      owner: above && above.owner ? above.owner : null,
      id: aboveIndex,
    },
    below: {
      hotel: below && below.hotel ? below.hotel : null,
      owner: below && below.owner ? below.owner : null,
      id: belowIndex,
    },
    left: {
      hotel: left && left.hotel ? left.hotel : null,
      owner: left && left.owner ? left.owner : null,
      id: leftIndex,
    },
    right: {
      hotel: right && right.hotel ? right.hotel : null,
      owner: right && right.owner ? right.owner : null,
      id: rightIndex,
    },
  };
}

function getPlayerById(players, playerId) {
  for (i = 0; players.length; i++) {
    if (players[i].id === playerId) {
      return {
        player: players[i],
        index: i,
      };
    }
  }
  return {
    player: {},
    index: -99,
  };
}

// helpers

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

module.exports = {
  deal,
  assignTile,
  getStockOwners,
  getTileOwners,
  decideTileAssociations,
  findAdjacentTiles,
  getRandomUnownedTile,
  getPlayerById,
};
