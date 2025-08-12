//======================================================================
//                       DEKLARASI VARIABEL
//======================================================================
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const splashScreen = document.getElementById('splash-screen');
const mainContent = document.getElementById('main-content');
const offlinePopup = document.getElementById('offline-popup');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const clearChatButton = document.getElementById('clear-chat-button');

// Kunci API dihapus dari kode klien, sekarang diambil dari serverless function
const VERCEL_FUNCTION_URL = '/chat-openai'; // URL endpoint yang diubah


//======================================================================
//                       FUNGSI UTAMA CHATBOT
//======================================================================

/**
 * Membuat dan menambahkan elemen pesan ke dalam UI chatbot.
 * @param {string} text - Teks pesan.
 * @param {boolean} isUser - true jika pesan dari pengguna, false jika dari bot.
 * @returns {HTMLElement} Elemen div pesan yang baru dibuat.
 */
function createMessageElement(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    const now = new Date();
    messageTime.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (isUser) {
        messageDiv.classList.add('user-message');
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
    } else {
        messageDiv.classList.add('bot-message');
        const botAvatar = document.createElement('div');
        botAvatar.classList.add('avatar-sm');
        messageDiv.appendChild(botAvatar);
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

/**
 * Mengirim pesan ke API OpenAI melalui Serverless Function dan mengembalikan respons.
 * @param {string} message - Pesan dari pengguna.
 * @returns {Promise<string>} Teks balasan dari OpenAI.
 */
async function sendMessageToAI(message) {
    const response = await fetch(VERCEL_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message }) // Kirim pesan ke Serverless Function
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error}`);
    }

    const data = await response.json();
    return data.text.trim();
}


//======================================================================
//                       FUNGSI PENGELOLA HISTORY CHAT
//======================================================================

/**
 * Menyimpan seluruh chat ke localStorage.
 */
function saveChatHistory() {
    const messages = chatMessages.innerHTML;
    localStorage.setItem('chatHistory', messages);
}

/**
 * Memuat history chat dari localStorage saat halaman dimuat.
 */
function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        chatMessages.innerHTML = savedHistory;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return true;
    }
    return false;
}

/**
 * Menghapus seluruh chat history.
 */
function clearChatHistory() {
    if (confirm("Apakah Anda yakin ingin menghapus semua riwayat chat? Tindakan ini tidak dapat dibatalkan.")) {
        chatMessages.innerHTML = '';
        localStorage.removeItem('chatHistory');
        // Tambahkan pesan pembuka kembali setelah chat dihapus
        createMessageElement("Riwayat chat telah dihapus. Silakan mulai percakapan baru!", false);
        saveChatHistory();
    }
}


//======================================================================
//                       FUNGSI PENGELOLA UI DAN EVENT
//======================================================================

/**
 * Menampilkan pop-up peringatan offline.
 */
function showOfflinePopup() {
    offlinePopup.classList.add('visible');
}

/**
 * Menyembunyikan pop-up peringatan offline.
 */
function hideOfflinePopup() {
    offlinePopup.classList.remove('visible');
}

/**
 * Menyembunyikan splash screen dan menampilkan konten utama.
 */
function hideSplashScreen() {
    splashScreen.classList.add('hidden');
    setTimeout(() => {
        splashScreen.style.display = 'none';
        mainContent.style.display = 'flex';
    }, 500);
}

/**
 * Menangani logika pengiriman pesan.
 */
async function handleSendMessage() {
    const userMessage = userInput.value.trim();
    if (userMessage) {
        if (!navigator.onLine) {
            showOfflinePopup();
            return;
        }

        createMessageElement(userMessage, true);
        userInput.value = '';
        saveChatHistory();

        const typingIndicator = createMessageElement('...', false);
        typingIndicator.classList.add('typing-indicator');

        try {
            const botResponse = await sendMessageToAI(userMessage);
            chatMessages.removeChild(typingIndicator);
            createMessageElement(botResponse, false);
            saveChatHistory();
        } catch (error) {
            console.error('Error fetching from OpenAI API:', error);
            chatMessages.removeChild(typingIndicator);
            createMessageElement('Maaf, ada masalah saat berkomunikasi dengan AI. Silakan coba lagi.', false);
            saveChatHistory();
        }
    }
}

/**
 * Menutup sidebar (digunakan di mobile).
 */
function closeSidebar() {
    sidebar.classList.remove('open');
}


//======================================================================
//                       EVENT LISTENERS
//======================================================================

// Event listener untuk tombol Kirim
sendButton.addEventListener('click', handleSendMessage);

// Event listener untuk tombol Enter di input teks
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        handleSendMessage();
    }
});

// Event listener untuk tombol menu (Hamburger Icon)
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Tutup sidebar saat salah satu link navigasi diklik di mobile
const navLinks = document.querySelectorAll('.sidebar a');
navLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
});

// Event listener untuk tombol Clear Chat
clearChatButton.addEventListener('click', (event) => {
    event.preventDefault(); // Mencegah navigasi
    clearChatHistory();
});

// Event listener untuk status jaringan
window.addEventListener('offline', showOfflinePopup);
window.addEventListener('online', hideOfflinePopup);

// Event listener yang berjalan saat semua aset halaman sudah dimuat
window.addEventListener('load', () => {
    setTimeout(hideSplashScreen, 1500); 

    setTimeout(() => {
        if (!navigator.onLine) {
            showOfflinePopup();
        } 
        
        const hasHistory = loadChatHistory();
        if (!hasHistory) {
            createMessageElement("Hello! I'm RikChatBot. How can I assist you today?", false);
        }
    }, 2000); 
});
