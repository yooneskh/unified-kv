

export const registry: Record<string, Record<string, string>> = {};


export function registerPopulate(model: string, field: string, targetModel: string) {

  if (!registry[model]) {
    registry[model] = {};
  }

  registry[model][field] = targetModel;

}
