"""
TECHIFY - Advanced Device Detection
Uses: Nmap + SNMP + HTTP Banner + NetBIOS + MAC OUI + mDNS
No extra pip packages needed — pure stdlib + subprocess
"""

import nmap
import os
import psutil
import subprocess
import socket
import struct
import re
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout

os.environ['PATH'] += r';C:\Program Files (x86)\Nmap'
os.environ['PATH'] += r';C:\Program Files\Nmap'

# ─────────────────────────────────────────────────────────────────────────────
# MAC OUI DATABASE — first 8 chars of MAC → device info
# Extended local DB so no internet needed
# ─────────────────────────────────────────────────────────────────────────────
MAC_OUI_DB = {
    # D-Link
    "00:05:5D": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:0F:3D": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:11:95": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:17:9A": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:19:5B": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:1B:11": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:1C:F0": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:21:91": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:22:B0": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:24:01": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "00:26:5A": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "14:D6:4D": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "1C:7E:E5": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "28:10:7B": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "34:08:04": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "4C:00:82": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "50:46:5D": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "84:C9:B2": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "88:76:B9": ("D-Link", "Router", "🔌", "D-Link Router OS"),   # ← Your device!
    "90:94:E4": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "A0:AB:1B": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "B8:A3:86": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "C8:BE:19": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "CC:B2:55": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "D8:FE:E3": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "F0:7D:68": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    "FC:75:16": ("D-Link", "Router", "🔌", "D-Link Router OS"),
    # TP-Link
    "00:1D:0F": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "14:CC:20": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "1C:FA:68": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "2C:D0:5A": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "30:B5:C2": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "50:3E:AA": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "54:E6:FC": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "6C:19:8F": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "74:DA:38": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "90:F6:52": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "A0:F3:C1": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "B0:48:7A": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "C0:4A:00": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "E8:DE:27": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    "F4:F2:6D": ("TP-Link", "Router", "🔌", "TP-Link Router OS"),
    # Huawei Routers/Phones
    "00:18:82": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "00:E0:FC": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "04:F9:38": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "08:C0:EB": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "34:CD:BE": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "3C:47:11": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "40:4D:8E": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "48:DB:50": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "50:A7:2B": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "54:89:98": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "68:13:24": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "70:7B:E8": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "74:A5:28": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "90:67:1C": ("Huawei", "Router", "🔌", "Huawei VRP"),
    "AC:E2:15": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "B4:CD:27": ("Huawei", "Android Phone", "📱", "Android (Huawei EMUI)"),
    "CC:53:B5": ("Huawei", "Router", "🔌", "Huawei VRP"),
    # Apple
    "00:17:F2": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "00:1A:70": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "00:1B:63": ("Apple", "Apple Device", "🍎", "macOS"),
    "00:1D:4F": ("Apple", "Apple Device", "🍎", "macOS"),
    "00:21:E9": ("Apple", "Apple Device", "🍎", "macOS"),
    "00:25:BC": ("Apple", "Apple Device", "🍎", "macOS"),
    "04:0C:CE": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "04:15:52": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "04:4B:ED": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "08:6D:41": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "0C:74:C2": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "10:40:F3": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "18:9E:FC": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "1C:1A:C0": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "20:C9:D0": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "28:CF:DA": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "34:C0:59": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "38:0F:4A": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "3C:15:C2": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "40:CB:C0": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "44:00:10": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "48:A1:95": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "4C:57:CA": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "54:9F:35": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "58:55:CA": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "5C:F7:E6": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "60:F8:1D": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "64:B9:E8": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "68:9C:70": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "6C:40:08": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "70:11:24": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "74:E1:B6": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "78:31:C1": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "7C:6D:62": ("Apple", "iPhone/iPad", "📱", "iOS"),
    "80:E6:50": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "84:FC:AC": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "88:66:A5": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "8C:00:6D": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "90:60:F1": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "94:BF:2D": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "98:9E:63": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "9C:20:7B": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "A0:99:9B": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "A4:5E:60": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "A8:86:DD": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "AC:29:3A": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "B0:65:BD": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "B4:18:D1": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "B8:17:C2": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "BC:3B:AF": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "C0:F2:FB": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "C4:B3:01": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "C8:2A:14": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "CC:25:EF": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "D0:03:4B": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "D4:90:9C": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "D8:A2:5E": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "DC:2B:2A": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "E0:B5:2D": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "E4:25:E7": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "E8:04:0B": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "EC:35:86": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "F0:B4:79": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "F4:37:B7": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "F8:1E:DF": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    "FC:25:3F": ("Apple", "Apple Device", "🍎", "macOS / iOS"),
    # Samsung
    "00:12:FB": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "08:08:C2": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "08:D4:0C": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "0C:14:20": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "10:1D:C0": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "14:49:E0": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "18:67:B0": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "1C:62:B8": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "20:13:E0": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "2C:AE:2B": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "30:CD:A7": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "34:AA:8B": ("Samsung", "Smart TV", "📺", "Tizen OS"),
    "38:2D:E8": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "40:0E:85": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "44:A7:CF": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "48:44:F7": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "4C:BC:A5": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "50:01:BB": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "54:88:0E": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "58:EF:68": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "5C:3C:27": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "60:6B:BD": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "64:B3:10": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "68:07:15": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "6C:2F:2C": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "70:F9:27": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "74:45:8A": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "78:F7:BE": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "7C:1C:4E": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "80:65:6D": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "84:25:DB": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "88:32:9B": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "8C:C8:4B": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "90:18:7C": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "94:35:0A": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "98:52:B1": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "9C:3A:AF": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "A0:07:98": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "A4:0C:C3": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "A8:7D:12": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "AC:5F:3E": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "B0:72:BF": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "B4:3A:28": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "B8:5E:7B": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "BC:47:60": ("Samsung", "Smart TV", "📺", "Tizen OS"),
    "C0:BD:D1": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "C4:42:02": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "C8:14:79": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "CC:07:AB": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "D0:59:E4": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "D4:88:90": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "D8:57:EF": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "DC:71:96": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "E0:99:71": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "E4:12:1D": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "E8:03:9A": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "EC:1F:72": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "F0:25:B7": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "F4:42:8F": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "F8:04:2E": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    "FC:00:12": ("Samsung", "Android Phone", "📱", "Android (Samsung One UI)"),
    # Xiaomi
    "00:9E:C8": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "04:CF:8C": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "08:21:EF": ("Xiaomi", "Router", "🔌", "MiWifi OS"),
    "0C:1D:AF": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "10:2A:B3": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "14:F6:5A": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "18:59:36": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "1C:99:4C": ("Xiaomi", "Router", "🔌", "MiWifi OS"),
    "20:82:C0": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "28:6C:07": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "34:80:B3": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "38:A4:ED": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "3C:BD:D8": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "40:31:3C": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "44:DB:C1": ("Xiaomi", "Router", "🔌", "MiWifi OS"),
    "4C:49:E3": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "58:44:98": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "5C:A8:6A": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "60:AB:67": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "64:09:80": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "68:DF:DD": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "74:51:BA": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "78:11:DC": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "8C:BE:BE": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "90:C7:D8": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "94:FB:29": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "9C:99:A0": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "A0:86:C6": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "AC:C1:EE": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "B0:E2:35": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "B4:0B:44": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "BC:32:B2": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "C4:6A:B7": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "C8:9F:46": ("Xiaomi", "Router", "🔌", "MiWifi OS"),
    "CC:2D:E0": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "D4:97:0B": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "D8:9E:61": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "E4:46:DA": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "EC:FA:BC": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "F0:B4:29": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "F4:8E:92": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    "F8:A4:5F": ("Xiaomi", "Android Phone", "📱", "Android (MIUI)"),
    # Cisco
    "00:00:0C": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:01:42": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:01:63": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:01:64": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:01:96": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:01:97": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:0A:41": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:0A:42": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:0A:8A": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:0B:BE": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:14:A9": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:17:0E": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:1A:2F": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:1C:B1": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:21:A0": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:23:AC": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:25:45": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "00:26:CB": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "24:E9:B3": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "34:DB:FD": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "40:F4:EC": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "4C:4E:35": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "54:75:D0": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "5C:50:15": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "68:EF:BD": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "70:10:5C": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "84:B8:02": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "8C:60:4F": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "90:6C:AC": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "A4:93:4C": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "B4:A4:E3": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "C8:9C:1D": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "D0:72:DC": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "E8:BA:70": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    "F4:0F:1B": ("Cisco", "Router/Switch", "🔌", "Cisco IOS"),
    # Dell
    "00:06:5B": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:08:74": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:0B:DB": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:0D:56": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:0F:1F": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:11:43": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:12:3F": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:13:72": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:14:22": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:15:C5": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:16:F0": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:18:8B": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:19:B9": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:1A:4B": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:1C:23": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:1D:09": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:1E:4F": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:1F:D0": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:21:70": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:22:19": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:23:AE": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:24:E8": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:25:64": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "00:26:B9": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "18:03:73": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "18:66:DA": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "1C:40:24": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "24:B6:FD": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "28:F1:0E": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "34:17:EB": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "3C:A9:F4": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "40:A8:F0": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "44:A8:42": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "4C:D9:8F": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "54:9F:35": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "5C:F9:DD": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "60:63:F6": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "64:00:6A": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "68:05:CA": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "74:86:7A": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "78:45:C4": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "80:18:44": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "84:7B:EB": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "8C:EC:4B": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "90:B1:1C": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "98:90:96": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "9C:EB:E8": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "A4:1F:72": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "B0:83:FE": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "B4:45:06": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "BC:30:5B": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "C0:3F:D5": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "C8:1F:66": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "D0:43:1E": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "D4:AE:52": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "D8:9E:F3": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "E0:DB:55": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "E4:B9:7A": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "E8:B1:FC": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "EC:F4:BB": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "F0:4D:A2": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "F4:8E:38": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
    "F8:BC:12": ("Dell", "Windows/Linux PC", "🖥️", "Windows / Linux"),
}

