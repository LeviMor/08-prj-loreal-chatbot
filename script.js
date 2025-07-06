/* Cloudflare Worker API endpoint */
const CLOUDFLARE_WORKER_URL = "https://api-protector.ljmby2005.workers.dev/";

/* L'Oréal Beauty Expert System Configuration */
const SYSTEM_MESSAGE = `You  // Clear the input field immediately and reset height
  userInput.value = "";
  
  // Reset to responsive minimum height
  const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;
  const isMediumScreen = window.matchMedia("(min-width: 768px)").matches;
  
  let minHeight;
  if (isLargeScreen) {
    minHeight = 48;
  } else if (isMediumScreen) {
    minHeight = 46;
  } else {
    minHeight = 44;
  }
  
  userInput.style.height = minHeight + 'px';
  userInput.style.overflowY = 'hidden'; a friendly and knowledgeable L'Oréal beauty expert who loves helping people discover the perfect L'Oréal products. When users ask questions about our products, routines, or recommendations, you share thoughtful, personalized advice, suggest products that might suit their needs, and offer gentle feedback if they have any concerns or issues.

Your tone should always be warm and welcoming, elegant yet approachable, confident and expert, personalized wherever possible, and positive and encouraging — as if the user is chatting with a real beauty advisor who cares. However, to maintain a professional atmosphere, please refrain from using any emojis.

When you mention a product, describe its key ingredients, benefits, textures, finishes, and why it could suit the user's needs.

Only answer questions related to L'Oréal products, beauty routines, and beauty-related topics. If someone asks about something unrelated, politely and warmly explain that you can only help with L'Oréal products and beauty advice.`;

/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* Conversation context tracking */
let conversationHistory = [
  {
    role: "system",
    content: SYSTEM_MESSAGE,
  },
];

// Set initial welcome message from the AI
const welcomeMessage =
  "Hello! I'm your L'Oréal beauty expert. How can I help you discover the perfect products for your beauty routine today?";
addMessage(welcomeMessage, "ai");

// Add welcome message to conversation history
conversationHistory.push({
  role: "assistant",
  content: welcomeMessage,
});

/* Function to auto-resize textarea based on content */
function autoResizeTextarea() {
  // Reset height to auto to get the correct scrollHeight
  userInput.style.height = "auto";

  // Set height based on scroll height, but within min/max limits
  const scrollHeight = userInput.scrollHeight;

  // Get responsive min/max heights based on screen size
  const isLargeScreen = window.matchMedia("(min-width: 1024px)").matches;
  const isMediumScreen = window.matchMedia("(min-width: 768px)").matches;

  let minHeight, maxHeight;
  if (isLargeScreen) {
    minHeight = 48;
    maxHeight = 120;
  } else if (isMediumScreen) {
    minHeight = 46;
    maxHeight = 110;
  } else {
    minHeight = 44;
    maxHeight = 100;
  }

  if (scrollHeight <= maxHeight) {
    userInput.style.height = Math.max(scrollHeight, minHeight) + "px";
    userInput.style.overflowY = "hidden";
  } else {
    userInput.style.height = maxHeight + "px";
    userInput.style.overflowY = "auto";
  }
}

/* Add event listener for textarea auto-resize */
userInput.addEventListener("input", autoResizeTextarea);
userInput.addEventListener("keydown", (e) => {
  // Allow Enter to submit form, Shift+Enter for new line
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

/* Function to add messages to the chat window */
function addMessage(message, sender) {
  // Create a new message element with proper styling
  const messageElement = document.createElement("div");
  messageElement.className = `msg ${sender}`;
  messageElement.textContent = message;

  // Add the message to the chat window
  chatWindow.appendChild(messageElement);

  // Scroll to the bottom to show the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Function to clear chat window and show only the most recent exchange */
function showRecentExchange() {
  // Clear the chat window
  chatWindow.innerHTML = "";

  // Get the last user message and AI response from history
  const messages = conversationHistory.slice(-2); // Get last 2 messages (user + AI)

  // If we have both user and AI messages, display them
  if (
    messages.length >= 2 &&
    messages[0].role === "user" &&
    messages[1].role === "assistant"
  ) {
    addMessage(messages[0].content, "user");
    addMessage(messages[1].content, "ai");
  } else if (messages.length === 1 && messages[0].role === "assistant") {
    // Only show AI message if it's the welcome message
    addMessage(messages[0].content, "ai");
  }
}

/* Function to send request to OpenAI via Cloudflare Worker */
async function sendToOpenAI(userMessage) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Show loading message while waiting for response
    addMessage("Thinking...", "ai");

    // Prepare the request data for OpenAI with full conversation context
    const requestData = {
      model: "gpt-4o", // Using gpt-4o as specified in instructions
      messages: conversationHistory, // Send entire conversation history for context
      max_tokens: 500, // Limit response length for chat
      temperature: 0.7, // Balanced creativity for beauty advice
    };

    // Make request to Cloudflare Worker
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the response data
    const data = await response.json();

    // Get the AI response
    const aiResponse = data.choices[0].message.content;

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    // Show only the most recent exchange (user question + AI response)
    showRecentExchange();
  } catch (error) {
    // Remove loading message if there's an error
    const messages = chatWindow.querySelectorAll(".msg.ai");
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.textContent === "Thinking...") {
      chatWindow.removeChild(lastMessage);
    }

    // Show error message to user
    console.error("Error calling OpenAI API:", error);
    addMessage(
      "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
      "ai"
    );
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get the user's message
  const message = userInput.value.trim();

  // Don't send empty messages
  if (message === "") {
    return;
  }

  // Clear the input field immediately and reset height
  userInput.value = "";
  userInput.style.height = "48px"; // Reset to minimum height
  userInput.style.overflowY = "hidden";

  // Send the message to OpenAI (this will handle displaying the exchange)
  await sendToOpenAI(message);
});
