

export function trimRecord(record: Record<string, unknown>, select: string[]) {

  if (!record || typeof record !== 'object') {
    return;
  }


  if (Array.isArray(record)) {
    for (const it of record) {
      trimRecord(it, select);
    }
  }
  else {
    // todo: increase performance of trimming
    for (const key of Object.keys(record)) {
      if (!select.includes(key)) {
        delete record[key];
      }
    }
  }


  return record;

}
