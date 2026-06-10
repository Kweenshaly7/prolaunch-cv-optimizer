// This file is overwritten during CI/CD deployment to inject the API Gateway URL.
// When running locally, it defaults to empty string so requests hit the local server.
window.API_BASE_URL = '';
