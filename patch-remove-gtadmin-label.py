with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

old_block = '<div className="flex items-center gap-2"> <div className="bg-blue-700 p-2 rounded-[12px] text-white shadow-lg shadow-blue-100"><SafeIcon icon={FiTruck} className="text-sm lg:text-base" /></div> <span className="text-sm font-black text-gray-900 hidden lg:block">GT Admin</span> </div>'
new_block = '<div className="flex items-center gap-2"> <div className="bg-blue-700 p-2 rounded-[12px] text-white shadow-lg shadow-blue-100"><SafeIcon icon={FiTruck} className="text-sm lg:text-base" /></div> </div>'

if old_block not in content:
    print("ERROR: GT Admin label anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_block, new_block, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: 'GT Admin' label removed, truck icon logo kept.")