# Vendor string → device info fallback
VENDOR_STRING_MAP = [
    (["d-link", "dlink"],                 ("D-Link Router", "Router/Switch", "🔌", "D-Link Router OS")),
    (["tp-link", "tplink"],               ("TP-Link Router", "Router/Switch", "🔌", "TP-Link Router OS")),
    (["netgear"],                         ("Netgear Router", "Router/Switch", "🔌", "Netgear Router OS")),
    (["cisco"],                           ("Cisco Device", "Router/Switch", "🔌", "Cisco IOS")),
    (["juniper"],                         ("Juniper Device", "Router/Switch", "🔌", "Juniper JunOS")),
    (["mikrotik"],                        ("MikroTik Router", "Router/Switch", "🔌", "RouterOS")),
    (["ubiquiti", "ubnt"],                ("Ubiquiti AP", "Access Point", "📡", "UniFi OS")),
    (["zte"],                             ("ZTE Router", "Router/Switch", "🔌", "ZTE OS")),
    (["huawei"],                          ("Huawei Device", "Router/Switch", "🔌", "Huawei VRP")),
    (["samsung"],                         ("Samsung Device", "Android Phone", "📱", "Android (Samsung One UI)")),
    (["xiaomi", "miui", "mi "],           ("Xiaomi Device", "Android Phone", "📱", "Android (MIUI)")),
    (["oppo"],                            ("Oppo Phone", "Android Phone", "📱", "Android (ColorOS)")),
    (["vivo"],                            ("Vivo Phone", "Android Phone", "📱", "Android (FuntouchOS)")),
    (["oneplus"],                         ("OnePlus Phone", "Android Phone", "📱", "Android (OxygenOS)")),
    (["realme"],                          ("Realme Phone", "Android Phone", "📱", "Android (realmeUI)")),
    (["apple"],                           ("Apple Device", "Apple Device", "🍎", "iOS / macOS")),
    (["dell"],                            ("Dell PC", "Windows/Linux PC", "🖥️", "Windows / Linux")),
    (["hp ", "hewlett"],                  ("HP PC", "Windows/Linux PC", "🖥️", "Windows / Linux")),
    (["lenovo"],                          ("Lenovo PC", "Windows/Linux PC", "🖥️", "Windows / Linux")),
    (["intel"],                           ("Intel PC", "Desktop/Laptop", "💻", "Windows / Linux")),
    (["acer"],                            ("Acer Laptop", "Laptop", "💻", "Windows / Linux")),
    (["msi"],                             ("MSI Gaming PC", "Gaming PC", "🎮", "Windows")),
    (["gigabyte"],                        ("Gigabyte PC", "Desktop PC", "🖥️", "Windows / Linux")),
    (["asustek", "asus"],                 ("Asus Device", "Desktop/Laptop", "💻", "Windows / Linux")),
    (["raspberry"],                       ("Raspberry Pi", "IoT Device", "🔧", "Raspberry Pi OS")),
    (["hikvision"],                       ("HikVision Camera", "IP Camera", "📷", "Embedded Linux")),
    (["dahua"],                           ("Dahua Camera", "IP Camera", "📷", "Embedded Linux")),
    (["sony"],                            ("Sony Smart TV", "Smart TV", "📺", "Android TV")),
    (["lg electronics"],                  ("LG Smart TV", "Smart TV", "📺", "webOS")),
    (["canon"],                           ("Canon Printer", "Printer", "🖨️", "Embedded OS")),
    (["epson"],                           ("Epson Printer", "Printer", "🖨️", "Embedded OS")),
    (["brother"],                         ("Brother Printer", "Printer", "🖨️", "Embedded OS")),
    (["microsoft"],                       ("Microsoft Device", "Windows PC", "🖥️", "Windows")),
    (["vmware"],                          ("VMware VM", "Virtual Machine", "🔷", "Various")),
    (["virtualbox", "oracle"],            ("VirtualBox VM", "Virtual Machine", "🔷", "Various")),
]


