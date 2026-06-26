with open('/home/arslan/app/src/components/PriceListModule.jsx', 'r') as f:
    content = f.read()

# 1. Add the pb import
old_import = "import UnitDetailModal from './UnitDetailModal';"
new_import = "import UnitDetailModal from './UnitDetailModal';\nimport pb from '../supabase/supabase';"
if old_import not in content:
    print("ERROR: import anchor not found.")
    raise SystemExit(1)
content = content.replace(old_import, new_import, 1)

# 2. Add jobOrderUnits state
old_state = "const [selectedUnit, setSelectedUnit] = useState(null);"
new_state = old_state + "\n  const [jobOrderUnits, setJobOrderUnits] = useState({});"
if old_state not in content:
    print("ERROR: state anchor not found.")
    raise SystemExit(1)
content = content.replace(old_state, new_state, 1)

# 3. Fetch job-order jobs once on mount, building a unit-id -> job map
old_effect = """  useEffect(() => {
    fetchPriceList();
  }, []);"""
new_effect = """  useEffect(() => {
    fetchPriceList();
    fetchJobOrderUnits();
  }, []);

  const fetchJobOrderUnits = async () => {
    try {
      const jobOrderJobs = await pb.collection('jobs').getFullList({
        filter: 'is_job_order=true && status!="Completed"',
      });
      const map = {};
      jobOrderJobs.forEach(j => { map[j.unit] = j; });
      setJobOrderUnits(map);
    } catch (err) {
      console.error('Failed to fetch job order units:', err);
    }
  };"""
if old_effect not in content:
    print("ERROR: useEffect anchor not found.")
    raise SystemExit(1)
content = content.replace(old_effect, new_effect, 1)

# 4. Add badge to mobile card view (right after the key_no/make block)
old_mobile = '''                <div>
                  <div className="text-[11px] font-black text-gray-900 uppercase">{item.make}</div>
                  <div className="text-[8px] font-bold text-orange-500 uppercase">{item.type}</div>
                </div>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>'''
new_mobile = '''                <div>
                  <div className="text-[11px] font-black text-gray-900 uppercase">{item.make}</div>
                  <div className="text-[8px] font-bold text-orange-500 uppercase">{item.type}</div>
                </div>
                {jobOrderUnits[item.id] && (
                  <span className="text-[7px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full font-black uppercase">DP Paid</span>
                )}
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>'''
if old_mobile not in content:
    print("ERROR: mobile card anchor not found.")
    raise SystemExit(1)
content = content.replace(old_mobile, new_mobile, 1)

# 5. Add badge to desktop table row (key column)
old_desktop = '''                <td className="px-2 py-3 print:px-2 print:py-1 font-black text-[10px] text-gray-900 text-center">{item.key_no}</td>'''
new_desktop = '''                <td className="px-2 py-3 print:px-2 print:py-1 font-black text-[10px] text-gray-900 text-center">
                  {item.key_no}
                  {jobOrderUnits[item.id] && (
                    <div className="mt-1 text-[6px] px-1 py-0.5 bg-amber-500 text-white rounded-full font-black uppercase print:hidden">DP</div>
                  )}
                </td>'''
if old_desktop not in content:
    print("ERROR: desktop table anchor not found.")
    raise SystemExit(1)
content = content.replace(old_desktop, new_desktop, 1)

with open('/home/arslan/app/src/components/PriceListModule.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: Job order (down payment) badge added to PriceListModule.")
