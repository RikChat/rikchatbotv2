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

// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
  filePreview.src = "";
  filePreview.alt = "";
});

// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  const loadingBot = chatsContainer.querySelector(".bot-message.loading");
  if (loadingBot) loadingBot.classList.remove("loading");
  document.body.classList.remove("bot-responding");
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
