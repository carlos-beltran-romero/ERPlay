import { AppDataSource } from '../src/data-source';

export default async function globalTeardown(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
