import { UserDatabase, awaitTransaction } from './handler';

export class OrderDto {
  id = '';
  symbol = '';
  runnerId = '';
}
// 用户数据
export class DatabaseOrder {
  private database: UserDatabase;
  constructor(databaseName: string) {
    this.database = new UserDatabase(databaseName, async (event) => {
      const db = await this.database.mounted;
      if (!db.objectStoreNames.contains('order')) {
        const objectStore = db.createObjectStore('order', { keyPath: 'id' });
        objectStore.createIndex('symbol', 'symbol', { unique: false });
        objectStore.createIndex('runnerId', 'runnerId', { unique: false });
      }
    });
  }

  async add(order: OrderDto) {
    const db = await this.database.mounted;
    const request = db
      .transaction(['order'], 'readwrite')
      .objectStore('order')
      .add(order);
    return awaitTransaction<OrderDto>(request);
  }
  async read() {
    const db = await this.database.mounted;
    const transaction = db.transaction(['order']);
    const objectStore = transaction.objectStore('order');
    const request = objectStore.get(1);
    return awaitTransaction<OrderDto>(request);
  }
  async readAll() {
    const db = await this.database.mounted;
    const objectStore = db.transaction('order').objectStore('order');
    const request = objectStore.openCursor();
    return awaitTransaction<OrderDto[]>(request);
  }
  async update(order: Partial<OrderDto>) {
    const db = await this.database.mounted;
    const request = db
      .transaction(['order'], 'readwrite')
      .objectStore('order')
      .put(order);
    return awaitTransaction<OrderDto>(request);
  }

  async remove() {
    const db = await this.database.mounted;
    const request = db
      .transaction(['order'], 'readwrite')
      .objectStore('order')
      .delete(1);
    return awaitTransaction<OrderDto>(request);
  }
}
