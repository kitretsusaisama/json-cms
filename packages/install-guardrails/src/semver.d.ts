declare module "semver" {
  export interface Options {
    includePrerelease?: boolean;
  }

  export function validRange(range: string, options?: Options): string | null;
  export function satisfies(version: string, range: string, options?: Options): boolean;

  const semver: {
    validRange: typeof validRange;
    satisfies: typeof satisfies;
  };

  export default semver;
}
