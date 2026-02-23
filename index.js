const express = require('express');
const path = require('path');
const { db } = require('@vercel/postgres'); // Neon DB와 연결하는 도구
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// [기능 1] 장부 표(members)가 없으면 자동으로 만들기
async function initDB() {
  try {
    const client = await db.connect();
    await client.sql`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Neon 장부 준비 완료!");
    client.release();
  } catch (err) {
    console.error('DB 연결 에러:', err);
  }
}
initDB();

// [기능 2] 당원 가입 데이터 저장하기
app.post('/api/join', async (req, res) => {
  const { name, email } = req.body;
  try {
    const client = await db.connect();
    // 실제 Neon 데이터베이스에 저장하는 명령
    await client.sql`
      INSERT INTO members (name, email)
      VALUES (${name}, ${email});
    `;
    client.release();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('저장 중 에러 발생:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`미래연대당 서버 가동 중!`));
module.exports = app;

