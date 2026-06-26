with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'r') as f:
    content = f.read()

# 1. Add state for the deep-link target, right after the existing view state declaration
old_state = "const [lastProgressByJob,setLastProgressByJob]=useState({});"
# this line doesn't exist in AdminDashboard (it's in JobTrackerModule) — use a real anchor instead
old_state = "const [selectedQuote,setSelectedQuote]=useState(null);"
new_state = old_state + "const [jobTrackerTargetJobId,setJobTrackerTargetJobId]=useState(null);const [jobTrackerTargetUnitId,setJobTrackerTargetUnitId]=useState(null);const navigateToJob=(jobId)=>{setJobTrackerTargetJobId(jobId);setView('jobs');};const navigateToNewJobForUnit=(unitId)=>{setJobTrackerTargetUnitId(unitId);setView('jobs');};"

if old_state not in content:
    print("ERROR: state anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_state, new_state, 1)

# 2. Pass the new props into JobTrackerModule's render call
old_render = "{view==='jobs' && <JobTrackerModule />}"
new_render = "{view==='jobs' && <JobTrackerModule initialJobId={jobTrackerTargetJobId} onConsumeInitialJobId={()=>setJobTrackerTargetJobId(null)} initialUnitIdForNewJob={jobTrackerTargetUnitId} onConsumeInitialUnitId={()=>setJobTrackerTargetUnitId(null)} />}"

if old_render not in content:
    print("ERROR: render anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_render, new_render, 1)

# 3. Pass the navigation callbacks into PriceListModule's render call
old_pricelist = "{view==='price-list' && <PriceListModule />}"
new_pricelist = "{view==='price-list' && <PriceListModule onNavigateToJob={navigateToJob} onNavigateToNewJobForUnit={navigateToNewJobForUnit} />}"

if old_pricelist not in content:
    print("ERROR: PriceListModule render anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_pricelist, new_pricelist, 1)

with open('/home/arslan/app/src/components/AdminDashboard.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: AdminDashboard.jsx patched with cross-module navigation.")
