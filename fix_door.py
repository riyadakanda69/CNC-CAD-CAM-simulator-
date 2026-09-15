import sys

with open('src/services/doorGeometry.ts', 'r') as f:
    lines = f.readlines()

# Replace specific lines:
# 356: id: `arch_frame_step_${idx}`,
# 358: name: `Arch Molding Step ${idx + 1} (${step.name})`,
# 373: id: `flat_frame_step_${idx}`,
# 375: name: `Flat Frame Molding Step ${idx + 1}`,
# 397: id: `crest_fan_petal_${idx}`,
# 399: name: `Crest Palmette Petal ${idx + 1}`,
# 432: id: `crest_volute_${sideName}`,
# 434: name: `Crest Volute Scroll ${sideName}`,
# 449: id: `crest_floret_${sideName}_${rIdx}`,
# 451: name: `Crest Floret ${sideName} ${rIdx + 1}`,
# 469: id: `crest_leaf_${sideName}_${rIdx}`,
# 471: name: `Crest Leaf Spray ${sideName} ${rIdx + 1}`,
# 480: id: `crest_leaf_vein_${sideName}_${rIdx}`,
# 482: name: `Crest Leaf Vein ${sideName} ${rIdx + 1}`,

replacements = {
    355: "        id: `arch_frame_step_${idx}`,\n",
    357: "        name: `Arch Molding Step ${idx + 1} (${step.name})`,\n",
    372: "        id: `flat_frame_step_${idx}`,\n",
    374: "        name: `Flat Frame Molding Step ${idx + 1}`,\n",
    396: "        id: `crest_fan_petal_${idx}`,\n",
    398: "        name: `Crest Palmette Petal ${idx + 1}`,\n",
    431: "        id: `crest_volute_${sideName}`,\n",
    433: "        name: `Crest Volute Scroll ${sideName}`,\n",
    448: "          id: `crest_floret_${sideName}_${rIdx}`,\n",
    450: "          name: `Crest Floret ${sideName} ${rIdx + 1}`,\n",
    468: "          id: `crest_leaf_${sideName}_${rIdx}`,\n",
    470: "          name: `Crest Leaf Spray ${sideName} ${rIdx + 1}`,\n",
    479: "          id: `crest_leaf_vein_${sideName}_${rIdx}`,\n",
    481: "          name: `Crest Leaf Vein ${sideName} ${rIdx + 1}`,\n",
}

for idx, val in replacements.items():
    print(f"Replacing line {idx+1}: {repr(lines[idx])} with {repr(val)}")
    lines[idx] = val

with open('src/services/doorGeometry.ts', 'w') as f:
    f.writelines(lines)

print("Replacement complete.")
