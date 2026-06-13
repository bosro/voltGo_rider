import subprocess, time, socket

ROUTE = [
    (5.5968, -0.1869),  # Start (rider position)
    (5.5985, -0.1858),
    (5.6002, -0.1847),
    (5.6020, -0.1836),
    (5.6050, -0.1825),
    (5.6080, -0.1818),
    (5.6110, -0.1810),  # Midpoint
    (5.6140, -0.1805),
    (5.6170, -0.1802),
    (5.6200, -0.1800),
    (5.6250, -0.1798),
    (5.6300, -0.1795),
    (5.6350, -0.1792),
    (5.6400, -0.1790),
    (5.6502, -0.1870),  # University of Ghana
]

def android(lat, lon):
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect(("localhost", 5554))
        s.recv(1024)
        s.sendall(f"geo fix {lon} {lat}\n".encode())
        time.sleep(0.3)
        s.close()
    except Exception as e:
        print(f"  Android error: {e}")

def ios(lat, lon):
    subprocess.run(
        ["xcrun", "simctl", "location", "booted", "set", f"{lat},{lon}"],
        capture_output=True
    )

print("Starting GPS simulation...")
for i, (lat, lon) in enumerate(ROUTE):
    print(f"[{i+1}/{len(ROUTE)}] Moving to {lat}, {lon}")
    android(lat, lon)
    ios(lat, lon)
    time.sleep(6)

print("Done — rider has reached the dropoff.")