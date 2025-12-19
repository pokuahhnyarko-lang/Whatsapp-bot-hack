const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const pino = require("pino");
const fs = require("fs").promises;
const path = require("path");

// Create directories if they don't exist
async function setupDirectories() {
  const dirs = ['./auth_info', './chat_data', './ai_context'];
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {}
  }
}

// Simple AI Chatbot Engine (No API needed)
class SimpleAI {
  constructor() {
    this.contextFile = './ai_context/memory.json';
    this.context = {};
    this.loadContext();
  }

  async loadContext() {
    try {
      const data = await fs.readFile(this.contextFile, 'utf8');
      this.context = JSON.parse(data);
    } catch (err) {
      this.context = {
        userData: {},
        conversations: {},
        learnedResponses: {}
      };
    }
  }

  async saveContext() {
    try {
      await fs.writeFile(this.contextFile, JSON.stringify(this.context, null, 2));
    } catch (err) {}
  }

  // Pattern matching responses
  getPatternResponse(text) {
    const patterns = {
      'hello|hi|hey|hola|namaste': ['Hello! 👋', 'Hi there!', 'Hey! How can I help?'],
      'how are you|how are u|how r u': ['I\'m great! Thanks for asking!', 'Doing well! How about you?'],
      'your name|who are you': ['I\'m KING_BLESS AI Assistant! 🤖', 'I\'m your friendly AI bot!'],
      'thank you|thanks|thx': ['You\'re welcome! 😊', 'Anytime!', 'Glad to help!'],
      'bye|goodbye|see you': ['Goodbye! 👋', 'See you later!', 'Take care!'],
      'help|menu|commands': ['I\'ll send you the menu!'],
      'joke|tell me a joke': ['Why don\'t scientists trust atoms? Because they make up everything! 😄', 
                              'Why did the scarecrow win an award? He was outstanding in his field! 🌾'],
      'time|what time|current time': [`It's currently ${new Date().toLocaleTimeString()}`],
      'date|today\'s date': [`Today is ${new Date().toDateString()}`],
      'weather': ['I\'m a bot, not a weather station! 🌤️ But you can check your local weather app.'],
      'love you|i love you': ['Aww, thank you! ❤️', 'You\'re sweet!'],
      'who created you|who made you': ['I was created by KING_BLESS! 👑', 'KING_BLESS is my creator!'],
      'what can you do|features': ['I can chat, tell jokes, remember things, and much more! Check the menu.'],
      'hi|hi bot|hello bot': ['Hello! 👋 Type *menu* to see what I can do!'],
    };

    for (const pattern in patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        const responses = patterns[pattern];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    return null;
  }

  // Context-aware response
  async generateResponse(text, userId) {
    // Store user data
    if (!this.context.userData[userId]) {
      this.context.userData[userId] = {
        name: 'User',
        interactionCount: 0,
        lastSeen: new Date().toISOString()
      };
    }
    
    this.context.userData[userId].interactionCount++;
    this.context.userData[userId].lastSeen = new Date().toISOString();

    // Check for pattern match first
    const patternResponse = this.getPatternResponse(text);
    if (patternResponse) {
      await this.saveContext();
      return patternResponse;
    }

    // Simple AI conversation logic
    const words = text.toLowerCase().split(' ');
    const responses = {
      question: ['That\'s an interesting question!', 'I\'m still learning about that!', 'Good question!'],
      greeting: ['Nice to see you again!', 'Welcome back!'],
      statement: ['I see!', 'That\'s interesting!', 'Tell me more about that!'],
      command: ['I\'ll help you with that!', 'Let me process your request!']
    };

    // Detect question
    if (text.includes('?') || words.some(w => ['what', 'why', 'how', 'when', 'where', 'who'].includes(w))) {
      return responses.question[Math.floor(Math.random() * responses.question.length)];
    }

    // Detect greeting
    if (words.some(w => ['hello', 'hi', 'hey', 'good morning', 'good evening'].includes(w))) {
      return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }

    // Default response with learning capability
    await this.learnFromInteraction(text, userId);
    return this.getLearnedResponse(text) || "That's interesting! Tell me more about it! 🤔";
  }

  async learnFromInteraction(text, userId) {
    const key = text.toLowerCase().slice(0, 50);
    if (!this.context.learnedResponses[key]) {
      this.context.learnedResponses[key] = {
        count: 1,
        lastUsed: new Date().toISOString()
      };
    } else {
      this.context.learnedResponses[key].count++;
    }
    await this.saveContext();
  }

  getLearnedResponse(text) {
    const key = text.toLowerCase().slice(0, 50);
    if (this.context.learnedResponses[key] && this.context.learnedResponses[key].count > 2) {
      const learnedResponses = [
        "You mentioned that before!",
        "We talked about this earlier!",
        "I remember you saying something similar!",
        "This seems familiar!"
      ];
      return learnedResponses[Math.floor(Math.random() * learnedResponses.length)];
    }
    return null;
  }
}

// Menu System
class MenuSystem {
  constructor() {
    this.menu = {
      main: `*🤖 KING_BLESS AI BOT MENU* 🤖\n\n` +
            `*1.* 🗣️ Chat with AI\n` +
            `*2.* 😄 Get a Joke\n` +
            `*3.* 🕐 Current Time\n` +
            `*4.* 📅 Today's Date\n` +
            `*5.* 💾 Bot Info\n` +
            `*6.* ❓ Help\n` +
            `*7.* ⭐ Features\n\n` +
            `*Reply with the number or type your message!*\n` +
            `_Type 'menu' anytime to see this again!_`,
      
      features: `*🌟 BOT FEATURES* 🌟\n\n` +
                `✅ AI-powered conversations\n` +
                `✅ Context-aware responses\n` +
                `✅ Auto-reply system\n` +
                `✅ Memory retention\n` +
                `✅ Jokes & Fun facts\n` +
                `✅ Time & Date info\n` +
                `✅ Customizable responses\n` +
                `✅ No API keys needed\n` +
                `✅ Group chat support\n\n` +
                `_More features coming soon!_`,
      
      info: `*🤖 BOT INFORMATION* 🤖\n\n` +
            `*Name:* KING_BLESS AI Assistant\n` +
            `*Version:* 2.0.0\n` +
            `*Creator:* KING_BLESS\n` +
            `*Platform:* WhatsApp\n` +
            `*AI Engine:* Pattern-based + Learning\n` +
            `*Status:* Online & Learning 🟢\n\n` +
            `_Built with ❤️ using NodeJS_`
    };
  }

