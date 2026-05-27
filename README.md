# ยาออกหน่วย (RxKit)

ระบบจัดเตรียมยาสำหรับหน่วยออกปฏิบัติ (Field/Outreach Unit)

---

## ภาพรวม

**ยาออกหน่วย (RxKit)** คือเว็บแอปพลิเคชันสำหรับงานเภสัชกรรม ช่วยให้เจ้าหน้าที่สามารถ:

- จัดเตรียมรายการยาสำหรับหน่วยออกปฏิบัติ (ปฐมพยาบาล, รับเสด็จ, น้ำท่วม, พอ.สว. ฯลฯ)
- พิมพ์ใบตรวจสอบยา A4
- พิมพ์ฉลากยาขนาด label สำเร็จรูป
- บันทึกข้อมูลประจำปีงบประมาณไทย

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Auth:** Firebase Authentication (email/password)
- **Database:** Cloud Firestore
- **Hosting:** Firebase Hosting
- **UI:** Lucide React icons, Sonner toasts

---

## การสร้าง Firebase Project

### 1. สร้าง Firebase Project

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. คลิก **Add project**
3. ตั้งชื่อโปรเจค เช่น `rxkit`
4. เปิดใช้ Google Analytics (ตามต้องการ)
5. คลิก **Create project**

### 2. เปิดใช้ Firebase Authentication

1. ไปที่ **Build → Authentication → Get started**
2. เลือก **Email/Password** → เปิดใช้งาน → Save

### 3. เปิดใช้ Cloud Firestore

1. ไปที่ **Build → Firestore Database → Create database**
2. เลือก **Start in production mode**
3. เลือก Region ที่ใกล้ที่สุด (เช่น `asia-southeast1`)
4. คลิก **Done**

### 4. รับ Firebase Config

1. ไปที่ **Project settings (⚙)** → **General**
2. เลื่อนลงไปที่ **Your apps** → คลิก **</> (Web)**
3. ตั้งชื่อ App เช่น `rxkit-web`
4. คัดลอก `firebaseConfig` object

---

## การติดตั้งและรัน

### 1. สร้างไฟล์ .env

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ใส่ค่าจาก Firebase:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

### 2. ติดตั้ง dependencies

```bash
npm install
```

### 3. รัน development server

```bash
npm run dev
```

เปิด http://localhost:5173

---

## การสร้างข้อมูลเริ่มต้น (Seed)

### สร้างบัญชี Admin

**ขั้นตอนที่ 1: สร้างใน Firebase Authentication**

1. ไปที่ Firebase Console → **Authentication → Users → Add user**
2. กรอก:
   - Email: `rxopd@rxkit.local`
   - Password: `1234`
3. บันทึก UID ที่ได้ (เช่น `abc123xyz`)

**ขั้นตอนที่ 2: สร้าง User Profile ใน Firestore**

1. ไปที่ **Firestore → Start collection**
2. Collection ID: `users`
3. Document ID: UID จากขั้นตอนที่ 1
4. เพิ่ม fields:

```
uid: "abc123xyz"         (string)
username: "RxOPD"         (string)
usernameLower: "rxopd"    (string)
email: "rxopd@rxkit.local" (string)
displayName: "RxOPD Admin" (string)
role: "admin"             (string)
active: true              (boolean)
createdAt: (timestamp ปัจจุบัน)
updatedAt: (timestamp ปัจจุบัน)
```

**ขั้นตอนที่ 3: สร้าง App Settings**

Collection: `settings`, Document ID: `app`

```
appName: "RxKit"              (string)
hospitalName: "โรงพยาบาลของคุณ" (string)
fiscalYearStartMonth: 10       (number)
labelWidthMm: 70               (number)
labelHeightMm: 35              (number)
labelColumns: 3                (number)
labelRows: 8                   (number)
labelGapMm: 2                  (number)
labelMarginTopMm: 10           (number)
labelMarginLeftMm: 5           (number)
labelFontSizePx: 10            (number)
updatedAt: (timestamp ปัจจุบัน)
```

**ขั้นตอนที่ 4: สร้าง Unit Types**

Collection: `unitTypes` — สร้าง 5 documents:

