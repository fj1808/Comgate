# ComGate Modbus Simulator PRD

## Original Problem Statement
Build a Modbus simulator that supports both real connections and simulated data, with:
- Real Modbus TCP reads/writes to devices at configured IPs
- Project tags/devices configuration
- Frontend live updates via WebSocket
- Tag creation/edit UI
- Dashboard, Tag Browser, Traffic Monitor showing real data
- Network discovery for automatic device detection

## Architecture
- **Backend**: FastAPI with pymodbus for real Modbus TCP/UDP communication
- **Frontend**: React with Tailwind CSS, shadcn/ui components
- **Database**: MongoDB for projects, devices, tags, traffic logs, historian
- **Real-time**: WebSocket broadcasting + HTTP polling fallback

## User Personas
1. **Admin** - Full access to all features, user management
2. **Engineer** - Can configure devices, tags, projects
3. **Operator** - Can view data and write to writable tags

## Core Requirements (Static)
- [x] Real Modbus TCP/UDP connections to PLCs
- [x] Simulation fallback when device unreachable
- [x] Tag creation/edit/delete UI
- [x] Device configuration with IP/Port/Unit ID
- [x] Data types: BOOL, INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64
- [x] Endianness support: ABCD, CDAB, BADC, DCBA
- [x] Scale and offset for engineering units
- [x] Traffic Monitor with real Modbus traffic
- [x] Network Discovery with protocol verification

## What's Been Implemented

### March 20, 2026
1. **Real Modbus Polling Engine**
   - RealModbusPoller class for device connections
   - Block reads grouped by object type (coils, DI, IR, HR)
   - Proper data type decoding with endianness support
   - Scale/offset application
   - Automatic simulation fallback

2. **Tag Write to Real Devices**
   - write_to_real_device() - writes to actual PLC
   - write_to_simulator() - fallback for testing
   - Traffic logging for all operations

3. **Tag Creation UI (TagBrowserPage.js)**
   - Full form: Name, Device, Object Type, Address, Bit
   - Data Type, Permission, Endianness
   - Scale, Offset, Unit, Min/Max, Poll Interval
   - Edit and Delete buttons per tag

4. **WebSocket Broadcasting**
   - broadcast_tag_update() on every value change
   - Frontend auto-refresh (3s polling + WebSocket)

5. **Network Discovery Enhancement**
   - Multi-port scanning (502, 503, 5020)
   - Modbus protocol verification
   - Unit ID auto-detection
   - One-click "Add to Project" button
   - Verified vs TCP-only differentiation

## Prioritized Backlog

### P0 (Critical)
- [x] Real Modbus polling
- [x] Tag CRUD UI
- [x] Network discovery

### P1 (Important)
- [ ] OPC UA integration
- [ ] Historian trending charts
- [ ] Alarm management

### P2 (Nice to have)
- [ ] Mobile-responsive dashboard
- [ ] Export/import project configurations
- [ ] Multi-user collaboration

## Next Tasks
1. Test with real PLC at 192.168.0.160:5020
2. Import NGL_Metering_Skid_Import.xlsx via Excel Import
3. Configure polling and verify live data
4. Add alarm thresholds to critical tags
