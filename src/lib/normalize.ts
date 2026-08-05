export function singleRelation<T>(value:T|T[]|null|undefined):T|null{
  if(Array.isArray(value))return value[0]??null;
  return value??null;
}

export function normalizeRows<TInput,TOutput>(rows:TInput[]|null|undefined,mapper:(row:TInput)=>TOutput):TOutput[]{
  return (rows??[]).map(mapper);
}