def lookup_mac_oui(mac: str) -> tuple:
    """Look up MAC OUI in local database. Returns (vendor, device_type, icon, os_name) or None"""
    if not mac or mac in ("N/A", "unknown", ""):
        return None
    # Normalize MAC to XX:XX:XX format (first 3 octets)
    mac_clean = mac.upper().replace("-", ":").replace(".", ":")
    parts = mac_clean.split(":")
    if len(parts) < 3:
        return None
    oui = ":".join(parts[:3])
    return MAC_OUI_DB.get(oui)


def lookup_vendor_string(vendor: str) -> tuple:
    """Match vendor string against known device map"""
    if not vendor or vendor in ("N/A", "unknown", ""):
        return None
    vl = vendor.lower()
    for keywords, result in VENDOR_STRING_MAP:
        if any(kw in vl for kw in keywords):
            return result  # (display_name, device_type, icon, os_name)
    return None


def try_snmp_get(ip: str, oid: str = "1.3.6.1.2.1.1.1.0", community: str = "public", timeout: int = 2) -> str:
    """
    Try SNMP GET using subprocess (snmpget from net-snmp tools if installed).
    Returns sysDescr string or empty string.
    """
    try:
        result = subprocess.run(
            ["snmpget", "-v2c", f"-c{community}", "-t", str(timeout), "-r1", ip, oid],
            capture_output=True, text=True, timeout=timeout + 1
        )
        if result.returncode == 0 and result.stdout:
            # Parse value from: SNMPv2-MIB::sysDescr.0 = STRING: "..."
            match = re.search(r'STRING:\s*(.+)', result.stdout)
            if match:
                return match.group(1).strip().strip('"')
    except (FileNotFoundError, subprocess.TimeoutExpired, Exception):
        pass
    return ""


