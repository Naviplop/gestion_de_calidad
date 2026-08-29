import argon2 from 'argon2';

(async () => {
  const hash = await argon2.hash('TestPass123!', {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 65536,
    parallelism: 4,
    hashLength: 32,
  });
  console.log('Hash:', hash);
  
  const match = hash.match(/\$argon2id\$v=(\d+)\$m=(\d+),p=(\d+),t=(\d+)\$([^\$]+)\$([^\$]+)/);
  console.log('Match:', match);
  if (match) {
    console.log('Groups:', {
      version: match[1],
      memoryCost: match[2],
      parallelism: match[3],
      timeCost: match[4],
      salt: match[5],
      hashPart: match[6],
      hashLength: match[6]?.length,
    });
  }
})();
