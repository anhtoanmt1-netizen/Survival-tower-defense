# Survival Tower Defense

Game mobile Android 2D pixel art góc nhìn 3/4. Công nghệ: **Phaser 3 + Vite + Capacitor** (web → APK). Build APK bằng **GitHub Actions**.

## Trạng thái hiện tại: v0.5 (nâng cấp toàn diện trên nền Giai đoạn 4)

| Hạng mục | Trạng thái |
|---|---|
| Bản đồ 100x100 theo Map ID, kích thước cấu hình được (40–400) | ✅ có test tự động |
| Sinh địa hình: cây/đá theo cụm (Cellular Automata + Noise), sông cong (Random Walk) có bến cạn, đất trống, bụi cây | ✅ |
| Hậu xử lý + kiểm tra: không vùng cô lập, 8 cổng đều nối tới trung tâm, lối đi ≥ 2 ô, mật độ vật cản | ✅ 300 seed pass |
| Map ID tái tạo chính xác, có phiên bản thuật toán (`edition`) | ✅ |
| Nhân vật nông dân + animation đứng/đi/chạy/xây/bị đánh/chết, màu áo tùy chọn, tên | ✅ (xây/bị đánh/chết chỉ xem được bằng phím debug, chưa có gameplay gọi) |
| Điều khiển: joystick ảo đa điểm, WASD khi chạy trên máy tính (đã bỏ chạm để đi từ v0.5) | ✅ (chưa thử trên thiết bị thật) |
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
| Multiplayer, server, phòng, link mời | ⏳ Giai đoạn 5 |
| Cấu hình chất lượng đồ họa thấp/trung/cao | ⏳ chưa làm (hiệu ứng đã tự giảm mật độ khi quá tải) |

### Nâng cấp v0.5
| Hạng mục | Chi tiết |
|---|---|
| Âm thanh | `systems/Audio.js`: tổng hợp bằng WebAudio (không cần file, chạy offline), nhạc nền nhiều lớp (menu/calm/battle tự đổi theo cường độ trận), SFX cho UI, xây/nâng cấp/tiến hóa, bắn từng hệ, trúng/chí mạng, quái, kỹ năng, đợt/thử thách, thắng/thua. Bus nhạc và hiệu ứng tách riêng, bật/tắt + âm lượng riêng |
| 5 độ khó | `config/difficulty.js` là nơi DUY NHẤT chứa thông số (máu, tốc độ, số lượng, quái mạnh xuất hiện sớm, nhịp đợt, vàng, sức mạnh tháp, giá, hồi chiêu, sát thương chạm). Dễ = hành vi cũ + máu ×1,5. Chọn ở menu, áp dụng đồng bộ cả trận, kỷ lục lưu riêng từng độ khó |
| Giá tháp | Cố định (không tăng theo số tháp/thời gian): 60 ở Dễ/Thường/Khó; 75 Rất Khó; 95 Ác Mộng |
| Chiến đấu | Thanh máu trên đầu quái (vệt trắng tụt dần, tự ẩn sau 3s), số sát thương nổi (thường: trắng nhỏ; chí mạng: vàng to bật nảy + "!"; cháy/băng có màu riêng), ánh sáng cộng màu, vệt đạn, va chạm riêng cho tên/băng/lửa. Hiệu ứng tự giảm mật độ khi quá đông (`config/fx.js`) |
| Bản đồ | Nền/sông/hồ/đá lấy từ `Background.png`, cây từ `Tree.png` (loài chia theo vùng: sồi, thông, vườn táo, hoa anh đào, phong đỏ, tre). Màu đã được làm dịu, các ô có mép mờ chồng lên nhau để hòa thành một. Cây lay nhẹ, lá/cánh hoa rơi. Nền nướng theo mảng khi camera tới gần (bộ nhớ ổn định). Thuật toán **edition 2027** dựng bố cục có chủ đề: quảng trường lát đá, 8 đường quanh co ra 8 cổng, sông vòng cung có bến, hồ + bãi cát, mỗi cung một chủ đề (rừng / vườn cây thành hàng / cụm đá / đồng cỏ), vành đai rừng. Edition 2026 giữ nguyên để Map ID cũ vẫn tái tạo |
| Tháp | Hình từ `Tower.png`: LV1–4 hình đầu; LV5, 7, 9, 12, 15 tiến hóa (hiệu ứng chớp + vòng sáng + âm thanh). Ánh sáng riêng theo nhánh (vàng/xanh băng/cam lửa) và cấp |
| Điều khiển | Đã bỏ hoàn toàn chạm để di chuyển. Chạm bản đồ chỉ chọn tháp. Di chuyển: joystick / WASD |
| Màn hình | Dọc / Ngang / Tự xoay; khi ngang: 19.5:9, 16:9 hoặc Toàn màn hình. Tầm nhìn camera: thanh kéo 7–26 ô + 3 mức Gần (9, như cũ) / Xa (13) / Rộng (18) |
| Cài đặt & UI | Menu Cài đặt thống nhất (menu chính, tạm dừng, nút ⚙ nằm cạnh minimap; trong ván có thêm mục mã bản đồ / chép mã / tạm dừng / về menu). Font Montserrat toàn game. Nút điều khiển mới có khung viền, trạng thái nhấn/sẵn sàng/kích hoạt/hồi chiêu; joystick mới; HUD chỉ hiện chữ, nền trong suốt |

