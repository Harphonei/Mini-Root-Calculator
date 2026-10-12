# Mini Root Calculator

เว็บไซต์คำนวณรากของสมการสำหรับวิชา Object-Oriented Programming
ออกแบบในธีมพิกเซลสีม่วง–ชมพู

เว็บไซต์: https://mini-root-calcuator.web.app
Source Code: https://github.com/Harphonei/Mini-Root-Calculator

## ความสามารถ

- คำนวณด้วย Bisection และ False Position
- รับนิพจน์ f(x) ที่ผู้ใช้พิมพ์เอง
- กำหนดช่วงเริ่มต้น, Function Tolerance และ Max Iterations
- แสดงค่ารากประมาณ สถานะ และ Iteration Table
- บันทึกผลพร้อมตารางลง Firebase Firestore
- เปิดประวัติ 20 รายการล่าสุด
- รองรับหน้าจอคอมพิวเตอร์และมือถือ

## เครื่องมือ

- TypeScript, HTML และ CSS
- Vite
- Math.js
- Firebase Authentication แบบ Anonymous
- Firebase Firestore และ Firebase Hosting
- Git และ GitHub

## วิธีใช้งาน

1. เลือก Bisection หรือ False Position
2. กรอกนิพจน์ เช่น x^2 - 2 โดยไม่ใส่ = 0
3. กำหนด Lower Bound และ Upper Bound
4. กำหนด Function Tolerance และ Max Iterations
5. กด Calculate เพื่อดูผลและตาราง
6. กด Save current result เพื่อบันทึกประวัติ

นิพจน์รองรับตัวแปร x, ค่าคงที่ pi และ e,
เครื่องหมาย + - * / ^ และวงเล็บ
รวมถึง sin, cos, exp, log และ sqrt

ต้องเขียนการคูณด้วย * เช่น 2*x
ฟังก์ชันตรีโกณมิติใช้เรเดียน และ log หมายถึงลอการิทึมธรรมชาติ

## เงื่อนไขการคำนวณ

- ฟังก์ชันต้องต่อเนื่องในช่วงที่เลือก
- หากปลายช่วงเป็นราก จะคืนคำตอบทันที
- มิฉะนั้นค่าฟังก์ชันที่ปลายช่วงต้องต่างเครื่องหมาย
- Function Tolerance คือเกณฑ์ของ |f(x)|
- ระบบหยุดเมื่อผ่านเกณฑ์ ใช้รอบครบ หรือค่าประมาณหยุดเปลี่ยน
- คอลัมน์ Change คือความต่างสัมบูรณ์ระหว่างค่าประมาณสองรอบ
  ไม่ใช่ความคลาดเคลื่อนเทียบรากจริง
- ระบบตรวจค่าที่ประเมินไม่ได้ แต่ไม่ได้พิสูจน์ความต่อเนื่อง
  ของนิพจน์ทุกแบบโดยอัตโนมัติ

## การออกแบบ OOP

| หลักการ | การใช้งาน |
|---|---|
| Constructor | รับและตรวจค่าตั้งต้นใน SolverConfig และ Equation |
| Encapsulation | ซ่อนข้อมูลด้วย private และอ่านผ่านเมธอด |
| Inheritance | BisectionSolver และ FalsePositionSolver สืบทอด RootSolver |
| Polymorphism | เรียก solve() ผ่านชนิด RootSolver และใช้สูตรของคลาสลูก |
| Abstraction | RootSolver กำหนด abstract method nextEstimate() |
| Composition | Solver ประกอบด้วย Equation และ SolverConfig; HistoryPanel ใช้ HistoryRepository |

## โครงสร้างสำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| src/domain/Equation.ts | ตรวจนิพจน์และประเมินค่า f(x) |
| src/domain/SolverConfig.ts | เก็บและตรวจค่าตั้งต้น |
| src/domain/RootSolver.ts | จัดการขั้นตอนคำนวณร่วม |
| src/domain/BisectionSolver.ts | สูตร Bisection |
| src/domain/FalsePositionSolver.ts | สูตร False Position |
| src/domain/SolverResult.ts | รูปแบบผลลัพธ์และตาราง |
| src/domain/solverChecks.ts | ชุดตรวจการคำนวณและข้อมูลผิด |
| src/data/firebase.ts | การเชื่อมต่อ Firebase |
| src/data/HistoryRepository.ts | บันทึกและอ่านประวัติ |
| src/ui/HistoryPanel.ts | ส่วนแสดงและบันทึกประวัติ |
| src/main.ts | เชื่อมฟอร์มกับระบบคำนวณ |
| firestore.rules | กฎสิทธิ์และการตรวจข้อมูลประวัติ |

## รันบนเครื่อง

ต้องมี Node.js และ npm

    npm install
    npm run dev

สร้างไฟล์เว็บสำหรับเผยแพร่:

    npm run build

บน Windows PowerShell สามารถใช้ npm.cmd แทน npm ได้

## Firebase

หากนำโปรเจกต์ไปใช้กับ Firebase ของตนเอง:

1. ลงทะเบียน Firebase Web App
2. เปลี่ยน firebaseConfig ใน src/data/firebase.ts
3. เปิด Anonymous Authentication
4. สร้าง Firestore แบบ default
5. Publish กฎจาก firestore.rules
6. ตั้ง Firebase Hosting ให้ใช้โฟลเดอร์ dist

ประวัติอยู่ที่ users/{uid}/calculations/{id}
ผู้ใช้เข้าถึงได้เฉพาะประวัติของตนเอง
Rules ตรวจสิทธิ์และข้อมูลหลัก แต่ไม่ได้คำนวณคำตอบซ้ำ

## ข้อจำกัดของประวัติ

- ใช้บัญชี Anonymous ของเบราว์เซอร์
- ประวัติไม่ย้ายข้ามอุปกรณ์โดยอัตโนมัติ
- การล้างข้อมูลเบราว์เซอร์อาจทำให้เข้าถึงประวัติเดิมไม่ได้
- localhost และเว็บที่เผยแพร่อาจใช้บัญชี Anonymous คนละบัญชี
- การบันทึกและโหลดประวัติต้องเชื่อมต่ออินเทอร์เน็ต
- เวอร์ชันนี้ยังไม่มีการแก้ไขหรือลบประวัติ