def try_http_banner(ip: str, port: int = 80, timeout: float = 2.0) -> str:
    """Grab HTTP response headers/body to identify device"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((ip, port))
        request = f"GET / HTTP/1.1\r\nHost: {ip}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n"
        s.send(request.encode())
        response = b""
        while len(response) < 4096:
            try:
                chunk = s.recv(1024)
                if not chunk:
                    break
                response += chunk
            except:
                break
        s.close()
        return response.decode("utf-8", errors="ignore")
    except:
        return ""


def parse_http_banner_for_device(banner: str) -> tuple:
    """
    Extract device info from HTTP banner.
    Returns (device_name, device_type, icon, os_name) or None
    """
    if not banner:
        return None

    banner_lower = banner.lower()

    # D-Link
    if "d-link" in banner_lower or "dlink" in banner_lower:
        model = re.search(r'(dir-\d+|dsl-\d+|dgs-\d+|des-\d+|dap-\d+|dvg-\d+)', banner_lower)
        model_str = model.group(1).upper() if model else "D-Link"
        return (f"D-Link {model_str}", "Router/Switch", "🔌", "D-Link Router OS")

    # TP-Link
    if "tp-link" in banner_lower or "tplink" in banner_lower:
        model = re.search(r'(tl-\w+|archer \w+|deco \w+)', banner_lower)
        model_str = model.group(1).upper() if model else "TP-Link"
        return (f"TP-Link {model_str}", "Router/Switch", "🔌", "TP-Link Router OS")

    # MikroTik
    if "mikrotik" in banner_lower or "routeros" in banner_lower:
        ver = re.search(r'routeros[\s/v]+([\d.]+)', banner_lower)
        ver_str = ver.group(1) if ver else ""
        return (f"MikroTik RouterOS {ver_str}".strip(), "Router/Switch", "🔌", f"RouterOS {ver_str}".strip())

    # Cisco
    if "cisco" in banner_lower:
        return ("Cisco Device", "Router/Switch", "🔌", "Cisco IOS")

    # Huawei
    if "huawei" in banner_lower:
        return ("Huawei Device", "Router/Switch", "🔌", "Huawei VRP")

    # Ubiquiti
    if "ubiquiti" in banner_lower or "unifi" in banner_lower or "ubnt" in banner_lower:
        return ("Ubiquiti UniFi", "Access Point", "📡", "UniFi OS")

    # Hikvision / Dahua cameras
    if "hikvision" in banner_lower:
        return ("HikVision Camera", "IP Camera", "📷", "Embedded Linux")
    if "dahua" in banner_lower:
        return ("Dahua Camera", "IP Camera", "📷", "Embedded Linux")

    # ZTE
    if "zte" in banner_lower:
        return ("ZTE Router", "Router/Switch", "🔌", "ZTE OS")

    # Windows IIS
    if "iis" in banner_lower or "windows" in banner_lower:
        ver = re.search(r'windows[\s/]+([\w. ]+)', banner_lower)
        os_str = ver.group(1).strip().title() if ver else "Windows Server"
        return (f"Windows Server ({os_str})", "Windows Server", "🖥️", f"Windows Server")

    # Linux Apache / Nginx
    if "apache" in banner_lower:
        return ("Linux Web Server", "Linux Server", "🐧", "Linux (Apache)")
    if "nginx" in banner_lower:
        return ("Linux Web Server", "Linux Server", "🐧", "Linux (Nginx)")

    # Android / phones with web UI
    if "android" in banner_lower:
        return ("Android Device", "Android Phone", "📱", "Android")

    return None


def parse_snmp_sysdescr(sysdescr: str) -> tuple:
    """Parse SNMP sysDescr to extract device type and OS"""
    if not sysdescr:
        return None
    s = sysdescr.lower()

    if "windows" in s:
        ver = re.search(r'windows[\s_]+([\w .]+?)[\s,;]', sysdescr, re.IGNORECASE)
        os_str = ver.group(1).strip() if ver else "Windows"
        return (f"Windows PC ({os_str})", "Windows PC", "🖥️", f"Windows {os_str}")
    if "linux" in s:
        ver = re.search(r'linux[\s/]+([\d.]+)', sysdescr, re.IGNORECASE)
        ver_str = ver.group(1) if ver else ""
        return (f"Linux Device", "Linux Server", "🐧", f"Linux {ver_str}".strip())
    if "ios" in s and "cisco" in s:
        ver = re.search(r'version[\s]+([\d.()A-Za-z]+)', sysdescr, re.IGNORECASE)
        ver_str = ver.group(1) if ver else ""
        return (f"Cisco IOS {ver_str}".strip(), "Router/Switch", "🔌", f"Cisco IOS {ver_str}".strip())
    if "junos" in s:
        return ("Juniper JunOS", "Router/Switch", "🔌", "Juniper JunOS")
    if "routeros" in s or "mikrotik" in s:
        ver = re.search(r'([\d.]+)', sysdescr)
        ver_str = ver.group(1) if ver else ""
        return (f"MikroTik RouterOS {ver_str}".strip(), "Router/Switch", "🔌", f"RouterOS {ver_str}".strip())
    if "d-link" in s or "dlink" in s:
        return ("D-Link Device", "Router/Switch", "🔌", "D-Link Router OS")
    if "tp-link" in s:
        return ("TP-Link Device", "Router/Switch", "🔌", "TP-Link Router OS")
    if "huawei" in s:
        return ("Huawei Device", "Router/Switch", "🔌", "Huawei VRP")
    if "android" in s:
        return ("Android Device", "Android Phone", "📱", "Android")
    if "darwin" in s or "macos" in s or "mac os" in s:
        return ("Apple macOS", "Apple Device", "🍎", "macOS")

    # Generic — return raw sysDescr truncated
    return (sysdescr[:60], "Network Device", "🌐", sysdescr[:40])


def try_netbios_name(ip: str, timeout: float = 1.5) -> str:
    """Get NetBIOS name from Windows devices"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(timeout)
        # NetBIOS Name Service query
        query = b'\x82\x28\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00' \
                b'\x20CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\x00\x00\x21\x00\x01'
        s.sendto(query, (ip, 137))
        data, _ = s.recvfrom(1024)
        s.close()
        if len(data) > 56:
            # Parse names from response
            num_names = data[56]
            names = []
            for i in range(num_names):
                offset = 57 + i * 18
                if offset + 15 <= len(data):
                    name = data[offset:offset+15].decode('ascii', errors='ignore').strip()
                    name_type = data[offset+15]
                    if name_type == 0x00 and name:  # workstation/computer name
                        names.append(name)
            return names[0] if names else ""
    except:
        return ""


