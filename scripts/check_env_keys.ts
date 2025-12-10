
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
const config = dotenv.config({ path: envPath }).parsed;

if (config) {
    console.log('Keys found in .env.local:', Object.keys(config));
} else {
    console.log('Failed to parse .env.local');
}
