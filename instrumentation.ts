export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { runMigrations } = await import("./lib/run-migrations");
  await runMigrations();
}
