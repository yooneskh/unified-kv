

export let database: Deno.Kv;


export async function bootstrap() {
  database = await Deno.openKv();
}
