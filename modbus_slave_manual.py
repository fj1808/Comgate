#!/usr/bin/env python3
"""
ComGate Modbus TCP Slave - Manual Mode
--------------------------------------
This script runs a Modbus TCP server with an interactive console
to manually set register values.

Usage: python modbus_slave_manual.py [port]
Default port: 5020
"""

import sys
import asyncio
import threading
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from pymodbus.datastore import (
        ModbusSequentialDataBlock,
        ModbusSlaveContext,
        ModbusServerContext,
    )
    from pymodbus.server import StartAsyncTcpServer
except ImportError:
    print("ERROR: pymodbus not installed. Run: pip install pymodbus>=3.0.0")
    sys.exit(1)


class ManualDataController:
    """Allows manual control of Modbus register values"""
    
    def __init__(self, context):
        self.context = context
        self.running = True
    
    def show_help(self):
        print("\n" + "=" * 50)
        print("  COMMANDS:")
        print("=" * 50)
        print("  hr <addr> <value>  - Set holding register")
        print("  ir <addr> <value>  - Set input register")
        print("  co <addr> <0|1>    - Set coil")
        print("  di <addr> <0|1>    - Set discrete input")
        print("  read <type> <addr> [count] - Read values")
        print("  show               - Show first 10 of each type")
        print("  help               - Show this help")
        print("  quit               - Stop server")
        print("=" * 50)
        print("  Examples:")
        print("    hr 0 1234        - Set HR[0] = 1234")
        print("    co 5 1           - Set Coil[5] = ON")
        print("    read hr 0 10     - Read HR[0] to HR[9]")
        print("=" * 50 + "\n")
    
    def show_registers(self):
        slave = self.context[1]
        print("\n" + "-" * 50)
        print("Current Register Values:")
        print("-" * 50)
        
        hr = slave.getValues(3, 0, 10)
        print(f"Holding Registers [0-9]: {hr}")
        
        ir = slave.getValues(4, 0, 10)
        print(f"Input Registers [0-9]:   {ir}")
        
        co = slave.getValues(1, 0, 10)
        print(f"Coils [0-9]:             {[1 if c else 0 for c in co]}")
        
        di = slave.getValues(2, 0, 10)
        print(f"Discrete Inputs [0-9]:   {[1 if d else 0 for d in di]}")
        print("-" * 50 + "\n")
    
    def process_command(self, cmd: str):
        parts = cmd.strip().lower().split()
        if not parts:
            return True
        
        slave = self.context[1]
        
        try:
            if parts[0] == "quit" or parts[0] == "exit":
                return False
            
            elif parts[0] == "help":
                self.show_help()
            
            elif parts[0] == "show":
                self.show_registers()
            
            elif parts[0] == "hr" and len(parts) >= 3:
                addr = int(parts[1])
                value = int(parts[2])
                slave.setValues(3, addr, [value])
                print(f"  -> Holding Register[{addr}] = {value}")
            
            elif parts[0] == "ir" and len(parts) >= 3:
                addr = int(parts[1])
                value = int(parts[2])
                slave.setValues(4, addr, [value])
                print(f"  -> Input Register[{addr}] = {value}")
            
            elif parts[0] == "co" and len(parts) >= 3:
                addr = int(parts[1])
                value = bool(int(parts[2]))
                slave.setValues(1, addr, [value])
                print(f"  -> Coil[{addr}] = {'ON' if value else 'OFF'}")
            
            elif parts[0] == "di" and len(parts) >= 3:
                addr = int(parts[1])
                value = bool(int(parts[2]))
                slave.setValues(2, addr, [value])
                print(f"  -> Discrete Input[{addr}] = {'ON' if value else 'OFF'}")
            
            elif parts[0] == "read" and len(parts) >= 3:
                reg_type = parts[1]
                addr = int(parts[2])
                count = int(parts[3]) if len(parts) > 3 else 1
                
                fc_map = {"hr": 3, "ir": 4, "co": 1, "di": 2}
                if reg_type in fc_map:
                    values = slave.getValues(fc_map[reg_type], addr, count)
                    print(f"  -> {reg_type.upper()}[{addr}:{addr+count}] = {values}")
                else:
                    print("  Invalid register type. Use: hr, ir, co, di")
            
            else:
                print("  Unknown command. Type 'help' for commands.")
        
        except Exception as e:
            print(f"  Error: {e}")
        
        return True
    
    def command_loop(self):
        """Interactive command loop"""
        self.show_help()
        self.show_registers()
        
        while self.running:
            try:
                cmd = input("ComGate> ")
                if not self.process_command(cmd):
                    self.running = False
                    break
            except EOFError:
                break
            except KeyboardInterrupt:
                print("\nUse 'quit' to exit")


async def run_server(port: int):
    """Run the Modbus TCP server with manual control"""
    
    # Create data blocks with initial values
    coils = ModbusSequentialDataBlock(0, [False] * 1000)
    discrete_inputs = ModbusSequentialDataBlock(0, [False] * 1000)
    holding_registers = ModbusSequentialDataBlock(0, [0] * 1000)
    input_registers = ModbusSequentialDataBlock(0, [0] * 1000)
    
    # Set some initial values
    for i in range(10):
        holding_registers.setValues(i, [100 + i * 10])
        input_registers.setValues(i, [200 + i * 10])
    
    slave_context = ModbusSlaveContext(
        di=discrete_inputs,
        co=coils,
        hr=holding_registers,
        ir=input_registers,
    )
    
    context = ModbusServerContext(slaves={1: slave_context}, single=False)
    
    # Start command interface in separate thread
    controller = ManualDataController(context)
    cmd_thread = threading.Thread(target=controller.command_loop, daemon=True)
    cmd_thread.start()
    
    logger.info("=" * 50)
    logger.info("  MODBUS TCP SLAVE (MANUAL MODE) STARTED")
    logger.info("=" * 50)
    logger.info(f"  Listening on port: {port}")
    logger.info(f"  Unit ID: 1")
    logger.info("  Type 'help' for commands")
    logger.info("=" * 50)
    
    try:
        await StartAsyncTcpServer(
            context=context,
            address=("0.0.0.0", port)
        )
    except asyncio.CancelledError:
        pass
    finally:
        controller.running = False
        logger.info("Server stopped")


def main():
    port = 5020
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}, using default 5020")
    
    try:
        asyncio.run(run_server(port))
    except KeyboardInterrupt:
        print("\nShutting down...")


if __name__ == "__main__":
    main()
