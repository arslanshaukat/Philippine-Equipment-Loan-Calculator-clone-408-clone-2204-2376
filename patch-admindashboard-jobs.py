with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

# 1. Add the import + icon import
old_imports = "import ApplicantsModule from './ApplicantsModule';"
new_imports = "import ApplicantsModule from './ApplicantsModule';import JobTrackerModule from './JobTrackerModule';"

if old_imports not in content:
    print("ERROR: import anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_imports, new_imports, 1)

# 2. Add FiTool to the icon import line
old_icons = "FiUserPlus} from 'react-icons/fi';"
new_icons = "FiUserPlus,FiTool} from 'react-icons/fi';"

if old_icons not in content:
    print("ERROR: icon import anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_icons, new_icons, 1)

# 3. Add desktop nav button (after the Hiring nav button)
old_nav = '<NavButton active={view==="applicants"} onClick={()=> setView(\'applicants\')} icon={FiUserPlus} label="Hiring" />'.replace('"applicants"', "'applicants'")
# the actual file uses single quotes consistently, match exactly:
old_nav = "<NavButton active={view==='applicants'} onClick={()=> setView('applicants')} icon={FiUserPlus} label=\"Hiring\" />"
new_nav = old_nav + " <NavButton active={view==='jobs'} onClick={()=> setView('jobs')} icon={FiTool} label=\"Jobs\" />"

if old_nav not in content:
    print("ERROR: desktop nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_nav, new_nav, 1)

# 4. Add mobile nav button (after the Hiring mobile nav button)
old_mobile_nav = "<MobileNavBtn active={view==='applicants'} onClick={()=> setView('applicants')} icon={FiUserPlus} label=\"Hiring\" />"
new_mobile_nav = old_mobile_nav + " <MobileNavBtn active={view==='jobs'} onClick={()=> setView('jobs')} icon={FiTool} label=\"Jobs\" />"

if old_mobile_nav not in content:
    print("ERROR: mobile nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_mobile_nav, new_mobile_nav, 1)

# 5. Add the render branch (after applicants render)
old_render = "{view==='applicants' && <ApplicantsModule />}"
new_render = old_render + "{view==='jobs' && <JobTrackerModule />}"

if old_render not in content:
    print("ERROR: render branch anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_render, new_render, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: AdminDashboard.jsx patched with Job Tracker integration.")
