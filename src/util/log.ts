export function debug(...args: any[]): void {
  if (process.env["DEBUG"] === "true") {
    console.log("$", ...args);
  }
}

export function log(...args: any[]): void {
  console.log(">>", ...args);
}
