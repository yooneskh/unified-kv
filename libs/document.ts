import { database as sharedDatabase } from './bootstrap.ts';
import { createObjectId } from '../utils/object-id.ts';


export class Document<T> {

  database: Deno.Kv;

  constructor(public name: string, database?: Deno.Kv) {
    this.database = database || sharedDatabase;
  }


  async create(document: T): Promise<T> {
    
    const _id = createObjectId();
    
    const doc = {
      ...document,
      _id,
      createdAt: Date.now(),
    };


    await this.database.set([this.name, _id], doc);


    return doc;
    
  }

  async list(): Promise<T[]> {

    const records = this.database.list({
      prefix: [this.name],
    });


    const documents = [];

    for await (const record of records) {
      documents.push(record.value);
    }


    return documents as T[];

  }

  async retrieve(objectId: string): Promise<T> {

    const record = await this.database.get<T>([ this.name, objectId ]);

    if (!record.value) {
      throw new Error('document not found');
    }


    return record.value;

  }

  async update(objectId: string, changes: Partial<T>): Promise<T> {

    if ('_id' in changes || 'createdAt' in changes || 'updatedAt' in changes) {
      throw new Error('changes cannot have _id or createdAt or updatedAt');
    }


    const document = await this.retrieve(objectId);

    const doc = {
      ...document,
      ...changes,
      updatedAt: Date.now(),
    };

    // deno-lint-ignore no-explicit-any
    await this.database.set([this.name, (doc as any)._id], doc);

    return doc;

  }

  async delete(objectId: string) {
    await this.database.delete([ this.name, objectId ]);
  }

  async truncate() {

    const records = await this.list();

    await Promise.all(
      records.map(it =>
        // deno-lint-ignore no-explicit-any
        this.delete((it as any)._id)
      )
    );

  }

}
