// Thêm intent-filter cho link mời survivaltd://join?room=CODE vào AndroidManifest (chạy sau `npx cap add android`). Không làm gì nếu đã có.
import fs from 'node:fs';
const f = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(f, 'utf8');
if (x.includes('android:scheme="survivaltd"')) { console.log('Manifest đã có intent-filter.'); process.exit(0); }
const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="survivaltd" android:host="join" />
            </intent-filter>
        `;
const i = x.indexOf('</activity>'); if (i < 0) { console.error('Không tìm thấy </activity>'); process.exit(1); }
fs.writeFileSync(f, x.slice(0, i) + filter + x.slice(i)); console.log('Đã thêm intent-filter survivaltd://join');
