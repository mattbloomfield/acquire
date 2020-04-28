class HotelChain {
  /**
   * Create a property chain (only to be called at beginning of game)
   * @param {string} name Name of the chain
   * @param {string} color A valid css color
   * @param {number} tier 0, 1, or 2, serving as the offset for pricing
   */
  constructor(name, id, color, tier, active, safe) {
    this.name = name;
    this.id = id;
    this.color = color;
    this.tier = tier;
    this.active = active;
    this.safe = safe;
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
}

module.exports = HotelChain;
