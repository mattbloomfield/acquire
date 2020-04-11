const express = require("express");
const app = express();
const path = require("path");

/* Serve Application */

app.use(express.static(path.join(__dirname, "public")));

/* Handle Sockets */

const server = require("http").createServer(app);
const io = require("socket.io")(server);

io.on("connection", socket => {
  console.log("a user connected");

  socket.on("disconnect", function () {
    console.log("user disconnected");
  });

  socket.on("new player", playerInfo => {
    console.log("player: " + JSON.stringify(playerInfo));
  });
});
server.listen(2533);

// game logic

const rules = require("./game/rules.json");
const {
  Game,
  Player,
  Turn,
  HotelChain,
  Tile,
  Card,
} = require("./game/constructors");

const init = () => {
  const game = new Game();
};

init();
