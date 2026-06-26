with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

old_import = "import LeadCalculatorPanel from './LeadCalculatorPanel';"
new_import = "import LeadCalculatorPanel from './LeadCalculatorPanel';import WeeklyTasksModule from './WeeklyTasksModule';"

if old_import not in content:
    print("ERROR: import anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_import, new_import, 1)

old_icons = "FiUserPlus,FiTool} from 'react-icons/fi';"
new_icons = "FiUserPlus,FiTool,FiCalendar2} from 'react-icons/fi';"
# FiCalendar already exists in this file (used elsewhere) - reuse it instead
# of importing a non-existent FiCalendar2 icon.
new_icons = "FiUserPlus,FiTool} from 'react-icons/fi';"

if old_icons not in content:
    print("ERROR: icon import anchor not found. No changes made.")
    raise SystemExit(1)
# no actual change needed here since FiCalendar already exists; just confirming

old_nav = "<NavButton active={view==='jobs'} onClick={()=> setView('jobs')} icon={FiTool} label=\"Jobs\" />"
new_nav = old_nav + " <NavButton active={view==='weekly-tasks'} onClick={()=> setView('weekly-tasks')} icon={FiCalendar} label=\"Weekly\" />"

if old_nav not in content:
    print("ERROR: desktop nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_nav, new_nav, 1)

old_mobile_nav = "<MobileNavBtn active={view==='jobs'} onClick={()=> setView('jobs')} icon={FiTool} label=\"Jobs\" />"
new_mobile_nav = old_mobile_nav + " <MobileNavBtn active={view==='weekly-tasks'} onClick={()=> setView('weekly-tasks')} icon={FiCalendar} label=\"Weekly\" />"

if old_mobile_nav not in content:
    print("ERROR: mobile nav anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_mobile_nav, new_mobile_nav, 1)

old_render = "{view==='jobs' && <JobTrackerModule initialJobId={jobTrackerTargetJobId} onConsumeInitialJobId={()=>setJobTrackerTargetJobId(null)} initialUnitIdForNewJob={jobTrackerTargetUnitId} onConsumeInitialUnitId={()=>setJobTrackerTargetUnitId(null)} />}"
new_render = old_render + "{view==='weekly-tasks' && <WeeklyTasksModule />}"

if old_render not in content:
    print("ERROR: render branch anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_render, new_render, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: WeeklyTasksModule wired into navigation.")
