#!/usr/bin/env bash
echo "Starting TradingOS MetaTrader 5 Local Bridge..."
python3 bridge.py --port 8001 "$@"
