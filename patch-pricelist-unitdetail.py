with open('/home/arslan/app/src/components/PriceListModule.jsx', 'r') as f:
    content = f.read()

# 1. Update the component signature to accept the new props
old_sig = "const PriceListModule = () => {"
new_sig = "const PriceListModule = ({ onNavigateToJob, onNavigateToNewJobForUnit } = {}) => {"

if old_sig not in content:
    print("ERROR: component signature anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_sig, new_sig, 1)

# 2. Add the import for UnitDetailModal
old_import = "import SafeIcon from '../common/SafeIcon';"
new_import = "import SafeIcon from '../common/SafeIcon';\nimport UnitDetailModal from './UnitDetailModal';"

if old_import not in content:
    print("ERROR: import anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_import, new_import, 1)

# 3. Add state for the selected unit (detail modal), right after showModal state
old_state = "const [showModal, setShowModal] = useState(false);"
new_state = old_state + "\n  const [selectedUnit, setSelectedUnit] = useState(null);"

if old_state not in content:
    print("ERROR: state anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_state, new_state, 1)

# 4. Render the UnitDetailModal at the end, right before the closing </div> of the
# component's print styles block. Anchor on the <style> tag that's already there.
old_style_anchor = "      <style>{`\n        @media print {"
new_style_anchor = """      {selectedUnit && (
        <UnitDetailModal
          unit={selectedUnit}
          onClose={() => setSelectedUnit(null)}
          onOpenJob={(jobId) => { setSelectedUnit(null); if (onNavigateToJob) onNavigateToJob(jobId); }}
          onCreateJob={(unit) => { setSelectedUnit(null); if (onNavigateToNewJobForUnit) onNavigateToNewJobForUnit(unit.id); }}
        />
      )}

      <style>{`
        @media print {"""

if old_style_anchor not in content:
    print("ERROR: style tag anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_style_anchor, new_style_anchor, 1)

# 5. Make mobile card rows clickable to open the unit detail modal.
# Anchor on the outer card div for the mobile view.
old_mobile_card = '<div key={item.id} className="bg-white rounded-[20px] border border-gray-100 p-4 shadow-sm">'
new_mobile_card = '<div key={item.id} className="bg-white rounded-[20px] border border-gray-100 p-4 shadow-sm cursor-pointer" onClick={() => setSelectedUnit(item)}>'

if old_mobile_card not in content:
    print("ERROR: mobile card anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_mobile_card, new_mobile_card, 1)

# 6. Stop the Edit/Delete buttons inside the mobile card from also triggering
# the new card-level onClick (event bubbling).
old_mobile_buttons = """<div className="flex gap-1">
                <button onClick={() => handleEdit(item)} className="p-2 bg-gray-50 text-gray-400 rounded-xl"><SafeIcon icon={FiEdit} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-gray-50 text-red-300 rounded-xl"><SafeIcon icon={FiTrash2} /></button>
              </div>"""
new_mobile_buttons = """<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleEdit(item)} className="p-2 bg-gray-50 text-gray-400 rounded-xl"><SafeIcon icon={FiEdit} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-gray-50 text-red-300 rounded-xl"><SafeIcon icon={FiTrash2} /></button>
              </div>"""

if old_mobile_buttons not in content:
    print("ERROR: mobile buttons anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_mobile_buttons, new_mobile_buttons, 1)

# 7. Make desktop table rows clickable too.
old_desktop_row = '<tr key={item.id} className="hover:bg-orange-50/30 transition-all group print:break-inside-avoid">'
new_desktop_row = '<tr key={item.id} className="hover:bg-orange-50/30 transition-all group print:break-inside-avoid cursor-pointer" onClick={() => setSelectedUnit(item)}>'

if old_desktop_row not in content:
    print("ERROR: desktop row anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_desktop_row, new_desktop_row, 1)

# 8. Stop the desktop Edit/Delete buttons from triggering the row click too.
old_desktop_buttons = """<td className="px-4 py-3 text-right print:hidden">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-orange-600"><SafeIcon icon={FiEdit} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-600"><SafeIcon icon={FiTrash2} /></button>
                  </div>
                </td>"""
new_desktop_buttons = """<td className="px-4 py-3 text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-orange-600"><SafeIcon icon={FiEdit} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-red-600"><SafeIcon icon={FiTrash2} /></button>
                  </div>
                </td>"""

if old_desktop_buttons not in content:
    print("ERROR: desktop buttons anchor not found. No changes made.")
    raise SystemExit(1)
content = content.replace(old_desktop_buttons, new_desktop_buttons, 1)

with open('/home/arslan/app/src/components/PriceListModule.jsx', 'w') as f:
    f.write(content)

print("SUCCESS: PriceListModule.jsx patched with Unit Detail modal integration.")
