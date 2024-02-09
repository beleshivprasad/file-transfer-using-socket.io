const express = require("express");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server, {
  maxHttpBufferSize: 1000000000000000,
});

// Middleware
app.use(express.static(path.join(__dirname, "/public")));

app.use(morgan("dev"));

// Enable CORS for specific origin
const allowedOrigin = "*";
app.use(cors({ origin: allowedOrigin }));

// Handle preflight requests for the /socket route
app.options("/socket", cors());

// Serve the socket.io client script
app.get("/socket", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/socket.io/client-dist/socket.io.js"));
});

io.on("connection", (socket) => {
  socket.on("sender-join", (data) => {
    socket.join(data.uid);
  });

  socket.on("receiver-join", (data) => {
    socket.join(data.uid);
    socket.in(data.senderId).emit("init", data);
  });

  socket.on("file-meta", (data) => {
    socket.in(data.uid).emit("fs-meta", data.metaData);
  });

  socket.on("file-start", (data) => {
    socket.in(data.uid).emit("fs-share", {});
  });

  socket.on("file-raw", (data) => {
    socket
      .in(data.uid)
      .emit("fs-share", {
        buffer: data.buffer,
        offset: data.offset,
        chunkSize: data.chunkSize,
        bufferSize: data.bufferSize,
      });
  });

  socket.on("send-next-chunk", (data) => {
    socket.in(data.uid).emit("send-next-chunk", { offset: data.offset, chunkSize: data.chunkSize });
  });
});

const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
