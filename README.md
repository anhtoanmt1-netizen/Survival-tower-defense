# SURVIVAL TOWER DEFENSE (Godot 4.3, Android)

## Trạng thái (trung thực)

| Hạng mục | Trạng thái |
|---|---|
| Project Godot, cấu trúc module | Có (khung ban đầu) |
| Bản đồ seed-based 100x100 + Map ID có phiên bản | Viết xong, **chưa chạy thử trong Godot** |
| Kiểm tra di chuyển (không vùng kẹt, 8 cổng nối tâm) | Có trong bản đồ + test, **chưa chạy** |
| Nhân vật + joystick đa điểm + chạm để đi (A*) | Viết xong, **chưa chạy trên máy** |
| Đồ họa | **Placeholder vẽ bằng code**, chưa phải pixel art |
| Slime, AI, tháp, vàng, 100 đợt, kỹ năng, minimap | Chưa làm (Giai đoạn 2-4) |
| Multiplayer + server | Chưa làm (Giai đoạn 5) |
| Build APK debug bằng GitHub Actions | Đã cấu hình, **chưa chạy thử** (xem mục Build APK) |
| Animation đi/chạy/xây/chết, âm thanh, lưu tiến trình | Chưa làm |

Chưa làm: kiểm tra "lối đi đủ rộng" (hiện chỉ đảm bảo thông được, có thể có chỗ hẹp 1 ô),
tai thỏ/safe area, joystick bằng chuột trên PC (PC dùng phím mũi tên + click để đi).

## Chạy thử
1. Cài Godot 4.3+, mở `project.godot`, bấm F5.
2. Phím mũi tên hoặc joystick để đi; chạm/click để tự đi tới ô đó.
3. Nút: Tải ID / Bản đồ mới / Sao chép ID.

## Test
```
godot --headless --import
godot --headless --script res://tests/map_generation/run_tests.gd
```

## Map ID
`FOREST-V1-100-A8F72K` = chủ đề - phiên bản thuật toán - kích thước - seed (base32).
Sinh bản đồ chỉ dùng hash + LCG tự viết (không dùng noise/RNG của engine) để kết quả
không đổi giữa các bản Godot. Khi đổi thuật toán: tăng `ALGO_VERSION`, giữ code cũ.

## Cấu trúc
- `scripts/core` cấu hình chung · `scripts/map_generation` sinh bản đồ + Map ID
- `scripts/pathfinding` A* dùng chung · `scripts/player`, `scripts/ui`, `scripts/game`
- `tests/` test headless · `.github/workflows/ci.yml` chạy test khi push

## Build APK bằng GitHub
1. Đẩy toàn bộ project lên repo GitHub (nhánh `main`).
2. Tab **Actions -> Build APK -> Run workflow** (hoặc tự chạy mỗi lần push vào main).
3. Khi xong, tải **survival-tower-defense-apk** ở mục Artifacts, giải nén, cài APK lên Android.
- APK này là bản debug (ký bằng debug keystore), chỉ để thử, không đưa lên Google Play được.
- `export_presets.cfg` đã viết tay, chưa kiểm chứng. Nếu lỗi, mở project trong Godot: Project -> Export, kiểm tra preset "Android" rồi lưu lại.
- Package mặc định: `com.survivaltd.game` (đổi trong `export_presets.cfg`).
