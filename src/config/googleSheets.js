// Google Sheets Configuration
// Replace this URL with your actual Google Apps Script Web App URL
export const GOOGLE_SHEETS_CONFIG = {
    // Get this URL after deploying your Google Apps Script
    // Instructions in GOOGLE_SHEETS_SETUP.md
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycby7Ivtc0015MGtIcbGH1VZ1wHa78G7zkSiseoSTp9zOCb5LJBc1TG2tdU4Vff5Tb5hwUg/exec',

    // Timeout for requests (milliseconds)
    TIMEOUT: 10000,

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};
