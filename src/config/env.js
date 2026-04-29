// config/env.js
const ENV = {
  // Use relative path for production, local for development
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "/api",
};

export default ENV;