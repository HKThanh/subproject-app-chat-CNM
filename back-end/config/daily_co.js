require('dotenv').config();

module.exports = {
    dailyApiKey: process.env.DAILY_API_KEY,
    dailyApiUrl: 'https://api.daily.co/v1/rooms',
    daily_subdomain: process.env.DAILY_SUBDOMAIN,
};