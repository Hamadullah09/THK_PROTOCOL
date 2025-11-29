require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// File management functions
class FileManager {
  constructor() {
    this.logsDir = path.join(__dirname, 'history_logs');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log('📁 Created history_logs directory');
    }
  }

  createClientHistory(clientId, clientName) {
    const fileName = `client_${clientId}_${Date.now()}.txt`;
    const filePath = path.join(this.logsDir, fileName);
    
    const content = `CLIENT HISTORY FILE
===================
Client ID: ${clientId}
Client Name: ${clientName}
Created At: ${new Date().toISOString()}
Status: Active

MESSAGE HISTORY:
===============
`;
    
    fs.writeFileSync(filePath, content);
    console.log(`📄 Created client history file: ${fileName}`);
    return filePath;
  }

  addMessageToClientHistory(clientId, clientName, message, response, agentType) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const clientFile = files.find(file => file.includes(`client_${clientId}`));
      
      if (clientFile) {
        const filePath = path.join(this.logsDir, clientFile);
        const timestamp = new Date().toLocaleString();
        const newEntry = `\n[${timestamp}]
User: ${message}
${agentType} Agent: ${response}
---------------------------`;
        
        fs.appendFileSync(filePath, newEntry);
        console.log(`💾 Updated client history for: ${clientName}`);
      }
    } catch (error) {
      console.error('❌ Error updating client history:', error);
    }
  }

  createLogHistory() {
    const fileName = `protocol_logs_${Date.now()}.txt`;
    const filePath = path.join(this.logsDir, fileName);
    
    const content = `THK PROTOCOL LOGS
=================
Server Started: ${new Date().toISOString()}
Protocol Version: 1.0
AI Provider: ${agentManager.aiProvider}

LOG ENTRIES:
============
`;
    
    fs.writeFileSync(filePath, content);
    console.log(`📄 Created log history file: ${fileName}`);
    return filePath;
  }

  addLogToHistory(logEntry) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const logFile = files.find(file => file.startsWith('protocol_logs'));
      
      if (logFile) {
        const filePath = path.join(this.logsDir, logFile);
        const entry = `\n[${logEntry.timestamp}] ${logEntry.message}`;
        fs.appendFileSync(filePath, entry);
      }
    } catch (error) {
      console.error('❌ Error updating log history:', error);
    }
  }

  deleteClientHistory(clientId) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const clientFile = files.find(file => file.includes(`client_${clientId}`));
      
      if (clientFile) {
        const filePath = path.join(this.logsDir, clientFile);
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted client history file: ${clientFile}`);
        return true;
      }
    } catch (error) {
      console.error('❌ Error deleting client history:', error);
    }
    return false;
  }
}

// Initialize file manager
const fileManager = new FileManager();

// Enhanced THK Protocol Implementation
class THKProtocol {
  constructor() {
    this.connections = new Map();
    this.sequenceNumbers = new Map();
    this.packetHistory = [];
    this.congestionWindow = 1;
    this.maxWindowSize = 10;
  }

  calculateChecksum(data) {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data.charCodeAt(i) * (i + 1)) % 65536;
    }
    return checksum;
  }

  getNextSequence(clientId) {
    if (!this.sequenceNumbers.has(clientId)) {
      this.sequenceNumbers.set(clientId, 1000);
    }
    const seq = this.sequenceNumbers.get(clientId);
    this.sequenceNumbers.set(clientId, seq + 1);
    return seq;
  }

  createPacket(source, destination, type, payload = '') {
    const sequence = this.getNextSequence(source);
    const packetData = `${source}-${destination}-${type}-${JSON.stringify(payload)}`;
    const packet = {
      source,
      destination,
      type,
      payload,
      sequence,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(packetData)
    };
    this.packetHistory.push({
      packet: { ...packet },
      action: 'CREATED',
      timestamp: Date.now()
    });
    console.log(`📦 Packet created: ${source} -> ${destination} | Type: ${type} | Seq: ${sequence}`);
    return packet;
  }

  // 2-Way Handshake Implementation
  initiateHandshake(clientId, agentType) {
    const synPacket = this.createPacket(clientId, 'router', 'SYN', {
      agentType: agentType,
      handshake: 'initiated'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'SYN_SENT',
      sequence: synPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return synPacket;
  }

  completeHandshake(clientId, agentType, synSequence) {
    const synAckPacket = this.createPacket(agentType, 'router', 'SYN-ACK', {
      ack: synSequence + 1,
      handshake: 'acknowledged'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'SYN-ACK_SENT',
      sequence: synAckPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return synAckPacket;
  }

  finalizeHandshake(clientId, agentType, synAckSequence) {
    const ackPacket = this.createPacket(clientId, 'router', 'ACK', {
      ack: synAckSequence + 1,
      handshake: 'completed'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'ESTABLISHED',
      sequence: ackPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return ackPacket;
  }

  // Disconnection Protocol
  initiateDisconnection(clientId, agentType) {
    const finPacket = this.createPacket(clientId, 'router', 'FIN', {
      agentType: agentType,
      disconnect: 'initiated'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'FIN_SENT',
      sequence: finPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return finPacket;
  }

  acknowledgeDisconnection(clientId, agentType, finSequence) {
    const finAckPacket = this.createPacket(agentType, 'router', 'FIN-ACK', {
      ack: finSequence + 1,
      disconnect: 'acknowledged'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'FIN-ACK_SENT',
      sequence: finAckPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return finAckPacket;
  }

  completeDisconnection(clientId, agentType, finAckSequence) {
    const ackPacket = this.createPacket(clientId, 'router', 'ACK', {
      ack: finAckSequence + 1,
      disconnect: 'completed'
    });
    this.connections.delete(`${clientId}-${agentType}`);
    return ackPacket;
  }

  // NEW: Reconnection Protocol
  initiateReconnection(clientId, agentType) {
    const synPacket = this.createPacket(clientId, 'router', 'SYN', {
      agentType: agentType,
      reconnect: 'initiated'
    });
    this.connections.set(`${clientId}-${agentType}`, {
      status: 'SYN_SENT',
      sequence: synPacket.sequence,
      lastActivity: Date.now(),
      agentType: agentType
    });
    return synPacket;
  }

  canSendData(clientId, agentType) {
    const connection = this.connections.get(`${clientId}-${agentType}`);
    return connection && connection.status === 'ESTABLISHED';
  }

  getConnectionStatus(clientId) {
    const status = {};
    this.connections.forEach((conn, key) => {
      if (key.startsWith(clientId)) {
        status[key] = {
          status: conn.status,
          agentType: conn.agentType,
          lastActivity: conn.lastActivity,
          isActive: (Date.now() - conn.lastActivity) < 30000
        };
      }
    });
    return status;
  }

  getRecentPackets() {
    return this.packetHistory.slice(-20);
  }
}

// Agent Manager
class AgentManager {
  constructor() {
    this.agents = ['food', 'travel', 'realestate'];
    this.conversations = new Map();
    this.aiProvider = this.detectAIProvider();
    console.log(`🤖 AI Provider: ${this.aiProvider}`);
  }

  detectAIProvider() {
    console.log('🔍 Detecting AI Provider...');
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here' && process.env.GROQ_API_KEY.startsWith('gsk_')) {
      console.log('✅ Using Groq API');
      return 'groq';
    }
    else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' && process.env.GEMINI_API_KEY.startsWith('AIza')) {
      console.log('✅ Using Google Gemini API');
      return 'gemini';
    }
    else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.log('✅ Using OpenAI API');
      return 'openai';
    }
    else {
      console.log('✅ Using Smart Mock Responses (No valid API keys found)');
      return 'smart_mock';
    }
  }

  routeToAgent(message) {
    const lowerMessage = message.toLowerCase();
    const keywords = {
      food: ['food', 'restaurant', 'eat', 'hungry', 'pizza', 'burger', 'meal', 'cook', 'recipe', 'dinner', 'lunch', 'breakfast', 'delivery', 'takeout'],
      travel: ['travel', 'vacation', 'hotel', 'flight', 'trip', 'beach', 'tour', 'destination', 'holiday', 'sightseeing', 'airport', 'booking'],
      realestate: ['house', 'property', 'real estate', 'rent', 'buy', 'sell', 'apartment', 'home', 'mortgage', 'price', 'lease', 'broker']
    };
    for (const [agentType, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        console.log(`🎯 Routing to ${agentType} agent for: "${message}"`);
        return agentType;
      }
    }
    console.log(`🎯 Defaulting to food agent for: "${message}"`);
    return 'food';
  }

  async getAIResponse(agentType, message, clientId) {
    try {
      console.log(`🔄 Getting AI response from ${this.aiProvider} for ${agentType} agent...`);
      let response;
      switch (this.aiProvider) {
        case 'groq':
          response = await this.getGroqResponse(agentType, message, clientId);
          break;
        case 'openai':
          response = await this.getOpenAIResponse(agentType, message, clientId);
          break;
        case 'gemini':
          response = await this.getGeminiResponse(agentType, message, clientId);
          break;
        default:
          response = await this.getSmartMockResponse(agentType, message, clientId);
      }
      await this.storeConversation(clientId, agentType, message, response);
      console.log(`✅ AI Response generated: ${response.substring(0, 100)}...`);
      return response;
    } catch (error) {
      console.error(`❌ AI Response error:`, error);
      const fallbackResponse = await this.getSmartMockResponse(agentType, message, clientId);
      return fallbackResponse;
    }
  }

  async getGroqResponse(agentType, message, clientId) {
    console.log('🚀 INSIDE getGroqResponse FUNCTION');
    if (!process.env.GROQ_API_KEY) {
      console.log('❌ Groq API key missing in environment');
      throw new Error('Groq API key not configured');
    }
    const systemPrompt = this.getSystemPrompt(agentType);
    console.log(`🔑 Groq API Key: ${process.env.GROQ_API_KEY.substring(0, 15)}...`);
    console.log(`📤 Sending to Groq - Agent: ${agentType}, Message: "${message}"`);
    try {
      const availableModels = ['llama-3.1-8b-instant'];
      const requestBody = {
        model: availableModels[0],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.7
      };
      console.log('📦 Using Model:', requestBody.model);
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      console.log('✅ Groq API Success!');
      console.log('📨 Response Status:', response.status);
      if (response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        console.log(`🤖 AI Response: ${aiResponse}`);
        return aiResponse;
      } else {
        throw new Error('No choices in response');
      }
    } catch (error) {
      console.error('❌ Groq API Error:');
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async getOpenAIResponse(agentType, message, clientId) {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }
    const systemPrompt = this.getSystemPrompt(agentType);
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    return response.data.choices[0].message.content;
  }

  async getGeminiResponse(agentType, message, clientId) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }
    const systemPrompt = this.getSystemPrompt(agentType);
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: message }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      if (response.data && response.data.candidates && response.data.candidates[0]) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('❌ Gemini API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSmartMockResponse(agentType, message, clientId) {
    if (!this.conversations.has(clientId)) {
      this.conversations.set(clientId, []);
    }
    const conversation = this.conversations.get(clientId);
    conversation.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });
    const response = this.generateContextAwareResponse(agentType, message, conversation);
    conversation.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });
    console.log(`🤖 Smart Mock Response for ${agentType}: ${response}`);
    return response;
  }

  generateContextAwareResponse(agentType, message, conversation) {
    const lowerMessage = message.toLowerCase();
    if (agentType === 'food') {
      if (lowerMessage.includes('pizza') || lowerMessage.includes('italian')) {
        return "I'd recommend trying Mario's Pizzeria downtown! They have authentic wood-fired pizzas with fresh ingredients. Their margherita pizza is particularly excellent, and the atmosphere is very cozy.";
      } else if (lowerMessage.includes('burger') || lowerMessage.includes('fast food')) {
        return "You should check out Burger Junction near the city center! They just opened and have creative gourmet burgers. The 'Mountain Burger' with caramelized onions and special sauce is amazing!";
      } else if (lowerMessage.includes('healthy') || lowerMessage.includes('salad') || lowerMessage.includes('diet')) {
        return "For healthy options, I recommend Green Leaf Cafe on Main Street. They have fantastic fresh salads, grain bowls, and smoothies. Their quinoa salad with avocado is particularly popular among health-conscious customers!";
      } else if (lowerMessage.includes('chinese') || lowerMessage.includes('asian')) {
        return "There's a wonderful Chinese restaurant called 'Dragon Palace' in the east side. Their dim sum is authentic and the Peking duck is to die for! Great for family dinners.";
      } else if (lowerMessage.includes('breakfast') || lowerMessage.includes('morning')) {
        return "For breakfast, try Sunrise Cafe! They have the best pancakes in town and their coffee is locally roasted. Perfect way to start your day!";
      } else {
        const responses = [
          "I'd recommend trying the Italian restaurant downtown! Their pasta is amazing and they have a great wine selection. The ambiance is perfect for both casual and special occasions.",
          "There's a fantastic new seafood place by the harbor - their daily catch is always fresh! The grilled salmon with lemon butter sauce is incredible.",
          "For a cozy atmosphere, check out the bistro on Oak Street. They have great comfort food and friendly service. Their chicken pot pie is legendary!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    else if (agentType === 'travel') {
      if (lowerMessage.includes('beach') || lowerMessage.includes('sea') || lowerMessage.includes('ocean')) {
        return "For beach destinations, I highly recommend the Maldives for luxury or Bali for culture and affordability! The water is crystal clear this time of year. Don't forget to try snorkeling - the marine life is breathtaking!";
      } else if (lowerMessage.includes('mountain') || lowerMessage.includes('hiking') || lowerMessage.includes('trek')) {
        return "For mountain getaways, the Swiss Alps are absolutely stunning! If you prefer something closer, Colorado has amazing hiking trails with breathtaking views. Spring is perfect for mountain trips - the weather is ideal!";
      } else if (lowerMessage.includes('europe') || lowerMessage.includes('paris') || lowerMessage.includes('london')) {
        return "Europe is wonderful this season! Paris is romantic as always, and London has fantastic museums. Consider the Eurail pass for easy travel between countries. The tulips in Amsterdam are blooming beautifully now!";
      } else if (lowerMessage.includes('asia') || lowerMessage.includes('thailand') || lowerMessage.includes('japan')) {
        return "Asia offers incredible diversity! Thailand has beautiful temples and beaches, Japan is perfect for culture and cuisine, and Vietnam has amazing street food. The cherry blossoms in Japan are spectacular during spring!";
      } else if (lowerMessage.includes('budget') || lowerMessage.includes('cheap') || lowerMessage.includes('affordable')) {
        return "For budget travel, consider Southeast Asia or Eastern Europe. Countries like Vietnam, Thailand, and Poland offer amazing experiences at great prices. Hostels and local eateries can help stretch your budget further!";
      } else {
        const responses = [
          "That destination is beautiful this time of year! The weather should be perfect for sightseeing. I suggest booking flights about 2-3 months in advance for the best prices and availability.",
          "Don't forget to check visa requirements and travel insurance before booking international trips. Also, consider travel during shoulder season for better deals and fewer crowds!",
          "I recommend researching local customs and learning a few basic phrases in the local language. It really enhances the travel experience and locals appreciate the effort!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    else if (agentType === 'realestate') {
      if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('first home')) {
        return "For buyers, now is actually a good time in many markets! Interest rates are stabilizing. I strongly recommend getting pre-approved first - it strengthens your position when making offers. Also, consider neighborhoods with good schools as they tend to hold value better.";
      } else if (lowerMessage.includes('sell') || lowerMessage.includes('selling') || lowerMessage.includes('market')) {
        return "If you're selling, spring is typically the best season as buyer activity increases. Consider staging your home and making minor repairs - these small investments can significantly increase your final sale price. Professional photography also helps attract more buyers!";
      } else if (lowerMessage.includes('rent') || lowerMessage.includes('apartment') || lowerMessage.includes('lease')) {
        return "The rental market is quite competitive right now. Having your documents ready (ID, proof of income, references) and being prepared to act quickly is important. Look for listings within your first 2 days online for the best options!";
      } else if (lowerMessage.includes('investment') || lowerMessage.includes('property') || lowerMessage.includes('rental')) {
        return "For investment properties, consider areas with growing job markets and development. Multi-family homes can provide better cash flow, and properties near universities often have stable rental demand. Always calculate your cap rate and cash-on-cash return!";
      } else if (lowerMessage.includes('price') || lowerMessage.includes('value') || lowerMessage.includes('worth')) {
        return "Property values have been appreciating in most areas. I recommend getting a professional appraisal for accurate valuation. Factors like location, condition, and recent comparable sales in your area all affect the final price.";
      } else {
        const responses = [
          "The housing market is currently balanced in most areas, offering opportunities for both buyers and sellers. It's a good time to make moves if you find the right property!",
          "I recommend working with a local realtor who knows the specific neighborhood you're interested in. Local expertise can make a huge difference in finding the perfect property!",
          "Properties with good schools nearby, access to public transportation, and local amenities tend to hold their value better over the long term. Consider these factors in your search!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    return "I'd be happy to help you with that! Could you provide a bit more detail about what you're looking for? This will help me give you the most accurate and helpful information.";
  }

  getSystemPrompt(agentType) {
    const prompts = {
      food: `You are a friendly and knowledgeable food and restaurant expert. Provide specific, helpful recommendations for restaurants, recipes, cooking tips, and food-related advice. Be conversational and practical. Keep responses under 200 words.`,
      travel: `You are an experienced and enthusiastic travel agent. Provide practical travel advice, destination recommendations, booking tips, and travel planning assistance. Be informative and encouraging. Keep responses under 200 words.`,
      realestate: `You are a professional and trustworthy real estate agent. Provide knowledgeable property advice, market insights, buying/selling tips, and real estate guidance. Be professional and accurate. Keep responses under 200 words.`
    };
    return prompts[agentType] || 'You are a helpful assistant. Provide useful and accurate information.';
  }

  async storeConversation(clientId, agentType, userMessage, agentResponse) {
    try {
      if (!this.conversations.has(clientId)) {
        this.conversations.set(clientId, []);
      }
      const conversation = {
        clientId,
        agentType,
        userMessage,
        agentResponse,
        timestamp: new Date().toISOString(),
        aiProvider: this.aiProvider
      };
      this.conversations.get(clientId).push(conversation);
    } catch (error) {
      console.error('Error storing conversation:', error);
    }
  }

  getAllConversations() {
    const allConversations = [];
    this.conversations.forEach((convs, clientId) => {
      convs.forEach(conv => {
        allConversations.push({
          clientId,
          ...conv
        });
      });
    });
    return allConversations;
  }
}

// Client Manager
class ClientManager {
  constructor() {
    this.clients = new Map();
    this.manualClients = new Map();
    this.socketToClient = new Map();
  }

  addClient(socketId, clientData) {
    const clientId = socketId;
    this.clients.set(clientId, {
      id: clientId,
      name: clientData.name,
      type: 'connected',
      socketId: socketId,
      registeredAt: Date.now(),
      lastActivity: Date.now(),
      status: 'connected'
    });
    this.socketToClient.set(socketId, clientId);
    
    fileManager.createClientHistory(clientId, clientData.name);
    
    return clientId;
  }

  addManualClient(clientName) {
    const clientId = `manual_${Date.now()}`;
    this.manualClients.set(clientId, {
      id: clientId,
      name: clientName,
      type: 'manual',
      registeredAt: Date.now(),
      lastActivity: Date.now(),
      status: 'connected'
    });
    
    fileManager.createClientHistory(clientId, clientName);
    
    return clientId;
  }

  removeClient(clientId) {
    fileManager.deleteClientHistory(clientId);
    this.clients.delete(clientId);
    this.manualClients.delete(clientId);
    for (let [socketId, cId] of this.socketToClient.entries()) {
      if (cId === clientId) {
        this.socketToClient.delete(socketId);
        break;
      }
    }
  }

  removeManualClient(clientId) {
    fileManager.deleteClientHistory(clientId);
    this.manualClients.delete(clientId);
  }

  updateActivity(clientId) {
    const client = this.clients.get(clientId) || this.manualClients.get(clientId);
    if (client) {
      client.lastActivity = Date.now();
    }
  }

  updateClientStatus(clientId, status) {
    const client = this.clients.get(clientId) || this.manualClients.get(clientId);
    if (client) {
      client.status = status;
      client.lastActivity = Date.now();
    }
  }

  getAllClients() {
    const connectedClients = Array.from(this.clients.values());
    const manualClients = Array.from(this.manualClients.values());
    return [...connectedClients, ...manualClients];
  }

  getClient(clientId) {
    return this.clients.get(clientId) || this.manualClients.get(clientId);
  }

  getClientBySocketId(socketId) {
    const clientId = this.socketToClient.get(socketId);
    return clientId ? this.getClient(clientId) : null;
  }

  removeBySocketId(socketId) {
    const clientId = this.socketToClient.get(socketId);
    if (clientId) {
      this.removeClient(clientId);
    }
  }
}

// Initialize managers
const protocol = new THKProtocol();
const agentManager = new AgentManager();
const clientManager = new ClientManager();

fileManager.createLogHistory();

console.log('🚀 THK Protocol Server Starting...');
console.log('🎯 Available Agents:', agentManager.agents.join(', '));
console.log('🤖 AI Provider:', agentManager.aiProvider);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    protocol: 'THK',
    version: '1.0',
    agents: agentManager.agents,
    aiProvider: agentManager.aiProvider
  });
});

app.get('/api/clients', (req, res) => {
  res.json({
    clients: clientManager.getAllClients(),
    total: clientManager.getAllClients().length
  });
});

app.post('/api/clients', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }
    const clientId = clientManager.addManualClient(name);
    const client = clientManager.getClient(clientId);
    io.emit('client_added', client);
    io.emit('initial_state', getInitialState());
    res.json({ clientId, client });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:clientId', (req, res) => {
  try {
    const { clientId } = req.params;
    clientManager.removeClient(clientId);
    io.emit('client_removed', { clientId });
    io.emit('initial_state', getInitialState());
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalClients: clientManager.getAllClients().length,
    activeConnections: protocol.connections.size,
    congestionWindow: protocol.congestionWindow,
    recentPackets: protocol.getRecentPackets().length,
    aiProvider: agentManager.aiProvider
  };
  res.json(stats);
});

function getInitialState() {
  return {
    clients: clientManager.getAllClients(),
    agents: agentManager.agents,
    stats: {
      totalClients: clientManager.getAllClients().length,
      activeConnections: protocol.connections.size,
      aiProvider: agentManager.aiProvider
    }
  };
}

// NEW: Function to perform connection handshake
async function performConnectionHandshake(clientId, clientName, socket) {
  return new Promise((resolve) => {
    console.log(`🤝 Starting connection handshake for ${clientName}`);
    
    // Perform handshake with all agents
    const agents = ['food', 'travel', 'realestate'];
    let completedHandshakes = 0;
    
    agents.forEach(agentType => {
      // SYN: Client -> Router
      const synPacket = protocol.initiateHandshake(clientId, agentType);
      io.emit('packet_animation', {
        id: Date.now() + Math.random(),
        from: clientId,
        to: 'router',
        packet: synPacket,
        type: 'SYN',
        clientId: clientId
      });
      
      setTimeout(() => {
        // SYN: Router -> Agent
        const synToAgent = protocol.createPacket('router', agentType, 'SYN', 'Routing to agent');
        io.emit('packet_animation', {
          id: Date.now() + Math.random(),
          from: 'router',
          to: agentType,
          packet: synToAgent,
          type: 'SYN',
          clientId: clientId
        });
        
        setTimeout(() => {
          // SYN-ACK: Agent -> Router
          const synAckPacket = protocol.completeHandshake(clientId, agentType, synPacket.sequence);
          io.emit('packet_animation', {
            id: Date.now() + Math.random(),
            from: agentType,
            to: 'router',
            packet: synAckPacket,
            type: 'SYN-ACK',
            clientId: clientId
          });
          
          setTimeout(() => {
            // SYN-ACK: Router -> Client
            const synAckToClient = protocol.createPacket('router', clientId, 'SYN-ACK', 'Handshake in progress');
            io.emit('packet_animation', {
              id: Date.now() + Math.random(),
              from: 'router',
              to: clientId,
              packet: synAckToClient,
              type: 'SYN-ACK',
              clientId: clientId
            });
            
            setTimeout(() => {
              // ACK: Client -> Router
              const ackPacket = protocol.finalizeHandshake(clientId, agentType, synAckPacket.sequence);
              io.emit('packet_animation', {
                id: Date.now() + Math.random(),
                from: clientId,
                to: 'router',
                packet: ackPacket,
                type: 'ACK',
                clientId: clientId
              });
              
              setTimeout(() => {
                // ACK: Router -> Agent
                const ackToAgent = protocol.createPacket('router', agentType, 'ACK', 'Handshake complete');
                io.emit('packet_animation', {
                  id: Date.now() + Math.random(),
                  from: 'router',
                  to: agentType,
                  packet: ackToAgent,
                  type: 'ACK',
                  clientId: clientId
                });
                
                completedHandshakes++;
                console.log(`🤝 Handshake completed for ${clientName} with ${agentType} agent`);
                
                if (completedHandshakes === agents.length) {
                  console.log(`✅ All handshakes completed for ${clientName}`);
                  resolve();
                }
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    });
  });
}

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  fileManager.addLogToHistory({
    timestamp: new Date().toLocaleTimeString(),
    message: `Client connected: ${socket.id}`
  });
  
  socket.emit('initial_state', getInitialState());

  socket.on('register_client', async (clientData) => {
    try {
      const clientId = clientManager.addClient(socket.id, clientData);
      console.log('📝 Client registered:', clientData.name);
      
      fileManager.addLogToHistory({
        timestamp: new Date().toLocaleTimeString(),
        message: `Client registered: ${clientData.name} (${socket.id})`
      });
      
      // NEW: Perform connection handshake with visualization
      await performConnectionHandshake(clientId, clientData.name, socket);
      
      // Update client status to connected
      clientManager.updateClientStatus(clientId, 'connected');
      
      socket.emit('client_registered', { clientId: socket.id, name: clientData.name });
      io.emit('client_connected', { clientId: socket.id, name: clientData.name });
      io.emit('initial_state', getInitialState());
      
    } catch (error) {
      console.error('Error registering client:', error);
      socket.emit('error', { message: 'Failed to register client' });
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { clientId, message } = data;
      const client = clientManager.getClient(clientId);
      
      // NEW: Check if client is connected
      if (!client) {
        socket.emit('error', { message: 'Client not found. Please register first.' });
        return;
      }
      
      if (client.status !== 'connected') {
        socket.emit('error', { message: 'Client is offline. Please connect first.' });
        return;
      }
      
      console.log(`💬 Message from ${client.name}: ${message}`);
      clientManager.updateActivity(clientId);
      
      fileManager.addLogToHistory({
        timestamp: new Date().toLocaleTimeString(),
        message: `Message from ${client.name}: ${message}`
      });
      
      const agentType = agentManager.routeToAgent(message);
      console.log(`🎯 Routing "${message}" to ${agentType} agent`);
      
      await performCommunicationCycle(clientId, client.name, agentType, message, socket);
    } catch (error) {
      console.error('❌ Error handling message:', error);
      socket.emit('error', { message: 'Failed to process message: ' + error.message });
    }
  });

  // Disconnect client with protocol
  socket.on('disconnect_client', async (data) => {
    try {
      const { clientId } = data;
      const client = clientManager.getClient(clientId);
      
      if (!client) {
        socket.emit('error', { message: 'Client not found.' });
        return;
      }

      console.log(`🔌 Manual disconnection initiated for: ${client.name}`);
      
      fileManager.addLogToHistory({
        timestamp: new Date().toLocaleTimeString(),
        message: `Manual disconnection initiated for: ${client.name}`
      });

      // Perform disconnection protocol for all agents
      const agents = ['food', 'travel', 'realestate'];
      for (const agentType of agents) {
        if (protocol.connections.has(`${clientId}-${agentType}`)) {
          await performDisconnectionProtocol(clientId, client.name, agentType, socket);
        }
      }

      clientManager.updateClientStatus(clientId, 'disconnected');
      
      socket.emit('client_disconnected_manual', { 
        clientId: clientId, 
        name: client.name,
        message: 'Client manually disconnected using THK Protocol'
      });
      
      io.emit('initial_state', getInitialState());
      
      console.log(`✅ Manual disconnection completed for: ${client.name}`);
      
    } catch (error) {
      console.error('❌ Error during manual disconnection:', error);
      socket.emit('error', { message: 'Failed to disconnect client: ' + error.message });
    }
  });

  // NEW: Reconnect client
  socket.on('reconnect_client', async (data) => {
    try {
      const { clientId } = data;
      const client = clientManager.getClient(clientId);
      
      if (!client) {
        socket.emit('error', { message: 'Client not found.' });
        return;
      }

      console.log(`🔗 Reconnection initiated for: ${client.name}`);
      
      fileManager.addLogToHistory({
        timestamp: new Date().toLocaleTimeString(),
        message: `Reconnection initiated for: ${client.name}`
      });

      // Perform reconnection handshake
      await performConnectionHandshake(clientId, client.name, socket);

      clientManager.updateClientStatus(clientId, 'connected');
      
      socket.emit('client_reconnected', { 
        clientId: clientId, 
        name: client.name,
        message: 'Client reconnected using THK Protocol'
      });
      
      io.emit('initial_state', getInitialState());
      
      console.log(`✅ Reconnection completed for: ${client.name}`);
      
    } catch (error) {
      console.error('❌ Error during reconnection:', error);
      socket.emit('error', { message: 'Failed to reconnect client: ' + error.message });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`⚠️ Client disconnected: ${socket.id} - ${reason}`);
    const client = clientManager.getClientBySocketId(socket.id);
    if (client) {
      io.emit('client_disconnected', { clientId: socket.id, name: client.name });
      
      fileManager.addLogToHistory({
        timestamp: new Date().toLocaleTimeString(),
        message: `Client disconnected: ${client.name} (${socket.id}) - ${reason}`
      });
    }
    clientManager.removeBySocketId(socket.id);
    io.emit('initial_state', getInitialState());
  });

  // Disconnection protocol function
  async function performDisconnectionProtocol(clientId, clientName, agentType, socket) {
    return new Promise((resolve) => {
      console.log(`🔌 Starting disconnection protocol for ${clientName} from ${agentType} agent`);
      
      // FIN: Client -> Router
      const finPacket = protocol.initiateDisconnection(clientId, agentType);
      io.emit('packet_animation', {
        id: Date.now() + 100,
        from: clientId,
        to: 'router',
        packet: finPacket,
        type: 'FIN',
        clientId: clientId
      });
      
      setTimeout(() => {
        // FIN: Router -> Agent
        const finToAgent = protocol.createPacket('router', agentType, 'FIN', 'Disconnection request');
        io.emit('packet_animation', {
          id: Date.now() + 101,
          from: 'router',
          to: agentType,
          packet: finToAgent,
          type: 'FIN',
          clientId: clientId
        });
        
        setTimeout(() => {
          // FIN-ACK: Agent -> Router
          const finAckPacket = protocol.acknowledgeDisconnection(clientId, agentType, finPacket.sequence);
          io.emit('packet_animation', {
            id: Date.now() + 102,
            from: agentType,
            to: 'router',
            packet: finAckPacket,
            type: 'FIN-ACK',
            clientId: clientId
          });
          
          setTimeout(() => {
            // FIN-ACK: Router -> Client
            const finAckToClient = protocol.createPacket('router', clientId, 'FIN-ACK', 'Disconnection acknowledged');
            io.emit('packet_animation', {
              id: Date.now() + 103,
              from: 'router',
              to: clientId,
              packet: finAckToClient,
              type: 'FIN-ACK',
              clientId: clientId
            });
            
            setTimeout(() => {
              // ACK: Client -> Router
              const ackPacket = protocol.completeDisconnection(clientId, agentType, finAckPacket.sequence);
              io.emit('packet_animation', {
                id: Date.now() + 104,
                from: clientId,
                to: 'router',
                packet: ackPacket,
                type: 'ACK',
                clientId: clientId
              });
              
              setTimeout(() => {
                // ACK: Router -> Agent
                const ackToAgent = protocol.createPacket('router', agentType, 'ACK', 'Disconnection complete');
                io.emit('packet_animation', {
                  id: Date.now() + 105,
                  from: 'router',
                  to: agentType,
                  packet: ackToAgent,
                  type: 'ACK',
                  clientId: clientId
                });
                
                console.log(`🔌 Disconnection protocol completed for ${clientName} from ${agentType} agent`);
                resolve();
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    });
  }

  // Communication cycle with PROPER response delivery
  async function performCommunicationCycle(clientId, clientName, agentType, message, socket) {
    try {
      console.log(`🔄 Starting communication cycle for ${clientName} with ${agentType} agent`);
      
      // Step 1: Handshake
      await performHandshake(clientId, clientName, agentType);
      
      // Step 2: Send data
      await sendData(clientId, clientName, agentType, message);
      
      // Step 3: Process and get response
      const response = await processAndGetResponse(clientId, clientName, agentType, message);
      
      // Step 4: Deliver response back to client
      await deliverResponse(clientId, clientName, agentType, response, socket);
      
      console.log(`✅ Complete communication cycle finished for ${clientName}`);
    } catch (error) {
      console.error(`❌ Communication cycle failed for ${clientName}:`, error);
      socket.emit('error', { message: 'Communication failed: ' + error.message });
    }
  }

  function performHandshake(clientId, clientName, agentType) {
    return new Promise((resolve) => {
      console.log(`🤝 Starting handshake for ${clientName} with ${agentType} agent`);
      // SYN: Client -> Router
      const synPacket = protocol.initiateHandshake(clientId, agentType);
      io.emit('packet_animation', {
        id: Date.now(),
        from: clientId,
        to: 'router',
        packet: synPacket,
        type: 'SYN',
        clientId: clientId
      });
      setTimeout(() => {
        // SYN: Router -> Agent
        const synToAgent = protocol.createPacket('router', agentType, 'SYN', 'Routing to agent');
        io.emit('packet_animation', {
          id: Date.now() + 1,
          from: 'router',
          to: agentType,
          packet: synToAgent,
          type: 'SYN',
          clientId: clientId
        });
        setTimeout(() => {
          // SYN-ACK: Agent -> Router
          const synAckPacket = protocol.completeHandshake(clientId, agentType, synPacket.sequence);
          io.emit('packet_animation', {
            id: Date.now() + 2,
            from: agentType,
            to: 'router',
            packet: synAckPacket,
            type: 'SYN-ACK',
            clientId: clientId
          });
          setTimeout(() => {
            // SYN-ACK: Router -> Client
            const synAckToClient = protocol.createPacket('router', clientId, 'SYN-ACK', 'Handshake in progress');
            io.emit('packet_animation', {
              id: Date.now() + 3,
              from: 'router',
              to: clientId,
              packet: synAckToClient,
              type: 'SYN-ACK',
              clientId: clientId
            });
            setTimeout(() => {
              // ACK: Client -> Router
              const ackPacket = protocol.finalizeHandshake(clientId, agentType, synAckPacket.sequence);
              io.emit('packet_animation', {
                id: Date.now() + 4,
                from: clientId,
                to: 'router',
                packet: ackPacket,
                type: 'ACK',
                clientId: clientId
              });
              setTimeout(() => {
                // ACK: Router -> Agent
                const ackToAgent = protocol.createPacket('router', agentType, 'ACK', 'Handshake complete');
                io.emit('packet_animation', {
                  id: Date.now() + 5,
                  from: 'router',
                  to: agentType,
                  packet: ackToAgent,
                  type: 'ACK',
                  clientId: clientId
                });
                console.log(`🤝 Handshake completed for ${clientName}`);
                resolve();
              }, 300);
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    });
  }

  function sendData(clientId, clientName, agentType, message) {
    return new Promise((resolve) => {
      console.log(`📤 Sending data to ${agentType} agent`);
      // DATA: Client -> Router
      const dataPacket1 = protocol.createPacket(clientId, 'router', 'DATA', message);
      io.emit('packet_animation', {
        id: Date.now() + 6,
        from: clientId,
        to: 'router',
        packet: dataPacket1,
        type: 'DATA_SEND',
        clientId: clientId
      });
      setTimeout(() => {
        // DATA: Router -> Agent
        const dataPacket2 = protocol.createPacket('router', agentType, 'DATA', message);
        io.emit('packet_animation', {
          id: Date.now() + 7,
          from: 'router',
          to: agentType,
          packet: dataPacket2,
          type: 'DATA_SEND',
          clientId: clientId
        });
        console.log(`📤 Data delivered to ${agentType} agent`);
        resolve();
      }, 400);
    });
  }

  async function processAndGetResponse(clientId, clientName, agentType, message) {
    console.log(`🔄 Processing message with ${agentType} agent...`);
    try {
      const responsePromise = agentManager.getAIResponse(agentType, message, clientId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI response timeout')), 15000)
      );
      const response = await Promise.race([responsePromise, timeoutPromise]);
      console.log(`✅ AI Response received: ${response.substring(0, 100)}...`);
      
      fileManager.addMessageToClientHistory(clientId, clientName, message, response, agentType);
      
      return response;
    } catch (error) {
      console.error(`❌ Error getting AI response:`, error);
      return `I apologize, but I'm having trouble processing your request right now. As the ${agentType} agent, I'd normally help you with "${message}". Please try again in a moment.`;
    }
  }

  function deliverResponse(clientId, clientName, agentType, response, socket) {
    return new Promise((resolve) => {
      console.log(`📨 Delivering response to ${clientName}`);
      // RESPONSE: Agent -> Router
      const responsePacket1 = protocol.createPacket(agentType, 'router', 'DATA', response);
      io.emit('packet_animation', {
        id: Date.now() + 8,
        from: agentType,
        to: 'router',
        packet: responsePacket1,
        type: 'DATA_RECEIVE',
        clientId: clientId
      });
      setTimeout(() => {
        // RESPONSE: Router -> Client
        const responsePacket2 = protocol.createPacket('router', clientId, 'DATA', response);
        io.emit('packet_animation', {
          id: Date.now() + 9,
          from: 'router',
          to: clientId,
          packet: responsePacket2,
          type: 'DATA_RECEIVE',
          clientId: clientId
        });
        socket.emit('agent_response', {
          clientId: clientId,
          agent: agentType,
          message: response,
          timestamp: Date.now(),
          aiProvider: agentManager.aiProvider
        });
        io.emit('initial_state', getInitialState());
        console.log(`✅ Response delivered to ${clientName}`);
        console.log(`💬 Final Response: ${response.substring(0, 80)}...`);
        resolve();
      }, 400);
    });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ THK Protocol Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🎯 Available Agents: ${agentManager.agents.join(', ')}`);
  console.log(`🤖 AI Provider: ${agentManager.aiProvider}`);
  console.log(`🔧 Protocol features: 2-way handshake, checksum, congestion control, flow control, disconnection protocol`);
  console.log(`🌐 Client URL: http://localhost:3000`);
  console.log(`📁 History files will be saved in: ${fileManager.logsDir}`);
});