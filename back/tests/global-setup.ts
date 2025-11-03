export default async function globalSetup(): Promise<void> {
  process.env.TZ = 'UTC';
}
