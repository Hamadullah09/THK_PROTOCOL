import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';
import io from 'socket.io-client';
import './App.css';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [clients, setClients] = useState([]);
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [packets, setPackets] = useState([]);
  const [currentClient, setCurrentClient] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [clientName, setClientName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [manualClientName, setManualClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [stats, setStats] = useState({});
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const stageRef = useRef();
  const messagesEndRef = useRef();

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('thk_chat_history');
    console.log('📂 Loading chat history from storage:', savedMessages);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        console.log('📥 Parsed messages:', parsedMessages.length);
        
        const messagesWithDates = parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setMessages(messagesWithDates);
        addLog(`💾 Loaded ${messagesWithDates.length} messages from storage`);
      } catch (error) {
        console.error('❌ Error loading chat history:', error);
        addLog('❌ Error loading chat history');
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('thk_chat_history', JSON.stringify(messages));
        console.log('💾 Saved messages to storage:', messages.length);
      } catch (error) {
        console.error('❌ Error saving chat history:', error);
        addLog('❌ Error saving chat history');
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedClient]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Add log function
  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message }, ...prev.slice(0, 50)]);
  }, []);

  // Packet animation
  const animatePacket = useCallback((packetData) => {
    const newPacket = {
      id: packetData.id || Date.now(),
      ...packetData,
      progress: 0
    };
    setPackets(prev => [...prev, newPacket]);
    addLog(`📦 ${packetData.type} packet from ${packetData.from} to ${packetData.to}`);

    const interval = setInterval(() => {
      setPackets(prev =>
        prev.map(p =>
          p.id === newPacket.id
            ? { ...p, progress: Math.min(p.progress + 0.02, 1) }
            : p
        )
      );
    }, 50);

    setTimeout(() => {
      clearInterval(interval);
      setPackets(prev => prev.filter(p => p.id !== newPacket.id));
    }, 2000);
  }, [addLog]);

  // Socket connection useEffect
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      addLog('✅ Connected to THK Protocol Server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      addLog('⚠️ Disconnected from server');
    });

    newSocket.on('initial_state', (data) => {
      setClients(data.clients || []);
      setAgents(data.agents || []);
      setStats(data.stats || {});
    });

    newSocket.on('client_connected', (data) => {
      addLog(`👤 Client ${data.name} connected`);
    });

    newSocket.on('client_disconnected', (data) => {
      addLog(`🔌 Client ${data.name} disconnected`);
    });

    // Manual disconnection event
    newSocket.on('client_disconnected_manual', (data) => {
      addLog(`🔌 ${data.name} manually disconnected using THK Protocol`);
      setClients(prev => prev.map(client => 
        client.id === data.clientId 
          ? { ...client, status: 'disconnected' }
          : client
      ));
    });

    // NEW: Reconnection event
    newSocket.on('client_reconnected', (data) => {
      addLog(`🔗 ${data.name} reconnected using THK Protocol`);
      setClients(prev => prev.map(client => 
        client.id === data.clientId 
          ? { ...client, status: 'connected' }
          : client
      ));
    });

    newSocket.on('client_added', (client) => {
      addLog(`➕ Manual client ${client.name} added`);
    });

    newSocket.on('client_removed', (data) => {
      addLog(`➖ Client ${data.clientId} removed`);
    });

    newSocket.on('packet_animation', (data) => {
      animatePacket(data);
    });

    newSocket.on('agent_response', (data) => {
      const newMessage = {
        type: 'agent',
        clientId: data.clientId,
        agent: data.agent,
        message: data.message,
        timestamp: new Date(data.timestamp)
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, newMessage];
        localStorage.setItem('thk_chat_history', JSON.stringify(updatedMessages));
        return updatedMessages;
      });
      
      addLog(`💬 ${data.agent} agent responded`);
    });

    newSocket.on('client_registered', (data) => {
      setCurrentClient(data.name);
      setSelectedClient(data.clientId);
      addLog(`📝 Registered as ${data.name}`);
    });

    newSocket.on('error', (error) => {
      addLog(`❌ Error: ${error.message}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [addLog, animatePacket]);

  const registerClient = () => {
    if (clientName && socket) {
      socket.emit('register_client', { name: clientName });
    }
  };

  const addManualClient = async () => {
    if (!manualClientName.trim()) return;
    try {
      const response = await fetch('http://localhost:5000/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: manualClientName.trim() })
      });
      if (response.ok) {
        setManualClientName('');
        addLog(`✅ Added manual client: ${manualClientName}`);
      }
    } catch (error) {
      addLog(`❌ Error adding client: ${error.message}`);
    }
  };

  const removeClient = async (clientId) => {
    try {
      await fetch(`http://localhost:5000/api/clients/${clientId}`, {
        method: 'DELETE'
      });
      addLog(`➖ Removed client ${clientId}`);
    } catch (error) {
      addLog(`❌ Error removing client: ${error.message}`);
    }
  };

  // Disconnect client using THK Protocol
  const disconnectClient = (clientId) => {
    if (socket && clientId) {
      socket.emit('disconnect_client', { clientId });
      addLog(`🔌 Initiating THK disconnection protocol for client`);
    }
  };

  // NEW: Reconnect client using THK Protocol
  const reconnectClient = (clientId) => {
    if (socket && clientId) {
      socket.emit('reconnect_client', { clientId });
      addLog(`🔗 Initiating THK reconnection protocol for client`);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !selectedClient || !socket) return;
    
    const client = clients.find(c => c.id === selectedClient);
    
    // NEW: Check if client is connected
    if (client && client.status !== 'connected') {
      addLog('❌ Client is offline. Please connect first.');
      return;
    }
    
    const messageData = {
      clientId: selectedClient,
      message: inputMessage.trim()
    };
    
    socket.emit('send_message', messageData);
    
    const newMessage = {
      type: 'client',
      clientId: selectedClient,
      client: client?.name || 'Unknown',
      message: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      localStorage.setItem('thk_chat_history', JSON.stringify(updatedMessages));
      return updatedMessages;
    });
    
    setInputMessage('');
    addLog(`📤 Sent: "${inputMessage.trim().substring(0, 30)}..."`);
  };

  const loadStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats');
      const data = await response.json();
      setStats(data);
      addLog('📊 Stats updated');
    } catch (error) {
      addLog(`❌ Error loading stats: ${error.message}`);
    }
  };

  // Visualization functions
  const getNodePosition = (nodeId) => {
    const positions = {
      router: { x: 400, y: 300 },
      food: { x: 650, y: 150 },
      travel: { x: 650, y: 300 },
      realestate: { x: 650, y: 450 }
    };
    if (positions[nodeId]) return positions[nodeId];
    
    const clientIndex = clients.findIndex(c => c.id === nodeId);
    return { x: 150, y: 100 + (clientIndex * 80) };
  };

  const getPacketColor = (packetType) => {
    const colors = {
      SYN: '#ff6b6b',
      'SYN-ACK': '#4ecdc4',
      ACK: '#45b7d1',
      DATA_SEND: '#96ceb4',
      DATA_RECEIVE: '#feca57',
      FIN: '#ff4757',
      'FIN-ACK': '#ffa502'
    };
    return colors[packetType] || '#ffffff';
  };

  const getClientColor = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.status === 'disconnected') {
      return '#666666';
    }
    
    const colors = ['#4ecdc4', '#ff6b6b', '#45b7d1', '#feca57', '#a8e6cf', '#ffd3b6'];
    const index = clients.findIndex(c => c.id === clientId) % colors.length;
    return colors[index];
  };

  const filteredMessages = messages.filter(msg => 
    selectedClient ? msg.clientId === selectedClient : true
  );

  return (
    <div className="app">
      <div className="header">
        <h1>🚀 THK Protocol Simulator</h1>
        <div className="header-controls">
          <div className="connection-status">
            Status: <span className={isConnected ? 'connected' : 'disconnected'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button className="admin-toggle" onClick={() => setShowAdminPanel(!showAdminPanel)}>
            {showAdminPanel ? 'Hide Admin' : 'Show Admin'}
          </button>
        </div>
      </div>

      <div className="main-container">
        {/* Network Visualization */}
        <div className="visualization-panel">
          <h3>Network Topology</h3>
          <Stage width={800} height={600} ref={stageRef}>
            <Layer>
              {/* Connections */}
              {clients.map(client => (
                <Line key={`conn-client-${client.id}`}
                  points={[
                    getNodePosition(client.id).x,
                    getNodePosition(client.id).y,
                    getNodePosition('router').x,
                    getNodePosition('router').y
                  ]}
                  stroke={client.status === 'disconnected' ? '#666' : '#444'}
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              ))}
              
              {agents.map(agent => (
                <Line key={`conn-agent-${agent}`}
                  points={[
                    getNodePosition('router').x,
                    getNodePosition('router').y,
                    getNodePosition(agent).x,
                    getNodePosition(agent).y
                  ]}
                  stroke="#444"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              ))}

              {/* Nodes */}
              {clients.map(client => (
                <Circle key={client.id}
                  x={getNodePosition(client.id).x}
                  y={getNodePosition(client.id).y}
                  radius={20}
                  fill={getClientColor(client.id)}
                  stroke={selectedClient === client.id ? '#fff' : '#666'}
                  strokeWidth={selectedClient === client.id ? 3 : 1}
                  onClick={() => setSelectedClient(client.id)}
                />
              ))}

              <Rect x={getNodePosition('router').x - 30}
                y={getNodePosition('router').y - 30}
                width={60}
                height={60}
                fill="#45b7d1"
                stroke="#fff"
                strokeWidth={2}
                cornerRadius={10}
              />

              {agents.map(agent => (
                <Rect key={agent}
                  x={getNodePosition(agent).x - 25}
                  y={getNodePosition(agent).y - 25}
                  width={50}
                  height={50}
                  fill="#ff6b6b"
                  stroke="#fff"
                  strokeWidth={2}
                  cornerRadius={8}
                />
              ))}

              {/* Labels */}
              {clients.map(client => (
                <Text key={`label-${client.id}`}
                  x={getNodePosition(client.id).x - 30}
                  y={getNodePosition(client.id).y + 30}
                  text={client.name + (client.status === 'disconnected' ? ' (Offline)' : '')}
                  fontSize={12}
                  fill="#fff"
                />
              ))}

              <Text x={getNodePosition('router').x - 20}
                y={getNodePosition('router').y + 45}
                text="ROUTER"
                fontSize={14}
                fill="#fff"
                fontStyle="bold"
              />

              {agents.map(agent => (
                <Text key={`label-${agent}`}
                  x={getNodePosition(agent).x - 25}
                  y={getNodePosition(agent).y + 40}
                  text={agent.toUpperCase()}
                  fontSize={12}
                  fill="#fff"
                  fontStyle="bold"
                />
              ))}

              {/* Animated Packets */}
              {packets.map(packet => {
                const fromPos = getNodePosition(packet.from);
                const toPos = getNodePosition(packet.to);
                const currentX = fromPos.x + (toPos.x - fromPos.x) * packet.progress;
                const currentY = fromPos.y + (toPos.y - fromPos.y) * packet.progress;
                
                return (
                  <Circle key={packet.id}
                    x={currentX}
                    y={currentY}
                    radius={6}
                    fill={getPacketColor(packet.type)}
                    stroke="#fff"
                    strokeWidth={1}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          {showAdminPanel && (
            <div className="admin-panel">
              <h3>Admin Controls</h3>
              <div className="manual-client-section">
                <h4>Add Manual Clients</h4>
                <div className="manual-client-input">
                  <input type="text" placeholder="Enter client name"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                  />
                  <button onClick={addManualClient}>Add Client</button>
                </div>
              </div>
              <div className="stats-section">
                <h4>Statistics</h4>
                <div className="stats">
                  <div>Total Clients: {stats.totalClients || 0}</div>
                  <div>Active Connections: {stats.activeConnections || 0}</div>
                  <div>Congestion Window: {stats.congestionWindow || 1}</div>
                </div>
                <button onClick={loadStats}>Refresh Stats</button>
              </div>
            </div>
          )}

          <div className="client-management">
            <h3>Client Management</h3>
            <div className="client-registration">
              <input type="text" placeholder="Enter your name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={currentClient}
              />
              <button onClick={registerClient}
                disabled={!clientName || currentClient}
              >
                Register Client
              </button>
            </div>
            <div className="client-list">
              <h4>Active Clients ({clients.length})</h4>
              <div className="client-buttons">
                {clients.map(client => (
                  <div key={client.id} className="client-item">
                    <button 
                      className={selectedClient === client.id ? 'selected' : ''}
                      onClick={() => setSelectedClient(client.id)}
                      style={{
                        opacity: client.status === 'disconnected' ? 0.6 : 1
                      }}
                    >
                      {client.name} ({client.type}) {client.status === 'disconnected' ? '🔌' : '✅'}
                    </button>
                    {client.type === 'manual' && (
                      <button className="remove-client"
                        onClick={() => removeClient(client.id)}
                      >
                        ×
                      </button>
                    )}
                    {/* Disconnect and Reconnect buttons */}
                    {client.status !== 'disconnected' ? (
                      <button 
                        className="disconnect-client"
                        onClick={() => disconnectClient(client.id)}
                        title="Disconnect using THK Protocol"
                      >
                        🔌
                      </button>
                    ) : (
                      <button 
                        className="reconnect-client"
                        onClick={() => reconnectClient(client.id)}
                        title="Reconnect using THK Protocol"
                      >
                        🔗
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat interface */}
          <div className="chat-interface">
            <h3>
              Chat with Agents {selectedClient && ` - ${clients.find(c => c.id === selectedClient)?.name || 'Unknown'}`}
              {selectedClient && clients.find(c => c.id === selectedClient)?.status === 'disconnected' && ' (Offline)'}
            </h3>
            <div className="messages-container">
              {filteredMessages.map((msg, index) => (
                <div key={index} className={`message ${msg.type}`}>
                  <div className="message-header">
                    <strong>
                      {msg.type === 'client' ? 'You' : `${msg.agent} Agent`}:
                    </strong>
                    <span className="timestamp">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="message-input">
              <input type="text" placeholder={
                selectedClient && clients.find(c => c.id === selectedClient)?.status === 'disconnected' 
                  ? "Client is offline. Please connect first." 
                  : "Type your message..."
              }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={!selectedClient || (selectedClient && clients.find(c => c.id === selectedClient)?.status === 'disconnected')}
              />
              <button onClick={sendMessage}
                disabled={!inputMessage || !selectedClient || (selectedClient && clients.find(c => c.id === selectedClient)?.status === 'disconnected')}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="logs-panel">
          <h3>Protocol Logs</h3>
          <div className="logs">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="timestamp">[{log.timestamp}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;