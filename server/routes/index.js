const app = require('../app.js');
const { getGames, deleteGame, createGame } = require('../lib/game');

app.get('/game', async (req, res) => {
  const games = await getGames();
  const gameArr = [];
  for (gameId in games) {
    gameArr.push({
      name: games[gameId].name,
      id: gameId,
      status: games[gameId].status,
      players: games[gameId].players.length,
    });
  }
  res.json({
    status: 'success',
    result: gameArr,
  });
});

app.get('/game/:id', async (req, res) => {
  const games = await getGames();
  res.json({
    status: 'success',
    result: games[req.params.id],
  });
});

app.post('/game', (req, res) => {
  const name = req.body.name;
  res.json({
    status: 'success',
    result: {
      id: createGame(name).id,
    },
  });
});

app.delete('/game', async (req, res) => {
  const gameId = req.query.gameId;
  await deleteGame(gameId);
  res.json({
    status: 'success',
    result: {},
  });
});
