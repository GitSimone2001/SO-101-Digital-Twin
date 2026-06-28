import time
from lerobot.motors.feetech import FeetechMotorsBus
from lerobot.motors import Motor, MotorNormMode, MotorCalibration

motors = {
    "shoulder_pan":  Motor(1, "sts3215", MotorNormMode.DEGREES),
    "shoulder_lift": Motor(2, "sts3215", MotorNormMode.DEGREES),
    "elbow_flex":    Motor(3, "sts3215", MotorNormMode.DEGREES),
    "wrist_flex":    Motor(4, "sts3215", MotorNormMode.DEGREES),
    "wrist_roll":    Motor(5, "sts3215", MotorNormMode.DEGREES),
    "gripper":       Motor(6, "sts3215", MotorNormMode.DEGREES),
}

calibration = {
    name: MotorCalibration(id=i+1, drive_mode=0, homing_offset=0, range_min=0, range_max=4095)
    for i, name in enumerate(motors)
}

bus = FeetechMotorsBus(port="/dev/ttyACM0", motors=motors, calibration=calibration)
bus.connect()

for name in motors:
    print(f"testing {name}...")
    bus.write("Goal_Position", name, 20)
    time.sleep(1)
    bus.write("Goal_Position", name, -20)
    time.sleep(1)
    bus.write("Goal_Position", name, 0)
    time.sleep(0.5)

bus.disconnect()
print("done.")
