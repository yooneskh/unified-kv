import { matches } from 'unified-mongo-filter'
import { database as sharedDatabase } from './bootstrap.ts';
import { createObjectId } from '../utils/object-id.ts';
import type { Filter } from '../utils/mongo_types.ts';
import { populateRecord } from '../utils/populate.ts';
import { trimRecord } from '../utils/trim.ts';


export interface IBaseDocument {
  _id: string;
  createdAt: number;
  updatedAt?: number;
}


interface IListOptions<T> {
  filter?: Filter<T & IBaseDocument>;
  limit?: number;
  skip?: number;
  populate?: Record<string, string[]>;
  select?: string[];
};

interface IQueryOptions<T> {
  recordId?: string;
  filter?: Filter<T & IBaseDocument>;
}

interface IRetrieveOptions<T> extends IQueryOptions<T> {
  populate?: Record<string, string[]>;
  select?: string[];
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


  async create(document: T): Promise<T & IBaseDocument> {
    
    const _id = createObjectId();
    
    const doc = {
      ...document,
      _id,
      createdAt: Date.now(),
    };


    await this.database.set([this.name, _id], doc);


    return doc;
    
  }

  async list(options?: IListOptions<T>): Promise<(T & IBaseDocument)[]> {

    const records = this.database.list<T & IBaseDocument>({
      prefix: [this.name],
    });


    const documents = [];
    let skippedCount = 0;

    for await (const record of records) {

      const recordValue = record.value;

      if (options?.filter && !matches(options.filter, recordValue)) {
        continue;
      }

      if (options?.limit !== undefined && documents.length >= options.limit) {
        break;
      }

      if (options?.skip !== undefined && skippedCount < options.skip) {
        skippedCount++;
        continue;
      }


      if (options?.populate) {
        await populateRecord(this.database, this.name, recordValue as Record<string, unknown>, options.populate);
      }

      if (options?.select) {
        trimRecord(recordValue as Record<string, unknown>, options.select)
      }


      documents.push(recordValue);

    }


    return documents;

  }

  async retrieve(options: IRetrieveOptions<T>): Promise<T & IBaseDocument> {

    if (!options.filter && !options.recordId) {
      throw new Error('invalid retrieve options');
    }


    if (options.recordId) {

      const record = await this.database.get<T & IBaseDocument>([ this.name, options.recordId ]);
      const recordValue = record.value;

      if (!recordValue) {
        throw new Error('document not found');
      }
      
      if (options.filter && !matches(options.filter, recordValue)) {
        throw new Error('document not found');
      }


      if (options.populate) {
        await populateRecord(this.database, this.name, recordValue as Record<string, unknown>, options.populate);
      }

      if (options.select) {
        trimRecord(recordValue as Record<string, unknown>, options.select);
      }


      return recordValue;

    }


    const recordValue = (await this.list({ filter: options.filter, populate: options.populate, select: options.select, limit: 1 }))[0];

    if (!recordValue) {
      throw new Error('document not found');
    }


    if (options.populate) {
      await populateRecord(this.database, this.name, recordValue as Record<string, unknown>, options.populate);
    }

    if (options.select) {
      trimRecord(recordValue as Record<string, unknown>, options.select);
    }


    return recordValue;

  }

  async find(options: IRetrieveOptions<T>): Promise<(T & IBaseDocument) | undefined> {

    if (!options.filter && !options.recordId) {
      throw new Error('invalid find options');
    }


    if (options.recordId) {

      const record = await this.database.get<T & IBaseDocument>([ this.name, options.recordId ]);
      const recordValue = record.value;

      if (!recordValue) {
        return undefined
      }

      if (options.filter && !matches(options.filter, recordValue)) {
        return undefined
      }


      if (options.populate) {
        await populateRecord(this.database, this.name, recordValue as Record<string, unknown>, options.populate);
      }

      if (options.select) {
        trimRecord(recordValue as Record<string, unknown>, options.select);
      }


      return recordValue;

    }


    const recordValue = (await this.list({ filter: options.filter, populate: options.populate, select: options.select, limit: 1 }))[0];


    if (options.populate) {
      await populateRecord(this.database, this.name, recordValue as Record<string, unknown>, options.populate);
    }

    if (options.select) {
      trimRecord(recordValue as Record<string, unknown>, options.select);
    }


    return recordValue;

  }

  async update(options: IUpdateOptions<T>): Promise<T & IBaseDocument> {

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

  async replace(options: IReplaceOptions<T>): Promise<T & IBaseDocument> {
    
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
      _id: document._id,
      createdAt: document.createdAt,
      updatedAt: Date.now(),
    };

    await this.database.set([ this.name, newDocument._id ], newDocument);

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
        this.delete({ recordId: it._id })
      )
    );

  }

}
