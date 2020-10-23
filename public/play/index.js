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

const socket = io();
const globalVars = {
  preferences: {},
  gameEls: {},
  playerId: '',
  gameId: '',
  sounds: {
    alert: new Sound('insight.mp3'),
  },
};

const init = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const cdata = JSON.parse(cookie.get('acquire_game_session'));
    console.log('cookie data', cdata);
    globalVars.playerId = urlParams.get('playerId') || cdata.playerId;
    globalVars.gameId = urlParams.get('gameId') || cdata.gameId;
    // let the server know we are here so it will emit the "enter game" message
    console.log(`telling server that ${globalVars.playerId} is connected`);
    socket.emit('player joined', {
      gameId: globalVars.gameId,
      playerId: globalVars.playerId,
    });
    document
      .getElementById('ChatMessageText')
      .addEventListener('keyup', (ev) => {
        if (ev.keyCode === 13) {
          ev.preventDefault();
          handleChatMessageSend();
        }
      });
  } catch (e) {
    console.log('failed to init', e);
    alert('This session appears to be invalid, please try again');
    window.location.href = '/';
  }
};

socket.on('game error', (err) => {
  if (err === 'invalid game id') {
    alert(
      'this game id is either invalid or expired. Please start a new session'
    );
    cookie.clear('acquire_game_session');
    window.location.href = '/';
  } else {
    console.warn('error', err);
    alert(err.message);
  }
});

// allows you to enter the game. Grab the game's JSON and build your view
socket.on('enter game', (gameEls) => {
  console.log('enter game', gameEls);
  refreshView(gameEls);
});

// rebuild the view
socket.on('new player', (gameEls) => {
  console.log('new player detected', gameEls);
  refreshView(gameEls);
});

// rebuild the view
socket.on('game started', (gameEls) => {
  console.log('game started', gameEls);
  removeEl('StartGameButton');
  showEl('EndGameButton');
  refreshView(gameEls);
});

// rebuild the view
// if it's your turn, unlock your tiles and stocks
// if not your turn, lock the tiles/stocks
socket.on('turn started', (gameEls) => {
  console.log('turn started', gameEls);
  if (
    gameEls.turns[gameEls.turns.length - 1].playerId === globalVars.playerId
  ) {
    document.getElementById('IsCurrentTurn').style.width = '100px';
    globalVars.sounds.alert.play();
  } else {
    document.getElementById('IsCurrentTurn').style.width = '0';
  }
  refreshView(gameEls);
});

socket.on('decide tile hotel', (gameEls) => {
  console.log('decide tile hotel', gameEls);
  handleHotelDecision(gameEls.tileId, gameEls.hotels);
});

socket.on('choose winner', (gameEls) => {
  console.log('handle merger', gameEls);
  refreshView(gameEls.game);
  handleChoosingWinner(
    gameEls.associations,
    gameEls.tileId,
    gameEls.playerId,
    gameEls.winner,
    gameEls.tieExists,
    gameEls.sizes
  );
});

// tile placement resulted in a merger.
// build the UI locally to handle that merger
// all other players will receive a "merger in progress" message instead

socket.on('handle merger', (gameEls) => {
  console.log('handle merger', gameEls);
  refreshView(gameEls.game);
  handleMerger(
    gameEls.associations,
    gameEls.tileId,
    gameEls.playerId,
    gameEls.winner,
    gameEls.tieExists,
    gameEls.sizes
  );
});

// update the view with the played tile and show a modal with the
// current prices for all involved hotel chains
socket.on('merger in progress', (gameEls) => {
  console.log('merger in progress', gameEls);
});

// rebuild the view
socket.on('merger complete', (gameEls) => {
  console.log('merger complete', gameEls);
  refreshView(gameEls);
});

// just update the view so we get the latest
socket.on('stock purchased', (gameEls) => {
  console.log('stock purchased', gameEls);
  refreshView(gameEls);
});

socket.on('stock sold', (gameEls) => {
  console.log('stock sold', gameEls);
  refreshView(gameEls);
});

