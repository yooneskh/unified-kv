import { assertEquals, assertExists, assertFalse, assertGreaterOrEqual, assertRejects } from 'assert';
import { Document, bootstrap } from '../mod.ts';

await bootstrap();


interface User {
  _id?: string;
  createdAt?: number;
  updatedAt?: number;
  name: string;
  age: number;
  address: {
    _id?: string;
    street: string;
    createdAt?: string;
    updatedAt?: string;
  },
  streets?: {
    _id?: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
  }[]
}

const model = new Document<User>('users');
await model.truncate();


Deno.test('create return value', async () => {

  const document = await model.create({
    name: 'Yoones',
    age: 22,
    address: {
      street: 'Mantegh',
    },
  });

  assertExists(document._id);
  assertExists(document.createdAt);
  assertEquals(document.name, 'Yoones');
  assertEquals(document.age, 22);
  assertEquals(document.address.street, 'Mantegh');

});

Deno.test('create retrieve', async () => {

  const obj = await model.create({
    name: 'Yoones2',
    age: 23,
    address: {
      street: 'Mantegh',
    },
  });


  const document = await model.retrieve({ recordId: obj._id! });

  assertExists(document._id);
  assertExists(document.createdAt);
  assertEquals(document.name, 'Yoones2');
  assertEquals(document.age, 23);
  assertEquals(document.address.street, 'Mantegh');

});

Deno.test('list basic', async () => {
  const records = await model.list();
  assertGreaterOrEqual(records.length, 0);
});

Deno.test('create delete', async () => {

  const obj = await model.create({
    name: 'Yoones3',
    age: 24,
    address: {
      street: 'Mantegh',
    },
  });


  const document = await model.retrieve({ recordId: obj._id! });

  assertExists(document._id);
  assertExists(document.createdAt);
  assertEquals(document.name, 'Yoones3');
  assertEquals(document.age, 24);
  assertEquals(document.address.street, 'Mantegh');
  
  await model.delete({ recordId: document._id });

  assertRejects(() => model.retrieve({ recordId: document._id! }))

});

Deno.test('create update', async () => {

  const obj = await model.create({
    name: 'Yoones6',
    age: 26,
    address: {
      street: 'Mantegh',
    },
  });


  const document1 = await model.retrieve({ recordId: obj._id! });

  assertExists(document1._id);
  assertExists(document1.createdAt);
  assertEquals(document1.name, 'Yoones6');
  assertEquals(document1.age, 26);
  assertEquals(document1.address.street, 'Mantegh');


  const changedObj = await model.update({
    recordId: document1._id,
    payload: {
      name: 'Yoones7',
      age: 27,
      address: undefined,
      streets: [
        {
          name: 'Mantegh',
        }
      ],
    },
  });

  assertExists(changedObj._id);
  assertExists(changedObj.createdAt);
  assertExists(changedObj.updatedAt);
  assertEquals(changedObj.name, 'Yoones7');
  assertEquals(changedObj.age, 27);
  assertFalse(changedObj.address);
  assertEquals(changedObj.streets?.[0].name, 'Mantegh');


  const document2 = await model.retrieve({ recordId: changedObj._id! });

  assertExists(document2._id);
  assertExists(document2.createdAt);
  assertExists(document2.updatedAt);
  assertEquals(document2.name, 'Yoones7');
  assertEquals(document2.age, 27);
  assertFalse(document2.address);
  assertEquals(document2.streets?.[0].name, 'Mantegh');

});

Deno.test('listing', async () => {

  await model.create({
    name: 'YoonesList',
    age: 26,
    address: {
      street: 'Mantegh',
    },
  });

  await model.create({
    name: 'YoonesList',
    age: 26,
    address: {
      street: 'Mantegh',
    },
  });

  await model.create({
    name: 'YoonesList',
    age: 26,
    address: {
      street: 'Mantegh',
    },
  });

  await model.create({
    name: 'YoonesList',
    age: 26,
    address: {
      street: 'Mantegh',
    },
  });


  const list1 = await model.list({
    filter: {
      name: 'YoonesList',
    },
  });

  assertEquals(list1.length, 4);

});
