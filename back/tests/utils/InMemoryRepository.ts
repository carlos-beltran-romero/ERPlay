import crypto from 'node:crypto';
import { DeepPartial } from 'typeorm';

export class InMemoryRepository<T extends { id?: string }> {
  private items: T[] = [];

  constructor(private readonly factory: () => T) {}

  clear() {
    this.items = [];
  }

  setItems(items: T[]) {
    this.items = items.map((item) => this.clone(item));
  }

  create(entity: DeepPartial<T>): T {
    const instance = this.factory();
    return Object.assign(instance, entity);
  }

  async save(entity: DeepPartial<T> | Array<DeepPartial<T>>): Promise<T | T[]> {
    if (Array.isArray(entity)) {
      const saved = await Promise.all(entity.map((item) => this.save(item) as Promise<T>));
      return saved;
    }

    const now = new Date();
    const target = entity as T;

    if (!target.id) {
      target.id = crypto.randomUUID();
      if ('createdAt' in target) {
        (target as any).createdAt = now;
      }
    }

    if ('updatedAt' in target) {
      (target as any).updatedAt = now;
    }

    const index = target.id ? this.items.findIndex((item) => item.id === target.id) : -1;

    if (index >= 0) {
      this.items[index] = Object.assign(this.items[index], target);
      return this.clone(this.items[index]);
    }

    const stored = this.clone(target);
    this.items.push(stored);
    return this.clone(stored);
  }

  async findOneBy(where: Partial<T>): Promise<T | null> {
    const found = this.items.find((item) => this.matches(item, where));
    return found ? this.clone(found) : null;
  }

  async findOne(options: { where: Partial<T> }): Promise<T | null> {
    return this.findOneBy(options.where);
  }

  async remove(entity: T): Promise<T> {
    if (!entity.id) {
      return entity;
    }

    this.items = this.items.filter((item) => item.id !== entity.id);
    return entity;
  }

  all() {
    return this.items.map((item) => this.clone(item));
  }

  private matches(entity: any, where: any): boolean {
    return Object.entries(where ?? {}).every(([key, value]) => {
      const entityValue = entity[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (entityValue == null) return false;
        return this.matches(entityValue, value);
      }
      return entityValue === value;
    });
  }

  private clone(entity: T): T {
    return Object.assign(this.factory(), entity);
  }
}