// just update the view so we get the latest
socket.on('tiles updated', (gameEls) => {
  console.log('tiles updated', gameEls);
  refreshView(gameEls);
});

// not sure anything is necessary here. Just rebuild the view
socket.on('turn complete', (gameEls) => {
  console.log('turn complete', gameEls);
  refreshView(gameEls);
});

// Show the merger view to see current pricing
socket.on('game ended', (gameEls) => {
  console.log('game ended', gameEls);
});

socket.on('new message', (chat) => {
  console.log('new message', chat);
  let playerName = 'Game Server';
  if (chat.playerId !== 'server') {
    const playerObj = getPlayerById(chat.playerId);
    playerName = playerObj.player.name;
  }
  const ownedChat = chat.playerId === globalVars.playerId;
  const chatEl = createEl('div', {
    classList: 'chat',
    innerHTML: `
      <div class="chat-owner">${playerName}</div>
      <div class="chat-message">${chat.message}</div>
    `,
  });
  if (playerName === 'Game Server') {
    chatEl.classList.add('server-message');
  }
  if (ownedChat) chatEl.classList.add('my-chat');
  document.getElementById('ChatHistory').append(chatEl);
  document.getElementById('ChatHistory').scrollTop = 9999999999;
});

const refreshView = (gameEls) => {
  globalVars.gameEls = gameEls;
  console.log('refreshing local view');
  const currentTurn = getCurrentTurn();
  buildBoard(objToArr(gameEls.tiles));
  buildPlayers(gameEls.players, currentTurn, gameEls.tiles);
  buildStocks(gameEls.stocks, gameEls.hotels);
  if (currentTurn) {
    if (currentTurn.playerId !== globalVars.playerId) {
      hideEl('EndTurnButton');
    } else {
      showEl('EndTurnButton');
    }
    document.getElementById('StockPurchaseCount').innerHTML =
      currentTurn.stocks.length;
  } else {
    hideEl('EndTurnButton');
  }
  if (gameEls.status == 'started') {
    removeEl('StartGameButton');
    showEl('EndGameButton');
  }
};

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////   EVENT HANDLERS   ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

const handleBodyClick = (ev) => {
  // if (ev.target.matches('.board-tile')) return handleTileClick(ev, 'board');
  if (ev.target.matches('.modal-ack-button')) return handleModalAckClick(ev);
  if (ev.target.matches('.start-game-btn')) return handleStartGameClick(ev);
  if (ev.target.matches('.end-game-btn')) return handleEndGame(ev);
  if (ev.target.matches('#TilesToggle')) return handleToggleTiles(ev);
  if (ev.target.matches('#ToggleAllPlayerStock')) return handleShowAllStock(ev);
  if (globalVars.status === 'merging') {
    if (ev.target.matches('.stock-sell-btn')) return handleSellStock(ev);
    if (ev.target.matches('.stock-purchase-btn'))
      return handleStockPurchase(ev);
  } else if (getCurrentTurn().playerId !== globalVars.playerId) {
    return;
  } else {
    if (ev.target.matches('.player-tile')) return handleTileClick(ev, 'hand');
    if (ev.target.matches('.stock-sell-btn')) return handleSellStock(ev);
    if (ev.target.matches('.stock-purchase-btn'))
      return handleStockPurchase(ev);
    if (ev.target.matches('.dropdown-item'))
      return handleDropdownOptionClick(ev);
    if (ev.target.matches('.end-turn-btn')) return handleEndTurnClick(ev);
    if (ev.target.matches('.merge-winner-btn'))
      return handleMergeWinnerClick(ev);
  }
  removeEl('Dropdown');
};

const handleTileClick = (ev, location) => {
  const tileId = ev.target.dataset.tileId;
  socket.emit('tile played', {
    tileId: tileId,
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
  });
};

const handleStockPurchase = (ev) => {
  ev.preventDefault();
  const hotelId = ev.target.dataset.hotelId;
  console.log('purchased stock in %s', hotelId);
  socket.emit('purchase stock', {
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
    hotelId: hotelId,
  });
};

