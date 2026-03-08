/* eslint-disable no-console */
async function run() {
  try {
    const { build } = await import('vite');
    await build({ configFile: true });
    console.log('Vite build completed');
  } catch (err) {
    console.error('Vite build failed:', err);
    process.exit(1);
  }
}
run();