Chỉnh nhanh: `config/difficulty.js` (độ khó), `config/fx.js` (hiệu ứng), `config/art.js` (hình, kích thước hiển thị, vùng loài cây), `config/settings.js` (mặc định cài đặt).

### Hệ thống bản đồ địa hình v0.6 (edition 2028)
Sinh bản đồ từ sprite sheet địa hình mới, **không rải tile ngẫu nhiên**. Toàn bộ nằm ở `src/map/terrain/`.

| Thành phần | Chi tiết |
|---|---|
| **Asset Registry** | `registry.js` (sinh bởi `tools/build_terrain_assets.py`): 51 sprite + 7 texture nền, mỗi asset có ID, tên, nhóm A–E, phân loại (Grass_Base, Dirt_Path, Water_Shore_Sand, Cliff_Water_Edge…), kích thước, loại, layer 1–9, trọng số, cho phép lật/xoay, bbox trên sheet, vùng sử dụng thực tế (usable), nhãn kết nối 4 cạnh N/S/E/W. Vách đá **không bao giờ xoay**; chỉ lật ngang khi registry cho phép |
| **Cắt asset** | `tools/slice_sheet.py` nhận diện vùng alpha (không giả định lưới đều, giữ nguyên pixel rìa), hỗ trợ ghi đè thủ công `tools/manual_crops.json`. `tools/asset-inspector.html` (chạy `npx vite`, mở `/tools/asset-inspector.html`) để kiểm tra bbox/usable, sửa nhóm/metadata, xuất JSON |
| **Chủ đề** | 7 chủ đề, mỗi chủ đề có hàm bố cục riêng (`layouts.js`): MEADOW, RIVER, HIGHLAND, LAKE, FALLS, COAST, WILD. Map ID dạng `LAKE-2028-A8F72K[-150]`; để trống = chọn chủ đề ngẫu nhiên |
| **Giai đoạn sinh** | vùng sinh thái Voronoi (méo bằng nhiễu) → sông (spline Catmull-Rom, bề rộng đổi dần)/hồ/biển/cao nguyên → bảo vệ lõi → nước nông–sâu + bờ cát → vách + thác → mạng đường A* 8 hướng + Chaikin (ngã ba, đường cụt, vòng quanh hồ, bến đá qua nước, dốc qua vách) → đất/hoa → cây/đá/bụi theo mật độ vùng → hậu xử lý lối đi → QA, **tự sinh lại với seed phụ (tất định) nếu lỗi** |
| **Autoterrain** | Nền: trộn các lớp cỏ/hoa/đất/cát/nước nông/nước sâu/đá lát bằng bản đồ lớp bị méo nhiễu → biên bất quy tắc, mềm; bọt sóng ven bờ. Vách: chọn sprite theo hàng xóm (mặt trước / đầu trái / đầu phải / đảo / thác; biến thể ven nước khi phía nam là nước), đối chiếu nhãn cạnh trong registry |
| **Kích thước** | 100 / 150 / 200 cùng một hệ thống: bề rộng sông, vùng vách, vùng sinh thái co giãn theo kích thước; mật độ vật thể giữ tương đối nhất quán; không kéo giãn hình |
| **QA** | `qa.js`: không vũng nước rời rạc, vách đúng hướng, không bờ thẳng quá dài, vật thể không phân bố đều (CV), lõi/cổng thông thoáng; cộng với `validate.js` (kết nối 8 cổng, lối ≥ 2 ô) |
| **Xem trước** | `node tools/preview_map.mjs <MAP-ID> out.png [pixel/ô]` dựng ảnh bằng chính bộ ghép của game |