const handleDropdownOptionClick = (ev) => {
  ev.preventDefault();
  const optionEl = document.getElementById(ev.target.id);
  const selectedHotel = optionEl.dataset.hotel;
  const tileId = optionEl.dataset.tileId;
  console.log('hotel choice', selectedHotel);
  socket.emit('hotel choice made', {
    tileId: tileId,
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
    hotelId: selectedHotel,
  });
  removeEl('Dropdown');
};

const handleModalAckClick = (ev) => {
  removeEl('Modal');
  const tileId = ev.target.dataset.tileId;
  const winner = ev.target.dataset.winner;
  if (winner) {
    socket.emit('merger complete', {
      winner: winner,
      tileId: tileId,
      playerId: globalVars.playerId,
      gameId: globalVars.gameId,
    });
  }
};

const handleMergeWinnerClick = (ev) => {
  const hotelId = ev.target.value;
  const tileId = ev.target.dataset.tileId;
  //TODO: Shouldn't send a 'merger-complete' message. Should just update everyone else's UI.
  // No one else should get a modal until the winner is decided
  socket.emit('initiate merger', {
    winner: hotelId,
    tileId: tileId,
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
  });
};

const handleStartGameClick = (ev) => {
  ev.preventDefault();
  removeEl('StartGameButton');
  socket.emit('start game', {
    gameId: globalVars.gameId,
    playerId: globalVars.playerId,
  });
};

const handleEndTurnClick = (ev) => {
  ev.preventDefault();
  const data = {
    gameId: globalVars.gameId,
    playerId: globalVars.playerId,
    turn: globalVars.gameEls.currentTurn,
  };
  console.log('ending turn', data);
  socket.emit('end turn', data);
  //TODO: handle stock selling within a turn (undo)
  //TODO: Handle the stock selling that happens at a merger
  // create a new turn
};

const handleSellStock = (ev) => {
  ev.preventDefault();
  socket.emit('sell stock', {
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
    hotelId: ev.target.dataset.hotelId,
  });
};

const handleChatMessageSend = (ev) => {
  if (ev) ev.preventDefault();
  const message = document.getElementById('ChatMessageText').value;
  console.log('message', message);
  socket.emit('chat message', { playerId: globalVars.playerId, message });
  document.getElementById('ChatMessageText').value = '';
};

const handleEndGame = (ev) => {
  ev.preventDefault();
  socket.emit('end game', {
    playerId: globalVars.playerId,
    gameId: globalVars.gameId,
  });
};

const handleToggleTiles = (ev) => {
  ev.preventDefault();
  document.getElementById('CurrentPlayerTiles').classList.toggle('hidden');
};

/** Right clicks */

const handleTileRightClick = (ev) => {
  ev.preventDefault();
  const id = ev.target.id;
  buildDropdown(ev.pageX, ev.pageY, id);
  return false;
};

/** Radio Change */

const handlePlayerSelect = (ev) => {
  globalVars.gameEls.selectedPlayer = ev.target.id;
};

/** Mouse enter/leave */

const handleMouseEnter = (ev) => {
  if (!ev.target.dataset) return;
  const tileId = ev.target.dataset.tileId;
  document.getElementById(tileId).classList.add('hovered');
};

