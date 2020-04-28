class GamePiece {
  constructor(name, id, hotel, owner) {
    this.name = name;
    this.id = id;
    this._owner = owner;
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
  constructor(name, id, hotel, owner) {
    super(name, id, hotel, owner);
  }
}

class Card extends GamePiece {
  constructor(name, id, hotel, owner) {
    super(name, id, hotel, owner);
  }
}

module.exports = {
  Tile,
  Card,
};
