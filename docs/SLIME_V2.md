# Hệ Slime V2 (chế độ đơn)

30 slime (6 nhóm) + 10 boss (wave 10…100), dữ liệu tách rời, chạy ở **chế độ đơn**. Multiplayer/server vẫn dùng slime cũ (`config/slimes.js`) nên `configChecksum` không đổi.

## Bật / tắt / chỉnh
`src/config/slimeRuntime.js` → `SLIME_V2`:
- `enabled` — false: toàn bộ chế độ đơn quay về slime cũ.
- `maxWave` — tới wave này dùng V2 (mặc định 100).
- `hpScale`, `bossHpScale` — nhân máu catalog khi vào game (chỉnh cân bằng ở đây).
- `maxActiveHard` — trần cứng quái đồng thời (kể cả quái do kỹ năng sinh).
- `skillDamage` — số tim mất mỗi đòn kỹ năng (nhân với sát thương chạm của độ khó).

## Cấu trúc
| Tệp | Vai trò |
|---|---|
| `config/slimeStatus.js` | Burn/Freeze/Poison/Shock/Slow/Stun/Shield + phản ứng (tan chảy, dập lửa, vỡ băng, khói độc, dấu sét…) |
| `config/slimeSkills.js` | ~80 kỹ năng (18 kỹ năng chính) |
| `config/slimeCatalog.js` | 30 slime: chỉ số, thân, bảng màu, lõi, chuyển động, VFX, kỹ năng |
| `config/slimeBosses.js` | 10 boss, ≥3 pha, ≥3 kỹ năng mỗi boss |
| `config/slimeWaves.js` | Phân bổ 100 wave / 10 chương, wave đặc biệt, `planWave` |
| `config/slimeRuntime.js` | Cầu nối sang mô phỏng (`v2_<id>`), miễn nhiễm, hệ số cân bằng |
| `sim/status.js`, `sim/slimeRuntime.js` | Trạng thái và runtime kỹ năng (thuần, không Phaser) |
| `render/slimeArt.js` | Vẽ sprite "giả 3D" bằng canvas 2D (40 slime/boss, 16 khung mỗi con) |
| `render/slimeArtPhaser.js` | Tạo texture + anim `slime_v2_<id>:idle|move|die` khi lần đầu cần |

## Kỹ năng đã chạy
projectile, zone (tròn/vòng/quạt), aura (sát thương / hồi máu / giải trạng thái / tăng tốc đồng đội), buff (giáp, tốc độ, né, bất hoại, tàng hình, chu kỳ nguyên tố), shield, summon (có cap, bản sao không triệu hồi tiếp), spawnSplit, drain (đồng đội / người chơi / tháp), chain, teleport, dash, kéo người chơi, hợp nhất, đổi nguyên tố, hồi sinh, hồi máu liên tục, hút máu, nổi giận dưới 30% máu, debuff lên tháp (ảo giác, khóa nhánh, làm chậm tốc bắn), chuyển pha boss (vùng hư không, nuốt slime nhỏ, sương độc bị động, hợp lại tinh thể).

## Chưa có / giản lược
- Trạng thái lên người chơi (làm chậm, đóng băng): kỹ năng chỉ gây sát thương.
- Phản sát thương: quy đổi thành giáp (tháp không có máu).
- Multiplayer: chưa hỗ trợ V2 (cần nâng giao thức).

## Kiểm thử
`node --test` (168+ test: dữ liệu, trạng thái, runtime, wave 1–100, kỹ năng). Cân bằng: `V2=1 IMMORTAL=1 STOPWAVE=60 node tools/balance.mjs <seed> <số tháp>`.
