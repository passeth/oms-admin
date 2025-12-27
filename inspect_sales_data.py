
import pandas as pd

files = [
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2024.csv',
    r'd:\(주)에바스코스메틱 Dropbox\JI SEULKI\claude\@ongoing_SALES\2025.csv'
]

for file_path in files:
    print(f"\n--- Inspecting {file_path} ---")
    try:
        # Try reading first few rows to detect structure
        # Using 'euc-kr' or 'cp949' as it's common for Korean CSVs, falling back to 'utf-8' if needed
        try:
            df = pd.read_csv(file_path, nrows=5, encoding='cp949')
        except UnicodeDecodeError:
            print("cp949 failed, trying utf-8...")
            df = pd.read_csv(file_path, nrows=5, encoding='utf-8')
            
        print("Columns:")
        print(df.columns.tolist())
        print("\nFirst 5 rows:")
        print(df.head())
        print("\nData Types:")
        print(df.dtypes)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
