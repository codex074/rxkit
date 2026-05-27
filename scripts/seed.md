# วิธีสร้างข้อมูลเริ่มต้น (Seed)

## 1. สร้างบัญชี Admin ใน Firebase Authentication

ไปที่ Firebase Console → Authentication → Add user

```
Email: rxopd@rxkit.local
Password: 1234
```

จดบันทึก UID ที่ได้จาก Firebase (เช่น `abc123xyz`)

## 2. สร้าง User Profile ใน Firestore

ไปที่ Firestore → Start collection → ชื่อ `users`

Document ID: UID ที่ได้จากขั้นตอนที่ 1

```json
{
  "uid": "<UID>",
  "username": "RxOPD",
  "usernameLower": "rxopd",
  "email": "rxopd@rxkit.local",
  "displayName": "RxOPD Admin",
  "role": "admin",
  "active": true,
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

## 3. สร้าง App Settings ใน Firestore

Collection: `settings`
Document ID: `app`

```json
{
  "appName": "RxKit",
  "hospitalName": "โรงพยาบาลของคุณ",
  "fiscalYearStartMonth": 10,
  "labelWidthMm": 70,
  "labelHeightMm": 35,
  "labelColumns": 3,
  "labelRows": 8,
  "labelGapMm": 2,
  "labelMarginTopMm": 10,
  "labelMarginLeftMm": 5,
  "labelFontSizePx": 10,
  "updatedAt": "<server timestamp>"
}
```

## 4. สร้าง Unit Types ใน Firestore

Collection: `unitTypes`

สร้าง 5 documents:

```json
{ "name": "ปฐมพยาบาล", "description": "หน่วยปฐมพยาบาลทั่วไป", "active": true, "sortOrder": 1, "createdBy": "<UID>", "updatedBy": "<UID>", "createdAt": "<ts>", "updatedAt": "<ts>" }
{ "name": "รับเสด็จ", "description": "หน่วยรับเสด็จ", "active": true, "sortOrder": 2, "createdBy": "<UID>", "updatedBy": "<UID>", "createdAt": "<ts>", "updatedAt": "<ts>" }
{ "name": "น้ำท่วม", "description": "หน่วยช่วยเหลือน้ำท่วม", "active": true, "sortOrder": 3, "createdBy": "<UID>", "updatedBy": "<UID>", "createdAt": "<ts>", "updatedAt": "<ts>" }
{ "name": "พอ.สว.", "description": "หน่วยแพทย์อาสา พอ.สว.", "active": true, "sortOrder": 4, "createdBy": "<UID>", "updatedBy": "<UID>", "createdAt": "<ts>", "updatedAt": "<ts>" }
{ "name": "อื่นๆ", "description": "หน่วยออกปฏิบัติอื่นๆ", "active": true, "sortOrder": 5, "createdBy": "<UID>", "updatedBy": "<UID>", "createdAt": "<ts>", "updatedAt": "<ts>" }
```

## 5. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 6. เข้าสู่ระบบ

```
ชื่อผู้ใช้: RxOPD
รหัสผ่าน: 1234
```