const handleMouseLeave = (ev) => {
  if (!ev.target.dataset) return;
  const tileId = ev.target.dataset.tileId;
  document.getElementById(tileId).classList.remove('hovered');
};

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////      GAME PLAY     ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function handleChoosingWinner(
  associations,
  tileId,
  playerId,
  winner,
  tieExists,
  sizes
) {
  const bodyEl = createEl('div');
  const introEl = createEl('p', {});
  let modalHeader;
  modalHeader = `Choose your winner`;
  ackText = 'Done';
  introEl.innerHTML = 'This merger is a tie. Choose who you think should win!';

  const mergerInfoEl = createEl('div', {
    classList: 'merger-hotels',
  });

  associations.hotels.forEach((hotelId) => {
    const hotel = globalVars.gameEls.hotels[hotelId];

    const hotelInfoEl = createEl('div', {
      classList: `merger-hotel-info ${hotel.id}`,
    });
    const hotelHeaderEl = createEl('h3', {
      innerHTML: hotel.name,
    });
    const hotelListEl = createEl('ul');
    const sizeEl = createEl('li', {
      innerHTML: `Current Size: ${sizes[hotelId]} tiles`,
    });
    //TODO: Do some logic here and show the winners and losers by name. Also stocks inline
    //TODO: Also show the buttons to sell, trade 2:1, or keep.
    const majorityEl = createEl('li', {
      innerHTML: `Majority Payout: $${hotel.majorityPrice || 0}`,
    });
    const minorityEl = createEl('li', {
      innerHTML: `Minority Payout: $${hotel.minorityPrice || 0}`,
    });
    const stockEl = createEl('li', {
      innerHTML: `Stock Price: $${hotel.stockPrice || 0}`,
    });
    hotelListEl.append(sizeEl);
    hotelListEl.append(majorityEl);
    hotelListEl.append(minorityEl);
    hotelListEl.append(stockEl);
    hotelInfoEl.append(hotelHeaderEl);
    hotelInfoEl.append(hotelListEl);
    mergerInfoEl.append(hotelInfoEl);
  });

  bodyEl.append(introEl);
  bodyEl.append(mergerInfoEl);
  buildModal(modalHeader, bodyEl, ackText);
  let html = `<h3>Please pick a winner</h3>`;
  associations.hotels.forEach((hotelId) => {
    html += `<button value="${hotelId}" data-tile-id="${tileId}" class="merge-winner-btn">${globalVars.gameEls.hotels[hotelId].name}</button>`;
  });
  document.querySelector(`.modal-body`).append(
    createEl('p', {
      innerHTML: html,
    })
  );
}

function handleMerger(
  associations,
  tileId,
  playerId,
  winner,
  tieExists,
  sizes
) {
  const bodyEl = createEl('div');
  const introImg = createEl('img', {
    src: 'https://media.giphy.com/media/IB9foBA4PVkKA/giphy.gif',
  });
  const introEl = createEl('p', {});
  let modalHeader;
  if (tileId) {
    modalHeader = `It's Peanut Butter Merging Time!!`;
    ackText = 'Merge is Complete';
    introEl.innerHTML =
      'By placing a tile here a merger has been created. After you have divied out the cash, advance through this screen to continue';
  } else {
    introEl.innerHTML = `Use the prices below to help you finish out the game`;
    modalHeader = `Game Over Dude...`;
    ackText = 'Finish the Game';
  }
  const mergerInfoEl = createEl('div', {
    classList: 'merger-hotels',
  });

  const stockWinners = getStockWinners();

  associations.hotels.forEach((hotelId) => {
    const hotel = globalVars.gameEls.hotels[hotelId];

    const hotelInfoEl = createEl('div', {
      classList: `merger-hotel-info ${hotel.id}`,
    });
    const hotelHeaderEl = createEl('h3', {
      innerHTML: hotel.name,
    });
    const hotelListEl = createEl('ul');
    const sizeEl = createEl('li', {
      innerHTML: `Current Size: ${sizes[hotelId]} tiles`,
    });
    //TODO: Do some logic here and show the winners and losers by name. Also stocks inline
    //TODO: Also show the buttons to sell, trade 2:1, or keep.
    let majorityEl, minorityEl;
    const majorityWinners = stockWinners[hotelId].majority.map(
      (playerId) => getPlayerById(playerId).player.name
    );
    if (majorityWinners.length > 1 || minorityWinners.length == 0) {
      majorityEl = createEl('li', {
        innerHTML: `Majority Payout: $${
          (hotel.majorityPrice + hotel.minorityPrice) /
            majorityWinners.length || 0
        } (${majorityWinners.join(', ')})`,
      });
    } else {
      const minorityWinners = stockWinners[hotelId].minority.map(
        (playerId) => getPlayerById(playerId).player.name
      );
      majorityEl = createEl('li', {
        innerHTML: `Majority Payout: $${hotel.majorityPrice || 0} (${
          majorityWinners[0]
        })`,
      });
      minorityEl = createEl('li', {
        innerHTML: `Minority Payout: $${
          hotel.minorityPrice / minorityWinners.length || 0
        } (${minorityWinners.join(', ')})`,
      });
    }
    const stockEl = createEl('li', {
      innerHTML: `Stock Price: $${hotel.stockPrice || 0}`,
    });
    hotelListEl.append(sizeEl);
    hotelListEl.append(majorityEl);
    if (minorityEl) hotelListEl.append(minorityEl);
    hotelListEl.append(stockEl);
    hotelInfoEl.append(hotelHeaderEl);
    hotelInfoEl.append(hotelListEl);
    mergerInfoEl.append(hotelInfoEl);
  });

  bodyEl.append(introImg);
  bodyEl.append(introEl);
  bodyEl.append(mergerInfoEl);
  buildModal(modalHeader, bodyEl, ackText);
  if (!tieExists) {
    const badge = createEl('div', {
      innerHTML: 'Winner',
      classList: 'merger-winner-badge',
    });
    document.querySelector(`.modal .${winner}`).append(badge);
    document
      .querySelector(`.modal-ack-button`)
      .setAttribute('data-winner', winner);
    document
      .querySelector(`.modal-ack-button`)
      .setAttribute('data-tile-id', tileId);
  } else {
    let html = `<h3>Please pick a winner</h3>`;
    associations.hotels.forEach((hotelId) => {
      html += `<button value="${hotelId}" data-tile-id="${tileId}" class="merge-winner-btn">${globalVars.gameEls.hotels[hotelId].name}</button>`;
    });
    document.querySelector(`.modal-body`).append(
      createEl('p', {
        innerHTML: html,
      })
    );
  }
}
const handleHotelDecision = (tileId, hotels) => {
  const tileEl = document.getElementById(tileId);
  const coordinates = tileEl.getBoundingClientRect();
  buildDropdown(coordinates.left, coordinates.top, tileId, hotels);
};

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////  EVENT LISTENERS   ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

