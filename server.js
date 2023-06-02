const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://usa-states-quiz-fs.vercel.app',
  },
});
const corsOptions = {
  origin: 'https://usa-states-quiz-fs.vercel.app',
  credentials: true,
};
app.use(cors(corsOptions));

const connection = mysql.createConnection(process.env.DATABASE_URL);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/players/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode;

  connection.execute(
    "SELECT player1_name, player2_name FROM usa_game WHERE room_code = ?",
    [roomCode],
    (error, results) => {
      if (error) {
        console.error("Error retrieving data from the database:", error);
        res.status(500).json({ error: "An error occurred" });
      } else {
        if (results.length > 0) {
          const player1Name = results[0].player1_name;
          const player2Name = results[0].player2_name;
          res.json({ player1Name, player2Name });
        } else {
          res.status(404).json({ message: "No data found for the given room code" });
        }
      }
    }
  );
});

io.on("connection", (socket) => {
  let url;

  socket.on("joinRoom", (roomUrl) => {
    if (url) {
      socket.leave(url);
    }
    url = roomUrl;
    socket.join(url);
    try {
      const userCount = io.sockets.adapter.rooms.get(url)?.size || 0;
      io.to(url).emit("userCount", userCount);
    } catch (error) {
      console.error("Error in joinRoom:", error);
    }
  });

  socket.on("createRoom", ({ roomCode, name }) => {
    connection.execute(
      "INSERT INTO usa_game (room_code, player1_name) VALUES (?, ?)",
      [roomCode, name],
      (error, results) => {
        if (error) {
          console.error("Error inserting data into the database:", error);
        } else {
          console.log("Data inserted successfully!");
        }
      }
    );
  });

  socket.on("join", ({ name, roomCode }) => {
    connection.execute(
      "UPDATE usa_game SET player2_name = ? WHERE room_code = ?",
      [name, roomCode],
      (error, results) => {
        if (error) {
          console.error("Error inserting data into the database:", error);
        } else {
          console.log("Data inserted successfully!");
        }
      }
    );
  });

  socket.on('missingName', (name) => {
    console.log(name)
    socket.to(url).emit('missingName', name);
  })

  // game
  socket.on("startGame", ({ url, roomCode }) => {
    try {
      socket.to(url).emit("navigateToURL", `/game/${roomCode}`);
      socket.emit("firstTurn", 1);
    } catch (error) {
      console.error("Error in startGame:", error);
    }
  });

  socket.on("success", (stateToRemove) => {
    try {
      socket
        .to(url)
        .emit("yourTurn", { turnNumber: 1, stateToRemove: stateToRemove });
    } catch (error) {
      console.error("Error in success:", error);
    }
  });

  socket.on("gameOver", () => {
    try {
      socket.to(url).emit("gameOver");
    } catch (error) {
      console.error("Error in gameOver:", error);
    }
  });
  // end game

  socket.on("disconnect", () => {
    console.log("user disconnected");
    try {
      const count = io.sockets.adapter.rooms.get(url)?.size || 0;
      io.emit("userLeft", count);
    } catch (error) {
      console.error("Error in disconnect:", error);
    }
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
