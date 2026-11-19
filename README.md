# SURVIVAL TOWER DEFENSE (Godot 4.3, Android)

Build APK **chỉ bằng GitHub Actions**. Mỗi giai đoạn đều ra APK chơi được.

## Lộ trình
| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Bản đồ seed 100x100, Map ID, nhân vật, joystick, chạm để đi | Đã làm |
| 2 | Slime, cổng sinh quái, FlowField tìm đường, 3 HP, đợt quái cơ bản, màn thua | **Bản này** (chưa kiểm chứng trên máy) |
| 3 | Tháp cung tên, xây (kéo-thả, kiểm tra chặn đường), nâng cấp, bán, 3 nhánh kỹ năng | Chưa |
| 4 | Vàng + cân bằng, 100 đợt đầy đủ, 2 kỹ năng nhân vật, minimap, màn thắng/thống kê | Chưa |
| 5 | Multiplayer server-authoritative, phòng, mã phòng, link mời | Chưa |
| 6 | Pixel art thật, animation, âm thanh, lưu tiến trình, tối ưu, chất lượng đồ họa | Chưa |

Hiện tại: đồ họa là placeholder vẽ bằng code; chưa có tháp nên slime chưa thể bị tiêu diệt (chế độ sống sót);
chưa có minimap, vàng, kỹ năng, âm thanh, lưu game, multiplayer, thắng trận ở đợt 100.

## Build và tải APK
1. Push code lên nhánh `main` (hoặc Actions -> Build APK -> Run workflow).
2. APK nằm ở **Releases -> "Bản build mới nhất"** (tải thẳng về điện thoại) và ở Artifacts của lần chạy.
3. APK debug dùng keystore cố định `ci/debug.keystore` (khóa công khai, chỉ để thử, không dùng cho Google Play),
   nên cài đè bản mới không cần gỡ bản cũ.
4. Workflow dừng build nếu phát hiện lỗi GDScript lúc import, để không tạo APK hỏng.

## Chạy trên PC
Mở `project.godot` bằng Godot 4.3, F5. Phím mũi tên hoặc click để đi.

## Cấu trúc
`scripts/core` · `map_generation` · `pathfinding` (A*, FlowField) · `player` · `monsters` · `waves` · `ui` · `game`.
`tests/` là test headless chạy tay khi cần (không chạy trên GitHub).
