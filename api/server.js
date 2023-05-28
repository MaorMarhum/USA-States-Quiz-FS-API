const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:3001",
  },
});

io.on("connection", (socket) => {
  let url;
  socket.on("joinRoom", (roomUrl) => {
    if (url) {
      socket.leave(url);
    }
    url = roomUrl;
    socket.join(url);
    const userCount = io.sockets.adapter.rooms.get(url)?.size || 0;
    io.to(url).emit("userCount", userCount);
  });
  // game
  socket.on("startGame", ({ url, roomCode }) => {
    socket.to(url).emit("navigateToURL", `/game/${roomCode}`);
    socket.emit("firstTurn", 1);
  });
  socket.on("success", (stateToRemove) => {
    socket
      .to(url)
      .emit("yourTurn", { turnNumber: 1, stateToRemove: stateToRemove });
  });
  socket.on('gameOver', () => {
    socket.to(url).emit("gameOver");
  })
  // end game
  socket.on("disconnect", () => {
    console.log("user disconnected");
    const count = io.sockets.adapter.rooms.get(url)?.size || 0;
    io.emit("userLeft", count);
  });
});
