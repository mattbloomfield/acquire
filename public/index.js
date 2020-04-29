const init = async () => {
  try {
    emptyEl('CurrentGames');
    const games = await getGames();
    if (!games.length) removeEl('JoinGameHeader');
    games.forEach((game) => {
      const gameEl = buildGame(game);
      document.getElementById('CurrentGames').append(gameEl);
    });
  } catch (e) {
    console.error('error getting games', e);
  }
};

const buildGame = (game) => {
  const gameEl = createEl('div', {
    classList: 'game',
    id: `Game_${game.id}`,
  });
  if (game.started) {
    gameEl.classList.add('started');
  }
  const gameInfo = createEl('div');
  const gameName = createEl('h3', {
    innerHTML: game.name,
  });
  const gamePlayers = createEl('p', {
    classList: 'player-count',
    innerHTML: `${game.players} players have joined`,
  });
  gameInfo.append(gameName);
  gameInfo.append(gamePlayers);
  const startBtn = createEl('a', {
    href: `/new-player?gameId=${game.id}`,
    innerHTML: 'Join',
    classList: 'btn btn-primary',
  });
  const deleteBtn = createEl('button', {
    innerHTML: 'Delete',
    classList: 'btn btn-danger',
  });
  deleteBtn.addEventListener('click', async (ev) => {
    await deleteGame(game.id);
    window.location.reload();
  });
  gameEl.append(gameInfo);
  gameEl.append(startBtn);
  gameEl.append(deleteBtn);
  return gameEl;
};

const getGames = async () => {
  return fetch('/game')
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      return data.result;
    });
};

const handleFormSubmit = async (ev) => {
  ev.preventDefault();
  const name = document.getElementById('GameName').value;
  const response = await createGame(name);
  const gameInfo = response.result;
  console.log('gameInfo', gameInfo);
  if (gameInfo.id) {
    window.location.href = '/new-player?gameId=' + gameInfo.id;
  } else {
    console.warn('some error occured while creating the game', gameInfo);
  }
};

const createGame = async (name) => {
  const response = await fetch('/game', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name,
    }),
  });
  return response.json();
};

const deleteGame = async (id) => {
  const response = await fetch(`/game?gameId=${id}`, {
    method: 'DELETE',
    mode: 'cors',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

init();

document
  .getElementById('CreateGameForm')
  .addEventListener('submit', handleFormSubmit);
