# คลังสมบัติ Jittipat_Editz — คู่มือติดตั้ง

เว็บนี้ใช้ **GitHub Pages** (โฮสต์หน้าเว็บ) คู่กับ **Firebase** (เก็บของแจกและระบบล็อกอิน) ทั้งสองใช้ฟรี

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บหลัก |
| `style.css` | หน้าตาและอนิเมชัน |
| `app.js` | การทำงานทั้งหมด |
| `firebase-config.js` | ค่าตั้งค่า Firebase (ต้องแก้ในขั้นตอนที่ 5) |
| `firestore.rules` | กฎความปลอดภัย (คัดลอกไปวางในขั้นตอนที่ 4) |

---

## ส่วน A — ตั้งค่า Firebase

**1. สร้างโปรเจกต์**
เข้า https://console.firebase.google.com ล็อกอินด้วยบัญชี Google → กด **Create a project** → ตั้งชื่อ เช่น `jittipat-vault` → ปิด Google Analytics ได้ → กด Create

**2. เปิดระบบล็อกอิน**
เมนูซ้าย **Build → Authentication** → กด **Get started** → แท็บ **Sign-in method** → เลือก **Email/Password** → เปิด **Enable** (อันบน) → Save

**3. สร้างบัญชีแอดมิน**
ยังอยู่ใน Authentication → แท็บ **Users** → กด **Add user**
- Email: `jittipat_admin@jittipat-vault.app` (ต้องพิมพ์ตรงตัวนี้)
- Password: รหัสที่ต้องการ **อย่างน้อย 6 ตัวอักษร**

ตอนล็อกอินบนเว็บ พิมพ์แค่ `jittipat_admin` กับรหัสผ่านนี้ ไม่ต้องพิมพ์ส่วน @

**4. สร้างฐานข้อมูลและใส่กฎ**
เมนูซ้าย **Build → Firestore Database** → **Create database** → เลือก location `asia-southeast1 (Singapore)` → เลือก **Start in production mode** → Create
จากนั้นแท็บ **Rules** → ลบของเดิมทั้งหมด → วางเนื้อหาจากไฟล์ `firestore.rules` → กด **Publish**

**5. เอาค่าตั้งค่ามาใส่ไฟล์**
กดรูปฟันเฟือง ⚙ ข้าง Project Overview → **Project settings** → เลื่อนลงไปที่ **Your apps** → กดไอคอน **</>** (Web) → ตั้งชื่อแอป → Register app
จะเห็นโค้ด `const firebaseConfig = { ... }` ให้คัดลอกค่าข้างใน (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) ไปแทนค่า `YOUR_...` ในไฟล์ `firebase-config.js` แล้วบันทึก

---

## ส่วน B — ขึ้นเว็บบน GitHub Pages

**6. สร้าง repository**
เข้า https://github.com สมัคร/ล็อกอิน → กด **+** มุมขวาบน → **New repository** → ตั้งชื่อ เช่น `jittipat-vault` → เลือก **Public** → Create repository

**7. อัปโหลดไฟล์**
ในหน้า repository กด **uploading an existing file** (หรือ Add file → Upload files) → ลากไฟล์ทั้ง 5 ไฟล์ (`index.html`, `style.css`, `app.js`, `firebase-config.js`, `firestore.rules`) ลงไป → กด **Commit changes**
ไฟล์ต้องอยู่ชั้นนอกสุดของ repository ไม่ใช่อยู่ในโฟลเดอร์ย่อย

**8. เปิด GitHub Pages**
แท็บ **Settings** → เมนูซ้าย **Pages** → Source เลือก **Deploy from a branch** → Branch เลือก `main` และโฟลเดอร์ `/ (root)` → Save
รอ 1–2 นาที แล้วรีเฟรช จะมีลิงก์เว็บขึ้นด้านบน เช่น `https://ชื่อของคุณ.github.io/jittipat-vault/`

**9. อนุญาตโดเมนให้ล็อกอินได้**
กลับไป Firebase → **Authentication → Settings → Authorized domains** → **Add domain** → ใส่ `ชื่อของคุณ.github.io` (ไม่ต้องมี https และไม่ต้องมีชื่อ repo)

**10. ทดสอบ**
เปิดลิงก์เว็บ → กด **Admin** → ล็อกอินด้วย `jittipat_admin` และรหัสที่ตั้งไว้ → เพิ่มของแจกชิ้นแรก → เปิดหน้า Resource ดูว่าขึ้นแล้ว

---

## คำถามที่พบบ่อย

**ให้คนอื่นช่วยดูแลได้ไหม** ได้ บอกชื่อผู้ใช้และรหัสผ่านให้เขา ใครที่มีรหัสก็เข้า Admin ได้จากทุกเครื่อง

**เปลี่ยนรหัสผ่านยังไง** Firebase → Authentication → Users → กดจุดสามจุดท้ายบัญชี → Reset password หรือลบบัญชีแล้วสร้างใหม่ด้วยอีเมลเดิม

**กันคนสมัครบัญชีเองได้ไหม** กฎใน `firestore.rules` อนุญาตให้แก้ไขได้เฉพาะบัญชี `jittipat_admin` อยู่แล้ว ถ้าอยากปิดเพิ่ม ไปที่ Authentication → Settings → User actions → ปิด **Enable create (sign-up)**

**แก้ไฟล์บน GitHub ทีหลังได้ไหม** ได้ เปิดไฟล์ใน repository → กดรูปดินสอ → แก้ → Commit changes เว็บจะอัปเดตภายใน 1–2 นาที

**หมวด Extension/Script ใช้ยังไง** ในหน้า Admin เลือก "โหมด Extension/Script" ใส่ลิงก์ดาวน์โหลด เลือกประเภท เพิ่มภาพ ScriptUI Panel ได้สูงสุด 6 ภาพ เขียนรายละเอียด และใส่ลิงก์ YouTube สอนใช้งาน (ไม่ใส่ก็ได้ ปุ่มดูวิธีใช้งานจะไม่แสดง)

**ภาพปกใหญ่ได้แค่ไหน** ระบบย่อรูปให้อัตโนมัติก่อนบันทึก ใช้รูปขนาดปกติได้เลย

**เว็บขึ้นว่า "ยังไม่ได้ใส่ค่าตั้งค่า Firebase"** ยังไม่ได้แก้ไฟล์ `firebase-config.js` ตามขั้นตอนที่ 5 หรืออัปโหลดไฟล์เวอร์ชันเก่าขึ้นไป
