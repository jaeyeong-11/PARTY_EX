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

    // 🚩 [수정] 1. 이미 가입된 이메일인지 먼저 조회해봅니다.
    const existCheck = await client.sql`
      SELECT * FROM members WHERE email = ${email} LIMIT 1;
    `;

    if (existCheck.rows.length > 0) {
      // 이미 사람이 있다면 에러 메시지를 보냅니다.
      client.release();
      return res.status(400).json({ error: '이미 가입된 이메일입니다.' });
    }

    // 2. 없는 사람일 때만 가입을 진행합니다.
    await client.sql`
      INSERT INTO members (name, email) VALUES (${name}, ${email});
    `;
    
    client.release();
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('가입 에러:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
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
      
      // 🔍 [진단 로그] 서버 터미널에 true라고 찍히는지 확인해보세요!
      console.log(`로그인 시도: ${user.name}, 관리자여부: ${user.is_admin}`);

      res.status(200).json({ 
        success: true, 
        userName: user.name, 
        isAdmin: user.is_admin // 🚩 DB의 't' 값이 true(boolean)로 전달됩니다.
      });
    } else {
      res.status(404).json({ error: '회원 정보를 찾을 수 없습니다.' });
    }
  } catch (err) { res.status(500).json({ error: '서버 오류' }); }
});

// 📝 [기능 추가] 뉴스 수정하기 (PUT)
app.put('/api/news/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, content } = req.body;
  try {
    const client = await db.connect();
    await client.sql`
      UPDATE news 
      SET title = ${title}, category = ${category}, content = ${content}
      WHERE id = ${id};
    `;
    client.release();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '수정 실패' }); }
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

// [기능 7] 당원광장 (커뮤니티) API

// 1. 글 목록 가져오기
app.get('/api/community', async (req, res) => {
  try {
    const client = await db.connect();
    // 최신 글이 위로 오게 정렬 (ORDER BY id DESC)
    const { rows } = await client.sql`SELECT * FROM community ORDER BY id DESC LIMIT 50`;
    client.release();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: '글 불러오기 실패' }); }
});

// 2. 글 쓰기
app.post('/api/community', async (req, res) => {
  const { title, content, author } = req.body;
  try {
    const client = await db.connect();
    await client.sql`
      INSERT INTO community (title, content, author) 
      VALUES (${title}, ${content}, ${author})
    `;
    client.release();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: '글 저장 실패' }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 미래연대당 서버 가동 중!`));
module.exports = app;
















