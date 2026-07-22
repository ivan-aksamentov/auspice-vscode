declare module "*.css"

declare module "*.png" {
  // The client build inlines images as `data:` URLs (see `scripts/build-client.ts`).
  const url: string
  export default url
}
