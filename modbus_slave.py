#!/usr/bin/env python3
"""
ComGate Modbus TCP Slave (Server)
---------------------------------
This script runs a Modbus TCP server that can be polled by the ComGate master.
It simulates realistic sensor data with sine wave patterns.

Usage: python modbus_slave.py [port]
Default port: 5020
"""

import sys
import asyncio
import math
import logging
from datetime import datetime

# Configure logging
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


class SimulatedDataUpdater:
    """Updates Modbus registers with simulated sensor data"""
    
    def __init__(self, context):
        self.context = context
        self.start_time = datetime.now()
        self.running = True
    
    def generate_sensor_value(self, sensor_id: int, pattern: str = "sine") -> int:
        """Generate a realistic sensor value"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        
        # Different sensors have different characteristics
        configs = [
            {"name": "Temperature", "offset": 250, "amplitude": 50, "period": 60},      # 20-30°C scaled
            {"name": "Pressure", "offset": 1000, "amplitude": 200, "period": 45},       # 8-12 bar scaled
            {"name": "Flow Rate", "offset": 500, "amplitude": 150, "period": 30},       # Flow sensor
            {"name": "Level", "offset": 750, "amplitude": 250, "period": 120},          # Tank level
            {"name": "Speed", "offset": 1500, "amplitude": 300, "period": 20},          # Motor RPM
            {"name": "Voltage", "offset": 2400, "amplitude": 100, "period": 50},        # 230-250V scaled
            {"name": "Current", "offset": 100, "amplitude": 30, "period": 15},          # Amps
            {"name": "Power", "offset": 5000, "amplitude": 1000, "period": 40},         # Watts
            {"name": "Frequency", "offset": 500, "amplitude": 10, "period": 300},       # Hz (stable)
            {"name": "Humidity", "offset": 600, "amplitude": 100, "period": 90},        # %RH scaled
        ]
        
        config = configs[sensor_id % len(configs)]
        phase_offset = sensor_id * (math.pi / 5)  # Different phase per sensor
        
        angle = (2 * math.pi * elapsed / config["period"]) + phase_offset
        value = config["offset"] + config["amplitude"] * math.sin(angle)
        
        # Add small random noise
        import random
        noise = random.uniform(-5, 5)
        value += noise
        
        return max(0, min(65535, int(value)))
    
    async def update_loop(self):
        """Continuously update register values"""
        update_count = 0
        
        while self.running:
            try:
                slave_context = self.context[1]  # Unit ID 1
                
                # Update holding registers (function code 3) - addresses 0-99
                for i in range(100):
                    value = self.generate_sensor_value(i)
                    slave_context.setValues(3, i, [value])  # 3 = holding registers
                
                # Update input registers (function code 4) - addresses 0-99
                for i in range(100):
                    value = self.generate_sensor_value(i + 100)
                    slave_context.setValues(4, i, [value])  # 4 = input registers
                
                # Update coils (function code 1) based on thresholds
                for i in range(50):
                    hr_value = slave_context.getValues(3, i, 1)[0]
                    # Coil is ON if holding register > 500
                    coil_value = hr_value > 500
                    slave_context.setValues(1, i, [coil_value])  # 1 = coils
                
                # Update discrete inputs (function code 2)
                for i in range(50):
                    ir_value = slave_context.getValues(4, i, 1)[0]
                    di_value = ir_value > 600
                    slave_context.setValues(2, i, [di_value])  # 2 = discrete inputs
                
                update_count += 1
                if update_count % 10 == 0:
                    # Sample values for display
                    hr0 = slave_context.getValues(3, 0, 1)[0]
                    hr1 = slave_context.getValues(3, 1, 1)[0]
                    hr2 = slave_context.getValues(3, 2, 1)[0]
                    logger.info(f"Data update #{update_count} | HR[0]={hr0} HR[1]={hr1} HR[2]={hr2}")
                
                await asyncio.sleep(1)  # Update every second
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Update error: {e}")
                await asyncio.sleep(1)
    
    def stop(self):
        self.running = False


async def run_server(port: int):
    """Run the Modbus TCP server"""
    
    # Create data blocks
    # ModbusSequentialDataBlock(start_address, values)
    coils = ModbusSequentialDataBlock(0, [False] * 1000)
    discrete_inputs = ModbusSequentialDataBlock(0, [False] * 1000)
    holding_registers = ModbusSequentialDataBlock(0, [0] * 1000)
    input_registers = ModbusSequentialDataBlock(0, [0] * 1000)
    
    # Create slave context
    slave_context = ModbusSlaveContext(
        di=discrete_inputs,  # Discrete Inputs (read-only bits)
        co=coils,            # Coils (read-write bits)
        hr=holding_registers, # Holding Registers (read-write 16-bit)
        ir=input_registers,   # Input Registers (read-only 16-bit)
    )
    
    # Create server context with unit ID 1
    context = ModbusServerContext(slaves={1: slave_context}, single=False)
    
    # Start data updater
    updater = SimulatedDataUpdater(context)
    update_task = asyncio.create_task(updater.update_loop())
    
    logger.info("=" * 50)
    logger.info("  MODBUS TCP SLAVE STARTED")
    logger.info("=" * 50)
    logger.info(f"  Listening on port: {port}")
    logger.info(f"  Unit ID: 1")
    logger.info("")
    logger.info("  Available registers:")
    logger.info("    - Coils (FC01/05/15): 0-999")
    logger.info("    - Discrete Inputs (FC02): 0-999")
    logger.info("    - Holding Registers (FC03/06/16): 0-999")
    logger.info("    - Input Registers (FC04): 0-999")
    logger.info("")
    logger.info("  Simulating sensor data with sine wave patterns")
    logger.info("  Press Ctrl+C to stop")
    logger.info("=" * 50)
    
    try:
        # Start server
        await StartAsyncTcpServer(
            context=context,
            address=("0.0.0.0", port)
        )
    except asyncio.CancelledError:
        pass
    finally:
        updater.stop()
        update_task.cancel()
        try:
            await update_task
        except asyncio.CancelledError:
            pass
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
