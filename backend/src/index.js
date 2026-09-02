require('dotenv').config();
const { createApp } = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`baryar-api listening on ${PORT}`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
