process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.PORT = process.env.PORT ?? "3001";
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
process.env.PUBLIC_API_BASE_URL =
process.env.PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";
process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
process.env.DB_HOST = process.env.DB_HOST ?? "localhost";
process.env.DB_PORT = process.env.DB_PORT ?? "3306";
process.env.DB_USER = process.env.DB_USER ?? "test";
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? "";
process.env.DB_NAME = process.env.DB_NAME ?? "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.JWT_REFRESH_SECRET =
process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
process.env.JWT_RESET_SECRET =
process.env.JWT_RESET_SECRET ?? "test-reset-secret";
process.env.SMTP_HOST = process.env.SMTP_HOST ?? "smtp.test";
process.env.SMTP_PORT = process.env.SMTP_PORT ?? "465";
process.env.SMTP_USER = process.env.SMTP_USER ?? "test@example.com";
process.env.SMTP_PASS = process.env.SMTP_PASS ?? "password";
process.env.SMTP_FROM = process.env.SMTP_FROM ?? "ERPlay <no-reply@erplay.com>";
process.env.SUPERVISOR_NOTIFY_EMAIL =
process.env.SUPERVISOR_NOTIFY_EMAIL ?? "supervisor@example.com";
