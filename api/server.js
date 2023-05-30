const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://usa-states-quiz-fs.vercel.app',
  },
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on('connection', (socket) => {
  let url;

  socket.on('joinRoom', (roomUrl) => {
    if (url) {
      socket.leave(url);
    }
    url = roomUrl;
    socket.join(url);
    try {
      const userCount = io.sockets.adapter.rooms.get(url)?.size || 0;
      io.to(url).emit('userCount', userCount);
    } catch (error) {
      console.error('Error in joinRoom:', error)
    }
  });

  // game
  socket.on('startGame', ({ url, roomCode }) => {
    try {
      socket.to(url).emit('navigateToURL', `/game/${roomCode}`)
      socket.emit('firstTurn', 1);
    } catch (error) {
      console.error('Error in startGame:', error)
    }
  });

  socket.on('success', (stateToRemove) => {
    try {
      socket.to(url).emit('yourTurn', { turnNumber: 1, stateToRemove: stateToRemove });
    } catch (error) {
      console.error('Error in success:', error);
    }
  });

  socket.on('gameOver', () => {
    try {
      socket.to(url).emit('gameOver');
    } catch (error) {
      console.error('Error in gameOver:', error)
    }
  });
  // end game

  socket.on('disconnect', () => {
    console.log('user disconnected');
    try {
      const count = io.sockets.adapter.rooms.get(url)?.size || 0;
      io.emit('userLeft', count);
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
