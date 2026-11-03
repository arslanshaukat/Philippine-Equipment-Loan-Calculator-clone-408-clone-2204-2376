import PocketBase from 'pocketbase';

// If the Finance app already has a pocketbase client file (e.g. src/lib/pb.js),
// reuse that instance instead of creating a second one — PocketBase auth state
// is tied to the client instance's authStore.
export const pb = new PocketBase('https://finance.gtintl.com.ph/pb-api');

// Keep authStore in sync across tabs
pb.authStore.onChange(() => {
  // no-op placeholder — AuthContext subscribes separately
}, true);

export default pb;
