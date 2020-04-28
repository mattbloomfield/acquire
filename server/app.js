const express = require('express');
const app = (module.exports = express());
const path = require('path');
const bodyParser = require('body-parser');

const port = 2533;

app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.json());

require('./routes');
const { http } = require('./sockets/index');

http.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
