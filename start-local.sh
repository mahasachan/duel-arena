#!/bin/bash

# Enhanced Duel Arena - Local Network Deployment

echo "🎮 Starting Enhanced Duel Arena Server..."

# Get local IP address
LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}')

echo "🌐 Server will be available at:"
echo "   Local:   http://localhost:3001"
echo "   Network: http://$LOCAL_IP:3001"
echo ""
echo "📱 Share the Network URL with friends on the same WiFi/LAN!"
echo "⚔️ Players can join from phones, tablets, other computers"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

# Start the server
PORT=3001 npm start
