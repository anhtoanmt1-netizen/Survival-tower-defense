# Survival Tower Defense

Game mobile Android 2D pixel art góc nhìn 3/4. Công nghệ: **Phaser 3 + Vite + Capacitor** (web → APK). Build APK bằng **GitHub Actions**.

## Trạng thái hiện tại: Giai đoạn 5 (v0.5.2) – nhiều người chơi

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
| Tháp cung tên 1 ô: tự phát hiện/chọn mục tiêu/xoay cung/bắn, mũi tên bay có hiệu ứng trúng, chí mạng | ✅ có test mô phỏng |
| Xây tháp: nút XÂY → thẻ tháp → kéo bóng mờ (xanh/đỏ, hiện tầm bắn) → thả; 2s xây, thanh tiến trình, hiệu ứng hoàn thành | ✅ (chưa thử trên thiết bị thật) |
| Điều kiện xây: cây/đá/sông/bụi, ngoài bản đồ, ô có tháp, ô có nhân vật; chống xây trùng | ✅ |
| **Kiểm tra đường đi trước khi xây**: dùng cùng FlowField/quy tắc địa hình với AI quái, kiểm tra MỌI cổng đang hoạt động và mọi người chơi còn sống; chặn thì từ chối đúng thông báo, không trừ vàng, không đổi bản đồ | ✅ có test |
| Nâng cấp LV (45/70/… tăng theo công thức), hiển thị chỉ số trước→sau, bán hoàn 60% có xác nhận | ✅ |
| 3 nhánh kỹ năng độc lập từng tháp (Liên hoàn / Băng / Thiêu đốt) tại LV3,5,7,9,12,15; bảng chọn có hình, mô tả, chỉ số hiện→sau; đặt lại nhánh tốn 40 vàng | ✅ có test |
| Vàng: khởi đầu 120, xây 60 (mỗi tháp đang có làm tháp sau đắt thêm 8%), nhận vàng khi diệt slime, trợ cấp chống kẹt khi hết tháp + hết vàng | ✅ bản cơ bản; cân bằng sâu ở Giai đoạn 4 |
| Kỹ năng **Bất tử** (5s, hồi 5 phút) và **Xuyên vật thể** (5s, hồi 3 phút): hiệu ứng riêng, đồng hồ hồi chiêu; xuyên vật thể không ra ngoài bản đồ, hết hạn mà đang trong vật cản thì đưa về ô đi được gần nhất | ✅ có test |
| Nâng tốc độ chạy: 8 cấp, +7%/cấp, giá 40→860 vàng (nút ⚡) | ✅ có test |
| Minimap: người chơi (màu áo), quái, tháp, cổng, vùng đang nhìn; chạm để phóng to, chạm điểm bất kỳ để xem khu vực đó, nút "Về nhân vật" | ✅ (chưa thử trên thiết bị thật) |
| 100 đợt: đồng hồ đếm ngược, cảnh báo 5s trước đợt mới, số slime mỗi đợt, tổng slime tồn tại, banner đợt mới, mốc thử thách 10/20/…/100, vàng thưởng tăng theo đợt | ✅ |
| Màn **chiến thắng** (diệt hết sau đợt 100) / **thất bại** (nhân vật chết) + thống kê: slime diệt, vàng kiếm được, số tháp, sát thương, thời gian sống sót; lưu kỷ lục đợt; chơi lại cùng Map ID | ✅ |
| Tạm dừng (nút ⏸, chơi đơn) | ✅ |
| **Multiplayer**: máy chủ Node.js server-authoritative (dùng lại đúng mã mô phỏng của chế độ đơn); server quyết định sinh quái, sát thương, vàng, xây/nâng cấp/nhánh, thời gian đợt, kết quả trận. Tối đa 8 người, n người = n cổng quái | ✅ có test (bộ nhớ + WebSocket thật trên localhost) |
| Phòng: mã 6 ký tự, vào bằng mã, link mời (`/?room=CODE` trên web, `survivaltd://join?room=CODE` trên Android), tên + màu áo **không trùng** trong phòng (server ép), chủ phòng đổi bản đồ/bật tắt hồi sinh/bắt đầu, chuyển chủ khi chủ rời | ✅ logic có test; ⚠️ link Android chưa thử trên máy |
| Đồng bộ: Map ID + checksum bản đồ, snapshot 20 Hz (quái 10 Hz) gồm vị trí người chơi, quái, tháp, mũi tên, HP, vàng, đợt, đồng hồ, trạng thái kỹ năng; hiệu ứng qua sự kiện | ✅ máy khách dựng lại khớp server (có test) |
| Chống gian lận/trùng: lệnh có id (gửi lại cùng id không bị trừ vàng/xây hai lần), kiểm tra tốc độ + va chạm di chuyển (kéo về nếu sai), giới hạn tần suất + kích thước tin, kiểm tra phiên bản giao thức + cấu hình cân bằng | ✅ có test |
| Mất kết nối: giữ chỗ 60s, nhân vật đứng yên + không bị quái nhắm tới, tự vào lại bằng token và nhận lại đúng trạng thái; quá hạn thì bị loại | ✅ có test (đầu-cuối) |
| Hồi sinh (tùy chọn phòng, 15s) + thua chung khi cả đội cùng bị hạ; thắng khi diệt hết sau đợt 100; thống kê chung | ✅ có test |
| Âm thanh/nhạc nền, cấu hình chất lượng đồ họa thấp/trung/cao | ⏳ chưa làm |

