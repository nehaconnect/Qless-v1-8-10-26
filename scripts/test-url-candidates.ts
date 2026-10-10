import 'dotenv/config';

const candidates = [
  'https://qless-v1-8-10-26-git-feature-final-seller-order-management-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-order-m-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-order-man-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-order-ma-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-order-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-ord-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-seller-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-selle-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-sell-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-sel-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-se-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-s-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-final-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-f-nehaconnects-projects.vercel.app',
  'https://qless-v1-8-10-26-git-feature-nehaconnects-projects.vercel.app',
];

async function main() {
  console.log('Testing candidates...');
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`STATUS ${res.status}: ${url}`);
      if (res.status === 200 || res.status === 307 || res.status === 308) {
        console.log(`🎉 WORKING URL FOUND: ${url}`);
      }
    } catch (err: any) {
      // console.log(`FAILED: ${url}`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
