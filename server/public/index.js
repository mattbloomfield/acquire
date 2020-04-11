/**
 * TODO:
 * Need to auto give stock to first person who creates company
 * Need to show tiles for all players
 * Need to handle user accounts
 * Handle history in order to go backward in time
 * Need to handle stock purchases (make a shopping cart)
 * Figure out when to trigger events (turns);
 * what if create a company and none are available
 * handle safe merges -- 11 or more tiles - results in bogus tiles
 * handle 2 for 1 stock trades
 *
 */

/**
 * ISSUES:
 *
 * When you click a tile in your hand that creates a chain it gives the dropdown on the tile in your hand.
 */

const history = [];
var socket = io();

const gameEls = {
  tiles: {},
  hotels: {},
  stocks: {},
  selectedPlayer: null,
  currentPlayer: null,
  players: [],
};

const inputs = {
  safeChainCount: 11,
  stockCount: 25,
  maxPlayerTiles: 6,
  stocksPerTurn: 3,
  rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
  columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  hotels: [
    {
      name: "American Properties",
      id: "amer",
      color: "#7eb8da",
      tier: 1,
    },
    {
      name: "Continental Resorts",
      id: "cont",
      color: "#92ddea",
      tier: 2,
    },
    {
      name: "Worldwide Properties",
      id: "world",
      color: "#c6b29b",
      tier: 1,
    },
    {
      name: "Festival Properties",
      id: "fest",
      color: "#9cb8a0",
      tier: 1,
    },
    {
      name: "Tower Hotels",
      id: "tower",
      color: "#fcebae",
      tier: 0,
    },
    {
      name: "Luxor Hotels",
      id: "lux",
      color: "#efc67c",
      tier: 0,
    },
    {
      name: "Imperial Resorts",
      id: "imp",
      color: "#ffa5d8",
      tier: 2,
    },
  ],
};

const init = () => {
  gameEls.tiles = initTiles(inputs.rows, inputs.columns);
  gameEls.hotels = initHotels(inputs.hotels);
  gameEls.stocks = initStocks(objToArr(gameEls.hotels), inputs.stockCount);
  buildBoard(objToArr(gameEls.tiles));
  buildPlayers(gameEls.players);
  buildStocks(gameEls.stocks);
};

const update = () => {
  buildBoard(objToArr(gameEls.tiles));
  buildPlayers(gameEls.players);
  buildStocks(gameEls.stocks);
  buildCurrentShoppingCart(gameEls.stocks);
  dealTiles(objToArr(gameEls.tiles));
};

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////   EVENT HANDLERS   ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

const handleBodyClick = ev => {
  if (ev.target.matches(".board-tile")) return handleTileClick(ev, "board");
  if (ev.target.matches(".player-tile")) return handleTileClick(ev, "hand");
  if (ev.target.matches(".stock-purchase-btn")) return handleStockPurchase(ev);
  if (ev.target.matches(".dropdown-item")) return handleDropdownOptionClick(ev);
  if (ev.target.matches(".modal-ack-button")) return handleModalAckClick(ev);
  if (ev.target.matches(".start-game-btn")) return handleStartGameClick(ev);
  if (ev.target.matches(".end-turn-btn")) return handleEndTurnClick(ev);
  if (ev.target.matches(".merge-winner-btn")) return handleMergeWinnerClick(ev);
  console.log("killing the dropdown");
  removeEl("Dropdown");
};

const handleTileClick = (ev, location) => {
  const tileId = ev.target.getAttribute("data-tile-id");
  const tile = gameEls.tiles[tileId];
  // check if player is correcting a misplay
  // TODO: should verify that this was the tile they just played
  if (tile.owner === "board" && location === "board") {
    tile.owner = gameEls.selectedPlayer;
    tile.hotel = null;
    update();
  } else if (location === "hand") {
    tile.owner = "board";
    const associations = decideTileAssociations(tile);
    const startingNewChain =
      !associations.hotels.length && !associations.isIsland;
    if (associations.merger) {
      handleMerger(associations, tileId);
    } else if (startingNewChain) {
      const tileLocation = getTileLocation(tileId);
      buildDropdown(tileLocation.pageX, tileLocation.pageY, tileId);
    } else {
      assignTile(tileId, associations.hotels[0]);
      update();
    }
  }
};

const handleStockPurchase = ev => {
  ev.preventDefault();
  const hotel = ev.target.getAttribute("data-hotel");
  for (i = 0; i < gameEls.stocks[hotel].length; i++) {
    const card = gameEls.stocks[hotel][i];
    if (card.owner) continue;
    card.owner = gameEls.currentTurn.id;
    break;
  }
  console.log("purchased stock in %s", hotel);
  update();
};