Giới hạn đã biết: sprite chỉ có mặt trước (lật ngang khi đi trái/phải, chưa có mặt sau); nước chưa có animation; đồ họa đang vẽ bằng code (có thể thay bằng sprite sheet thật, giữ nguyên key/kích thước ở `src/render`).

## Multiplayer – cách chạy
Máy chủ không cần cài thêm gói nào (WebSocket tự viết bằng module có sẵn của Node 20+).
```bash
# Cần Node 20+ (test chạy được cả Node 20 nhờ client WebSocket dự phòng)
npm install && npm run build   # build bản web (để máy chủ phục vụ luôn trang chơi)
npm run server                 # http://localhost:8080  (WebSocket: ws://localhost:8080/ws, kiểm tra: /health)
```
- **Chơi thử trên máy tính:** chạy server rồi mở `http://localhost:8080` bằng 2 tab/2 máy → "Nhiều người chơi" → một bên "Tạo phòng", bên kia nhập mã → chủ phòng bấm Bắt đầu.
- **Triển khai thật:** `docker build -t std-server . && docker run -p 8080:8080 std-server`, hoặc dùng `render.yaml` (Render cấp HTTPS/WSS). Trên VPS riêng đặt sau reverse proxy có TLS.
- **APK cần `wss://`** (WebView dùng https nên chặn `ws://`). Nhập địa chỉ `wss://<tên-miền>/ws` ở ô "Địa chỉ máy chủ"; trang web do chính server phục vụ thì tự điền sẵn. Link mời gửi dạng `https://<tên-miền>/?room=CODE`.
- **Link mời trên Android:** workflow tự thêm intent-filter `survivaltd://join` (`tools/patch-manifest.mjs`) và dùng `@capacitor/app`. ⚠️ Chưa thử trên thiết bị; link `https` mở thẳng app (App Links) **chưa làm** vì cần xác minh tên miền.

Giả định thiết kế (có thể đổi): **vàng dùng chung cả đội**; vị trí di chuyển do máy khách báo nhưng server kiểm tra tốc độ/va chạm; không vào giữa ván (chỉ vào lại bằng token); mọi máy phải cùng phiên bản game (server từ chối nếu khác giao thức/cấu hình cân bằng). Băng thông đo được: ~45 KB/s mỗi máy khi có 150 quái (≈160 MB/giờ).

### Thử multiplayer bằng APK (điện thoại) – cách nhanh nhất
APK **không có sẵn máy chủ**: nút "Tạo phòng" chỉ hoạt động khi có máy chủ đang chạy và bạn nhập đúng địa chỉ.
1. **Thử trên Wi-Fi nhà (không cần Internet):** trên máy tính chạy `npm install && npm run build && npm run server`. Xem IP máy tính (Windows: `ipconfig`, ví dụ `192.168.1.10`), cho phép cổng 8080 qua tường lửa. Trong app: Nhiều người chơi → địa chỉ máy chủ `ws://192.168.1.10:8080/ws` → Tạo phòng. Người thứ hai có thể là trình duyệt trên máy tính (`http://192.168.1.10:8080`) hoặc điện thoại khác cùng Wi-Fi, nhập mã phòng để vào.
2. **Chơi qua Internet:** triển khai server (Docker/`render.yaml`) rồi dùng `wss://<tên-miền>/ws`.

