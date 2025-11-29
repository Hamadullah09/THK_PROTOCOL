# 🚀 THK Protocol Simulator

A comprehensive **custom network protocol simulator** implementing a TCP-like protocol with real-time visualization, AI-powered agent communication, and interactive client management.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Protocol Specifications](#protocol-specifications)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

The **THK Protocol Simulator** is a full-stack application that demonstrates a custom reliable transport layer protocol similar to TCP. It features:

- **2-Way Handshake Protocol** (SYN, SYN-ACK, ACK)
- **Connection Management** (Establish, Maintain, Disconnect, Reconnect)
- **Real-time Packet Animation** and Network Topology Visualization
- **AI-Powered Agents** (Food, Travel, Real Estate) with multiple AI provider support
- **Client-Server Architecture** using Socket.IO
- **Persistent Chat History** with local storage
- **File-Based Logging System** for protocol events and client history

## ✨ Features

### Protocol Features

- ✅ **Connection Establishment**: 2-way handshake (SYN → SYN-ACK → ACK)
- ✅ **Data Transmission**: Reliable packet delivery with sequence numbers
- ✅ **Checksum Verification**: Data integrity validation
- ✅ **Graceful Disconnection**: 3-way disconnection protocol (FIN → FIN-ACK → ACK)
- ✅ **Reconnection Support**: Seamless client reconnection
- ✅ **Flow Control**: Congestion window management
- ✅ **Packet History Tracking**: Complete packet lifecycle monitoring

### Application Features

- 🎨 **Real-time Network Visualization**: Interactive canvas-based topology view
- 🤖 **Multi-Agent AI System**: Smart routing to specialized agents
- 💬 **Persistent Chat Interface**: Conversation history saved locally
- 📊 **Admin Dashboard**: Client management and statistics
- 📁 **File Logging**: Automatic history file generation for all clients
- 🔌 **Connection Status**: Visual indicators for online/offline clients
- 🎯 **Intelligent Routing**: Keyword-based message routing to appropriate agents

### AI Provider Support

- **Groq API** (Llama 3.1)
- **OpenAI API** (GPT-3.5 Turbo)
- **Google Gemini API** (Gemini Pro)
- **Smart Mock Responses** (Fallback with context-aware replies)

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client 1  │◄───────►│    Router    │◄───────►│ Food Agent  │
└─────────────┘         │  (Server)    │         └─────────────┘
                        │              │
┌─────────────┐         │              │         ┌─────────────┐
│   Client 2  │◄───────►│  THK Protocol│◄───────►│Travel Agent │
└─────────────┘         │              │         └─────────────┘
                        │              │
┌─────────────┐         │  Socket.IO   │         ┌─────────────┐
│   Client N  │◄───────►│              │◄───────►│Real Estate  │
└─────────────┘         └──────────────┘         └─────────────┘
```

### Components

1. **THK Protocol Layer**: Handles connection management, packet creation, sequencing
2. **Router**: Central message routing and agent selection
3. **Agent Manager**: AI provider integration and response generation
4. **Client Manager**: Client registration, tracking, and lifecycle management
5. **File Manager**: History logging and file operations
6. **Visualization Layer**: Real-time network topology and packet animation

## 📡 Protocol Specifications

### Connection Handshake

```
Client                Router                Agent
  |                     |                     |
  |----SYN------------>|                     |
  |                     |----SYN------------>|
  |                     |<---SYN-ACK---------|
  |<---SYN-ACK---------|                     |
  |----ACK------------>|                     |
  |                     |----ACK------------>|
  |                     |                     |
  [Connection Established]
```

### Data Transmission

```
Client                Router                Agent
  |                     |                     |
  |----DATA----------->|                     |
  |                     |----DATA----------->|
  |                     |                     | (Processing)
  |                     |<---DATA------------|
  |<---DATA------------|                     |
```

### Disconnection Protocol

```
Client                Router                Agent
  |                     |                     |
  |----FIN------------>|                     |
  |                     |----FIN------------>|
  |                     |<---FIN-ACK---------|
  |<---FIN-ACK---------|                     |
  |----ACK------------>|                     |
  |                     |----ACK------------>|
  |                     |                     |
  [Connection Closed]
```

### Packet Structure

```javascript
{
  source: "client_id",
  destination: "agent_type",
  type: "SYN|SYN-ACK|ACK|DATA|FIN|FIN-ACK",
  payload: "message_data",
  sequence: 1001,
  timestamp: 1699999999999,
  checksum: 12345
}
```

## 🛠️ Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Modern web browser** (Chrome, Firefox, Edge, Safari)


### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Install Client Dependencies

```bash
cd ../client
npm install
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000

# AI Provider API Keys (Optional - choose one or use mock responses)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### AI Provider Priority

The system automatically detects and uses AI providers in this order:

1. **Groq API** (if valid key starting with `gsk_`)
2. **Gemini API** (if valid key starting with `AIza`)
3. **OpenAI API** (if valid key starting with `sk-`)
4. **Smart Mock Responses** (fallback with context-aware replies)

### Server Configuration

The server runs on `http://localhost:5000` by default. Update the port in `.env` if needed.

### Client Configuration

The client runs on `http://localhost:3000` and proxies API requests to the server. Update `package.json` proxy if server port changes:

```json
"proxy": "http://localhost:5000"
```

## 🚀 Usage

### Starting the Application

#### Terminal 1: Start the Server

```bash
cd server
npm start
```

You should see:
```
✅ THK Protocol Server running on port 5000
📡 Socket.IO ready for connections
🎯 Available Agents: food, travel, realestate
🤖 AI Provider: groq
```

#### Terminal 2: Start the Client

```bash
cd client
npm start
```

The browser will automatically open at `http://localhost:3000`.

### Using the Simulator

#### 1. Register a Client

- Enter your name in the **Client Registration** input
- Click **Register Client**
- Connection handshake will automatically execute with all agents

#### 2. Send Messages

- Select a client from the **Active Clients** list
- Type your message in the chat input
- Press **Enter** or click **Send**
- The system will:
  - Route your message to the appropriate agent based on keywords
  - Perform the connection handshake (if needed)
  - Send data packets (animated)
  - Receive and display the AI agent's response

#### 3. Add Manual Clients (Admin)

- Click **Show Admin** to open the admin panel
- Enter a client name and click **Add Client**
- Manual clients can be managed independently

#### 4. Disconnect/Reconnect Clients

- Click the 🔌 button to disconnect a client (initiates FIN protocol)
- Click the 🔗 button to reconnect an offline client (initiates SYN protocol)
- Watch the animated packet flow during connection state changes

#### 5. View Network Topology

- The canvas displays all clients, router, and agents
- Packets animate in real-time showing their path
- Click on client nodes to select them for chatting

#### 6. Monitor Logs

- The **Protocol Logs** panel shows all protocol events
- Logs include timestamps and event descriptions
- Automatically scrolls to show latest events

## 📚 API Documentation

### REST API Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status and configuration.

**Response:**
```json
{
  "status": "OK",
  "protocol": "THK",
  "version": "1.0",
  "agents": ["food", "travel", "realestate"],
  "aiProvider": "groq"
}
```

#### Get All Clients
```http
GET /api/clients
```
Returns list of all connected clients.

**Response:**
```json
{
  "clients": [
    {
      "id": "socket_id",
      "name": "John",
      "type": "connected",
      "status": "connected",
      "registeredAt": 1699999999999,
      "lastActivity": 1699999999999
    }
  ],
  "total": 1
}
```

#### Add Manual Client
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Manual Client"
}
```

**Response:**
```json
{
  "clientId": "manual_1699999999999",
  "client": { ... }
}
```

#### Remove Client
```http
DELETE /api/clients/:clientId
```

**Response:**
```json
{
  "success": true
}
```

#### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "totalClients": 5,
  "activeConnections": 15,
  "congestionWindow": 1,
  "recentPackets": 20,
  "aiProvider": "groq"
}
```

