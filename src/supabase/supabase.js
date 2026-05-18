import PocketBase from 'pocketbase';

const pb = new PocketBase('https://finance.gtintl.com.ph');
pb.autoCancellation(false);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://udkathvkohktkrswxote.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

const sbHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=minimal"
};

async function syncToSupabase(method, table, data, filter) {
  // Disabled — PocketBase is primary DB, sync-finance service handles Supabase mirroring
  return;
  try {
    let url = SUPABASE_URL + "/rest/v1/" + table;
    if (filter) url += "?" + filter;
    const options = { method: method, headers: sbHeaders };
    if (data) options.body = JSON.stringify(data);
    await fetch(url, options);
  } catch (err) {
    console.warn("Supabase sync failed:", err.message);
  }
}

function mapSortField(field) {
  const map = {
    'created_at': 'created',
    'updated_at': 'updated',
  };
  return map[field] || field;
}

function mapRecord(record) {
  if (!record) return record;
  return {
    ...record,
    created_at: record.created_at || record.created,
    updated_at: record.updated_at || record.updated,
  };
}

function mapRecords(data) {
  if (Array.isArray(data)) return data.map(mapRecord);
  return data;
}

async function fetchAll(collectionName, options) {
  try {
    const result = await pb.collection(collectionName).getFullList(options || {});
    return { data: mapRecords(result), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export const supabase = {
  auth: {
    signInWithPassword: async function(params) {
      try {
        const data = await pb.collection('users').authWithPassword(params.email, params.password);
        return { data: { user: data.record }, error: null };
      } catch (err) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
    },
    signOut: async function() {
      pb.authStore.clear();
      return { error: null };
    },
    getSession: async function() {
      if (pb.authStore.isValid) {
        return { data: { session: { user: pb.authStore.model } }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: function(callback) {
      callback(
        pb.authStore.isValid ? 'SIGNED_IN' : 'SIGNED_OUT',
        pb.authStore.isValid ? { user: pb.authStore.model } : null
      );
      const unsubscribe = pb.authStore.onChange(function(token, model) {
        callback(model ? 'SIGNED_IN' : 'SIGNED_OUT', model ? { user: model } : null);
      });
      return { data: { subscription: { unsubscribe: unsubscribe } } };
    },
  },
  from: function(collectionName) {
    const state = { _sort: null };
    return {
      select: function(fields) {
        return {
          order: function(column, opts) {
            const ascending = opts ? opts.ascending : true;
            const mapped = mapSortField(column);
            state._sort = ascending ? mapped : "-" + mapped;
            return {
              then: function(resolve, reject) {
                return fetchAll(collectionName, { sort: state._sort }).then(resolve, reject);
              },
            };
          },
          eq: function(column, value) {
            return {
              then: function(resolve, reject) {
                return fetchAll(collectionName, {
                  filter: column + '="' + value + '"',
                }).then(resolve, reject);
              },
            };
          },
          then: function(resolve, reject) {
            return fetchAll(collectionName, state._sort ? { sort: state._sort } : {}).then(resolve, reject);
          },
        };
      },
      insert: function(rows) {
        const arr = Array.isArray(rows) ? rows : [rows];
        const doInsert = async function() {
          try {
            const results = await Promise.all(
              arr.map(function(row) { return pb.collection(collectionName).create(row); })
            );
            await Promise.all(
              arr.map(function(row) { return syncToSupabase('POST', collectionName, row, null); })
            );
            return { data: mapRecords(results), error: null };
          } catch (err) {
            return { data: null, error: err };
          }
        };
        return {
          select: function() {
            return { then: function(resolve, reject) { return doInsert().then(resolve, reject); } };
          },
          then: function(resolve, reject) { return doInsert().then(resolve, reject); },
        };
      },
      update: function(updates) {
        return {
          eq: function(column, value) {
            return {
              then: async function(resolve) {
                try {
                  const records = await pb.collection(collectionName).getFullList({
                    filter: column + '="' + value + '"',
                  });
                  const results = await Promise.all(
                    records.map(function(r) { return pb.collection(collectionName).update(r.id, updates); })
                  );
                  await syncToSupabase('PATCH', collectionName, updates, column + "=eq." + value);
                  resolve({ data: mapRecords(results), error: null });
                } catch (err) {
                  resolve({ data: null, error: err });
                }
              },
            };
          },
        };
      },
      delete: function() {
        return {
          eq: function(column, value) {
            return {
              then: async function(resolve) {
                try {
                  const records = await pb.collection(collectionName).getFullList({
                    filter: column + '="' + value + '"',
                  });
                  await Promise.all(
                    records.map(function(r) { return pb.collection(collectionName).delete(r.id); })
                  );
                  await syncToSupabase('DELETE', collectionName, null, column + "=eq." + value);
                  resolve({ data: null, error: null });
                } catch (err) {
                  resolve({ data: null, error: err });
                }
              },
            };
          },
        };
      },
    };
  },
};

export default pb;
