
document.addEventListener("DOMContentLoaded", () => {

    // ==================================
    // 1. HTML ELEMENTS
    // ==================================

    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("userInput");
    const chatMessages = document.getElementById("chatMessages");
    const languageSelect = document.getElementById("languageSelect");
    const sendButton = document.getElementById("sendButton");
    const logoutButton = document.getElementById("logoutButton");
    const username = document.getElementById("username");


    // ==================================
    // 2. LOGIN AUTHENTICATION
    // ==================================

    const token = localStorage.getItem("mediguideToken");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }


    // ==================================
    // 3. DISPLAY USERNAME
    // ==================================

    let user = {};

    try {
        user = JSON.parse(
            localStorage.getItem("mediguideUser") || "{}"
        );
    } catch (error) {
        console.error("User information error:", error);
    }

    if (username) {
        username.textContent = user.name || "User";
    }


    // ==================================
    // 4. CHECK HTML ELEMENTS
    // ==================================

    if (!chatForm || !messageInput || !chatMessages) {
        console.error("Chat HTML elements are missing.");
        return;
    }


    // ==================================
    // 5. DEFAULT LANGUAGE
    // ==================================

    if (languageSelect) {
        languageSelect.value = "English";
    }


    // ==================================
    // 6. DISPLAY CHAT MESSAGE
    // ==================================

    function displayMessage(text, sender) {

        const messageDiv = document.createElement("div");

        messageDiv.className =
            sender === "user"
                ? "message user-message"
                : "message bot-message";

        messageDiv.textContent = text;

        chatMessages.appendChild(messageDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    // ==================================
    // 7. LOADING MESSAGE
    // ==================================

    function showLoading() {

        const loading = document.createElement("div");

        loading.id = "loadingMessage";
        loading.className = "message bot-message";

        loading.textContent = "MediGuide AI is typing...";

        chatMessages.appendChild(loading);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        return loading;
    }


    // ==================================
    // 8. LOAD CHAT HISTORY
    // ==================================

    async function loadChatHistory() {

        try {

            const response = await fetch("/api/chat/history", {

                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }

            });

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to load chat history.");
            }

            const data = await response.json();

            chatMessages.innerHTML = "";

            if (data.messages && data.messages.length > 0) {

                data.messages.forEach(item => {

                    displayMessage(
                        item.text,
                        item.role === "user" ? "user" : "bot"
                    );

                });

            } else {

                displayMessage(
                    "Hello! Welcome to MediGuide AI. How can I help you today?",
                    "bot"
                );

            }

        } catch (error) {

            console.error("History error:", error);

        }

    }


    // ==================================
    // 9. SEND CHAT MESSAGE
    // ==================================

    chatForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const message = messageInput.value.trim();

        if (!message) {
            alert("Please enter a message.");
            return;
        }

        if (message.length > 4000) {
            alert("Message must be less than 4000 characters.");
            return;
        }


        // GET SELECTED LANGUAGE

        const language = languageSelect
            ? languageSelect.value
            : "English";


        // DISPLAY USER MESSAGE

        displayMessage(message, "user");

        messageInput.value = "";


        // SHOW LOADING

        const loading = showLoading();

        if (sendButton) {
            sendButton.disabled = true;
        }


        try {

            // SEND MESSAGE TO BACKEND

            const response = await fetch("/api/chat", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                body: JSON.stringify({

                    message: message,

                    language: language

                })

            });


            // CHECK LOGIN

            if (response.status === 401) {
                loading.remove();
                logout();
                return;
            }


            const data = await response.json();

            loading.remove();


            if (!response.ok) {

                throw new Error(
                    data.message || "Unable to contact MediGuide AI."
                );

            }


            // DISPLAY AI RESPONSE

            const reply = data.reply || data.message;

            if (reply) {

                displayMessage(reply, "bot");

            } else {

                displayMessage(
                    "Sorry, I could not generate a response. Please try again.",
                    "bot"
                );

            }


        } catch (error) {

            loading.remove();

            console.error("Chat error:", error);

            displayMessage(
                "Sorry! Something went wrong. Please try again.",
                "bot"
            );

        } finally {

            if (sendButton) {
                sendButton.disabled = false;
            }

            messageInput.focus();

        }

    });


    // ==================================
    // 10. QUICK SUGGESTION BUTTONS
    // ==================================

    window.askQuestion = function(question) {

        messageInput.value = question;

        chatForm.requestSubmit();

    };


    // ==================================
    // 11. LOGOUT FUNCTION
    // ==================================

    function logout() {

        localStorage.removeItem("mediguideToken");

        localStorage.removeItem("mediguideUser");

        window.location.href = "login.html";

    }


    if (logoutButton) {

        logoutButton.addEventListener("click", logout);

    }


    // ==================================
    // 12. LOAD PREVIOUS CHAT MESSAGES
    // ==================================

    loadChatHistory();

});
