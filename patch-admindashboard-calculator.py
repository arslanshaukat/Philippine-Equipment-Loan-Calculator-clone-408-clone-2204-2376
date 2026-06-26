with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

old_import = "import JobTrackerModule from './JobTrackerModule';"
new_import = "import JobTrackerModule from './JobTrackerModule';import LeadCalculatorPanel from './LeadCalculatorPanel';"

if old_import not in content:
    print("ERROR: import anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_import, new_import, 1)

old_anchor = '<div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden"> <div className="p-6 lg:p-8 border-b bg-gray-50/50"> <h2 className="font-black text-gray-800 flex items-center gap-3 uppercase text-xs tracking-widest"> <div className="w-1 h-4 bg-blue-600 rounded-full" /> Calculator Leads </h2> </div>'
new_anchor = '<LeadCalculatorPanel /> <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden mt-6"> <div className="p-6 lg:p-8 border-b bg-gray-50/50"> <h2 className="font-black text-gray-800 flex items-center gap-3 uppercase text-xs tracking-widest"> <div className="w-1 h-4 bg-blue-600 rounded-full" /> Calculator Leads </h2> </div>'

if old_anchor not in content:
    print("ERROR: leads list anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_anchor, new_anchor, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: LeadCalculatorPanel embedded into Leads view.")
