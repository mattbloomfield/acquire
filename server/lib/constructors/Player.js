const uuid = require('uuid');

class Player {
  constructor(name, socketId, id) {
    const randomId = uuid.v1();
    this.name = name;
    this.socketId = socketId;
    this.id = id || `player_${randomId}`;
  }

  // get tiles() {
  //   return getTileOwners(objToArr(game.tiles)).owners[this.id];
  // }

  // get stocks() {
  //   getStockOwners(game.stocks)[this.id];
  // }
}

module.exports = Player;