document.addEventListener('click', handleBodyClick);
document
  .getElementById('ChatMessage')
  .addEventListener('submit', handleChatMessageSend);

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////  DOM MANIPULATION  ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function buildBoard(tiles = []) {
  console.log('building board', tiles);
  emptyEl('GameBoard');
  tiles.forEach((tile) => {
    let classes = 'board-tile';
    if (tile._owner === 'board') {
      classes += ' board-tile-filled';
    }
    if (tile._hotel) {
      classes += ` ${tile._hotel}`;
    }
    const tileEl = createEl(
      'div',
      {
        classList: classes,
        innerHTML: tile.name,
      },
      {
        id: tile.id,
        'data-tile-id': tile.id,
      }
    );
    tileEl.addEventListener('contextmenu', handleTileRightClick, false);
    document.getElementById('GameBoard').append(tileEl);
  });
}

function buildPlayers(players = [], currentTurn, tiles) {
  console.log('building players', players);
  emptyEl('Players');
  players.forEach((player) => {
    const playerContainer = createEl('div', {
      classList: 'player-container',
    });
    const playerEl = createEl(
      'label',
      {
        classList: 'player',
      },
      {
        for: player.id,
      }
    );
    if (currentTurn && currentTurn.playerId === player.id)
      playerEl.classList.add('my-turn');
    const name = createEl('h3', {
      classList: 'player-name',
      innerHTML: player.name,
    });

    playerEl.append(name);
    playerContainer.append(playerEl);
    console.log('global player', globalVars.playerId);
    console.log('current player', player.id);
    // is this the current player?
    if (globalVars.playerId === player.id) {
      emptyEl('CurrentPlayerTiles');
      // build out the tiles for the player's view
      const playerTiles = getPlayerTiles(tiles, globalVars.playerId);
      console.log('player tiles', playerTiles);
      const tilesEl = createEl('div', {
        classList: 'player-tiles',
      });

      for (t in playerTiles) {
        const tileEl = createEl(
          'div',
          {
            innerHTML: playerTiles[t].name,
            classList: 'player-tile',
          },
          {
            'data-tile-id': t,
          }
        );
        tileEl.addEventListener('mouseenter', handleMouseEnter);
        tileEl.addEventListener('mouseleave', handleMouseLeave);
        tilesEl.append(tileEl);
      }
      document.getElementById('CurrentPlayerTiles').append(tilesEl);
    }
    // build out the purchased stock cards

    document.getElementById('Players').append(playerContainer);
  });
}

