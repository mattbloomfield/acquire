const urlParams = new URLSearchParams(window.location.search);
const socket = io();

const init = () => {
  try {
    const gameId = urlParams.get('gameId');
    console.log('gameId', gameId);
    if (!gameId) throw Error('invalid game id');
    const cd = cookie.get('acquire_game_session');
    const cookieData = JSON.parse(cd);
    console.log('cookiedata', cookieData);
    if (cookieData.gameId === gameId) {
      window.location.href = `/play`;
    }
  } catch (e) {
    if (e === 'invalid game id') {
      alert("Whoops, this game doesn't exist anymore");
      location.href = '/';
    }
    console.log('needs a cookie');
  }
};

const illegalNames = [
  'wendy',
  'curt',
  'kathi',
  'matt',
  'sara',
  'judy',
  'scott',
  'zach',
  'jenni',
  'jonathan',
];

const handlePlayerAdd = async (ev) => {
  ev.preventDefault();
  try {
    const name = document.getElementById('NewPlayerName').value;
    // if (illegalNames.includes(name.toLowerCase())) {
    //   alert('Whoa, boring! Choose a better name');
    //   return;
    // }
    const gameId = urlParams.get('gameId');
    createNewPlayer(name, gameId);
  } catch (e) {
    console.error('error while handling player addition', e);
  }
};

function createNewPlayer(name, gameId) {
  socket.emit('player created', {
    name: name,
    gameId: gameId,
  });
}

socket.on('successful join', (gameInfo) => {
  cookie.set(
    'acquire_game_session',
    JSON.stringify({
      playerId: gameInfo.playerId,
      gameId: gameInfo.gameId,
    }),
    1
  );
  window.location.href = `/play`;
});

// async function createNewPlayer(name, gameId) {
//   try {
//     const response = await fetch('/add-player', {
//       method: 'POST',
//       mode: 'cors',
//       cache: 'no-cache',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         name,
//         gameId,
//       }),
//     });
//     return response.json();
//   } catch (e) {
//     console.error('error creating player', e);
//   }
// }

document
  .getElementById('AddPlayer')
  .addEventListener('submit', handlePlayerAdd);

init();
