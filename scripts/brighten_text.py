import os

src_dir = r"f:\WinOpt\WinOptimizerRevamp\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            new_content = content.replace("dark:text-slate-400", "dark:text-slate-200")
            new_content = new_content.replace("dark:text-slate-500", "dark:text-slate-300")
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
print("Done.")