### Socket.IO Events

#### Client → Server Events

- **register_client**: Register a new client
  ```javascript
  socket.emit('register_client', { name: 'John' });
  ```

- **send_message**: Send a message to an agent
  ```javascript
  socket.emit('send_message', { 
    clientId: 'socket_id', 
    message: 'Tell me about Italian food' 
  });
  ```

- **disconnect_client**: Gracefully disconnect a client
  ```javascript
  socket.emit('disconnect_client', { clientId: 'socket_id' });
  ```

- **reconnect_client**: Reconnect a disconnected client
  ```javascript
  socket.emit('reconnect_client', { clientId: 'socket_id' });
  ```

#### Server → Client Events

- **initial_state**: Send complete system state
- **client_registered**: Confirm client registration
- **client_connected**: Broadcast new client connection
- **client_disconnected**: Broadcast client disconnection
- **client_disconnected_manual**: Manual disconnection notification
- **client_reconnected**: Client reconnection notification
- **packet_animation**: Animate packet transmission
- **agent_response**: Send AI agent response
- **error**: Error notification

## 💻 Technologies Used

### Backend

- **Node.js**: Runtime environment
- **Express.js**: Web server framework
- **Socket.IO**: Real-time bidirectional communication
- **Axios**: HTTP client for AI API requests
- **dotenv**: Environment variable management
- **CORS**: Cross-origin resource sharing