  getMenu(menuType = 'main') {
    return this.menu[menuType] || this.menu.main;
  }

  processMenuSelection(selection) {
    switch(selection) {
      case '1':
      case 'chat':
        return "🗣️ *AI Chat Mode Activated*\n\nStart chatting with me! I'll respond intelligently. Try asking me questions or just say hello!";
      
      case '2':
      case 'joke':
        const jokes = [
          "Why don't eggs tell jokes? They'd crack each other up! 🥚",
          "Why did the math book look so sad? Because it had too many problems! 📚",
          "What do you call a fake noodle? An impasta! 🍝",
          "Why did the coffee file a police report? It got mugged! ☕",
          "What do you call a bear with no teeth? A gummy bear! 🐻"
        ];
        return `😄 *Joke of the moment:*\n\n${jokes[Math.floor(Math.random() * jokes.length)]}`;
      
      case '3':
      case 'time':
        return `🕐 *Current Time:*\n\n${new Date().toLocaleTimeString('en-US', { 
          hour12: true,
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        })}`;
      
      case '4':
      case 'date':
        return `📅 *Today's Date:*\n\n${new Date().toDateString()}`;
      
      case '5':
      case 'info':
        return this.menu.info;
      
      case '6':
      case 'help':
        return "❓ *HELP*\n\nType *menu* to see all options\nType any message to chat with AI\nI can understand context and learn from conversations!\n\nFor issues, contact the bot administrator.";
      
      case '7':
      case 'features':
        return this.menu.features;
      
      default:
        return null;
    }
  }
}

// Auto-Reply System
class AutoReplySystem {
  constructor() {
    this.autoReplies = {
      group: {
        triggers: ['@everyone', '@all', 'attention', 'urgent'],
        responses: ['I got your attention! 👀', 'What\'s up?', 'Yes, I\'m here!']
      },
      keywords: {
        'bot': ['That\'s me! 🤖', 'Bot at your service!', 'Yes?'],
        'help': ['I\'ll help you!', 'Need assistance?', 'How can I assist?'],
        'urgent': ['This sounds urgent!', 'Priority alert! 🚨', 'Immediate attention needed!']
      }
    };
  }

