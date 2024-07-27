(function () {
  const socket = io();
  let receiverId;

  function generateId() {
    return `${Math.trunc(Math.random() * 99)}`;
  }

  let senderId = generateId();
  document.querySelector("#join-id").innerHTML = `
    <b>Room ID</b>
    <span class="sender-room-id">${senderId}</span>
  `;

  document.querySelector("#room-id").innerText = `Room ID: ${senderId}`;

  socket.emit("sender-join", {
    uid: senderId,
  });

  console.log(`Sender ID: ${senderId} Joined ${senderId}`);

  socket.on("init", ({ uid, senderId }) => {
    console.log(`Receiver ID: ${uid} Joined Sender ID: ${senderId}`);
    receiverId = uid;
    document.querySelector(".join-screen").classList.remove("active");
    document.querySelector(".fs-screen").classList.add("active");
  });

  const dragWrapper = document.querySelector("#drop-area");
  dragWrapper.addEventListener("dragenter", (evt) => {
    console.log("drag enter", evt);
    dragWrapper.classList.add("drag-enter");
  });

  dragWrapper.addEventListener("dragleave", (evt) => {
    console.log("drag leave", evt);
    dragWrapper.classList.add("drag-leave");
  });

  document.querySelector("#drop-area").addEventListener("drop", (evt) => {
    let files = evt.dataTransfer.files;
    if (!files || files.length === 0) {
      console.error("No Files found");
      return;
    }

    handleFileShare(files);
  });

  document.querySelector("#file-input").addEventListener("change", (evt) => {
    let files = evt.target.files;
    if (!files || files.length === 0) {
      console.error("No Files found");
      return;
    }

    handleFileShare(files);
  });

  function handleFileShare(files) {
    for (let i = 0; i < files.length; i++) {
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

  async function shareFile(file, el) {
    const offset = 0;
    const chunkSize = 1024 * 1024 * 5; // MB chunks (adjust as needed)

    const metaData = {
      filename: file.name,
      totalBufferSize: file.size,
      bufferSize: chunkSize,
    };

    console.log("Sending Meta Data To Server", metaData);

    socket.emit("file-meta", {
      uid: receiverId,
      metaData,
    });

    console.log("File Transfer Started");

    socket.on("send-next-chunk", async (data) => {
      const { offset, chunkSize } = data;
      await sendChunk(file, offset, chunkSize, el);
    });

    await sendChunk(file, offset, chunkSize, el);
  }

  async function sendChunk(file, offset, chunkSize, el) {
    console.log(`Send Data From ${offset} - ${Math.min(offset + chunkSize, file.size)}`);
    const chunk = await readFileChunk(file, offset, Math.min(offset + chunkSize, file.size));
    socket.emit("file-raw", {
      uid: receiverId,
      buffer: chunk,
      offset: Math.min(offset, file.size),
      chunkSize,
      bufferSize: file.size,
    });

    const progress = ((offset + chunkSize) / file.size) * 100;

    el.innerText = `${Math.min(progress, 100).toFixed(2)} %`;
  }

  function readFileChunk(file, offset, chunkSize) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      if (!file instanceof File) {
        reject(`Invalid File Type ${file}`);
      }

      reader.onload = (evt) => {
        if (evt.target.readyState === FileReader.DONE) {
          resolve(evt.target.result);
        }
      };

      reader.onerror = (evt) => reject(evt.target.error);

      const blob = file.slice(offset, chunkSize);

      reader.readAsArrayBuffer(blob);
    });
  }
})();
