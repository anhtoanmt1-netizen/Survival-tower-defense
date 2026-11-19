# Survival Tower Defense

Game mobile Android 2D pixel art góc nhìn 3/4. Công nghệ: **Phaser 3 + Vite + Capacitor** (web → APK). Build APK bằng **GitHub Actions**.

## Trạng thái hiện tại: Giai đoạn 2 (v0.2)

| Hạng mục | Trạng thái |
|---|---|
| Bản đồ 100x100 theo Map ID, kích thước cấu hình được (40–400) | ✅ có test tự động |
| Sinh địa hình: cây/đá theo cụm (Cellular Automata + Noise), sông cong (Random Walk) có bến cạn, đất trống, bụi cây | ✅ |
| Hậu xử lý + kiểm tra: không vùng cô lập, 8 cổng đều nối tới trung tâm, lối đi ≥ 2 ô, mật độ vật cản | ✅ 300 seed pass |
| Map ID tái tạo chính xác, có phiên bản thuật toán (`edition`) | ✅ |
| Nhân vật nông dân + animation đứng/đi/chạy/xây/bị đánh/chết, màu áo tùy chọn, tên | ✅ (xây/bị đánh/chết chỉ xem được bằng phím debug, chưa có gameplay gọi) |
| Điều khiển: chạm để đi (A*), joystick ảo đa điểm, WASD khi chạy trên máy tính | ✅ (chưa thử trên thiết bị thật) |
| Va chạm với cây/đá/sông, Y-sorting, minimap, lưu tên/màu áo, vùng an toàn tai thỏ | ✅ (chưa thử trên thiết bị thật) |
| Slime 5 màu (xanh lá/xanh dương/tím/đỏ/vàng, khác kích thước + chi tiết), animation đứng/nhảy/chết, nhấp nháy khi trúng đòn | ✅ |
| 8 cổng, chọn cổng rải đều theo số người chơi, xuất hiện ngẫu nhiên trong vùng 5x5 hợp lệ của cổng | ✅ (đơn: 1 cổng) |
| AI: Flow Field dùng chung (Dijkstra nhiều nguồn), quái vòng đường, tính lại khi bản đồ đổi, trạng thái không-có-đường (đứng yên, không xuyên vật) | ✅ có test mô phỏng |
| Va chạm quái–địa hình, quái–quái (đẩy nhau), quái tấn công người chơi: −1 HP, miễn thương 1,2s, nhấp nháy, rung màn hình, chết khi hết 3 HP | ✅ |
| Object Pooling slime (logic + sprite), giới hạn 150 quái đồng thời, vượt giới hạn thì xếp hàng chờ (không xóa quái cũ) | ✅ |
| Công thức 100 đợt phi tuyến, đợt tự tới theo đồng hồ (không cần diệt hết), mốc thử thách 10/20/…/100 có slime vàng, HUD đợt/đếm ngược/số slime | 🟡 bản đầu để chơi thử; cân bằng + giao diện đầy đủ ở Giai đoạn 4 |
| Tháp, vàng, kỹ năng nhân vật, 3 nhánh tháp, minimap tương tác | ⏳ Giai đoạn 3–4 |
| Màn thất bại/thắng, thống kê sau trận | ⏳ (hiện chỉ hiện chữ "BẠN ĐÃ BỊ HẠ") |
| Multiplayer, server, phòng, link mời | ⏳ Giai đoạn 5 |
| Âm thanh, tạm dừng, lưu tiến trình, màn thắng/thua | ⏳ chưa làm |

Giới hạn đã biết: sprite chỉ có mặt trước (lật ngang khi đi trái/phải, chưa có mặt sau); nước chưa có animation; đồ họa đang vẽ bằng code (có thể thay bằng sprite sheet thật, giữ nguyên key/kích thước ở `src/render`).

## Chạy thử
```bash
npm install
npm test          # kiểm thử bản đồ, Map ID, A*
npm run dev       # mở URL hiển thị (mở bằng điện thoại cùng Wi-Fi để thử cảm ứng)
```
Thêm `?debug=1` vào URL để bật phím dev: `H` bị đánh, `B` xây, `K` chết, `X` diệt slime gần nhất, `Z` xếp thêm 20 slime vào hàng chờ. (Chưa có tháp nên chưa có cách diệt slime trong chơi thường – sẽ có ở Giai đoạn 3.)

Cấu hình chỉnh không cần sửa code logic: `src/config/slimes.js` (máu, tốc độ, kích thước, vàng), `src/config/waves.js` (công thức đợt, thời gian).

## Build APK
**Bằng GitHub (khuyến nghị):** đẩy code lên nhánh `main` → tab *Actions* → workflow *Build Android APK* → tải artifact `survival-tower-defense-debug-apk` → cài file `.apk` (bật "cài từ nguồn không rõ"). APK này là bản **debug**; bản release cần keystore (chưa cấu hình).

**Trên máy:** cần Node 20, JDK 17, Android SDK.
```bash
npm run build && npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug   # APK: android/app/build/outputs/apk/debug/
```

## Map ID
`FOREST-2026-A8F72K` = `chủ đề`-`phiên bản thuật toán`-`seed`; kích thước khác 100 thì thêm hậu tố, ví dụ `FOREST-2026-A8F72K-150`.
Cùng ID cho đúng cùng bản đồ trên mọi thiết bị. **Không sửa** `src/map/generators/forest2026.js` sau khi phát hành; muốn đổi thuật toán hãy thêm `forest2027.js` và đăng ký trong `generators/index.js`.

## Cấu trúc
```
src/core/      rng/noise tất định, heap, A*, flow field
src/sim/       logic quái vật thuần (monster, world, director) – kiểm thử được không cần Phaser
src/systems/   cầu nối sim → Phaser (MonsterRenderer, pooling sprite)
src/config/    cấu hình chung, chủ đề (themes/)
src/map/       tiles, mapId, generators/ (theo phiên bản), validate, grid, gates
src/render/    texture pixel art, sprite nông dân
src/entities/  Player
src/input/     Joystick
src/scenes/    GameScene (thế giới), UIScene (joystick, minimap)
tests/         kiểm thử tự động
```
Thêm chủ đề mới: tạo `config/themes/<ten>.js`, đăng ký trong `themes/index.js` và `map/generators/index.js`.