APK debug bật `usesCleartextTraffic` và dùng `androidScheme: http` để cho phép `ws://` khi thử nội bộ (`tools/patch-manifest.mjs`, `capacitor.config.json`). Khi phát hành thật chỉ dùng `wss://` thì nên bỏ cleartext. Trong APK ô địa chỉ máy chủ **không** tự điền (vì `localhost` là chính app).

### Những gì CHƯA được kiểm chứng
- Chưa chạy trên **hai điện thoại thật** qua Internet (yêu cầu của đặc tả). Đã kiểm thử: logic server (bộ nhớ), hai client qua WebSocket thật trên localhost (tạo/vào phòng, đồng bộ, xây tháp, mất kết nối + vào lại), và chạy thử scene nhiều người với Phaser giả lập. Chưa kiểm tra: độ trễ mạng thật, hiển thị trên thiết bị, 8 người cùng lúc, tải của server.
- Hồi sinh/độ trễ: khi ping cao, nhân vật của bạn có thể bị server kéo về nếu báo vị trí quá nhanh (kiểm tra có dung sai nhưng chưa tinh chỉnh trên mạng thật).

## Cân bằng 100 đợt (đo bằng mô phỏng)
`node tools/balance.mjs <seed> <số tháp tối đa>` chạy một bot đứng yên ở giữa bản đồ, tự xây/nâng tháp (đặt `IMMORTAL=1` để bot bất tử và chỉ đếm slime lọt qua). Kết quả với bộ thông số hiện tại (3 bản đồ, bot đơn giản, tối đa 16 tháp, người chơi bất tử):
- Slime lọt tới người chơi bắt đầu xuất hiện quanh đợt ~20 và tăng dần về cuối; hàng chờ quái tồn đọng nhiều ở các đợt 80–100.
- Bot thắng đợt 100 ở 2/3 bản đồ; bản đồ còn lại hết thời gian mô phỏng ở đợt 100.
- Bot **không** chạy kéo quái và không dùng kỹ năng nên là cận dưới; bot đứng yên với 3 HP thật thì thua quanh đợt 21 vì để slime lọt. Đây là đo trên mô phỏng, chưa phải người chơi thật: cần chơi thử để chỉnh tiếp `config/waves.js`, `towers.js`, `economy.js`.

## Chạy thử
```bash
npm install
npm test          # kiểm thử bản đồ, Map ID, A*
npm run dev       # mở URL hiển thị (mở bằng điện thoại cùng Wi-Fi để thử cảm ứng)
```
Thêm `?debug=1` vào URL để bật phím dev: `H` bị đánh, `B` xây, `K` chết, `X` diệt slime gần nhất, `Z` xếp thêm 20 slime vào hàng chờ, `G` +500 vàng.

Cấu hình chỉnh không cần sửa code logic: `src/config/slimes.js` (máu, tốc độ, kích thước, vàng), `src/config/waves.js` (công thức đợt), `src/config/economy.js` (vàng, giá, hoàn tiền), `src/config/towers.js` (chỉ số tháp, mốc và hiệu ứng từng bậc nhánh).

Ghi chú: khi bảng chọn nhánh đang mở, ván chơi đơn tạm dừng. Đợt/vàng/cân bằng đang là giá trị khởi đầu để thử nghiệm.

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
server/        máy chủ multiplayer (ws.js WebSocket tối giản, gameServer.js định tuyến, room.js mô phỏng + phòng, index.js HTTP + web)
src/net/       giao thức, NetClient (tự nối lại), Mirror (gương trạng thái), GameSession
src/sim/       logic thuần: monster, world, director, towers (xây/nâng cấp/nhánh/bắn), economy – kiểm thử được không cần Phaser
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
