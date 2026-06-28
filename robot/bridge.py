# reads SO-101 motor angles and streams them to the browser digital twin at ~30 Hz
# run from SO-101/ with lerobot-env active

import asyncio
import json
import websockets
from pathlib import Path

from lerobot.motors.feetech import FeetechMotorsBus
from lerobot.motors import Motor, MotorNormMode, MotorCalibration

PORT = 8765
POLL_HZ = 30

MOTORS = {
    "shoulder_pan":  Motor(1, "sts3215", MotorNormMode.DEGREES),
    "shoulder_lift": Motor(2, "sts3215", MotorNormMode.DEGREES),
    "elbow_flex":    Motor(3, "sts3215", MotorNormMode.DEGREES),
    "wrist_flex":    Motor(4, "sts3215", MotorNormMode.DEGREES),
    "wrist_roll":    Motor(5, "sts3215", MotorNormMode.DEGREES),
    "gripper":       Motor(6, "sts3215", MotorNormMode.DEGREES),
}

calib_path = Path.home() / ".cache/huggingface/lerobot/calibration/teleoperators/so_leader/my_leader_arm.json"
calib_raw = json.loads(calib_path.read_text())
CALIBRATION = {
    name: MotorCalibration(
        id=calib_raw[name]["id"],
        drive_mode=calib_raw[name]["drive_mode"],
        homing_offset=calib_raw[name]["homing_offset"],
        range_min=calib_raw[name]["range_min"],
        range_max=calib_raw[name]["range_max"],
    )
    for name in MOTORS
}

bus = FeetechMotorsBus(port="/dev/ttyACM0", motors=MOTORS, calibration=CALIBRATION)


def read_angles() -> dict:
    return {name: float(bus.read("Present_Position", name)) for name in MOTORS}


async def handler(websocket):
    print(f"client connected: {websocket.remote_address}")
    try:
        while True:
            await websocket.send(json.dumps(read_angles()))
            await asyncio.sleep(1 / POLL_HZ)
    except websockets.exceptions.ConnectionClosed:
        print("client disconnected")


async def main():
    bus.connect()
    print(f"serving on ws://localhost:{PORT}")
    async with websockets.serve(handler, "localhost", PORT):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        bus.disconnect()
        print("stopped.")