Giới hạn đã biết (sprite sheet chỉ có vách quay mặt về phía nam, cao 1 ô): vách là các dải thềm 1 ô, không có vách quay bắc/đông/tây hay tầng cao nhiều ô; thác nước là sprite vách có thác (không có dòng nước phía trên). Dòng chảy sông được lưu trong metadata (`terrain.meta.rivers`) nhưng chưa có hoạt ảnh. Hoa là một phần texture nền (không có sprite hoa rời).

### Nâng cấp v0.7 – giao diện, cảnh quan, tùy biến
| Hạng mục | Chi tiết |
|---|---|
| Giao diện đồng bộ | Hệ thiết kế duy nhất trong `index.html` (token màu, panel có header + viền kép, nút đủ trạng thái: thường/hover/nhấn/chọn/vô hiệu/đang xử lý, tab có thanh trượt, công tắc, thanh trượt có giá trị). Bộ icon vector dùng chung DOM + Phaser: `src/ui/icons.js`. Chuyển động ≤ 280ms, tôn trọng `prefers-reduced-motion`. Cài đặt: ngăn kéo bên phải khi ngang, bảng trượt từ dưới khi dọc |
| Cây 2×2 | Bản đồ edition 2028: mỗi cây chiếm đúng 2×2 ô (neo trên lưới chẵn → không tạo khe hẹp), va chạm 4 ô, ảnh 336px sắc nét (hiển thị 112px). Bản đồ cũ giữ cây 1 ô. Loài cây theo vùng; lá/cánh hoa rơi RIÊNG từng loài (`VISUAL.leaf`) |
| Hòa nền | Bóng tiếp đất cho cây/đá/bụi/tháp (`fx_shadow`, depth giữa nền và vật thể), phần đế cây/tháp được làm mờ bằng mặt nạ elip (`tools/build_object_assets.py`), Y-sorting theo chân vật thể |
| Xem trước bản đồ | Menu hiển thị bản đồ thật (cùng bộ ghép của game) + chip đặc điểm; cập nhật khi đổi chủ đề, kích thước hoặc gõ Map ID; "xem gì chơi nấy" |
| Tự tạm dừng | `PauseState` theo LÝ DO (thủ công / cài đặt / bảng tháp / bảng kỹ năng). Tùy chọn bật/tắt, lưu lại. Đóng bảng không làm game chạy tiếp nếu còn lý do dừng khác |
| Chỉnh màu bản đồ | Độ sáng / tương phản / bão hòa ở mức pixel (không CSS filter, không shader); chỉ áp cho nền + cây/đá/bụi/cỏ; xem trực tiếp (giữ thanh kéo → bảng mờ đi); nút khôi phục mặc định |
| Hiệu ứng nước | Tia phản chiếu + gợn sóng bằng sprite có giới hạn (`VISUAL.water`), bật/tắt được; tắt vẫn giữ nền nước tĩnh |
| Cỏ | Cụm cỏ/hoa nhỏ theo vùng (tất định theo Map ID), gió lay nhẹ, nghiêng khi nhân vật bước qua; tắt = cỏ tĩnh |

Mọi thông số (kích thước cây, bóng, nước, cỏ, khoảng chỉnh màu, lá rơi) nằm ở `src/config/visual.js`.

Giới hạn đã biết: sprite chỉ có mặt trước (lật ngang khi đi trái/phải, chưa có mặt sau); nước chưa có animation; đồ họa đang vẽ bằng code (có thể thay bằng sprite sheet thật, giữ nguyên key/kích thước ở `src/render`).

