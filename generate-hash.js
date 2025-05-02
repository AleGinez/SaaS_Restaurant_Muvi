const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin';
  const saltRounds = 10;
  
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Hash para a senha "admin":');
  console.log(hash);
}

generateHash();
