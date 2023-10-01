(function () {
  const socket = io();
  let receiverId;

  function generateId() {
    return `${Math.trunc(Math.random() * 99)}`;
  }

  let senderId = generateId();
  document.querySelector("#join-id").innerHTML = `
    <b>Room ID</b>
    <span>${senderId}</span>
  `;

  document.querySelector("#room-id").innerText = `Room ID: ${senderId}`;

  socket.emit("sender-join", {
    uid: senderId
  });

  console.log(`Sender ID: ${senderId} Joined ${senderId}`);

  socket.on("init", ({uid, senderId}) => {
    console.log(`Receiver ID: ${uid} Joined Sender ID: ${senderId}`);
    receiverId = uid;
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  const dragWrapper = document.querySelector("#drop-area");
  dragWrapper.addEventListener("dragenter", evt => {
    console.log("drag enter", evt);
    dragWrapper.classList.add("drag-enter");
  });

  dragWrapper.addEventListener("dragleave", evt => {
    console.log("drag leave", evt);
    dragWrapper.classList.add("drag-leave");
  });

  document.querySelector("#drop-area").addEventListener("drop", evt => {
    let files = evt.dataTransfer.files;
    if (!files || files.length === 0) {
      console.error("No Files found");
      return;
    }

    handleFileShare(files);
  });

  document.querySelector("#file-input").addEventListener("change", evt => {
    let files = evt.target.files;
    if (!files || files.length === 0) {
      console.error("No Files found");
      return;
    }

    handleFileShare(files);
  });

  function handleFileShare(files) {
    for (let i = 0; i < files.length; i++) {
      console.warn("File Selection", files[i]);

      let el = document.createElement("div");
      el.classList.add("item");
      el.innerHTML = `
      <div class="progress">0%</div>
      <marquee class="filename">${files[i].name}</marquee>
    `;

      document.querySelector(".files-list").append(el);
      const allProgresses = document.getElementsByClassName("progress");

      shareFile(files[i], allProgresses[allProgresses.length - 1]);
    }
  }

  function shareFile(file, el) {
    console.log("Share File ", file, el);
    const chunkSize = 1024 * 1024 * 1; // MB chunks (adjust as needed)

    const reader = new FileReader();
    const offset = 0;

    reader.onload = function () {
      console.log("onload ", chunkSize / (1024 * 1024 * 20), " MB");
      const buffer = new Uint8Array(reader.result);

      console.log("File Buffer", buffer);
      const metaData = {
        filename: file.name,
        totalBufferSize: buffer.length,
        bufferSize: chunkSize
      };

      socket.emit("file-meta", {
        uid: receiverId,
        metaData
      });

      function sendNextChunk(offset) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        offset += chunk.length;

        if (chunk.length > 0) {
          socket.emit("file-raw", {
            uid: receiverId,
            buffer: chunk
          });

          const progress = (offset / buffer.length) * 100;
          el.innerText = `${Math.trunc(Math.min(progress, 100))} %`;

          if (offset < buffer.length) {
            setTimeout(() => {
              sendNextChunk(offset);
            }, 0); // Send the next chunk asynchronously to avoid blocking
          }
        }
      }

      sendNextChunk(offset);
    };

    reader.readAsArrayBuffer(file);
  }
})();
