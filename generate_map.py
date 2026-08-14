import FinanceDataReader as fdr
import sys
import os

def main():
    try:
        df = fdr.StockListing('KRX')
    except Exception as e:
        print('Error fetching:', e)
        return

    mapping = {}
    for _, row in df.iterrows():
        name = str(row['Name']).replace(' ', '')
        code = str(row['Code'])
        mapping[name] = code

    sys.path.append('backend')
    try:
        from stock_names import STOCK_MAP
        for k, v in STOCK_MAP.items():
            mapping[k.replace(' ', '')] = v
    except Exception as e:
        print('Could not load old STOCK_MAP:', e)

    out_lines = ['# backend/stock_names.py', '# Auto-generated mapping covering all KRX stocks', 'STOCK_MAP = {']
    for k, v in mapping.items():
        out_lines.append(f'    "{k}": "{v}",')
    out_lines.append('}')

    with open('backend/stock_names.py', 'w', encoding='utf-8') as f:
        f.write('\n'.join(out_lines))
    print('Successfully generated backend/stock_names.py with', len(mapping), 'stocks.')

if __name__ == '__main__':
    main()
