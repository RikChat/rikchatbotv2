// === Elemen DOM ===
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const filePreview = fileUploadWrapper.querySelector(".file-preview");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// API Setup
const API_KEY = "AIzaSyAj4nFrQSIHERtkWr7ZM_Uz8_IqURLSvIM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// === Theme Setup ===
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// === Fungsi Helper ===
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Perbaikan: scroll ke chats-container, bukan container
const scrollToBottom = () => {
  chatsContainer.scrollTo({
    top: chatsContainer.scrollHeight,
    behavior: "smooth"
  });
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

// === API Call ===
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
    ],
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// === Form Submission ===
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage && !userData.file.data) return;
  if (document.body.classList.contains("bot-responding")) return;
// 🔹 CEK COMMAND /menu
if (userMessage.toLowerCase() === "/menu") {
  const menuHTML = `
    <div class="menu-options">
      <button class="menu-btn" data-cmd="/gen_text">✍️ Text Generator</button>
      <button class="menu-btn" data-cmd="/gen_image">🖼️ Image Generator</button>
      <button class="menu-btn" data-cmd="/gen_code">💻 Code Generator</button>
      <button class="menu-btn" data-cmd="/Developer">💻 Pengembang Bot</button>
    </div>
  `;
  const botMsgDiv = createMessageElement(
    `<p class="message-text">🔽 Pilih generator yang kamu mau:</p>${menuHTML}`,
    "bot-message"
  );
  chatsContainer.appendChild(botMsgDiv);
  scrollToBottom();
  promptInput.value = "";

  // Event listener tombol menu
  botMsgDiv.querySelectorAll(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      promptInput.value = btn.dataset.cmd;
      promptForm.dispatchEvent(new Event("submit")); // otomatis kirim
    });
  });
  return; // 🚫 Jangan diteruskan ke API
}

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  // Buat user message HTML
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? 
      (userData.file.isImage 
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="chat-image" />` 
        : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) 
      : ""}
  `;
  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  if (userData.message) userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img class="avatar" src="profile.jpg" /> <p class="message-text">Sedang mengetik...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// === File Upload Handling ===
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();

  if (isImage) {
    reader.readAsDataURL(file);
  } else if (file.type === "application/pdf") {
    reader.readAsDataURL(file);
  } else if (file.type === "text/plain" || file.type === "text/csv") {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }

  reader.onload = (e) => {
    let base64String;
    if (isImage || file.type === "application/pdf") {
      base64String = e.target.result.split(",")[1];
      filePreview.src = e.target.result;
    } else {
      base64String = btoa(e.target.result);
      filePreview.src = "";
      filePreview.alt = e.target.result.slice(0, 200) + (e.target.result.length > 200 ? "..." : "");
    }

    filePreview.style.display = "block";
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

// Theme Toggle
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

// Add event listeners
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// === Zoom Gambar Saat Diklik ===
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("chat-image")) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = 9999;
    overlay.innerHTML = `<img src="${e.target.src}" style="max-width:90%;max-height:90%;border-radius:10px;" />`;
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }
});
// Auto expand textarea
const textarea = document.querySelector(".prompt-input");

textarea.addEventListener("input", () => {
  textarea.style.height = "auto";                // reset dulu
  textarea.style.height = textarea.scrollHeight + "px"; // ikutin konten
});
// === File Upload Handling ===
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();

  // Baca file sesuai tipe
  if (isImage || file.type === "application/pdf") {
    reader.readAsDataURL(file);
  } else if (file.type === "text/plain" || file.type === "text/csv") {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }

  reader.onload = (e) => {
    let base64String;

    if (isImage) {
      // Preview gambar
      base64String = e.target.result.split(",")[1];
      filePreview.src = e.target.result;
      filePreview.style.display = "block";
      filePreview.alt = file.name;

      fileUploadWrapper.classList.add("active", "img-attached");
    } else if (file.type === "application/pdf") {
      base64String = e.target.result.split(",")[1];
      filePreview.src = "icons/pdf-icon.png"; // kasih ikon pdf (atau svg bawaan)
      filePreview.style.display = "block";
      filePreview.alt = file.name;

      fileUploadWrapper.classList.add("active", "file-attached");
    } else {
      base64String = btoa(
        e.target.result instanceof ArrayBuffer
          ? String.fromCharCode(...new Uint8Array(e.target.result))
          : e.target.result
      );

      filePreview.src = "icons/file-icon.png"; // default file icon
      filePreview.style.display = "block";
      filePreview.alt = file.name;

      fileUploadWrapper.classList.add("active", "file-attached");
    }

    // Simpan ke userData untuk dikirim ke API
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage
    };
  };
});
// === File Upload Handling ===
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();

  if (isImage || file.type === "application/pdf") {
    reader.readAsDataURL(file);
  } else if (file.type === "text/plain" || file.type === "text/csv") {
    reader.readAsText(file);
  } else {
    reader.readAsArrayBuffer(file);
  }

  reader.onload = (e) => {
    let base64String;
    if (isImage || file.type === "application/pdf") {
      base64String = e.target.result.split(",")[1];
      filePreview.src = e.target.result;
      filePreview.style.display = "block";
      filePreview.style.maxHeight = "120px";
      filePreview.style.borderRadius = "8px";
    } else {
      base64String = btoa(e.target.result);
      filePreview.src = "";
      filePreview.alt = e.target.result.slice(0, 200) + (e.target.result.length > 200 ? "..." : "");
      filePreview.style.display = "block";
    }

    // Simpan data file ke userData
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };

    // Tambah tombol remove jika belum ada
    if (!fileUploadWrapper.querySelector(".remove-file")) {
      const removeBtn = document.createElement("span");
      removeBtn.textContent = "×";
      removeBtn.className = "remove-file";
      removeBtn.style.cssText = `
        position: absolute;
    top: -2px;
    font-size: 16px;
    color: #fff;
    background: #d62939;
    border-radius: 50%;
    width: 20px;
    height: 17px;
    line-height: 20px;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      fileUploadWrapper.style.position = "relative";
      fileUploadWrapper.appendChild(removeBtn);

      removeBtn.addEventListener("click", () => {
        fileInput.value = "";
        filePreview.src = "";
        filePreview.style.display = "none";
        fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
        removeBtn.remove();
        userData.file = {};
      });
    }
  };
});


// kirim pesan user
promptForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  addMessage(userMessage, "user");
  promptInput.value = "";

  handleCommand(userMessage.toLowerCase());
});
// ==== QUICK REPLY CHIPS ====
function showQuickReplies(replies) {
  const botMsg = document.createElement("div");
  botMsg.className = "message bot-message";
  const chipsWrapper = document.createElement("div");
  chipsWrapper.className = "quick-replies";

  replies.forEach(reply => {
    const chip = document.createElement("button");
    chip.className = "quick-reply";
    chip.textContent = reply.label;
    chip.addEventListener("click", () => {
      promptInput.value = reply.value; // isi otomatis ke input
      promptForm.dispatchEvent(new Event("submit")); // kirim langsung
      chipsWrapper.remove(); // hapus chips setelah dipilih
    });
    chipsWrapper.appendChild(chip);
  });

  chatsContainer.appendChild(chipsWrapper);
  chatsContainer.scrollTop = chatsContainer.scrollHeight;
}

// Contoh: tampilkan chips setelah /menu
function handleMenuCommand() {
  appendMessage("bot", "Pilih salah satu menu di bawah ini:");
  showQuickReplies([
    { label: "Generate Teks", value: "/gen_text" },
    { label: "Generate Gambar", value: "/gen_image" },
    { label: "Generate Kode", value: "/gen_code" }
  ]);
}


