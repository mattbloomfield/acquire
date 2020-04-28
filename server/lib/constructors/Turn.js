class Turn {
  constructor(playerId, id, tileId, stocks) {
    this.id = id || new Date().getTime();
    this.tileId = tileId || null;
    this.playerId = playerId;
    this.stocks = stocks || [];
  }
}

module.exports = Turn;