  checkAutoReply(text) {
    const lowerText = text.toLowerCase();
    
    // Check group mentions
    for (const trigger of this.autoReplies.group.triggers) {
      if (lowerText.includes(trigger)) {
        const responses = this.autoReplies.group.responses;
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    
    // Check keywords
    for (const keyword in this.autoReplies.keywords) {
      if (lowerText.includes(keyword)) {
        const responses = this.autoReplies.keywords[keyword];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    
    return null;
  }
}

// Main Bot Class
class KING_BLESS_Bot {
  constructor() {
    this.ai = new SimpleAI();
    this.menu = new MenuSystem();
    this.autoReply = new AutoReplySystem();
    this.userSessions = new Map();
  }

  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        lastActive: Date.now(),
        messageCount: 0,
        context: []
      });
    }
    return this.userSessions.get(userId);
  }

  updateUserSession(userId) {
    const session = this.getUserSession(userId);
    session.lastActive = Date.now();
    session.messageCount++;
    if (session.messageCount > 100) {
      session.context = session.context.slice(-10); // Keep last 10 messages
    }
  }

  async handleMessage(text, userId) {
    this.updateUserSession(userId);
    
    // Clean text
    const cleanText = text.trim().toLowerCase();
    
    // Check for menu command
    if (cleanText === 'menu' || cleanText === '0') {
      return this.menu.getMenu();
    }
    
    // Check for menu selections
    const menuResponse = this.menu.processMenuSelection(cleanText);
    if (menuResponse) {
      return menuResponse;
    }
    
    // Check auto-replies
    const autoReply = this.autoReply.checkAutoReply(cleanText);
    if (autoReply) {
      return autoReply;
    }
    
    // Use AI for other messages
    return await this.ai.generateResponse(text, userId);
  }
}

// Main bot function
async function startBot() {
  await setupDirectories();
  
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const bot = new KING_BLESS_Bot();

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['KING_BLESS Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  // Save credentials when updated
  sock.ev.on('creds.update', saveCreds);

  // QR code and connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("📲 Scan this QR code using WhatsApp > Linked Devices:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 3 seconds...');
        setTimeout(() => startBot(), 3000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot connected to WhatsApp!');
      console.log('🤖 AI Features: Active');
      console.log('📱 Menu System: Ready');
      console.log('🔧 Auto-Reply: Enabled');
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text ||
                 msg.message.imageMessage?.caption ||
                 "";

    const userId = msg.key.remoteJid;
    const userName = msg.pushName || 'User';

    if (text) {
      try {
        const response = await bot.handleMessage(text, userId);
        
        if (response) {
          await sock.sendMessage(userId, { 
            text: response,
            mentions: text.includes('@') ? [userId] : []
          });
          
          // Log the interaction
          console.log(`📨 From: ${userName}`);
          console.log(`💬 Message: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
          console.log(`🤖 Response: ${response.substring(0, 50)}${response.length > 50 ? '...' : ''}`);
          console.log('─'.repeat(50));
        }
      } catch (error) {
        console.error('Error handling message:', error);
        await sock.sendMessage(userId, { 
          text: 'Oops! Something went wrong. Please try again. ⚠️' 
        });
      }
    }
    
    // Welcome message for new chats
    const session = bot.getUserSession(userId);
    if (session.messageCount === 1) {
      setTimeout(async () => {
        await sock.sendMessage(userId, { 
          text: `👋 *Welcome ${userName}!*\n\nI'm KING_BLESS AI Assistant. Type *menu* to see what I can do!\n\nStart chatting with me or explore the menu options. 🤖`
        });
      }, 1000);
    }
  });

  // Handle group messages
  sock.ev.on('group-participants.update', async (update) => {
    const { id, participants, action } = update;
    
    if (action === 'add') {
      await sock.sendMessage(id, {
        text: `👋 Welcome to the group, ${participants.map(p => `@${p.split('@')[0]}`).join(' ')}!\n\nI'm KING_BLESS AI Bot. Type *menu* to see my features!`
      });
    }
  });
}

// Start the bot
startBot().catch(console.error);
