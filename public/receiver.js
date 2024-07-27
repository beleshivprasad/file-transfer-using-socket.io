(function () {
  const socket = io();
  let senderId;

  function generateId() {
    return `${Math.trunc(Math.random() * 99)}`;
  }

  document.querySelector("#receiver-start-con-btn").addEventListener("click", () => {
    senderId = document.querySelector("#join-id").value.trim();

    if (senderId.length === 0) {
      return;
    }

    document.querySelector("#room-id").innerText = `Room ID: ${senderId}`;

    let joinId = generateId();

    socket.emit("receiver-join", {
      uid: joinId,
      senderId,
    });

    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  let fileShare = {
    metaData: null,
    transmitted: 0,
    buffer: [],
    progressNode: null,
  };

  socket.on("fs-meta", (metaData) => {
    console.log("User sharing file", metaData);
    fileShare.metaData = metaData;
    fileShare.transmitted = 0;
    fileShare.buffer = [];

    const container = document.querySelector(".files-list");
    const el = document.createElement("div");
    el.classList.add("item");
    el.innerHTML = `
      <div class="progress">0%</div>
      <marquee class="filename">${metaData.filename}</marquee>
    `;

    container.appendChild(el);

    fileShare.progressNode = el.querySelector(".progress");

    // Start receiving the file
    socket.emit("file-start", {
      uid: senderId,
    });
  });

  socket.on("fs-share", (data) => {
    const { buffer, offset, chunkSize, bufferSize } = data;
    fileShare.buffer.push(buffer);
    fileShare.transmitted += buffer.byteLength;
    fileShare.progressNode.innerText = `${(
      (fileShare.transmitted / fileShare.metaData.totalBufferSize) *
      100
    ).toFixed(2)} %`;

    if (fileShare.transmitted === fileShare.metaData.totalBufferSize) {
      // All chunks received, download the file
      download(new Blob(fileShare.buffer), fileShare.metaData.filename);
      // Reset fileShare object
      fileShare = {
        metaData: null,
        transmitted: 0,
        buffer: [],
        progressNode: null,
      };
    } else {
      console.log(
        `Requesting Data From ${offset + chunkSize} - ${Math.min(
          offset + chunkSize + chunkSize,
          bufferSize
        )}`
      );
      socket.emit("send-next-chunk", {
        uid: senderId,
        offset: offset + chunkSize,
        chunkSize,
      });
    }
  });

  // Function to download the file
  function download(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    fileShare.buffer = [];
  }
})();
