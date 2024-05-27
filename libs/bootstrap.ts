

export let database: Deno.Kv;


export async function bootstrap(path?: string) {
  database = await Deno.openKv(path);
}
