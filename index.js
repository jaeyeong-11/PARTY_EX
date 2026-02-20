const express = require('express');
const path = require('path');
const app = express();

// 정적 파일(HTML, CSS, JS) 제공
app.use(express.static(path.join(__dirname, 'public')));

// 가상의 지지자 수 데이터 (서버가 켜져 있는 동안 유지됨)
let supportCount = 1245678;

// 지지하기 버튼을 눌렀을 때 호출될 API
app.get('/api/support', (req, res) => {
    supportCount++;
    res.json({ count: supportCount });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`정당 본부 서버 가동 중: http://localhost:${port}`);
});

module.exports = app;