function buildDropdown(x = 0, y = 0, tileId = null, hotels) {
  removeEl('Dropdown');
  const dropdownEl = createEl(
    'div',
    { classList: 'dropdown', id: 'Dropdown' },
    { style: `top: ${y}px; left: ${x}px` }
  );
  const header = createEl('div', {
    innerHTML: 'Choose a Hotel',
    classList: 'dropdown-item dropdown-header',
  });
  dropdownEl.append(header);
  hotels =
    hotels.sort((a, b) => a.tier - b.tier) ||
    objToArr(globalVars.gameEls.hotels).sort((a, b) => a.tier - b.tier);
  hotels.forEach((hotel) => {
    const option = createEl(
      'div',
      {
        innerHTML: `${hotel.name} (Tier ${hotel.tier})`,
        classList: `dropdown-item ${hotel.id}`,
        id: `${hotel.id}_Dropdown_Option`,
      },
      {
        'data-hotel': hotel.id,
        'data-tile-id': tileId,
      }
    );
    if (!hotel.active) {
      dropdownEl.append(option);
    }
  });
  document.getElementById('Wrapper').append(dropdownEl);
}

function buildModal(header, content, ackText) {
  const modalEl = createEl('div', {
    id: 'Modal',
    classList: 'modal',
  });
  const modalHeaderEl = createEl('div', { classList: 'modal-header' });
  const headerEl = createEl('h2', { innerHTML: header });
  modalHeaderEl.append(headerEl);
  const modalBodyEl = createEl('div', {
    classList: 'modal-body',
    id: 'ModalBody',
  });
  modalBodyEl.append(content);

  const modalFooterEl = createEl('div', { classList: 'modal-footer' });
  const modalAckBtn = createEl('button', {
    type: 'submit',
    classList: 'modal-ack-button btn',
    innerHTML: ackText,
  });
  modalFooterEl.append(modalAckBtn);
  modalEl.append(modalHeaderEl);
  modalEl.append(modalBodyEl);
  modalEl.append(modalFooterEl);
  document.getElementById('Wrapper').append(modalEl);
  buildStocks(null, null, 'ModalBody');
}

