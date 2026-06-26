with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

old_navbutton_def = "const NavButton=({active,onClick,icon,label,className=\"\"})=> ( <button onClick={onClick} className={`text-[8px] font-black flex items-center gap-1 px-2 py-2 rounded-lg transition-all uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'} ${className}`}> <SafeIcon icon={icon} className=\"text-sm\" /> <span>{label}</span> </button> );"
new_navbutton_def = "const NavButton=({active,onClick,icon,label,className=\"\"})=> ( <button onClick={onClick} className={`text-[8px] xl:text-[10px] font-black flex items-center gap-1 xl:gap-2 px-2 xl:px-3.5 py-2 xl:py-2.5 rounded-lg xl:rounded-xl transition-all uppercase tracking-wide xl:tracking-widest whitespace-nowrap flex-shrink-0 ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'} ${className}`}> <SafeIcon icon={icon} className=\"text-sm xl:text-base\" /> <span>{label}</span> </button> );"

if old_navbutton_def not in content:
    print("ERROR: NavButton definition anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_navbutton_def, new_navbutton_def, 1)

old_nav_container = '<div className="hidden lg:flex items-center gap-0.5 bg-white p-1 rounded-[18px] shadow-sm border border-gray-100 flex-1 mx-3 overflow-hidden">'
new_nav_container = '<div className="hidden lg:flex items-center gap-0.5 xl:gap-1 bg-white p-1 xl:p-1.5 rounded-[18px] shadow-sm border border-gray-100 flex-1 mx-3 overflow-hidden">'

if old_nav_container not in content:
    print("ERROR: nav container anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_nav_container, new_nav_container, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: Nav buttons scale up on xl screens while staying compact below that.")
