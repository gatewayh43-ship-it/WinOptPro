import os

src_dir = r"f:\WinOpt\WinOptimizerRevamp\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            lines = content.split('\n')
            new_lines = []
            changed = False
            for line in lines:
                if 'text-slate-500' in line and 'dark:text-' not in line:
                    line = line.replace('text-slate-500', 'text-slate-500 dark:text-slate-300')
                    changed = True
                if 'text-slate-400' in line and 'dark:text-' not in line:
                    line = line.replace('text-slate-400', 'text-slate-400 dark:text-slate-200')
                    changed = True
                new_lines.append(line)
                
            if changed:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write('\n'.join(new_lines))
                print(f"Updated {filepath}")
print("Done.")