const handleDropdownOptionClick = ev => {
  ev.preventDefault();
  const optionEl = document.getElementById(ev.target.id);
  const selectedHotel = optionEl.getAttribute("data-hotel");
  const tileId = optionEl.getAttribute("data-tile-id");
  assignTile(tileId, selectedHotel);
  removeEl("Dropdown");
};

const handleModalAckClick = ev => {
  removeEl("Modal");
  const tileId = ev.target.getAttribute("data-tile-id");
  const winner = ev.target.getAttribute("data-winner");
  if (winner) assignTile(tileId, winner);
};

const handleMergeWinnerClick = ev => {
  const hotel = ev.target.value;
  const tileId = ev.target.getAttribute("data-tile-id");
  assignTile(tileId, hotel);
};

const handleStartGameClick = ev => {
  ev.preventDefault();
  gameEls.currentTurn = new Turn(gameEls.players[0].id);
  update();
};

const handleEndTurnClick = ev => {
  ev.preventDefault();
  const current = getPlayerById(gameEls.currentTurn.player);
  const player = current.player;
  // maybe should finalize any logic or something or save the current state in a history
  gameEls.currentTurn.stocks.forEach(stock => (stock.owner = player.id));

  // create a new turn
  const currentPlayerIndex = current.index;
  const nextPlayerIndex =
    currentPlayerIndex + 1 >= gameEls.players.length
      ? 0
      : currentPlayerIndex + 1;
  gameEls.currentTurn = new Turn(gameEls.players[nextPlayerIndex].id);
  update();
};
/** Right clicks */

const handleTileRightClick = ev => {
  ev.preventDefault();
  const id = ev.target.id;
  buildDropdown(ev.pageX, ev.pageY, id);
  return false;
};

/** Radio Change */

const handlePlayerSelect = ev => {
  gameEls.selectedPlayer = ev.target.id;
};

/** Form Submit */

const handlePlayerAdd = ev => {
  ev.preventDefault();
  const name = document.getElementById("NewPlayerName").value;
  gameEls.players.push(new Player(name));
  document.getElementById("NewPlayerName").value = "";
  dealTiles(objToArr(gameEls.tiles));
  socket.emit("new player", gameEls.players);
  update();
};

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////      GAME PLAY     ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function handleMerger(loyalty, tileId) {
  const bodyEl = createEl("div");
  const introImg = createEl("img", {
    src: "https://media.giphy.com/media/IB9foBA4PVkKA/giphy.gif",
  });
  const introEl = createEl("p", {
    innerHTML:
      "By placing a tile here you are creating a merger. After you have divied out the cash, advance through this screen to continue",
  });
  const mergerInfoEl = createEl("div", {
    classList: "merger-hotels",
  });
  let winner = null;
  let winningSize = 0;
  let tieExists = false;
  loyalty.hotels.forEach(hotelId => {
    const hotel = gameEls.hotels[hotelId];
    const size = Object.keys(hotel.tiles).length;
    if (size > winningSize) {
      winner = hotel.id;
      winningSize = size;
      tieExists = false;
    } else if (size === winningSize) tieExists = true;

    const hotelInfoEl = createEl("div", {
      classList: `merger-hotel-info ${hotel.id}`,
    });
    const hotelHeaderEl = createEl("h3", {
      innerHTML: hotel.name,
    });
    const hotelListEl = createEl("ul");
    const sizeEl = createEl("li", {
      innerHTML: `Current Size: ${size} tiles`,
    });
    const majorityEl = createEl("li", {
      innerHTML: `Majority Payout: $${hotel.majorityPrice}`,
    });
    const minorityEl = createEl("li", {
      innerHTML: `Minority Payout: $${hotel.minorityPrice}`,
    });
    const stockEl = createEl("li", {
      innerHTML: `Stock Price: $${hotel.stockPrice}`,
    });
    hotelListEl.append(sizeEl);
    hotelListEl.append(majorityEl);
    hotelListEl.append(minorityEl);
    hotelListEl.append(stockEl);
    hotelInfoEl.append(hotelHeaderEl);
    hotelInfoEl.append(hotelListEl);
    mergerInfoEl.append(hotelInfoEl);
  });

  bodyEl.append(introImg);
  bodyEl.append(introEl);
  bodyEl.append(mergerInfoEl);
  buildModal(`It's Peanut Butter Merging Time!!`, bodyEl, "Merge is Complete");
  if (!tieExists) {
    const badge = createEl("div", {
      innerHTML: "Winner",
      classList: "merger-winner-badge",
    });
    document.querySelector(`.modal .${winner}`).append(badge);
    document
      .querySelector(`.modal-ack-button`)
      .setAttribute("data-winner", winner);
    document
      .querySelector(`.modal-ack-button`)
      .setAttribute("data-tile-id", tileId);
  } else {
    let html = `<h3>Please pick a winner</h3>`;
    loyalty.hotels.forEach(hotelId => {
      html += `<button value="${hotelId}" data-tile-id="${tileId}" class="merge-winner-btn">${gameEls.hotels[hotelId].name}</button>`;
    });
    document.querySelector(`.modal-body`).append(
      createEl("p", {
        innerHTML: html,
      })
    );
  }
}

