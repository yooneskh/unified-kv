import { database as sharedDatabase } from './bootstrap.ts';
import { createObjectId } from '../utils/object-id.ts';
import type { Filter } from '../utils/mongo_types.ts';
import { matches } from 'unified-mongo-filter'


interface IListOptions<T> {
  filter?: Filter<T>;
  limit?: number;
  skip?: number;
};

interface IQueryOptions<T> {
  recordId?: string;
  filter?: Filter<T>;
}

interface IUpdateOptions<T> extends IQueryOptions<T> {
  payload: Partial<T>;
}

interface IReplaceOptions<T> extends IQueryOptions<T> {
  payload: T;
}


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

  async list(options?: IListOptions<T>): Promise<T[]> {

    const records = this.database.list({
      prefix: [this.name],
    });


    const documents = [];
    let skippedCount = 0;

    for await (const record of records) {

      if (options?.filter && !matches(options.filter, record.value)) {
        continue;
      }

      if (options?.limit !== undefined && documents.length >= options.limit) {
        break;
      }

      if (options?.skip !== undefined && skippedCount < options.skip) {
        skippedCount++;
        continue;
      }

      documents.push(record.value);

    }


    return documents as T[];

  }

  async retrieve(options: IQueryOptions<T>): Promise<T> {

    if (!options.filter && !options.recordId) {
      throw new Error('invalid retrieve options');
    }


    if (options.recordId) {

      const record = await this.database.get<T>([ this.name, options.recordId ]);

      if (!record.value) {
        throw new Error('document not found');
      }
      
      if (options.filter && !matches(options.filter, record.value)) {
        throw new Error('document not found');
      }

      return record.value;

    }


    const record = (await this.list({ filter: options.filter, limit: 1 }))[0];

    if (!record) {
      throw new Error('document not found');
    }


    return record;

  }

  async find(options: IQueryOptions<T>): Promise<T | undefined> {

    if (!options.filter && !options.recordId) {
      throw new Error('invalid find options');
    }


    if (options.recordId) {

      const record = await this.database.get<T>([ this.name, options.recordId ]);

      if (!record.value) {
        return undefined
      }
      
      if (options.filter && !matches(options.filter, record.value)) {
        return undefined
      }

      return record.value;

    }


    return (await this.list({ filter: options.filter, limit: 1 }))[0];

  }

  async update(options: IUpdateOptions<T>): Promise<T> {

    if ((!options.recordId && !options.filter) || (!options.payload)) {
      throw new Error('invalid update options');
    }


    if ('_id' in options.payload || 'createdAt' in options.payload || 'updatedAt' in options.payload) {
      throw new Error('payload cannot have _id or createdAt or updatedAt');
    }


    const document = await this.retrieve(options);

    const newDocument = {
      ...document,
      ...options.payload,
      updatedAt: Date.now(),
    };

    // deno-lint-ignore no-explicit-any
    await this.database.set([ this.name, (newDocument as any)._id ], newDocument);

    return newDocument;

  }

  async replace(options: IReplaceOptions<T>): Promise<T> {
    
    if ((!options.recordId && !options.filter) || (!options.payload)) {
      throw new Error('invalid replace options');
    }


    // deno-lint-ignore no-explicit-any
    if ('_id' in (options.payload as any) || 'createdAt' in (options.payload as any) || 'updatedAt' in (options.payload as any)) {
      throw new Error('payload cannot have _id or createdAt or updatedAt');
    }


    const document = await this.retrieve(options);

    const newDocument = {
      ...options.payload,
      // deno-lint-ignore no-explicit-any
      _id: (document as any)._id,
      // deno-lint-ignore no-explicit-any
      createdAt: (document as any).createdAt,
      updatedAt: Date.now(),
    };

    // deno-lint-ignore no-explicit-any
    await this.database.set([ this.name, (newDocument as any)._id ], newDocument);

    return newDocument;

  }

  async delete(options: IQueryOptions<T>): Promise<T> {

    if (!options.filter && !options.recordId) {
      throw new Error('invalid delete options');
    }


    const record = await this.retrieve(options);

    // deno-lint-ignore no-explicit-any
    await this.database.delete([ this.name, (record as any)._id ]);

    return record;

  }

  async truncate() {

    const records = await this.list();

    await Promise.all(
      records.map(it =>
        // deno-lint-ignore no-explicit-any
        this.delete({ recordId: (it as any)._id })
      )
    );

  }

}
