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

// [추가] 현재 당원이 몇 명인지 세어서 알려주는 주소
app.get('/api/count', async (req, res) => {
  try {
    const client = await db.connect();
    // members 테이블의 전체 행 개수를 셉니다.
    const { rows } = await client.sql`SELECT COUNT(*) FROM members;`;
    client.release();
    
    // { count: 5 } 이런 식으로 결과를 보내줍니다.
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('숫자 세기 에러:', error);
    res.status(500).json({ error: '데이터를 가져올 수 없습니다.' });
  }
});

// [수정] 카테고리별 소식 가져오기
app.get('/api/news', async (req, res) => {
  const category = req.query.category; // 사용자가 클릭한 탭의 카테고리 이름
  try {
    const client = await db.connect();
    let query = 'SELECT * FROM news';
    let params = [];

    // 만약 특정 카테고리가 선택되었다면 해당 것만 조회
    if (category && category !== '전체') {
      query += ' WHERE category = $1';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await client.query(query, params);
    client.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '데이터 로딩 실패' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`미래연대당 서버 가동 중!`));
module.exports = app;