function dealTiles(tiles) {
  gameEls.players.forEach(player => {
    console.log("player tiles", player.tiles);
    let currentCount = Object.keys(player.tiles).length;
    if (currentCount < inputs.maxPlayerTiles) {
      // do {
      getRandomUnownedTile(tiles).owner = player.id;
      dealTiles(tiles);
      // currentCount = Object.keys(player.tiles).length;
      // } while (currentCount < inputs.maxPlayerTiles)
    }
  });
}

function getRandomUnownedTile(tiles) {
  const unassignedTiles = tiles.filter(tile => !tile.owner);
  return unassignedTiles[getRandomInt(0, unassignedTiles.length)];
}

function assignTile(tileId, selectedHotel) {
  if (!selectedHotel) return;
  console.log("assigning tile", tileId);
  gameEls.tiles[tileId].hotel = selectedHotel;
  update();
  //   document.getElementById(tileId).classList.add(selectedHotel);
  // recursively assign
  const adjacentTiles = findAdjacentTiles(tileId);
  console.log("more to assign? ", adjacentTiles);
  for (t in adjacentTiles) {
    const tile = adjacentTiles[t];
    console.log("does %s need assignment", JSON.stringify(tile));
    if (tile.owner === "board" && tile.hotel !== selectedHotel) {
      console.log("yes!");
      assignTile(tile.id, selectedHotel);
    }
  }
}

function allocateTiles(tiles) {
  const owners = {
    board: {},
  };
  const hotels = {};
  for (const hotel in gameEls.hotels) {
    hotels[hotel] = {};
  }
  gameEls.players.forEach(player => {
    owners[player.id] = {};
  });
  tiles.forEach(tile => {
    if (!owners[tile.owner]) owners[tile.owner] = {};
    owners[tile.owner][tile.id] = tile;
    if (tile.hotel) {
      hotels[tile.hotel][tile.id] = tile;
    }
  });
  return { owners, hotels };
}

