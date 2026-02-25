const express = require('express');
const path = require('path');
const { db } = require('@vercel/postgres'); 
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// [기능 1] DB 초기화: is_admin 컬럼이 없다면 추가해두는 것이 좋습니다.
async function initDB() {
  try {
    const client = await db.connect();
    // 회원 테이블 생성
    await client.sql`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    // 뉴스 테이블 생성
    await client.sql`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("✅ Neon DB 및 테이블 준비 완료!");
    client.release();
  } catch (err) {
    console.error('DB 연결 에러:', err);
  }
}
initDB();

// --- API 영역 ---

// [기능 2] 당원 가입
app.post('/api/join', async (req, res) => {
  const { name, email } = req.body;
  try {
    const client = await db.connect();
    await client.sql`INSERT INTO members (name, email) VALUES (${name}, ${email});`;
    client.release();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// [기능 3] 당원 수 세기
app.get('/api/count', async (req, res) => {
  try {
    const client = await db.connect();
    const { rows } = await client.sql`SELECT COUNT(*) FROM members;`;
    client.release();
    res.json({ count: rows[0].count });
  } catch (error) {
    res.status(500).json({ error: '데이터 로딩 실패' });
  }
});

// [기능 4] 뉴스 목록 가져오기
app.get('/api/news', async (req, res) => {
  const category = req.query.category;
  try {
    const client = await db.connect();
    let rows;
    if (category && category !== '전체' && category !== '논평·브리핑') {
        const result = await client.query('SELECT * FROM news WHERE category = $1 ORDER BY created_at DESC', [category]);
        rows = result.rows;
    } else {
        const result = await client.query('SELECT * FROM news ORDER BY created_at DESC');
        rows = result.rows;
    }
    client.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: '데이터 로딩 실패' });
  }
});

// [기능 5] 로그인 및 관리자 확인 (통합 및 수정)
app.post('/api/login', async (req, res) => {
  const { name, email } = req.body;
  try {
    const client = await db.connect();
    const { rows } = await client.sql`
      SELECT * FROM members WHERE name = ${name} AND email = ${email} LIMIT 1;
    `;
    client.release();

    if (rows.length > 0) {
      const user = rows[0];
      // 🚩 특정 이메일을 관리자로 지정 (문자열 비교 오타 수정)
      const adminEmail = 'ddanzi@minjoo.kr';
      const isAdmin = (user.email === adminEmail); 

      res.status(200).json({ 
        success: true, 
        userName: user.name, 
        isAdmin: isAdmin 
      });
    } else {
      res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    }
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

// [기능 6] 뉴스 상세 및 등록/삭제
app.get('/api/news/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const client = await db.connect();
    const { rows } = await client.sql`SELECT * FROM news WHERE id = ${id}`;
    client.release();
    rows.length > 0 ? res.json(rows[0]) : res.status(404).send('Not Found');
  } catch (err) { res.status(500).send(err); }
});

app.post('/api/news', async (req, res) => {
  const { title, category, content } = req.body;
  try {
    const client = await db.connect();
    await client.sql`INSERT INTO news (title, category, content, created_at) VALUES (${title}, ${category}, ${content}, NOW());`;
    client.release();
    res.json({ success: true });
  } catch (err) { res.status(500).send(err); }
});

app.delete('/api/news/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const client = await db.connect();
    await client.sql`DELETE FROM news WHERE id = ${id}`;
    client.release();
    res.json({ success: true });
  } catch (err) { res.status(500).send(err); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 미래연대당 서버 가동 중!`));
module.exports = app;












