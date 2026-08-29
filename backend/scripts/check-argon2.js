const argon2 = require('argon2');

(async () => {
  try {
    const hash = await argon2.hash('TestPass123!', {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 65536,
      parallelism: 4,
      hashLength: 32,
      saltLength: 16,
    });
    console.log('Hash with saltLength succeeded:', hash.substring(0, 50) + '...');
  } catch (err) {
    console.log('Hash with saltLength failed:', err.message);
  }

  try {
    const hash = await argon2.hash('TestPass123!', {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 65536,
      parallelism: 4,
      hashLength: 32,
    });
    console.log('Hash without saltLength succeeded:', hash.substring(0, 50) + '...');

    const needs = await argon2.needsRehash(hash);
    console.log('needsRehash result:', needs);
  } catch (err) {
    console.log('Hash without saltLength failed:', err.message);
  }
})();