### Frontend

- **React.js**: UI library
- **React Konva**: Canvas-based visualization
- **Socket.IO Client**: WebSocket communication
- **CSS3**: Styling and animations
- **LocalStorage API**: Persistent chat history

### AI Integration

- **Groq API**: Fast LLM inference (Llama 3.1)
- **OpenAI API**: GPT-3.5 Turbo
- **Google Gemini API**: Gemini Pro

## 📁 Project Structure

```
THK_PROTOCOL/
├── client/                      # React frontend
│   ├── public/
│   │   └── index.html          # HTML template
│   ├── src/
│   │   ├── App.js              # Main React component
│   │   ├── App.css             # Application styles
│   │   └── index.js            # React entry point
│   └── package.json            # Frontend dependencies
│
├── server/                      # Node.js backend
│   ├── history_logs/           # Generated log files
│   │   ├── protocol_logs_*.txt # Server protocol logs
│   │   └── client_*_*.txt      # Individual client histories
│   ├── server.js               # Main server file
│   ├── .env                    # Environment variables
│   └── package.json            # Backend dependencies
│
├── package.json                # Root package configuration
└── README.md                   # This file
```

## 📂 Log Files

### Protocol Logs
Located in `server/history_logs/protocol_logs_[timestamp].txt`

Contains:
- Server startup information
- Client connections and disconnections
- Protocol events
- System-level logs

### Client History Files
Located in `server/history_logs/client_[clientId]_[timestamp].txt`

Contains:
- Client registration details
- Complete message history
- Agent responses
- Timestamps for all interactions

## 🎨 Screenshots

### Network Topology View
Real-time visualization of clients, router, and agents with animated packet transmission.

### Chat Interface
Multi-client chat with AI agent responses and persistent history.

### Admin Dashboard
Client management, statistics, and manual client creation.

### Protocol Logs
Real-time event logging with timestamps and detailed information.

## 🔧 Development

### Running in Development Mode

#### Server (with auto-reload)
```bash
cd server
npm run dev
```

#### Client (with hot reload)
```bash
cd client
npm start
```

### Building for Production

```bash
cd client
npm run build
```

## 🐛 Troubleshooting

### Issue: react-scripts not found

**Solution:**
```bash
cd client
npm install react-scripts@5.0.1
```

### Issue: Port already in use

**Solution:**
Change the port in `server/.env`:
```env
PORT=5001
```

Update client proxy in `client/package.json`:
```json
"proxy": "http://localhost:5001"
```

### Issue: AI responses timeout

**Solution:**
- Check your API key validity
- Verify internet connection
- System will fallback to smart mock responses

### Issue: Socket.IO connection failed

**Solution:**
- Ensure server is running
- Check CORS configuration
- Verify firewall settings

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.



## 🙏 Acknowledgments

- Inspired by TCP/IP protocol specifications
- Built for Computer Networks course project
- Thanks to all AI providers for API access

## 📞 Contact

For questions or support, please open an issue on GitHub or contact the repository owner.

---

**Made with ❤️ for Computer Networks**
