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
