declare module "sharp" {
  // sharp export map typings workaround (Next.js 16 + sharp 0.35)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharp: any;
  export default sharp;
}