def try_reverse_dns(ip: str) -> str:
    """Reverse DNS lookup"""
    try:
        result = socket.gethostbyaddr(ip)
        name = result[0]
        # Filter out generic PTR records
        if name and name != ip and not name.endswith('.in-addr.arpa'):
            return name
    except:
        pass
    return ""


def enrich_device(ip: str, mac: str, vendor: str, nmap_os_match: list) -> dict:
    """
    Multi-source device enrichment:
    1. MAC OUI DB lookup
    2. Vendor string matching
    3. Nmap OS match parsing
    4. SNMP sysDescr
    5. HTTP banner grab
    6. NetBIOS name
    7. Open port inference
    Returns enriched device info dict
    """
    device_name   = "Unknown Device"
    device_type   = "Unknown Device"
    device_icon   = "❓"
    os_name       = "Unknown"
    os_accuracy   = 0
    hostname      = ""
    source        = "unknown"

    # ── 1. MAC OUI DB ──────────────────────────────────────────────
    oui_result = lookup_mac_oui(mac)
    if oui_result:
        vendor_name, device_type, device_icon, os_name = oui_result
        device_name = vendor_name
        source = "MAC-OUI-DB"
        os_accuracy = 85  # high confidence from OUI

    # ── 2. Vendor string (from nmap) ───────────────────────────────
    if device_type in ("Unknown Device",) or os_name == "Unknown":
        vs = lookup_vendor_string(vendor)
        if vs:
            vname, vtype, vicon, vos = vs
            if device_type == "Unknown Device":
                device_name, device_type, device_icon, os_name = vname, vtype, vicon, vos
                source = "vendor-string"
                os_accuracy = 75

    # ── 3. Nmap OS match ───────────────────────────────────────────
    if nmap_os_match and (os_name == "Unknown" or os_accuracy < 50):
        best = nmap_os_match[0]
        nmap_os_str = best.get('name', '')
        nmap_acc = int(best.get('accuracy', 0))
        if nmap_acc > os_accuracy:
            os_name = nmap_os_str
            os_accuracy = nmap_acc
            source = "nmap-os"
            # Infer type from name
            nl = nmap_os_str.lower()
            if "windows" in nl:
                device_type, device_icon = "Windows PC", "🖥️"
            elif "linux" in nl:
                device_type, device_icon = "Linux Server/PC", "🐧"
            elif "ios" in nl or "iphone" in nl:
                device_type, device_icon = "Apple iOS", "📱"
            elif "mac os" in nl or "darwin" in nl:
                device_type, device_icon = "macOS", "🍎"
            elif "android" in nl:
                device_type, device_icon = "Android Phone", "📱"

    # ── 4. SNMP ────────────────────────────────────────────────────
    if device_type in ("Unknown Device", "Network Device") or os_name == "Unknown":
        sysdescr = try_snmp_get(ip, timeout=2)
        if sysdescr:
            snmp_result = parse_snmp_sysdescr(sysdescr)
            if snmp_result:
                device_name, device_type, device_icon, os_name = snmp_result
                source = "SNMP"
                os_accuracy = 90

    # ── 5. HTTP Banner ─────────────────────────────────────────────
    if device_type in ("Unknown Device", "Network Device") or os_name == "Unknown":
        for port in [80, 443, 8080, 8443]:
            banner = try_http_banner(ip, port, timeout=2)
            if banner:
                http_result = parse_http_banner_for_device(banner)
                if http_result:
                    device_name, device_type, device_icon, os_name = http_result
                    source = f"HTTP-banner:{port}"
                    os_accuracy = max(os_accuracy, 80)
                    break

    # ── 6. NetBIOS (Windows PCs) ───────────────────────────────────
    nb_name = try_netbios_name(ip, timeout=1.5)
    if nb_name:
        hostname = nb_name
        if device_type == "Unknown Device":
            device_type, device_icon, os_name = "Windows PC", "🖥️", "Windows"
            source = "NetBIOS"
            os_accuracy = max(os_accuracy, 85)

    # ── 7. Reverse DNS ────────────────────────────────────────────
    if not hostname:
        hostname = try_reverse_dns(ip)

    print(f"  [{ip}] Source={source} | Type={device_type} | OS={os_name} | Accuracy={os_accuracy}%")

    return {
        "device_name":   device_name,
        "device_type":   device_type,
        "device_icon":   device_icon,
        "os_name":       os_name,
        "os_accuracy":   os_accuracy,
        "hostname":      hostname,
        "detection_src": source,
    }


