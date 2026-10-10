import 'dotenv/config';

const prefixes = [
  'feature-final-seller-order-management',
  'feature-final-seller-order-managemen',
  'feature-final-seller-order-manage',
  'feature-final-seller-order-man',
  'feature-final-seller-order-ma',
  'feature-final-seller-order-m',
  'feature-final-seller-order',
  'feature-final-seller-ord',
  'feature-final-seller-or',
  'feature-final-seller-o',
  'feature-final-seller',
  'feature-final-selle',
  'feature-final-sell',
  'feature-final-sel',
  'feature-final-se',
  'feature-final-s',
  'feature-final',
  'feature-fin',
  'feature-fi',
  'feature-f',
  'feature',
];

async function main() {
  for (const p of prefixes) {
    const url = `https://qless-v1-8-10-26-git-${p}-26a8e3-nehaconnects-projects.vercel.app`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.status === 200) {
        console.log(`🎉 WORKING PREVIEW URL FOUND: ${url}`);
      } else {
        console.log(`STATUS ${res.status}: ${url}`);
      }
    } catch (err: any) {
      console.log(`ERR: ${p} (${err.message})`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
