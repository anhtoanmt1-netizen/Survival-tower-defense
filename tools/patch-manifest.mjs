// Thêm intent-filter cho link mời survivaltd://join?room=CODE vào AndroidManifest (chạy sau `npx cap add android`). Không làm gì nếu đã có.
import fs from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(f, 'utf8');
let changed = false;
// Cho phép ws:// (cleartext) để thử qua Wi-Fi nội bộ. Khi phát hành thật chỉ dùng wss:// thì hãy bỏ dòng này.
if (!x.includes('android:usesCleartextTraffic')) { x = x.replace('<application', '<application android:usesCleartextTraffic="true"'); changed = true; console.log('Đã bật usesCleartextTraffic (ws:// cho thử nghiệm).'); }
if (x.includes('android:scheme="survivaltd"')) { if (changed) fs.writeFileSync(f, x); console.log('Manifest đã có intent-filter.'); process.exit(0); }
const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="survivaltd" android:host="join" />
            </intent-filter>
        `;
const i = x.indexOf('</activity>'); if (i < 0) { console.error('Không tìm thấy </activity>'); process.exit(1); }
x = x.slice(0, i) + filter + x.slice(i); fs.writeFileSync(f, x); console.log('Đã thêm intent-filter survivaltd://join');