| name | description | sortOrder | active |
|------|-------------|-----------|--------|
| ปฐมพยาบาล | หน่วยปฐมพยาบาลทั่วไป | 1 | true |
| รับเสด็จ | หน่วยรับเสด็จ | 2 | true |
| น้ำท่วม | หน่วยช่วยเหลือน้ำท่วม | 3 | true |
| พอ.สว. | หน่วยแพทย์อาสา | 4 | true |
| อื่นๆ | หน่วยออกปฏิบัติอื่นๆ | 5 | true |

เพิ่ม fields `createdBy`, `updatedBy` เป็น UID ของ admin, และ `createdAt`, `updatedAt` เป็น timestamp

---

## Deploy Firestore Rules

```bash
# ติดตั้ง Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# เชื่อมโปรเจค
firebase use your-project-id

# Deploy rules และ indexes
firebase deploy --only firestore:rules,firestore:indexes
```

---

## การ Deploy ไปยัง Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

---

## วิธีใช้งาน

### เข้าสู่ระบบ

```
ชื่อผู้ใช้: RxOPD
รหัสผ่าน: 1234
```

### จัดการรายการยา (Drug-list)

1. ไปที่เมนู **รายการยา**
2. คลิก **เพิ่มยา** เพื่อเพิ่มยาใหม่
3. กรอกข้อมูล: รหัสยา, ชื่อยา, ความแรง, รูปแบบ, หน่วย, ราคา, วิธีใช้, คำเตือน
4. คลิก **บันทึก**
5. แก้ไขยา: คลิกปุ่ม ✏️ (ดินสอ)
6. ปิดใช้งานยา: คลิกปุ่ม ❌ (กากบาท)

### จัดการประเภทหน่วย

1. ไปที่เมนู **ประเภทหน่วย** (Admin เท่านั้น)
2. คลิก **เพิ่มประเภทหน่วย**
3. กรอกชื่อและคำอธิบาย
4. คลิก **บันทึก**

### จัดการชุดยาเริ่มต้น

1. ไปที่เมนู **ชุดยาเริ่มต้น** (Admin เท่านั้น)
2. เลือก **ประเภทหน่วย**
3. คลิก **เพิ่มยา** เพื่อเพิ่มยาในชุด
4. แก้ไขจำนวนต่อชุดได้โดยตรงในตาราง
5. ลบยาออกจากชุดโดยคลิก 🗑️ (ถังขยะ)

### จัดยาออกหน่วย

1. คลิก **จัดยาออกหน่วย** บนหน้าหลัก
2. เลือก **ประเภทหน่วย** → ระบบโหลดชุดยาอัตโนมัติ
3. กรอก: วันที่, สถานที่, ผู้รับผิดชอบ, จำนวนชุด
4. แก้ไขรายการยาตามต้องการ (เพิ่ม/ลบ/แก้จำนวน)
5. คลิก **บันทึกรายการ**

### พิมพ์ใบตรวจสอบ (Checklist A4)

1. เปิดรายการที่ต้องการพิมพ์
2. คลิก **พิมพ์ใบตรวจสอบ**
3. คลิก **พิมพ์** หรือกด Ctrl+P

### พิมพ์ฉลากยา

1. เปิดรายการที่ต้องการพิมพ์
2. คลิก **พิมพ์ฉลากยา**
3. คลิก **พิมพ์** หรือกด Ctrl+P
4. ตั้งค่าฉลาก: ไปที่ **ตั้งค่า** เพื่อปรับขนาดและ layout

---

## บทบาทผู้ใช้

| บทบาท | สิทธิ์ |
|--------|---------|
| admin | จัดการทุกอย่าง รวมถึง Drug-list, Unit Types, Default Sets, Settings |
| staff | สร้างและดูรายการยาออกหน่วย, พิมพ์ |
| viewer | ดูข้อมูลและพิมพ์เท่านั้น |

---

## ข้อจำกัดของ Version 1

- ไม่มีรายงานการใช้ยา
- ไม่มีสรุปมูลค่ายา
- ไม่มีกราฟและสถิติ
- ไม่มีระบบ Stock
- ไม่มีการ Export PDF
- รองรับ 1 โรงพยาบาลต่อ Firebase Project
- ฉลากยาใช้การแสดงผล CSS (ไม่ใช่ PDF)

---

## Roadmap (อนาคต)

- รายงานการใช้ยาตามปีงบประมาณ
- สรุปมูลค่ายาต่อครั้งที่ออกหน่วย
- Export PDF
- ระบบ Stock
- แจ้งเตือนยาใกล้หมด
- รองรับหลายโรงพยาบาล
- นำเข้าข้อมูลจาก CSV/Excel
