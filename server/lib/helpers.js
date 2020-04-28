function objToArr(obj) {
  const arr = [];
  for (const prop in obj) {
    arr.push(obj[prop]);
  }
  return arr;
}

module.exports = {
  objToArr,
};
