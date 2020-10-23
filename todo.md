# Things to be handled by client

## `decide tile hotel`

```javascript
const tileLocation = getTileLocation(tileId);
buildDropdown(tileLocation.pageX, tileLocation.pageY, tileId);
socket.emit('tiles updated'); // or something

// needs to let the game and all players know about the new hotel chain
```

## 'tiles updated'

```javascript
// Just rebuild the board
```

handle 2 for one trading (can't buy new stocks when not your turn)

\*\* choose hotel dropdown isn't in order

\*\* Show Stock Ownership on Merge

\*\* Alert box when it's your turn - with sound

\*\* toggle between my stocks/all doesn't last if someone does something

\*\* Stock price doesn't update if hotel expanded during this turn.

Fix styling in modal
-- adding 'all-players' to modal body

can sell stock anytime

should put the merger information in the caht

kill all the "has completed merger" chats

would be nice to see merge results before making the merge

slash commands

move the game server chats to a game log

0 shares remaining but can still purchase stock

