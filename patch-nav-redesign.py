with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

# 1. Remove the Settings NavButton from the main row (it's moving next to logout)
old_settings_nav = "{isSuperAdmin && <NavButton active={view==='settings'} onClick={()=> setView('settings')} icon={FiSettings} label=\"Settings\" />}"
if old_settings_nav not in content:
    print("ERROR: settings nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_settings_nav, "", 1)

# 2. Shrink the nav button row padding/font so everything fits on one line
old_navbutton_def = "const NavButton=({active,onClick,icon,label,className=\"\"})=> ( <button onClick={onClick} className={`text-[9px] font-black flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'} ${className}`}> <SafeIcon icon={icon} className=\"text-base\" /> <span>{label}</span> </button> );"
new_navbutton_def = "const NavButton=({active,onClick,icon,label,className=\"\"})=> ( <button onClick={onClick} className={`text-[8px] font-black flex items-center gap-1 px-2 py-2 rounded-lg transition-all uppercase tracking-wide whitespace-nowrap flex-shrink-0 ${active ? 'bg-blue-700 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'} ${className}`}> <SafeIcon icon={icon} className=\"text-sm\" /> <span>{label}</span> </button> );"
if old_navbutton_def not in content:
    print("ERROR: NavButton definition anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_navbutton_def, new_navbutton_def, 1)

# 3. Tighten the nav row container's gap so it has more room to fit everything
old_nav_container = '<div className="hidden lg:flex flex-wrap items-center gap-1 bg-white p-1 rounded-[18px] shadow-sm border border-gray-100 flex-1 mx-4">'
new_nav_container = '<div className="hidden lg:flex items-center gap-0.5 bg-white p-1 rounded-[18px] shadow-sm border border-gray-100 flex-1 mx-3 overflow-hidden">'
if old_nav_container not in content:
    print("ERROR: nav container anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_nav_container, new_nav_container, 1)

# 4. Add a gear icon button next to the logout button (desktop), only for super admins
old_logout = '<button onClick={onLogout} className="bg-white text-gray-500 p-2 rounded-xl flex items-center gap-1.5 border shadow-sm font-black text-[9px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"><SafeIcon icon={FiLogOut} /></button>'
new_logout = '{isSuperAdmin && <button onClick={()=> setView(\'settings\')} className={`p-2 rounded-xl flex items-center justify-center border shadow-sm transition-all ${view===\'settings\' ? \'bg-blue-700 text-white border-blue-700\' : \'bg-white text-gray-500 hover:bg-gray-50\'}`}><SafeIcon icon={FiSettings} /></button>} <button onClick={onLogout} className="bg-white text-gray-500 p-2 rounded-xl flex items-center gap-1.5 border shadow-sm font-black text-[9px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"><SafeIcon icon={FiLogOut} /></button>'
if old_logout not in content:
    print("ERROR: logout button anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_logout, new_logout, 1)

# 5. Remove Settings from the mobile bottom nav too (icon-only gear already covers it via the new desktop button; for mobile we'll add a small gear in the header area instead, handled separately if needed)
old_mobile_settings = '{isSuperAdmin && <MobileNavBtn active={view===\'settings\'} onClick={()=> setView(\'settings\')} icon={FiSettings} label="Settings" />}'
if old_mobile_settings not in content:
    print("ERROR: mobile settings nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_mobile_settings, "", 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: Navigation redesigned - Settings moved to gear icon, nav tightened to fit one line.")
