#!/bin/bash

# Digital Content Ownership DApp - Service Starter
# This script helps you start all required services

echo "🚀 Digital Content Ownership DApp - Service Manager"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update CONTRACT_ADDR after deployment."
    echo ""
fi

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
    return $?
}

# Function to start a service in a new terminal
start_service() {
    local name=$1
    local command=$2
    local port=$3
    
    if check_port $port; then
        echo "⚠️  Port $port is already in use. $name may already be running."
    else
        echo "Starting $name on port $port..."
        osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && $command\""
    fi
}

echo "Select services to start:"
echo ""
echo "1. Start ALL services (Hardhat + IPFS + Frontend)"
echo "2. Start Hardhat Node only"
echo "3. Start IPFS Daemon only"
echo "4. Start Frontend only"
echo "5. Deploy Smart Contract"
echo "6. Start Authority Server"
echo "7. Start Event Indexer"
echo "8. Stop all services"
echo "0. Exit"
echo ""
read -p "Enter your choice (0-8): " choice

case $choice in
    1)
        echo ""
        echo "🔥 Starting all services..."
        start_service "Hardhat Node" "cd backend && npx hardhat node" 8545
        sleep 2
        start_service "IPFS Daemon" "ipfs daemon" 5001
        sleep 2
        start_service "Frontend" "cd frontend && npm run dev" 5173
        echo ""
        echo "✅ All services started!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Wait for Hardhat node to start (shows 20 accounts)"
        echo "2. Deploy contract: ./start-services.sh and select option 5"
        echo "3. Update CONTRACT_ADDR in .env and frontend/src/config.js"
        echo "4. Open http://localhost:5173 in your browser"
        ;;
    2)
        start_service "Hardhat Node" "cd backend && npx hardhat node" 8545
        echo "✅ Hardhat node starting..."
        ;;
    3)
        start_service "IPFS Daemon" "ipfs daemon" 5001
        echo "✅ IPFS daemon starting..."
        echo "📝 Check IPFS at: http://127.0.0.1:5001/webui"
        ;;
    4)
        start_service "Frontend" "cd frontend && npm run dev" 5173
        echo "✅ Frontend starting..."
        echo "📝 Open: http://localhost:5173"
        ;;
    5)
        echo ""
        echo "📦 Deploying Smart Contract..."
        echo ""
        cd backend
        npx hardhat run scripts/deploy.js --network localhost
        echo ""
        echo "✅ Deployment complete!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Copy the deployed contract address from above"
        echo "2. Update CONTRACT_ADDR in .env file"
        echo "3. Update address in frontend/src/config.js"
        ;;
    6)
        start_service "Authority Server" "node authority-server.js" 3001
        echo "✅ Authority server starting on port 3001..."
        ;;
    7)
        start_service "Event Indexer" "node indexer.js" 0
        echo "✅ Event indexer starting..."
        ;;
    8)
        echo ""
        echo "🛑 Stopping all services..."
        echo ""
        
        # Kill processes on specific ports
        for port in 8545 5001 5173 3001; do
            if check_port $port; then
                echo "Stopping service on port $port..."
                lsof -ti:$port | xargs kill -9 2>/dev/null
            fi
        done
        
        # Kill IPFS daemon
        pkill -f "ipfs daemon" 2>/dev/null
        
        # Kill node processes related to the project
        pkill -f "hardhat node" 2>/dev/null
        pkill -f "authority-server" 2>/dev/null
        pkill -f "indexer.js" 2>/dev/null
        
        echo "✅ All services stopped!"
        ;;
    0)
        echo "Goodbye! 👋"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "For detailed instructions, see SETUP.md"
echo "=================================================="
