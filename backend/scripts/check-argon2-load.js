try {
  const argon2 = require('argon2');
  console.log('argon2 loaded:', typeof argon2);
  console.log('keys:', Object.keys(argon2));
} catch (e) {
  console.log('argon2 load error:', e.message);
}