function buildStocks(stocks, hotels, location = 'CurrentPlayerStocks') {
  if (!hotels) hotels = globalVars.gameEls.hotels;
  if (!stocks)
    (stocks = globalVars.gameEls.stocks),
      console.log('building stocks', hotels);
  const players = seeStocksByPlayer();
  if (location === 'CurrentPlayerStocks') emptyEl(location);
  document.getElementById(location).classList.add('all-players');
  for (const playerId in players) {
    const playerMeta = createEl('h3', {
      innerHTML: players[playerId].name,
    });
    const container = createEl('div', { classList: 'stock-view' });
    const ul = createEl('ul');
    container.append(ul);
    document.getElementById(location).append(playerMeta);
    document.getElementById(location).append(container);
    for (const hotelId in players[playerId].stocks) {
      const hotel = hotels[hotelId];
      const count = stocks[hotelId].filter((stock) => !stock._owner).length;
      const hotelEl = createEl('li', {
        classList: `stock-current-player ${hotelId}`,
        innerHTML: `<b>${hotel.name}</b> <span class="shares">${players[playerId].stocks[hotelId].length} shares (${count} remain)</span>`,
      });
      const sellBtn = createEl(
        'button',
        { innerHTML: 'Sell', classList: `stock-sell-btn` },
        { 'data-hotel-id': hotelId }
      );
      const purchaseBtn = createEl(
        'button',
        {
          innerHTML: `$${hotel.stockPrice || 0}`,
          classList: `stock-purchase-btn`,
        },
        { 'data-hotel-id': hotelId }
      );
      if (!hotel.stockPrice) {
        purchaseBtn.setAttribute('disabled', 'disabled');
      }
      if (playerId === globalVars.playerId) hotelEl.append(sellBtn);
      if (playerId === globalVars.playerId) hotelEl.append(purchaseBtn);
      ul.append(hotelEl);
    }
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

function arrToObj(arr, key) {
  const obj = {};
  arr.forEach((el) => {
    obj[el[key]] = JSON.parse(JSON.stringify(el));
  });
  return obj;
}

function getPlayerTiles(tiles, playerId) {
  const playerTiles = {};
  for (tileId in tiles) {
    if (tiles[tileId]._owner === playerId) {
      playerTiles[tileId] = tiles[tileId];
    }
  }
  return playerTiles;
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
  for (i = 0; globalVars?.gameEls?.players.length; i++) {
    if (globalVars.gameEls.players[i].id === playerId) {
      return {
        player: globalVars.gameEls.players[i],
        index: i,
      };
    }
  }
  return {
    player: null,
    index: null,
  };
}

function seeStocksByPlayer() {
  const players = arrToObj(globalVars.gameEls.players, 'id');
  const stocks = globalVars.gameEls.stocks;
  for (const hotelId in stocks) {
    stocks[hotelId].forEach((stock) => {
      if (stock._owner) {
        if (!players[stock._owner].stocks) players[stock._owner].stocks = {};
        if (!players[stock._owner].stocks[hotelId])
          players[stock._owner].stocks[hotelId] = [];
        players[stock._owner].stocks[hotelId].push(stock);
      }
    });
  }
  return players;
}

function getStockWinners() {
  const playerStocks = seeStocksByPlayer();
  const winners = {};
  for (const playerId in playerStocks) {
    for (const hotelId in playerStocks[playerId].stocks) {
      if (!winners[hotelId])
        winners[hotelId] = {
          majority: [],
          minority: [],
          majorityAmount: 0,
          minorityAmount: 0,
        };
      if (
        playerStocks[playerId].stocks[hotelId].length >
        winners[hotelId].majorityAmount
      ) {
        winners[hotelId].majorityAmount =
          playerStocks[playerId].stocks[hotelId].length;
        winners[hotelId].majority = [playerId];
      } else if (
        playerStocks[playerId].stocks[hotelId].length ===
        winners[hotelId].minorityAmount
      ) {
        winners[hotelId].minority.push(playerId);
      } else if (
        playerStocks[playerId].stocks[hotelId].length >
        winners[hotelId].minorityAmount
      ) {
        winners[hotelId].minorityAmount =
          playerStocks[playerId].stocks[hotelId].length;
        winners[hotelId].minority = [playerId];
      }
    }
  }
  return winners;
}

function getCurrentTurn() {
  return globalVars.gameEls.turns[globalVars.gameEls.turns.length - 1];
}

function Sound(src) {
  this.sound = document.createElement('audio');
  this.sound.src = src;
  this.sound.setAttribute('preload', 'auto');
  this.sound.setAttribute('controls', 'none');
  this.sound.style.display = 'none';
  document.body.appendChild(this.sound);
  this.play = function () {
    this.sound.play();
  };
  this.stop = function () {
    this.sound.pause();
  };
}

/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////
//////////////////////      DEBUGGING     ///////////////////////////
/////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////

function printToDebug() {
  emptyEl('Debug');
  for (el in globalVars.gameEls) {
    const itemContainer = createEl('code', { classList: 'debug-container' });
    const header = createEl('h3', { innerHTML: el });
    const itemEl = createEl('pre', {
      innerHTML: syntaxHighlight(
        JSON.stringify(globalVars.gameEls[el], null, 2)
      ),
    });
    itemContainer.append(header);
    itemContainer.append(itemEl);
    document.getElementById('Debug').append(itemContainer);
  }
}

function syntaxHighlight(json) {
  json = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    }
  );
}

init();