# ─────────────────────────────────────────────────────────────────────────────
# DISCOVER ASSETS
# ─────────────────────────────────────────────────────────────────────────────
def discover_assets(ip_range: str):
    print(f"\n📡 TECHIFY Discovery: {ip_range}")
    devices = []

    nm_ping = nmap.PortScanner()
    nm_os   = nmap.PortScanner()

    # Step 1: Fast ping sweep
    try:
        nm_ping.scan(
            hosts=ip_range,
            arguments='-sn -PE -PP -PS80,443,8080 -PA22,3389 -T4 --min-parallelism 100'
        )
    except Exception as e:
        print(f"Ping scan error: {e}")
        return [{"ip": ip_range.split('/')[0], "status": "Fallback",
                 "os_name": "Unknown", "device_type": "Unknown Device",
                 "device_icon": "❓", "open_ports": [], "hostname": "Unknown"}]

    alive_hosts = [h for h in nm_ping.all_hosts() if nm_ping[h].state() == 'up']
    print(f"  → {len(alive_hosts)} alive hosts: {alive_hosts}")

    if not alive_hosts:
        return []

    # Step 2: Service + OS scan (best effort — needs admin for -O)
    hosts_str = ' '.join(alive_hosts[:25])
    try:
        nm_os.scan(
            hosts=hosts_str,
            arguments='-O -sV --osscan-guess --version-intensity 5 -T4 '
                      '-p 22,23,53,80,135,139,443,445,631,3389,8080,8443'
        )
    except Exception as e:
        print(f"  OS/Service scan error: {e}")
        try:
            nm_os.scan(hosts=hosts_str,
                       arguments='-sV --version-intensity 5 -T4 '
                                 '-p 22,23,80,135,139,443,445,3389,8080')
        except:
            pass

    for host in alive_hosts:
        mac = "N/A"
        vendor = "N/A"
        nmap_os_match = []
        open_ports = []

        # Get MAC + vendor from ping scan
        if host in nm_ping.all_hosts():
            h = nm_ping[host]
            if 'addresses' in h and 'mac' in h['addresses']:
                mac = h['addresses']['mac']
            if 'vendor' in h and h['vendor']:
                vendor = list(h['vendor'].values())[0]

        # Get more data from OS scan
        if host in nm_os.all_hosts():
            h_os = nm_os[host]
            if 'addresses' in h_os and 'mac' in h_os['addresses'] and mac == "N/A":
                mac = h_os['addresses']['mac']
            if 'vendor' in h_os and h_os['vendor'] and vendor == "N/A":
                vendor = list(h_os['vendor'].values())[0]
            nmap_os_match = h_os.get('osmatch', [])
            if 'tcp' in h_os:
                for port, info in h_os['tcp'].items():
                    if info['state'] == 'open':
                        open_ports.append({
                            'port': port,
                            'service': info.get('name', ''),
                            'product': info.get('product', ''),
                            'version': info.get('version', ''),
                        })

        # Multi-source enrichment
        enriched = enrich_device(host, mac, vendor, nmap_os_match)

        # Determine best hostname
        hostname = enriched.get("hostname") or try_reverse_dns(host)
        if not hostname or hostname == host:
            # Make a readable name from device type
            short_type = enriched["device_type"].split("/")[0].strip()
            hostname = f"{short_type}-{host.split('.')[-1]}"

        # Port-based fallbacks if still unknown
        if enriched["device_type"] == "Unknown Device":
            port_nums = {p['port'] for p in open_ports}
            if 3389 in port_nums:
                enriched.update({"device_type": "Windows PC", "device_icon": "🖥️", "os_name": "Windows (RDP detected)"})
            elif 22 in port_nums and (80 in port_nums or 443 in port_nums):
                enriched.update({"device_type": "Linux Server", "device_icon": "🐧", "os_name": "Linux (SSH+HTTP)"})
            elif 22 in port_nums:
                enriched.update({"device_type": "Linux/Unix Device", "device_icon": "🐧", "os_name": "Linux/Unix (SSH)"})
            elif 80 in port_nums or 8080 in port_nums:
                enriched.update({"device_type": "Network Device", "device_icon": "🌐", "os_name": "Embedded (Web UI)"})

        devices.append({
            "ip":            host,
            "hostname":      hostname,
            "mac":           mac,
            "vendor":        vendor if vendor != "N/A" else enriched.get("device_name", "Unknown"),
            "status":        "Online",
            "os_name":       enriched["os_name"],
            "os_accuracy":   enriched["os_accuracy"],
            "device_type":   enriched["device_type"],
            "device_icon":   enriched["device_icon"],
            "open_ports":    open_ports[:12],
            "detection_src": enriched["detection_src"],
        })

    return devices


