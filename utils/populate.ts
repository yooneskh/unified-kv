import { registry } from '../libs/populate-registry.ts';
import { trimRecord } from './trim.ts';


export async function populateRecord(database: Deno.Kv, model: string, record: Record<string, unknown>, populate: Record<string, string[]>, keyPrefix = '') {

  if (!record || typeof record !== 'object') {
    return;
  }


  for (const key of Object.keys(record)) {

    const it = record[key];


    const populateSelect = key in populate ? (populate[key]) : (Object.keys(populate).some(k => k.startsWith(key + '.')) ? true : false);

    if (populateSelect === false) {
      continue;
    }


    const targetModel = registry[model][keyPrefix + key];

    const targetPopulate = Object.fromEntries(
      Object.entries(populate)
        .filter(k => k[0].includes('.'))
        .map(k => [k[0].slice(k[0].indexOf('.') + 1), k[1]])
    );


    if (typeof it === 'string') {

      record[key] = (await database.get([ targetModel, it ])).value;

      if (record[key] && Array.isArray(populateSelect)) {
        trimRecord(record[key] as Record<string, unknown>, populateSelect);
      }

      if (record[key]) {
        await populateRecord(database, targetModel, record[key] as Record<string, unknown>, targetPopulate);
      }

    }
    else if (Array.isArray(it) && it.every(x => typeof x === 'string')) {
      record[key] = (await Promise.all(
        it.map(async id => {

          if (typeof id !== 'string') {
            return;
          }


          const doc = (await database.get([ targetModel, id ])).value;

          if (doc && Array.isArray(populateSelect)) {
            trimRecord(doc as Record<string, unknown>, populateSelect);
          }

          if (doc) {
            await populateRecord(database, targetModel, doc as Record<string, unknown>, targetPopulate);
          }


          return doc;

        })
      )).filter(Boolean);
    }
    else if (Array.isArray(it) && it.every(x => typeof x === 'object' && x)) {
      record[key] = (await Promise.all(
        it.map(async childRecord => {
          await populateRecord(database, model, childRecord, targetPopulate, key + '.');
          return childRecord;
        })
      )).filter(Boolean);
    }

  }

}
