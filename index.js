const express = require("express");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  maxHttpBufferSize: 1000000000000000
});

// Middleware
app.use(express.static(path.join(__dirname, "/public")));

// Enable CORS for specific origin
const allowedOrigin = "http://192.168.1.47";
app.use(cors({origin: allowedOrigin}));

// Handle preflight requests for the /socket route
app.options("/socket", cors());

// Serve the socket.io client script
app.get("/socket", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/socket.io/client-dist/socket.io.js"));
});

io.on("connection", socket => {
  socket.on("sender-join", data => {
    socket.join(data.uid);
  });

  socket.on("receiver-join", data => {
    socket.join(data.uid);
    socket.in(data.sender_uid).emit("init", data.uid);
  });

  socket.on("file-meta", data => {
    socket.in(data.uid).emit("fs-meta", data.metaData);
  });

  socket.on("file-start", data => {
    socket.in(data.uid).emit("fs-share", {});
  });

  socket.on("file-raw", data => {
    socket.in(data.uid).emit("fs-share", data.buffer);
  });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