# ─────────────────────────────────────────────────────────────────────────────
# SECURITY AUDIT
# ─────────────────────────────────────────────────────────────────────────────
def run_security_audit(target_ip: str):
    violations = []

    if target_ip in ['127.0.0.1', 'localhost']:
        try:
            usage = psutil.disk_usage('/')
            if usage.percent > 80:
                violations.append({"id": "POLICY-13-DISK", "title": "Policy 13: High Disk Usage",
                                    "severity": "Medium", "description": f"Disk {usage.percent:.1f}% full",
                                    "port": None, "service": "Disk", "fix": "Automatic cleanup available"})
            cpu = psutil.cpu_percent(interval=1)
            if cpu > 85:
                violations.append({"id": "POLICY-13-CPU", "title": "Policy 13: High CPU Usage",
                                    "severity": "Medium", "description": f"CPU at {cpu}%",
                                    "port": None, "service": "CPU", "fix": "Review running processes"})
            ram = psutil.virtual_memory()
            if ram.percent > 90:
                violations.append({"id": "POLICY-13-RAM", "title": "Policy 13: High RAM Usage",
                                    "severity": "Medium", "description": f"RAM {ram.percent}% used",
                                    "port": None, "service": "Memory", "fix": "Close heavy apps"})
            try:
                r = subprocess.run('powershell -Command "Get-Service -Name WinDefend"',
                                   capture_output=True, text=True, timeout=5, shell=True)
                if "Running" not in r.stdout:
                    violations.append({"id": "POLICY-8-AV", "title": "Policy 8: Windows Defender Not Running",
                                        "severity": "Critical", "description": "Antivirus disabled",
                                        "port": None, "service": "Security", "fix": "Enable Windows Defender"})
            except: pass
            try:
                r = subprocess.run('powershell -Command "Get-BitLockerVolume -MountPoint C:"',
                                   capture_output=True, text=True, timeout=5, shell=True)
                if "FullyEncrypted" not in r.stdout and "Encrypted" not in r.stdout:
                    violations.append({"id": "POLICY-9-ENCRYPT", "title": "Policy 9: Disk Not Encrypted",
                                        "severity": "High", "description": "Drive not BitLocker encrypted",
                                        "port": None, "service": "Encryption", "fix": "Enable BitLocker"})
            except: pass
        except: pass

    try:
        nm = nmap.PortScanner()
        nm.scan(target_ip, '22,23,135,139,445,3389,1433,3306,5432,5900,8080',
                arguments='-sV -T4 --open')
        for host in nm.all_hosts():
            if 'tcp' in nm[host]:
                for port in nm[host]['tcp']:
                    info = nm[host]['tcp'][port]
                    if info['state'] == 'open':
                        service = info['name']
                        desc = f"{info.get('product','')} {info.get('version','')}".strip() or service
                        sev, title, fix = "Medium", f"{service.upper()} on Port {port}", "Block via firewall"
                        if port in [22, 3389]:
                            sev, title = "Critical", f"Policy 4: Port {port} Open ({service.upper()})"
                        elif port == 445:
                            sev, title = "Critical", "Policy 4: SMB Port 445 (EternalBlue Risk)"
                        elif port == 23:
                            sev, title = "High", "Telnet Exposed (Unencrypted)"
                        elif port in [1433, 3306, 5432]:
                            sev, title = "High", f"Database Port {port} Exposed"
                        violations.append({"id": f"PORT-{port}", "title": title, "severity": sev,
                                           "description": desc, "port": port, "service": service, "fix": fix})
    except Exception as e:
        violations.append({"id": "SCAN-ERR", "title": "Scan Error", "severity": "Low",
                           "description": str(e)[:120], "port": None, "fix": "Check connectivity"})
    return violations