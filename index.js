const express = require('express');
const app = express();

// ⭐ 마법의 한 줄: 'public' 폴더 안의 파일들을 누구나 주소로 볼 수 있게 공개합니다!
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('이미지 호스팅 서버가 쌩쌩하게 돌아가고 있습니다! 🖼️');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`서버 켜짐! 포트: ${port}`);
});

// Vercel을 위해 썼던 코드는 그대로 둡니다.
module.exports = app;