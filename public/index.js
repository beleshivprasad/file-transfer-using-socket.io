(function () {
  const socket = io();
  let receiverId;

  function generateId() {
    return `${Math.trunc(Math.random() * 99)}`;
  }

  document.querySelector("#sender-start-con-btn").addEventListener("click", () => {
    let joinId = generateId();
    document.querySelector("#join-id").innerHTML = `
      <b>Room ID</b>
      <span>${joinId}</span>
    `;

    socket.emit("sender-join", {
      uid: joinId
    });
    console.log("sender joined at ", joinId);
  });

  socket.on("init", uid => {
    console.log("receiver joined!!", uid);
    receiverId = uid;
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  document.querySelector("#file-input").addEventListener("change", evt => {
    let file = evt.target.files[0];
    if (!file) return;

    console.warn("File Selection", file);

    let el = document.createElement("div");
    el.classList.add("item");
    el.innerHTML = `
      <div class="progress">0%</div>
      <marquee class="filename">${file.name}</marquee>
    `;

    document.querySelector(".files-list").append(el);
    const allProgresses = document.getElementsByClassName("progress");

    shareFile(file, allProgresses[allProgresses.length - 1]);
  });

  function shareFile(file, el) {
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