## Cân bằng 100 đợt (đo bằng mô phỏng)
`DIFF=easy|normal|hard|veryHard|nightmare node tools/balance.mjs <seed> <số tháp tối đa>` chạy một bot đứng yên ở giữa bản đồ, tự xây/nâng tháp (đặt `IMMORTAL=1` để bot bất tử và chỉ đếm slime lọt qua). Kết quả với bộ thông số hiện tại (3 bản đồ, bot đơn giản, tối đa 16 tháp, người chơi bất tử):
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
`FOREST-2027-A8F72K` = `chủ đề`-`phiên bản thuật toán`-`seed` (bản đồ mới dùng 2027; ID 2026 cũ vẫn chạy); kích thước khác 100 thì thêm hậu tố, ví dụ `FOREST-2026-A8F72K-150`.
Cùng ID cho đúng cùng bản đồ trên mọi thiết bị. **Không sửa** `forest2026.js` / `forest2027.js` sau khi phát hành; muốn đổi thuật toán hãy thêm edition mới (ví dụ `forest2028.js`) và đăng ký trong `generators/index.js`.

## Cấu trúc
```
src/core/      rng/noise tất định, heap, A*, flow field
src/sim/       logic thuần: monster, world, director, towers (xây/nâng cấp/nhánh/bắn), economy – kiểm thử được không cần Phaser
src/systems/   cầu nối sim → Phaser (MonsterRenderer, pooling sprite)
src/config/    cấu hình chung, chủ đề (themes/)
src/map/       tiles, mapId, generators/ (theo phiên bản), postprocess (dùng chung), validate, grid, gates
src/render/    world.js (nền theo mảng, cây/đá, lá rơi), uiTextures, towerTextures (hiệu ứng), farmer, slime
src/ui/        screen (hướng/tỷ lệ), settingsPanel, ActionButton, panels
public/assets/ tile, vật thể, cây, tháp (cắt từ Background/Tree/Tower.png)
src/render/    texture pixel art, sprite nông dân
src/entities/  Player
src/input/     Joystick
src/scenes/    GameScene (thế giới), UIScene (joystick, minimap)
tests/         kiểm thử tự động
```
Thêm chủ đề mới: tạo `config/themes/<ten>.js`, đăng ký trong `themes/index.js` và `map/generators/index.js`.

## Nâng cấp v0.8 (tường, mở khóa cấp, Build UI, tài nguyên mới)
- **Tường** (`Wall.png`): 1 ô, 5 vàng, chặn đường quái (FlowField + va chạm); kỹ năng Xuyên vật thể vẫn đi qua; chạm 2 lần để phá. Chạy cả chế độ nhiều người (lệnh `wall`/`sellwall`, sự kiện `wl`, `PROTOCOL_VERSION = 2`).
- **Mở khóa cấp độ**: `config/progress.js` — phải thắng tuần tự; cấp khóa bị làm mờ + ổ khóa, không chọn/bắt đầu được.
- **Build UI**: thẻ icon Tháp / Tường, hoạt ảnh mở/đóng.
- **Minimap** dùng cùng bộ ghép địa hình với bản xem trước (cổng, tường, tháp cùng phong cách).
- **Tài nguyên** dựng lại bằng `tools/build_new_assets.py` (nhân vật 12 khung, tháp + đuốc, tường) và `tools/build_object_assets.py` (cây 504px) ở độ phân giải cao hơn để không bị mờ.

## Nâng cấp v0.9
- **Cây** (`Tree.png`): 9 cây tách ở **nguyên độ phân giải gốc** (`tools/build_tree_assets.py`), không còn làm mờ chân/đế và không chỉnh màu → thân và rễ liền một khối. Chiếm 2x2 ô, vẫn lay theo gió và rụng lá/cánh hoa theo từng loài (`VISUAL.leaf`); cây hẹp (thông) co cùng tỉ lệ với các cây khác (`VISUAL.tree.refW`).
- **Tháp và Tường chiếm 2x2 ô** (`ECON.footprint`): (x,y) = ô trên-trái; chặn/giải phóng cả 4 ô, kiểm tra địa hình/ranh giới/nhân vật/đường đi cho cả khối, bắn từ tâm khối. Giá giữ nguyên: tháp 60, tường 5 vàng / công trình. `PROTOCOL_VERSION = 3`.
- **Menu**: sửa lỗi cắt mất phần trên của Preview Map (căn giữa bằng `align-items:center` làm phần đầu không cuộn tới được) → căn giữa an toàn bằng `margin:auto`, áp dụng cho menu chính và các hộp thoại.
- **Nút Camera** cạnh minimap (cùng kích thước/kiểu nút Cài đặt): chạm để đổi tầm nhìn Gần → Xa → Rộng, dùng chung giá trị với mục "Tầm nhìn camera" trong Cài đặt.