function allocateStocks(stocks) {
  const owners = {
    bank: [],
  };
  gameEls.players.forEach(player => {
    owners[player.id] = [];
  });
  for (const deck in stocks) {
    stocks[deck].forEach(stock => {
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

function decideTileAssociations(inputTile) {
  const adjacentTiles = findAdjacentTiles(inputTile);
  console.log("examined: ", adjacentTiles);
  const hotels = [];
  let merger = false;
  let island = true;
  for (tile in adjacentTiles) {
    const currentTile = adjacentTiles[tile];
    if (currentTile.hotel) {
      if (!hotels.length) {
        console.log("not assigned yet");
        hotels.push(currentTile.hotel);
      } else if (hotels.includes(currentTile.hotel) && hotels.length === 1) {
        console.log("ok, good match");
      } else {
        console.log("looks like a merger");
        if (!hotels.includes(currentTile.hotel)) hotels.push(currentTile.hotel);
        merger = true;
      }
    }
    if (currentTile.owner === "board") {
      island = false;
    }
  }
  console.log("hotels", hotels);
  return {
    isIsland: island,
    merger: merger,
    hotels: hotels,
  };
}

function findAdjacentTiles(inputTile) {
  if (typeof inputTile === "string") inputTile = { id: inputTile };
  const tileArr = inputTile.id.split("_");

  const letter = tileArr[0];
  const number = parseInt(tileArr[1]);

  const letterIndex = inputs.rows.indexOf(letter);
  const numberIndex = inputs.columns.indexOf(number);

  const aboveIndex = `${inputs.rows[letterIndex - 1]}_${number}`;
  const belowIndex = `${inputs.rows[letterIndex + 1]}_${number}`;
  const leftIndex = `${letter}_${inputs.columns[numberIndex - 1]}`;
  const rightIndex = `${letter}_${inputs.columns[numberIndex + 1]}`;

  const above = gameEls.tiles[aboveIndex];
  const below = gameEls.tiles[belowIndex];
  const left = gameEls.tiles[leftIndex];
  const right = gameEls.tiles[rightIndex];

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

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////  EVENT LISTENERS   ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

document
  .getElementById("AddPlayer")
  .addEventListener("submit", handlePlayerAdd);
document.addEventListener("click", handleBodyClick);

/** INIT FUNCTIONS */

function initTiles(rows, columns) {
  const tiles = {};
  rows.forEach(row => {
    columns.forEach(column => {
      const name = `${row}${column}`;
      const id = `${row}_${column}`;
      const tile = new Tile(name, id);
      tiles[tile.id] = tile;
    });
  });
  return tiles;
}

function initHotels(inputHotels) {
  const hotels = {};
  inputHotels.forEach(h => {
    const hotel = new HotelChain(h.name, h.id, h.color, h.tier);
    hotels[h.id] = hotel;
  });
  return hotels;
}

function initStocks(hotels, stockCount) {
  const stocks = {};
  hotels.forEach(h => {
    if (!stocks[h.id]) stocks[h.id] = [];
    for (let i = 0; i < stockCount; i++) {
      const stock = new Card(`${h.name} #${i}`, `${h.id}_${i}`, h.id);
      stocks[h.id].push(stock);
    }
  });
  return stocks;
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////  DOM MANIPULATION  ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function buildBoard(tiles) {
  emptyEl("GameBoard");
  tiles.forEach(tile => {
    let classes = "board-tile";
    if (tile.owner === "board") {
      classes += " board-tile-filled";
    }
    if (tile.hotel) {
      classes += ` ${tile.hotel}`;
    }
    const tileEl = createEl(
      "div",
      {
        classList: classes,
        innerHTML: tile.name,
      },
      {
        id: tile.id,
        "data-tile-id": tile.id,
      }
    );
    tileEl.addEventListener("contextmenu", handleTileRightClick, false);
    document.getElementById("GameBoard").append(tileEl);
  });
}

function buildPlayers(players) {
  emptyEl("Players");
  players.forEach(player => {
    const playerContainer = createEl("div", {
      classList: "player-container",
    });
    const playerEl = createEl(
      "label",
      {
        classList: "player",
      },
      {
        for: player.id,
      }
    );
    const name = createEl("h3", {
      classList: "player-name",
      innerHTML: player.name,
    });
    const title = createEl("p", {
      classList: "player-name",
      innerHTML: `Player #${player.number}`,
    });
    const input = createEl("input", {
      type: "radio",
      class: "player-input",
      name: "player",
      value: player.number,
      checked: gameEls.currentTurn?.player === player.id,
      disabled: "disabled",
      id: player.id,
    });

    const tiles = player.tiles;
    const tilesEl = createEl("div", {
      classList: "player-tiles",
    });

    for (t in tiles) {
      const tileEl = createEl(
        "div",
        {
          innerHTML: t,
          classList: "player-tile",
        },
        {
          "data-tile-id": t,
        }
      );
      tilesEl.append(tileEl);
    }

    playerEl.append(name);
    playerEl.append(title);
    input.addEventListener("change", handlePlayerSelect);
    playerContainer.append(input);
    playerContainer.append(playerEl);
    playerContainer.append(tilesEl);
    document.getElementById("Players").append(playerContainer);
  });
}

function buildStocks(stocks) {
  console.log("rebuilding stocks");
  emptyEl("Stocks");
  const ul = createEl("ul");
  document.getElementById("Stocks").append(ul);
  for (deck in stocks) {
    const hotel = gameEls.hotels[deck];
    const count = stocks[deck].filter(stock => !stock.owner).length;
    const deckEl = createEl("li", {
      classList: `deck ${deck}`,
    });
    const nameEl = createEl("h3", {
      innerHTML: hotel.name,
    });
    const countEl = createEl("p", {
      innerHTML: `${count} shares remaining`,
    });
    const buttonEl = createEl(
      "button",
      {
        innerHTML: `Purchase Stock for $${hotel.stockPrice}`,
        classList: "stock-purchase-btn",
      },
      {
        "data-hotel": deck,
      }
    );
    deckEl.append(nameEl);
    deckEl.append(countEl);
    // check if active
    if (hotel.active) deckEl.append(buttonEl);
    ul.append(deckEl);
  }
}

function buildDropdown(x, y, tileId) {
  removeEl("Dropdown");
  const dropdownEl = createEl(
    "div",
    { classList: "dropdown", id: "Dropdown" },
    { style: `top: ${y}px; left: ${x}px` }
  );
  const header = createEl("div", {
    innerHTML: "Choose a Hotel",
    classList: "dropdown-item dropdown-header",
  });
  dropdownEl.append(header);
  const hotels = objToArr(gameEls.hotels).sort((a, b) => a.tier - b.tier);
  hotels.forEach(hotel => {
    const option = createEl(
      "div",
      {
        innerHTML: `${hotel.name} (Tier ${hotel.tier})`,
        classList: `dropdown-item ${hotel.id}`,
        id: `${hotel.id}_Dropdown_Option`,
      },
      {
        "data-hotel": hotel.id,
        "data-tile-id": tileId,
      }
    );
    if (!hotel.active) {
      dropdownEl.append(option);
    }
  });
  document.getElementById("Wrapper").append(dropdownEl);
}

function buildModal(header, content, ackText) {
  const modalEl = createEl("div", {
    id: "Modal",
    classList: "modal",
  });
  const modalHeaderEl = createEl("div", { classList: "modal-header" });
  const headerEl = createEl("h2", { innerHTML: header });
  modalHeaderEl.append(headerEl);
  const modalBodyEl = createEl("div", { classList: "modal-body" });
  modalBodyEl.append(content);
  const modalFooterEl = createEl("div", { classList: "modal-footer" });
  const modalAckBtn = createEl("button", {
    type: "submit",
    classList: "modal-ack-button btn",
    innerHTML: ackText,
  });
  modalFooterEl.append(modalAckBtn);
  modalEl.append(modalHeaderEl);
  modalEl.append(modalBodyEl);
  modalEl.append(modalFooterEl);
  document.getElementById("Wrapper").append(modalEl);
}

function buildCurrentShoppingCart() {
  emptyEl("CurrentPlayerBasket");
  if (!gameEls.currentTurn) return;
  const stocks = gameEls.currentTurn.stocks;
  if (!stocks) return;
  let totalPrice = 0;
  stocks.forEach(stock => {
    totalPrice = totalPrice + gameEls.hotels[stock.hotel].stockPrice;
    const stockEl = createEl("div", {
      classList: "stock stock-in-basket",
      innerHTML: stock.name,
      id: stock.id,
    });
    document.getElementById("CurrentPlayerBasket").append(stockEl);
  });
  document.getElementById("CurrentPlayerBasket").append(
    createEl("div", {
      classList: "stock-total",
      innerHTML: `Total Price: $${totalPrice}`,
    })
  );
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////     DOM HELPERS    ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function createEl(tag, options = {}, attrs = {}) {
  const el = document.createElement(tag);
  for (opt in options) {
    el[opt] = options[opt];
  }
  for (attr in attrs) {
    el.setAttribute(attr, attrs[attr]);
  }
  return el;
}

function emptyEl(id) {
  const el = document.getElementById(id);
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function removeEl(id) {
  const element = document.getElementById(id);
  if (!element) return;
  element.parentNode.removeChild(element);
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////    CONSTRUCTORS    ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

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

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////       HELPERS      ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function objToArr(obj) {
  const arr = [];
  for (const prop in obj) {
    arr.push(obj[prop]);
  }
  return arr;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function getTileLocation(tileId) {
  const tile = document.getElementById(tileId);
  const tileRect = tile.getBoundingClientRect();
  const bodyRect = document.body.getBoundingClientRect();
  return {
    pageY: tileRect.top - bodyRect.top,
    pageX: tileRect.left - bodyRect.left,
  };
}

function getPlayerById(playerId) {
  for (i = 0; gameEls.players.length; i++) {
    if (gameEls.players[i].id === playerId) {
      return {
        player: gameEls.players[i],
        index: i,
      };
    }
  }
  return {
    player: null,
    index: null,
  };
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////      DEBUGGING     ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function printToDebug() {
  emptyEl("Debug");
  for (el in gameEls) {
    const itemContainer = createEl("code", { classList: "debug-container" });
    const header = createEl("h3", { innerHTML: el });
    const itemEl = createEl("pre", {
      innerHTML: syntaxHighlight(JSON.stringify(gameEls[el], null, 2)),
    });
    itemContainer.append(header);
    itemContainer.append(itemEl);
    document.getElementById("Debug").append(itemContainer);
  }
}

function syntaxHighlight(json) {
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = "number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "key";
        } else {
          cls = "string";
        }
      } else if (/true|false/.test(match)) {
        cls = "boolean";
      } else if (/null/.test(match)) {
        cls = "null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}

init();
