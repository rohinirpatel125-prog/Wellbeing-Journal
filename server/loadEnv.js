const path = require('path');
const dotenv = require('dotenv');

[
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
].forEach((envPath) => dotenv.config({ path: envPath }));
