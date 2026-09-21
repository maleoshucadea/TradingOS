# TradingOS — MetaTrader 5 Local Bridge Agent

This directory contains the lightweight local bridge agent that connects **TradingOS** to a running **MetaTrader 5 (MT5)** desktop terminal.

---

## Why a Local Bridge is Required

MetaTrader 5 is a desktop Windows application. Browser-based web applications, mobile PWAs, and cloud-hosted servers cannot directly access local Windows desktop APIs, named pipes, or running processes.

The **TradingOS MT5 Bridge** acts as the secure local communication link:

```
TradingOS (iPhone / Mobile PWA / Web Browser)
      ↓ (HTTP / WebSocket)
TradingOS Backend API
      ↓ (REST HTTP on configured MT5_BRIDGE_URL)
Local MT5 Bridge Agent (bridge.py on localhost:8001)
      ↓ (Python MetaTrader5 IPC)
MetaTrader 5 Desktop Terminal (MT5.exe)
      ↓
Broker Trade Server
```

---

## Safety & Security Boundaries

1. **Strictly Read-Only in this Milestone**:
   - Order placement, position modification, and live execution endpoints are **disabled and absent**.
   - Trading cannot be initiated through this bridge.
2. **No Password Storage**:
   - TradingOS never asks for or stores broker passwords. You log into your broker directly inside the official MetaTrader 5 terminal.
3. **Optional Security Token**:
   - You can secure the bridge with `--token my_secret_token` or `MT5_BRIDGE_TOKEN=...`.

---

## Quick Start Guide (Windows / MetaTrader 5 Host)

### Prerequisites:
- Windows 10/11 (or Windows Server) with 64-bit Python 3.8+
- MetaTrader 5 desktop terminal installed and logged into your broker account

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Enable Terminal Settings in MT5
Open MetaTrader 5:
- Go to **Tools → Options → Expert Advisors**
- Check **"Allow algorithmic trading"**
- Check **"Allow DLL imports"**
- Click **OK**

### 3. Launch the Bridge
```bash
python bridge.py --port 8001
```

Or double-click `run-bridge.bat`.

### 4. Connect from TradingOS
- In TradingOS, go to **Connectivity → MetaTrader 5**.
- Default bridge URL: `http://127.0.0.1:8001`
- Click **"Test Connection & Run Diagnostics"** to verify the end-to-end link!

---

## Testing / Development Mode (Without MT5 Terminal)

If you are developing or reviewing TradingOS on macOS, Linux, or in a headless environment without an MT5 terminal, you can run the bridge in verified mock test mode:

```bash
python bridge.py --mock --port 8001
```

This simulates the full diagnostic pipeline, account inspection, and market quote feed.
