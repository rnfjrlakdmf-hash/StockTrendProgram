with open('backend/routes/market.py', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix indentation around line 6652
bad_snippet = '''    if not topic and not message:
            # Enrich each approval doc with Wall Street Council (5 Masters AI Hedge Fund)
    for doc_item in auto_approvals:
        if isinstance(doc_item, dict) and "wall_street_council" not in doc_item:
            doc_item["wall_street_council"] = _generate_wall_street_council(doc_item)

        _CEO_OFFICE_CACHE = resp_data'''

good_snippet = '''    # Enrich each approval doc with Wall Street Council (5 Masters AI Hedge Fund)
    for doc_item in auto_approvals:
        if isinstance(doc_item, dict) and "wall_street_council" not in doc_item:
            doc_item["wall_street_council"] = _generate_wall_street_council(doc_item)

    if not topic and not message:
        _CEO_OFFICE_CACHE = resp_data'''

norm_c = c.replace('\r\n', '\n')
norm_bad = bad_snippet.replace('\r\n', '\n')
norm_good = good_snippet.replace('\r\n', '\n')

if norm_bad in norm_c:
    norm_c = norm_c.replace(norm_bad, norm_good)
    with open('backend/routes/market.py', 'w', encoding='utf-8') as f:
        f.write(norm_c)
    print('Fixed indentation in market.py successfully!')
else:
    print('bad_snippet not found!')
