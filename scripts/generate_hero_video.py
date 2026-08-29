from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
source = cv2.imread(str(ROOT / "frontend/public/brand/adflow-network.png"))
if source is None:
    raise SystemExit("Hero artwork was not found.")

width, height = 1600, 900
frames_per_second = 24
duration_seconds = 8
video_path = ROOT / "frontend/public/brand/adflow-network.mp4"
writer = cv2.VideoWriter(
    str(video_path),
    cv2.VideoWriter_fourcc(*"mp4v"),
    frames_per_second,
    (width, height),
)

for frame_number in range(frames_per_second * duration_seconds):
    progress = frame_number / (frames_per_second * duration_seconds - 1)
    scale = 1.0 + 0.06 * np.sin(progress * np.pi)
    crop_width = int(source.shape[1] / scale)
    crop_height = int(source.shape[0] / scale)
    center_x = int(source.shape[1] * (0.5 + 0.04 * np.sin(progress * np.pi * 2)))
    center_y = int(source.shape[0] * (0.5 + 0.025 * np.cos(progress * np.pi * 2)))
    left = max(0, min(source.shape[1] - crop_width, center_x - crop_width // 2))
    top = max(0, min(source.shape[0] - crop_height, center_y - crop_height // 2))
    frame = cv2.resize(source[top : top + crop_height, left : left + crop_width], (width, height))
    writer.write(frame)

writer.release()
print(video_path)
